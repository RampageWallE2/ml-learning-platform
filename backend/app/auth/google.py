from dataclasses import dataclass

from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from .password import normalize_display_name, normalize_email


GOOGLE_TOKEN_CLOCK_SKEW_SECONDS = 10
MAX_GOOGLE_SUBJECT_LENGTH = 255


class GoogleCredentialError(ValueError):
    pass


@dataclass(frozen=True)
class GoogleIdentityData:
    subject: str
    email: str
    display_name: str
    avatar_url: str | None


def verify_google_credential(
    credential: str,
    client_id: str,
) -> GoogleIdentityData:
    try:
        claims = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id,
            clock_skew_in_seconds=GOOGLE_TOKEN_CLOCK_SKEW_SECONDS,
        )
    except (GoogleAuthError, ValueError) as error:
        raise GoogleCredentialError("Invalid Google credential.") from error

    return _identity_from_claims(claims)


def _identity_from_claims(claims: object) -> GoogleIdentityData:
    """Keep provider data within the same account bounds as password registration."""
    if not isinstance(claims, dict):
        raise GoogleCredentialError("Invalid Google identity data.")

    issuer = claims.get("iss")
    if not isinstance(issuer, str) or issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise GoogleCredentialError("Invalid Google token issuer.")

    subject = claims.get("sub")
    if (
        not isinstance(subject, str)
        or not subject.strip()
        or len(subject) > MAX_GOOGLE_SUBJECT_LENGTH
    ):
        raise GoogleCredentialError("Invalid Google account identifier.")
    if claims.get("email_verified") is not True:
        raise GoogleCredentialError("Google account email is not verified.")

    try:
        email = normalize_email(claims.get("email"))
        display_name = claims.get("name")
        if display_name is None or (isinstance(display_name, str) and not display_name.strip()):
            display_name = email.split("@", maxsplit=1)[0]
        display_name = normalize_display_name(display_name)
    except ValueError as error:
        raise GoogleCredentialError("Invalid Google identity data.") from error

    avatar_url = claims.get("picture")
    if avatar_url is not None:
        if not isinstance(avatar_url, str):
            raise GoogleCredentialError("Invalid Google avatar data.")
        avatar_url = avatar_url.strip() or None

    return GoogleIdentityData(
        subject=subject,
        email=email,
        display_name=display_name,
        avatar_url=avatar_url,
    )
