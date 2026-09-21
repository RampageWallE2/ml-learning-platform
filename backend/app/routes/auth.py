from datetime import datetime, timezone

from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy.exc import IntegrityError

from ..auth.google import GoogleCredentialError, verify_google_credential
from ..auth.password import (
    hash_password,
    normalize_display_name,
    normalize_email,
    password_matches,
    validate_password,
)
from ..auth.session import (
    clear_session_cookie,
    create_session,
    get_session_from_request,
    require_auth,
    set_session_cookie,
)
from ..extensions import db
from ..models import LearningProfile, User, UserIdentity


auth_blueprint = Blueprint("auth", __name__, url_prefix="/api/v1")


def _error(message: str, status_code: int, code: str | None = None):
    payload = {"error": message}
    if code:
        payload["code"] = code
    return jsonify(payload), status_code


def _session_response(user: User, status_code: int = 200):
    _, token = create_session(user)
    db.session.commit()

    response = jsonify({"user": user.to_dict()})
    set_session_cookie(response, token)
    return response, status_code


def _json_payload():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return None, _error("A JSON object is required.", 400)
    return payload, None


@auth_blueprint.post("/auth/register")
def register():
    payload, error = _json_payload()
    if error is not None:
        return error

    try:
        display_name = normalize_display_name(payload.get("displayName"))
        email = normalize_email(payload.get("email"))
        password = validate_password(payload.get("password"))
    except ValueError as validation_error:
        return _error(
            str(validation_error),
            400,
            "invalid_registration_data",
        )

    existing_user = db.session.execute(
        db.select(User).where(User.email == email)
    ).scalar_one_or_none()
    if existing_user is not None:
        has_google_identity = any(
            identity.provider == "google"
            for identity in existing_user.identities
        )
        code = (
            "email_registered_with_google"
            if has_google_identity
            else "email_already_registered"
        )
        return _error("An account already exists with this email.", 409, code)

    user = User(
        email=email,
        display_name=display_name,
    )
    identity = UserIdentity(
        user=user,
        provider="password",
        provider_subject=email,
        password_hash=hash_password(password),
    )
    profile = LearningProfile(user=user)
    db.session.add_all([user, identity, profile])

    try:
        return _session_response(user, 201)
    except IntegrityError:
        db.session.rollback()
        return _error(
            "An account already exists with this email.",
            409,
            "email_already_registered",
        )


@auth_blueprint.post("/auth/login")
def password_login():
    payload, error = _json_payload()
    if error is not None:
        return error

    try:
        email = normalize_email(payload.get("email"))
        password = validate_password(payload.get("password"))
    except ValueError:
        return _error("Invalid email or password.", 401, "invalid_credentials")

    identity = db.session.execute(
        db.select(UserIdentity).where(
            UserIdentity.provider == "password",
            UserIdentity.provider_subject == email,
        )
    ).scalar_one_or_none()

    password_hash = identity.password_hash if identity is not None else None
    password_is_valid = password_matches(password_hash, password)
    if identity is None or not password_is_valid:
        return _error("Invalid email or password.", 401, "invalid_credentials")

    return _session_response(identity.user)


@auth_blueprint.post("/auth/google")
def google_login():
    client_id = current_app.config.get("GOOGLE_CLIENT_ID")
    if not client_id:
        return _error("Google authentication is not configured.", 503)

    payload, error = _json_payload()
    if error is not None:
        return error

    credential = payload.get("credential")
    if not isinstance(credential, str) or not credential.strip():
        return _error("Google credential is required.", 400)

    try:
        google_identity = verify_google_credential(credential, client_id)
    except GoogleCredentialError:
        return _error("Invalid Google credential.", 401)

    google_email = normalize_email(google_identity.email)

    identity = db.session.execute(
        db.select(UserIdentity).where(
            UserIdentity.provider == "google",
            UserIdentity.provider_subject == google_identity.subject,
        )
    ).scalar_one_or_none()

    if identity is None:
        existing_user = db.session.execute(
            db.select(User).where(User.email == google_email)
        ).scalar_one_or_none()

        if existing_user is not None:
            return _error(
                "An account already exists with this email. Sign in with its existing method before linking Google.",
                409,
                "account_exists_with_different_sign_in",
            )

        user = User(
            email=google_email,
            display_name=google_identity.display_name,
            avatar_url=google_identity.avatar_url,
        )
        identity = UserIdentity(
            user=user,
            provider="google",
            provider_subject=google_identity.subject,
        )
        profile = LearningProfile(user=user)
        db.session.add_all([user, identity, profile])
    else:
        user = identity.user

        if user.email != google_email:
            email_owner = db.session.execute(
                db.select(User).where(User.email == google_email)
            ).scalar_one_or_none()
            if email_owner is not None and email_owner.id != user.id:
                return _error("Google email is already used by another account.", 409)
            user.email = google_email

        user.display_name = google_identity.display_name
        user.avatar_url = google_identity.avatar_url

        if user.learning_profile is None:
            db.session.add(LearningProfile(user=user))

    return _session_response(user)


@auth_blueprint.post("/auth/logout")
def logout():
    session = get_session_from_request()
    if session is not None:
        session.revoked_at = datetime.now(timezone.utc)
        db.session.commit()

    response = jsonify({"message": "Logged out."})
    clear_session_cookie(response)
    return response


@auth_blueprint.get("/me")
@require_auth
def me():
    return jsonify({"user": g.current_user.to_dict()})
