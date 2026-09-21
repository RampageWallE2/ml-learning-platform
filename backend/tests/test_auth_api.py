from datetime import datetime, timedelta, timezone

from app.auth.google import GoogleCredentialError
from app.extensions import db
from app.models import AuthSession, LearningProfile, User, UserIdentity
from werkzeug.security import check_password_hash


def test_password_registration_creates_account_profile_and_session(app, client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "displayName": "  Ana   Torres  ",
            "email": "  ANA.TORRES@EXAMPLE.COM ",
            "password": "correct-horse-battery-staple",
        },
    )

    assert response.status_code == 201
    assert response.get_json()["user"]["email"] == "ana.torres@example.com"
    assert response.get_json()["user"]["displayName"] == "Ana Torres"
    assert "ml_session=" in response.headers["Set-Cookie"]

    with app.app_context():
        identity = db.session.execute(
            db.select(UserIdentity).where(UserIdentity.provider == "password")
        ).scalar_one()
        assert identity.provider_subject == "ana.torres@example.com"
        assert identity.password_hash != "correct-horse-battery-staple"
        assert check_password_hash(
            identity.password_hash,
            "correct-horse-battery-staple",
        )
        assert db.session.scalar(db.select(db.func.count(LearningProfile.id))) == 1
        assert db.session.scalar(db.select(db.func.count(AuthSession.id))) == 1


def test_password_login_reuses_registered_account(app, client):
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "displayName": "Ana Torres",
            "email": "ana@example.com",
            "password": "secure-password",
        },
    )
    client.post("/api/v1/auth/logout")

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "ANA@EXAMPLE.COM",
            "password": "secure-password",
        },
    )

    assert registration.status_code == 201
    assert response.status_code == 200
    assert response.get_json()["user"]["id"] == registration.get_json()["user"]["id"]
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(User.id))) == 1
        assert db.session.scalar(db.select(db.func.count(LearningProfile.id))) == 1


def test_password_login_rejects_wrong_and_unknown_credentials(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "displayName": "Ana Torres",
            "email": "ana@example.com",
            "password": "secure-password",
        },
    )
    client.post("/api/v1/auth/logout")

    wrong_password = client.post(
        "/api/v1/auth/login",
        json={"email": "ana@example.com", "password": "wrong-password"},
    )
    unknown_account = client.post(
        "/api/v1/auth/login",
        json={"email": "unknown@example.com", "password": "wrong-password"},
    )

    expected_error = {
        "error": "Invalid email or password.",
        "code": "invalid_credentials",
    }
    assert wrong_password.status_code == 401
    assert unknown_account.status_code == 401
    assert wrong_password.get_json() == expected_error
    assert unknown_account.get_json() == expected_error


def test_password_registration_validates_input(client):
    invalid_email = client.post(
        "/api/v1/auth/register",
        json={
            "displayName": "Ana",
            "email": "not-an-email",
            "password": "secure-password",
        },
    )
    short_password = client.post(
        "/api/v1/auth/register",
        json={
            "displayName": "Ana",
            "email": "ana@example.com",
            "password": "short",
        },
    )

    assert invalid_email.status_code == 400
    assert short_password.status_code == 400
    assert invalid_email.get_json()["code"] == "invalid_registration_data"
    assert short_password.get_json()["code"] == "invalid_registration_data"


def test_password_registration_does_not_link_an_existing_google_account(
    client,
    logged_in_client,
):
    response = logged_in_client.post(
        "/api/v1/auth/register",
        json={
            "displayName": "Another Name",
            "email": "student@example.com",
            "password": "secure-password",
        },
    )

    assert response.status_code == 409
    assert response.get_json()["code"] == "email_registered_with_google"


