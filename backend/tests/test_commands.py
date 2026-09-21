from datetime import datetime, timedelta, timezone

from app.extensions import db
from app.models import AuthSession, User


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
