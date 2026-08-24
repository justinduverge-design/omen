"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");

const tradeRoutes = require("../src/routes/trade");
const { compareTrade } = require("../src/services/tradeValue");
const {
  parseRosterSlots,
  effectiveStarters,
  baselineForPosition,
  rosterDepth,
  needWeightForPosition,
  buildTradeScoringConfig,
  selectContextConnection,
  sleeperScoringFormat,
  resolveTradeLeagueContext,
  MAX_DEMAND_ADJUSTMENT,
} = require("../src/services/tradeLeagueContext");

/* ---------------------------------------------------------------- *
 * Fixtures
 * ---------------------------------------------------------------- */

// A conventional 12-team league: 2 RB, 2 WR, 1 FLEX.
const SLOTS_STANDARD = [
  "QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF",
  "BN", "BN", "BN", "BN", "BN", "BN",
];
// The same league except it starts a third WR. This is the only difference.
const SLOTS_WR_HEAVY = [
  "QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "K", "DEF",
  "BN", "BN", "BN", "BN", "BN",
];

// Deep at RB (4 bodies for ~2.4 slots), thin at WR.
const ROSTER_RB_DEEP = [
  { position: "QB", selected_position: "QB" },
  { position: "RB", selected_position: "RB" },
  { position: "RB", selected_position: "RB" },
  { position: "RB", selected_position: "BN" },
  { position: "RB", selected_position: "BN" },
  { position: "WR", selected_position: "WR" },
  { position: "WR", selected_position: "WR" },
  { position: "TE", selected_position: "TE" },
];

