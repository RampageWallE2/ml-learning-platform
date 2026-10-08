"""Readiness and intentionally minimal, non-sensitive API diagnostics."""

import logging
import time
from uuid import uuid4

from flask import Flask, g, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from .config import validate_runtime_config
from .extensions import db


def init_operations(app: Flask) -> None:
    # Alembic may disable pre-existing loggers while running migration checks.
    app.logger.disabled = False
    app.logger.setLevel(logging.INFO)

    @app.before_request
    def start_request():
        g.request_id = uuid4().hex  # Never trust an incoming identifier.
        g.request_started = time.monotonic()

    @app.after_request
    def finish_request(response):
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
            response.headers["X-Request-ID"] = g.get("request_id", "")
            if response.status_code >= 500:
                # No path parameters, query strings, cookies, SQL or request bodies.
                app.logger.warning(
                    "API unavailable endpoint=%s status=%s request_id=%s duration_ms=%d",
                    request.endpoint or "unknown", response.status_code,
                    g.get("request_id", ""),
                    (time.monotonic() - g.get("request_started", time.monotonic())) * 1000,
                )
        return response

    @app.errorhandler(SQLAlchemyError)
    def database_unavailable(_error):
        db.session.rollback()
        response = jsonify({
            "error": "The service is temporarily unavailable. Please retry.",
            "code": "storage_unavailable",
        })
        response.status_code = 503
        response.headers["Retry-After"] = "10"
        return response

    @app.get("/api/v1/ready")
    def ready():
        # Check every registered model's columns, not just database connectivity.
        # LIMIT 0 validates the schema without fetching account/session records.
        try:
            for table in db.metadata.sorted_tables:
                db.session.execute(db.select(table).limit(0))
            return jsonify({"status": "ready", "version": app.config["APP_VERSION"]})
        except SQLAlchemyError:
            return database_unavailable(None)


def validate_production_config(app: Flask) -> None:
    validate_runtime_config(app.config)
    if app.config["APP_ENV"] != "production":
        return
    if app.debug or not app.config["SESSION_COOKIE_SECURE"]:
        raise ValueError("Production requires debug disabled and Secure session cookies.")
    if app.config["SESSION_COOKIE_SAMESITE"] not in {"Lax", "Strict"}:
        raise ValueError("Same-origin production requires Lax or Strict cookies.")
    if any(not origin.startswith("https://") for origin in app.config["CSRF_TRUSTED_ORIGINS"]):
        raise ValueError("Production requires exact HTTPS origins.")
