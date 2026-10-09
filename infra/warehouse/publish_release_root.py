#!/usr/bin/python3
"""Authenticate and atomically publish one Omen warehouse release bundle.

This file is an independently approved root tool. It is never included in the
release bundle and never executes release contents.
"""

from __future__ import annotations

import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import stat
import sys
import tarfile
import tempfile
from datetime import datetime, timezone

CONTRACT = "omen-football-warehouse-publication.v1"
RELEASE_CONTRACT = "omen-football-warehouse-release.v1"
PRODUCTION_ROOT = Path("/opt/omen/warehouse")
MAX_BUNDLE_BYTES = 4 * 1024 * 1024
IMAGE = "postgres:17.11-bookworm@sha256:91eb910c44c7ed13f7f1a4ccadaa9ca72ef14cddc04cacb6e070e48eb44731a3"

FILE_MODES = {
    "COMMIT": 0o444,
    "MANIFEST-SHA256": 0o444,
    "RELEASE-CONTRACT": 0o444,
    "SHA256SUMS": 0o444,
    "Dockerfile.warehouse-ingest": 0o644,
    "infra/warehouse/build-release.sh": 0o755,
    "infra/warehouse/docker-compose.yml": 0o644,
    "infra/warehouse/verify-release.sh": 0o755,
    "infra/warehouse/provision-credentials.sh": 0o755,
    "infra/warehouse/provision-login-roles.sh": 0o755,
    "infra/warehouse/verify-production-readonly.sh": 0o755,
    "infra/warehouse/backup/README.md": 0o644,
    "infra/warehouse/backup/create-snapshot.sh": 0o755,
    "infra/warehouse/backup/manifest.js": 0o644,
    "infra/warehouse/backup/restore-isolated.sh": 0o755,
    "infra/warehouse/monitor/status-export": 0o755,
    "infra/warehouse/monitor/status.js": 0o755,
    "warehouse/migrations/0001_football_warehouse.sql": 0o644,
    "warehouse/migrations/0002_record_migration.sh": 0o755,
    "warehouse/migrations/0003_warehouse_access_policy.sql": 0o644,
    "warehouse/migrations/0004_apply_access_policy.sh": 0o755,
    "warehouse/verify/production_readonly.sql": 0o644,
}
DIR_MODES = {
    "infra": 0o755,
    "infra/warehouse": 0o755,
    "infra/warehouse/backup": 0o755,
    "infra/warehouse/monitor": 0o755,
    "warehouse": 0o755,
    "warehouse/migrations": 0o755,
    "warehouse/verify": 0o755,
}


class PublishError(Exception):
    """Expected, sanitized publication failure."""


def fail(code: str) -> None:
    raise PublishError(code)


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def safe_relative(name: str) -> bool:
    if not name or name.startswith(("/", "-")) or "\\" in name:
        return False
    if any(ord(character) < 32 or ord(character) == 127 for character in name):
        return False
    parts = name.rstrip("/").split("/")
    return all(part not in ("", ".", "..") for part in parts)


def read_bundle(path: Path) -> bytes:
    try:
        descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    except OSError:
        fail("bundle_source_invalid")
    try:
        source = os.fstat(descriptor)
        if not stat.S_ISREG(source.st_mode) or source.st_nlink != 1 or not 0 < source.st_size <= MAX_BUNDLE_BYTES:
            fail("bundle_source_invalid")
        chunks: list[bytes] = []
        remaining = source.st_size
        while remaining:
            chunk = os.read(descriptor, min(remaining, 1024 * 1024))
            if not chunk:
                fail("bundle_source_changed")
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(descriptor, 1):
            fail("bundle_source_changed")
        if os.fstat(descriptor).st_size != source.st_size:
            fail("bundle_source_changed")
        return b"".join(chunks)
    finally:
        os.close(descriptor)


