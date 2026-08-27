"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

const { buildWaiverAnalysis, STATES } = require("../src/services/waiverAnalysis");

function starter(name, position, points, status = null) {
  return { player_key: `s-${name}`, name, position, eligible_positions: [position], projected_points: points, status };
}
function bench(name, position, points) {
  return { player_key: `b-${name}`, name, position, eligible_positions: [position], projected_points: points };
}
function free(name, position, points) {
  return { player_key: `f-${name}`, name, position, eligible_positions: [position], projected_points: points };
}

const ROSTER = {
  week: 7,
  slots: {
    starters: [starter("Weak RB", "RB", 5.0), starter("Strong WR", "WR", 18.0)],
    bench: [bench("Deep RB", "RB", 3.0), bench("Spare WR", "WR", 9.0)],
  },
};

// --- Pure engine ------------------------------------------------------------

test("buildWaiverAnalysis leads with the best move, its displaced starter, and a stated drop cost", () => {
  const result = buildWaiverAnalysis({
    roster: ROSTER,
    pool: [free("Tracy", "RB", 12.0), free("Filler", "RB", 6.0)],
    platform: "sleeper",
    leagueId: "L1",
    week: 7,
    season: 2026,
    scoringFormat: "half PPR",
    availabilityConfirmed: true,
  });

  assert.equal(result.contract_version, "waiver-analysis.v1");
  assert.equal(result.state, STATES.CONFIRMED);
  assert.equal(result.best_move.add.name, "Tracy");
  assert.equal(result.best_move.displaces.name, "Weak RB");
  assert.equal(result.best_move.improvement, 7);
  assert.equal(result.best_move.drop.name, "Deep RB");
  assert.match(result.cost.removes, /Deep RB/);
  assert.equal(result.cost.accepted_because.length, 2);
  assert.equal(result.alternatives.length, 1);
  assert.match(result.alternatives[0].tradeoff, /below the recommended add/);
});

test("an unavailable starter is solved before a larger pure upgrade elsewhere", () => {
  const roster = {
    week: 7,
    slots: {
      starters: [starter("Hurt RB", "RB", 14.0, "OUT"), starter("Okay WR", "WR", 9.0)],
      bench: [bench("Deep RB", "RB", 3.0)],
    },
  };
  const result = buildWaiverAnalysis({
    roster,
    pool: [free("Replacement RB", "RB", 8.0), free("Big WR", "WR", 20.0)],
    platform: "sleeper",
    leagueId: "L1",
    availabilityConfirmed: true,
  });

  assert.equal(result.best_move.add.name, "Replacement RB");
  assert.equal(result.best_move.solves_unavailable_starter, true);
  assert.equal(result.best_move.improvement, 8);
});

test("an unprojected free agent is never recommended", () => {
  const result = buildWaiverAnalysis({
    roster: ROSTER,
    pool: [{ player_key: "f-x", name: "Unknown", position: "RB", eligible_positions: ["RB"], projected_points: null }],
    platform: "yahoo",
    leagueId: "449.l.1",
    availabilityConfirmed: false,
  });

  assert.equal(result.best_move, null);
  assert.equal(result.state, STATES.AVAILABILITY_UNKNOWN);
});

test("a zero projection is treated as a real zero and an absent one is not", () => {
  const zero = buildWaiverAnalysis({
    roster: ROSTER,
    pool: [free("Zero RB", "RB", 0)],
    platform: "sleeper", leagueId: "L1", availabilityConfirmed: true,
  });
  const absent = buildWaiverAnalysis({
    roster: ROSTER,
    pool: [{ player_key: "f-n", name: "No Projection", position: "RB", eligible_positions: ["RB"], projected_points: null }],
    platform: "sleeper", leagueId: "L1", availabilityConfirmed: true,
  });

  // Zero is below the weak starter, so it is ranked and rejected on merit.
  assert.equal(zero.state, STATES.NO_CREDIBLE_MOVE);
  // Absent is not evidence, so it never enters the ranking at all.
  assert.equal(absent.state, STATES.NO_CREDIBLE_MOVE);
  assert.deepEqual(absent.alternatives, []);
});

