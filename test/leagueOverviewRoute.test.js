"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

/**
 * `GET /api/league/overview` -> `league-overview.v1`.
 *
 * Steps 1-2 of `m1-league-screen-data-plan-v1.md` §4. The central property under test is that
 * sections fail INDEPENDENTLY: a dead matchup read must return standings anyway. That is what
 * keeps one provider hiccup from blanking the whole League destination.
 */

class FakeQuery {
  constructor(rows) {
    this.rows = rows;
    this.filters = [];
  }

  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }

  then(resolve, reject) {
    const data = this.rows.filter((row) =>
      this.filters.every(({ field, value }) => row[field] === value)
    );
    return Promise.resolve({ data, error: null }).then(resolve, reject);
  }
}

const SLEEPER_STANDINGS = [
  { rank: 1, team_id: "3", team_name: "Top Dogs", is_current_user: false, wins: 7, losses: 1 },
  { rank: 2, team_id: "7", team_name: "Ravens Flock", is_current_user: true, wins: 6, losses: 2 },
  { rank: 3, team_id: "9", team_name: "Also Rans", is_current_user: false, wins: 2, losses: 6 },
];

function defaultSleeperAdapter(overrides = {}) {
  const real = require("../src/adapters/sleeper");
  return {
    fetchSleeperUser: async () => ({ user_id: "sleeper-user-1" }),
    fetchSleeperLeague: async () => ({ league_id: "league-1", name: "Sleeper League", season: "2026" }),
    fetchSleeperStandings: async () => SLEEPER_STANDINGS,
    fetchSleeperRoster: async () => ({ roster_id: 7 }),
    fetchSleeperMatchups: async () => ([
      { roster_id: 7, matchup_id: 2, points: 88.4 },
      { roster_id: 3, matchup_id: 2, points: 91.1 },
      { roster_id: 9, matchup_id: 1, points: 60.0 },
    ]),
    // The extractor itself is not mocked — the point is to exercise the real one.
    matchupFromMatchups: real.matchupFromMatchups,
    ...overrides,
  };
}

function defaultEspnAdapter(overrides = {}) {
  return {
    buildLeagueStandings: async () => ([
      { rank: 1, team_id: "9", team_name: "ESPN Team", is_current_user: true, wins: 5, losses: 3 },
    ]),
    fetchEspnMatchup: async () => ({
      status: "final",
      you: { team_id: "9", team_name: "ESPN Team", record: "5-3", points: 120.2, projected: null },
      opponent: { team_id: "4", team_name: "Rivals", record: "4-4", points: 99.8, projected: null },
      game_id: "g-1",
    }),
    ...overrides,
  };
}

