"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

const { buildStartSitDetail, STATES } = require("../src/services/startSitDetail");

function player(name, position, projected, status = null, slot = null) {
  return {
    player_key: `p-${name.replace(/\s+/g, "-")}`,
    name,
    position,
    selected_position: slot || position,
    eligible_positions: [position],
    projected_points: projected,
    status,
  };
}

const ROSTER = {
  week: 7,
  team_name: "Justin Titans",
  slots: {
    starters: [player("Chris Olave", "WR", 11.0), player("Star RB", "RB", 20.0)],
    bench: [player("DeVonta Smith", "WR", 15.2), player("Bench RB", "RB", 4.0)],
  },
};

// --- Pure engine ------------------------------------------------------------

test("buildStartSitDetail answers with the recommendation first, in league context", () => {
  const result = buildStartSitDetail({
    roster: ROSTER, platform: "sleeper", leagueId: "L1",
    leagueName: "Dynasty Dogs", teamName: "Justin Titans",
    week: 7, season: 2026, scoringFormat: "0.5 PPR",
  });

  assert.equal(result.contract_version, "start-sit-detail.v1");
  assert.equal(result.state, STATES.CLEAR);
  assert.equal(result.recommendation.start.name, "DeVonta Smith");
  assert.equal(result.recommendation.over.name, "Chris Olave");
  assert.equal(result.recommendation.confidence, "high");
  assert.equal(result.league_name, "Dynasty Dogs");
  assert.equal(result.team_name, "Justin Titans");
  assert.equal(result.scoring_format, "0.5 PPR");
  assert.ok(result.why.length >= 1);
});

test("evidence separates the league fact, the projection, and Omen's inference", () => {
  const result = buildStartSitDetail({
    roster: ROSTER, platform: "sleeper", leagueId: "L1", scoringFormat: "0.5 PPR",
  });
  const byCategory = Object.fromEntries(result.evidence.map((e) => [e.category, e]));

  assert.equal(byCategory.league_fact.statement, "This league awards 0.5 PPR.");
  assert.equal(byCategory.league_fact.kind, "verified");
  assert.equal(byCategory.player_game_fact.kind, "projection");
  assert.equal(byCategory.omen_inference.kind, "inference");
  // The inference is never merged into the fact rows.
  assert.equal(byCategory.league_fact.kind === byCategory.omen_inference.kind, false);
});

