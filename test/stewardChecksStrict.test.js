"use strict";

// STANDARDS card C (rule 6): the scripts that watch our backups fail loudly. Each steward check runs in
// strict mode and writes DOWN check_crashed when it crashes, instead of leaving the last state on disk.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const DIR = path.join(__dirname, "..", "ops", "pi-fleet");
const CHECKS = fs.readdirSync(path.join(DIR, "steward-checks")).filter((f) => f.endsWith(".sh"));

for (const name of CHECKS) {
  test(`steward check ${name} is strict and records a crash`, () => {
    const src = fs.readFileSync(path.join(DIR, "steward-checks", name), "utf8");
    assert.match(src, /^set -Eeuo pipefail$/m);
    const trap = src.indexOf("trap 'down check_crashed' ERR");
    assert.ok(trap > 0, "missing the check_crashed ERR trap");
    assert.ok(src.indexOf('TMP="$(mktemp)"') > trap, "the temp file must come after the trap");
    assert.match(src, /down\(\) \{\s*trap - ERR/, "down must clear the trap so it can't loop");
  });
}

test("the link watchdog says why it runs without set -e", () => {
  const src = fs.readFileSync(path.join(DIR, "slops-link-watchdog.sh"), "utf8");
  assert.match(src, /No set -e on purpose/);
});
