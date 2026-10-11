#!/usr/bin/env python3
"""First installation of the HTTP demo on Ubuntu EC2; never creates AWS resources.

Uses only Python's standard library. Run as root through deploy-ec2.ps1.
Repeating the SAME release is safe; upgrades of an existing database are refused.
"""
import argparse
from contextlib import contextmanager
import getpass
import hashlib
import importlib.util
import ipaddress
import json
import os
from pathlib import Path
import platform
import re
import secrets
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request


ROOT = Path("/opt/exploralab")
PROJECT = "exploralab-ec2"
BUNDLE_FILES = {
    "compose.production.yml", "compose.ec2-http-test.yml", "compose.ghcr.yml",
    "infra/nginx.ec2-http-test.conf.template", "infra/ec2_preflight.py",
}
ENV_NAMES = {
    "APP_VERSION", "PUBLIC_ORIGIN", "BIND_ADDRESS", "HTTP_PORT", "HTTPS_PORT",
    "TLS_DIR", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD",
    "GOOGLE_CLIENT_ID", "WEB_CONCURRENCY", "HTTP_TEST_ORIGIN",
    "GHCR_API_IMAGE", "GHCR_WEB_IMAGE",
}
DOCKER = ["docker", "--host", "unix:///var/run/docker.sock"]


class BootstrapError(Exception):
    """Safe, deliberately worded operator message; never includes secret values."""


def require(condition, message):
    if not condition:
        raise BootstrapError(message)


def validate_options(args):
    require(args.http_demo, "Use --http-demo explicitly. This installer does not provision HTTPS.")
    require(re.fullmatch(r"[0-9a-f]{40}", args.commit), "Use a full lowercase commit SHA.")
    require(re.fullmatch(r"[0-9a-f]{64}", args.bundle_sha256), "Invalid bundle checksum.")
    for suffix, image in (("api", args.api_image), ("web", args.web_image)):
        pattern = rf"ghcr\.io/rampagewalle2/ml-learning-platform-{suffix}@sha256:[0-9a-f]{{64}}"
        require(re.fullmatch(pattern, image), "Use the exact GHCR digest for each image, not a tag.")
    require(args.origin.startswith("http://"), "Set an exact HTTP demo origin.")
    address = ipaddress.ip_address(args.origin.removeprefix("http://"))
    require(address.version == 4 and address.is_global, "Use the EC2 public IPv4 address.")
    require(args.origin == f"http://{address}", "Origin must not contain a port or trailing slash.")
    if args.ghcr_user:
        require(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9-]{0,38}", args.ghcr_user), "Invalid GHCR username.")
    return str(address)


def read_bundle(path, expected_hash):
    require(not path.is_symlink() and path.is_file(), "Bundle must be a regular file.")
    require(path.stat().st_size <= 2_000_000, "Deployment bundle is unexpectedly large.")
    require(hashlib.sha256(path.read_bytes()).hexdigest() == expected_hash, "Bundle checksum mismatch.")
    files = {}
    with tarfile.open(path, "r:") as archive:
        for member in archive.getmembers():
            if member.isdir() and member.name.rstrip("/") == "infra":
                continue
            require(member.name in BUNDLE_FILES and member.isfile(), "Unexpected or unsafe archive entry.")
            require(member.name not in files and member.size <= 500_000, "Duplicate or oversized archive entry.")
            files[member.name] = archive.extractfile(member).read()
    require(set(files) == BUNDLE_FILES, "Deployment bundle is incomplete.")
    return files


def metadata(path, token=None):
    headers = ({"X-aws-ec2-metadata-token": token} if token else
               {"X-aws-ec2-metadata-token-ttl-seconds": "60"})
    request = urllib.request.Request(
        f"http://169.254.169.254/latest/{path}", headers=headers,
        method="GET" if token else "PUT",
    )
    # Metadata requests must not use an inherited HTTP proxy.
    with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(request, timeout=3) as response:
        return response.read(4096).decode().strip()


