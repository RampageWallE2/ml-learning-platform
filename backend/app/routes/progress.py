from datetime import datetime, timezone
from uuid import uuid4

from flask import Blueprint, g, jsonify, request
from sqlalchemy import case, func
from sqlalchemy.dialects.postgresql import insert as postgres_insert

from ..auth import require_auth
from ..extensions import db
from ..models import LearningProfile, LessonProgress, ScenarioProgress
from ..lesson_catalog import LESSON_IDS, MAX_CURRENT_STEP, prerequisites


progress_blueprint = Blueprint("progress", __name__, url_prefix="/api/v1")

VALID_STATUSES = {"in_progress", "completed"}
SCENARIO_KEYS = {"open-pit"}


def _error(message: str, status_code: int, code: str | None = None):
    payload = {"error": message}
    if code:
        payload["code"] = code
    return jsonify(payload), status_code


@progress_blueprint.get("/me/progress")
@require_auth
def get_progress():
    profile = g.current_user.learning_profile
    progress = (
        db.session.execute(
            db.select(LessonProgress)
            .where(LessonProgress.profile_id == profile.id)
            .order_by(LessonProgress.started_at, LessonProgress.lesson_id)
        )
        .scalars()
        .all()
    )

    scenarios = db.session.scalars(
        db.select(ScenarioProgress)
        .where(ScenarioProgress.profile_id == profile.id)
        .order_by(ScenarioProgress.scenario_key)
    ).all()

    return jsonify(
        {
            "profileId": str(profile.id),
            "lessons": [item.to_dict() for item in progress],
            "scenarios": [item.to_dict() for item in scenarios],
        }
    )


@progress_blueprint.put("/me/progress/<lesson_id>")
@require_auth
def save_lesson_progress(lesson_id: str):
    if lesson_id not in LESSON_IDS:
        return _error("Unknown lesson.", 400, "unknown_lesson")

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("A JSON object is required.", 400)
    if set(payload) - {"status", "currentStep"}:
        return _error("Unexpected progress fields.", 400, "invalid_progress_fields")

    status = payload.get("status")
    if not isinstance(status, str) or status not in VALID_STATUSES:
        return _error("Status must be 'in_progress' or 'completed'.", 400)

    current_step = payload.get("currentStep", 0)
    if isinstance(current_step, bool) or not isinstance(current_step, int):
        return _error("currentStep must be a non-negative integer.", 400)
    if not 0 <= current_step <= MAX_CURRENT_STEP:
        return _error(f"currentStep must be between 0 and {MAX_CURRENT_STEP}.", 400)

    profile = g.current_user.learning_profile
    # Serialize one account's writes in PostgreSQL, including prerequisite
    # checks. No process-local mutex: multiple Gunicorn workers share this lock.
    db.session.execute(
        db.select(LearningProfile.id)
        .where(LearningProfile.id == profile.id)
        .with_for_update()
    ).scalar_one()
    progress = db.session.execute(
        db.select(LessonProgress).where(
            LessonProgress.profile_id == profile.id,
            LessonProgress.lesson_id == lesson_id,
        )
    ).scalar_one_or_none()

    # Preserve retries of previously confirmed legacy completions. New progress
    # must follow the complete sequence, not just trust a supplied profile ID.
    if progress is None or progress.status != "completed":
        completed = set(db.session.scalars(
            db.select(LessonProgress.lesson_id).where(
                LessonProgress.profile_id == profile.id,
                LessonProgress.status == "completed",
            )
        ))
        if not set(prerequisites(lesson_id)).issubset(completed):
            return _error("Complete the previous lessons first.", 409, "lesson_locked")

    created = progress is None
    now = datetime.now(timezone.utc)
    table = LessonProgress.__table__
    statement = postgres_insert(LessonProgress).values(
        id=uuid4(), profile_id=profile.id, lesson_id=lesson_id,
        status=status, current_step=current_step, started_at=now, updated_at=now,
        completed_at=now if status == "completed" else None,
    ).on_conflict_do_update(
        index_elements=[table.c.profile_id, table.c.lesson_id],
        set_={
            "status": case((table.c.status == "completed", "completed"), else_=status),
            "current_step": case(
                (table.c.current_step >= current_step, table.c.current_step), else_=current_step,
            ),
            "completed_at": case(
                (table.c.completed_at.is_not(None), table.c.completed_at),
                else_=now if status == "completed" else None,
            ),
            "updated_at": now,
        },
    ).returning(LessonProgress)
    progress = db.session.scalars(statement, execution_options={"populate_existing": True}).one()
    result = progress.to_dict()
    db.session.commit()
    return jsonify({"progress": result}), 201 if created else 200


@progress_blueprint.put("/me/scenarios/<scenario_key>/intro")
@require_auth
def complete_scenario_intro(scenario_key: str):
    if scenario_key not in SCENARIO_KEYS:
        return _error("Unknown scenario.", 400, "unknown_scenario")
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or set(payload) != {"completed"} or payload["completed"] is not True:
        return _error("Send only completed: true.", 400, "invalid_intro_fields")

    # The authenticated account owns the profile; callers cannot supply an ID
    # or completion time. Match lesson writes' cross-worker serialization.
    profile = g.current_user.learning_profile
    db.session.execute(
        db.select(LearningProfile.id)
        .where(LearningProfile.id == profile.id)
        .with_for_update()
    ).scalar_one()
    existing = db.session.get(ScenarioProgress, (profile.id, scenario_key))
    created = existing is None
    table = ScenarioProgress.__table__
    statement = postgres_insert(ScenarioProgress).values(
        profile_id=profile.id,
        scenario_key=scenario_key,
        intro_completed_at=datetime.now(timezone.utc),
    )
    statement = statement.on_conflict_do_update(
        index_elements=[table.c.profile_id, table.c.scenario_key],
        set_={"intro_completed_at": func.coalesce(
            table.c.intro_completed_at, statement.excluded.intro_completed_at,
        )},
    ).returning(ScenarioProgress)
    progress = db.session.scalars(statement, execution_options={"populate_existing": True}).one()
    result = progress.to_dict()
    db.session.commit()
    return jsonify({"scenario": result}), 201 if created else 200
