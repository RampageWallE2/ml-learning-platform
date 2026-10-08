"""No real database or Google calls: all writes use the in-memory app fixture."""

import pytest

from app import create_app
from app.extensions import db
from app.models import AuthSession, LessonProgress, User
from app.request_security import _origin


ORIGIN = "http://localhost:4200"
VALID_HEADERS = {"Origin": ORIGIN, "X-ExploraLab-Request": "1"}
REGISTRATION = {
    "displayName": "CSRF Test",
    "email": "csrf@example.test",
    "password": "test-only-password",
}


def assert_rejected(response):
    assert response.status_code == 403
    assert response.get_json() == {
        "error": "Request verification failed.",
        "code": "csrf_validation_failed",
    }
    assert "Set-Cookie" not in response.headers


@pytest.mark.parametrize("headers", [
    {},
    {"Origin": ORIGIN},
    {"X-ExploraLab-Request": "1"},
    {"Origin": ORIGIN, "X-ExploraLab-Request": ""},
    {"Origin": ORIGIN, "X-ExploraLab-Request": "0"},
    {"Origin": ORIGIN, "X-ExploraLab-Request": "1, 1"},
    {"Origin": "https://evil.example", "X-ExploraLab-Request": "1"},
    {"Origin": "http://localhost:4200.evil.example", "X-ExploraLab-Request": "1"},
    {"Origin": "http://localhost:4201", "X-ExploraLab-Request": "1"},
    {"Origin": "https://localhost:4200", "X-ExploraLab-Request": "1"},
    {"Origin": "http://sub.localhost:4200", "X-ExploraLab-Request": "1"},
    {"Origin": "null", "Referer": f"{ORIGIN}/world", "X-ExploraLab-Request": "1"},
    {"Origin": "", "Referer": f"{ORIGIN}/world", "X-ExploraLab-Request": "1"},
    {"Origin": "https://evil.example", "Referer": f"{ORIGIN}/world", "X-ExploraLab-Request": "1"},
    {"Origin": f"{ORIGIN}/world", "X-ExploraLab-Request": "1"},
    {"Origin": ORIGIN + " http://localhost:4201", "X-ExploraLab-Request": "1"},
    {"Referer": "https://evil.example/world", "X-ExploraLab-Request": "1"},
    {"Referer": "http://localhost:4200@evil.example/world", "X-ExploraLab-Request": "1"},
])
def test_registration_rejected_before_account_or_session_creation(app, headers):
    response = app.test_client().post("/api/v1/auth/register", json=REGISTRATION, headers=headers)
    assert_rejected(response)
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(User.id))) == 0
        assert db.session.scalar(db.select(db.func.count(AuthSession.id))) == 0


@pytest.mark.parametrize("endpoint", ["login", "google", "logout"])
def test_auth_writes_rejected_before_route_execution(app, monkeypatch, endpoint):
    def must_not_verify(*args):
        pytest.fail("Rejected request must not reach Google verification.")
    monkeypatch.setattr("app.routes.auth.verify_google_credential", must_not_verify)
    response = app.test_client().post(
        f"/api/v1/auth/{endpoint}",
        json={"credential": "fake", "email": REGISTRATION["email"], "password": REGISTRATION["password"]},
    )
    assert_rejected(response)
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(AuthSession.id))) == 0


@pytest.mark.parametrize("headers", [
    {}, {"Origin": ORIGIN},
    {"Origin": "https://evil.example", "X-ExploraLab-Request": "1"},
    {"Origin": "null", "X-ExploraLab-Request": "1"},
])
def test_rejected_logout_keeps_authenticated_session(app, logged_in_client, headers):
    # Raw client shares only the cookie, not the legitimate fixture's default headers.
    raw = app.test_client()
    raw.set_cookie("ml_session", logged_in_client.get_cookie("ml_session", path="/api").value, path="/api")
    assert_rejected(raw.post("/api/v1/auth/logout", headers=headers))
    assert raw.get("/api/v1/me").status_code == 200
    with app.app_context():
        session = db.session.execute(db.select(AuthSession)).scalar_one()
        assert session.revoked_at is None


