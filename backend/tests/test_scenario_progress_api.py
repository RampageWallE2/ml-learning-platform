from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

import pytest

from app.extensions import db
from app.models import LearningProfile, LessonProgress, ScenarioProgress, User

URL = "/api/v1/me/scenarios/open-pit/intro"


def test_intro_requires_authentication(client):
    assert client.put(URL, json={"completed": True}).status_code == 401


def test_new_account_has_pending_intro_without_a_scenario_row(logged_in_client):
    result = logged_in_client.get("/api/v1/me/progress").get_json()
    assert result["scenarios"] == []
    assert result["lessons"] == []


def test_intro_is_idempotent_and_does_not_complete_a_lesson(app, logged_in_client):
    first = logged_in_client.put(URL, json={"completed": True})
    second = logged_in_client.put(URL, json={"completed": True})
    assert first.status_code == 201
    assert second.status_code == 200
    assert first.get_json() == second.get_json()
    scenario = first.get_json()["scenario"]
    assert scenario["scenarioKey"] == "open-pit"
    assert datetime.fromisoformat(scenario["introCompletedAt"]).tzinfo is not None
    result = logged_in_client.get("/api/v1/me/progress").get_json()
    assert result["scenarios"] == [scenario]
    assert result["lessons"] == []
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count()).select_from(ScenarioProgress)) == 1
        assert db.session.scalar(db.select(db.func.count()).select_from(LessonProgress)) == 0


@pytest.mark.parametrize("payload", [
    None, [], {}, {"completed": False}, {"completed": 1}, {"completed": "true"},
    {"completed": True, "profileId": "another-profile"},
    {"completed": True, "introCompletedAt": "2000-01-01T00:00:00Z"},
])
def test_intro_rejects_invalid_payload_without_writing(app, logged_in_client, payload):
    assert logged_in_client.put(URL, json=payload).status_code == 400
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count()).select_from(ScenarioProgress)) == 0


@pytest.mark.parametrize("key", ["OpenPitScene", "zone-01", "quarries", "unknown"])
def test_intro_rejects_unknown_scenarios(logged_in_client, key):
    response = logged_in_client.put(f"/api/v1/me/scenarios/{key}/intro", json={"completed": True})
    assert response.status_code == 400
    assert response.get_json()["code"] == "unknown_scenario"


def test_intro_is_private_to_the_authenticated_profile(app, logged_in_client):
    first = logged_in_client.put(URL, json={"completed": True}).get_json()["scenario"]
    other = app.test_client()
    other.environ_base.update({"HTTP_ORIGIN": "http://localhost:4200", "HTTP_X_EXPLORALAB_REQUEST": "1"})
    assert other.post("/api/v1/auth/register", json={
        "email": "intro-other@example.com", "displayName": "Other worker", "password": "Strong-pass-123!",
    }).status_code == 201
    assert other.get("/api/v1/me/progress").get_json()["scenarios"] == []
    assert other.put(URL, json={"completed": True}).status_code == 201
    assert logged_in_client.get("/api/v1/me/progress").get_json()["scenarios"] == [first]


def test_parallel_intro_saves_keep_one_row_and_the_first_timestamp(app, logged_in_client):
    cookie = logged_in_client.get_cookie("ml_session", path="/api").value

    def complete(_):
        client = app.test_client()
        client.set_cookie("ml_session", cookie, path="/api")
        result = client.put(URL, json={"completed": True}, headers={
            "Origin": "http://localhost:4200", "X-ExploraLab-Request": "1",
        })
        return result.status_code, result.get_json()["scenario"]["introCompletedAt"]

    with ThreadPoolExecutor(max_workers=6) as executor:
        results = list(executor.map(complete, range(12)))
    assert [status for status, _ in results].count(201) == 1
    assert {status for status, _ in results} <= {200, 201}
    assert len({date for _, date in results}) == 1


def test_full_progress_reset_restores_pending_intro_without_deleting_accounts(app, logged_in_client):
    logged_in_client.put(URL, json={"completed": True})
    logged_in_client.put("/api/v1/me/progress/lesson-01", json={"status": "completed"})
    with app.app_context():
        db.session.execute(db.delete(LessonProgress))
        db.session.execute(db.delete(ScenarioProgress))
        db.session.commit()
        assert db.session.scalar(db.select(db.func.count()).select_from(User)) == 1
        assert db.session.scalar(db.select(db.func.count()).select_from(LearningProfile)) == 1
    result = logged_in_client.get("/api/v1/me/progress").get_json()
    assert result["scenarios"] == []
    assert result["lessons"] == []


def test_deleting_profile_cascades_to_its_scenario_progress(app, logged_in_client):
    logged_in_client.put(URL, json={"completed": True})
    with app.app_context():
        db.session.execute(db.delete(LearningProfile))
        db.session.commit()
        assert db.session.scalar(db.select(db.func.count()).select_from(ScenarioProgress)) == 0
