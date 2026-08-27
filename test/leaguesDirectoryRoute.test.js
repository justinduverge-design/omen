"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

const CONNECTION_SELECT_WITH_SELECTION = /is_selected/;

/**
 * Minimal PostgREST double. `missingSelectionColumn` reproduces the production
 * schema as it stands today — no `is_selected` column — so the degraded path is
 * exercised as the default rather than as an afterthought.
 */
function fakeSupabase({ rows = [], missingSelectionColumn = true, updates = [], updateError = null } = {}) {
  return {
    from(table) {
      assert.equal(table, "platform_connections");
      return {
        select(columns) {
          const missing = missingSelectionColumn && CONNECTION_SELECT_WITH_SELECTION.test(columns);
          const query = {
            filters: {},
            eq(field, value) { query.filters[field] = value; return query; },
            neq() { return query; },
            then(resolve, reject) {
              if (missing) {
                return Promise.resolve({
                  data: null,
                  error: { code: "PGRST204", message: "Could not find the 'is_selected' column of 'platform_connections'" },
                }).then(resolve, reject);
              }
              return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
            },
          };
          return query;
        },
        update(patch) {
          const missing = missingSelectionColumn && Object.hasOwn(patch, "is_selected");
          const query = {
            filters: {},
            eq(field, value) { query.filters[field] = value; return query; },
            neq(field, value) { query.filters[`not_${field}`] = value; return query; },
            then(resolve, reject) {
              if (updateError) return Promise.resolve({ data: null, error: updateError }).then(resolve, reject);
              if (missing) {
                return Promise.resolve({
                  data: null,
                  error: { code: "PGRST204", message: "Could not find the 'is_selected' column of 'platform_connections'" },
                }).then(resolve, reject);
              }
              updates.push({ patch, filters: query.filters });
              return Promise.resolve({ data: null, error: null }).then(resolve, reject);
            },
          };
          return query;
        },
      };
    },
  };
}

function defaultSleeperAdapter(overrides = {}) {
  return {
    fetchSleeperUser: async () => ({ user_id: "sleeper-user-1" }),
    fetchSleeperLeagues: async () => ([
      { league_id: "L-zeta", name: "Zeta League", season: "2026", scoring_settings: { rec: 0.5 } },
      { league_id: "L-alpha", name: "Alpha League", season: "2026", scoring_settings: { rec: 0 } },
    ]),
    fetchSleeperRoster: async (leagueId) => ({
      roster_id: leagueId === "L-alpha" ? 3 : 7,
      users: [{ user_id: "sleeper-user-1", metadata: { team_name: `Team ${leagueId}` } }],
    }),
    ...overrides,
  };
}

function defaultEspnAdapter(overrides = {}) {
  return {
    verifyLeagueAccess: async () => ({ team_id: 9, team_name: "ESPN Team" }),
    ...overrides,
  };
}

