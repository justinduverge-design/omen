#!/usr/bin/python3
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import shutil
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[2]
SELECTOR = REPO / "infra/warehouse/select_release_root.py"
SPEC = importlib.util.spec_from_file_location("warehouse_selector", SELECTOR)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class SelectorTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="omen-selector-test-"))
        self.addCleanup(shutil.rmtree, self.root, True)
        os.chmod(self.root, 0o755)
        (self.root / "releases").mkdir(mode=0o755)

    def release(self, marker: str):
        commit = hashlib.sha1(marker.encode()).hexdigest()
        release = self.root / "releases" / commit
        payload = release / "infra/warehouse/example.sh"
        payload.parent.mkdir(parents=True)
        payload.write_text(f"#!/bin/sh\n# {marker}\n")
        os.chmod(payload, 0o755)
        (release / "COMMIT").write_text(f"{commit}\n")
        (release / "RELEASE-CONTRACT").write_text("contract\n")
        rows = []
        for relative in ["COMMIT", "RELEASE-CONTRACT", "infra/warehouse/example.sh"]:
            rows.append(f"{hashlib.sha256((release / relative).read_bytes()).hexdigest()}  {relative}\n")
        manifest = "".join(rows).encode()
        (release / "SHA256SUMS").write_bytes(manifest)
        digest = hashlib.sha256(manifest).hexdigest()
        (release / "MANIFEST-SHA256").write_text(f"{digest}\n")
        for name in ["COMMIT", "RELEASE-CONTRACT", "SHA256SUMS", "MANIFEST-SHA256"]:
            os.chmod(release / name, 0o444)
        return commit, digest, release

    def select(self, commit, digest):
        return MODULE.select_release(commit, digest, self.root, require_root=False)

    def test_selects_and_rolls_back_by_atomic_relative_symlink(self):
        first = self.release("first")
        second = self.release("second")
        self.assertEqual(self.select(first[0], first[1])["state"], "selected")
        self.assertEqual(os.readlink(self.root / "current"), f"releases/{first[0]}")
        self.select(second[0], second[1])
        self.assertEqual(os.readlink(self.root / "current"), f"releases/{second[0]}")
        self.select(first[0], first[1])
        self.assertEqual(os.readlink(self.root / "current"), f"releases/{first[0]}")
        self.assertTrue(first[2].is_dir())
        self.assertTrue(second[2].is_dir())

    def test_rejects_hash_drift_unknown_inventory_and_links(self):
        commit, digest, release = self.release("drift")
        with self.assertRaisesRegex(MODULE.SelectionError, "manifest_hash_mismatch"):
            self.select(commit, "0" * 64)
        (release / "infra/warehouse/example.sh").write_text("tampered\n")
        with self.assertRaisesRegex(MODULE.SelectionError, "release_hash_mismatch"):
            self.select(commit, digest)
        commit, digest, release = self.release("unknown")
        (release / "extra").write_text("unexpected")
        with self.assertRaisesRegex(MODULE.SelectionError, "release_inventory_mismatch"):
            self.select(commit, digest)
        commit, digest, release = self.release("link")
        (release / "infra/warehouse/example.sh").unlink()
        (release / "infra/warehouse/example.sh").symlink_to("/etc/passwd")
        with self.assertRaisesRegex(MODULE.SelectionError, "release_unsafe"):
            self.select(commit, digest)

    def test_refuses_non_symlink_current_and_has_no_mutation_primitives(self):
        commit, digest, _ = self.release("blocked")
        (self.root / "current").mkdir()
        with self.assertRaisesRegex(MODULE.SelectionError, "current_unsafe"):
            self.select(commit, digest)
        source = SELECTOR.read_text()
        self.assertNotIn("subprocess", source)
        self.assertNotIn("shutil.rmtree", source)
        self.assertNotIn("docker", source.lower())
        self.assertNotIn("volume", source.lower())


if __name__ == "__main__":
    unittest.main()
