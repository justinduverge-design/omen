"use strict";

// STANDARDS card K: rehearse-pending.sh refuses any non-local Postgres and says when there is nothing to rehearse.
// The SQL rehearsal itself needs Postgres; migrations-ci.yml runs it.
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT = path.join(__dirname, "..", "scripts", "db", "rehearse-pending.sh");
const run = (env) => spawnSync("bash", [SCRIPT], { env: { ...process.env, ...env }, encoding: "utf8" });

test("refuses any target that isn't local, before touching a database", () => {
  for (const env of [
    { PGHOST: "db.example.supabase.co" },
    { PGHOST: "10.0.0.5" },
    { PGHOST: "", PGSERVICE: "prod" },
    { PGHOST: "", PGHOSTADDR: "10.0.0.5" },
    { PGHOST: "localhost", PGSERVICEFILE: "/tmp/x" },
  ]) {
    const out = run(env);
    assert.equal(out.status, 2, JSON.stringify(env));
    assert.match(out.stderr, /refusing/);
  }
});

test("an empty pending folder says nothing to rehearse instead of passing silently", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pending-"));
  const out = run({ PGHOST: "127.0.0.1", PENDING_DIR: dir });
  assert.equal(out.status, 0);
  assert.match(out.stdout, /nothing to rehearse/);
  fs.rmSync(dir, { recursive: true, force: true });
});
