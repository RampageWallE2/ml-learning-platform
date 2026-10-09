"""Read-only checks for a single-EC2 demonstration; never provisions AWS resources.

Does not start containers, migrate databases, generate credentials or trust a local
test certificate. --compose runs only `docker compose config --quiet`.
"""
import argparse
from datetime import datetime, timedelta, timezone
import ipaddress
import os
from pathlib import Path
import re
import ssl
import subprocess

ROOT = Path(__file__).resolve().parents[1]
TLS_DIRECTORY = Path("/srv/exploralab/tls")
SETTING_NAMES = {
    "APP_VERSION", "PUBLIC_ORIGIN", "BIND_ADDRESS", "HTTP_PORT", "HTTPS_PORT",
    "TLS_DIR", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD",
    "GOOGLE_CLIENT_ID", "WEB_CONCURRENCY",
}


def read_settings(path):
    """Accept the simple template format, without duplicate keys or interpolation."""
    settings = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        name, separator, value = line.partition("=")
        name = name.strip()
        if not separator or name not in SETTING_NAMES or name in settings:
            raise ValueError("Invalid or repeated environment setting.")
        settings[name] = value.strip()
    return settings


def validate_settings(settings):
    from urllib.parse import urlsplit

    if set(settings) != SETTING_NAMES:
        raise ValueError("Use exactly the settings in .env.ec2.example.")
    try:
        origin = urlsplit(settings["PUBLIC_ORIGIN"])
        port = origin.port
    except ValueError:
        raise ValueError("PUBLIC_ORIGIN must be an exact HTTPS origin.") from None
    if (origin.scheme != "https" or not origin.hostname or origin.username is not None
            or origin.password is not None or origin.path or origin.query or origin.fragment
            or port not in {None, 443}
            or origin.netloc.lower() not in {origin.hostname, f"{origin.hostname}:443"}
            or re.search(r"[\s;{}$\\]", settings["PUBLIC_ORIGIN"])):
        raise ValueError("PUBLIC_ORIGIN must be an exact HTTPS origin.")
    hostname = origin.hostname
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        labels = hostname.split(".")
        if (len(hostname) > 253 or len(labels) < 2 or labels[-1].isdigit()
                or any(not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label) for label in labels)
                or "replace" in hostname
                or hostname.endswith((".localhost", ".local", ".test", ".invalid", ".example"))):
            raise ValueError("Set the real public IPv4 address or DNS hostname.") from None
    else:
        if address.version != 4 or not address.is_global:
            raise ValueError("This EC2 demonstration requires a public IPv4 address.")
    if settings["BIND_ADDRESS"] != "0.0.0.0" or settings["HTTP_PORT"] != "80" or settings["HTTPS_PORT"] != "443":
        raise ValueError("EC2 ingress must bind HTTP 80 and HTTPS 443 on 0.0.0.0.")
    version = settings["APP_VERSION"]
    if not re.fullmatch(r"[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}", version) or version.lower().startswith(("replace", "change_me", "local-")):
        raise ValueError("APP_VERSION must identify the EC2 release, not a placeholder or local rehearsal.")
    password = settings["POSTGRES_PASSWORD"]
    if not re.fullmatch(r"[a-zA-Z0-9_-]{32,}", password) or any(word in password.lower() for word in ("change_me", "replace_with")):
        raise ValueError("Generate a random database password of at least 32 safe characters.")
    for name in ("POSTGRES_DB", "POSTGRES_USER"):
        if not re.fullmatch(r"[a-z][a-z0-9_]{0,62}", settings[name]):
            raise ValueError("Use simple lowercase PostgreSQL database and user names.")
    if settings["TLS_DIR"] != str(TLS_DIRECTORY).replace("\\", "/"):
        raise ValueError("Use /srv/exploralab/tls for the EC2 certificate hooks.")
    if settings["GOOGLE_CLIENT_ID"]:
        raise ValueError("Keep Google disabled in this IP-only demonstration.")
    if settings["WEB_CONCURRENCY"] not in {"1", "2", "3", "4"}:
        raise ValueError("WEB_CONCURRENCY must be between 1 and 4 for this demonstration.")
    return hostname


def validate_tls(directory, hostname, now=None):
    from cryptography import x509

    certificate_path = Path(directory) / "fullchain.pem"
    key_path = Path(directory) / "privkey.pem"
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    try:
        context.load_cert_chain(certificate_path, key_path)
        certificate = x509.load_pem_x509_certificate(certificate_path.read_bytes())
        names = certificate.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    except (OSError, ValueError, ssl.SSLError, x509.ExtensionNotFound):
        raise ValueError("TLS files must exist, form a matching pair and contain a SAN.") from None
    now = now or datetime.now(timezone.utc)
    if certificate.not_valid_before_utc > now or certificate.not_valid_after_utc <= now + timedelta(days=1):
        raise ValueError("TLS certificate is not valid now or expires within 24 hours.")
    if certificate.issuer == certificate.subject:
        raise ValueError("Do not use the self-signed local rehearsal certificate on EC2.")
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        dns_names = names.get_values_for_type(x509.DNSName)
        matches = any(name.lower() == hostname or (
            name.startswith("*.") and hostname.endswith(name[1:].lower())
            and hostname.count(".") == name.count(".")
        ) for name in dns_names)
    else:
        matches = address in names.get_values_for_type(x509.IPAddress)
    if not matches:
        raise ValueError("TLS certificate does not cover PUBLIC_ORIGIN.")
    # Offline checks cannot establish public CA trust. curl/browser must verify it.


def check_compose(settings, env_file):
    environment = os.environ.copy()
    environment.update(settings)  # Prevent inherited shell settings overriding this file.
    command = ["docker", "compose", "--env-file", str(env_file), "-p", "exploralab-ec2",
               "-f", str(ROOT / "compose.production.yml"), "config", "--quiet"]
    result = subprocess.run(command, cwd=ROOT, env=environment, capture_output=True, timeout=30)
    if result.returncode:
        raise ValueError("Compose configuration failed; resolved values were not printed.")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, default=ROOT / ".env.ec2")
    parser.add_argument("--configuration-only", action="store_true", help="Do not check TLS; not a ready-to-publish result")
    parser.add_argument("--certificate-source", type=Path, help="Check Certbot files before the hook copies them")
    parser.add_argument("--compose", action="store_true", help="Validate Compose without starting services")
    args = parser.parse_args(argv)
    if args.configuration_only and args.certificate_source:
        parser.error("--certificate-source cannot be combined with --configuration-only")
    try:
        if os.name == "posix" and args.env_file.stat().st_mode & 0o077:
            raise ValueError("Restrict the private environment file to mode 600.")
        settings = read_settings(args.env_file)
        hostname = validate_settings(settings)
        if not args.configuration_only:
            validate_tls(args.certificate_source or settings["TLS_DIR"], hostname)
        if args.compose:
            check_compose(settings, args.env_file)
    except (ValueError, OSError, ImportError, subprocess.SubprocessError):
        # Errors from parsers/SSL/subprocesses can contain supplied configuration.
        print("EC2 preflight failed. Check the template, private file permissions and TLS; no settings were printed.")
        return 1
    print("EC2 configuration checks passed; TLS was not checked." if args.configuration_only
          else "EC2 configuration and offline TLS checks passed; public trust still requires HTTPS verification.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
