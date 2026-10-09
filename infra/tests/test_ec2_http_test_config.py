"""Resolve public templates only; never start Docker services or read secrets."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]
TEST_ORIGIN = "http://127.0.0.1"
SETTING_NAMES = (
    "APP_VERSION", "PUBLIC_ORIGIN", "BIND_ADDRESS", "HTTP_PORT", "HTTPS_PORT",
    "TLS_DIR", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD",
    "GOOGLE_CLIENT_ID", "WEB_CONCURRENCY", "HTTP_TEST_ORIGIN",
)


def resolve_config(override=False, origin=TEST_ORIGIN):
    environment = os.environ.copy()
    for name in SETTING_NAMES:
        environment.pop(name, None)
    if origin is not None:
        environment["HTTP_TEST_ORIGIN"] = origin
    command = [
        "docker", "compose", "--env-file", str(ROOT / ".env.ec2.example"),
        "-p", "exploralab-ec2", "--profile", "tools",
        "-f", str(ROOT / "compose.production.yml"),
    ]
    if override:
        command += ["-f", str(ROOT / "compose.ec2-http-test.yml")]
    command += ["config", "--format", "json"]
    return subprocess.run(command, cwd=ROOT, env=environment, capture_output=True, timeout=30)


class HttpTestConfigurationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        configs = []
        for override in (False, True):
            result = resolve_config(override)
            if result.returncode:
                raise RuntimeError("Public Compose template validation failed; no values printed.")
            configs.append(json.loads(result.stdout))
        cls.production, cls.http_test = configs

    def test_production_stays_https_and_secure(self):
        for name in ("backend", "migrate"):
            environment = self.production["services"][name]["environment"]
            self.assertEqual(environment["APP_ENV"], "production")
            self.assertEqual(environment["SESSION_COOKIE_SECURE"], "true")
            self.assertTrue(environment["CORS_ORIGINS"].startswith("https://"))
        frontend = self.production["services"]["frontend"]
        self.assertEqual({port["target"] for port in frontend["ports"]}, {80, 443})
        self.assertEqual(frontend["volumes"][0]["target"], "/etc/nginx/tls")

    def test_http_test_retains_database_and_api_limits(self):
        self.assertEqual(self.http_test["services"]["database"], self.production["services"]["database"])
        self.assertEqual(self.http_test["volumes"], self.production["volumes"])
        for name in ("backend", "migrate"):
            service = self.http_test["services"][name]
            original = self.production["services"][name]
            environment = service["environment"]
            self.assertEqual(environment["APP_ENV"], "development")
            self.assertEqual(environment["FLASK_DEBUG"], "0")
            self.assertEqual(environment["SESSION_COOKIE_SECURE"], "false")
            self.assertEqual(environment["SESSION_COOKIE_SAMESITE"], "Lax")
            self.assertEqual(environment["CORS_ORIGINS"], TEST_ORIGIN)
            self.assertEqual(environment["CSRF_TRUSTED_ORIGINS"], TEST_ORIGIN)
            self.assertEqual(environment["GOOGLE_CLIENT_ID"], "")
            for key in ("DATABASE_PASSWORD", "WEB_CONCURRENCY", "API_MAX_REQUEST_BYTES", "PASSWORD_LOGIN_MAX_ATTEMPTS"):
                self.assertEqual(environment[key], original["environment"][key])
            if "command" in original:
                self.assertEqual(service["command"], original["command"])
            self.assertFalse(service.get("ports"))
        self.assertTrue(self.http_test["services"]["backend"]["read_only"])

    def test_http_frontend_replaces_tls_and_https_ports(self):
        frontend = self.http_test["services"]["frontend"]
        self.assertEqual(len(frontend["ports"]), 1)
        self.assertEqual(frontend["ports"][0]["target"], 80)
        self.assertEqual(len(frontend["volumes"]), 1)
        mount = frontend["volumes"][0]
        self.assertEqual(mount["target"], "/etc/nginx/templates/default.conf.template")
        self.assertTrue(mount["read_only"])
        self.assertFalse(mount["bind"]["create_host_path"])
        self.assertEqual(frontend["environment"]["PUBLIC_ORIGIN"], TEST_ORIGIN)
        self.assertEqual(frontend["build"]["args"]["GOOGLE_CLIENT_ID"], "")
        self.assertEqual(frontend["healthcheck"]["test"][-1], "http://127.0.0.1/healthz")

    def test_override_requires_explicit_origin(self):
        result = resolve_config(True, origin=None)
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
