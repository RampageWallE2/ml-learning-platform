"""API body limits with real Flask routes and disposable PostgreSQL only."""

import io
import json
from threading import Thread

import pytest
import requests
from flask import jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.serving import make_server

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import AuthSession, LearningProfile, LessonProgress, PasswordLoginLimit, User, UserIdentity


LIMIT = 65536
HEADERS = {"Origin": "http://localhost:4200", "X-ExploraLab-Request": "1"}


def padded_json(payload, size):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    assert len(body) <= size
    return body + b" " * (size - len(body))


def assert_too_large(response):
    assert response.status_code == 413
    assert response.get_json() == {"error": "Request body is too large.", "code": "request_too_large"}
    assert response.headers["Cache-Control"] == "no-store"
    assert "Set-Cookie" not in response.headers


def snapshot(app):
    with app.app_context():
        return {model.__tablename__: db.session.scalar(db.select(db.func.count()).select_from(model))
                for model in [User, UserIdentity, LearningProfile, AuthSession, LessonProgress, PasswordLoginLimit]}


@pytest.mark.parametrize("path", ["/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/google"])
@pytest.mark.parametrize("content_type", ["application/json", "text/plain", "application/x-www-form-urlencoded"])
def test_oversized_auth_requests_do_not_create_accounts_sessions_or_attempts(app, client, monkeypatch, path, content_type):
    monkeypatch.setattr("app.routes.auth.verify_google_credential", lambda *args: pytest.fail("Oversized request reached Google."))
    monkeypatch.setattr("app.routes.auth.hash_password", lambda *args: pytest.fail("Oversized request reached hashing."))
    monkeypatch.setattr("app.routes.auth.consume_password_login_attempt", lambda *args: pytest.fail("Oversized request consumed an attempt."))
    before = snapshot(app)
    response = client.post(path, data=b"x" * (LIMIT + 1), content_type=content_type)
    assert_too_large(response)
    assert snapshot(app) == before


@pytest.mark.parametrize(("method", "path"), [("PUT", "/api/v1/me/progress/lesson-01"), ("POST", "/api/v1/auth/logout")])
def test_oversized_writes_preserve_existing_session_and_progress(app, logged_in_client, method, path):
    client = logged_in_client
    assert client.put("/api/v1/me/progress/lesson-01", json={"status": "in_progress", "currentStep": 2}).status_code == 201
    before_progress = client.get("/api/v1/me/progress").get_json()
    before = snapshot(app)
    assert_too_large(client.open(path, method=method, data=padded_json({"status": "completed", "currentStep": 99}, LIMIT + 1), content_type="application/json"))
    assert snapshot(app) == before
    assert client.get("/api/v1/me").status_code == 200
    assert client.get("/api/v1/me/progress").get_json() == before_progress
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count()).select_from(AuthSession).where(AuthSession.revoked_at.is_not(None))) == 0


@pytest.mark.parametrize("size", [LIMIT - 1, LIMIT])
def test_exact_boundary_reaches_password_login_and_cached_json_is_available(app, client, size):
    payload = {"email": "boundary@example.test", "password": "test-only-password"}
    response = client.post("/api/v1/auth/login", data=padded_json(payload, size), content_type="application/json")
    assert response.status_code == 401
    assert response.get_json()["code"] == "invalid_credentials"
    with app.app_context():
        assert db.session.scalar(db.select(PasswordLoginLimit.attempts)) == 1


def test_rejected_login_does_not_use_the_last_available_attempt(app, client):
    payload = {"email": "boundary@example.test", "password": "test-only-password"}
    for _ in range(7):
        assert client.post("/api/v1/auth/login", json=payload).status_code == 401
    assert_too_large(client.post("/api/v1/auth/login", data=padded_json(payload, LIMIT + 1), content_type="application/json"))
    assert client.post("/api/v1/auth/login", json=payload).status_code == 401
    assert client.post("/api/v1/auth/login", json=payload).status_code == 429


def test_legitimate_flow_and_existing_field_validation_are_unchanged(app, client, monkeypatch, google_identity):
    # Normal registration/login/progress requests are far below the default.
    registration = {"email": "normal@example.test", "displayName": "Prueba temporal", "password": "test-only-password"}
    for payload in [registration, {"email": registration["email"], "password": registration["password"]},
                    {"status": "completed", "currentStep": 0}, {"credential": "x" * 8192}]:
        assert len(json.dumps(payload).encode()) < LIMIT // 4
    assert client.post("/api/v1/auth/register", json=registration).status_code == 201
    assert client.post("/api/v1/auth/login", json={"email": registration["email"], "password": registration["password"]}).status_code == 200
    assert client.put("/api/v1/me/progress/lesson-01", json={"status": "completed", "currentStep": 0}).status_code == 201
    assert client.post("/api/v1/auth/logout").status_code == 200
    monkeypatch.setattr("app.routes.auth.verify_google_credential", lambda *args: google_identity)
    assert client.post("/api/v1/auth/google", json={"credential": "x" * 8192}).status_code == 200
    assert client.post("/api/v1/auth/register", json={**registration, "displayName": "x" * 201}).status_code == 400
    assert client.post("/api/v1/auth/login", data=b"{broken", content_type="application/json").status_code == 400


