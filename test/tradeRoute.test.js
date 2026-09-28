"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const tradeRoutes = require("../src/routes/trade");

async function resolveAsGiven(players) {
  return players.map((player, index) => ({
    status: "resolved",
    player: {
      id: player.player_key || `test:${index}:${player.name}`,
      name: player.name,
      position: player.position || "UNK",
      team: player.team || "FA",
      projected_points: player.projected_points ?? null,
    },
  }));
}

function buildApp(router = tradeRoutes.createTradeRouter({ playerResolver: resolveAsGiven })) {
  const app = express();
  app.use(express.json());
  app.use("/api/trade", router);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function get(app, path) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: res.status, body: await res.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function request(app, { body, headers = {} } = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/trade/compare`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("POST /api/trade/compare requires send array", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: { receive: [{ name: "B", position: "WR" }] },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "send must be a non-empty array");
});

test("POST /api/trade/compare rejects an invalid canonical league season", async () => {
  const res = await request(buildApp(), {
    body: {
      send: [{ name: "Ja'Marr Chase" }],
      receive: [{ name: "CeeDee Lamb" }],
      league_context: { platform: "sleeper", league_id: "league-1", season: "not-a-year" },
    },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "league_context.season must be a valid calendar year");
});

test("Trade reports a three-team ceiling and never silently drops or invents a fourth team", async () => {
  const app = buildApp();
  const capabilities = await get(app, "/api/trade/capabilities");
  assert.equal(capabilities.body.max_teams, 3);
  assert.equal(capabilities.body.three_team.supported, true);
  for (const platform of ["espn", "yahoo", "sleeper"]) {
    const res = await request(app, { body: {
      send: [{ name: "A" }], receive: [{ name: "B" }],
      teams: [{ id: 1 }, { id: 2 }, { id: 3 }], league_context: { platform },
    } });
    assert.equal(res.status, 422);
    assert.equal(res.body.error, "multi_team_trade_unsupported");
  }
});

// --- T1: three-team trade capability (omen-trade-rework-v1.md) ---------------------------------

test("POST /api/trade/compare evaluates a three-team ring trade with every participant scored separately", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: {
      legs: [
        { from: "you", to: "team_b", to_name: "Davante's Inferno", players: [{ name: "Jonathan Taylor", position: "RB", projected_points: 18 }] },
        { from: "team_b", to: "team_c", from_name: "Davante's Inferno", to_name: "Chubb Rock", players: [{ name: "Ja'Marr Chase", position: "WR", projected_points: 20 }] },
        { from: "team_c", to: "you", from_name: "Chubb Rock", players: [{ name: "Tyjae Spears", position: "RB", projected_points: 12 }] },
      ],
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "trade-compare.v2");
  assert.equal(res.body.trade_shape, "three_team");
  assert.equal(res.body.team_count, 3);
  assert.equal(res.body.participants.length, 3);

  const byId = Object.fromEntries(res.body.participants.map((p) => [p.team_id, p]));
  assert.ok(byId.you);
  assert.ok(byId.team_b);
  assert.ok(byId.team_c);

  // "You" sent Taylor (18) and received Spears (12) — never blended with the other two legs.
  assert.equal(byId.you.sends.players.length, 1);
  assert.equal(byId.you.sends.players[0].name, "Jonathan Taylor");
  assert.equal(byId.you.receives.players[0].name, "Tyjae Spears");
  assert.ok(["favors_you", "you_give_up_too_much", "close_needs_context", "insufficient_data"]
    .includes(byId.you.verdict_state));
  assert.ok(["likely", "unlikely", "uncertain"].includes(byId.you.acceptance_likelihood));
  assert.equal(byId.team_b.team_name, "Davante's Inferno");
  assert.equal(byId.team_c.team_name, "Chubb Rock");

  assert.equal(res.body.evaluability.status, "evaluable");
  assert.equal(res.body.submission.mode, "split_handoff");
  assert.equal(res.body.submission.steps.length, 3);
  assert.match(res.body.submission.steps[0], /Jonathan Taylor/);
  assert.match(res.body.submission.steps[1], /contingent on leg 1/);
});

test("POST /api/trade/compare never collapses a three-team request into a two-team result", async () => {
  const app = buildApp();
  // Two legs that only ever touch two teams — not a real three-team trade, even though the
  // payload superficially looks like one (two `legs` entries).
  const res = await request(app, {
    body: {
      legs: [
        { from: "you", to: "team_b", players: [{ name: "Jonathan Taylor", position: "RB", projected_points: 18 }] },
        { from: "team_b", to: "you", players: [{ name: "Ja'Marr Chase", position: "WR", projected_points: 20 }] },
      ],
    },
  });

  assert.equal(res.status, 422);
  assert.equal(res.body.error, "three_team_shape_required");
});

test("POST /api/trade/compare never silently expands past three teams", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: {
      legs: [
        { from: "you", to: "team_b", players: [{ name: "Jonathan Taylor", position: "RB", projected_points: 18 }] },
        { from: "team_b", to: "team_c", players: [{ name: "Ja'Marr Chase", position: "WR", projected_points: 20 }] },
        { from: "team_c", to: "team_d", players: [{ name: "Tyjae Spears", position: "RB", projected_points: 12 }] },
        { from: "team_d", to: "you", players: [{ name: "Some Player", position: "TE", projected_points: 8 }] },
      ],
    },
  });

  assert.equal(res.status, 422);
  assert.equal(res.body.error, "multi_team_trade_unsupported");
  assert.equal(res.body.max_teams, 3);
});

test("POST /api/trade/compare three-team trade honors missing projections as insufficient_data, per participant and overall", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: {
      legs: [
        { from: "you", to: "team_b", players: [{ name: "Jonathan Taylor", position: "RB", projected_points: 18 }] },
        { from: "team_b", to: "team_c", players: [{ name: "Ja'Marr Chase", position: "WR" }] }, // no projection
        { from: "team_c", to: "you", players: [{ name: "Tyjae Spears", position: "RB", projected_points: 12 }] },
      ],
    },
  });

  assert.equal(res.status, 200);
  // Overall: the trade as a whole has a leg with no projection, so it cannot receive a
  // wholesale verdict.
  assert.equal(res.body.evaluability.status, "insufficient_data");
  assert.equal(res.body.evaluability.reason, "missing_projections");

  const byId = Object.fromEntries(res.body.participants.map((p) => [p.team_id, p]));
  // The two participants touching the unprojected leg (team_b sends it, team_c receives it)
  // are honestly non-evaluable...
  assert.equal(byId.team_b.evaluability.status, "insufficient_data");
  assert.equal(byId.team_b.verdict_state, "insufficient_data");
  assert.equal(byId.team_c.evaluability.status, "insufficient_data");
  assert.equal(byId.team_c.verdict_state, "insufficient_data");
  // ...but "you" never touched that leg at all, and every participant is evaluated
  // separately — a missing projection two legs away must not blend into "your" own,
  // fully-projected verdict.
  assert.equal(byId.you.evaluability.status, "evaluable");
  assert.notEqual(byId.you.verdict_state, "insufficient_data");
});

test("POST /api/trade/compare rejects a three-team payload with fewer than two legs", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: {
      legs: [
        { from: "you", to: "team_b", players: [{ name: "Jonathan Taylor", position: "RB", projected_points: 18 }] },
      ],
    },
  });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /at least 2 transfers/);
});

test("POST /api/trade/compare surfaces unresolved players in a three-team leg without scoring anything", async () => {
  const router = tradeRoutes.createTradeRouter({
    playerResolver: async (players) => players.map((player) => (
      player.name === "Zzzqx Notaplayer"
        ? { status: "unresolved", input: player, suggestions: [] }
        : {
          status: "resolved",
          player: { id: `test:${player.name}`, name: player.name, position: player.position || "UNK", team: "FA", projected_points: player.projected_points ?? null },
        }
    )),
  });
  const app = buildApp(router);
  const res = await request(app, {
    body: {
      legs: [
        { from: "you", to: "team_b", players: [{ name: "Zzzqx Notaplayer", position: "RB" }] },
        { from: "team_b", to: "team_c", players: [{ name: "Ja'Marr Chase", position: "WR", projected_points: 20 }] },
        { from: "team_c", to: "you", players: [{ name: "Tyjae Spears", position: "RB", projected_points: 12 }] },
      ],
    },
  });

  assert.equal(res.status, 422);
  assert.equal(res.body.code, "trade_unresolved_players");
  assert.equal(res.body.unresolved[0].name, "Zzzqx Notaplayer");
  assert.equal("participants" in res.body, false);
});

test("POST /api/trade/compare two-team payloads are unaffected by the three-team engine", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: {
      send: [{ name: "Bench RB", position: "RB", projected_points: 10 }],
      receive: [{ name: "Starter WR", position: "WR", projected_points: 14 }],
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.net_value, 2.5);
  assert.equal(res.body.verdict, "accept");
  assert.equal("trade_shape" in res.body, false);
  assert.equal("participants" in res.body, false);
});

test("GET /api/trade/pulse is explicitly unavailable without live ADP", async () => {
  const router = tradeRoutes.createTradeRouter({ tradePulseRedisClient: null });
  const res = await get(buildApp(router), "/api/trade/pulse");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "unavailable");
  assert.equal(res.body.is_mock, false);
  assert.deepEqual(res.body.buy_low, []);
  assert.deepEqual(res.body.sell_high, []);
});

test("GET /api/trade/pulse maps live weighted ADP into source-labeled targets", async () => {
  const router = tradeRoutes.createTradeRouter({
    tradePulseRedisClient: {},
    tradePulseBuilder: async () => ({
      weighted_players: [{ name: "Value Receiver", position: "WR", team: "DET", adp: 44.2 }],
    }),
  });
  const res = await get(buildApp(router), "/api/trade/pulse");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "live");
  assert.equal(res.body.is_mock, false);
  assert.equal(res.body.source_status, "live_adp");
  assert.deepEqual(res.body.buy_low, [{
    name: "Value Receiver", position: "WR", team: "DET",
    reason: "Consensus ADP supports a value review before your league prices it in.",
  }]);
});

test("POST /api/trade/compare requires receive array", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: { send: [{ name: "A", position: "RB" }] },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "receive must be a non-empty array");
});

test("POST /api/trade/compare rejects non-array send", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: { send: "A", receive: [{ name: "B", position: "WR" }] },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "send must be a non-empty array");
});

test("POST /api/trade/compare caps send at 10 players", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: {
      send: Array.from({ length: 11 }, (_, i) => ({ name: `A${i}`, position: "RB" })),
      receive: [{ name: "B", position: "WR" }],
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "send may contain 1-10 players");
});

test("POST /api/trade/compare returns public comparison for valid one-for-one payload", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: {
      send: [{ name: "Bench RB", position: "RB", projected_points: 10 }],
      receive: [{ name: "Starter WR", position: "WR", projected_points: 14 }],
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.net_value, 2.5); // recalibrated 2026-05-13
  assert.equal(res.body.verdict, "accept");
});

test("POST /api/trade/compare handles missing projections with low confidence", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: {
      send: [{ name: "Known WR", position: "WR", projected_points: 12 }],
      receive: [{ name: "Unknown RB", position: "RB" }],
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.confidence, "low");
});

test("POST /api/trade/compare refuses unknown players before scoring or the LLM", async () => {
  let explainCalls = 0;
  const router = tradeRoutes.createTradeRouter({
    playerResolver: async (players) => players.map((player) => (
      player.name === "Patrick Mahomes"
        ? {
          status: "resolved",
          player: {
            id: "sleeper:4046",
            name: "Patrick Mahomes",
            position: "QB",
            team: "KC",
            projected_points: null,
          },
        }
        : { status: "unresolved", input: player, suggestions: [] }
    )),
    tradeExplainer: async () => {
      explainCalls += 1;
      return "must not run";
    },
  });
  const res = await request(buildApp(router), {
    body: {
      send: [{ name: "Zzzqx Notaplayer", position: "RB" }],
      receive: [{ name: "Patrick Mahomes", position: "QB" }],
    },
  });

  assert.equal(res.status, 422);
  assert.equal(res.body.code, "trade_unresolved_players");
  assert.equal(res.body.unresolved[0].name, "Zzzqx Notaplayer");
  assert.equal(res.body.unresolved[0].side, "send");
  assert.equal(explainCalls, 0);
  assert.equal("verdict" in res.body, false);
  assert.equal("scarcity_analysis" in res.body, false);
  assert.equal("summary" in res.body, false);
  assert.equal("explanation" in res.body, false);
});

test("POST /api/trade/compare returns near matches without silently resolving them", async () => {
  const suggestion = {
    id: "sleeper:12527",
    name: "Jaxson Dart",
    position: "QB",
    team: "NYG",
    projected_points: null,
    match_type: "fuzzy",
  };
  const router = tradeRoutes.createTradeRouter({
    playerResolver: async (players) => players.map((player) => (
      player.name === "Jackson Dart"
        ? { status: "unresolved", input: player, suggestions: [suggestion] }
        : {
          status: "resolved",
          player: {
            id: "sleeper:4046",
            name: "Patrick Mahomes",
            position: "QB",
            team: "KC",
            projected_points: null,
          },
        }
    )),
  });
  const res = await request(buildApp(router), {
    body: {
      send: [{ name: "Jackson Dart", position: "QB" }],
      receive: [{ name: "Patrick Mahomes", position: "QB" }],
    },
  });

  assert.equal(res.status, 422);
  assert.deepEqual(res.body.unresolved[0].suggestions, [suggestion]);
});

test("POST /api/trade/compare scores canonical identity, not client-supplied identity fields", async () => {
  let resolutionCall = 0;
  const router = tradeRoutes.createTradeRouter({
    playerResolver: async (players) => {
      const sendSide = resolutionCall === 0;
      resolutionCall += 1;
      return players.map(() => ({
        status: "resolved",
        player: {
          id: sendSide ? "sleeper:6794" : "sleeper:4046",
          name: sendSide ? "Justin Jefferson" : "Patrick Mahomes",
          position: sendSide ? "WR" : "QB",
          team: sendSide ? "MIN" : "KC",
          projected_points: null,
        },
      }));
    },
    tradeExplainer: async ({ send, receive }) => `${send[0].name} for ${receive[0].name}`,
  });
  const res = await request(buildApp(router), {
    body: {
      send: [{ name: "fake display", position: "RB", projected_points: 12 }],
      receive: [{ name: "also fake", position: "TE", projected_points: 14 }],
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.send.players[0].name, "Justin Jefferson");
  assert.equal(res.body.send.players[0].position, "WR");
  assert.equal(res.body.receive.players[0].name, "Patrick Mahomes");
  assert.equal(res.body.explanation, "Justin Jefferson for Patrick Mahomes");
});
