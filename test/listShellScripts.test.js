"use strict";

// STANDARDS card A: ShellCheck in CI finds shell scripts by their #! line, not their extension.
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");

test("list-shell-scripts includes extensionless ops jobs and skips the Gradle wrapper", () => {
  const out = spawnSync("bash", ["scripts/list-shell-scripts.sh"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(out.status, 0, out.stderr);
  const files = out.stdout.split("\0").filter(Boolean);
  for (const f of [
    "ops/football-data/kvm1/omen-football-backup",
    "ops/football-data/kvm1/omen-football-restore",
    "ops/football-data/kvm1/omen-football-run",
    ".githooks/pre-commit",
    "scripts/merge-pr.sh",
  ]) {
    assert.ok(files.includes(f), f);
  }
  assert.ok(!files.includes("mobile/android/gradlew"));
  assert.ok(!files.some((f) => f.endsWith(".js")));
});

test("list-shell-scripts matches shebang forms, not other interpreters", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shlist-"));
  const files = {
    "a-env-sh": "#!/usr/bin/env sh\n",
    "b-space": "#! /bin/bash\n",
    "c-flag": "#!/bin/bash -e\n",
    "d-dash": "#!/bin/dash\n",
    "e.sh": "echo no shebang\n",
    "f-python": "#!/usr/bin/env python3\n",
    "g-zsh": "#!/bin/zsh\n",
    "h-untracked": "#!/bin/sh\n",
  };
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), body);
  const git = (...args) => spawnSync("git", ["-C", dir, ...args], { encoding: "utf8" });
  git("init", "-q");
  git("add", ...Object.keys(files).filter((f) => f !== "h-untracked"));
  const out = spawnSync("bash", [path.join(ROOT, "scripts/list-shell-scripts.sh"), dir], { encoding: "utf8" });
  assert.equal(out.status, 0, out.stderr);
  assert.deepEqual(out.stdout.split("\0").filter(Boolean).sort(), ["a-env-sh", "b-space", "c-flag", "d-dash", "e.sh"]);
  fs.rmSync(dir, { recursive: true, force: true });
});
