"""Build the public all-skins ZIP from verified VPS files and a D1 manifest."""

import argparse
import hashlib
import json
import os
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

KEY = re.compile(r"^skins/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.osk$")


def unique_name(raw: str, used: set[str]) -> str:
    cleaned = re.sub(r'[\\/:*?"<>|]', "_", raw.strip()) or "skin.osk"
    stem, suffix = os.path.splitext(cleaned)
    candidate = cleaned
    number = 2
    while candidate in used:
        candidate = f"{stem}-{number}{suffix}"
        number += 1
    used.add(candidate)
    return candidate


def build(root: Path, manifest_path: Path) -> dict:
    rows = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise ValueError("The manifest must be an array")
    destination = root / "files" / "bundles" / "all.zip"
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".zip.part")
    used: set[str] = set()
    missing: list[str] = []
    external: list[tuple[str, str, str]] = []
    count = 0
    total_bytes = 0

    with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as archive:
        for row in rows:
            name = str(row.get("name") or "Skin")
            key = row.get("skin_file_key")
            if key:
                if not isinstance(key, str) or not KEY.fullmatch(key):
                    raise ValueError(f"Invalid key: {key!r}")
                source = root / "files" / key
                if not source.is_file():
                    raise FileNotFoundError(source)
                size = source.stat().st_size
                expected = int(row.get("skin_file_size") or 0)
                if expected and size != expected:
                    raise ValueError(f"Size mismatch for {key}: {size} != {expected}")
                archive.write(source, unique_name(str(row.get("skin_file_name") or f"{name}.osk"), used))
                count += 1
                total_bytes += size
                continue
            url = row.get("download_url")
            parsed = urlparse(url) if isinstance(url, str) else None
            if parsed and parsed.scheme in ("http", "https") and parsed.netloc:
                archive_name = unique_name(f"{name}.url", used)
                archive.writestr(archive_name, f"[InternetShortcut]\r\nURL={url}\r\n")
                external.append((name, url, archive_name))
            else:
                missing.append(f"{name} : aucun fichier local ni URL valide.")
        if external:
            lines = ["Téléchargements externes :", ""] + [f"- {name} : {url}" for name, url, _ in external]
            archive.writestr(unique_name("LIENS-EXTERNES.txt", used), "\n".join(lines) + "\n")
        if missing:
            archive.writestr(unique_name("README-missing-skins.txt", used),
                             "Les skins ci-dessous n'ont pas pu être inclus :\n\n" + "\n".join(missing) + "\n")

    with zipfile.ZipFile(temporary) as archive:
        damaged = archive.testzip()
        if damaged:
            raise ValueError(f"Damaged archive member: {damaged}")
    digest = hashlib.sha256()
    with temporary.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    metadata = {
        "name": "osu-yuzu-skins.zip",
        "size": temporary.stat().st_size,
        "sha256": digest.hexdigest(),
        "builtAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "fileCount": count,
        "totalBytes": total_bytes,
    }
    os.replace(temporary, destination)
    meta_temp = destination.with_suffix(".zip.json.part")
    meta_temp.write_text(json.dumps(metadata, ensure_ascii=False), encoding="utf-8")
    os.replace(meta_temp, Path(f"{destination}.json"))
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    options = parser.parse_args()
    print(json.dumps(build(options.root, options.manifest)))