def parse_bundle(value: bytes) -> dict[str, tuple[bytes | None, int]]:
    entries: dict[str, tuple[bytes | None, int]] = {}
    try:
        with tarfile.open(fileobj=io.BytesIO(value), mode="r:") as archive:
            for member in archive:
                name = member.name.rstrip("/")
                if not safe_relative(member.name) or name in entries:
                    fail("archive_entry_invalid")
                expected_mode = DIR_MODES.get(name) if member.isdir() else FILE_MODES.get(name)
                if expected_mode is None or not (member.isdir() or member.isfile()):
                    fail("archive_entry_invalid")
                if (member.mode & 0o7777) != expected_mode or member.uid != 0 or member.gid != 0:
                    fail("archive_entry_invalid")
                if member.uname != "root" or member.gname != "root" or member.mtime != 0:
                    fail("archive_header_invalid")
                if member.pax_headers or member.linkname or member.devmajor != 0 or member.devminor != 0:
                    fail("archive_header_invalid")
                if member.isdir():
                    if member.size != 0:
                        fail("archive_entry_invalid")
                    entries[name] = (None, expected_mode)
                else:
                    extracted = archive.extractfile(member)
                    if extracted is None:
                        fail("archive_entry_invalid")
                    contents = extracted.read(MAX_BUNDLE_BYTES + 1)
                    if len(contents) != member.size or len(contents) > MAX_BUNDLE_BYTES:
                        fail("archive_entry_invalid")
                    entries[name] = (contents, expected_mode)
    except PublishError:
        raise
    except (tarfile.TarError, OSError, EOFError):
        fail("archive_invalid")
    expected = set(FILE_MODES) | set(DIR_MODES)
    if set(entries) != expected:
        fail("archive_inventory_invalid")
    return entries


def validate_tree(entries: dict[str, tuple[bytes | None, int]]) -> tuple[str, str]:
    files = {name: content for name, (content, _) in entries.items() if content is not None}
    commit_bytes = files["COMMIT"]
    assert commit_bytes is not None
    try:
        commit_text = commit_bytes.decode("ascii")
    except UnicodeDecodeError:
        fail("commit_invalid")
    if len(commit_text) != 41 or not commit_text.endswith("\n") or any(character not in "0123456789abcdef" for character in commit_text[:-1]):
        fail("commit_invalid")
    commit = commit_text.strip()
    actual_contract = files["RELEASE-CONTRACT"]
    assert actual_contract is not None
    match = re.search(rb"^worker_image=(ghcr\.io/justinduverge-design/omen-warehouse-ingest@sha256:[0-9a-f]{64})$", actual_contract, re.MULTILINE)
    if match is None:
        fail("release_contract_invalid")
    worker_image = match.group(1).decode("ascii")
    expected_contract = (
        f"contract_version={RELEASE_CONTRACT}\ncommit={commit}\nplatform=linux/amd64\n"
        f"image={IMAGE}\nworker_image={worker_image}\ninstall_root=/opt/omen/warehouse/releases\n"
    ).encode()
    if actual_contract != expected_contract:
        fail("release_contract_invalid")
    manifest = files["SHA256SUMS"]
    assert manifest is not None
    manifest_hash = sha256(manifest)
    if files["MANIFEST-SHA256"] != f"{manifest_hash}\n".encode():
        fail("inner_manifest_invalid")
    expected_hashed = ["COMMIT", "RELEASE-CONTRACT", *[
        name for name in FILE_MODES if name not in {"COMMIT", "MANIFEST-SHA256", "RELEASE-CONTRACT", "SHA256SUMS"}
    ]]
    try:
        lines = manifest.decode("ascii", errors="strict").splitlines()
    except UnicodeDecodeError:
        fail("inner_manifest_invalid")
    if len(lines) != len(expected_hashed):
        fail("inner_manifest_invalid")
    for line, expected_name in zip(lines, expected_hashed):
        if len(line) != 66 + len(expected_name) or line[64:66] != "  " or line[66:] != expected_name:
            fail("inner_manifest_invalid")
        digest = line[:64]
        content = files.get(expected_name)
        if content is None or any(character not in "0123456789abcdef" for character in digest) or sha256(content) != digest:
            fail("inner_manifest_invalid")
    return commit, manifest_hash


def safe_directory(path: Path, mode: int, require_root: bool) -> None:
    try:
        details = path.lstat()
    except FileNotFoundError:
        path.mkdir(mode=mode)
        os.chmod(path, mode)
        details = path.lstat()
    if not stat.S_ISDIR(details.st_mode) or stat.S_ISLNK(details.st_mode) or stat.S_IMODE(details.st_mode) != mode:
        fail("destination_parent_unsafe")
    if require_root and (details.st_uid != 0 or details.st_gid != 0):
        fail("destination_parent_unsafe")


def ensure_root(root: Path, require_root: bool) -> None:
    if require_root:
        current = Path("/")
        for part in root.parts[1:]:
            current /= part
            safe_directory(current, 0o755, True)
    else:
        root.mkdir(parents=True, exist_ok=True, mode=0o755)
        os.chmod(root, 0o755)


