"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

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

function defaultYahooClient() {
  return {
    getLeagueMetadata: async () => ({
      league_name: "Yahoo League",
      season: 2026,
      week: 8,
    }),
    getMyTeamKey: async () => "449.l.1.t.7",
    getLeagueStandings: async () => ([{
      rank: 1,
      team_id: "449.l.1.t.7",
      team_name: "Yahoo Team",
      is_current_user: true,
      wins: 6,
      losses: 2,
      points_for: 1111.1,
      points_against: 999.9,
    }]),
  };
}

function defaultSleeperAdapter() {
  return {
    fetchSleeperUser: async () => ({ user_id: "sleeper-user-1" }),
    fetchSleeperLeague: async () => ({
      league_id: "league-1",
      name: "Sleeper League",
      season: "2026",
    }),
    fetchSleeperStandings: async () => ([{
      rank: 1,
      team_id: "7",
      team_name: "Ravens Flock",
      is_current_user: true,
      wins: 6,
      losses: 2,
      points_for: 1142.4,
      points_against: 980.6,
    }]),
  };
}

function defaultEspnAdapter() {
  return {
    buildLeagueStandings: async () => ([{
      rank: 1,
      team_id: "9",
      team_name: "ESPN Team",
      is_current_user: true,
      wins: 5,
      losses: 3,
      points_for: 1001.2,
      points_against: 944.6,
    }]),
  };
}

function loadLeagueRouter(options = {}) {
  const routePath = require.resolve("../src/routes/league");
  delete require.cache[routePath];

  const rows = options.connections || [];
  const fakeSupabase = {
    from(table) {
      assert.equal(table, "platform_connections");
      return {
        select() {
          return new FakeQuery(rows);
        },
      };
    },
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === routePath) {
      return { createClient: () => fakeSupabase };
    }
    if (request === "../middleware/auth" && parent?.filename === routePath) {
      return {
        requireAuth: options.requireAuth || ((req, _res, next) => {
          req.user = { id: "user-1" };
          next();
        }),
      };
    }
    if (request === "../middleware/logging" && parent?.filename === routePath) {
      return { logger: { error() {}, warn() {}, info() {} } };
    }
    if (request === "../services/nflSchedule" && parent?.filename === routePath) {
      return {
        getCurrentNflWeekContext: () => options.context || {
          season: 2026,
          week: 8,
          season_type: "regular",
        },
        isOffSeason: () => options.offSeason || false,
        // The six user-facing gates now call suppressLiveFootballData(). Mirroring the
        // same flag keeps these cases testing the suppressed path, which is what
        // OMEN_WEEK1_PREVIEW=false restores in production.
        suppressLiveFootballData: () => options.offSeason || false,
      };
    }
    if (request === "../services/yahooAuth" && parent?.filename === routePath) {
      return {
        getAuthenticatedYahooClient: options.getAuthenticatedYahooClient || (async () => ({
          client: options.yahooClient || defaultYahooClient(),
        })),
      };
    }
    if (request === "../services/espnAuth" && parent?.filename === routePath) {
      return {
        getAuthenticatedEspnCredentials: options.getAuthenticatedEspnCredentials || (async () => ({
          espn_s2: "espn-cookie-secret",
          swid: "{swid-secret}",
        })),
      };
    }
    if (request === "../adapters/sleeper" && parent?.filename === routePath) {
      return options.sleeperAdapter || defaultSleeperAdapter();
    }
    if (request === "../adapters/espn" && parent?.filename === routePath) {
      return options.espnAdapter || defaultEspnAdapter();
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
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function request(app, path, headers = { authorization: "Bearer valid-token" }) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/league/standings rejects missing auth", async () => {
  const app = buildApp({
    requireAuth: (_req, res) => res.status(401).json({ error: "Missing bearer token" }),
  });

  const res = await request(app, "/api/league/standings", {});

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Missing bearer token");
});

test("GET /api/league/standings rejects invalid platform", async () => {
  const app = buildApp();

  const res = await request(app, "/api/league/standings?platform=manual");

  assert.equal(res.status, 400);
  assert.equal(res.body.contract_version, "league-standings-error.v1");
  assert.equal(res.body.code, "invalid_platform");
  assert.equal(res.body.message, "League standings only supports Yahoo, Sleeper, or ESPN.");
  assert.equal(res.body.action, "choose_supported_platform");
});

test("GET /api/league/standings returns 404 when no connected league exists", async () => {
  const app = buildApp({ connections: [] });

  const res = await request(app, "/api/league/standings");

  assert.equal(res.status, 404);
  assert.equal(res.body.contract_version, "league-standings-error.v1");
  assert.equal(res.body.code, "league_not_connected");
  assert.equal(res.body.message, "Connect a Yahoo, Sleeper, or ESPN league before viewing standings.");
  assert.equal(res.body.action, "connect_league");
});

