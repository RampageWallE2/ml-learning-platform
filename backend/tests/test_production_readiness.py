from contextlib import contextmanager

import pytest
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app import create_app
from app.config import _boolean_setting
from app.extensions import db


@contextmanager
def _temporarily_missing_schema(app, table_name, column_name=None):
    # Targets come only from this test's registered models and disposable database.
    table = db.metadata.tables[table_name]
    if column_name is None:
        temporary_name = f"{table_name}_readiness_probe"
        rename = f'ALTER TABLE "{table_name}" RENAME TO "{temporary_name}"'
        restore = f'ALTER TABLE "{temporary_name}" RENAME TO "{table_name}"'
    else:
        column_name = table.c[column_name].name
        temporary_name = f"{column_name}_readiness_probe"
        rename = f'ALTER TABLE "{table_name}" RENAME COLUMN "{column_name}" TO "{temporary_name}"'
        restore = f'ALTER TABLE "{table_name}" RENAME COLUMN "{temporary_name}" TO "{column_name}"'

    with app.app_context(), db.engine.begin() as connection:
        connection.execute(text(rename))
    try:
        yield
    finally:
        with app.app_context(), db.engine.begin() as connection:
            connection.execute(text(restore))


def test_liveness_and_readiness_are_distinct(app, client, monkeypatch):
    assert client.get("/api/v1/health").status_code == 200
    assert client.get("/api/v1/ready").get_json()["status"] == "ready"

    def fail(*_args, **_kwargs):
        raise OperationalError("secret SQL", {"password": "never-log-this"}, Exception("secret connection"))

    monkeypatch.setattr(db.session, "execute", fail)
    assert client.get("/api/v1/health").status_code == 200
    response = client.get("/api/v1/ready")
    assert response.status_code == 503
    assert response.get_json()["code"] == "storage_unavailable"
    assert "secret" not in response.get_data(as_text=True)
    assert response.headers["Retry-After"] == "10"


@pytest.mark.parametrize("table_name", [
    "users", "user_identities", "auth_sessions", "learning_profiles",
    "lesson_progress", "password_login_limits",
])
def test_readiness_detects_each_missing_required_table(app, client, table_name, caplog):
    with _temporarily_missing_schema(app, table_name):
        assert client.get("/api/v1/health").status_code == 200

        response = client.get("/api/v1/ready")

        assert response.status_code == 503
        assert response.get_json()["code"] == "storage_unavailable"
        assert response.headers["Retry-After"] == "10"
        assert response.headers["Cache-Control"] == "no-store"
        assert len(response.headers["X-Request-ID"]) == 32
        assert table_name not in response.get_data(as_text=True)
        assert table_name not in caplog.text

    assert client.get("/api/v1/ready").get_json()["status"] == "ready"


@pytest.mark.parametrize(("table_name", "column_name"), [
    ("users", "display_name"),
    ("user_identities", "password_hash"),
    ("auth_sessions", "expires_at"),
    ("learning_profiles", "user_id"),
    ("lesson_progress", "current_step"),
    ("password_login_limits", "attempts"),
])
def test_readiness_detects_missing_columns_and_recovers(app, client, table_name, column_name, caplog):
    with _temporarily_missing_schema(app, table_name, column_name):
        assert client.get("/api/v1/health").status_code == 200

        response = client.get("/api/v1/ready")

        assert response.status_code == 503
        assert response.get_json()["code"] == "storage_unavailable"
        assert column_name not in response.get_data(as_text=True)
        assert column_name not in caplog.text
        assert client.get("/api/v1/ready").status_code == 503

    assert client.get("/api/v1/ready").status_code == 200


