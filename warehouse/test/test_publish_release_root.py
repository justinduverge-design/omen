#!/usr/bin/python3
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[2]
PUBLISHER = REPO / "infra/warehouse/publish_release_root.py"
SPEC = importlib.util.spec_from_file_location("warehouse_publisher", PUBLISHER)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)

RELEASE_FILES = [
    "Dockerfile.warehouse-ingest",
    "infra/warehouse/build-release.sh",
    "infra/warehouse/docker-compose.yml",
    "infra/warehouse/verify-release.sh",
    "infra/warehouse/provision-credentials.sh",
    "infra/warehouse/provision-login-roles.sh",
    "infra/warehouse/verify-production-readonly.sh",
    "warehouse/migrations/0001_football_warehouse.sql",
    "warehouse/migrations/0002_record_migration.sh",
    "warehouse/migrations/0003_warehouse_access_policy.sql",
    "warehouse/migrations/0004_apply_access_policy.sh",
    "warehouse/verify/production_readonly.sql",
]
WORKER_IMAGE = f"ghcr.io/justinduverge-design/omen-warehouse-ingest@sha256:{'a' * 64}"


class PublisherTest(unittest.TestCase):
    def setUp(self):
        self.temporary = Path(tempfile.mkdtemp(prefix="omen-publisher-test-"))
        self.addCleanup(shutil.rmtree, self.temporary, True)
        for relative in RELEASE_FILES:
            destination = self.temporary / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(REPO / relative, destination)
        subprocess.run(["git", "init", "-q"], cwd=self.temporary, check=True)
        subprocess.run(["git", "config", "user.email", "test@omen.invalid"], cwd=self.temporary, check=True)
        subprocess.run(["git", "config", "user.name", "test"], cwd=self.temporary, check=True)
        subprocess.run(["git", "add", "."], cwd=self.temporary, check=True)
        subprocess.run(["git", "commit", "-qm", "fixture"], cwd=self.temporary, check=True)
        self.commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=self.temporary, text=True).strip()
        self.release = self.temporary / "release"
        subprocess.run([self.temporary / "infra/warehouse/build-release.sh", self.commit, self.release, WORKER_IMAGE], cwd=self.temporary, check=True)
        self.bundle = Path(f"{self.release}.tar")
        self.bundle_hash = Path(f"{self.bundle}.sha256").read_text().strip()

    def publish(self, bundle=None, approved_hash=None, destination=None):
        return MODULE.publish_release(
            Path(bundle or self.bundle).absolute(), approved_hash or self.bundle_hash,
            (destination or (self.temporary / "destination")).resolve(), require_root=False,
        )

    def test_bundle_is_deterministic_and_excludes_publisher(self):
        second = self.temporary / "second"
        subprocess.run([self.temporary / "infra/warehouse/build-release.sh", self.commit, second, WORKER_IMAGE], cwd=self.temporary, check=True)
        self.assertEqual(self.bundle.read_bytes(), Path(f"{second}.tar").read_bytes())
        with tarfile.open(self.bundle, "r:") as archive:
            self.assertNotIn("infra/warehouse/publish_release_root.py", archive.getnames())

    def test_authenticates_and_publishes_without_executing_payload(self):
        marker = self.temporary / "executed"
        payload = self.temporary / "infra/warehouse/provision-credentials.sh"
        payload.write_text(f"#!/bin/sh\ntouch '{marker}'\n")
        os.chmod(payload, 0o755)
        subprocess.run(["git", "add", "."], cwd=self.temporary, check=True)
        subprocess.run(["git", "commit", "-qm", "payload"], cwd=self.temporary, check=True)
        commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=self.temporary, text=True).strip()
        release = self.temporary / "payload-release"
        subprocess.run([self.temporary / "infra/warehouse/build-release.sh", commit, release, WORKER_IMAGE], cwd=self.temporary, check=True)
        bundle = Path(f"{release}.tar")
        approved = Path(f"{bundle}.sha256").read_text().strip()
        result = self.publish(bundle, approved)
        self.assertEqual(result["code"], "ok")
        self.assertFalse(marker.exists())
        self.assertTrue(Path(result["destination"]).is_dir())

    def test_rejects_hash_mismatch_symlink_and_archive_link(self):
        with self.assertRaisesRegex(MODULE.PublishError, "bundle_hash_mismatch"):
            self.publish(approved_hash="0" * 64)
        link = self.temporary / "bundle-link.tar"
        link.symlink_to(self.bundle)
        with self.assertRaisesRegex(MODULE.PublishError, "bundle_source_invalid"):
            self.publish(bundle=link)
        malicious = self.temporary / "malicious.tar"
        with tarfile.open(malicious, "w:", format=tarfile.USTAR_FORMAT) as archive:
            info = tarfile.TarInfo("COMMIT")
            info.type = tarfile.SYMTYPE
            info.linkname = "/etc/passwd"
            archive.addfile(info)
        digest = hashlib.sha256(malicious.read_bytes()).hexdigest()
        with self.assertRaisesRegex(MODULE.PublishError, "archive_entry_invalid"):
            self.publish(bundle=malicious, approved_hash=digest)

    def test_is_idempotent_but_rejects_divergent_existing_release(self):
        first = self.publish()
        self.assertEqual(first["code"], "ok")
        repeated = self.publish()
        self.assertEqual(repeated["code"], "already_published")
        commit_file = Path(first["destination"]) / "COMMIT"
        os.chmod(commit_file, 0o644)
        commit_file.write_text(commit_file.read_text() + "x")
        with self.assertRaisesRegex(MODULE.PublishError, "existing_release_mismatch"):
            self.publish()

    def test_cli_has_fixed_destination_and_sanitized_failure(self):
        result = subprocess.run(
            [sys.executable, "-I", PUBLISHER, "publish", "--bundle", "/missing", "--approved-bundle-sha256", "0" * 64],
            text=True, capture_output=True, check=False,
        )
        self.assertEqual(result.returncode, 1)
        self.assertEqual(set(__import__("json").loads(result.stdout)), {"code", "contract_version", "state"})
        source = PUBLISHER.read_text()
        self.assertNotIn("subprocess", source)
        self.assertNotIn("os.system", source)
        self.assertNotIn('Path("current")', source)
        self.assertNotIn("os.symlink(", source)


if __name__ == "__main__":
    unittest.main()