def test_google_login_creates_account_profile_and_session(
    app,
    client,
    monkeypatch,
    google_identity,
):
    monkeypatch.setattr(
        "app.routes.auth.verify_google_credential",
        lambda credential, client_id: google_identity,
    )

    response = client.post(
        "/api/v1/auth/google",
        json={"credential": "valid-google-token"},
    )

    assert response.status_code == 200
    assert response.get_json()["user"] == {
        "id": response.get_json()["user"]["id"],
        "email": "student@example.com",
        "displayName": "Test Student",
        "avatarUrl": "https://example.com/avatar.png",
    }
    cookie = response.headers["Set-Cookie"]
    assert "ml_session=" in cookie
    assert "HttpOnly" in cookie
    assert "SameSite=Lax" in cookie

    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(User.id))) == 1
        assert db.session.scalar(db.select(db.func.count(UserIdentity.id))) == 1
        assert db.session.scalar(db.select(db.func.count(LearningProfile.id))) == 1
        assert db.session.scalar(db.select(db.func.count(AuthSession.id))) == 1
        stored_session = db.session.execute(db.select(AuthSession)).scalar_one()
        assert stored_session.token_hash not in cookie


def test_returning_google_user_reuses_the_account(
    app,
    client,
    monkeypatch,
    google_identity,
):
    monkeypatch.setattr(
        "app.routes.auth.verify_google_credential",
        lambda credential, client_id: google_identity,
    )

    client.post("/api/v1/auth/google", json={"credential": "first-token"})
    client.post("/api/v1/auth/google", json={"credential": "second-token"})

    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(User.id))) == 1
        assert db.session.scalar(db.select(db.func.count(LearningProfile.id))) == 1
        assert db.session.scalar(db.select(db.func.count(AuthSession.id))) == 2


def test_invalid_google_credential_is_rejected(client, monkeypatch):
    def reject_credential(credential, client_id):
        raise GoogleCredentialError("invalid")

    monkeypatch.setattr(
        "app.routes.auth.verify_google_credential",
        reject_credential,
    )

    response = client.post(
        "/api/v1/auth/google",
        json={"credential": "invalid-token"},
    )

    assert response.status_code == 401
    assert response.get_json() == {"error": "Invalid Google credential."}


def test_existing_email_is_not_linked_silently(
    app,
    client,
    monkeypatch,
    google_identity,
):
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "displayName": "Password User",
            "email": "student@example.com",
            "password": "secure-password",
        },
    )
    assert registration.status_code == 201

    monkeypatch.setattr(
        "app.routes.auth.verify_google_credential",
        lambda credential, client_id: google_identity,
    )

    response = client.post(
        "/api/v1/auth/google",
        json={"credential": "valid-google-token"},
    )

    assert response.status_code == 409
    assert response.get_json()["code"] == "account_exists_with_different_sign_in"

    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(User.id))) == 1
        assert db.session.scalar(db.select(db.func.count(UserIdentity.id))) == 1


def test_me_requires_a_valid_session(client, logged_in_client):
    anonymous_client = client.application.test_client()
    unauthorized = anonymous_client.get("/api/v1/me")
    authorized = logged_in_client.get("/api/v1/me")

    assert unauthorized.status_code == 401
    assert authorized.status_code == 200
    assert authorized.get_json()["user"]["email"] == "student@example.com"


def test_logout_revokes_session(client, logged_in_client):
    logout_response = logged_in_client.post("/api/v1/auth/logout")
    me_response = logged_in_client.get("/api/v1/me")

    assert logout_response.status_code == 200
    assert "Max-Age=0" in logout_response.headers["Set-Cookie"]
    assert me_response.status_code == 401


def test_expired_session_is_rejected(app, logged_in_client):
    with app.app_context():
        session = db.session.execute(db.select(AuthSession)).scalar_one()
        session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.session.commit()

    response = logged_in_client.get("/api/v1/me")

    assert response.status_code == 401


def test_cors_allows_credentials(client):
    response = client.get(
        "/api/v1/health",
        headers={"Origin": "http://localhost:4200"},
    )

    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:4200"
    assert response.headers["Access-Control-Allow-Credentials"] == "true"