def test_readiness_preserves_account_session_and_progress(app, logged_in_client):
    saved = logged_in_client.put("/api/v1/me/progress/lesson-01", json={
        "status": "in_progress", "currentStep": 3,
    })
    assert saved.status_code == 201
    previous_user = logged_in_client.get("/api/v1/me").get_json()
    previous_progress = logged_in_client.get("/api/v1/me/progress").get_json()
    previous_cookie = logged_in_client.get_cookie("ml_session", path="/api").value
    with app.app_context():
        previous_counts = {
            table.name: db.session.scalar(db.select(db.func.count()).select_from(table))
            for table in db.metadata.sorted_tables
        }

    response = logged_in_client.get("/api/v1/ready")

    assert response.status_code == 200
    assert "Set-Cookie" not in response.headers
    assert logged_in_client.get("/api/v1/me").get_json() == previous_user
    assert logged_in_client.get("/api/v1/me/progress").get_json() == previous_progress
    assert logged_in_client.get_cookie("ml_session", path="/api").value == previous_cookie
    with app.app_context():
        for table in db.metadata.sorted_tables:
            assert db.session.scalar(db.select(db.func.count()).select_from(table)) == previous_counts[table.name]


def test_api_failures_do_not_log_sensitive_sql(app, client, monkeypatch, caplog):
    def fail(*_args, **_kwargs):
        raise OperationalError("secret SQL", {"password": "never-log-this"}, Exception("secret connection"))

    monkeypatch.setattr(db.session, "execute", fail)
    client.get("/api/v1/ready?password=secret-query", headers={"Cookie": "secret-cookie"})
    assert "API unavailable" in caplog.text
    assert "secret" not in caplog.text
    assert "never-log-this" not in caplog.text


def test_api_responses_are_not_cached_and_have_server_generated_ids(client):
    first = client.get("/api/v1/health", headers={"X-Request-ID": "user-controlled"})
    second = client.get("/api/v1/health")
    assert first.headers["Cache-Control"] == "no-store"
    assert len(first.headers["X-Request-ID"]) == 32
    assert first.headers["X-Request-ID"] != "user-controlled"
    assert first.headers["X-Request-ID"] != second.headers["X-Request-ID"]


@pytest.mark.parametrize("override", [
    {"DEBUG": True}, {"SESSION_COOKIE_SECURE": False},
    {"SESSION_COOKIE_SAMESITE": "None"},
    {"CORS_ORIGINS": ["http://localhost"], "CSRF_TRUSTED_ORIGINS": ["http://localhost"]},
])
def test_insecure_production_configuration_is_rejected(test_database_url, override):
    settings = {
        "TESTING": True, "APP_ENV": "production", "DEBUG": False,
        "SQLALCHEMY_DATABASE_URI": test_database_url, "SQLALCHEMY_ENGINE_OPTIONS": {},
        "SESSION_COOKIE_SECURE": True, "SESSION_COOKIE_SAMESITE": "Lax",
        "CORS_ORIGINS": ["https://example.com"], "CSRF_TRUSTED_ORIGINS": ["https://example.com"],
    }
    settings.update(override)
    with pytest.raises(ValueError):
        create_app(settings)


@pytest.mark.parametrize(("override", "setting"), [
    ({"APP_ENV": "prodution", "DEBUG": True}, "APP_ENV"),
    ({"APP_ENV": "Production"}, "APP_ENV"),
    ({"APP_ENV": "production "}, "APP_ENV"),
    ({"APP_ENV": ""}, "APP_ENV"),
    ({"APP_ENV": None}, "APP_ENV"),
    ({"APP_ENV": ["production"]}, "APP_ENV"),
    ({"SESSION_TTL_DAYS": 0}, "SESSION_TTL_DAYS"),
    ({"SESSION_TTL_DAYS": -1}, "SESSION_TTL_DAYS"),
    ({"SESSION_TTL_DAYS": True}, "SESSION_TTL_DAYS"),
    ({"SESSION_TTL_DAYS": 1.5}, "SESSION_TTL_DAYS"),
    ({"SESSION_TTL_DAYS": "7"}, "SESSION_TTL_DAYS"),
    ({"SESSION_TTL_DAYS": None}, "SESSION_TTL_DAYS"),
    ({"SESSION_COOKIE_SECURE": "false"}, "SESSION_COOKIE_SECURE"),
    ({"SESSION_COOKIE_SECURE": 1}, "SESSION_COOKIE_SECURE"),
    ({"SESSION_COOKIE_SECURE": None}, "SESSION_COOKIE_SECURE"),
])
def test_invalid_runtime_configuration_fails_before_database_setup(app, monkeypatch, override, setting):
    database_initializations = []
    monkeypatch.setattr(db, "init_app", lambda configured_app: database_initializations.append(configured_app))
    settings = dict(app.config)
    settings.update(override)

    with pytest.raises(ValueError, match=setting):
        create_app(settings)

    assert database_initializations == []


