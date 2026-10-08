"""Real HTTPS/API smoke check. Account writes require an explicit local-only flag."""
import argparse
import http.cookiejar
import json
from pathlib import Path
import secrets
import ssl
import sys
import time
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPCookieProcessor, HTTPSHandler

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "infra"))
from release import require_local  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exercise-account", action="store_true", help="Create fictitious accounts only in the localhost rehearsal")
    args = parser.parse_args()
    settings = require_local()
    origin = settings["PUBLIC_ORIGIN"]
    tls = ROOT / settings["TLS_DIR"] / "fullchain.pem"
    context = ssl.create_default_context(cafile=str(tls))
    cookies = http.cookiejar.CookieJar()
    opener = build_opener(HTTPSHandler(context=context), HTTPCookieProcessor(cookies))
    results = []

    def request(path, expected=200, method="GET", body=None, protected=True):
        headers = {"Origin": origin}
        if protected:
            headers["X-ExploraLab-Request"] = "1"
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        started = time.monotonic()
        try:
            response = opener.open(Request(origin + path, data=data, headers=headers, method=method), timeout=15)
        except HTTPError as error:
            response = error
        payload = response.read()
        if response.code != expected:
            raise AssertionError(f"Unexpected HTTP status for {method} {path}: {response.code}, expected {expected}")
        results.append({"path": path, "method": method, "status": response.code, "milliseconds": round((time.monotonic() - started) * 1000)})
        return response, payload

    for path in ["/", "/login", "/register", "/world", "/progress/zone-01"]:
        response, html = request(path)
        assert b"<app-root" in html, "Angular route fallback failed"
        assert response.headers["X-Content-Type-Options"] == "nosniff"
    request("/missing-static-file.js", expected=404)
    _, data = request("/assets/game/maps/open-pit.tmj")
    assert json.loads(data)["type"] == "map"
    request("/api/v1/health")
    _, data = request("/api/v1/ready")
    assert json.loads(data)["version"] == settings["APP_VERSION"]
    request("/api/v1/me", expected=401)
    request("/api/v1/auth/register", method="POST", body={}, protected=False, expected=403)
    request("/api/v1/auth/register", method="POST", body={"padding": "x" * 65537}, expected=413)

    if args.exercise_account:
        assert urlsplit(origin).hostname == "localhost", "No account tests on external hosts"
        password = "TemporaryTest123!" + secrets.token_hex(8)
        email = f"rehearsal-{secrets.token_hex(8)}@example.invalid"
        _, data = request("/api/v1/auth/register", method="POST", expected=201, body={
            "email": email, "displayName": "Cuenta ficticia", "password": password,
        })
        assert any(cookie.secure and cookie.path == "/api" for cookie in cookies)
        request("/api/v1/me")
        request("/api/v1/me/progress/lesson-09", method="PUT", body={"status": "completed"}, expected=409)
        request("/api/v1/me/progress/not-a-lesson", method="PUT", body={"status": "completed"}, expected=400)
        for number in range(1, 10):
            path = f"/api/v1/me/progress/lesson-{number:02d}"
            request(path, method="PUT", body={"status": "completed", "currentStep": 0}, expected=201)
            request(path, method="PUT", body={"status": "completed", "currentStep": 0})
        _, data = request("/api/v1/me/progress")
        assert len(json.loads(data)["lessons"]) == 9
        request("/api/v1/auth/logout", method="POST", body={})
        request("/api/v1/me", expected=401)
        request("/api/v1/auth/login", method="POST", body={"email": email, "password": password})
        _, data = request("/api/v1/me/progress")
        assert len(json.loads(data)["lessons"]) == 9
        request("/api/v1/auth/logout", method="POST", body={})
    report = {"version": settings["APP_VERSION"], "checks": results, "scope": "HTTPS/API, not a complete gameplay or learning test"}
    (ROOT / "infra" / ".local" / "http-smoke.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"{len(results)} real HTTPS checks passed; report contains no accounts, passwords or tokens.")


if __name__ == "__main__":
    main()
