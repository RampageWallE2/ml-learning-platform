import pytest

from app import create_app
from app.auth.google import GoogleIdentityData
from app.extensions import db


@pytest.fixture()
def app():
    test_app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
            "SQLALCHEMY_ENGINE_OPTIONS": {},
            "CORS_ORIGINS": ["http://localhost:4200"],
            "GOOGLE_CLIENT_ID": "test-client.apps.googleusercontent.com",
            "SESSION_COOKIE_SECURE": False,
            "SESSION_TTL_DAYS": 7,
        }
    )

    with test_app.app_context():
        db.create_all()

    yield test_app

    with test_app.app_context():
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


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
