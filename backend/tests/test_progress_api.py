import pytest

from app.extensions import db
from app.models import LessonProgress


def test_progress_requires_authentication(client):
    get_response = client.get("/api/v1/me/progress")
    put_response = client.put(
        "/api/v1/me/progress/lesson-01",
        json={"status": "completed"},
    )

    assert get_response.status_code == 401
    assert put_response.status_code == 401


def test_new_account_starts_without_progress(logged_in_client):
    response = logged_in_client.get("/api/v1/me/progress")

    assert response.status_code == 200
    assert response.get_json()["lessons"] == []
    assert response.get_json()["profileId"]


def test_progress_is_created_and_updated_idempotently(app, logged_in_client):
    url = "/api/v1/me/progress/lesson-01"

    first_response = logged_in_client.put(
        url,
        json={"status": "completed", "currentStep": 3},
    )
    second_response = logged_in_client.put(
        url,
        json={"status": "completed", "currentStep": 3},
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 200
    assert second_response.get_json()["progress"]["status"] == "completed"

    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(LessonProgress.id))) == 1


def test_completed_lesson_cannot_regress(logged_in_client):
    url = "/api/v1/me/progress/lesson-01"

    logged_in_client.put(
        url,
        json={"status": "completed", "currentStep": 3},
    )
    response = logged_in_client.put(
        url,
        json={"status": "in_progress", "currentStep": 1},
    )

    progress = response.get_json()["progress"]
    assert progress["status"] == "completed"
    assert progress["currentStep"] == 3


@pytest.mark.parametrize(
    ("payload", "expected_error"),
    [
        ({"status": "unknown"}, "Status must"),
        ({"status": "in_progress", "currentStep": -1}, "currentStep must"),
        ({"status": "in_progress", "currentStep": True}, "currentStep must"),
    ],
)
def test_invalid_progress_is_rejected(
    logged_in_client,
    payload,
    expected_error,
):
    response = logged_in_client.put(
        "/api/v1/me/progress/lesson-01",
        json=payload,
    )

    assert response.status_code == 400
    assert expected_error in response.get_json()["error"]
