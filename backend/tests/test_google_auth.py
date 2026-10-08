import pytest
from google.auth.exceptions import TransportError

from app.auth.google import (
    GOOGLE_TOKEN_CLOCK_SKEW_SECONDS,
    MAX_GOOGLE_SUBJECT_LENGTH,
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


@pytest.fixture()
def verified_claims():
    return {
        "iss": "https://accounts.google.com",
        "sub": "Opaque-Google-Subject",
        "email": "student@example.com",
        "email_verified": True,
        "name": "Test Student",
        "picture": "https://example.com/avatar.png",
    }


@pytest.mark.parametrize("override", [
    {"iss": []},
    {"sub": None}, {"sub": ""}, {"sub": "   "},
    {"sub": 123}, {"sub": True}, {"sub": {}},
    {"sub": "a" * (MAX_GOOGLE_SUBJECT_LENGTH + 1)},
    {"email": None}, {"email": 123}, {"email": []},
    {"email": "not-an-email"}, {"email": "a" * 250 + "@example.com"},
    {"email_verified": "true"}, {"email_verified": 1}, {"email_verified": None},
    {"name": "a" * 201}, {"name": True}, {"name": 0}, {"name": {}},
    {"picture": {"url": "https://example.com/avatar.png"}},
    {"picture": 123}, {"picture": False},
])
def test_malformed_identity_fields_are_rejected(monkeypatch, verified_claims, override):
    verified_claims.update(override)
    monkeypatch.setattr(
        "app.auth.google.id_token.verify_oauth2_token",
        lambda *_args, **_kwargs: verified_claims,
    )

    with pytest.raises(GoogleCredentialError):
        verify_google_credential("credential", "client-id")


@pytest.mark.parametrize("claims", [None, [], "not-an-object", {}])
def test_malformed_claim_objects_are_rejected(monkeypatch, claims):
    monkeypatch.setattr(
        "app.auth.google.id_token.verify_oauth2_token",
        lambda *_args, **_kwargs: claims,
    )

    with pytest.raises(GoogleCredentialError):
        verify_google_credential("credential", "client-id")


@pytest.mark.parametrize("name", [None, "", "   "])
def test_missing_or_blank_name_uses_email_name(monkeypatch, verified_claims, name):
    verified_claims["name"] = name
    verified_claims.pop("picture")
    monkeypatch.setattr(
        "app.auth.google.id_token.verify_oauth2_token",
        lambda *_args, **_kwargs: verified_claims,
    )

    identity = verify_google_credential("credential", "client-id")

    assert identity.display_name == "student"
    assert identity.avatar_url is None
    assert identity.subject == "Opaque-Google-Subject"


def test_absent_name_and_blank_avatar_are_supported(monkeypatch, verified_claims):
    verified_claims.pop("name")
    verified_claims["picture"] = "   "
    monkeypatch.setattr(
        "app.auth.google.id_token.verify_oauth2_token",
        lambda *_args, **_kwargs: verified_claims,
    )

    identity = verify_google_credential("credential", "client-id")

    assert identity.display_name == "student"
    assert identity.avatar_url is None


def test_account_fields_share_normalization_and_preserve_subject(monkeypatch, verified_claims):
    verified_claims.update({
        "email": "  STUDENT@EXAMPLE.COM  ",
        "name": "  Ana  \n Torres  ",
        "picture": "  https://example.com/avatar.png  ",
    })
    monkeypatch.setattr(
        "app.auth.google.id_token.verify_oauth2_token",
        lambda *_args, **_kwargs: verified_claims,
    )

    identity = verify_google_credential("credential", "client-id")

    assert identity.email == "student@example.com"
    assert identity.display_name == "Ana Torres"
    assert identity.avatar_url == "https://example.com/avatar.png"
    assert identity.subject == "Opaque-Google-Subject"


def test_account_field_length_boundaries_are_supported(monkeypatch, verified_claims):
    verified_claims.update({"sub": "a" * MAX_GOOGLE_SUBJECT_LENGTH, "name": "a" * 200})
    monkeypatch.setattr(
        "app.auth.google.id_token.verify_oauth2_token",
        lambda *_args, **_kwargs: verified_claims,
    )

    identity = verify_google_credential("credential", "client-id")

    assert len(identity.subject) == MAX_GOOGLE_SUBJECT_LENGTH
    assert len(identity.display_name) == 200
