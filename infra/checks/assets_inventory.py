"""Runtime/editor asset inventory. No inferred copyright permissions."""
import csv
import gzip
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "frontend" / "public"
EDITOR_EXTENSIONS = {".xcf", ".psd", ".aseprite", ".ase", ".tmx", ".tsx"}


def main():
    output_dir = ROOT / "infra" / ".local"
    output_dir.mkdir(parents=True, exist_ok=True)
    total = runtime = editor = 0
    files = sorted(path for path in PUBLIC.rglob("*") if path.is_file())
    with (output_dir / "assets-inventory.csv").open("w", encoding="utf-8", newline="") as output:
        writer = csv.writer(output)
        writer.writerow(["path", "bytes", "sha256", "distribution", "license_evidence"])
        for path in files:
            content = path.read_bytes()
            size = len(content)
            is_editor = path.suffix.lower() in EDITOR_EXTENSIONS
            writer.writerow([str(path.relative_to(PUBLIC)), size, hashlib.sha256(content).hexdigest(),
                             "editor-excluded" if is_editor else "runtime", "requires-owner-verification"])
            total += size
            editor += size if is_editor else 0
            runtime += 0 if is_editor else size
    print(f"{len(files)} assets; runtime {runtime:,} bytes; editor files excluded {editor:,} bytes; source total {total:,} bytes.")
    pit = (PUBLIC / "assets/game/maps/open-pit.tmj").read_bytes()
    print(f"Open Pit JSON: {len(pit):,} bytes; gzip reference {len(gzip.compress(pit)):,} bytes (not a device timing measurement).")


if __name__ == "__main__":
    main()
