"use strict";

/**
 * S0 contract tests (Blueprints/rebuild/omen-call-slice-plan.md).
 *
 * What these prove:
 *   1. every fixture the real server builder produces for `omen-decision-brief.v3` validates against
 *      the schema, in every state the mock builder can reach;
 *   2. the schema can REJECT: representative breaking mutations fail validation (a schema that
 *      accepts everything proves nothing);
 *   3. the schema still contains everything the committed lock recorded: removing, retyping or
 *      loosening a public field fails, adding one does not;
 *   4. committed fixtures equal what the code produces today, so a change to the server's output
 *      shows up as a visible fixture diff in the same PR.
 *
 * What they do NOT prove: that a LIVE (non-mock) payload validates — mock mode can only produce
 * `limitation` evidence, so `verified` / `projection` / `model` / `inference` rows are covered by the
 * schema's enums but not yet by a fixture (needs the seeded-league harness, S0 follow-up); and that
 * iOS renders each state correctly (see OmenDecisionTests.swift, `testContractFixtures…`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const Ajv = require("ajv");
const contracts = require("../scripts/contracts");

const CONTRACT = "omen-decision-brief.v3";
const ajv = new Ajv({ allErrors: true, strict: false });
const schema = contracts.readSchema(CONTRACT);
const validate = ajv.compile(schema);

const load = (state) => JSON.parse(fs.readFileSync(contracts.fixtureFile(CONTRACT, state), "utf8"));
const clone = (v) => JSON.parse(JSON.stringify(v));
const explain = () => JSON.stringify(validate.errors, null, 1).slice(0, 600);

test("the schema itself compiles", () => {
  assert.equal(typeof validate, "function");
});

for (const state of contracts.BRIEF_STATES) {
  test(`fixture validates: ${state}`, () => {
    const { body } = load(state);
    assert.ok(validate(body), explain());
    assert.equal(body.contract_version, CONTRACT);
  });
}

test("every state the schema allows that the mock builder cannot reach is listed, not silently untested", () => {
  const schemaStates = new Set(schema.properties.state.enum);
  const covered = new Set(contracts.BRIEF_STATES);
  const uncovered = [...schemaStates].filter((s) => !covered.has(s)).sort();
  // Live-only states. Adding a fixture for one removes it from this list; adding a state to the
  // schema without a fixture or an entry here fails the test.
  assert.deepEqual(uncovered, [
    "espn_import_blocked", "espn_league_context_missing", "espn_recovery_needed",
    "pending_live_engine", "sleeper_league_context_missing", "yahoo_reauth_required",
  ]);
});

test("the schema rejects breaking changes (it can say no)", () => {
  const good = load("success").body;
  const cases = {
    "state removed": (b) => { delete b.state; },
    "state renamed to an unknown value": (b) => { b.state = "ok"; },
    "warnings becomes an object": (b) => { b.warnings = { a: 1 }; },
    "recommendation missing on success": (b) => { b.recommendation = null; },
    "move missing on success": (b) => { delete b.recommendation.move; },
    "a numeric confidence score leaks to native": (b) => { b.recommendation.confidence.score = 82; },
    "a band with no drivers": (b) => { b.recommendation.confidence.drivers = []; },
    "an unknown band": (b) => { b.recommendation.confidence.band = "very_confident"; },
    "an evidence row with an unknown kind": (b) => { b.evidence[0].kind = "guess"; },
    "a capability with a bad state": (b) => { b.capabilities[0].state = "stub"; },
    "capability contract renamed": (b) => { b.capability_contract = "decision-capabilities.v2"; },
    "an empty statement": (b) => { b.evidence[0].statement = ""; },
  };
  for (const [name, mutate] of Object.entries(cases)) {
    const bad = clone(good);
    mutate(bad);
    assert.equal(validate(bad), false, `expected the schema to reject: ${name}`);
  }
});

test("state-specific rules: reauth needs a recovery, error needs an error, empty needs an explanation", () => {
  const reauth = clone(load("espn_reauth_required").body);
  reauth.platform.recovery = null;
  assert.equal(validate(reauth), false);

  const err = clone(load("error").body);
  delete err.error;
  assert.equal(validate(err), false);

  const empty = clone(load("empty").body);
  delete empty.explanation;
  assert.equal(validate(empty), false);
});

test("additive change is allowed: an unknown extra field and an extra capability still validate", () => {
  const body = clone(load("success").body);
  body.brand_new_field = { anything: true };
  body.recommendation.extra_detail = "ok";
  body.capabilities.push({
    name: "wind", state: "live", used: true, kind: "model", source: "open-meteo",
    statement: "Wind 18 mph at kickoff.", observed_at: "2026-01-01T00:00:00.000Z", fresh_until: null,
  });
  assert.ok(validate(body), explain());
});

test("the lock: the current schema contains everything the lock recorded", () => {
  const breaks = contracts.compareToLock(contracts.readLock(CONTRACT), contracts.flattenSchema(schema));
  assert.deepEqual(breaks, []);
});

test("the lock guard catches removal, retyping, loosening and value removal — and allows additions", () => {
  const lock = contracts.readLock(CONTRACT);
  const now = clone(contracts.flattenSchema(schema));

  const removed = clone(now); delete removed["recommendation.move"];
  assert.ok(contracts.compareToLock(lock, removed).some((b) => b.startsWith("removed: recommendation.move")));

  const retyped = clone(now); retyped.warnings.type = "object";
  assert.ok(contracts.compareToLock(lock, retyped).some((b) => b.startsWith("retyped: warnings")));

  const loosened = clone(now); loosened.state.required = false;
  assert.ok(contracts.compareToLock(lock, loosened).some((b) => b.startsWith("no longer required: state")));

  const narrowed = clone(now); narrowed.state.values = narrowed.state.values.filter((v) => v !== "\"success\"");
  assert.ok(contracts.compareToLock(lock, narrowed).some((b) => b.startsWith("value removed: state")));

  const added = clone(now);
  added["recommendation.new_optional_field"] = { type: "string", required: false };
  added.state.values = [...added.state.values, "\"brand_new_state\""];
  assert.deepEqual(contracts.compareToLock(lock, added), [], "additions are not breaking");
});

test("committed fixtures equal what the server builder produces today (drift guard)", () => {
  const fresh = contracts.generateBriefV3Fixtures();
  for (const state of contracts.BRIEF_STATES) {
    const committed = fs.readFileSync(contracts.fixtureFile(CONTRACT, state), "utf8");
    assert.equal(
      committed,
      contracts.serialize(fresh[state]),
      `fixture ${state} is out of date. If the server's output changed on purpose, run: node scripts/contracts.js fixtures — and review the diff as an API change.`,
    );
  }
});

test("fixtures contain no volatile values", () => {
  for (const state of contracts.BRIEF_STATES) {
    const { body } = load(state);
    assert.equal(body.request_id, "omen_req_FIXTURE");
    assert.equal(body.generated_at, "2026-01-01T00:00:00.000Z");
  }
});
