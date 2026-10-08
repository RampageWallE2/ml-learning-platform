from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.auth.google import GoogleCredentialError, verify_google_credential
from app.auth.session import create_session
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


@pytest.mark.parametrize("override", [
    {"email": "not-an-email"},
    {"name": "a" * 201},
    {"sub": 123},
    {"picture": {"url": "https://example.com/avatar.png"}},
    {"iss": []},
])
def test_invalid_google_identity_is_rejected_before_writing(app, client, monkeypatch, override, caplog):
    claims = {
        "iss": "https://accounts.google.com", "sub": "google-subject",
        "email": "student@example.com", "email_verified": True, "name": "Test Student",
    }
    claims.update(override)
    monkeypatch.setattr(
        "app.auth.google.id_token.verify_oauth2_token",
        lambda *_args, **_kwargs: claims,
    )

    response = client.post("/api/v1/auth/google", json={"credential": "private-test-token"})

    assert response.status_code == 401
    assert response.get_json() == {"error": "Invalid Google credential."}
    assert "Set-Cookie" not in response.headers
    assert "private-test-token" not in caplog.text
    assert "student@example.com" not in caplog.text
    with app.app_context():
        for model in (User, UserIdentity, LearningProfile, AuthSession):
            assert db.session.scalar(db.select(db.func.count()).select_from(model)) == 0


def test_google_login_normalizes_account_fields_before_saving(app, client, monkeypatch):
    claims = {
        "iss": "https://accounts.google.com", "sub": "Opaque-Google-Subject",
        "email": "  STUDENT@EXAMPLE.COM  ", "email_verified": True,
        "name": "  Ana   Torres  ",
    }
    monkeypatch.setattr(
        "app.auth.google.id_token.verify_oauth2_token",
        lambda *_args, **_kwargs: claims,
    )

    response = client.post("/api/v1/auth/google", json={"credential": "test-token"})

    assert response.status_code == 200
    assert response.get_json()["user"]["displayName"] == "Ana Torres"
    with app.app_context():
        user = db.session.execute(db.select(User)).scalar_one()
        identity = db.session.execute(db.select(UserIdentity)).scalar_one()
        assert user.email == "student@example.com"
        assert user.display_name == "Ana Torres"
        assert user.avatar_url is None
        assert identity.provider_subject == "Opaque-Google-Subject"


def test_invalid_google_update_preserves_account_and_session(
    app, logged_in_client, monkeypatch, google_identity,
):
    previous_user = logged_in_client.get("/api/v1/me").get_json()["user"]
    claims = {
        "iss": "https://accounts.google.com", "sub": google_identity.subject,
        "email": google_identity.email, "email_verified": True, "name": "a" * 201,
    }
    monkeypatch.setattr("app.routes.auth.verify_google_credential", verify_google_credential)
    monkeypatch.setattr(
        "app.auth.google.id_token.verify_oauth2_token",
        lambda *_args, **_kwargs: claims,
    )

    response = logged_in_client.post("/api/v1/auth/google", json={"credential": "test-token"})

    assert response.status_code == 401
    assert "Set-Cookie" not in response.headers
    assert logged_in_client.get("/api/v1/me").get_json()["user"] == previous_user
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(AuthSession.id))) == 1
        assert db.session.execute(db.select(User)).scalar_one().to_dict() == previous_user


@pytest.mark.parametrize("provider", ["password", "google"])
def test_registration_rechecks_actual_owner_after_integrity_conflict(
    app, client, monkeypatch, google_identity, provider,
):
    registration = {
        "email": google_identity.email, "displayName": "Original account", "password": "secure-password",
    }
    if provider == "password":
        response = client.post("/api/v1/auth/register", json=registration)
        assert response.status_code == 201
    else:
        monkeypatch.setattr(
            "app.routes.auth.verify_google_credential",
            lambda *_args: google_identity,
        )
        response = client.post("/api/v1/auth/google", json={"credential": "test-token"})
        assert response.status_code == 200
    previous_user = response.get_json()["user"]

    real_execute = db.session.execute
    first_lookup = True

    def execute(statement, *args, **kwargs):
        nonlocal first_lookup
        if first_lookup:
            # Simulate an owner becoming visible only after the initial lookup.
            # The INSERT still reaches the database's real unique constraint.
            first_lookup = False
            return SimpleNamespace(scalar_one_or_none=lambda: None)
        return real_execute(statement, *args, **kwargs)

    monkeypatch.setattr(db.session, "execute", execute)

    response = client.post("/api/v1/auth/register", json=registration)

    assert response.status_code == 409
    expected_code = "email_registered_with_google" if provider == "google" else "email_already_registered"
    assert response.get_json()["code"] == expected_code
    assert "Set-Cookie" not in response.headers
    assert client.get("/api/v1/me").get_json()["user"] == previous_user
    with app.app_context():
        for model in (User, UserIdentity, LearningProfile, AuthSession):
            assert db.session.scalar(db.select(db.func.count()).select_from(model)) == 1


def test_unrelated_registration_integrity_failure_is_not_a_duplicate_email(
    app, client, monkeypatch, caplog,
):
    def invalid_session(user):
        session = AuthSession(
            user=user, token_hash=None, expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        db.session.add(session)
        return session, "private-test-session-token"

    monkeypatch.setattr("app.routes.auth.create_session", invalid_session)
    registration = {
        "email": "registration@example.com", "displayName": "Test account", "password": "secure-password",
    }

    response = client.post("/api/v1/auth/register", json=registration)

    assert response.status_code == 503
    assert response.get_json()["code"] == "storage_unavailable"
    assert "Set-Cookie" not in response.headers
    assert "registration@example.com" not in caplog.text
    assert "private-test-session-token" not in caplog.text
    assert "secure-password" not in caplog.text
    with app.app_context():
        for model in (User, UserIdentity, LearningProfile, AuthSession):
            assert db.session.scalar(db.select(db.func.count()).select_from(model)) == 0

    monkeypatch.setattr("app.routes.auth.create_session", create_session)
    assert client.post("/api/v1/auth/register", json=registration).status_code == 201


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