@pytest.mark.parametrize("headers", [
    {}, {"Origin": ORIGIN},
    {"Origin": "https://evil.example", "X-ExploraLab-Request": "1"},
])
def test_rejected_progress_does_not_create_or_update(app, logged_in_client, headers):
    url = "/api/v1/me/progress/lesson-01"
    raw = app.test_client()
    raw.set_cookie("ml_session", logged_in_client.get_cookie("ml_session", path="/api").value, path="/api")
    assert_rejected(raw.put(url, json={"status": "completed"}, headers=headers))
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(LessonProgress.id))) == 0

    assert logged_in_client.put(url, json={"status": "in_progress", "currentStep": 1}).status_code == 201
    assert_rejected(raw.put(url, json={"status": "completed", "currentStep": 7}, headers=headers))
    with app.app_context():
        progress = db.session.execute(db.select(LessonProgress)).scalar_one()
        assert progress.status == "in_progress"
        assert progress.current_step == 1


def test_form_submission_cannot_logout(app, logged_in_client):
    raw = app.test_client()
    raw.set_cookie("ml_session", logged_in_client.get_cookie("ml_session", path="/api").value, path="/api")
    assert_rejected(raw.post("/api/v1/auth/logout", data={"anything": "1"}, headers={"Origin": ORIGIN}))
    assert raw.get("/api/v1/me").status_code == 200


def test_bad_origin_cannot_be_overridden_by_proxy_headers(app):
    headers = {
        "Origin": "https://evil.example", "X-ExploraLab-Request": "1",
        "Host": "localhost:4200", "X-Forwarded-Host": "localhost:4200",
        "X-Forwarded-Proto": "http", "Forwarded": "host=localhost:4200;proto=http",
    }
    assert_rejected(app.test_client().post("/api/v1/auth/register", headers=headers, json=REGISTRATION))


def test_valid_browser_origin_survives_backend_proxy_host(app):
    headers = {**VALID_HEADERS, "Host": "backend:5000", "X-Forwarded-Host": "backend:5000"}
    response = app.test_client().post("/api/v1/auth/register", headers=headers, json=REGISTRATION)
    assert response.status_code == 201


def test_referer_fallback_requires_header_and_exact_origin(app):
    raw = app.test_client()
    response = raw.post("/api/v1/auth/register", json=REGISTRATION, headers={
        "Referer": f"{ORIGIN}/world?zone=open-pit", "X-ExploraLab-Request": "1",
    })
    assert response.status_code == 201
    assert_rejected(raw.post("/api/v1/auth/logout", headers={"Referer": f"{ORIGIN}/world"}))
    assert raw.post("/api/v1/auth/logout", headers={
        "Referer": f"{ORIGIN}/world", "X-ExploraLab-Request": "1",
    }).status_code == 200


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
def test_future_api_writes_are_also_guarded(app, method):
    # Even an unknown API route cannot accidentally bypass the global guard.
    assert_rejected(app.test_client().open("/api/v2/future", method=method))


def test_guard_does_not_change_non_api_routes(app):
    @app.post("/api-example")
    def unrelated():
        return "unrelated", 200
    assert app.test_client().post("/api-example").status_code == 200


@pytest.mark.parametrize("method", ["GET", "HEAD"])
def test_safe_health_requests_need_no_verification(app, method):
    assert app.test_client().open("/api/v1/health", method=method).status_code == 200


def test_allowed_cors_preflight_accepts_verification_header(app):
    response = app.test_client().options("/api/v1/auth/login", headers={
        "Origin": ORIGIN, "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,x-exploralab-request",
    })
    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == ORIGIN
    assert response.headers["Access-Control-Allow-Credentials"] == "true"
    assert "x-exploralab-request" in response.headers["Access-Control-Allow-Headers"].lower()


def test_untrusted_preflight_does_not_grant_cors(app):
    response = app.test_client().options("/api/v1/auth/login", headers={
        "Origin": "https://evil.example", "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,x-exploralab-request",
    })
    assert "Access-Control-Allow-Origin" not in response.headers


