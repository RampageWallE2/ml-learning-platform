from datetime import datetime, timedelta, timezone

import pytest

from app.extensions import db
from app.models import AuthSession, PasswordLoginLimit, User


def _create_sessions(app) -> None:
    now = datetime.now(timezone.utc)

    with app.app_context():
        user = User(
            email="cleanup@example.com",
            display_name="Cleanup Test",
        )
        db.session.add_all(
            [
                AuthSession(
                    user=user,
                    token_hash="active-token",
                    expires_at=now + timedelta(days=1),
                ),
                AuthSession(
                    user=user,
                    token_hash="expired-token",
                    expires_at=now - timedelta(seconds=1),
                ),
                AuthSession(
                    user=user,
                    token_hash="revoked-token",
                    expires_at=now + timedelta(days=1),
                    revoked_at=now,
                ),
            ]
        )
        db.session.commit()


def test_cleanup_sessions_removes_only_inactive_sessions(app):
    _create_sessions(app)

    result = app.test_cli_runner().invoke(args=["cleanup-sessions"])

    assert result.exit_code == 0
    assert "2 session(s) removed." in result.output

    with app.app_context():
        sessions = db.session.execute(db.select(AuthSession)).scalars().all()
        assert [session.token_hash for session in sessions] == ["active-token"]


def test_cleanup_sessions_dry_run_does_not_delete(app):
    _create_sessions(app)

    result = app.test_cli_runner().invoke(
        args=["cleanup-sessions", "--dry-run"]
    )

    assert result.exit_code == 0
    assert "2 session(s) would be removed." in result.output

    with app.app_context():
        count = db.session.scalar(db.select(db.func.count(AuthSession.id)))
        assert count == 3


@pytest.mark.parametrize("dry_run", [False, True])
def test_login_limit_cleanup_removes_only_expired_windows(app, monkeypatch, dry_run):
    monkeypatch.setattr("app.commands._now", lambda: 1800000000)
    _create_sessions(app)
    with app.app_context():
        db.session.add_all([
            PasswordLoginLimit(email_digest="a" * 64, attempts=9, expires_at=1800000000 - 1),
            PasswordLoginLimit(email_digest="b" * 64, attempts=2, expires_at=1800000000),
            PasswordLoginLimit(email_digest="c" * 64, attempts=9, expires_at=1800000000 + 1),
        ])
        db.session.commit()
    args = ["cleanup-login-limits"] + (["--dry-run"] if dry_run else [])
    result = app.test_cli_runner().invoke(args=args)
    assert result.exit_code == 0
    assert "2 expired login window(s)" in result.output
    with app.app_context():
        counters = db.session.execute(db.select(PasswordLoginLimit).order_by(PasswordLoginLimit.email_digest)).scalars().all()
        assert len(counters) == (3 if dry_run else 1)
        assert counters[-1].email_digest == "c" * 64
        assert db.session.scalar(db.select(db.func.count(User.id))) == 1
        assert db.session.scalar(db.select(db.func.count(AuthSession.id))) == 3
