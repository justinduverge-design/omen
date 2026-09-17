"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  CAPABILITY_CONTRACT,
  asLegacySignal,
  scoringCoverageCapability,
  waiverCapability,
  waiverCapabilitiesEnvelope,
} = require("../src/services/waiverScoringCapabilities");

test("waiver capability preserves a completed no-move read instead of calling it unavailable", () => {
  const record = waiverCapability({
    generated_at: "2026-09-17T12:00:00.000Z",
    platform: "sleeper",
    state: "no_credible_move",
    message: "No waiver move stands out for this roster right now.",
    best_move: null,
  });

  assert.deepEqual(record, {
    name: "waivers",
    state: "live",
    used: false,
    kind: "inference",
    source: "sleeper",
    statement: "No waiver move stands out for this roster right now.",
    observed_at: "2026-09-17T12:00:00.000Z",
    fresh_until: null,
    reason_code: "no_credible_move",
    detail_ref: { contract: "waiver-analysis.v1", path: "/api/waivers/analysis" },
  });
});

test("waiver capability never merges unread, unconfirmed, no-drop, or off-season outcomes", () => {
  const cases = [
    ["confirmed_opportunity", "live", "inference"],
    ["no_low_cost_drop", "live", "inference"],
    ["availability_unknown", "unavailable", "limitation"],
    ["engine_limitation", "unavailable", "limitation"],
    ["off_season", "unavailable", "limitation"],
  ];

  for (const [waiverState, state, kind] of cases) {
    const record = waiverCapability({ platform: "espn", state: waiverState });
    assert.equal(record.state, state, waiverState);
    assert.equal(record.kind, kind, waiverState);
    assert.equal(record.reason_code, waiverState, waiverState);
  }
});

test("waiver promotion does not calculate, expose, or convert a null bid", () => {
  const record = waiverCapability({
    platform: "sleeper",
    state: "confirmed_opportunity",
    best_move: { bid: null },
  });

  assert.equal(Object.hasOwn(record, "bid"), false);
  assert.equal(JSON.stringify(record).includes('"amount":0'), false);
});

test("league-exact scoring is live only after supported coverage and exact reconciliation", () => {
  const record = scoringCoverageCapability({
    coverage_state: "supported",
    reconciliation_state: "exact",
  }, { observedAt: "2026-09-17T12:00:00.000Z" });

  assert.deepEqual(record, {
    name: "league_exact_scoring",
    state: "live",
    used: false,
    kind: "verified",
    source: "league_scoring_contract",
    statement: "Omen reproduced the provider's final score from this league's own rules.",
    observed_at: "2026-09-17T12:00:00.000Z",
    fresh_until: null,
    reason_code: "league_exact",
    coverage_state: "supported",
    reconciliation_state: "exact",
  });
});

test("supported rules without reconciliation remain an exact-scoring limitation", () => {
  const record = scoringCoverageCapability({
    coverage_state: "supported",
    reconciliation_state: "pending",
  });

  assert.equal(record.state, "unavailable");
  assert.equal(record.kind, "limitation");
  assert.equal(record.reason_code, "coverage_supported");
  assert.match(record.statement, /has not been reconciled/);
  assert.doesNotMatch(record.statement, /league-exact final score/i);
});

test("all non-exact scoring coverage states fail closed and retain the source state", () => {
  for (const coverageState of [
    "provider_adjusted",
    "provider_restricted",
    "unsupported",
    "ambiguous",
    "mismatch",
    "pending",
  ]) {
    const record = scoringCoverageCapability({ coverage_state: coverageState, reconciliation_state: coverageState });
    assert.equal(record.state, "unavailable", coverageState);
    assert.equal(record.kind, "limitation", coverageState);
    assert.equal(record.coverage_state, coverageState, coverageState);
  }
});

test("the compatibility signal never revives a stub and the waiver v2 envelope keeps the canonical record", () => {
  const waiver = waiverCapability({ platform: "yahoo", state: "availability_unknown" });
  const signal = asLegacySignal(waiver);
  const envelope = waiverCapabilitiesEnvelope({ platform: "yahoo", state: "availability_unknown" });

  assert.deepEqual(signal.status, "unavailable");
  assert.equal(Object.hasOwn(signal, "reason_code"), false);
  assert.equal(envelope.capability_contract, CAPABILITY_CONTRACT);
  assert.equal(envelope.capabilities[0].reason_code, "availability_unknown");
});