function loadLeagueRouter(options = {}) {
  const routePath = require.resolve("../src/routes/league");
  delete require.cache[routePath];

  const rows = options.connections || [];
  const fakeSupabase = {
    from() {
      return { select() { return new FakeQuery(rows); } };
    },
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (parent?.filename === routePath) {
      if (request === "@supabase/supabase-js") return { createClient: () => fakeSupabase };
      if (request === "../middleware/auth") {
        return {
          requireAuth: options.requireAuth || ((req, _res, next) => {
            req.user = { id: "user-1" };
            next();
          }),
        };
      }
      if (request === "../middleware/logging") {
        return { logger: { error() {}, warn() {}, info() {} } };
      }
      if (request === "../services/nflSchedule") {
        return {
          getCurrentNflWeekContext: () => options.context || { season: 2026, week: 8, season_type: "regular" },
          isOffSeason: () => options.offSeason || false,
          suppressLiveFootballData: () => options.offSeason || false,
        };
      }
      if (request === "../services/yahooAuth") {
        return { getAuthenticatedYahooClient: async () => ({ client: options.yahooClient }) };
      }
      if (request === "../services/espnAuth") {
        return { getAuthenticatedEspnCredentials: async () => ({ espn_s2: "c", swid: "{s}" }) };
      }
      if (request === "../adapters/sleeper") return options.sleeperAdapter || defaultSleeperAdapter();
      if (request === "../adapters/espn") return options.espnAdapter || defaultEspnAdapter();
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/league");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options = {}) {
  const app = express();
  app.use(express.json());
  app.use("/api/league", loadLeagueRouter(options));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  return app;
}

async function request(app, path, headers = { authorization: "Bearer valid-token" }) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
    return { status: res.status, body: await res.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const SLEEPER_CONNECTION = {
  user_id: "user-1",
  platform: "sleeper",
  is_active: true,
  league_id: "league-1",
  platform_user_id: "sleeper-user-1",
};

const ESPN_CONNECTION = {
  user_id: "user-1",
  platform: "espn",
  is_active: true,
  league_id: "espn-1",
  espn_secret_id: "a",
  swid_secret_id: "b",
  espn_team_id: "9",
};

test("GET /api/league/overview returns a real matchup built from data that was being discarded", async () => {
  const app = buildApp({ connections: [SLEEPER_CONNECTION] });

  const res = await request(app, "/api/league/overview");

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "league-overview.v1");
  assert.equal(res.body.league_name, "Sleeper League");

  // Both sides, both point totals, and the opponent's name — none of which survived
  // `normalizeLastResult()`, which reduced this same payload to one "W"/"L" letter.
  assert.equal(res.body.matchup.status, "live");
  assert.equal(res.body.matchup.you.team_name, "Ravens Flock");
  assert.equal(res.body.matchup.you.record, "6-2");
  assert.equal(res.body.matchup.you.points, 88.4);
  assert.equal(res.body.matchup.opponent.team_name, "Top Dogs");
  assert.equal(res.body.matchup.opponent.points, 91.1);
});

test("GET /api/league/overview reports standings position without inventing a cut line", async () => {
  const app = buildApp({ connections: [SLEEPER_CONNECTION] });

  const res = await request(app, "/api/league/overview");

  assert.equal(res.body.standings.status, "available");
  assert.equal(res.body.standings.teams.length, 3);
  assert.equal(res.body.standings.playoff_picture.rank, 2);
  assert.equal(res.body.standings.playoff_picture.team_count, 3);
  assert.equal(res.body.standings.playoff_picture.line, "2nd of 3");
  // No provider path reads playoff settings yet, so the cut line must stay absent and
  // `settings_known` must say so rather than the client having to guess.
  assert.equal(res.body.standings.playoff_picture.cut_line_note, null);
  assert.equal(res.body.standings.playoff_picture.settings_known, false);
});

test("GET /api/league/overview keeps the transactions slot open for the waiver work", async () => {
  const app = buildApp({ connections: [SLEEPER_CONNECTION] });

  const res = await request(app, "/api/league/overview");

  // v1 ships no activity signals. The shape step 4 will fill already exists, so waivers land
  // without a contract change: `status` is explicit and the missing family is NAMED.
  assert.equal(res.body.activity.status, "empty");
  assert.deepEqual(res.body.activity.unavailable_families, ["transactions"]);
  assert.deepEqual(res.body.activity.items, []);
});

test("a dead matchup read still returns standings — sections fail independently", async () => {
  const app = buildApp({
    connections: [SLEEPER_CONNECTION],
    sleeperAdapter: defaultSleeperAdapter({
      fetchSleeperMatchups: async () => { throw new Error("provider exploded"); },
    }),
  });

  const res = await request(app, "/api/league/overview");

  assert.equal(res.status, 200);
  assert.equal(res.body.matchup.status, "unavailable");
  assert.equal(res.body.matchup.unavailable_reason, "provider_failed");
  // The whole point: one dead section must not blank the destination.
  assert.equal(res.body.standings.status, "available");
  assert.equal(res.body.standings.teams.length, 3);
});

test("a bye week is reported as no_matchup, not as a provider failure", async () => {
  const app = buildApp({
    connections: [SLEEPER_CONNECTION],
    sleeperAdapter: defaultSleeperAdapter({
      fetchSleeperMatchups: async () => ([{ roster_id: 7, matchup_id: 2, points: 0 }]),
    }),
  });

  const res = await request(app, "/api/league/overview");

  assert.equal(res.body.matchup.status, "no_matchup");
  assert.equal(res.body.matchup.you, null);
});

test("ESPN overview reads its own matchup path", async () => {
  const app = buildApp({ connections: [ESPN_CONNECTION] });

  const res = await request(app, "/api/league/overview");

  assert.equal(res.status, 200);
  assert.equal(res.body.platform, "espn");
  assert.equal(res.body.matchup.status, "final");
  assert.equal(res.body.matchup.opponent.team_name, "Rivals");
});

test("the off-season gate returns explicit section states, never fabricated ones", async () => {
  const app = buildApp({ connections: [SLEEPER_CONNECTION], offSeason: true });

  const res = await request(app, "/api/league/overview");

  assert.equal(res.status, 200);
  assert.equal(res.body.matchup.status, "unavailable");
  assert.equal(res.body.matchup.unavailable_reason, "off_season");
  assert.equal(res.body.standings.status, "off_season");
  assert.deepEqual(res.body.standings.teams, []);
});

test("GET /api/league/overview reuses the standings error contract verbatim", async () => {
  const app = buildApp({ connections: [] });

  const res = await request(app, "/api/league/overview");

  assert.equal(res.status, 404);
  assert.equal(res.body.contract_version, "league-standings-error.v1");
  assert.equal(res.body.code, "league_not_connected");
});

test("GET /api/league/overview rejects an unsupported platform", async () => {
  const app = buildApp();

  const res = await request(app, "/api/league/overview?platform=manual");

  assert.equal(res.status, 400);
  assert.equal(res.body.code, "invalid_platform");
});

test("GET /api/league/overview requires auth", async () => {
  const app = buildApp({
    requireAuth: (_req, res) => res.status(401).json({ error: "Missing bearer token" }),
  });

  const res = await request(app, "/api/league/overview", {});

  assert.equal(res.status, 401);
});

test("GET /api/league/standings is unchanged by the additive overview route", async () => {
  const app = buildApp({ connections: [SLEEPER_CONNECTION] });

  const res = await request(app, "/api/league/standings");

  assert.equal(res.status, 200);
  // The Command Center context strip consumes this contract and must not be disturbed.
  assert.equal(res.body.contract_version, "league-standings.v1");
  assert.equal(res.body.standings.length, 3);
});
