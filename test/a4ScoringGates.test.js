"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

const SCRIPT = path.join(__dirname, "..", "scripts", "check-a4-scoring-gates.js");

function run(env = {}) {
  try {
    const out = execFileSync(process.execPath, [SCRIPT, "--json"], {
      env: { ...process.env, SUPABASE_URL: "", SUPABASE_SERVICE_KEY: "", ...env },
      encoding: "utf8",
    });
    return { code: 0, body: JSON.parse(out) };
  } catch (error) {
    return { code: error.status, body: JSON.parse(error.stdout || "{}") };
  }
}

test("the checker refuses to pass during the off-season", () => {
  const { code, body } = run();

  assert.equal(body.ok, false);
  assert.equal(code, 1);
  const season = body.gates.find((g) => g.id === "season_started");
  assert.equal(season.status, "FAIL");
  // Read from is_off_season, never the clamped week — that clamp is what produced a false
  // "the floor is cleared" record on 2026-08-27.
  assert.match(season.detail, /is_off_season=true/);
});

test("an unreadable database is UNKNOWN, never a silent pass", () => {
  const { body } = run();
  const row = body.gates.find((g) => g.id === "production_row");

  // A gate that cannot be observed must not default to green. That default is how a
  // scoring flag gets enabled on evidence nobody checked.
  assert.equal(row.status, "UNKNOWN");
  assert.equal(body.ok, false);
});

test("every gate reports one of the four known statuses", () => {
  const { body } = run();
  for (const g of body.gates) {
    assert.ok(["PASS", "FAIL", "UNKNOWN", "ALREADY_ON"].includes(g.status), `${g.id}: ${g.status}`);
    assert.ok(g.detail && g.detail.length > 0, `${g.id} must explain itself`);
  }
});

test("the checker never enables anything by itself", () => {
  const source = require("node:fs").readFileSync(SCRIPT, "utf8");
  // A timer that edits production env and recreates a container is the unattended
  // production change the safety gates exist to prevent. The script prints the command.
  assert.equal(/execFileSync|execSync|spawn\(|child_process/.test(source), false);
  assert.equal(/writeFileSync|appendFileSync/.test(source), false);
});
