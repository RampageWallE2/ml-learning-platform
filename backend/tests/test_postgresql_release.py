"""Real PostgreSQL checks; never fall back to the normal DATABASE_URL."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from flask_migrate import upgrade, downgrade
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url

from app import create_app
from app.extensions import db
from app.models import LessonProgress, User

MIGRATIONS = str(Path(__file__).resolve().parents[1] / "migrations")


def test_parallel_progress_writes_are_idempotent_and_never_regress(app, logged_in_client):
    cookie = logged_in_client.get_cookie("ml_session", path="/api").value

    def write(index):
        client = app.test_client()
        client.set_cookie("ml_session", cookie, path="/api")
        result = client.put("/api/v1/me/progress/lesson-01", json={
            "status": "completed" if index % 2 else "in_progress", "currentStep": index,
        }, headers={"Origin": "http://localhost:4200", "X-ExploraLab-Request": "1"})
        return result.status_code

    with ThreadPoolExecutor(max_workers=12) as executor:
        statuses = list(executor.map(write, range(24)))
    assert set(statuses) <= {200, 201}
    assert statuses.count(201) == 1
    with app.app_context():
        records = list(db.session.scalars(db.select(LessonProgress)))
        assert len(records) == 1
        assert records[0].status == "completed" and records[0].current_step == 23


def test_postgresql_migrations_from_empty_and_previous_schema_preserve_accounts(test_database_url):
    url = make_url(test_database_url)
    if url.drivername != "postgresql+psycopg" or not (url.database or "").endswith("_test"):
        pytest.fail("Unsafe integration database")
    target = "exploralab_migrations_test"
    admin = create_engine(url, isolation_level="AUTOCOMMIT")
    with admin.connect() as connection:
        if connection.execute(text("SELECT 1 FROM pg_database WHERE datname=:name"), {"name": target}).first():
            pytest.fail("Migration database already exists; refusing to overwrite it")
        connection.execute(text(f'CREATE DATABASE "{target}"'))
    migration_app = create_app({
        "TESTING": True, "APP_ENV": "development",
        "SQLALCHEMY_DATABASE_URI": url.set(database=target).render_as_string(hide_password=False),
        "SQLALCHEMY_ENGINE_OPTIONS": {},
        "CORS_ORIGINS": ["http://localhost:4200"], "CSRF_TRUSTED_ORIGINS": ["http://localhost:4200"],
    })
    try:
        with migration_app.app_context():
            upgrade(directory=MIGRATIONS, revision="20260920_0003")
            user = User(email="migration@example.com", display_name="Migration test")
            db.session.add(user)
            db.session.commit()
            user_id = user.id
            upgrade(directory=MIGRATIONS)
            assert "password_login_limits" in inspect(db.engine).get_table_names()
            assert db.session.get(User, user_id).email == "migration@example.com"
            downgrade(directory=MIGRATIONS, revision="20260920_0003")
            assert "password_login_limits" not in inspect(db.engine).get_table_names()
            upgrade(directory=MIGRATIONS)
            assert db.session.get(User, user_id).id == user_id
            assert db.session.scalar(text("SELECT version_num FROM alembic_version")) == "20261006_0004"
            db.session.remove()
            db.engine.dispose()
    finally:
        with admin.connect() as connection:
            connection.execute(text(f'DROP DATABASE "{target}" WITH (FORCE)'))
        admin.dispose()