def test_normal_google_token_can_fill_the_entire_allowed_body(client, monkeypatch, google_identity):
    seen = []
    def verify(credential, client_id):
        seen.append(credential)
        return google_identity
    monkeypatch.setattr("app.routes.auth.verify_google_credential", verify)
    response = client.post("/api/v1/auth/google", data=padded_json({"credential": "fake-test-only"}, LIMIT), content_type="application/json")
    assert response.status_code == 200
    assert seen == ["fake-test-only"]


def test_progress_accepts_exact_limit_without_changing_completion_rules(logged_in_client):
    response = logged_in_client.put("/api/v1/me/progress/lesson-01", data=padded_json({"status": "completed", "currentStep": 2}, LIMIT), content_type="application/json")
    assert response.status_code == 201
    assert response.get_json()["progress"]["status"] == "completed"


@pytest.mark.parametrize("size", [0, LIMIT])
def test_logout_accepts_empty_or_exact_limit_body(logged_in_client, size):
    assert logged_in_client.post("/api/v1/auth/logout", data=b" " * size).status_code == 200
    assert logged_in_client.get("/api/v1/me").status_code == 401


def test_csrf_still_rejects_first_without_reading_or_changing_data(app):
    raw = app.test_client()
    response = raw.post("/api/v1/auth/login", data=b"x" * (LIMIT + 1))
    assert response.status_code == 403
    assert response.get_json()["code"] == "csrf_validation_failed"
    assert all(value == 0 for value in snapshot(app).values())


def test_declared_oversize_is_rejected_before_input_is_read(app):
    class UnreadableInput(io.BytesIO):
        def read(self, *args):
            pytest.fail("Declared oversize input must not be read.")
        def readinto(self, *args):
            pytest.fail("Declared oversize input must not be read.")
    response = app.test_client().post("/api/v1/auth/logout", headers=HEADERS, environ_overrides={
        "CONTENT_LENGTH": str(LIMIT + 1), "wsgi.input": UnreadableInput(b"x" * (LIMIT + 1)),
    })
    assert_too_large(response)


@pytest.mark.parametrize(("size", "expected"), [(LIMIT - 1, 200), (LIMIT, 200), (LIMIT + 1, 413), (LIMIT * 2, 413)])
def test_terminated_stream_without_content_length_is_bounded(app, size, expected):
    @app.post("/api/stream-test")
    def echo():
        return jsonify({"bytes": len(request.get_data())})
    stream = io.BytesIO(b"x" * size)
    response = app.test_client().post("/api/stream-test", headers=HEADERS, environ_overrides={
        "CONTENT_LENGTH": "", "wsgi.input_terminated": True, "wsgi.input": stream,
    })
    assert response.status_code == expected
    assert stream.tell() <= LIMIT + 1
    if expected == 413:
        assert_too_large(response)
    else:
        assert response.get_json()["bytes"] == size