test("no defensible low-cost drop is stated plainly instead of forcing one", () => {
  const result = buildWaiverAnalysis({
    roster: { week: 7, slots: { starters: [starter("Weak RB", "RB", 5.0)], bench: [] } },
    pool: [free("Tracy", "RB", 12.0)],
    platform: "sleeper", leagueId: "L1", availabilityConfirmed: true,
  });

  assert.equal(result.state, STATES.NO_LOW_COST_DROP);
  assert.equal(result.best_move.drop, null);
  assert.equal(result.cost, null);
  assert.match(result.message, /will not force a move/);
});

test("an unreadable pool is engine_limitation, and an empty pool is no_credible_move", () => {
  const unreadable = buildWaiverAnalysis({ roster: ROSTER, pool: null, platform: "espn", leagueId: "1", availabilityConfirmed: false });
  const empty = buildWaiverAnalysis({ roster: ROSTER, pool: [], platform: "espn", leagueId: "1", availabilityConfirmed: true });

  assert.equal(unreadable.state, STATES.ENGINE_LIMITATION);
  assert.equal(empty.state, STATES.NO_CREDIBLE_MOVE);
});

test("no FAAB amount, waiver priority, or claim probability is ever produced", () => {
  const result = buildWaiverAnalysis({
    roster: ROSTER, pool: [free("Tracy", "RB", 12.0)],
    platform: "sleeper", leagueId: "L1", availabilityConfirmed: true,
  });
  const serialized = JSON.stringify(result).toLowerCase();

  for (const forbidden of ["faab", "waiver_priority", "claim_probability", "claim_odds"]) {
    assert.equal(serialized.includes(forbidden), false, `${forbidden} must not appear`);
  }
});

test("a deadline is dropped unless availability was confirmed", () => {
  const unconfirmed = buildWaiverAnalysis({
    roster: ROSTER, pool: [], platform: "yahoo", leagueId: "1",
    availabilityConfirmed: false, deadline: "2026-10-15T07:00:00Z",
  });
  assert.equal(unconfirmed.deadline, null);
  assert.equal(unconfirmed.availability_state, "unconfirmed");
});

test("off-season returns the off_season state rather than weekly urgency", () => {
  const result = buildWaiverAnalysis({
    roster: ROSTER, pool: [free("Tracy", "RB", 12.0)],
    platform: "sleeper", leagueId: "L1", availabilityConfirmed: true, offSeason: true,
  });
  assert.equal(result.state, STATES.OFF_SEASON);
  assert.equal(result.best_move, null);
});

// --- Route, per provider ----------------------------------------------------

function fakeSupabase(rows) {
  return {
    from() {
      return {
        select() {
          const query = { eq: () => query, then: (r, j) => Promise.resolve({ data: rows, error: null }).then(r, j) };
          return query;
        },
      };
    },
  };
}