def write_tree(stage: Path, entries: dict[str, tuple[bytes | None, int]]) -> None:
    for name in sorted(DIR_MODES, key=lambda item: (item.count("/"), item)):
        target = stage / name
        target.mkdir(mode=DIR_MODES[name])
        os.chmod(target, DIR_MODES[name])
    for name, mode in FILE_MODES.items():
        content = entries[name][0]
        assert content is not None
        target = stage / name
        descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
        try:
            with os.fdopen(descriptor, "wb", closefd=False) as handle:
                handle.write(content)
                handle.flush()
                os.fsync(handle.fileno())
        finally:
            os.close(descriptor)
        os.chmod(target, mode)
    os.chmod(stage, 0o755)


def tree_matches(target: Path, entries: dict[str, tuple[bytes | None, int]], require_root: bool) -> bool:
    try:
        expected = set(FILE_MODES) | set(DIR_MODES)
        actual = {item.relative_to(target).as_posix() for item in target.rglob("*")}
        if actual != expected:
            return False
        for name, (content, mode) in entries.items():
            details = (target / name).lstat()
            if stat.S_IMODE(details.st_mode) != mode or (require_root and (details.st_uid != 0 or details.st_gid != 0)):
                return False
            if content is None:
                if not stat.S_ISDIR(details.st_mode) or stat.S_ISLNK(details.st_mode):
                    return False
            elif not stat.S_ISREG(details.st_mode) or details.st_nlink != 1 or (target / name).read_bytes() != content:
                return False
        return True
    except OSError:
        return False


def publish_release(bundle: Path, approved_hash: str, destination_root: Path = PRODUCTION_ROOT, require_root: bool = True) -> dict[str, str]:
    if require_root and os.geteuid() != 0:
        fail("root_required")
    if require_root and destination_root != PRODUCTION_ROOT:
        fail("destination_invalid")
    if not bundle.is_absolute() or len(approved_hash) != 64 or any(character not in "0123456789abcdef" for character in approved_hash):
        fail("arguments_invalid")
    ensure_root(destination_root, require_root)
    releases = destination_root / "releases"
    safe_directory(releases, 0o755, require_root)
    work = Path(tempfile.mkdtemp(prefix=".publish-", dir=destination_root))
    os.chmod(work, 0o700)
    try:
        source = read_bundle(bundle)
        private_bundle = work / "release.tar"
        private_bundle.write_bytes(source)
        os.chmod(private_bundle, 0o400)
        if sha256(private_bundle.read_bytes()) != approved_hash:
            fail("bundle_hash_mismatch")
        entries = parse_bundle(private_bundle.read_bytes())
        commit, manifest_hash = validate_tree(entries)
        target = releases / commit
        observed = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        base = {"contract_version": CONTRACT, "state": "published", "commit": commit,
                "bundle_sha256": approved_hash, "manifest_sha256": manifest_hash,
                "publisher_sha256": sha256(Path(__file__).read_bytes()), "destination": str(target)}
        if target.exists() or target.is_symlink():
            if not tree_matches(target, entries, require_root):
                fail("existing_release_mismatch")
            return {**base, "code": "already_published", "observed_at": observed}
        stage = work / "tree"
        stage.mkdir(mode=0o700)
        write_tree(stage, entries)
        if stage.stat().st_dev != releases.stat().st_dev:
            fail("destination_filesystem_mismatch")
        try:
            os.rename(stage, target)
        except FileExistsError:
            if not tree_matches(target, entries, require_root):
                fail("existing_release_mismatch")
            return {**base, "code": "already_published", "observed_at": observed}
        code = "ok"
        try:
            descriptor = os.open(releases, os.O_RDONLY)
            try:
                os.fsync(descriptor)
            finally:
                os.close(descriptor)
        except OSError:
            code = "published_durability_unconfirmed"
        return {**base, "code": code, "published_at": observed}
    finally:
        shutil.rmtree(work, ignore_errors=True)


def main(arguments: list[str]) -> int:
    try:
        if len(arguments) != 5 or arguments[0] != "publish" or arguments[1] != "--bundle" or arguments[3] != "--approved-bundle-sha256":
            fail("usage")
        os.umask(0o077)
        result = publish_release(Path(arguments[2]), arguments[4])
        status = 0
    except Exception as error:
        result = {"contract_version": CONTRACT, "state": "failed",
                  "code": str(error) if isinstance(error, PublishError) else "publisher_failed"}
        status = 1
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    return status


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
