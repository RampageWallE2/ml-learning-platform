import os

from dotenv import load_dotenv


load_dotenv()


def _cors_origins() -> list[str]:
    value = os.getenv("CORS_ORIGINS", "http://localhost:4200")
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def _boolean_setting(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _database_engine_options(database_url: str) -> dict[str, int | bool]:
    if database_url.startswith("sqlite"):
        return {}

    return {
        "pool_size": int(os.getenv("DB_POOL_SIZE", "2")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "1")),
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "300")),
        "pool_pre_ping": True,
    }


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://ml_user:ml_password@localhost:5432/ml_learning",
)


class Config:
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_ENGINE_OPTIONS = _database_engine_options(DATABASE_URL)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = _cors_origins()
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "ml_session")
    SESSION_COOKIE_SECURE = _boolean_setting("SESSION_COOKIE_SECURE", False)
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_TTL_DAYS = int(os.getenv("SESSION_TTL_DAYS", "7"))
