"""Isolated bootstrap tests: no SSH, AWS, real Docker, installations or user data."""
from argparse import Namespace
from contextlib import nullcontext
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch, MagicMock


REPO = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("ec2_bootstrap", REPO / "infra/ec2_bootstrap.py")
bootstrap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bootstrap)
COMMIT = "a" * 40


def options(**changes):
    values = dict(commit=COMMIT, bundle_sha256="c" * 64, origin="http://54.145.32.66",
                  api_image="ghcr.io/rampagewalle2/ml-learning-platform-api@sha256:" + "a" * 64,
                  web_image="ghcr.io/rampagewalle2/ml-learning-platform-web@sha256:" + "b" * 64,
                  http_demo=True, ghcr_user=None)
    return Namespace(**{**values, **changes})


class BootstrapValidationTests(unittest.TestCase):
    def test_accepts_only_explicit_pinned_demo(self):
        self.assertEqual(bootstrap.validate_options(options()), "54.145.32.66")
        for changes in ({"http_demo": False}, {"commit": "master"},
                        {"api_image": "ghcr.io/rampagewalle2/ml-learning-platform-api:latest"},
                        {"web_image": options().api_image}, {"bundle_sha256": "bad"},
                        {"origin": "http://127.0.0.1"}, {"origin": "http://54.145.32.66/"},
                        {"origin": "https://54.145.32.66"}, {"ghcr_user": "user;command"}):
            with self.subTest(changes=changes), self.assertRaises((bootstrap.BootstrapError, ValueError)):
                bootstrap.validate_options(options(**changes))

    def test_environment_does_not_inherit_docker_target_or_compose_settings(self):
        with patch.dict(os.environ, {"DOCKER_HOST": "tcp://remote:2375", "DOCKER_CONFIG": "/host-login",
                                     "COMPOSE_FILE": "compose.yml", "POSTGRES_PASSWORD": "secret",
                                     "HTTP_TEST_ORIGIN": "bad", "PATH": "safe"}, clear=True):
            self.assertEqual(bootstrap.clean_environment(), {"PATH": "safe"})

    def test_bundle_rejects_hash_mismatch_and_path_traversal(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "release.tar"
            with tarfile.open(path, "w") as archive:
                member = tarfile.TarInfo("../../etc/passwd")
                member.size = 1
                archive.addfile(member, io.BytesIO(b"x"))
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            with self.assertRaises(bootstrap.BootstrapError):
                bootstrap.read_bundle(path, "0" * 64)
            with self.assertRaises(bootstrap.BootstrapError):
                bootstrap.read_bundle(path, digest)

    def test_bundle_accepts_exact_files_and_rejects_links_or_missing_files(self):
        for variant in ("complete", "missing", "link"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "release.tar"
                with tarfile.open(path, "w") as archive:
                    for index, name in enumerate(sorted(bootstrap.BUNDLE_FILES)):
                        if variant == "missing" and index == 0:
                            continue
                        member = tarfile.TarInfo(name)
                        if variant == "link" and index == 0:
                            member.type = tarfile.SYMTYPE
                            member.linkname = "/etc/passwd"
                            archive.addfile(member)
                        else:
                            member.size = 1
                            archive.addfile(member, io.BytesIO(b"x"))
                digest = hashlib.sha256(path.read_bytes()).hexdigest()
                if variant == "complete":
                    self.assertEqual(set(bootstrap.read_bundle(path, digest)), bootstrap.BUNDLE_FILES)
                else:
                    with self.assertRaises(bootstrap.BootstrapError):
                        bootstrap.read_bundle(path, digest)

    def test_installed_files_are_not_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            bootstrap.install_bundle(root, {"compose.production.yml": b"original"})
            bootstrap.install_bundle(root, {"compose.production.yml": b"original"})
            with self.assertRaises(bootstrap.BootstrapError):
                bootstrap.install_bundle(root, {"compose.production.yml": b"different"})
            self.assertEqual((root / "compose.production.yml").read_bytes(), b"original")

    def test_image_revision_is_checked_before_database_changes(self):
        with patch.object(bootstrap, "run", return_value=Namespace(stdout=json.dumps({
            "org.opencontainers.image.revision": "wrong"}))) as command:
            with self.assertRaises(bootstrap.BootstrapError):
                bootstrap.check_images(options(), {})
            self.assertEqual(command.call_count, 1)


@unittest.skipUnless(os.name == "posix", "Linux file permissions are checked in CI, not Windows emulation.")
class BootstrapStateTests(unittest.TestCase):
    def setUp(self):
        # CI runs unprivileged. Emulate root ownership, not file permissions or contents.
        original_stat = Path.stat
        def root_owned_stat(path, *args, **kwargs):
            result = original_stat(path, *args, **kwargs)
            return os.stat_result((*result[:4], 0, *result[5:]))
        self.owner_patch = patch.object(Path, "stat", root_owned_stat)
        self.owner_patch.start()
        self.addCleanup(self.owner_patch.stop)

    def test_rerun_preserves_private_password_and_worker_limit(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "infra").mkdir()
            (root / "infra/ec2_preflight.py").write_bytes((REPO / "infra/ec2_preflight.py").read_bytes())
            bootstrap.ensure_settings(root, COMMIT, "54.145.32.66")
            before = (root / ".env.ec2").read_bytes()
            bootstrap.ensure_settings(root, COMMIT, "54.145.32.66")
            self.assertEqual((root / ".env.ec2").read_bytes(), before)
            self.assertIn(b"WEB_CONCURRENCY=1\n", before)
            self.assertEqual((root / ".env.ec2").stat().st_mode & 0o777, 0o600)

    def test_existing_different_release_is_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = bootstrap.expected_state(options())
            bootstrap.write_state(root, state, ready=True)
            self.assertTrue(bootstrap.guard_existing_installation(root, state))
            changed = {**state, "commit": "b" * 40}
            with self.assertRaises(bootstrap.BootstrapError):
                bootstrap.guard_existing_installation(root, changed)

    def test_missing_settings_do_not_reset_an_existing_installation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            bootstrap.write_state(root, bootstrap.expected_state(options()))
            with self.assertRaises(bootstrap.BootstrapError):
                bootstrap.ensure_settings(root, COMMIT, "54.145.32.66")
            self.assertFalse((root / ".env.ec2").exists())

    def test_first_install_is_atomic_and_same_release_preserves_credentials(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "exploralab"
            files = {name: (REPO / name).read_bytes() for name in bootstrap.BUNDLE_FILES}
            args = ["--bundle", "unused.tar", "--bundle-sha256", "c" * 64,
                    "--commit", COMMIT, "--api-image", options().api_image,
                    "--web-image", options().web_image, "--origin", options().origin, "--http-demo"]
            def simulated_command(command, **kwargs):
                return Namespace(returncode=0 if root.exists() else 1, stdout="")
            with patch.object(bootstrap, "ROOT", root), \
                    patch.object(bootstrap, "read_bundle", return_value=files), \
                    patch.object(bootstrap, "validate_host", return_value="noble"), \
                    patch.object(bootstrap, "installation_lock", return_value=nullcontext()), \
                    patch.object(bootstrap, "install_docker"), \
                    patch.object(bootstrap.subprocess, "run", side_effect=simulated_command), \
                    patch.object(bootstrap, "deploy") as deploy:
                self.assertEqual(bootstrap.main(args), 0)
                private_settings = (root / ".env.ec2").read_bytes()
                self.assertTrue(json.loads((root / ".ec2-demo.json").read_text())["ready"])
                self.assertEqual(bootstrap.main(args), 0)
                self.assertEqual((root / ".env.ec2").read_bytes(), private_settings)
                self.assertFalse(deploy.call_args_list[0].args[-1])
                self.assertTrue(deploy.call_args_list[1].args[-1])

    def test_failed_first_deployment_keeps_credentials_for_retry(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "exploralab"
            files = {name: (REPO / name).read_bytes() for name in bootstrap.BUNDLE_FILES}
            args = ["--bundle", "unused.tar", "--bundle-sha256", "c" * 64,
                    "--commit", COMMIT, "--api-image", options().api_image,
                    "--web-image", options().web_image, "--origin", options().origin, "--http-demo"]
            with patch.object(bootstrap, "ROOT", root), \
                    patch.object(bootstrap, "read_bundle", return_value=files), \
                    patch.object(bootstrap, "validate_host", return_value="noble"), \
                    patch.object(bootstrap, "installation_lock", return_value=nullcontext()), \
                    patch.object(bootstrap, "install_docker"), \
                    patch.object(bootstrap.subprocess, "run", return_value=Namespace(returncode=1, stdout="")), \
                    patch.object(bootstrap, "deploy", side_effect=[subprocess.CalledProcessError(1, ["fake"]), None]):
                self.assertEqual(bootstrap.main(args), 1)
                private_settings = (root / ".env.ec2").read_bytes()
                self.assertFalse(json.loads((root / ".ec2-demo.json").read_text())["ready"])
                self.assertEqual(bootstrap.main(args), 0)
                self.assertEqual((root / ".env.ec2").read_bytes(), private_settings)


class BootstrapDeploymentTests(unittest.TestCase):
    def run_deploy(self, already_ready=False, migration_fails=False):
        calls = []
        def command(arguments, **kwargs):
            calls.append(arguments)
            if "migrate" == arguments[-1] and "run" in arguments and migration_fails:
                raise subprocess.CalledProcessError(1, arguments)
            return Namespace(stdout="", returncode=0)
        health = MagicMock()
        health.__enter__.return_value.status = 200
        health.__enter__.return_value.read.return_value = json.dumps({"version": f"ec2-{COMMIT}"}).encode()
        with patch.object(bootstrap, "run", side_effect=command), \
                patch.object(bootstrap, "check_images"), \
                patch.object(bootstrap.urllib.request, "urlopen", return_value=health):
            if migration_fails:
                with self.assertRaises(subprocess.CalledProcessError):
                    bootstrap.deploy(Path("/opt/exploralab"), options(), {}, already_ready)
            else:
                bootstrap.deploy(Path("/opt/exploralab"), options(), {}, already_ready)
        return calls

    def test_fresh_install_orders_migration_api_nginx_and_web(self):
        calls = self.run_deploy()
        tails = [command[command.index("compose") + 1:] for command in calls]
        migration = next(i for i, tail in enumerate(tails) if tail[-4:] == ["run", "--rm", "--no-deps", "migrate"])
        api = next(i for i, tail in enumerate(tails) if "up" in tail and tail[-1] == "backend")
        nginx = next(i for i, tail in enumerate(tails) if tail[-2:] == ["nginx", "-t"])
        web = next(i for i, tail in enumerate(tails) if "up" in tail and tail[-1] == "frontend")
        self.assertLess(migration, api)
        self.assertLess(api, nginx)
        self.assertLess(nginx, web)
        for command in calls:
            self.assertNotIn("build", command)
            self.assertNotIn("down", command)
            self.assertNotIn("prune", command)
            self.assertNotIn("compose.yml", command)

    def test_migration_failure_does_not_start_api_or_web(self):
        calls = self.run_deploy(migration_fails=True)
        self.assertFalse(any("up" in command and command[-1] in {"backend", "frontend"} for command in calls))

    def test_same_completed_release_does_not_migrate_again(self):
        calls = self.run_deploy(already_ready=True)
        self.assertFalse(any("run" in command and command[-1] == "migrate" for command in calls))

    def test_private_registry_login_is_hidden_and_temporary(self):
        with tempfile.TemporaryDirectory() as directory:
            original = tempfile.TemporaryDirectory
            def temporary(**kwargs):
                return original(prefix=kwargs["prefix"], dir=directory)
            with patch.object(bootstrap.tempfile, "TemporaryDirectory", side_effect=temporary), \
                    patch.object(bootstrap.os, "isatty", return_value=True), \
                    patch.object(bootstrap.getpass, "getpass", return_value="fake-read-token"), \
                    patch.object(bootstrap, "run") as command:
                with bootstrap.registry_environment(options(ghcr_user="RampageWallE2")) as environment:
                    login_directory = Path(environment["DOCKER_CONFIG"])
                    self.assertTrue(login_directory.is_dir())
                    arguments = command.call_args.args[0]
                    self.assertNotIn("fake-read-token", arguments)
                    self.assertIn("--password-stdin", arguments)
                    self.assertEqual(command.call_args.kwargs["input_text"], "fake-read-token\n")
                self.assertFalse(login_directory.exists())

    def test_invalid_request_never_installs_or_deploys(self):
        args = ["--bundle", "not-used.tar", "--bundle-sha256", "c" * 64,
                "--commit", COMMIT, "--api-image", options().api_image,
                "--web-image", options().web_image, "--origin", options().origin]
        with patch.object(bootstrap, "install_docker") as install, patch.object(bootstrap, "deploy") as deploy:
            self.assertEqual(bootstrap.main(args), 1)
            install.assert_not_called()
            deploy.assert_not_called()


if __name__ == "__main__":
    unittest.main()
