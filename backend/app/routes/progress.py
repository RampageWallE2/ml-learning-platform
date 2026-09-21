import re
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from ..auth import require_auth
from ..extensions import db
from ..models import LessonProgress


progress_blueprint = Blueprint("progress", __name__, url_prefix="/api/v1")

LESSON_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]{0,99}$")
VALID_STATUSES = {"in_progress", "completed"}


def _error(message: str, status_code: int):
    return jsonify({"error": message}), status_code


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

    return jsonify(
        {
            "profileId": str(profile.id),
            "lessons": [item.to_dict() for item in progress],
        }
    )


@progress_blueprint.put("/me/progress/<lesson_id>")
@require_auth
def save_lesson_progress(lesson_id: str):
    if not LESSON_ID_PATTERN.fullmatch(lesson_id):
        return _error("Invalid lesson id.", 400)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("A JSON object is required.", 400)

    status = payload.get("status")
    if status not in VALID_STATUSES:
        return _error("Status must be 'in_progress' or 'completed'.", 400)

    current_step = payload.get("currentStep", 0)
    if isinstance(current_step, bool) or not isinstance(current_step, int):
        return _error("currentStep must be a non-negative integer.", 400)
    if current_step < 0:
        return _error("currentStep must be a non-negative integer.", 400)

    profile = g.current_user.learning_profile
    progress = db.session.execute(
        db.select(LessonProgress).where(
            LessonProgress.profile_id == profile.id,
            LessonProgress.lesson_id == lesson_id,
        )
    ).scalar_one_or_none()

    created = progress is None
    if progress is None:
        progress = LessonProgress(
            profile_id=profile.id,
            lesson_id=lesson_id,
        )
        db.session.add(progress)

    if progress.status != "completed":
        progress.status = status

    progress.current_step = max(progress.current_step or 0, current_step)
    progress.updated_at = datetime.now(timezone.utc)

    if progress.status == "completed" and progress.completed_at is None:
        progress.completed_at = datetime.now(timezone.utc)

    db.session.commit()

    return jsonify({"progress": progress.to_dict()}), 201 if created else 200