test("an unverified scoring format is named as a limitation instead of assumed to be PPR", () => {
  const result = buildStartSitDetail({ roster: ROSTER, platform: "espn", leagueId: "1", scoringFormat: null });
  const limitation = result.evidence.find((e) => e.category === "limitation");

  assert.equal(result.scoring_format, null);
  assert.ok(limitation);
  assert.match(limitation.statement, /has not verified this league's scoring rules/);
  assert.equal(JSON.stringify(result).includes("PPR"), false);
});

test("a decision inside projection noise is reported as close, not as a confident call", () => {
  const roster = {
    week: 7,
    slots: {
      starters: [player("Chris Olave", "WR", 11.0)],
      bench: [player("DeVonta Smith", "WR", 11.8)],
    },
  };
  const result = buildStartSitDetail({ roster, platform: "sleeper", leagueId: "L1" });

  assert.equal(result.state, STATES.CLOSE);
  assert.equal(result.recommendation.confidence, "low");
  assert.ok(result.what_could_change_this.some((c) => /within a point and a half/.test(c)));
});

test("an unavailable starter outranks a larger projection upgrade in another slot", () => {
  const roster = {
    week: 7,
    slots: {
      starters: [player("Hurt WR", "WR", 14.0, "OUT"), player("Fine RB", "RB", 9.0)],
      bench: [player("Backup WR", "WR", 6.0), player("Great RB", "RB", 19.0)],
    },
  };
  const result = buildStartSitDetail({ roster, platform: "sleeper", leagueId: "L1" });

  assert.equal(result.state, STATES.PLAYER_UNAVAILABLE);
  assert.equal(result.recommendation.over.name, "Hurt WR");
  assert.equal(result.recommendation.start.name, "Backup WR");
  assert.ok(result.why.some((w) => /unavailable/.test(w)));
});

test("a questionable player surfaces as a current_status fact and a change condition", () => {
  const roster = {
    week: 7,
    slots: {
      starters: [player("Chris Olave", "WR", 11.0, "Q")],
      bench: [player("DeVonta Smith", "WR", 15.2)],
    },
  };
  const result = buildStartSitDetail({ roster, platform: "sleeper", leagueId: "L1" });

  assert.ok(result.evidence.some((e) => e.category === "current_status" && /questionable|q/i.test(e.statement)));
  assert.ok(result.what_could_change_this.some((c) => /final injury status/.test(c)));
});

test("a lineup that is already optimal returns no_decision rather than a forced swap", () => {
  const roster = {
    week: 7,
    slots: {
      starters: [player("Chris Olave", "WR", 18.0)],
      bench: [player("DeVonta Smith", "WR", 4.0)],
    },
  };
  const result = buildStartSitDetail({ roster, platform: "sleeper", leagueId: "L1" });

  assert.equal(result.state, STATES.NO_DECISION);
  assert.equal(result.recommendation, null);
});

test("an empty bench is incomplete_data, and off-season is off_season", () => {
  const empty = buildStartSitDetail({
    roster: { week: 7, slots: { starters: [player("A", "WR", 1)], bench: [] } },
    platform: "sleeper", leagueId: "L1",
  });
  const off = buildStartSitDetail({ roster: ROSTER, platform: "sleeper", leagueId: "L1", offSeason: true });

  assert.equal(empty.state, STATES.INCOMPLETE_DATA);
  assert.equal(off.state, STATES.OFF_SEASON);
  assert.equal(off.recommendation, null);
});

test("a requested slot with no eligible bench option says so instead of falling back to another slot", () => {
  const result = buildStartSitDetail({ roster: ROSTER, platform: "sleeper", leagueId: "L1", slot: "TE" });

  assert.equal(result.state, STATES.NO_DECISION);
  assert.match(result.message, /eligible for that slot/);
});

// --- Route, per provider ----------------------------------------------------

function fakeSupabase(rows) {
  return {
    from() {
      return {
        select() {
          const q = { eq: () => q, then: (r, j) => Promise.resolve({ data: rows, error: null }).then(r, j) };
          return q;
        },
      };
    },
  };
}

function loadRouter(options = {}) {
  const routePath = require.resolve("../src/routes/startSitDetail");
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
          // The six user-facing gates now call suppressLiveFootballData(). Mirroring the
          // same flag keeps these cases testing the suppressed path, which is what
          // OMEN_WEEK1_PREVIEW=false restores in production.
          suppressLiveFootballData: () => options.offSeason || false,
        };
      }
      if (request === "../services/yahooAuth") {
        return {
          getAuthenticatedYahooClient: options.getAuthenticatedYahooClient
            || (async () => ({ client: { getLeagueMetadata: async () => ({ league_name: "Work League" }) } })),
        };
      }
      if (request === "../services/espnAuth") {
        return {
          getAuthenticatedEspnCredentials: options.getAuthenticatedEspnCredentials
            || (async () => ({ espn_s2: "ESPNCOOKIESECRET", swid: "{SWIDSECRET}" })),
        };
      }
      if (request === "../services/roster") {
        return options.rosterSvc || { fetchAndNormalizeRoster: async () => ROSTER, normalizeYahooWaivers: () => [] };
      }
      if (request === "../adapters/sleeper") return options.sleeperAdapter || {};
      if (request === "../adapters/espn") return options.espnAdapter || {};
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/startSitDetail");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options) {
  const app = express();
  app.use(express.json());
  app.use("/api/start-sit", loadRouter(options));
  app.use("/api/start-sit", require("../src/routes/startSit"));
  app.use((err, _req, res, _next) => { res.status(err.status || 500).json({ error: err.message }); });
  return app;
}

async function request(app, path = "/api/start-sit/detail") {
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
  token_expires_at: new Date(Date.now() + 3600_000).toISOString(),
};

