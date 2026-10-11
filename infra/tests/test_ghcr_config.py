"""Resolve public Compose fixtures only; no registry, daemon, secrets or data writes."""
import json
import os
from pathlib import Path
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[2]
API_IMAGE = "ghcr.io/example/exploralab-api@sha256:" + "a" * 64
WEB_IMAGE = "ghcr.io/example/exploralab-web@sha256:" + "b" * 64
SETTING_NAMES = (
    "APP_VERSION", "PUBLIC_ORIGIN", "BIND_ADDRESS", "HTTP_PORT", "HTTPS_PORT",
    "TLS_DIR", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD",
    "GOOGLE_CLIENT_ID", "WEB_CONCURRENCY", "HTTP_TEST_ORIGIN",
    "GHCR_API_IMAGE", "GHCR_WEB_IMAGE",
)


def resolve_config(*, ghcr=False, http=False, overrides=None):
    environment = os.environ.copy()
    for name in SETTING_NAMES:
        environment.pop(name, None)
    if ghcr:
        environment.update(GHCR_API_IMAGE=API_IMAGE, GHCR_WEB_IMAGE=WEB_IMAGE)
    if http:
        environment["HTTP_TEST_ORIGIN"] = "http://127.0.0.1"
    environment.update(overrides or {})
    command = [
        "docker", "compose", "--env-file", str(ROOT / ".env.ec2.example"),
        "-p", "exploralab-ghcr-config-test", "--profile", "tools",
        "-f", str(ROOT / "compose.production.yml"),
    ]
    if http:
        command += ["-f", str(ROOT / "compose.ec2-http-test.yml")]
    if ghcr:
        command += ["-f", str(ROOT / "compose.ghcr.yml")]
    command += ["config", "--format", "json"]
    return subprocess.run(command, cwd=ROOT, env=environment, capture_output=True, timeout=30)


class GhcrConfigurationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.configs = {}
        for ghcr, http in ((False, False), (True, False), (False, True), (True, True)):
            result = resolve_config(ghcr=ghcr, http=http)
            if result.returncode:
                raise RuntimeError("Public GHCR Compose fixture validation failed; no values printed.")
            cls.configs[ghcr, http] = json.loads(result.stdout)

    def test_uses_published_images_without_local_builds(self):
        for http in (False, True):
            services = self.configs[True, http]["services"]
            for name, image in (("backend", API_IMAGE), ("migrate", API_IMAGE), ("frontend", WEB_IMAGE)):
                with self.subTest(http=http, service=name):
                    self.assertEqual(services[name]["image"], image)
                    self.assertNotIn("build", services[name])

    def test_preserves_database_and_volumes(self):
        for http in (False, True):
            original = self.configs[False, http]
            published = self.configs[True, http]
            self.assertEqual(published["services"]["database"], original["services"]["database"])
            self.assertEqual(published["volumes"], original["volumes"])
            self.assertEqual(published["name"], original["name"])

    def test_preserves_api_security_and_migration_command(self):
        for http in (False, True):
            for name in ("backend", "migrate"):
                with self.subTest(http=http, service=name):
                    original = self.configs[False, http]["services"][name]
                    published = self.configs[True, http]["services"][name]
                    expected = {key: value for key, value in original.items() if key not in {"build", "image"}}
                    actual = {key: value for key, value in published.items() if key != "image"}
                    self.assertEqual(actual, expected)

    def test_preserves_frontend_ports_tls_and_healthcheck(self):
        for http in (False, True):
            original = self.configs[False, http]["services"]["frontend"]
            published = self.configs[True, http]["services"]["frontend"]
            expected = {key: value for key, value in original.items() if key not in {"build", "image"}}
            actual = {key: value for key, value in published.items() if key != "image"}
            self.assertEqual(actual, expected)

    def test_production_does_not_enable_http_test_settings(self):
        services = self.configs[True, False]["services"]
        self.assertEqual(services["backend"]["environment"]["APP_ENV"], "production")
        self.assertEqual(services["backend"]["environment"]["SESSION_COOKIE_SECURE"], "true")
        self.assertEqual({port["target"] for port in services["frontend"]["ports"]}, {80, 443})

    def test_http_test_still_requires_explicit_origin(self):
        result = resolve_config(ghcr=True, http=True, overrides={"HTTP_TEST_ORIGIN": ""})
        self.assertNotEqual(result.returncode, 0)

    def test_requires_both_explicit_image_references(self):
        for name in ("GHCR_API_IMAGE", "GHCR_WEB_IMAGE"):
            with self.subTest(setting=name):
                result = resolve_config(ghcr=True, overrides={name: ""})
                self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