@pytest.mark.parametrize("uri", [
    "sqlite://", "sqlite+pysqlite:///:memory:",
    "mysql+pymysql://user:private-password@localhost/database",
    "postgresql+psycopg2://user:private-password@localhost/database",
    "not-a-database-url", None, 42,
])
def test_unsupported_database_is_rejected_before_setup(app, monkeypatch, uri):
    database_initializations = []
    monkeypatch.setattr(db, "init_app", lambda configured_app: database_initializations.append(configured_app))
    settings = dict(app.config)
    settings["SQLALCHEMY_DATABASE_URI"] = uri

    with pytest.raises(ValueError, match="SQLALCHEMY_DATABASE_URI") as error:
        create_app(settings)

    assert "private-password" not in str(error.value)
    assert database_initializations == []


@pytest.mark.parametrize("environment", ["development", "production"])
@pytest.mark.parametrize("session_days", [1, 7, 30])
def test_valid_runtime_configuration_preserves_settings(app, environment, session_days):
    settings = dict(app.config)
    settings.update({
        "APP_ENV": environment,
        "SESSION_TTL_DAYS": session_days,
        "SESSION_COOKIE_SECURE": environment == "production",
        "CORS_ORIGINS": ["https://example.com"],
        "CSRF_TRUSTED_ORIGINS": ["https://example.com"],
    })

    configured = create_app(settings)

    assert configured.config["APP_ENV"] == environment
    assert configured.config["SESSION_TTL_DAYS"] == session_days
    assert configured.config["SESSION_COOKIE_SECURE"] is (environment == "production")


@pytest.mark.parametrize(("value", "expected"), [
    ("1", True), ("true", True), ("yes", True), ("on", True),
    ("0", False), ("false", False), ("no", False), ("off", False),
    (" TRUE ", True), (" OFF ", False),
])
def test_boolean_setting_accepts_explicit_values(monkeypatch, value, expected):
    monkeypatch.setenv("SESSION_COOKIE_SECURE", value)

    assert _boolean_setting("SESSION_COOKIE_SECURE", False) is expected


@pytest.mark.parametrize("default", [False, True])
def test_boolean_setting_uses_default_only_when_absent(monkeypatch, default):
    monkeypatch.delenv("SESSION_COOKIE_SECURE", raising=False)

    assert _boolean_setting("SESSION_COOKIE_SECURE", default) is default


@pytest.mark.parametrize("value", ["", " ", "flase", "enabled", "2", "sensitive-config-value"])
def test_boolean_setting_rejects_invalid_values_without_reflecting_them(monkeypatch, value):
    monkeypatch.setenv("SESSION_COOKIE_SECURE", value)

    with pytest.raises(ValueError, match="SESSION_COOKIE_SECURE") as error:
        _boolean_setting("SESSION_COOKIE_SECURE", False)

    assert str(error.value) == "SESSION_COOKIE_SECURE must be true/false, yes/no, on/off or 1/0."


def test_secure_production_cookie(app):
    app.config["SESSION_COOKIE_SECURE"] = True
    client = app.test_client()
    response = client.post("/api/v1/auth/register", json={
        "email": "production@example.com", "displayName": "Prueba",
        "password": "ProductionTest123!",
    }, headers={"Origin": "http://localhost:4200", "X-ExploraLab-Request": "1"})
    assert response.status_code == 201
    cookie = response.headers["Set-Cookie"]
    assert "Secure" in cookie and "HttpOnly" in cookie
    assert "SameSite=Lax" in cookie and "Path=/api" in cookie
