import os
import pytest

from app import create_app
from app.auth.google import GoogleIdentityData
from app.config import parse_postgresql_url
from app.extensions import db


@pytest.fixture(scope="session")
def test_database_url():
    test_database = os.getenv("TEST_DATABASE_URL")
    if not test_database:
        raise RuntimeError(
            "TEST_DATABASE_URL is required; run the backend tests with compose.verify.yml. "
            "The normal DATABASE_URL is never used as a fallback."
        )
    try:
        parsed = parse_postgresql_url(test_database, "TEST_DATABASE_URL")
    except ValueError:
        raise RuntimeError("TEST_DATABASE_URL must target a dedicated PostgreSQL *_test database.") from None
    if not (parsed.database or "").endswith("_test"):
        raise RuntimeError("TEST_DATABASE_URL must target a dedicated PostgreSQL *_test database.")
    return test_database


@pytest.fixture()
def app(test_database_url):
    test_app = create_app(
        {
            "TESTING": True,
            "APP_ENV": "development",
            "SQLALCHEMY_DATABASE_URI": test_database_url,
            "SQLALCHEMY_ENGINE_OPTIONS": {},
            "CORS_ORIGINS": ["http://localhost:4200"],
            "CSRF_TRUSTED_ORIGINS": ["http://localhost:4200"],
            "GOOGLE_CLIENT_ID": "test-client.apps.googleusercontent.com",
            "SESSION_COOKIE_NAME": "ml_session",
            "SESSION_COOKIE_SECURE": False,
            "SESSION_COOKIE_SAMESITE": "Lax",
            "SESSION_TTL_DAYS": 7,
            "PASSWORD_LOGIN_MAX_ATTEMPTS": 8,
            "PASSWORD_LOGIN_WINDOW_SECONDS": 300,
            "API_MAX_REQUEST_BYTES": 65536,
        }
    )

    with test_app.app_context():
        db.create_all()

    try:
        yield test_app
    finally:
        with test_app.app_context():
            db.session.remove()
            try:
                db.drop_all()
            finally:
                db.engine.dispose()


@pytest.fixture()
def client(app):
    test_client = app.test_client()
    test_client.environ_base.update({
        "HTTP_ORIGIN": "http://localhost:4200",
        "HTTP_X_EXPLORALAB_REQUEST": "1",
    })
    return test_client


@pytest.fixture()
def google_identity():
    return GoogleIdentityData(
        subject="google-user-123",
        email="student@example.com",
        display_name="Test Student",
        avatar_url="https://example.com/avatar.png",
    )


@pytest.fixture()
def logged_in_client(client, monkeypatch, google_identity):
    monkeypatch.setattr(
        "app.routes.auth.verify_google_credential",
        lambda credential, client_id: google_identity,
    )
    response = client.post(
        "/api/v1/auth/google",
        json={"credential": "valid-google-token"},
    )
    assert response.status_code == 200
    return client
