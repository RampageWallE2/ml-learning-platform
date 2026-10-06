"""Browser CSRF protection for cookie-authenticated API writes.

The custom header is public, not an authentication token. Browser preflight and
exact trusted origins prevent another site from issuing an accepted API write.
"""

import ipaddress
import re
from urllib.parse import urlsplit

from flask import Flask, jsonify, request


REQUEST_HEADER = "X-ExploraLab-Request"
REQUEST_HEADER_VALUE = "1"
SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
HOST_LABEL = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\Z")
AUTHORITY = re.compile(r"(?:\[[0-9a-fA-F:.]+\]|[a-zA-Z0-9.-]+)(?::[0-9]+)?\Z")


def _origin(value: str, *, referer: bool = False) -> str | None:
    # urlsplit tolerates some whitespace/control characters: reject before parsing.
    if not value or any(char.isspace() or ord(char) < 32 or ord(char) == 127 for char in value):
        return None
    if "\\" in value:
        return None

    try:
        parsed = urlsplit(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return None
        if parsed.username is not None or parsed.password is not None:
            return None
        if not AUTHORITY.fullmatch(parsed.netloc):
            return None
        if not referer and (parsed.path or "?" in value or "#" in value):
            return None
        host = parsed.hostname.lower()
        if ":" in host:
            host = f"[{ipaddress.IPv6Address(host).compressed}]"
        elif len(host) > 253 or not all(HOST_LABEL.fullmatch(label) for label in host.split(".")):
            return None
        port = parsed.port
        if port == 0:
            return None
    except ValueError:
        return None

    default_port = 443 if parsed.scheme == "https" else 80
    suffix = f":{port}" if port is not None and port != default_port else ""
    return f"{parsed.scheme}://{host}{suffix}"


def _configured_origins(values: object, setting: str) -> list[str]:
    if not isinstance(values, (list, tuple)) or not values:
        raise ValueError(f"{setting} must be a non-empty list of exact HTTP(S) origins.")
    origins = []
    for value in values:
        origin = _origin(value) if isinstance(value, str) else None
        if origin is None:
            # Do not reflect configuration values, which may contain credentials.
            raise ValueError(f"{setting} contains an invalid origin; wildcards and URL paths are not allowed.")
        if origin not in origins:
            origins.append(origin)
    return origins


def init_request_security(app: Flask) -> None:
    cors_origins = _configured_origins(app.config["CORS_ORIGINS"], "CORS_ORIGINS")
    configured = app.config.get("CSRF_TRUSTED_ORIGINS")
    trusted = _configured_origins(
        cors_origins if configured is None else configured, "CSRF_TRUSTED_ORIGINS"
    )
    if not set(cors_origins).issubset(trusted):
        raise ValueError("Every CORS_ORIGINS entry must also be in CSRF_TRUSTED_ORIGINS.")
    app.config["CORS_ORIGINS"] = cors_origins
    app.config["CSRF_TRUSTED_ORIGINS"] = trusted
    trusted_origins = frozenset(trusted)

    @app.before_request
    def protect_api_writes():
        if request.method in SAFE_METHODS:
            return None
        if request.path != "/api" and not request.path.startswith("/api/"):
            return None

        # Never fall back to Referer when Origin is present but invalid or null.
        origin = (
            _origin(request.headers["Origin"])
            if "Origin" in request.headers
            else _origin(request.headers.get("Referer", ""), referer=True)
        )
        if (
            request.headers.get(REQUEST_HEADER) != REQUEST_HEADER_VALUE
            or origin not in trusted_origins
        ):
            return jsonify({
                "error": "Request verification failed.",
                "code": "csrf_validation_failed",
            }), 403
        return None