function loadRouter(options = {}) {
  const routePath = require.resolve("../src/routes/leagues");
  delete require.cache[routePath];
  delete require.cache[require.resolve("../src/services/activeSelection")];

  const supabaseDouble = fakeSupabase(options.supabase || {});
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (parent?.filename === routePath) {
      if (request === "@supabase/supabase-js") return { createClient: () => supabaseDouble };
      if (request === "../middleware/auth") {
        return { requireAuth: options.requireAuth || ((req, _res, next) => { req.user = { id: "user-1" }; next(); }) };
      }
      if (request === "../middleware/logging") return { logger: { error() {}, warn() {}, info() {} } };
      if (request === "../services/nflSchedule") {
        return { getCurrentNflWeekContext: () => ({ season: 2026, week: 8, season_type: "regular" }) };
      }
      if (request === "../services/yahooAuth") {
        return {
          getAuthenticatedYahooClient: options.getAuthenticatedYahooClient
            || (async () => ({ client: options.yahooClient || { getUserLeagues: async () => ([{ league_id: "449.l.1", name: "Work League", season: 2026 }]) } })),
        };
      }
      if (request === "../services/espnAuth") {
        return {
          getAuthenticatedEspnCredentials: options.getAuthenticatedEspnCredentials
            || (async () => ({ espn_s2: "espn-cookie-secret", swid: "{swid-secret}" })),
        };
      }
      if (request === "../adapters/sleeper") return options.sleeperAdapter || defaultSleeperAdapter();
      if (request === "../adapters/espn") return options.espnAdapter || defaultEspnAdapter();
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/leagues");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options = {}) {
  const app = express();
  app.use(express.json());
  app.use("/api/leagues", loadRouter(options));
  app.use((err, _req, res, _next) => { res.status(err.status || 500).json({ error: err.message }); });
  return app;
}

async function request(app, { path = "/api/leagues", method = "GET", body = null } = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { authorization: "Bearer valid-token", "content-type": "application/json" },
      body: body == null ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const SLEEPER_ROW = {
  platform: "sleeper", is_active: true, league_id: "L-alpha",
  platform_username: "justin", platform_user_id: "sleeper-user-1",
};
const ESPN_ROW = {
  platform: "espn", is_active: true, league_id: "12345",
  espn_secret_id: "vault-espn", swid_secret_id: "vault-swid", espn_team_id: "9",
};
const YAHOO_ROW = {
  platform: "yahoo", is_active: true, league_id: "449.l.1", token_secret_id: "vault-yahoo",
};

// --- Success, per provider, proven against that provider's own adapter -------

test("GET /api/leagues lists Sleeper leagues alphabetically with team, scoring format, and the active flag", async () => {
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false } });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  assert.equal(body.contract_version, "league-directory.v1");
  const sleeper = body.platforms.find((p) => p.platform === "sleeper");
  assert.equal(sleeper.connection_state, "connected");
  assert.equal(sleeper.discovery, "full");
  assert.deepEqual(sleeper.leagues.map((l) => l.league_name), ["Alpha League", "Zeta League"]);
  assert.deepEqual(sleeper.leagues.map((l) => l.scoring_format), ["standard", "half_ppr"]);
  assert.deepEqual(sleeper.leagues.map((l) => l.team_name), ["Team L-alpha", "Team L-zeta"]);
  assert.deepEqual(sleeper.leagues.map((l) => l.is_active), [true, false]);
  assert.equal(body.active.platform, "sleeper");
  assert.equal(body.active.league_id, "L-alpha");
  assert.equal(body.active.scoring_format, "standard");
});

test("GET /api/leagues resolves the ESPN bound league and team through the ESPN adapter", async () => {
  const app = buildApp({ supabase: { rows: [ESPN_ROW], missingSelectionColumn: false } });
  const { body } = await request(app);

  const espn = body.platforms.find((p) => p.platform === "espn");
  assert.equal(espn.connection_state, "connected");
  assert.equal(espn.discovery, "bound_only");
  assert.equal(espn.leagues.length, 1);
  assert.equal(espn.leagues[0].league_id, "12345");
  assert.equal(espn.leagues[0].team_name, "ESPN Team");
  assert.equal(espn.leagues[0].is_active, true);
  assert.match(espn.notice, /does not expose a league list/);
  assert.equal(body.active.platform, "espn");
});

test("GET /api/leagues lists Yahoo leagues through the Yahoo client and never guesses a scoring format", async () => {
  const app = buildApp({ supabase: { rows: [YAHOO_ROW], missingSelectionColumn: false } });
  const { body } = await request(app);

  const yahoo = body.platforms.find((p) => p.platform === "yahoo");
  assert.equal(yahoo.discovery, "full");
  assert.equal(yahoo.leagues[0].league_name, "Work League");
  assert.equal(yahoo.leagues[0].scoring_format, null);
  assert.equal(yahoo.leagues[0].is_active, true);
});

test("platform groups keep a stable order across visits", async () => {
  const app = buildApp({ supabase: { rows: [YAHOO_ROW, ESPN_ROW, SLEEPER_ROW], missingSelectionColumn: false } });
  const first = await request(app);
  const second = await request(app);

  assert.deepEqual(first.body.platforms.map((p) => p.platform), ["sleeper", "espn", "yahoo"]);
  assert.deepEqual(second.body.platforms.map((p) => p.platform), first.body.platforms.map((p) => p.platform));
});

