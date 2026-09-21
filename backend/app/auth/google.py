from dataclasses import dataclass

from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token


GOOGLE_TOKEN_CLOCK_SKEW_SECONDS = 10


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

    if claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise GoogleCredentialError("Invalid Google token issuer.")

    subject = claims.get("sub")
    email = claims.get("email")
    email_verified = claims.get("email_verified")

    if not subject or not email or email_verified is not True:
        raise GoogleCredentialError("Google account email is not verified.")

    display_name = claims.get("name") or email.split("@", maxsplit=1)[0]

    return GoogleIdentityData(
        subject=str(subject),
        email=str(email).strip().lower(),
        display_name=str(display_name).strip(),
        avatar_url=claims.get("picture"),
    )
