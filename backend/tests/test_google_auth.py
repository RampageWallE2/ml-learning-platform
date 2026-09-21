import pytest
from google.auth.exceptions import TransportError

from app.auth.google import (
    GOOGLE_TOKEN_CLOCK_SKEW_SECONDS,
    GoogleCredentialError,
    verify_google_credential,
)


def test_google_claims_are_normalized(monkeypatch):
    verification_options = {}

    def verify(credential, request, client_id, clock_skew_in_seconds):
        verification_options["clock_skew_in_seconds"] = clock_skew_in_seconds
        return {
            "iss": "https://accounts.google.com",
            "sub": "google-subject",
            "email": " Student@Example.com ",
            "email_verified": True,
            "name": "Test Student",
            "picture": "https://example.com/avatar.png",
        }

    monkeypatch.setattr(
        "app.auth.google.id_token.verify_oauth2_token",
        verify,
    )

    identity = verify_google_credential("credential", "client-id")

    assert identity.subject == "google-subject"
    assert identity.email == "student@example.com"
    assert identity.display_name == "Test Student"
    assert (
        verification_options["clock_skew_in_seconds"]
        == GOOGLE_TOKEN_CLOCK_SKEW_SECONDS
        == 10
    )


@pytest.mark.parametrize(
    "claims",
    [
        {
            "iss": "https://untrusted.example.com",
            "sub": "google-subject",
            "email": "student@example.com",
            "email_verified": True,
        },
        {
            "iss": "https://accounts.google.com",
            "sub": "google-subject",
            "email": "student@example.com",
            "email_verified": False,
        },
    ],
)
def test_untrusted_google_claims_are_rejected(monkeypatch, claims):
    monkeypatch.setattr(
        "app.auth.google.id_token.verify_oauth2_token",
        lambda credential, request, client_id, clock_skew_in_seconds: claims,
    )

    with pytest.raises(GoogleCredentialError):
        verify_google_credential("credential", "client-id")


def test_google_transport_errors_are_normalized(monkeypatch):
    def fail(credential, request, client_id, clock_skew_in_seconds):
        raise TransportError("Google unavailable")

    monkeypatch.setattr(
        "app.auth.google.id_token.verify_oauth2_token",
        fail,
    )

    with pytest.raises(GoogleCredentialError):
        verify_google_credential("credential", "client-id")