@pytest.mark.parametrize(("value", "expected"), [
    ("http://localhost:4200", ORIGIN),
    ("HTTP://LOCALHOST:4200", ORIGIN),
    ("https://game.example:443", "https://game.example"),
    ("http://game.example:80", "http://game.example"),
    ("http://127.0.0.1:4200", "http://127.0.0.1:4200"),
    ("http://[::1]:4200", "http://[::1]:4200"),
    ("http://[0:0:0:0:0:0:0:1]:4200", "http://[::1]:4200"),
])
def test_origin_normalization(value, expected):
    assert _origin(value) == expected


@pytest.mark.parametrize("value", [
    "null", "*", "https://*.example.com", "https://.*example.com",
    "http://localhost:4200/", "http://localhost:4200/world", "http://localhost:4200?",
    "http://localhost:4200#", "http://localhost:4200?q=1", "http://localhost:4200#fragment",
    "http://localhost:4200@evil.example", "http://user:pass@localhost:4200",
    " http://localhost:4200", "http://localhost:4200 ", "http://local\nhost:4200",
    "http://localhost:4200\x00", "http://localhost:4200\x7f", "http://localhost:4200\\evil",
    "http://localhost:", "http://localhost:0", "http://localhost:65536", "http://localhost:port",
    "http://[::1]evil", "http://[::1", "//localhost:4200", "file://localhost:4200",
    "http://%6cocalhost:4200", "http://localhost..:4200", "http://local_host:4200",
])
def test_invalid_origins_are_rejected(value):
    assert _origin(value) is None


def make_config(uri, **overrides):
    return {
        "TESTING": True, "APP_ENV": "development", "SESSION_COOKIE_SECURE": False,
        "SQLALCHEMY_DATABASE_URI": uri,
        "SQLALCHEMY_ENGINE_OPTIONS": {},
        "CORS_ORIGINS": [ORIGIN], "CSRF_TRUSTED_ORIGINS": [ORIGIN],
        **overrides,
    }


@pytest.mark.parametrize("setting", ["CORS_ORIGINS", "CSRF_TRUSTED_ORIGINS"])
@pytest.mark.parametrize("value", [[], "*", ["*"], ["https://*.example.com"], ["null"],
                                   ["https://game.example/path"], ["https://user:pass@game.example"], [42], [""]])
def test_invalid_configuration_fails_closed(test_database_url, setting, value):
    with pytest.raises(ValueError, match=setting):
        create_app(make_config(test_database_url, **{setting: value}))


def test_cors_cannot_authorize_an_origin_missing_from_csrf_configuration(test_database_url):
    with pytest.raises(ValueError, match="Every CORS_ORIGINS"):
        create_app(make_config(test_database_url, CORS_ORIGINS=[ORIGIN, "https://other.example"]))


def test_unspecified_csrf_origins_use_final_cors_configuration(test_database_url):
    configured = create_app(make_config(test_database_url, CSRF_TRUSTED_ORIGINS=None, CORS_ORIGINS=["https://game.example"]))
    assert configured.config["CSRF_TRUSTED_ORIGINS"] == ["https://game.example"]
    assert configured.test_client().post("/api/v1/auth/logout", headers={
        "Origin": "https://game.example", "X-ExploraLab-Request": "1",
    }).status_code == 200


def test_explicit_mobile_origin_is_allowed_without_trusting_all_lan_hosts(test_database_url):
    configured = create_app(make_config(test_database_url, CSRF_TRUSTED_ORIGINS=[ORIGIN, "http://192.168.1.36:4200"]))
    raw = configured.test_client()
    # Anonymous logout does not touch a DB and exercises the real guard/route.
    assert raw.post("/api/v1/auth/logout", headers={
        "Origin": "http://192.168.1.36:4200", "X-ExploraLab-Request": "1",
    }).status_code == 200
    assert_rejected(raw.post("/api/v1/auth/logout", headers={
        "Origin": "http://192.168.1.37:4200", "X-ExploraLab-Request": "1",
    }))
