"""Atomic, persistent limit for password login; no process-local fallback."""

import hashlib
import time

from flask import Flask, current_app
from sqlalchemy import case
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from ..extensions import db
from ..models import PasswordLoginLimit


def validate_login_limit_config(app: Flask) -> None:
    for setting, maximum in (
        ("PASSWORD_LOGIN_MAX_ATTEMPTS", 10000),
        ("PASSWORD_LOGIN_WINDOW_SECONDS", 86400),
    ):
        value = app.config[setting]
        if type(value) is not int or not 1 <= value <= maximum:
            raise ValueError(f"{setting} must be an integer between 1 and {maximum}.")


def _now() -> int:
    return int(time.time())


def _email_digest(normalized_email: str) -> str:
    return hashlib.sha256(f"password-login:v1\0{normalized_email}".encode("utf-8")).hexdigest()


def _consume_statement(dialect: str, digest: str, now: int, limit: int, window: int):
    table = PasswordLoginLimit.__table__
    if dialect == "postgresql":
        insert = postgres_insert
    elif dialect == "sqlite":
        insert = sqlite_insert
    else:
        raise ValueError("Password login limiting requires PostgreSQL or SQLite.")

    expired = table.c.expires_at <= now
    statement = insert(table).values(email_digest=digest, attempts=1, expires_at=now + window)
    return statement.on_conflict_do_update(
        index_elements=[table.c.email_digest],
        set_={
            # Saturate at limit + 1: rejected requests neither overflow the counter
            # nor extend expiry. The increment is performed by the database.
            "attempts": case(
                (expired, 1),
                (table.c.attempts <= limit, table.c.attempts + 1),
                else_=table.c.attempts,
            ),
            "expires_at": case((expired, now + window), else_=table.c.expires_at),
        },
    ).returning(table.c.attempts, table.c.expires_at)


def consume_password_login_attempt(normalized_email: str) -> int | None:
    """Commit a slot before credential checking; return retry seconds if refused.

    A separate short transaction keeps failed logins/route rollbacks from undoing
    the counter, and releases the row lock before expensive password hashing.
    """
    now = _now()
    limit = current_app.config["PASSWORD_LOGIN_MAX_ATTEMPTS"]
    window = current_app.config["PASSWORD_LOGIN_WINDOW_SECONDS"]
    with db.engine.begin() as connection:
        statement = _consume_statement(
            connection.dialect.name, _email_digest(normalized_email), now, limit, window
        )
        attempts, expires_at = connection.execute(statement).one()

    if attempts > limit:
        return max(1, expires_at - now)
    return None