test("an explicit selection wins over the deterministic platform tie-break", async () => {
  const rows = [SLEEPER_ROW, { ...YAHOO_ROW, is_selected: true }];
  const app = buildApp({ supabase: { rows, missingSelectionColumn: false } });
  const { body } = await request(app);

  assert.equal(body.selection_persistence, "explicit");
  assert.equal(body.active.platform, "yahoo");
});

// --- Empty ------------------------------------------------------------------

test("GET /api/leagues returns every platform as not_connected with no active league when nothing is connected", async () => {
  const app = buildApp({ supabase: { rows: [], missingSelectionColumn: false } });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  assert.equal(body.active, null);
  assert.deepEqual(body.platforms.map((p) => p.connection_state), ["not_connected", "not_connected", "not_connected"]);
  assert.deepEqual(body.platforms.flatMap((p) => p.leagues), []);
});

test("a connected Sleeper account with zero leagues reports connected with an empty list, not an error", async () => {
  const app = buildApp({
    supabase: { rows: [{ ...SLEEPER_ROW, league_id: "sleeper" }], missingSelectionColumn: false },
    sleeperAdapter: defaultSleeperAdapter({ fetchSleeperLeagues: async () => [] }),
  });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  const sleeper = body.platforms.find((p) => p.platform === "sleeper");
  assert.equal(sleeper.connection_state, "connected");
  assert.deepEqual(sleeper.leagues, []);
  assert.equal(body.active, null);
});

// --- Error ------------------------------------------------------------------

test("a Sleeper discovery failure degrades that platform only and leaves the others listed", async () => {
  const app = buildApp({
    supabase: { rows: [SLEEPER_ROW, YAHOO_ROW], missingSelectionColumn: false },
    sleeperAdapter: defaultSleeperAdapter({
      fetchSleeperLeagues: async () => { throw new Error("sleeper 503"); },
    }),
  });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  const sleeper = body.platforms.find((p) => p.platform === "sleeper");
  assert.equal(sleeper.discovery, "unavailable");
  assert.deepEqual(sleeper.leagues, []);
  assert.equal(body.platforms.find((p) => p.platform === "yahoo").leagues.length, 1);
});

test("an expired Yahoo token is reported as a reconnect notice, not a 500", async () => {
  const app = buildApp({
    supabase: { rows: [YAHOO_ROW], missingSelectionColumn: false },
    getAuthenticatedYahooClient: async () => { throw new Error("yahoo_token_expired"); },
  });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  const yahoo = body.platforms.find((p) => p.platform === "yahoo");
  assert.equal(yahoo.discovery, "unavailable");
  assert.match(yahoo.notice, /reconnected/);
});

test("an ESPN credential failure never puts a cookie value in the response", async () => {
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false },
    getAuthenticatedEspnCredentials: async () => { throw new Error("espn_s2=SECRETCOOKIEVALUE rejected"); },
  });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes("SECRETCOOKIEVALUE"), false);
  assert.equal(serialized.includes("espn_s2"), false);
  assert.equal(serialized.includes("swid-secret"), false);
  const espn = body.platforms.find((p) => p.platform === "espn");
  assert.equal(espn.leagues[0].team_name, null);
});

test("a connection missing its credentials reports reconnect_required rather than being listed", async () => {
  const app = buildApp({
    supabase: { rows: [{ platform: "espn", is_active: true, league_id: "12345" }], missingSelectionColumn: false },
  });
  const { body } = await request(app);

  const espn = body.platforms.find((p) => p.platform === "espn");
  assert.equal(espn.connection_state, "reconnect_required");
  assert.deepEqual(espn.leagues, []);
  assert.equal(body.active, null);
});

test("the directory reports provider_binding_only while the selection column is absent", async () => {
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: true } });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  assert.equal(body.selection_persistence, "provider_binding_only");
});

// --- POST /api/leagues/active ----------------------------------------------

