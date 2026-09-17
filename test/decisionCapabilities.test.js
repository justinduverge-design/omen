"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CAPABILITY_CONTRACT,
  evidenceKindFor,
  buildDecisionCapabilities,
} = require("../src/services/decisionCapabilities");

test("decision capabilities preserve evidence semantics and do not turn a limitation into a live fact", () => {
  const result = buildDecisionCapabilities({
    signals: {
      roster: {
        status: "live",
        used: true,
        source: "sleeper_roster",
        message: "Roster imported from Sleeper.",
      },
      matchup_dvp: {
        status: "unavailable",
        used: false,
        source: "nflverse_data",
        message: "Not enough trailing games for a DvP read.",
      },
      projections: {
        status: "live",
        used: true,
        source: "optimizer",
        message: "Projection edge is normalized from roster fields.",
      },
    },
    generatedAt: "2026-09-16T12:00:00.000Z",
  });

  assert.equal(result.contract_version, CAPABILITY_CONTRACT);
  assert.deepEqual(result.capabilities, [
    {
      name: "matchup_dvp",
      state: "unavailable",
      used: false,
      kind: "limitation",
      source: "nflverse_data",
      statement: "Not enough trailing games for a DvP read.",
      observed_at: null,
      fresh_until: null,
    },
    {
      name: "projections",
      state: "live",
      used: true,
      kind: "projection",
      source: "optimizer",
      statement: "Projection edge is normalized from roster fields.",
      observed_at: "2026-09-16T12:00:00.000Z",
      fresh_until: null,
    },
    {
      name: "roster",
      state: "live",
      used: true,
      kind: "verified",
      source: "sleeper_roster",
      statement: "Roster imported from Sleeper.",
      observed_at: "2026-09-16T12:00:00.000Z",
      fresh_until: null,
    },
  ]);
});

test("capability kind is a contract role, not a UI status synonym", () => {
  assert.equal(evidenceKindFor("weather", { status: "live" }), "inference");
  assert.equal(evidenceKindFor("llm_reasoning", { status: "live" }), "model");
  assert.equal(evidenceKindFor("exact_scoring", { status: "unavailable" }), "limitation");
  assert.equal(evidenceKindFor("unknown_future_capability", { status: "live" }), "inference");
});

test("promoted source records override legacy stubs only with explicit usable evidence", () => {
  const result = buildDecisionCapabilities({
    generatedAt: "2026-09-17T00:00:00.000Z",
    signals: {
      game_time_tv: { status: "stub", used: false, source: "legacy", message: "Not wired." },
    },
    promoted: {
      game_time_tv: {
        resolution: "available",
        used: true,
        kind: "verified",
        source: "espn_scoreboard",
        statement: "Kickoff and opponent were verified from the public scoreboard.",
      },
      matchup_dvp: {
        resolution: "insufficient_context",
        used: false,
        kind: "inference",
        source: "nflverse_data",
        statement: "Opponent context is missing.",
        reason_code: "opponent_context_missing",
      },
    },
  }).capabilities;
  const byName = Object.fromEntries(result.map((entry) => [entry.name, entry]));

  assert.deepEqual(
    { state: byName.game_time_tv.state, used: byName.game_time_tv.used, kind: byName.game_time_tv.kind },
    { state: "live", used: true, kind: "verified" },
  );
  assert.deepEqual(
    { state: byName.matchup_dvp.state, used: byName.matchup_dvp.used, kind: byName.matchup_dvp.kind, reason: byName.matchup_dvp.reason_code },
    { state: "unavailable", used: false, kind: "inference", reason: "opponent_context_missing" },
  );
});

test("source-specific capability fields survive the shared binding without reviving unavailable state", () => {
  const [capability] = buildDecisionCapabilities({
    promoted: {
      league_exact_scoring: {
        state: "unavailable",
        used: false,
        kind: "limitation",
        source: "league_scoring_contract",
        statement: "Rules are readable but the final result is not reconciled.",
        reason_code: "coverage_supported",
        coverage_state: "supported",
        reconciliation_state: "pending",
      },
    },
  }).capabilities;

  assert.deepEqual(capability, {
    name: "league_exact_scoring",
    state: "unavailable",
    used: false,
    kind: "limitation",
    source: "league_scoring_contract",
    statement: "Rules are readable but the final result is not reconciled.",
    observed_at: null,
    fresh_until: null,
    reason_code: "coverage_supported",
    coverage_state: "supported",
    reconciliation_state: "pending",
  });
});