def test_utf8_limit_counts_bytes_not_characters(app, client):
    @app.post("/api/utf8-test")
    def echo():
        return jsonify({"bytes": len(request.get_data())})
    body = "á" * (LIMIT // 2)
    assert len(body) < LIMIT
    assert client.post("/api/utf8-test", data=body.encode()).get_json()["bytes"] == LIMIT
    assert_too_large(client.post("/api/utf8-test", data=(body + "á").encode()))


def test_unknown_unterminated_input_keeps_safe_fallback_without_reading(app):
    stream = io.BytesIO(b"x" * (LIMIT * 2))
    response = app.test_client().post("/api/v1/auth/login", headers=HEADERS, content_type="application/json",
                                      environ_overrides={"CONTENT_LENGTH": "", "wsgi.input": stream})
    assert response.status_code == 400  # WSGI exposes no safely readable body.
    assert stream.tell() == 0
    assert all(value == 0 for value in snapshot(app).values())


def test_terminated_input_cannot_bypass_limit_with_a_small_declared_length(app):
    stream = io.BytesIO(b"x" * (LIMIT * 2))
    response = app.test_client().post("/api/v1/auth/logout", headers=HEADERS, environ_overrides={
        "CONTENT_LENGTH": "10", "wsgi.input_terminated": True, "wsgi.input": stream,
    })
    assert_too_large(response)
    assert stream.tell() <= LIMIT + 1


@pytest.mark.parametrize("path", ["/api", "/api/", "/api/future-action"])
def test_future_api_endpoints_are_also_bounded(app, client, path):
    @app.post(path)
    def future():
        pytest.fail("Oversized body reached a future route.")
    assert_too_large(client.post(path, data=b"x" * (LIMIT + 1)))


@pytest.mark.parametrize("path", ["/api-example", "/apiary", "/assets/map.json"])
def test_non_api_requests_and_large_responses_are_not_limited(app, path):
    @app.post(path)
    def echo():
        return request.get_data()
    body = b"x" * (LIMIT + 1)
    response = app.test_client().post(path, data=body)
    assert response.status_code == 200
    assert response.data == body


def test_api_response_size_is_not_limited(app, client):
    @app.get("/api/large-response")
    def large():
        return b"x" * (LIMIT * 2)
    response = client.get("/api/large-response")
    assert response.status_code == 200
    assert len(response.data) == LIMIT * 2


@pytest.mark.parametrize("method", ["GET", "HEAD", "OPTIONS"])
def test_safe_requests_still_work_without_csrf_and_large_attached_bodies_are_rejected(app, method):
    client = app.test_client()
    assert client.open("/api/v1/health", method=method).status_code == 200
    response = client.open("/api/v1/health", method=method, data=b"x" * (LIMIT + 1))
    assert response.status_code == 413


def test_allowed_preflight_and_cors_headers_remain_on_413(app):
    raw = app.test_client()
    preflight = raw.options("/api/v1/auth/login", headers={
        "Origin": HEADERS["Origin"], "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,x-exploralab-request",
    })
    assert preflight.status_code == 200
    response = raw.post("/api/v1/auth/login", data=b"x" * (LIMIT + 1), headers=HEADERS)
    assert_too_large(response)
    assert response.headers["Access-Control-Allow-Origin"] == HEADERS["Origin"]
    assert response.headers["Access-Control-Allow-Credentials"] == "true"


@pytest.mark.parametrize("value", [None, 0, -1, True, False, "65536", 1.5])
def test_invalid_limit_cannot_disable_the_guard(test_database_url, value):
    with pytest.raises(ValueError, match="API_MAX_REQUEST_BYTES"):
        create_app({"TESTING": True, "APP_ENV": "development", "SQLALCHEMY_DATABASE_URI": test_database_url,
                    "SQLALCHEMY_ENGINE_OPTIONS": {}, "CORS_ORIGINS": [HEADERS["Origin"]],
                    "API_MAX_REQUEST_BYTES": value})


def test_default_and_custom_limits(test_database_url):
    assert Config.API_MAX_REQUEST_BYTES == LIMIT
    configured = create_app({"TESTING": True, "APP_ENV": "development", "SQLALCHEMY_DATABASE_URI": test_database_url,
                             "SQLALCHEMY_ENGINE_OPTIONS": {}, "CORS_ORIGINS": [HEADERS["Origin"]],
                             "CSRF_TRUSTED_ORIGINS": [HEADERS["Origin"]], "API_MAX_REQUEST_BYTES": 10})
    client = configured.test_client()
    assert client.post("/api/v1/auth/logout", data=b"x" * 10, headers=HEADERS).status_code == 200
    assert_too_large(client.post("/api/v1/auth/logout", data=b"x" * 11, headers=HEADERS))


def test_non_api_413_keeps_framework_error_response(app):
    @app.get("/outside-api-error")
    def outside():
        raise RequestEntityTooLarge()
    response = app.test_client().get("/outside-api-error")
    assert response.status_code == 413
    assert response.mimetype == "text/html"


def test_real_http_boundary_and_413_without_consuming_an_attempt(app):
    # Actual loopback HTTP, not a database from .env or the user's server.
    server = make_server("127.0.0.1", 0, app)
    worker = Thread(target=server.serve_forever, daemon=True)
    worker.start()
    root = f"http://127.0.0.1:{server.server_port}"
    try:
        with requests.Session() as client:
            client.trust_env = False
            headers = {**HEADERS, "Content-Type": "application/json"}
            payload = {"email": "http-test@example.test", "password": "test-only-password"}
            for size, expected in [(100, 401), (LIMIT, 401), (LIMIT + 1, 413)]:
                response = client.post(root + "/api/v1/auth/login", headers=headers,
                                       data=padded_json(payload, size), timeout=5)
                assert response.status_code == expected
                if expected == 413:
                    assert response.json()["code"] == "request_too_large"
                    assert response.headers["Cache-Control"] == "no-store"
            assert client.get(root + "/api/v1/health", timeout=5).status_code == 200
        with app.app_context():
            assert db.session.scalar(db.select(PasswordLoginLimit.attempts)) == 2
            assert db.session.scalar(db.select(db.func.count()).select_from(AuthSession)) == 0
    finally:
        server.shutdown()
        worker.join(timeout=5)
        server.server_close()
