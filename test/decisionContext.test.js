"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { DECISION_CONTEXT_VERSION, attachDecisionReceipt, createDecisionContext } = require("../src/services/decisionContext");

test("decision context de-duplicates a source inside one request while resolving independent sources", async () => {
  let rosterCalls = 0;
  let projectionCalls = 0;
  const context = createDecisionContext({
    profile: "omen_mvp",
    now: () => "2026-09-17T15:00:00.000Z",
    loaders: {
      roster: async () => { rosterCalls += 1; return { state: "live", source: "sleeper_roster", value: { private: true } }; },
      projections: async () => { projectionCalls += 1; return { state: "live", source: "sleeper_projection", value: [12.2] }; },
    },
  });
  await Promise.all([context.resolve("roster"), context.resolve("roster"), context.resolveMany(["roster", "projections"])]);
  assert.equal(rosterCalls, 1);
  assert.equal(projectionCalls, 1);
  assert.deepEqual(context.value("roster"), { private: true });
});

test("receipt distinguishes resolved from used and never serializes private input values", async () => {
  const context = createDecisionContext({
    profile: "omen_mvp",
    loaders: {
      roster: async () => ({ state: "live", source: "espn_roster", value: { cookie: "must-not-leak" } }),
      projections: async () => ({ state: "live", source: "espn_projection", value: { player_id: "must-not-leak" } }),
      matchup_dvp: async () => ({ state: "live", source: "nflverse_data", value: { row: "must-not-leak" } }),
    },
  });
  await context.resolveMany(["roster", "projections", "matchup_dvp"]);
  assert.equal(context.use("roster"), true);
  assert.equal(context.use("projections"), true);
  assert.equal(context.use("missing"), false);
  const response = attachDecisionReceipt({ recommendation: {} }, context);
  assert.equal(response.decision_context.contract_version, DECISION_CONTEXT_VERSION);
  assert.deepEqual(response.decision_context.inputs_used, ["projections", "roster"]);
  assert.equal(response.decision_context.inputs.matchup_dvp.used, false);
  assert.equal(JSON.stringify(response).includes("must-not-leak"), false);
});

test("source failure becomes a typed limitation instead of rejecting the feature request", async () => {
  const context = createDecisionContext({ profile: "trade", loaders: { trade_rosters: async () => { throw new Error("upstream unavailable"); } } });
  const [record] = await context.resolveMany(["trade_rosters"]);
  assert.equal(record.state, "unavailable");
  const receipt = context.receipt();
  assert.deepEqual(receipt.limitations.find((entry) => entry.name === "trade_rosters"), { name: "trade_rosters", state: "unavailable", reason_code: "source_failed" });
  assert.equal(receipt.inputs.roster.reason_code, "not_requested");
});

test("candidate builders can record a consumed provider result without exposing its value", () => {
  const context = createDecisionContext({ profile: "waiver", now: () => "2026-09-17T16:00:00.000Z" });
  context.record("waivers", { state: "live", source: "espn_available_players", value: { raw: "must-not-leak" } });
  assert.equal(context.use("waivers"), true);
  const receipt = context.receipt();
  assert.equal(receipt.inputs.waivers.state, "live");
  assert.equal(receipt.inputs.waivers.used, true);
  assert.equal(JSON.stringify(receipt).includes("must-not-leak"), false);
});

test("unknown profiles and non-live inputs cannot become used evidence", async () => {
  assert.throws(() => createDecisionContext({ profile: "everything" }), /known profile/);
  const context = createDecisionContext({ profile: "waiver", loaders: { waivers: async () => ({ state: "pending", source: "provider_pool" }) } });
  await context.resolve("waivers");
  assert.equal(context.use("waivers"), false);
  assert.equal(context.receipt().inputs.waivers.used, false);
});
