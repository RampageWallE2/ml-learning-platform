"""Resolve public development defaults only; no daemon, private .env or DB writes."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
OPTIONAL_SETTINGS = {
    "CORS_ORIGINS", "CSRF_TRUSTED_ORIGINS", "GOOGLE_CLIENT_ID", "SESSION_TTL_DAYS",
    "FRONTEND_PORT", "BACKEND_PORT", "POSTGRES_PORT",
}


def resolve_config(**overrides):
    environment = {name: value for name, value in os.environ.items()
                   if name not in OPTIONAL_SETTINGS and not name.startswith("COMPOSE_")}
    environment.update(overrides)
    with tempfile.TemporaryDirectory() as directory:
        public_env = Path(directory) / "empty.env"
        public_env.touch()
        result = subprocess.run(
            ["docker", "compose", "--env-file", str(public_env), "-p", "exploralab-config-test",
             "-f", str(ROOT / "compose.yml"), "config", "--format", "json"],
            cwd=ROOT, env=environment, capture_output=True, timeout=30,
        )
    if result.returncode:
        raise RuntimeError("Development Compose validation failed; no resolved settings printed.")
    return json.loads(result.stdout)


class DevelopmentConfigurationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = resolve_config()

    def test_default_clone_requires_no_private_environment_file(self):
        self.assertEqual(set(self.config["services"]), {"database", "backend", "frontend"})
        for service in self.config["services"].values():
            self.assertNotIn("env_file", service)
        self.assertNotIn("env_file:", (ROOT / "compose.yml").read_text())

    def test_default_authentication_is_local_and_google_disabled(self):
        backend = self.config["services"]["backend"]["environment"]
        frontend = self.config["services"]["frontend"]["environment"]
        origins = "http://localhost:4200,http://127.0.0.1:4200"
        self.assertEqual(backend["CORS_ORIGINS"], origins)
        self.assertEqual(backend["CSRF_TRUSTED_ORIGINS"], origins)
        self.assertEqual(backend["GOOGLE_CLIENT_ID"], "")
        self.assertEqual(frontend["GOOGLE_CLIENT_ID"], "")
        self.assertEqual(backend["SESSION_COOKIE_SECURE"], "false")
        self.assertEqual(backend["SESSION_COOKIE_SAMESITE"], "Lax")
        self.assertEqual(backend["SESSION_TTL_DAYS"], "7")

    def test_web_waits_for_migrated_api_and_api_waits_for_database(self):
        services = self.config["services"]
        self.assertEqual(services["backend"]["depends_on"]["database"]["condition"], "service_healthy")
        self.assertEqual(services["frontend"]["depends_on"]["backend"]["condition"], "service_healthy")
        self.assertIn("db upgrade", " ".join(services["backend"]["command"]))
        self.assertIn("/api/v1/ready", " ".join(services["backend"]["healthcheck"]["test"]))

    def test_private_files_and_host_dependencies_are_not_mounted_into_api(self):
        backend = self.config["services"]["backend"]
        environment = backend["environment"]
        self.assertEqual(environment["FLASK_SKIP_DOTENV"], "1")
        self.assertEqual(environment["PYTHON_DOTENV_DISABLED"], "1")
        self.assertEqual({volume["target"] for volume in backend["volumes"]}, {"/app/app", "/app/migrations"})

    def test_database_and_api_ports_are_loopback_only(self):
        services = self.config["services"]
        for name, port in (("database", 5432), ("backend", 5000)):
            binding = services[name]["ports"][0]
            self.assertEqual(binding["host_ip"], "127.0.0.1")
            self.assertEqual(binding["target"], port)
            self.assertEqual(binding["published"], str(port))

    def test_explicit_customization_is_shared_without_weakening_auth(self):
        custom = resolve_config(CORS_ORIGINS="http://192.168.1.10:34200", FRONTEND_PORT="34200",
                                BACKEND_PORT="35000", POSTGRES_PORT="35432",
                                GOOGLE_CLIENT_ID="configured-test.apps.googleusercontent.com",
                                SESSION_TTL_DAYS="3")
        services = custom["services"]
        backend = services["backend"]["environment"]
        self.assertEqual(backend["CSRF_TRUSTED_ORIGINS"], "http://192.168.1.10:34200")
        self.assertEqual(backend["GOOGLE_CLIENT_ID"], services["frontend"]["environment"]["GOOGLE_CLIENT_ID"])
        self.assertEqual(backend["SESSION_TTL_DAYS"], "3")
        self.assertEqual(services["frontend"]["ports"][0]["published"], "34200")
        self.assertEqual(services["backend"]["ports"][0]["published"], "35000")
        self.assertEqual(services["database"]["ports"][0]["published"], "35432")

    def test_runtime_dependencies_use_the_reviewed_lock(self):
        requirements = (ROOT / "backend/requirements.txt").read_text()
        dockerfile = (ROOT / "backend/Dockerfile").read_text()
        self.assertIn("-r requirements-production.lock", requirements)
        self.assertIn("pip install --no-cache-dir -r requirements-production.lock", dockerfile)

    def test_api_builds_tolerate_slow_downloads_without_disabling_tls(self):
        for name in ("Dockerfile", "Dockerfile.production"):
            with self.subTest(dockerfile=name):
                dockerfile = (ROOT / "backend" / name).read_text()
                self.assertIn("PIP_DEFAULT_TIMEOUT=60", dockerfile)
                self.assertIn("PIP_RETRIES=10", dockerfile)
                self.assertNotIn("--trusted-host", dockerfile)
                self.assertIn("pip check", dockerfile)


if __name__ == "__main__":
    unittest.main()