function buildApp(router) {
  const app = express();
  app.use(express.json());
  app.use("/api/trade", router);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function compare(router, body, headers = {}) {
  const server = http.createServer(buildApp(router));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/trade/compare`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

/** A router whose personalization always resolves to the given league shape. */
function routerForLeague(slots, { roster = ROSTER_RB_DEEP, format = "ppr", teamCount = 12 } = {}) {
  const built = buildTradeScoringConfig({
    scoringFormat: format,
    rosterPositions: slots,
    teamCount,
    rosterPlayers: roster,
  });
  return tradeRoutes.createTradeRouter({
    authenticate: async () => ({ id: "user-1" }),
    leagueContextResolver: async () => ({
      status: "personalized",
      platform: "sleeper",
      league_id: "123",
      league_name: "Dynasty Dogs",
      ...built,
    }),
  });
}

const NEUTRAL_ROUTER = tradeRoutes.createTradeRouter({
  authenticate: async () => { throw new Error("no token"); },
  leagueContextResolver: async () => ({ status: "unavailable", reason: "no_connected_league" }),
});

/* ---------------------------------------------------------------- *
 * 1. The league maths, with no network anywhere near it
 * ---------------------------------------------------------------- */

test("parseRosterSlots separates starters, flex, and bench", () => {
  const shape = parseRosterSlots(SLOTS_WR_HEAVY);
  assert.deepEqual(shape.starters, { QB: 1, RB: 2, WR: 3, TE: 1, K: 1, DST: 1 });
  assert.equal(shape.flex, 1);
  assert.equal(shape.superFlex, 0);
  assert.equal(shape.bench, 5);
});

test("parseRosterSlots ignores unknown slot names rather than guessing", () => {
  const shape = parseRosterSlots(["QB", "RB", "MYSTERY_SLOT", "WR"]);
  assert.deepEqual(shape.starters, { QB: 1, RB: 1, WR: 1 });
});

test("effectiveStarters spends flex proportionally on the positions that fill it", () => {
  const effective = effectiveStarters(parseRosterSlots(SLOTS_WR_HEAVY));
  // 3 WR of the 6 flex-eligible direct starters take the larger share.
  assert.ok(effective.WR > effective.RB, "a 3WR league should demand more WR than RB");
  assert.equal(Math.round((effective.WR + effective.RB + effective.TE) * 100) / 100, 7);
});

test("super-flex demand lands on QB", () => {
  const effective = effectiveStarters(parseRosterSlots(["QB", "SUPER_FLEX", "RB", "WR"]));
  assert.equal(effective.QB, 2);
});

test("a league that starts more WRs has a LOWER WR replacement baseline", () => {
  const shared = { scoringFormat: "ppr", teamCount: 12 };
  const standard = baselineForPosition("WR", {
    ...shared, effective: effectiveStarters(parseRosterSlots(SLOTS_STANDARD)),
  });
  const wrHeavy = baselineForPosition("WR", {
    ...shared, effective: effectiveStarters(parseRosterSlots(SLOTS_WR_HEAVY)),
  });
  // Deeper demand drains the pool, so the best free WR is worse and every
  // rostered WR is worth more.
  assert.ok(wrHeavy < standard, `expected ${wrHeavy} < ${standard}`);
});

test("baseline adjustment is bounded by MAX_DEMAND_ADJUSTMENT", () => {
  const absurd = baselineForPosition("WR", {
    scoringFormat: "ppr",
    effective: { WR: 40 },
    teamCount: 12,
  });
  // ppr WR base is 8.
  assert.ok(absurd >= 8 * (1 - MAX_DEMAND_ADJUSTMENT) - 0.01, `${absurd} fell through the clamp`);
});

test("rosterDepth counts startable bodies and excludes IR and taxi", () => {
  const depth = rosterDepth([
    { position: "RB", selected_position: "RB" },
    { position: "RB", selected_position: "BN" },
    { position: "RB", selected_position: "IR" },
    { position: "WR", selected_position: "TAXI" },
  ]);
  assert.equal(depth.RB, 2);
  assert.equal(depth.WR, undefined);
});

test("positional surplus lowers the weight and a hole raises it", () => {
  const effective = { RB: 2, WR: 2 };
  const deepAtRb = needWeightForPosition("RB", { depth: { RB: 5 }, effective });
  const thinAtWr = needWeightForPosition("WR", { depth: { WR: 1 }, effective });
  assert.ok(deepAtRb < 1, `surplus should discount, got ${deepAtRb}`);
  assert.ok(thinAtWr > 1, `a hole should premium, got ${thinAtWr}`);
});

test("buildTradeScoringConfig emits rows in the shape the engine already consumes", () => {
  const { scoringConfig, applied } = buildTradeScoringConfig({
    scoringFormat: "half_ppr",
    rosterPositions: SLOTS_STANDARD,
    teamCount: 10,
    rosterPlayers: ROSTER_RB_DEEP,
  });
  assert.equal(scoringConfig.scoring_format, "half_ppr");
  for (const row of scoringConfig.league_scarcity_weights) {
    assert.ok(Number.isFinite(row.baseline_points), `${row.position} baseline`);
    assert.ok(row.scarcity_weight >= 0 && row.scarcity_weight <= 10, `${row.position} weight in engine range`);
  }
  assert.deepEqual(applied.sort(), ["league_size", "roster_construction", "roster_depth", "scoring_format"]);
});

/* ---------------------------------------------------------------- *
 * 2. Personalized is demonstrably different — shown, not asserted
 * ---------------------------------------------------------------- */

test("the same offer gets a different verdict in a WR-heavy league than neutrally", async () => {
  const offer = {
    send: [{ name: "RB A", position: "RB", projected_points: 13 }],
    receive: [{ name: "WR B", position: "WR", projected_points: 14 }],
  };

  const neutral = await compare(NEUTRAL_ROUTER, offer);
  const personalized = await compare(routerForLeague(SLOTS_WR_HEAVY), {
    ...offer,
    league_context: { platform: "sleeper", league_id: "123" },
  });

  assert.equal(neutral.body.analysis_context.mode, "neutral");
  assert.equal(personalized.body.analysis_context.mode, "personalized");

  // The whole point of the feature: the answer changes.
  assert.notEqual(neutral.body.verdict_state, personalized.body.verdict_state);
  assert.equal(neutral.body.verdict_state, "close_needs_context");
  assert.equal(personalized.body.verdict_state, "favors_you");
  assert.ok(
    personalized.body.net_value > neutral.body.net_value,
    `expected ${personalized.body.net_value} > ${neutral.body.net_value}`
  );
});

test("two different league shapes give two different answers for one offer", async () => {
  const offer = {
    send: [{ name: "RB A", position: "RB", projected_points: 13 }],
    receive: [{ name: "WR B", position: "WR", projected_points: 14 }],
    league_context: { platform: "sleeper", league_id: "123" },
  };

  const standard = await compare(routerForLeague(SLOTS_STANDARD), offer);
  const wrHeavy = await compare(routerForLeague(SLOTS_WR_HEAVY), offer);

  // Both are "personalized", so any difference is the league itself and not
  // the mode flag. This is what separates real context from a label.
  assert.equal(standard.body.analysis_context.mode, "personalized");
  assert.equal(wrHeavy.body.analysis_context.mode, "personalized");
  assert.notEqual(standard.body.net_value, wrHeavy.body.net_value);
});

test("roster depth alone changes the answer when league shape is identical", () => {
  const offer = {
    send: [{ name: "WR A", position: "WR", projected_points: 13 }],
    receive: [{ name: "RB B", position: "RB", projected_points: 13 }],
  };
  const deepAtRb = buildTradeScoringConfig({
    rosterPositions: SLOTS_STANDARD, rosterPlayers: ROSTER_RB_DEEP,
  }).scoringConfig;
  const thinAtRb = buildTradeScoringConfig({
    rosterPositions: SLOTS_STANDARD,
    rosterPlayers: [
      { position: "RB", selected_position: "RB" },
      { position: "WR", selected_position: "WR" },
      { position: "WR", selected_position: "WR" },
      { position: "WR", selected_position: "BN" },
      { position: "WR", selected_position: "BN" },
    ],
  }).scoringConfig;

  const a = compareTrade(offer, { scoringFormat: "ppr" }, deepAtRb);
  const b = compareTrade(offer, { scoringFormat: "ppr" }, thinAtRb);
  assert.notEqual(a.combined_score, b.combined_score);
});

test("a personalized run uses the provider's scoring format, not the client's label", async () => {
  const router = routerForLeague(SLOTS_STANDARD, { format: "standard" });
  const res = await compare(router, {
    send: [{ name: "RB A", position: "RB", projected_points: 12 }],
    receive: [{ name: "WR B", position: "WR", projected_points: 12 }],
    scoring_format: "ppr", // deliberately contradicts the league
    league_context: { platform: "sleeper" },
  });
  assert.equal(res.body.scoring_format, "standard");
});

test("analysis_context names what was actually applied", async () => {
  const res = await compare(routerForLeague(SLOTS_WR_HEAVY), {
    send: [{ name: "RB A", position: "RB", projected_points: 12 }],
    receive: [{ name: "WR B", position: "WR", projected_points: 13 }],
    league_context: { platform: "sleeper" },
  });
  const context = res.body.analysis_context;
  assert.equal(context.platform, "sleeper");
  assert.equal(context.league_name, "Dynasty Dogs");
  assert.ok(context.applied.includes("roster_construction"));
  assert.ok(context.applied.includes("roster_depth"));
  assert.equal(context.unavailable_reason, null);
});

/* ---------------------------------------------------------------- *
 * 3. All four approved verdict states have server semantics
 * ---------------------------------------------------------------- */

test("verdict state 1 of 4 — favors_you", async () => {
  const res = await compare(NEUTRAL_ROUTER, {
    send: [{ name: "Bench RB", position: "RB", projected_points: 10 }],
    receive: [{ name: "Starter WR", position: "WR", projected_points: 14 }],
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.verdict_state, "favors_you");
  assert.equal(res.body.verdict, "accept"); // v1 field unchanged
  assert.equal(res.body.evaluability.status, "evaluable");
});

test("verdict state 2 of 4 — you_give_up_too_much", async () => {
  const res = await compare(NEUTRAL_ROUTER, {
    send: [{ name: "Starter WR", position: "WR", projected_points: 14 }],
    receive: [{ name: "Bench RB", position: "RB", projected_points: 10 }],
  });
  assert.equal(res.body.verdict_state, "you_give_up_too_much");
  assert.equal(res.body.verdict, "decline");
});

test("verdict state 3 of 4 — close_needs_context", async () => {
  const res = await compare(NEUTRAL_ROUTER, {
    send: [{ name: "RB A", position: "RB", projected_points: 13 }],
    receive: [{ name: "WR B", position: "WR", projected_points: 14 }],
  });
  assert.equal(res.body.verdict_state, "close_needs_context");
  assert.equal(res.body.verdict, "neutral");
});

test("verdict state 4 of 4 — insufficient_data when a projection is missing", async () => {
  const res = await compare(NEUTRAL_ROUTER, {
    send: [{ name: "Known WR", position: "WR", projected_points: 12 }],
    receive: [{ name: "Unknown RB", position: "RB" }],
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.verdict_state, "insufficient_data");
  assert.equal(res.body.evaluability.status, "insufficient_data");
  assert.equal(res.body.evaluability.reason, "missing_projections");
  assert.equal(res.body.evaluability.missing_projection_count, 1);
  assert.equal(res.body.evaluability.total_player_count, 2);
});

test("insufficient_data does not force a verdict but leaves the v1 field intact", async () => {
  const res = await compare(NEUTRAL_ROUTER, {
    send: [{ name: "Known WR", position: "WR", projected_points: 12 }],
    receive: [{ name: "Unknown RB", position: "RB" }],
  });
  // v1 consumers keep their existing field and existing behaviour; only
  // verdict_state carries the fourth label.
  assert.ok(["accept", "decline", "neutral"].includes(res.body.verdict));
  assert.equal(res.body.verdict_state, "insufficient_data");
});

test("insufficient_data survives personalization — real context cannot invent a projection", async () => {
  const res = await compare(routerForLeague(SLOTS_WR_HEAVY), {
    send: [{ name: "Known WR", position: "WR", projected_points: 12 }],
    receive: [{ name: "Unknown RB", position: "RB" }],
    league_context: { platform: "sleeper" },
  });
  assert.equal(res.body.analysis_context.mode, "personalized");
  assert.equal(res.body.verdict_state, "insufficient_data");
});

test("every response carries the additive contract version", async () => {
  const res = await compare(NEUTRAL_ROUTER, {
    send: [{ name: "RB A", position: "RB", projected_points: 10 }],
    receive: [{ name: "WR B", position: "WR", projected_points: 12 }],
  });
  assert.equal(res.body.contract_version, "trade-compare.v2");
});

/* ---------------------------------------------------------------- *
 * 4. Honest fallback: personalization never silently pretends
 * ---------------------------------------------------------------- */

test("no league_context means neutral, with nothing applied", async () => {
  const res = await compare(NEUTRAL_ROUTER, {
    send: [{ name: "RB A", position: "RB", projected_points: 10 }],
    receive: [{ name: "WR B", position: "WR", projected_points: 12 }],
  });
  assert.equal(res.body.analysis_context.mode, "neutral");
  assert.deepEqual(res.body.analysis_context.applied, []);
  assert.equal(res.body.analysis_context.unavailable_reason, null);
});

test("asking to personalize without a session degrades to neutral, not a 401", async () => {
  const res = await compare(NEUTRAL_ROUTER, {
    send: [{ name: "RB A", position: "RB", projected_points: 10 }],
    receive: [{ name: "WR B", position: "WR", projected_points: 12 }],
    league_context: { platform: "sleeper" },
  });
  // Trade stays free and public.
  assert.equal(res.status, 200);
  assert.equal(res.body.analysis_context.mode, "neutral");
  assert.equal(res.body.analysis_context.unavailable_reason, "unauthenticated");
});

test("an unresolvable league says so and retains neutral analysis", async () => {
  const router = tradeRoutes.createTradeRouter({
    authenticate: async () => ({ id: "user-1" }),
    leagueContextResolver: async () => ({ status: "unavailable", reason: "no_connected_league" }),
  });
  const res = await compare(router, {
    send: [{ name: "RB A", position: "RB", projected_points: 10 }],
    receive: [{ name: "WR B", position: "WR", projected_points: 12 }],
    league_context: {},
  });
  assert.equal(res.body.analysis_context.mode, "neutral");
  assert.equal(res.body.analysis_context.unavailable_reason, "no_connected_league");
});

test("league_context validation rejects an unknown platform", async () => {
  const res = await compare(NEUTRAL_ROUTER, {
    send: [{ name: "RB A", position: "RB", projected_points: 10 }],
    receive: [{ name: "WR B", position: "WR", projected_points: 12 }],
    league_context: { platform: "draftkings" },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /league_context\.platform/);
});

test("league_context must be an object", async () => {
  const res = await compare(NEUTRAL_ROUTER, {
    send: [{ name: "RB A", position: "RB", projected_points: 10 }],
    receive: [{ name: "WR B", position: "WR", projected_points: 12 }],
    league_context: "sleeper",
  });
  assert.equal(res.status, 400);
});

/* ---------------------------------------------------------------- *
 * 5. Connection selection and provider truth
 * ---------------------------------------------------------------- */

test("Yahoo is never offered as a personalization source while its API is refused", () => {
  const chosen = selectContextConnection([
    { platform: "yahoo", is_active: true, league_id: "y1", token_secret_id: "s1" },
  ]);
  assert.equal(chosen, null);
});

test("Sleeper is preferred because it needs no credential", () => {
  const chosen = selectContextConnection([
    { platform: "espn", is_active: true, league_id: "e1", espn_secret_id: "a", swid_secret_id: "b" },
    { platform: "sleeper", is_active: true, league_id: "s1", platform_username: "justin" },
  ]);
  assert.equal(chosen.platform, "sleeper");
});

test("an inactive or league-less connection is not usable context", () => {
  assert.equal(selectContextConnection([
    { platform: "sleeper", is_active: false, league_id: "s1", platform_username: "j" },
  ]), null);
  assert.equal(selectContextConnection([
    { platform: "sleeper", is_active: true, league_id: null, platform_username: "j" },
  ]), null);
});

test("sleeperScoringFormat reads the provider's own rec setting", () => {
  assert.equal(sleeperScoringFormat({ scoring_settings: { rec: 0 } }), "standard");
  assert.equal(sleeperScoringFormat({ scoring_settings: { rec: 0.5 } }), "half_ppr");
  assert.equal(sleeperScoringFormat({ scoring_settings: { rec: 1 } }), "ppr");
});

test("ESPN is named unsupported rather than quietly personalized", async () => {
  const resolved = await resolveTradeLeagueContext({
    userId: "u1",
    deps: {
      getConnections: async () => ([
        { platform: "espn", is_active: true, league_id: "e1", espn_secret_id: "a", swid_secret_id: "b" },
      ]),
    },
  });
  assert.equal(resolved.status, "unavailable");
  assert.equal(resolved.reason, "provider_unsupported");
  assert.equal(resolved.platform, "espn");
});

test("a provider read failure falls back to neutral instead of throwing", async () => {
  const resolved = await resolveTradeLeagueContext({
    userId: "u1",
    deps: {
      getConnections: async () => ([
        { platform: "sleeper", is_active: true, league_id: "s1", platform_username: "justin" },
      ]),
      fetchSleeperLeague: async () => { throw new Error("sleeper down"); },
      buildSleeperRoster: async () => [],
    },
  });
  assert.equal(resolved.status, "unavailable");
  assert.equal(resolved.reason, "league_context_unavailable");
});

test("a healthy Sleeper league resolves to a personalized context", async () => {
  const resolved = await resolveTradeLeagueContext({
    userId: "u1",
    deps: {
      getConnections: async () => ([
        { platform: "sleeper", is_active: true, league_id: "s1", platform_username: "justin" },
      ]),
      fetchSleeperLeague: async () => ({
        name: "Dynasty Dogs",
        season: "2026",
        total_rosters: 12,
        roster_positions: SLOTS_WR_HEAVY,
        scoring_settings: { rec: 0.5 },
      }),
      buildSleeperRoster: async () => ROSTER_RB_DEEP,
    },
  });
  assert.equal(resolved.status, "personalized");
  assert.equal(resolved.league_name, "Dynasty Dogs");
  assert.equal(resolved.scoringConfig.scoring_format, "half_ppr");
  assert.ok(resolved.applied.includes("roster_construction"));
});