test("GET /api/league/standings returns Sleeper standings", async () => {
  const app = buildApp({
    connections: [{
      user_id: "user-1",
      platform: "sleeper",
      is_active: true,
      league_id: "league-1",
      platform_username: "sleepy",
      platform_user_id: "sleeper-user-1",
    }],
  });

  const res = await request(app, "/api/league/standings?platform=sleeper&leagueId=league-1");

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "league-standings.v1");
  assert.equal(res.body.platform, "sleeper");
  assert.equal(res.body.league_id, "league-1");
  assert.equal(res.body.league_name, "Sleeper League");
  assert.deepEqual(res.body.standings[0], {
    rank: 1,
    team_id: "7",
    team_name: "Ravens Flock",
    is_current_user: true,
    wins: 6,
    losses: 2,
    points_for: 1142.4,
    points_against: 980.6,
  });
});

test("GET /api/league/standings returns empty success during off-season before provider calls", async () => {
  let providerTouched = false;
  const app = buildApp({
    offSeason: true,
    connections: [{
      user_id: "user-1",
      platform: "sleeper",
      is_active: true,
      league_id: "league-1",
      platform_username: "sleepy",
      platform_user_id: "sleeper-user-1",
    }],
    sleeperAdapter: {
      fetchSleeperUser: async () => {
        providerTouched = true;
        throw new Error("provider should not be touched during off-season");
      },
      fetchSleeperLeague: async () => {
        providerTouched = true;
        throw new Error("provider should not be touched during off-season");
      },
      fetchSleeperStandings: async () => {
        providerTouched = true;
        throw new Error("provider should not be touched during off-season");
      },
    },
  });

  const res = await request(app, "/api/league/standings?platform=sleeper&leagueId=league-1");

  assert.equal(res.status, 200);
  assert.equal(providerTouched, false);
  assert.equal(res.body.contract_version, "league-standings.v1");
  assert.equal(res.body.platform, "sleeper");
  assert.equal(res.body.league_id, "league-1");
  assert.equal(res.body.league_name, null);
  assert.equal(res.body.season, 2026);
  assert.equal(res.body.week, 8);
  assert.deepEqual(res.body.standings, []);
});

test("GET /api/league/standings returns Yahoo standings", async () => {
  const app = buildApp({
    connections: [{
      user_id: "user-1",
      platform: "yahoo",
      is_active: true,
      league_id: "449.l.1",
      token_secret_id: "vault-yahoo-access",
    }],
  });

  const res = await request(app, "/api/league/standings?platform=yahoo");

  assert.equal(res.status, 200);
  assert.equal(res.body.platform, "yahoo");
  assert.equal(res.body.league_name, "Yahoo League");
  assert.equal(res.body.week, 8);
  assert.equal(res.body.standings[0].team_name, "Yahoo Team");
  assert.equal(res.body.standings[0].is_current_user, true);
});

test("GET /api/league/standings returns ESPN standings without leaking cookies", async () => {
  const app = buildApp({
    connections: [{
      user_id: "user-1",
      platform: "espn",
      is_active: true,
      league_id: "12345",
      espn_secret_id: "vault-espn-s2",
      swid_secret_id: "vault-swid",
      espn_team_id: "9",
    }],
  });

  const res = await request(app, "/api/league/standings?platform=espn");
  const serialized = JSON.stringify(res.body);

  assert.equal(res.status, 200);
  assert.equal(res.body.platform, "espn");
  assert.equal(res.body.standings[0].team_id, "9");
  assert.equal(serialized.includes("espn-cookie-secret"), false);
  assert.equal(serialized.includes("swid-secret"), false);
  assert.equal(serialized.includes("vault-espn-s2"), false);
  assert.equal(serialized.includes("vault-swid"), false);
});

test("GET /api/league/standings returns reconnect error for ESPN auth failures", async () => {
  const app = buildApp({
    connections: [{
      user_id: "user-1",
      platform: "espn",
      is_active: true,
      league_id: "12345",
      espn_secret_id: "vault-espn-s2",
      swid_secret_id: "vault-swid",
    }],
    getAuthenticatedEspnCredentials: async () => {
      throw Object.assign(new Error("ESPN credentials unavailable"), { status: 401 });
    },
  });

  const res = await request(app, "/api/league/standings?platform=espn");

  assert.equal(res.status, 401);
  assert.equal(res.body.contract_version, "league-standings-error.v1");
  assert.equal(res.body.code, "espn_reconnect_required");
  assert.equal(res.body.message, "Omen needs a fresh connection before it can load these standings.");
  assert.equal(res.body.action, "reconnect_platform");
});

test("GET /api/league/standings returns safe provider failure", async () => {
  const app = buildApp({
    connections: [{
      user_id: "user-1",
      platform: "sleeper",
      is_active: true,
      league_id: "league-1",
      platform_username: "sleepy",
    }],
    sleeperAdapter: {
      fetchSleeperUser: async () => ({ user_id: "sleeper-user-1" }),
      fetchSleeperLeague: async () => {
        throw new Error("Sleeper upstream exploded with noisy raw body");
      },
      fetchSleeperStandings: async () => [],
    },
  });

  const res = await request(app, "/api/league/standings?platform=sleeper");

  assert.equal(res.status, 502);
  assert.equal(res.body.contract_version, "league-standings-error.v1");
  assert.equal(res.body.code, "league_standings_provider_failed");
  assert.equal(res.body.platform, "sleeper");
  assert.equal(res.body.message, "Omen could not load standings from the league provider right now.");
  assert.equal(res.body.action, "retry_later");
});
