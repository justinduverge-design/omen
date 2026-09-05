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

// These two pin the season gate on BOTH sides of kickoff, using an injected clock.
//
// The original single test asserted `status === "FAIL"` against the real system clock. That
// encoded a temporary state of the world as a permanent invariant, and it did exactly what
// such a test must eventually do: it went red on 2026-09-05 the moment the season actually
// opened — a date `Direction/current_sprint.md` had written down in advance — and it took the
// production deploy pipeline down with it, because `deploy.yml` runs this suite as its gate.
//
// The behaviour worth pinning was never "the gate says FAIL". It is "the gate follows
// is_off_season". Testing that needs both branches, and both branches need a fixed clock.

test("the checker refuses to pass during the off-season", () => {
  // July: unambiguously between seasons, whatever year the suite runs in.
  const { code, body } = run({ OMEN_GATES_NOW: "2026-07-01T12:00:00Z" });

  assert.equal(body.ok, false);
  assert.equal(code, 1);
  const season = body.gates.find((g) => g.id === "season_started");
  assert.equal(season.status, "FAIL");
  // Read from is_off_season, never the clamped week — that clamp is what produced a false
  // "the floor is cleared" record on 2026-08-27.
  assert.match(season.detail, /is_off_season=true/);
});

test("the season gate passes once the season has actually opened", () => {
  // Mid-regular-season, so it cannot drift into a preseason or playoff edge.
  const { code, body } = run({ OMEN_GATES_NOW: "2026-10-15T12:00:00Z" });

  const season = body.gates.find((g) => g.id === "season_started");
  assert.equal(season.status, "PASS");
  assert.match(season.detail, /is_off_season=false/);

  // The suite still refuses overall: `production_row` is UNKNOWN without database
  // credentials. Proving that here matters — a season gate flipping to PASS must not be
  // mistaken for the checker as a whole going green.
  assert.equal(body.ok, false);
  assert.equal(code, 1);
});

test("a faked clock is stamped into the evidence it produces", () => {
  const { body } = run({ OMEN_GATES_NOW: "2026-07-01T12:00:00Z" });
  const season = body.gates.find((g) => g.id === "season_started");

  // This checker exists to gate enabling production scoring. If its clock can be moved,
  // every record it emits under a moved clock has to say so in the same line someone would
  // quote as evidence — otherwise the override becomes a way to manufacture a clean result.
  assert.match(season.detail, /now_override=2026-07-01T12:00:00Z/);
});

test("an unparseable clock override fails loudly instead of silently using the real time", () => {
  const { code, body } = run({ OMEN_GATES_NOW: "not-a-date" });

  // Falling back to `new Date()` on a typo is how a test starts passing for the wrong
  // reason, so this must not be a soft failure.
  assert.notEqual(code, 0);
  assert.equal(body.ok, false);
  assert.match(body.error, /OMEN_GATES_NOW is not a valid date/);
  // No gate list at all, so a broken run can never be read as a set of results.
  assert.equal(body.gates, undefined);
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
