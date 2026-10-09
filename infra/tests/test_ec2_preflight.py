"""Isolated checks: synthetic certificates, no AWS, Docker daemon or database."""
from contextlib import redirect_stdout
from datetime import datetime, timedelta, timezone
import io
import ipaddress
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch, Mock

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ec2_preflight as preflight


def settings():
    return {
        "APP_VERSION": "ec2-a13fd45", "PUBLIC_ORIGIN": "https://8.8.8.8",
        "BIND_ADDRESS": "0.0.0.0", "HTTP_PORT": "80", "HTTPS_PORT": "443",
        "TLS_DIR": "/srv/exploralab/tls", "POSTGRES_DB": "exploralab",
        "POSTGRES_USER": "exploralab", "POSTGRES_PASSWORD": "a7" * 32,
        "GOOGLE_CLIENT_ID": "", "WEB_CONCURRENCY": "2",
    }


class SettingsTests(unittest.TestCase):
    def test_valid_public_ipv4_and_dns(self):
        for origin, host in (("https://8.8.8.8", "8.8.8.8"), ("https://demo.exploralab.org:443", "demo.exploralab.org")):
            with self.subTest(origin=origin):
                self.assertEqual(preflight.validate_settings(settings() | {"PUBLIC_ORIGIN": origin}), host)

    def test_invalid_origins(self):
        for origin in (
            "http://8.8.8.8", "https://127.0.0.1", "https://192.168.1.1",
            "https://10.0.0.1", "https://169.254.169.254", "https://192.0.2.1",
            "https://[2001:4860:4860::8888]", "https://8.8.8.8:8443",
            "https://@demo.org", "https://user:password@demo.org", "https://demo.org:",
            "https://demo.org/", "https://demo.org/?a=1", "https://demo.org#part",
            "https://demo.org\n", "https://demo.org;bad", "https://demo..org",
            "https://-demo.org", "https://demo-.org", "https://demo.local",
            "https://demo.invalid", "https://REPLACE_WITH_PUBLIC_IPV4",
            "https://999.1.1.1", "https://" + "a" * 64 + ".org",
        ):
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                preflight.validate_settings(settings() | {"PUBLIC_ORIGIN": origin})

    def test_missing_and_unknown_keys(self):
        for values in ({k: v for k, v in settings().items() if k != "PUBLIC_ORIGIN"}, settings() | {"EXTRA": "value"}):
            with self.assertRaises(ValueError):
                preflight.validate_settings(values)

    def test_unsafe_or_placeholder_settings(self):
        for name, value in (
            ("APP_VERSION", "REPLACE_WITH_RELEASE_ID"), ("APP_VERSION", "local-test"),
            ("APP_VERSION", "release;command"), ("POSTGRES_PASSWORD", "short"),
            ("APP_VERSION", ".invalid-tag"), ("APP_VERSION", "-invalid-tag"),
            ("POSTGRES_PASSWORD", "CHANGE_ME_GENERATE_A_RANDOM_PASSWORD"),
            ("POSTGRES_PASSWORD", "$" + "a" * 40), ("BIND_ADDRESS", "127.0.0.1"),
            ("HTTP_PORT", "8080"), ("HTTPS_PORT", "8443"),
            ("POSTGRES_DB", "not-safe"), ("POSTGRES_USER", "BadName"),
            ("TLS_DIR", "./infra/.local/tls"), ("GOOGLE_CLIENT_ID", "enabled"),
            ("WEB_CONCURRENCY", "0"), ("WEB_CONCURRENCY", "5"),
        ):
            with self.subTest(name=name), self.assertRaises(ValueError):
                preflight.validate_settings(settings() | {name: value})

    def test_template_is_not_a_publishable_configuration(self):
        with self.assertRaises(ValueError):
            preflight.validate_settings(preflight.read_settings(preflight.ROOT / ".env.ec2.example"))

    def test_reader_rejects_duplicates_unknown_and_invalid_lines(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "private.env"
            for content in ("APP_VERSION=one\nAPP_VERSION=two\n", "EXTRA=value\n", "APP_VERSION\n"):
                path.write_text(content, encoding="utf-8")
                with self.assertRaises(ValueError):
                    preflight.read_settings(path)

    def test_reader_preserves_simple_values_and_comments(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "private.env"
            path.write_text("# Comment\n\nAPP_VERSION=ec2-test\nGOOGLE_CLIENT_ID=\n", encoding="utf-8")
            self.assertEqual(preflight.read_settings(path), {"APP_VERSION": "ec2-test", "GOOGLE_CLIENT_ID": ""})


class CertificateTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.now = datetime.now(timezone.utc).replace(microsecond=0)
        self.key = ec.generate_private_key(ec.SECP256R1())

    def certificate(self, names=None, before=None, after=None, self_signed=False, different_key=False):
        subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Synthetic test leaf")])
        issuer = subject if self_signed else x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Synthetic test issuer")])
        signing_key = self.key if self_signed else ec.generate_private_key(ec.SECP256R1())
        builder = (x509.CertificateBuilder().subject_name(subject).issuer_name(issuer)
                   .public_key(self.key.public_key()).serial_number(x509.random_serial_number())
                   .not_valid_before(before or self.now - timedelta(minutes=5))
                   .not_valid_after(after or self.now + timedelta(days=6)))
        if names is not None:
            builder = builder.add_extension(x509.SubjectAlternativeName(names), critical=False)
        certificate = builder.sign(signing_key, hashes.SHA256())
        key = ec.generate_private_key(ec.SECP256R1()) if different_key else self.key
        (self.directory / "fullchain.pem").write_bytes(certificate.public_bytes(serialization.Encoding.PEM))
        (self.directory / "privkey.pem").write_bytes(key.private_bytes(
            serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))

    def test_matching_public_ip(self):
        self.certificate([x509.IPAddress(ipaddress.ip_address("8.8.8.8"))])
        preflight.validate_tls(self.directory, "8.8.8.8", self.now)

    def test_exact_dns_and_single_label_wildcard(self):
        for name in ("demo.exploralab.org", "*.exploralab.org"):
            with self.subTest(name=name):
                self.certificate([x509.DNSName(name)])
                preflight.validate_tls(self.directory, "demo.exploralab.org", self.now)

    def test_wrong_ip_and_dns_ip_are_rejected(self):
        for name in (x509.IPAddress(ipaddress.ip_address("8.8.4.4")), x509.DNSName("8.8.8.8")):
            self.certificate([name])
            with self.assertRaises(ValueError):
                preflight.validate_tls(self.directory, "8.8.8.8", self.now)

    def test_wildcard_does_not_match_multiple_labels_or_root(self):
        self.certificate([x509.DNSName("*.exploralab.org")])
        for hostname in ("exploralab.org", "a.b.exploralab.org"):
            with self.assertRaises(ValueError):
                preflight.validate_tls(self.directory, hostname, self.now)

    def test_missing_san_mismatched_key_and_self_signed_are_rejected(self):
        for options in ({"names": None}, {"different_key": True}, {"self_signed": True}):
            with self.subTest(options=options):
                self.certificate(**({"names": [x509.IPAddress(ipaddress.ip_address("8.8.8.8"))]} | options))
                with self.assertRaises(ValueError):
                    preflight.validate_tls(self.directory, "8.8.8.8", self.now)

    def test_expired_near_expiry_and_future_certificates_are_rejected(self):
        for options in (
            {"before": self.now - timedelta(days=6), "after": self.now - timedelta(seconds=1)},
            {"after": self.now + timedelta(hours=24)},
            {"before": self.now + timedelta(minutes=1)},
        ):
            with self.subTest(options=options):
                self.certificate([x509.IPAddress(ipaddress.ip_address("8.8.8.8"))], **options)
                with self.assertRaises(ValueError):
                    preflight.validate_tls(self.directory, "8.8.8.8", self.now)

    def test_missing_certificate_files(self):
        with self.assertRaises(ValueError):
            preflight.validate_tls(self.directory, "8.8.8.8", self.now)


class CommandTests(unittest.TestCase):
    def test_compose_only_checks_configuration_and_overrides_inherited_values(self):
        with patch.dict(preflight.os.environ, {"PUBLIC_ORIGIN": "https://wrong.org"}), patch.object(
            preflight.subprocess, "run", return_value=Mock(returncode=0)
        ) as run:
            preflight.check_compose(settings(), Path("private.env"))
        command = run.call_args.args[0]
        self.assertEqual(command[-2:], ["config", "--quiet"])
        self.assertNotIn("up", command)
        self.assertEqual(run.call_args.kwargs["env"]["PUBLIC_ORIGIN"], "https://8.8.8.8")
        self.assertTrue(run.call_args.kwargs["capture_output"])

    def test_compose_failure_hides_resolved_settings(self):
        with patch.object(preflight.subprocess, "run", return_value=Mock(returncode=1, stderr="secret")):
            with self.assertRaisesRegex(ValueError, "resolved values were not printed"):
                preflight.check_compose(settings(), Path("private.env"))

    def test_cli_configuration_only_skips_tls_and_does_not_print_password(self):
        output = io.StringIO()
        with patch.object(preflight, "read_settings", return_value=settings()), patch.object(
            preflight, "validate_tls"
        ) as tls, patch.object(preflight.Path, "stat", return_value=Mock(st_mode=0o100600)), redirect_stdout(output):
            self.assertEqual(preflight.main(["--configuration-only"]), 0)
        tls.assert_not_called()
        self.assertIn("TLS was not checked", output.getvalue())
        self.assertNotIn(settings()["POSTGRES_PASSWORD"], output.getvalue())

    def test_cli_errors_do_not_print_supplied_values(self):
        output = io.StringIO()
        secret = "PRIVATE_PASSWORD_DO_NOT_PRINT"
        with patch.object(preflight, "read_settings", side_effect=ValueError(secret)), patch.object(
            preflight.Path, "stat", return_value=Mock(st_mode=0o100600)
        ), redirect_stdout(output):
            self.assertEqual(preflight.main(["--configuration-only"]), 1)
        self.assertNotIn(secret, output.getvalue())
        self.assertIn("no settings were printed", output.getvalue())

    def test_cli_rejects_publicly_readable_environment_on_linux(self):
        with patch.object(preflight.os, "name", "posix"), patch.object(
            preflight.Path, "stat", return_value=Mock(st_mode=0o100644)
        ), patch.object(preflight, "read_settings") as read, redirect_stdout(io.StringIO()):
            self.assertEqual(preflight.main(["--configuration-only"]), 1)
        read.assert_not_called()


if __name__ == "__main__":
    unittest.main()
