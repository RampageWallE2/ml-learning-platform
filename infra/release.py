"""Local release rehearsal, backup and non-destructive restoration tools.

Never deploys to AWS, changes the development Compose project, deletes a volume,
restores over an existing database, or reads backend/.env.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import ssl
import subprocess
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / "infra" / ".local"
PROJECT = "exploralab-local-check"
ENV_FILE = LOCAL / "release.env"


def read_settings(path=ENV_FILE):
    settings = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if line.strip() and not line.lstrip().startswith("#"):
            key, separator, value = line.partition("=")
            if not separator:
                raise ValueError("Invalid environment file")
            settings[key.strip()] = value.strip().strip("'\"")
    return settings


def validate(settings):
    origin = urlsplit(settings.get("PUBLIC_ORIGIN", ""))
    if origin.scheme != "https" or not origin.hostname or origin.path or origin.query or origin.fragment or origin.username:
        raise ValueError("PUBLIC_ORIGIN must be an exact HTTPS origin")
    if any(character.isspace() for character in settings["PUBLIC_ORIGIN"]):
        raise ValueError("Invalid origin")
    password = settings.get("POSTGRES_PASSWORD", "")
    if len(password) < 24 or "CHANGE_ME" in password:
        raise ValueError("Replace the example database password with a random password of at least 24 characters")
    if not re.fullmatch(r"[a-zA-Z0-9_.-]{1,128}", settings.get("APP_VERSION", "")):
        raise ValueError("Set a valid release identifier")
    google_id = settings.get("GOOGLE_CLIENT_ID", "")
    if google_id and not re.fullmatch(r"[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com", google_id):
        raise ValueError("Invalid public Google client ID")
    for name in ("HTTP_PORT", "HTTPS_PORT"):
        if not settings.get(name, "").isdigit() or not 1 <= int(settings[name]) <= 65535:
            raise ValueError("Invalid local port")
    tls = (ROOT / settings["TLS_DIR"]).resolve()
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(tls / "fullchain.pem", tls / "privkey.pem")


def compose(*args, **kwargs):
    command = ["docker", "compose", "--env-file", str(ENV_FILE), "-p", PROJECT,
               "-f", str(ROOT / "compose.production.yml"), *args]
    # Compose gives shell variables precedence over --env-file. Use the private
    # validated rehearsal values even if the shell has production settings.
    environment = os.environ.copy()
    environment.update(read_settings())
    return subprocess.run(command, cwd=ROOT, check=True, env=environment, **kwargs)


def require_local():
    settings = read_settings()
    validate(settings)
    if urlsplit(settings["PUBLIC_ORIGIN"]).hostname != "localhost" or settings.get("BIND_ADDRESS") != "127.0.0.1":
        raise ValueError("This rehearsal tool only operates on localhost bound to loopback")
    return settings


def prepare():
    if ENV_FILE.exists():
        require_local()
        print("Existing private local configuration retained.")
        return
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID
    LOCAL.mkdir(parents=True, exist_ok=True)
    tls = LOCAL / "tls"
    tls.mkdir(exist_ok=True)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "localhost")])
    now = datetime.now(timezone.utc)
    certificate = (
        x509.CertificateBuilder().subject_name(name).issuer_name(name)
        .public_key(key.public_key()).serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=5)).not_valid_after(now + timedelta(days=7))
        .add_extension(x509.SubjectAlternativeName([x509.DNSName("localhost")]), critical=False)
        .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
        .sign(key, hashes.SHA256())
    )
    # Generated test artifacts, not application source. Exclusive writes avoid
    # silently replacing any existing key, certificate or private configuration.
    with (tls / "privkey.pem").open("xb") as output:
        output.write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    os.chmod(tls / "privkey.pem", 0o600)
    with (tls / "fullchain.pem").open("xb") as output:
        output.write(certificate.public_bytes(serialization.Encoding.PEM))
    commit = subprocess.run(["git", "rev-parse", "--short=12", "HEAD"], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()
    version = f"local-{commit}-{now.strftime('%Y%m%d%H%M%S')}"
    values = {
        "APP_VERSION": version, "PUBLIC_ORIGIN": "https://localhost:18443", "BIND_ADDRESS": "127.0.0.1",
        "HTTP_PORT": "18080", "HTTPS_PORT": "18443", "TLS_DIR": "./infra/.local/tls",
        "POSTGRES_DB": "exploralab_release_test", "POSTGRES_USER": "release_test",
        "POSTGRES_PASSWORD": secrets.token_hex(32), "GOOGLE_CLIENT_ID": "", "WEB_CONCURRENCY": "2",
    }
    with ENV_FILE.open("x", encoding="utf-8") as output:
        output.write("".join(f"{name}={value}\n" for name, value in values.items()))
    os.chmod(ENV_FILE, 0o600)
    require_local()
    print("Private localhost-only rehearsal configuration and 7-day test certificate created.")


def up():
    require_local()
    compose("config", "--quiet")  # Never dump resolved secrets to the terminal.
    compose("build", "backend", "frontend")
    compose("up", "-d", "--wait", "database")
    compose("run", "--rm", "migrate")  # Explicit; not run on every API restart.
    compose("up", "-d", "--wait", "--wait-timeout", "180", "backend", "frontend")


def backup():
    settings = require_local()
    directory = LOCAL / "backups"
    directory.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    partial = directory / f"{stamp}.partial"
    archive = directory / f"{stamp}.dump"
    with partial.open("xb") as output:
        compose("exec", "-T", "database", "sh", "-c",
                'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges', stdout=output)
    with partial.open("rb") as source:
        if source.read(5) != b"PGDMP":
            raise ValueError("Invalid archive; partial file retained for diagnosis")
    partial.rename(archive)
    os.chmod(archive, 0o600)
    with archive.open("rb") as source:
        digest = hashlib.file_digest(source, "sha256").hexdigest()
    metadata = {"sha256": digest, "version": settings["APP_VERSION"], "createdAt": stamp, "format": "pg_dump-custom"}
    archive.with_suffix(".json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Backup created: {archive.relative_to(ROOT)} (SHA-256 recorded; contains private data)")
    return archive


def restore_test(archive):
    require_local()
    archive = Path(archive).resolve()
    metadata = json.loads(archive.with_suffix(".json").read_text(encoding="utf-8"))
    with archive.open("rb") as source:
        if hashlib.file_digest(source, "sha256").hexdigest() != metadata["sha256"]:
            raise ValueError("Backup checksum mismatch")
    # Never --clean, never restore over the source or an existing database.
    target = "exploralab_restore_" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f") + "_test"
    compose("exec", "-T", "database", "sh", "-c",
            f'createdb -U "$POSTGRES_USER" {target}')
    with archive.open("rb") as source:
        compose("exec", "-T", "database", "sh", "-c",
                f'pg_restore -U "$POSTGRES_USER" -d {target} --exit-on-error --single-transaction --no-owner --no-privileges', stdin=source)
    result = compose("exec", "-T", "database", "sh", "-c",
                     f'psql -U "$POSTGRES_USER" -d {target} -At -c "SELECT '
                     '(SELECT count(*) FROM users), (SELECT count(*) FROM learning_profiles), '
                     '(SELECT count(*) FROM lesson_progress), (SELECT version_num FROM alembic_version)"',
                     capture_output=True, text=True)
    print(f"Separate restore succeeded. users|profiles|progress|migration: {result.stdout.strip()}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["prepare", "validate", "up", "status", "down", "backup", "restore-test"])
    parser.add_argument("--archive", type=Path)
    args = parser.parse_args()
    if args.action == "prepare":
        prepare()
    elif args.action == "validate":
        require_local()
        compose("config", "--quiet")
        print("Local release configuration valid; no secrets printed.")
    elif args.action == "up":
        up()
    elif args.action == "backup":
        backup()
    elif args.action == "restore-test":
        if not args.archive:
            parser.error("--archive is required")
        restore_test(args.archive)
    else:
        require_local()
        compose("ps" if args.action == "status" else "down")  # No --volumes.


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        # Do not print environment contents, HTTP bodies or credential URLs.
        raise SystemExit(f"Local operation failed ({type(error).__name__}); no production database was targeted.")