def validate_host(address):
    require(os.name == "posix" and os.geteuid() == 0, "Run on Ubuntu EC2 with sudo, not locally.")
    release = dict(line.split("=", 1) for line in Path("/etc/os-release").read_text().splitlines() if "=" in line)
    release = {key: value.strip('"') for key, value in release.items()}
    require(release.get("ID") == "ubuntu" and release.get("VERSION_ID") in {"22.04", "24.04", "26.04"},
            "Supported targets: Ubuntu LTS 22.04, 24.04 or 26.04.")
    require(platform.machine() == "x86_64", "Published images require an x86_64 EC2.")
    token = metadata("api/token")
    require(metadata("meta-data/public-ipv4", token) == address, "Origin does not match this EC2 public IP.")
    require(shutil.disk_usage("/").free >= 5 * 1024**3, "At least 5 GiB free space is required before installation.")
    return release["VERSION_CODENAME"]


def clean_environment():
    return {key: value for key, value in os.environ.items()
            if key not in ENV_NAMES and not key.startswith(("COMPOSE_", "DOCKER_"))}


def run(command, environment=None, capture=False, input_text=None, timeout=900):
    return subprocess.run(
        command, check=True, env=environment or clean_environment(),
        capture_output=capture, text=True, input=input_text, timeout=timeout,
    )


def install_docker(codename):
    if not shutil.which("docker"):
        conflicts = subprocess.run(
            ["dpkg-query", "-W", "-f=${db:Status-Status} ${binary:Package}\n",
             "docker.io", "docker-compose", "docker-compose-v2", "podman-docker", "containerd", "runc"],
            capture_output=True, text=True, check=False,
        )
        require(not any(line.startswith("installed ") for line in conflicts.stdout.splitlines()),
                "Conflicting container packages exist; resolve them manually. Nothing was uninstalled.")
        run(["apt-get", "update"])
        run(["apt-get", "install", "-y", "ca-certificates", "curl"],
            environment={**clean_environment(), "DEBIAN_FRONTEND": "noninteractive"})
        key = Path("/etc/apt/keyrings/docker.asc")
        source = Path("/etc/apt/sources.list.d/docker.sources")
        require(not key.is_symlink() and not source.is_symlink(), "Docker repository paths must not be symlinks.")
        key.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
        if not key.exists():
            run(["curl", "--fail", "--silent", "--show-error", "--location",
                 "https://download.docker.com/linux/ubuntu/gpg", "--output", str(key)])
            key.chmod(0o644)
        expected = ("Types: deb\nURIs: https://download.docker.com/linux/ubuntu\n"
                    f"Suites: {codename}\nComponents: stable\nArchitectures: amd64\n"
                    "Signed-By: /etc/apt/keyrings/docker.asc\n")
        if source.exists():
            require(source.read_text() == expected, "Existing Docker apt source differs; refusing to replace it.")
        else:
            source.write_text(expected)
            source.chmod(0o644)
        run(["apt-get", "update"])
        run(["apt-get", "install", "-y", "docker-ce", "docker-ce-cli", "containerd.io",
             "docker-buildx-plugin", "docker-compose-plugin"],
            environment={**clean_environment(), "DEBIAN_FRONTEND": "noninteractive"})
    run(["systemctl", "enable", "--now", "docker"])
    version = run(DOCKER + ["compose", "version", "--short"], capture=True).stdout.strip()
    match = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?", version)
    require(match and tuple(map(int, match.groups())) >= (2, 24, 4), "Docker Compose >= 2.24.4 is required.")
    run(DOCKER + ["info"], capture=True)


def expected_state(args):
    return {"schema": 1, "commit": args.commit, "origin": args.origin,
            "api_image": args.api_image, "web_image": args.web_image,
            "bundle_sha256": args.bundle_sha256}


def guard_existing_installation(root, expected):
    require(not root.is_symlink(), "Installation directory must not be a symlink.")
    if not root.exists():
        return False
    require(root.stat().st_uid == 0 and not root.stat().st_mode & 0o022, "Installation must be root-owned and protected.")
    state_file = root / ".ec2-demo.json"
    require(state_file.is_file() and not state_file.is_symlink(), "Existing installation was not created by this bootstrap.")
    state = json.loads(state_file.read_text())
    require({key: state.get(key) for key in expected} == expected,
            "An existing release differs. Updates require a verified backup and a separate procedure.")
    return bool(state.get("ready"))


