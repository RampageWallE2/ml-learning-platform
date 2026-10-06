"""Real routes and disposable SQLite storage; never a user's database."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from flask_migrate import downgrade, stamp, upgrade
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

from app import create_app
from app.auth.login_limit import _consume_statement, consume_password_login_attempt
from app.extensions import db
from app.models import AuthSession, PasswordLoginLimit, User

BASE_TIME = 1800000000
HEADERS = {"Origin": "http://localhost:4200", "X-ExploraLab-Request": "1"}
EMAIL = "student@example.test"
PASSWORD = "test-only-password"


@pytest.fixture()
def clock(monkeypatch):
    current = [BASE_TIME]
    monkeypatch.setattr("app.auth.login_limit._now", lambda: current[0])
    return current


def login(client, email=EMAIL, password=PASSWORD, **kwargs):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password}, **kwargs)


def register(client, email=EMAIL):
    response = client.post("/api/v1/auth/register", json={"displayName": "Test Student", "email": email, "password": PASSWORD})
    assert response.status_code == 201


def assert_limited(response, seconds=300):
    assert response.status_code == 429
    assert response.get_json() == {
        "error": "Too many login attempts. Please try again later.",
        "code": "too_many_login_attempts", "retryAfterSeconds": seconds,
    }
    assert response.headers["Retry-After"] == str(seconds)
    assert response.headers["Cache-Control"] == "no-store"
    assert "Set-Cookie" not in response.headers


def test_unknown_email_stops_after_eight_attempts_before_password_check(app, client, clock, monkeypatch):
    for _ in range(8):
        assert login(client).status_code == 401
    monkeypatch.setattr("app.routes.auth.password_matches", lambda *args: pytest.fail("Refused login must not check a password."))
    assert_limited(login(client))
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(User.id))) == 0
        assert db.session.scalar(db.select(db.func.count(AuthSession.id))) == 0
        counter = db.session.execute(db.select(PasswordLoginLimit)).scalar_one()
        assert counter.attempts == 9
        assert counter.expires_at == BASE_TIME + 300
        assert len(counter.email_digest) == 64
        assert EMAIL not in counter.email_digest


def test_registered_and_unknown_email_have_identical_limit_responses(client, clock):
    register(client)
    for email in [EMAIL, "unknown@example.test"]:
        for _ in range(8):
            assert login(client, email=email, password="incorrect-password").status_code == 401
        assert_limited(login(client, email=email))


def test_successful_logins_count_and_do_not_reset_window(app, client, clock):
    register(client)
    for _ in range(8):
        assert login(client).status_code == 200
    assert_limited(login(client))
    assert client.get("/api/v1/me").status_code == 200
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(AuthSession.id))) == 9
        assert db.session.scalar(db.select(db.func.count(AuthSession.id)).where(AuthSession.revoked_at.is_not(None))) == 0


def test_normalized_email_shares_one_counter(client, clock):
    for email in [EMAIL, " STUDENT@EXAMPLE.TEST "] * 4:
        assert login(client, email=email).status_code == 401
    assert_limited(login(client, email="Student@Example.Test"))


def test_other_emails_are_independent_and_client_ip_cannot_reset_limit(app, client, clock):
    for _ in range(8):
        login(client)
    assert_limited(login(client, environ_overrides={"REMOTE_ADDR": "198.51.100.1"}, headers={"X-Forwarded-For": "203.0.113.1"}))
    assert login(client, email="other@example.test").status_code == 401
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(PasswordLoginLimit.email_digest))) == 2


def test_rejections_do_not_extend_wait_and_expiry_starts_new_window(app, client, clock):
    for _ in range(8):
        login(client)
    clock[0] += 120
    for _ in range(20):
        assert_limited(login(client), seconds=180)
    with app.app_context():
        assert db.session.execute(db.select(PasswordLoginLimit)).scalar_one().attempts == 9
    clock[0] = BASE_TIME + 299
    assert_limited(login(client), seconds=1)
    clock[0] = BASE_TIME + 300
    assert login(client).status_code == 401
    with app.app_context():
        counter = db.session.execute(db.select(PasswordLoginLimit)).scalar_one()
        assert counter.attempts == 1
        assert counter.expires_at == BASE_TIME + 600
    for _ in range(7):
        assert login(client).status_code == 401
    assert_limited(login(client))


@pytest.mark.parametrize("password", [None, "short", 12, "x" * 129])
def test_invalid_password_still_consumes_attempt(client, clock, password):
    for _ in range(8):
        assert login(client, password=password).status_code == 401
    assert_limited(login(client))


@pytest.mark.parametrize("email", [None, "", "not-email", 12, "x" * 255 + "@example.test"])
def test_unusable_email_does_not_create_counter(app, client, email):
    assert login(client, email=email).status_code == 401
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(PasswordLoginLimit.email_digest))) == 0


def test_csrf_rejection_does_not_consume_attempt(app, clock):
    raw = app.test_client()
    assert login(raw).status_code == 403
    assert login(raw, headers={**HEADERS, "Origin": "https://evil.example"}).status_code == 403
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(PasswordLoginLimit.email_digest))) == 0


def test_limited_account_can_still_read_save_and_logout(client, clock):
    register(client)
    for _ in range(8):
        assert login(client, password="incorrect-password").status_code == 401
    assert_limited(login(client))
    assert client.get("/api/v1/me").status_code == 200
    assert client.get("/api/v1/me/progress").status_code == 200
    assert client.put("/api/v1/me/progress/lesson-01", json={"status": "completed"}).status_code == 201
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.get("/api/v1/me").status_code == 401
    assert_limited(login(client))


def test_google_and_registration_are_not_subject_to_password_limit(app, client, clock, monkeypatch, google_identity):
    for _ in range(8):
        login(client, email=google_identity.email)
    assert_limited(login(client, email=google_identity.email))
    monkeypatch.setattr("app.routes.auth.verify_google_credential", lambda credential, client_id: google_identity)
    assert client.post("/api/v1/auth/google", json={"credential": "fake-test-only"}).status_code == 200
    register(client, email="another@example.test")
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(PasswordLoginLimit.email_digest))) == 1


def test_missing_table_fails_closed_without_leaking_details(app, client, monkeypatch, caplog):
    register(client)
    with app.app_context():
        PasswordLoginLimit.__table__.drop(db.engine)  # Fixture's memory table only.
    monkeypatch.setattr("app.routes.auth.password_matches", lambda *args: pytest.fail("Storage failure must refuse login."))
    response = login(client)
    assert response.status_code == 503
    assert response.get_json()["code"] == "login_protection_unavailable"
    assert response.headers["Cache-Control"] == "no-store"
    assert "Set-Cookie" not in response.headers
    assert EMAIL not in response.get_data(as_text=True) + caplog.text
    assert PASSWORD not in response.get_data(as_text=True) + caplog.text
    assert "SELECT" not in caplog.text and "INSERT" not in caplog.text
    assert client.get("/api/v1/me").status_code == 200


def config(uri="sqlite+pysqlite:///:memory:", **overrides):
    return {
        "TESTING": True, "SQLALCHEMY_DATABASE_URI": uri, "SQLALCHEMY_ENGINE_OPTIONS": {},
        "CORS_ORIGINS": [HEADERS["Origin"]], "CSRF_TRUSTED_ORIGINS": [HEADERS["Origin"]],
        "PASSWORD_LOGIN_MAX_ATTEMPTS": 8, "PASSWORD_LOGIN_WINDOW_SECONDS": 300,
        **overrides,
    }


@pytest.mark.parametrize("setting", ["PASSWORD_LOGIN_MAX_ATTEMPTS", "PASSWORD_LOGIN_WINDOW_SECONDS"])
@pytest.mark.parametrize("value", [0, -1, True, False, "8", 1.5, None, 999999])
def test_invalid_policy_configuration_fails_closed(setting, value):
    with pytest.raises(ValueError, match=setting):
        create_app(config(**{setting: value}))


def test_custom_policy_works_without_disabling_csrf(clock):
    configured = create_app(config(PASSWORD_LOGIN_MAX_ATTEMPTS=2, PASSWORD_LOGIN_WINDOW_SECONDS=10))
    with configured.app_context():
        db.create_all()
    raw = configured.test_client()
    assert login(raw).status_code == 403
    assert login(raw, headers=HEADERS).status_code == 401
    assert login(raw, headers=HEADERS).status_code == 401
    assert_limited(login(raw, headers=HEADERS), seconds=10)


def test_storage_shared_across_instances_and_survives_recreation(tmp_path, clock):
    uri = "sqlite+pysqlite:///" + (tmp_path / "isolated-login-limit.db").as_posix()
    first, second = create_app(config(uri)), create_app(config(uri))
    with first.app_context():
        PasswordLoginLimit.__table__.create(db.engine)
    for index in range(8):
        with (first if index % 2 else second).app_context():
            assert consume_password_login_attempt(EMAIL) is None
    for app in [first, second]:
        with app.app_context():
            assert consume_password_login_attempt(EMAIL) == 300
            db.engine.dispose()
    recreated = create_app(config(uri))
    with recreated.app_context():
        assert consume_password_login_attempt(EMAIL) == 300
        db.engine.dispose()


def test_concurrent_workers_share_eight_slots_without_lost_updates(tmp_path, clock):
    uri = "sqlite+pysqlite:///" + (tmp_path / "isolated-concurrent-limit.db").as_posix()
    apps = [create_app(config(uri)), create_app(config(uri))]
    with apps[0].app_context():
        PasswordLoginLimit.__table__.create(db.engine)
    def consume(index):
        with apps[index % 2].app_context():
            return consume_password_login_attempt(EMAIL)
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(consume, range(32)))
    assert results.count(None) == 8
    assert results.count(300) == 24
    with apps[0].app_context():
        counter = db.session.execute(db.select(PasswordLoginLimit)).scalar_one()
        assert counter.attempts == 9
        assert counter.expires_at == BASE_TIME + 300
    for app in apps:
        with app.app_context():
            db.engine.dispose()


def test_postgres_statement_compiles_native_atomic_upsert():
    statement = _consume_statement("postgresql", "f" * 64, BASE_TIME, 8, 300)
    sql = str(statement.compile(dialect=postgresql.dialect()))
    assert "ON CONFLICT (email_digest) DO UPDATE" in sql
    assert "CASE WHEN" in sql
    assert "RETURNING password_login_limits.attempts, password_login_limits.expires_at" in sql


def test_unknown_storage_dialect_is_not_silently_downgraded():
    with pytest.raises(ValueError, match="PostgreSQL or SQLite"):
        _consume_statement("mysql", "f" * 64, BASE_TIME, 8, 300)


def test_new_migration_upgrade_downgrade_preserve_existing_accounts(app, client, clock):
    register(client)
    directory = str(Path(__file__).resolve().parents[1] / "migrations")
    with app.app_context():
        # Only the new migration, on this fixture's in-memory database.
        PasswordLoginLimit.__table__.drop(db.engine)
        stamp(directory=directory, revision="20260920_0003")
        upgrade(directory=directory)
        schema = inspect(db.engine)
        assert "password_login_limits" in schema.get_table_names()
        assert schema.get_pk_constraint("password_login_limits")["constrained_columns"] == ["email_digest"]
        assert schema.get_indexes("password_login_limits")[0]["name"] == "ix_password_login_limits_expires_at"
        assert len(schema.get_check_constraints("password_login_limits")) == 2
        assert consume_password_login_attempt(EMAIL) is None
        assert db.session.scalar(db.select(db.func.count(User.id))) == 1
        assert db.session.scalar(db.select(db.func.count(AuthSession.id))) == 1
        db.session.remove()
        downgrade(directory=directory, revision="20260920_0003")
        assert "password_login_limits" not in inspect(db.engine).get_table_names()
        assert db.session.scalar(db.select(db.func.count(User.id))) == 1
        db.session.remove()
        upgrade(directory=directory)
    assert client.get("/api/v1/me").status_code == 200
    assert login(client).status_code == 200
