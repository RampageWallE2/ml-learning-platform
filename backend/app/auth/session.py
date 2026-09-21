import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import current_app, g, jsonify, request
from sqlalchemy.orm import joinedload

from ..extensions import db
from ..models import AuthSession, User


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(user: User) -> tuple[AuthSession, str]:
    token = secrets.token_urlsafe(48)
    expires_at = _now() + timedelta(days=current_app.config["SESSION_TTL_DAYS"])
    session = AuthSession(
        user=user,
        token_hash=hash_session_token(token),
        expires_at=expires_at,
    )
    db.session.add(session)
    return session, token


def get_session_from_request() -> AuthSession | None:
    token = request.cookies.get(current_app.config["SESSION_COOKIE_NAME"])
    if not token:
        return None

    session = db.session.execute(
        db.select(AuthSession)
        .options(
            joinedload(AuthSession.user).joinedload(User.learning_profile)
        )
        .where(AuthSession.token_hash == hash_session_token(token))
    ).scalar_one_or_none()

    if session is None or session.revoked_at is not None:
        return None
    if _as_utc(session.expires_at) <= _now():
        return None

    return session


def require_auth(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        session = get_session_from_request()
        if session is None:
            return jsonify({"error": "Authentication required."}), 401

        g.auth_session = session
        g.current_user = session.user
        return view(*args, **kwargs)

    return wrapped


def set_session_cookie(response, token: str) -> None:
    max_age = current_app.config["SESSION_TTL_DAYS"] * 24 * 60 * 60
    response.set_cookie(
        current_app.config["SESSION_COOKIE_NAME"],
        token,
        max_age=max_age,
        httponly=True,
        secure=current_app.config["SESSION_COOKIE_SECURE"],
        samesite=current_app.config["SESSION_COOKIE_SAMESITE"],
        path="/api",
    )


def clear_session_cookie(response) -> None:
    response.delete_cookie(
        current_app.config["SESSION_COOKIE_NAME"],
        httponly=True,
        secure=current_app.config["SESSION_COOKIE_SECURE"],
        samesite=current_app.config["SESSION_COOKIE_SAMESITE"],
        path="/api",
    )