def ensure_settings(root, commit, address):
    env_file = root / ".env.ec2"
    require(not env_file.is_symlink(), "Private settings must not be a symlink.")
    if not env_file.exists():
        require(not (root / ".ec2-demo.json").exists(), "Private settings are missing; refusing to reset credentials.")
        settings = {
            "APP_VERSION": f"ec2-{commit}", "PUBLIC_ORIGIN": f"https://{address}",
            "BIND_ADDRESS": "0.0.0.0", "HTTP_PORT": "80", "HTTPS_PORT": "443",
            "TLS_DIR": "/srv/exploralab/tls", "POSTGRES_DB": "exploralab",
            "POSTGRES_USER": "exploralab", "POSTGRES_PASSWORD": secrets.token_hex(32),
            "GOOGLE_CLIENT_ID": "", "WEB_CONCURRENCY": "1",
        }
        with env_file.open("x", encoding="utf-8") as stream:
            stream.write("".join(f"{key}={value}\n" for key, value in settings.items()))
        env_file.chmod(0o600)
    require(env_file.stat().st_uid == 0 and not env_file.stat().st_mode & 0o077,
            "Private settings must be root-owned, mode 600.")
    spec = importlib.util.spec_from_file_location("ec2_preflight", root / "infra/ec2_preflight.py")
    preflight = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(preflight)
    settings = preflight.read_settings(env_file)
    preflight.validate_settings(settings)  # No TLS dependencies or safety changes.
    require(settings["APP_VERSION"] == f"ec2-{commit}" and settings["PUBLIC_ORIGIN"] == f"https://{address}",
            "Saved release/origin differs; private settings were not changed.")


def write_state(root, state, ready=False):
    target = root / ".ec2-demo.json"
    temporary = root / ".ec2-demo.next"
    require(not target.is_symlink() and not temporary.exists() and not temporary.is_symlink(), "Unsafe state path.")
    temporary.write_text(json.dumps({**state, "ready": ready}, indent=2) + "\n")
    temporary.chmod(0o600)
    temporary.replace(target)


def install_bundle(root, files):
    root.mkdir(mode=0o755, parents=True, exist_ok=True)
    for name, content in files.items():
        path = root / name
        require(not path.is_symlink() and not path.parent.is_symlink(), "Unsafe installation path.")
        path.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
        if path.exists():
            require(path.read_bytes() == content, "Installed deployment file differs; refusing to overwrite it.")
        else:
            with path.open("xb") as stream:
                stream.write(content)
            path.chmod(0o644)


@contextmanager
def registry_environment(args):
    environment = clean_environment()
    if not args.ghcr_user:
        yield environment  # Anonymous access only; never reuse a host-wide Docker login.
        return
    require(os.isatty(0), "Private GHCR images require an interactive terminal for the read-only token.")
    with tempfile.TemporaryDirectory(prefix="exploralab-ghcr-", dir="/run") as directory:
        environment["DOCKER_CONFIG"] = directory
        token = getpass.getpass("GHCR token (classic read:packages, hidden; never paste in chat): ")
        try:
            require(bool(token), "A read-only GHCR token is required.")
            run(DOCKER + ["login", "ghcr.io", "--username", args.ghcr_user, "--password-stdin"],
                environment=environment, input_text=token + "\n", capture=True, timeout=30)
        finally:
            token = None
        yield environment  # Only this temporary directory contains the login; removed on exit.


def compose_command(root):
    return DOCKER + ["compose", "--env-file", str(root / ".env.ec2"), "-p", PROJECT,
                     "-f", str(root / "compose.production.yml"),
                     "-f", str(root / "compose.ec2-http-test.yml"),
                     "-f", str(root / "compose.ghcr.yml")]


def check_images(args, environment):
    for image in (args.api_image, args.web_image):
        result = run(DOCKER + ["image", "inspect", "--format", "{{json .Config.Labels}}", image],
                     environment=environment, capture=True)
        labels = json.loads(result.stdout) or {}
        require(labels.get("org.opencontainers.image.revision") == args.commit,
                "Published image revision does not match the selected commit.")


