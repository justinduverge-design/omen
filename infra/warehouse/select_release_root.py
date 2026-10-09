#!/usr/bin/python3
"""Atomically select one already-published Omen warehouse release."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import secrets
import stat
import sys

CONTRACT = "omen-football-warehouse-selection.v1"
PRODUCTION_ROOT = Path("/opt/omen/warehouse")
METADATA = {"COMMIT", "MANIFEST-SHA256", "RELEASE-CONTRACT", "SHA256SUMS"}


class SelectionError(Exception):
    """Expected, sanitized selection failure."""


def fail(code: str) -> None:
    raise SelectionError(code)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def safe_directory(path: Path, require_root: bool) -> os.stat_result:
    try:
        details = path.lstat()
    except OSError:
        fail("release_missing")
    if not stat.S_ISDIR(details.st_mode) or stat.S_ISLNK(details.st_mode) or details.st_mode & 0o022:
        fail("release_unsafe")
    if require_root and (details.st_uid != 0 or details.st_gid != 0):
        fail("release_unsafe")
    return details


def parse_manifest(release: Path, approved_manifest: str) -> dict[str, str]:
    manifest_path = release / "SHA256SUMS"
    marker_path = release / "MANIFEST-SHA256"
    if sha256(manifest_path) != approved_manifest:
        fail("manifest_hash_mismatch")
    try:
        if marker_path.read_text(encoding="ascii") != f"{approved_manifest}\n":
            fail("manifest_hash_mismatch")
        lines = manifest_path.read_text(encoding="ascii").splitlines()
    except (OSError, UnicodeError):
        fail("manifest_invalid")
    entries: dict[str, str] = {}
    for line in lines:
        if len(line) < 67 or line[64:66] != "  ":
            fail("manifest_invalid")
        digest, relative = line[:64], line[66:]
        parts = relative.split("/")
        if (len(digest) != 64 or any(character not in "0123456789abcdef" for character in digest)
                or relative in entries or relative in {"MANIFEST-SHA256", "SHA256SUMS"} or relative.startswith("/")
                or any(part in ("", ".", "..") for part in parts)):
            fail("manifest_invalid")
        entries[relative] = digest
    if not entries or set(("COMMIT", "RELEASE-CONTRACT")) - set(entries):
        fail("manifest_invalid")
    return entries


def validate_release(root: Path, commit: str, approved_manifest: str, require_root: bool) -> Path:
    if (len(commit) != 40 or any(character not in "0123456789abcdef" for character in commit)
            or len(approved_manifest) != 64
            or any(character not in "0123456789abcdef" for character in approved_manifest)):
        fail("arguments_invalid")
    safe_directory(root, require_root)
    releases = root / "releases"
    safe_directory(releases, require_root)
    release = releases / commit
    safe_directory(release, require_root)
    try:
        if (release / "COMMIT").read_text(encoding="ascii") != f"{commit}\n":
            fail("commit_mismatch")
        entries = parse_manifest(release, approved_manifest)
    except SelectionError:
        raise
    except (OSError, UnicodeError):
        fail("release_invalid")

    expected_files = set(entries) | METADATA
    actual_files: set[str] = set()
    expected_directories = {""}
    for relative in expected_files:
        parent = Path(relative).parent
        while str(parent) != ".":
            expected_directories.add(parent.as_posix())
            parent = parent.parent
    for item in release.rglob("*"):
        relative = item.relative_to(release).as_posix()
        details = item.lstat()
        if stat.S_ISLNK(details.st_mode) or (require_root and (details.st_uid != 0 or details.st_gid != 0)):
            fail("release_unsafe")
        if stat.S_ISDIR(details.st_mode):
            if relative not in expected_directories or details.st_mode & 0o022:
                fail("release_inventory_mismatch")
        elif stat.S_ISREG(details.st_mode) and details.st_nlink == 1:
            actual_files.add(relative)
            if details.st_mode & 0o022:
                fail("release_unsafe")
        else:
            fail("release_unsafe")
    if actual_files != expected_files:
        fail("release_inventory_mismatch")
    for relative, digest in entries.items():
        if sha256(release / relative) != digest:
            fail("release_hash_mismatch")
    return release


def select_release(commit: str, approved_manifest: str, root: Path = PRODUCTION_ROOT,
                   require_root: bool = True) -> dict[str, str]:
    if require_root and os.geteuid() != 0:
        fail("root_required")
    if require_root and root != PRODUCTION_ROOT:
        fail("destination_invalid")
    release = validate_release(root, commit, approved_manifest, require_root)
    current = root / "current"
    if current.exists() or current.is_symlink():
        details = current.lstat()
        if not stat.S_ISLNK(details.st_mode) or (require_root and (details.st_uid != 0 or details.st_gid != 0)):
            fail("current_unsafe")
    temporary = root / f".current-{secrets.token_hex(12)}"
    try:
        temporary.symlink_to(Path("releases") / commit)
        os.replace(temporary, current)
        descriptor = os.open(root, os.O_RDONLY)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)
    finally:
        if temporary.is_symlink():
            temporary.unlink()
    return {"contract_version": CONTRACT, "state": "selected", "commit": commit,
            "manifest_sha256": approved_manifest, "release": str(release), "current": str(current)}


def main(arguments: list[str]) -> int:
    try:
        if len(arguments) != 5 or arguments[0] != "select" or arguments[1] != "--commit" or arguments[3] != "--approved-manifest-sha256":
            fail("usage")
        os.umask(0o077)
        result = select_release(arguments[2], arguments[4])
        status = 0
    except Exception as error:
        result = {"contract_version": CONTRACT, "state": "failed",
                  "code": str(error) if isinstance(error, SelectionError) else "selector_failed"}
        status = 1
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    return status


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
