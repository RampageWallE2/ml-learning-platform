from datetime import datetime, timezone

import click
from flask import Flask
from sqlalchemy import or_

from .extensions import db
from .models import AuthSession


def register_commands(app: Flask) -> None:
    @app.cli.command("cleanup-sessions")
    @click.option(
        "--dry-run",
        is_flag=True,
        help="Count removable sessions without deleting them.",
    )
    def cleanup_sessions(dry_run: bool) -> None:
        """Delete expired and revoked authentication sessions."""
        removable = or_(
            AuthSession.revoked_at.is_not(None),
            AuthSession.expires_at <= datetime.now(timezone.utc),
        )

        if dry_run:
            count = db.session.scalar(
                db.select(db.func.count(AuthSession.id)).where(removable)
            )
            click.echo(f"{count or 0} session(s) would be removed.")
            return

        result = db.session.execute(db.delete(AuthSession).where(removable))
        db.session.commit()
        click.echo(f"{result.rowcount or 0} session(s) removed.")