@contextmanager
def installation_lock():
    import fcntl  # Linux only; tests can import helpers on Windows.
    directory = Path("/run/exploralab-ec2")
    require(not directory.is_symlink(), "Unsafe runtime directory.")
    directory.mkdir(mode=0o700, exist_ok=True)
    require(directory.stat().st_uid == 0 and not directory.stat().st_mode & 0o077,
            "Runtime directory must be private and root-owned.")
    with (directory / "bootstrap.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


def deploy(root, args, environment, already_ready):
    environment = {**environment, "HTTP_TEST_ORIGIN": args.origin,
                   "GHCR_API_IMAGE": args.api_image, "GHCR_WEB_IMAGE": args.web_image}
    command = compose_command(root)
    def compose(*arguments, capture=False):
        return run(command + list(arguments), environment=environment, capture=capture)
    compose("config", "--quiet", capture=True)
    print("Downloading prebuilt images; no compilation on EC2.", flush=True)
    compose("--profile", "tools", "pull", "--policy", "missing", "database", "backend", "frontend", "migrate")
    check_images(args, environment)
    compose("up", "-d", "--no-build", "--wait", "--wait-timeout", "180", "database")
    if not already_ready:
        compose("run", "--rm", "--no-deps", "migrate")
    compose("up", "-d", "--no-build", "--wait", "--wait-timeout", "180", "backend")
    # Nginx resolves the upstream hostname during nginx -t: the API must exist first.
    compose("run", "--rm", "--no-deps", "frontend", "nginx", "-t")
    compose("up", "-d", "--no-build", "--wait", "--wait-timeout", "180", "frontend")
    compose("ps")
    with urllib.request.urlopen("http://127.0.0.1/healthz", timeout=10) as response:
        require(response.status == 200, "Web health check failed.")
    with urllib.request.urlopen("http://127.0.0.1/api/v1/ready", timeout=10) as response:
        require(json.load(response).get("version") == f"ec2-{args.commit}", "API readiness/version check failed.")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", required=True, type=Path)
    parser.add_argument("--bundle-sha256", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--api-image", required=True)
    parser.add_argument("--web-image", required=True)
    parser.add_argument("--origin", required=True)
    parser.add_argument("--http-demo", action="store_true")
    parser.add_argument("--ghcr-user")
    args = parser.parse_args(argv)
    try:
        address = validate_options(args)
        files = read_bundle(args.bundle, args.bundle_sha256)
        codename = validate_host(address)
        with installation_lock():
            state = expected_state(args)
            already_ready = guard_existing_installation(ROOT, state)
            print("HTTP DEMO ONLY: use fictitious accounts and non-reused passwords.", flush=True)
            install_docker(codename)
            if not ROOT.exists():
                volume = subprocess.run(DOCKER + ["volume", "inspect", f"{PROJECT}_production_database"],
                                        capture_output=True, env=clean_environment(), check=False)
                require(volume.returncode != 0, "Existing database volume found; refusing to generate new credentials.")
                containers = run(DOCKER + ["ps", "-aq", "--filter", f"label=com.docker.compose.project={PROJECT}"], capture=True)
                require(not containers.stdout.strip(), "Existing project containers found; refusing to adopt them.")
                # Publish a complete configuration atomically; partial first installs
                # never leave /opt/exploralab looking like an existing database.
                with tempfile.TemporaryDirectory(prefix=".exploralab-first-", dir=ROOT.parent) as directory:
                    staging = Path(directory)
                    install_bundle(staging, files)
                    ensure_settings(staging, args.commit, address)
                    write_state(staging, state)
                    staging.replace(ROOT)
            else:
                if already_ready:
                    run(DOCKER + ["volume", "inspect", f"{PROJECT}_production_database"], capture=True)
                install_bundle(ROOT, files)
                ensure_settings(ROOT, args.commit, address)
            with registry_environment(args) as environment:
                deploy(ROOT, args, environment, already_ready)
            write_state(ROOT, state, ready=True)
            print(f"Internal checks passed. Demo: {args.origin}; external access still needs checking.", flush=True)
        return 0
    except BootstrapError as error:
        print(f"Bootstrap stopped: {error} No data was removed.", flush=True)
        return 1
    except (ValueError, OSError, subprocess.SubprocessError, tarfile.TarError):
        # Child commands can include private settings. Do not print their arguments or captured output.
        print("Bootstrap failed; stopped without removing data. Check the last visible stage and prerequisites; no secrets printed.", flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