test("POST /api/leagues/active binds a verified Sleeper league and names the surfaces to refresh", async () => {
  const updates = [];
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false, updates } });
  const { status, body } = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "sleeper", league_id: "L-zeta" },
  });

  assert.equal(status, 200);
  assert.equal(body.contract_version, "league-active-selection.v1");
  assert.equal(body.selection_persistence, "explicit");
  assert.equal(body.active.league_id, "L-zeta");
  assert.deepEqual(body.refresh, ["command_center", "omen", "league", "waiver_watch", "ledger"]);
  assert.equal(updates[0].patch.league_id, "L-zeta");
  assert.equal(updates[0].patch.is_selected, true);
  assert.equal(updates[1].patch.is_selected, false);
});

test("POST /api/leagues/active accepts the bound ESPN league and records the team id", async () => {
  const updates = [];
  const app = buildApp({ supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, updates } });
  const { status, body } = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "espn", league_id: "12345", team_id: "9" },
  });

  assert.equal(status, 200);
  assert.equal(body.active.team_id, "9");
  assert.equal(updates[0].patch.espn_team_id, "9");
});

test("POST /api/leagues/active verifies the Yahoo league against the user's own Yahoo account", async () => {
  const app = buildApp({ supabase: { rows: [YAHOO_ROW], missingSelectionColumn: false, updates: [] } });
  const ok = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "yahoo", league_id: "449.l.1" },
  });
  const rejected = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "yahoo", league_id: "449.l.999" },
  });

  assert.equal(ok.status, 200);
  assert.equal(rejected.status, 400);
  assert.equal(rejected.body.code, "league_not_in_account");
  assert.equal(rejected.body.contract_version, "league-directory-error.v1");
});

test("POST /api/leagues/active refuses a Sleeper league the user does not own", async () => {
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false, updates: [] } });
  const { status, body } = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "sleeper", league_id: "L-someone-else" },
  });

  assert.equal(status, 400);
  assert.equal(body.code, "league_not_in_account");
});

test("POST /api/leagues/active refuses an ESPN league other than the bound one", async () => {
  const app = buildApp({ supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, updates: [] } });
  const { status, body } = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "espn", league_id: "99999" },
  });

  assert.equal(status, 400);
  assert.equal(body.code, "league_not_in_account");
});

test("POST /api/leagues/active validates platform and league id", async () => {
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false, updates: [] } });
  const badPlatform = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "draftkings", league_id: "L-alpha" },
  });
  const noLeague = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "sleeper" },
  });

  assert.equal(badPlatform.status, 400);
  assert.equal(badPlatform.body.code, "invalid_platform");
  assert.equal(noLeague.status, 400);
  assert.equal(noLeague.body.code, "league_id_required");
});

test("POST /api/leagues/active returns platform_not_connected when that provider has no connection", async () => {
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false, updates: [] } });
  const { status, body } = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "yahoo", league_id: "449.l.1" },
  });

  assert.equal(status, 404);
  assert.equal(body.code, "platform_not_connected");
});

test("POST /api/leagues/active reports a provider verification outage as retryable, not as a bad league", async () => {
  const app = buildApp({
    supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false, updates: [] },
    sleeperAdapter: defaultSleeperAdapter({
      fetchSleeperLeagues: async () => { throw new Error("sleeper 503"); },
    }),
  });
  const { status, body } = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "sleeper", league_id: "L-alpha" },
  });

  assert.equal(status, 502);
  assert.equal(body.code, "league_verification_unavailable");
  assert.equal(body.action, "retry");
});

test("POST /api/leagues/active still binds the league, and says so honestly, when the selection column is absent", async () => {
  const updates = [];
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: true, updates } });
  const { status, body } = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "sleeper", league_id: "L-zeta" },
  });

  assert.equal(status, 200);
  assert.equal(body.selection_persistence, "provider_binding_only");
  assert.equal(updates.length, 1);
  assert.equal(Object.hasOwn(updates[0].patch, "is_selected"), false);
  assert.equal(updates[0].patch.league_id, "L-zeta");
});