function loadRouter(options = {}) {
  const routePath = require.resolve("../src/routes/waivers");
  delete require.cache[routePath];

  const supabaseDouble = fakeSupabase(options.connections || []);
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (parent?.filename === routePath) {
      if (request === "@supabase/supabase-js") return { createClient: () => supabaseDouble };
      if (request === "../middleware/auth") {
        return { requireAuth: (req, _res, next) => { req.user = { id: "user-1" }; next(); } };
      }
      if (request === "../middleware/logging") return { logger: { error() {}, warn() {}, info() {} } };
      if (request === "../services/nflSchedule") {
        return {
          getCurrentNflWeekContext: () => ({ season: 2026, week: 7, season_type: "regular" }),
          isOffSeason: () => options.offSeason || false,
        };
      }
      if (request === "../services/yahooAuth") {
        return {
          getAuthenticatedYahooClient: options.getAuthenticatedYahooClient
            || (async () => ({ client: options.yahooClient || { getAvailablePlayers: async () => ({}) } })),
        };
      }
      if (request === "../services/espnAuth") {
        return {
          getAuthenticatedEspnCredentials: options.getAuthenticatedEspnCredentials
            || (async () => ({ espn_s2: "ESPNCOOKIESECRET", swid: "{SWIDSECRET}" })),
        };
      }
      if (request === "../services/roster") return options.rosterSvc || { fetchAndNormalizeRoster: async () => ROSTER, normalizeYahooWaivers: () => [] };
      if (request === "../adapters/sleeper") return options.sleeperAdapter || {};
      if (request === "../adapters/espn") return options.espnAdapter || {};
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/waivers");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options) {
  const app = express();
  app.use(express.json());
  app.use("/api/waivers", loadRouter(options));
  app.use((err, _req, res, _next) => { res.status(err.status || 500).json({ error: err.message }); });
  return app;
}

async function request(app, path = "/api/waivers/analysis") {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: { authorization: "Bearer valid-token" },
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const SLEEPER_CONN = { platform: "sleeper", is_active: true, league_id: "L1", platform_username: "justin" };
const ESPN_CONN = { platform: "espn", is_active: true, league_id: "12345", espn_secret_id: "v1", swid_secret_id: "v2", espn_team_id: "9" };
const YAHOO_CONN = {
  platform: "yahoo", is_active: true, league_id: "449.l.1", token_secret_id: "v3",
  // isOmenReadyConnection() treats an absent expiry as expired.
  token_expires_at: new Date(Date.now() + 3600_000).toISOString(),
};

test("Sleeper: analysis is built from the Sleeper adapter's own roster and available-player calls", async () => {
  const calls = [];
  const app = buildApp({
    connections: [SLEEPER_CONN],
    sleeperAdapter: {
      fetchSleeperLeague: async (id) => { calls.push(`league:${id}`); return { scoring_settings: { rec: 0.5 } }; },
      buildNormalizedRoster: async (id, username, week) => { calls.push(`roster:${id}:${username}:${week}`); return ROSTER; },
      fetchSleeperAvailablePlayers: async (id, week) => { calls.push(`pool:${id}:${week}`); return [free("Tracy", "RB", 12.0)]; },
    },
  });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  assert.equal(body.platform, "sleeper");
  assert.equal(body.state, "confirmed_opportunity");
  assert.equal(body.scoring_format, "half PPR");
  assert.equal(body.best_move.add.name, "Tracy");
  assert.deepEqual(calls, ["league:L1", "roster:L1:justin:7", "pool:L1:7"]);
});

test("Sleeper: an empty available-player list is an honest no_credible_move, not an error", async () => {
  const app = buildApp({
    connections: [SLEEPER_CONN],
    sleeperAdapter: {
      fetchSleeperLeague: async () => ({ scoring_settings: { rec: 1 } }),
      buildNormalizedRoster: async () => ROSTER,
      fetchSleeperAvailablePlayers: async () => [],
    },
  });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  assert.equal(body.state, "no_credible_move");
  assert.equal(body.best_move, null);
});

test("Sleeper: a pool failure degrades to engine_limitation while the roster still loads", async () => {
  const app = buildApp({
    connections: [SLEEPER_CONN],
    sleeperAdapter: {
      fetchSleeperLeague: async () => ({}),
      buildNormalizedRoster: async () => ROSTER,
      fetchSleeperAvailablePlayers: async () => { throw new Error("sleeper 503"); },
    },
  });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  assert.equal(body.state, "engine_limitation");
});

test("ESPN: analysis is built from fetchEspnWaiverPool, which the optimizer route never reached", async () => {
  const calls = [];
  const app = buildApp({
    connections: [ESPN_CONN],
    espnAdapter: {
      buildNormalizedRoster: async (id, _s2, _swid, week, opts) => { calls.push(`roster:${id}:${week}:${opts.teamId}`); return ROSTER; },
      fetchEspnWaiverPool: async (id, _s2, _swid, week) => { calls.push(`pool:${id}:${week}`); return [free("Tracy", "RB", 12.0)]; },
    },
  });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  assert.equal(body.platform, "espn");
  assert.equal(body.best_move.add.name, "Tracy");
  assert.deepEqual(calls, ["roster:12345:7:9", "pool:12345:7"]);
  // ESPN scoring rules are unverified, so the format is null rather than PPR.
  assert.equal(body.scoring_format, null);
});

test("ESPN: no cookie value appears anywhere in a successful response", async () => {
  const app = buildApp({
    connections: [ESPN_CONN],
    espnAdapter: {
      buildNormalizedRoster: async () => ROSTER,
      fetchEspnWaiverPool: async () => [free("Tracy", "RB", 12.0)],
    },
  });
  const { body } = await request(app);
  const serialized = JSON.stringify(body);

  assert.equal(serialized.includes("ESPNCOOKIESECRET"), false);
  assert.equal(serialized.includes("SWIDSECRET"), false);
});

test("ESPN: an expired cookie returns a reconnect envelope with no credential fragment", async () => {
  const app = buildApp({
    connections: [ESPN_CONN],
    getAuthenticatedEspnCredentials: async () => {
      throw Object.assign(new Error("espn_s2=ESPNCOOKIESECRET rejected"), { status: 401 });
    },
  });
  const { status, body } = await request(app);

  assert.equal(status, 401);
  assert.equal(body.contract_version, "waiver-analysis-error.v1");
  assert.equal(body.code, "espn_reconnect_required");
  assert.equal(JSON.stringify(body).includes("ESPNCOOKIESECRET"), false);
});

test("ESPN: an unreadable pool degrades to engine_limitation rather than a 500", async () => {
  const app = buildApp({
    connections: [ESPN_CONN],
    espnAdapter: {
      buildNormalizedRoster: async () => ROSTER,
      fetchEspnWaiverPool: async () => { throw new Error("espn 500"); },
    },
  });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  assert.equal(body.state, "engine_limitation");
});

test("Yahoo: the route reaches Yahoo but states plainly that its pool carries no projection", async () => {
  const app = buildApp({
    connections: [YAHOO_CONN],
    yahooClient: { getAvailablePlayers: async () => ({ raw: true }) },
    rosterSvc: {
      fetchAndNormalizeRoster: async () => ROSTER,
      normalizeYahooWaivers: () => ([{ player_key: "y1", name: "Yahoo FA", position: "RB", eligible_positions: ["RB"], projected_points: null }]),
    },
  });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  assert.equal(body.platform, "yahoo");
  assert.equal(body.best_move, null);
  assert.equal(body.availability_state, "unconfirmed");
  assert.equal(body.limitations.length, 1);
  assert.match(body.limitations[0], /no weekly projection/);
});

test("Yahoo: an expired token returns a reconnect envelope", async () => {
  const app = buildApp({
    connections: [YAHOO_CONN],
    getAuthenticatedYahooClient: async () => {
      throw Object.assign(new Error("yahoo_token_expired"), { status: 401 });
    },
  });
  const { status, body } = await request(app);

  assert.equal(status, 401);
  assert.equal(body.code, "yahoo_reconnect_required");
});

test("no usable league returns a connect envelope, not an empty analysis", async () => {
  const app = buildApp({ connections: [] });
  const { status, body } = await request(app);

  assert.equal(status, 404);
  assert.equal(body.code, "no_usable_league");
  assert.equal(body.action, "connect");
});

test("an out-of-range week is rejected before any provider call", async () => {
  const app = buildApp({ connections: [SLEEPER_CONN], sleeperAdapter: {} });
  const { status, body } = await request(app, "/api/waivers/analysis?week=25");

  assert.equal(status, 400);
  assert.equal(body.code, "invalid_week");
});

test("the selected connection wins over the deterministic platform order", async () => {
  const app = buildApp({
    connections: [SLEEPER_CONN, { ...ESPN_CONN, is_selected: true }],
    sleeperAdapter: {
      fetchSleeperLeague: async () => ({}),
      buildNormalizedRoster: async () => ROSTER,
      fetchSleeperAvailablePlayers: async () => [],
    },
    espnAdapter: {
      buildNormalizedRoster: async () => ROSTER,
      fetchEspnWaiverPool: async () => [free("Tracy", "RB", 12.0)],
    },
  });
  const { body } = await request(app);

  assert.equal(body.platform, "espn");
});

test("an expired Yahoo token is excluded from selection rather than silently used", async () => {
  const app = buildApp({
    connections: [{ ...YAHOO_CONN, token_expires_at: new Date(Date.now() - 3600_000).toISOString() }],
  });
  const { status, body } = await request(app);

  assert.equal(status, 404);
  assert.equal(body.code, "no_usable_league");
});
