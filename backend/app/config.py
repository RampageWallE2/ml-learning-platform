import os
from collections.abc import Mapping

from dotenv import load_dotenv
from sqlalchemy import URL
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError


load_dotenv()


def _cors_origins() -> list[str]:
    value = os.getenv("CORS_ORIGINS", "http://localhost:4200")
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def _boolean_setting(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    # Never include the supplied value in diagnostics: configuration can contain secrets.
    raise ValueError(f"{name} must be true/false, yes/no, on/off or 1/0.")


def parse_postgresql_url(value: object, setting: str = "SQLALCHEMY_DATABASE_URI") -> URL:
    """Accept the supported driver without reflecting connection secrets in errors."""
    message = f"{setting} must use PostgreSQL with the postgresql+psycopg driver."
    if not isinstance(value, (str, URL)):
        raise ValueError(message)
    try:
        parsed = make_url(value)
    except ArgumentError:
        raise ValueError(message) from None
    if parsed.drivername != "postgresql+psycopg":
        raise ValueError(message)
    return parsed


def validate_runtime_config(config: Mapping[str, object]) -> None:
    """Validate shared settings after application overrides, before database setup."""
    environment = config["APP_ENV"]
    if not isinstance(environment, str) or environment not in {"development", "production"}:
        raise ValueError("APP_ENV must be 'development' or 'production'.")

    session_days = config["SESSION_TTL_DAYS"]
    # bool is an int subclass but is not a valid duration.
    if type(session_days) is not int or session_days <= 0:
        raise ValueError("SESSION_TTL_DAYS must be a positive integer.")

    if type(config["SESSION_COOKIE_SECURE"]) is not bool:
        raise ValueError("SESSION_COOKIE_SECURE must be a boolean.")

    parse_postgresql_url(config["SQLALCHEMY_DATABASE_URI"])


def _database_engine_options() -> dict[str, int | bool]:
    return {
        "pool_size": int(os.getenv("DB_POOL_SIZE", "2")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "1")),
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "300")),
        "pool_pre_ping": True,
    }


def _database_url() -> str:
    if os.getenv("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    if os.getenv("DATABASE_HOST"):
        # Encode special characters correctly without assembling a credential URL.
        return URL.create(
            "postgresql+psycopg", host=os.environ["DATABASE_HOST"],
            username=os.environ["DATABASE_USER"], password=os.environ["DATABASE_PASSWORD"],
            database=os.environ["DATABASE_NAME"], port=int(os.getenv("DATABASE_PORT", "5432")),
        ).render_as_string(hide_password=False)
    return "postgresql+psycopg://ml_user:ml_password@localhost:5432/ml_learning"


DATABASE_URL = _database_url()


class Config:
    APP_ENV = os.getenv("APP_ENV", "development")
    APP_VERSION = os.getenv("APP_VERSION", "development")
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_ENGINE_OPTIONS = _database_engine_options()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = _cors_origins()
    # None uses CORS_ORIGINS after application/test configuration is applied.
    CSRF_TRUSTED_ORIGINS = (
        [origin.strip() for origin in os.environ["CSRF_TRUSTED_ORIGINS"].split(",")]
        if "CSRF_TRUSTED_ORIGINS" in os.environ
        else None
    )
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "ml_session")
    SESSION_COOKIE_SECURE = _boolean_setting("SESSION_COOKIE_SECURE", False)
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_TTL_DAYS = int(os.getenv("SESSION_TTL_DAYS", "7"))
    PASSWORD_LOGIN_MAX_ATTEMPTS = int(os.getenv("PASSWORD_LOGIN_MAX_ATTEMPTS", "8"))
    PASSWORD_LOGIN_WINDOW_SECONDS = int(os.getenv("PASSWORD_LOGIN_WINDOW_SECONDS", "300"))
    API_MAX_REQUEST_BYTES = int(os.getenv("API_MAX_REQUEST_BYTES", "65536"))
