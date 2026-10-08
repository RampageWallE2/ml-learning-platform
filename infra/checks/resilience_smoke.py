"""Explicit localhost rehearsal: static delivery, rate limit and database outage.

Temporarily stops ONLY the managed rehearsal database, and always restarts it.
Does not delete containers, volumes, accounts or records.
"""
from concurrent.futures import ThreadPoolExecutor
import gzip
import json
from pathlib import Path
import re
import ssl
import sys
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "infra"))
from release import compose, require_local  # noqa: E402


def main():
    settings = require_local()
    origin = settings["PUBLIC_ORIGIN"]
    context = ssl.create_default_context(cafile=str(ROOT / settings["TLS_DIR"] / "fullchain.pem"))
    checks = []

    def request(path, headers=None):
        try:
            response = urlopen(Request(origin + path, headers=headers or {}), context=context, timeout=15)
        except HTTPError as error:
            response = error
        with response:
            return response.code, response.headers, response.read()

    status, _, html = request("/")
    assert status == 200
    match = re.search(rb'src="([^"/]+-[^"/]+\.js)"', html)
    assert match, "Hashed entry script not found"
    status, headers, _ = request("/" + match[1].decode())
    # nginx expires/add_header may emit separate legal Cache-Control fields.
    assert status == 200 and "immutable" in ",".join(headers.get_all("Cache-Control", []))
    checks.append({"check": "hashed_script_immutable", "passed": True})

    status, headers, compressed = request("/assets/game/maps/open-pit.tmj", {"Accept-Encoding": "gzip"})
    assert status == 200 and headers.get("Content-Encoding") == "gzip"
    assert "must-revalidate" in headers.get("Cache-Control", "")
    raw = gzip.decompress(compressed)
    assert json.loads(raw)["type"] == "map"
    checks.append({"check": "map_gzip_revalidated", "passed": True,
                   "rawBytes": len(raw), "compressedBytes": len(compressed)})

    # GET on this POST-only endpoint is read-only. No passwords or accounts used.
    with ThreadPoolExecutor(max_workers=8) as pool:
        responses = list(pool.map(lambda _: request("/api/v1/auth/register"), range(50)))
    assert all(item[0] in {405, 429} for item in responses)
    limited = [item for item in responses if item[0] == 429]
    assert limited and all(item[1].get("Retry-After") == "60" for item in limited)
    assert all(json.loads(item[2])["code"] == "too_many_login_attempts" for item in limited)
    # Edge throttling must never block readiness, progress polling or logout.
    assert request("/api/v1/ready")[0] == 200
    assert request("/api/v1/me/progress")[0] == 401
    checks.append({"check": "auth_burst_429_without_global_api_throttling", "passed": True})

    try:
        compose("stop", "database")
        assert request("/api/v1/health")[0] == 200
        status, headers, payload = request("/api/v1/ready")
        assert status == 503 and json.loads(payload)["code"] == "storage_unavailable"
        assert headers.get("Cache-Control") == "no-store"
        checks.append({"check": "db_down_live_200_ready_503", "passed": True})
    finally:
        compose("up", "-d", "--wait", "database")
    for _ in range(10):
        if request("/api/v1/ready")[0] == 200:
            break
        time.sleep(1)
    else:
        raise AssertionError("API did not recover after restarting the rehearsal database")
    checks.append({"check": "database_recovery_without_api_restart", "passed": True})
    (ROOT / "infra/.local/resilience-smoke.json").write_text(json.dumps({
        "version": settings["APP_VERSION"], "checks": checks,
        "scope": "Managed localhost rehearsal only; no real database or external alerts",
    }, indent=2), encoding="utf-8")
    print(f"{len(checks)} resilience/delivery checks passed; rehearsal database is running again.")


if __name__ == "__main__":
    main()