test("Sleeper: detail is built from the Sleeper adapter and names the league's real scoring rule", async () => {
  const app = buildApp({
    connections: [SLEEPER_CONN],
    sleeperAdapter: {
      fetchSleeperLeague: async () => ({ name: "Dynasty Dogs", scoring_settings: { rec: 0.5 } }),
      buildNormalizedRoster: async (id, username, week) => {
        assert.deepEqual([id, username, week], ["L1", "justin", 7]);
        return ROSTER;
      },
    },
  });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  assert.equal(body.platform, "sleeper");
  assert.equal(body.league_name, "Dynasty Dogs");
  assert.equal(body.scoring_format, "0.5 PPR");
  assert.equal(body.recommendation.start.name, "DeVonta Smith");
});

test("Sleeper: an already-optimal lineup returns 200 no_decision, not an error", async () => {
  const app = buildApp({
    connections: [SLEEPER_CONN],
    sleeperAdapter: {
      fetchSleeperLeague: async () => ({}),
      buildNormalizedRoster: async () => ({
        week: 7, slots: { starters: [player("A", "WR", 20)], bench: [player("B", "WR", 2)] },
      }),
    },
  });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  assert.equal(body.state, "no_decision");
});

test("ESPN: detail is built from the ESPN adapter and leaks no cookie value", async () => {
  const app = buildApp({
    connections: [ESPN_CONN],
    espnAdapter: {
      buildNormalizedRoster: async (id, _s2, _swid, week, opts) => {
        assert.deepEqual([id, week, opts.teamId], ["12345", 7, "9"]);
        return ROSTER;
      },
    },
  });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  assert.equal(body.platform, "espn");
  assert.equal(body.recommendation.start.name, "DeVonta Smith");
  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes("ESPNCOOKIESECRET"), false);
  assert.equal(serialized.includes("SWIDSECRET"), false);
});

test("ESPN: a rejected cookie returns a reconnect envelope with no credential fragment", async () => {
  const app = buildApp({
    connections: [ESPN_CONN],
    getAuthenticatedEspnCredentials: async () => {
      throw Object.assign(new Error("espn_s2=ESPNCOOKIESECRET rejected"), { status: 401 });
    },
  });
  const { status, body } = await request(app);

  assert.equal(status, 401);
  assert.equal(body.contract_version, "start-sit-detail-error.v1");
  assert.equal(body.code, "espn_reconnect_required");
  assert.equal(JSON.stringify(body).includes("ESPNCOOKIESECRET"), false);
});

test("Yahoo: detail is built from the normalized Yahoo roster and its league metadata", async () => {
  const app = buildApp({ connections: [YAHOO_CONN] });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  assert.equal(body.platform, "yahoo");
  assert.equal(body.league_name, "Work League");
  // Yahoo scoring settings are a separate entitled call; null, not guessed.
  assert.equal(body.scoring_format, null);
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

test("a provider outage is a retryable 502, not a fabricated recommendation", async () => {
  const app = buildApp({
    connections: [SLEEPER_CONN],
    sleeperAdapter: {
      fetchSleeperLeague: async () => ({}),
      buildNormalizedRoster: async () => { throw new Error("sleeper 503"); },
    },
  });
  const { status, body } = await request(app);

  assert.equal(status, 502);
  assert.equal(body.code, "provider_unavailable");
  assert.equal(body.action, "retry");
});

test("no usable league returns a connect envelope", async () => {
  const app = buildApp({ connections: [] });
  const { status, body } = await request(app);

  assert.equal(status, 404);
  assert.equal(body.code, "no_usable_league");
});

test("an out-of-range week is rejected before any provider call", async () => {
  const app = buildApp({ connections: [SLEEPER_CONN], sleeperAdapter: {} });
  const { status, body } = await request(app, "/api/start-sit/detail?week=0");

  assert.equal(status, 400);
  assert.equal(body.code, "invalid_week");
});

test("the existing stateless POST /api/start-sit comparator is unchanged", async () => {
  const app = buildApp({ connections: [] });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/start-sit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playerA: { name: "A", position: "WR", projected_points: 10 },
        playerB: { name: "B", position: "WR", projected_points: 14 },
      }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.winner, "B");
    assert.equal(body.recommendation, "Start B over A");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
