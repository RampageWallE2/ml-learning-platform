import re

from werkzeug.security import check_password_hash, generate_password_hash


MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128
MAX_EMAIL_LENGTH = 254
MAX_DISPLAY_NAME_LENGTH = 200

_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_DUMMY_PASSWORD_HASH = generate_password_hash("not-a-real-user-password")


def normalize_email(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("A valid email is required.")

    email = value.strip().casefold()
    if (
        not email
        or len(email) > MAX_EMAIL_LENGTH
        or _EMAIL_PATTERN.fullmatch(email) is None
    ):
        raise ValueError("A valid email is required.")

    return email


def normalize_display_name(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("Display name is required.")

    display_name = " ".join(value.split())
    if not display_name or len(display_name) > MAX_DISPLAY_NAME_LENGTH:
        raise ValueError("Display name must contain between 1 and 200 characters.")

    return display_name


def validate_password(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("Password is required.")
    if not MIN_PASSWORD_LENGTH <= len(value) <= MAX_PASSWORD_LENGTH:
        raise ValueError("Password must contain between 8 and 128 characters.")

    return value


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def password_matches(password_hash: str | None, password: str) -> bool:
    # Checking a dummy hash keeps unknown-account requests close to the same
    # computational cost as requests for existing accounts.
    return check_password_hash(password_hash or _DUMMY_PASSWORD_HASH, password)
