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


@pytest.mark.parametrize("lesson_id", ["lesson-00", "lesson-10", "other-zone", "lesson-999"])
def test_unknown_lessons_cannot_create_records(app, logged_in_client, lesson_id):
    response = logged_in_client.put(f"/api/v1/me/progress/{lesson_id}", json={"status": "completed"})
    assert response.status_code == 400
    assert response.get_json()["code"] == "unknown_lesson"
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(LessonProgress.id))) == 0


def test_cannot_skip_previous_lessons(logged_in_client):
    assert logged_in_client.put("/api/v1/me/progress/lesson-03", json={"status": "completed"}).status_code == 409
    assert logged_in_client.put("/api/v1/me/progress/lesson-01", json={"status": "in_progress"}).status_code == 201
    assert logged_in_client.put("/api/v1/me/progress/lesson-02", json={"status": "completed"}).status_code == 409
    assert logged_in_client.put("/api/v1/me/progress/lesson-01", json={"status": "completed"}).status_code == 200
    assert logged_in_client.put("/api/v1/me/progress/lesson-02", json={"status": "completed"}).status_code == 201
    assert logged_in_client.put("/api/v1/me/progress/lesson-04", json={"status": "completed"}).status_code == 409


def test_complete_route_and_retry_preserve_original_completion(logged_in_client):
    for number in range(1, 10):
        url = f"/api/v1/me/progress/lesson-{number:02d}"
        first = logged_in_client.put(url, json={"status": "completed"})
        retry = logged_in_client.put(url, json={"status": "completed"})
        assert first.status_code == 201 and retry.status_code == 200
        assert first.get_json()["progress"]["completedAt"] == retry.get_json()["progress"]["completedAt"]
    assert len(logged_in_client.get("/api/v1/me/progress").get_json()["lessons"]) == 9


@pytest.mark.parametrize("payload", [
    {"status": "completed", "currentStep": 101},
    {"status": "completed", "currentStep": 2**64},
    {"status": []}, {"status": {}},
    {"status": "completed", "profileId": "someone-else"},
    {"status": "completed", "userId": "someone-else"},
])
def test_progress_payload_bounds(logged_in_client, payload):
    assert logged_in_client.put("/api/v1/me/progress/lesson-01", json=payload).status_code == 400


def test_one_account_cannot_read_or_unlock_using_another_accounts_progress(app, client):
    def register(test_client, email):
        test_client.environ_base.update({"HTTP_ORIGIN": "http://localhost:4200", "HTTP_X_EXPLORALAB_REQUEST": "1"})
        assert test_client.post("/api/v1/auth/register", json={
            "email": email, "displayName": "Test", "password": "OnlyForTests123!",
        }).status_code == 201
    register(client, "first@example.com")
    assert client.put("/api/v1/me/progress/lesson-01", json={"status": "completed"}).status_code == 201
    other = app.test_client()
    register(other, "second@example.com")
    assert other.get("/api/v1/me/progress").get_json()["lessons"] == []
    assert other.put("/api/v1/me/progress/lesson-02", json={"status": "completed"}).status_code == 409
