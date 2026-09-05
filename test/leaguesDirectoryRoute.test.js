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
const MISSING_FOLLOWS_TABLE = Object.freeze({
  code: "PGRST205",
  message: "Could not find the table 'public.league_follows' in the schema cache",
});

function fakeFollowsTable({ follows, followWrites }) {
  const answer = (resolve, reject, data) => (follows === null
    ? Promise.resolve({ data: null, error: MISSING_FOLLOWS_TABLE }).then(resolve, reject)
    : Promise.resolve({ data, error: null }).then(resolve, reject));

  const chain = (data) => {
    const query = {
      eq() { return query; },
      then(resolve, reject) { return answer(resolve, reject, data); },
    };
    return query;
  };

  return {
    select: () => chain(follows || []),
    delete: () => chain([]),
    upsert(rowsToWrite) {
      if (follows !== null) followWrites.push(...rowsToWrite);
      return chain([]);
    },
  };
}

function fakeSupabase({
  rows = [],
  missingSelectionColumn = true,
  updates = [],
  updateError = null,
  follows = null,
  followWrites = [],
} = {}) {
  return {
    from(table) {
      // `league_follows` is review-only SQL and absent from production, so the double
      // answers the way PostgREST does for an unknown table by default. Passing
      // `follows` opts a test into the applied-migration world.
      if (table === "league_follows") return fakeFollowsTable({ follows, followWrites });
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
    // Discovery unavailable by default, so every pre-existing ESPN test keeps
    // exercising the bound-league fallback it was written for.
    fetchEspnFanLeagues: async () => { throw new Error("fan api unavailable"); },
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

test("GET /api/leagues falls back to the bound ESPN league when fan discovery cannot run", async () => {
  const app = buildApp({ supabase: { rows: [ESPN_ROW], missingSelectionColumn: false } });
  const { body } = await request(app);

  const espn = body.platforms.find((p) => p.platform === "espn");
  assert.equal(espn.connection_state, "connected");
  assert.equal(espn.discovery, "bound_only");
  assert.equal(espn.leagues.length, 1);
  assert.equal(espn.leagues[0].league_id, "12345");
  assert.equal(espn.leagues[0].team_name, "ESPN Team");
  assert.equal(espn.leagues[0].is_active, true);
  assert.match(espn.notice, /couldn't ask ESPN for your full league list/);
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
  // Clear first, then set — see the regression test below for why the order is load-bearing.
  assert.equal(updates[0].patch.is_selected, false);
  assert.equal(updates[1].patch.league_id, "L-zeta");
  assert.equal(updates[1].patch.is_selected, true);
});

test("POST /api/leagues/active accepts the bound ESPN league and records the team id", async () => {
  const updates = [];
  const app = buildApp({ supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, updates } });
  const { status, body } = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "espn", league_id: "12345", team_id: "9" },
  });

  assert.equal(status, 200);
  assert.equal(body.active.team_id, "9");
  assert.equal(updates[1].patch.espn_team_id, "9");
});

// `platform_connections_one_selected_per_user` is `UNIQUE (user_id) WHERE is_selected`, so a
// user may have at most one selected row. Setting the new platform before clearing the old one
// momentarily asks for two and Postgres rejects the write.
//
// In production on 2026-09-05 that 500'd **every cross-provider switch**. Sleeper-to-Sleeper
// worked, because the row being set is the one already selected and no second true row is
// created — which is why it presented as "ESPN is broken" rather than "switching providers is
// broken", and why it survived review.
test("POST /api/leagues/active clears the old selection before setting the new one", async () => {
  const updates = [];
  const app = buildApp({
    supabase: { rows: [SLEEPER_ROW, ESPN_ROW], missingSelectionColumn: false, updates },
  });

  const { status } = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "espn", league_id: "12345" },
  });

  assert.equal(status, 200);

  // The clear must come first, and must exclude the platform being selected.
  const [clear, set] = updates;
  assert.equal(clear.patch.is_selected, false, "the first write must clear, not set");
  assert.ok(
    JSON.stringify(clear.filters).includes("espn"),
    "the clear must be scoped away from the platform being selected"
  );
  assert.equal(set.patch.is_selected, true, "the second write is the one that selects");

  // At no point may two writes both set is_selected true.
  assert.equal(updates.filter((u) => u.patch.is_selected === true).length, 1);
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


// --- Multi-league: discovery, follow-count ordering, and the multiselect write ---

const ESPN_FAN_LEAGUES = [
  { league_id: "77", league_name: "Zeta Office", season: 2026, team_id: "4", team_name: "Zeta Squad" },
  { league_id: "12345", league_name: "Alpha Dynasty", season: 2026, team_id: "9", team_name: "ESPN Team" },
  { league_id: "88", league_name: "Mid Money", season: 2026, team_id: "2", team_name: "Mid Squad" },
];

function espnWithDiscovery() {
  return defaultEspnAdapter({ fetchEspnFanLeagues: async () => ESPN_FAN_LEAGUES });
}

test("ESPN reports every league the fan API returns, not just the bound one", async () => {
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false },
    espnAdapter: espnWithDiscovery(),
  });
  const { body } = await request(app);

  const espn = body.platforms.find((p) => p.platform === "espn");
  assert.equal(espn.discovery, "full");
  assert.equal(espn.notice, null);
  // Sorted alphabetically by league name within the platform, per §10.2.
  assert.deepEqual(espn.leagues.map((l) => l.league_name), ["Alpha Dynasty", "Mid Money", "Zeta Office"]);
  // Per-league team ids: the whole point. `espn_team_id` could only ever describe one.
  assert.deepEqual(espn.leagues.map((l) => l.team_id), ["9", "2", "4"]);
  // Only the bound league is active; the other two are followed but not selected.
  assert.deepEqual(espn.leagues.map((l) => l.is_active), [true, false, false]);
});

test("providers are ordered most-leagues-first, ties alphabetical", async () => {
  const app = buildApp({
    supabase: { rows: [ESPN_ROW, SLEEPER_ROW, YAHOO_ROW], missingSelectionColumn: false },
    espnAdapter: espnWithDiscovery(),
  });
  const { body } = await request(app);

  // ESPN 3, Sleeper 2, Yahoo 1.
  assert.deepEqual(body.platforms.map((p) => p.platform), ["espn", "sleeper", "yahoo"]);
});

test("a tie in league count breaks alphabetically, not by connection order", async () => {
  const app = buildApp({
    supabase: { rows: [YAHOO_ROW, SLEEPER_ROW], missingSelectionColumn: false },
    yahooClient: {
      getUserLeagues: async () => ([
        { league_id: "449.l.1", name: "Work League", season: 2026 },
        { league_id: "449.l.2", name: "Home League", season: 2026 },
      ]),
    },
  });
  const { body } = await request(app);

  // Both have two leagues, so "sleeper" < "yahoo" decides it. Unconnected ESPN has
  // zero leagues and keeps a stable tail — the chip row still has to render it.
  assert.deepEqual(body.platforms.map((p) => p.platform), ["sleeper", "yahoo", "espn"]);
});

test("every discovered league counts as followed while the follows table is absent", async () => {
  const app = buildApp({
    supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false },
  });
  const { body } = await request(app);

  assert.equal(body.follow_persistence, "unavailable");
  const sleeper = body.platforms.find((p) => p.platform === "sleeper");
  assert.ok(sleeper.leagues.every((l) => l.is_followed === true));
});

test("with the follows table applied, only stored leagues are marked followed", async () => {
  const app = buildApp({
    supabase: {
      rows: [SLEEPER_ROW],
      missingSelectionColumn: false,
      follows: [{ platform: "sleeper", league_id: "L-alpha", team_id: "3", sort_order: 0 }],
    },
  });
  const { body } = await request(app);

  assert.equal(body.follow_persistence, "explicit");
  const sleeper = body.platforms.find((p) => p.platform === "sleeper");
  const followed = sleeper.leagues.filter((l) => l.is_followed).map((l) => l.league_id);
  assert.deepEqual(followed, ["L-alpha"]);
});

test("POST /api/leagues/follows stores a verified multiselect", async () => {
  const followWrites = [];
  const app = buildApp({
    supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false, follows: [], followWrites },
  });

  const { status, body } = await request(app, {
    path: "/api/leagues/follows",
    method: "POST",
    body: {
      platform: "sleeper",
      leagues: [
        { league_id: "L-alpha", team_id: "3", league_name: "Alpha League" },
        { league_id: "L-zeta", team_id: "7", league_name: "Zeta League" },
      ],
    },
  });

  assert.equal(status, 200);
  assert.equal(body.contract_version, "league-follows.v1");
  assert.equal(body.follow_persistence, "explicit");
  assert.deepEqual(body.followed, ["L-alpha", "L-zeta"]);
  assert.deepEqual(body.refresh, ["command_center", "omen", "league", "waiver_watch", "ledger"]);
  assert.deepEqual(followWrites.map((r) => r.league_id), ["L-alpha", "L-zeta"]);
  // Submission order is preserved so the carousel can honour it later.
  assert.deepEqual(followWrites.map((r) => r.sort_order), [0, 1]);
});

test("POST /api/leagues/follows rejects the whole set when one league is not on the account", async () => {
  const followWrites = [];
  const app = buildApp({
    supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false, follows: [], followWrites },
  });

  const { status, body } = await request(app, {
    path: "/api/leagues/follows",
    method: "POST",
    body: {
      platform: "sleeper",
      leagues: [{ league_id: "L-alpha" }, { league_id: "not-mine" }],
    },
  });

  assert.equal(status, 400);
  assert.equal(body.code, "league_not_in_account");
  // Nothing partial was written — the message promises that and it has to be true.
  assert.equal(followWrites.length, 0);
});

test("POST /api/leagues/follows accepts the choice but says it did not persist without the table", async () => {
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false } });

  const { status, body } = await request(app, {
    path: "/api/leagues/follows",
    method: "POST",
    body: { platform: "sleeper", leagues: [{ league_id: "L-alpha" }] },
  });

  assert.equal(status, 200);
  assert.equal(body.follow_persistence, "unavailable");
});

test("POST /api/leagues/follows can follow several ESPN leagues once discovery works", async () => {
  const followWrites = [];
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, follows: [], followWrites },
    espnAdapter: espnWithDiscovery(),
  });

  const { status, body } = await request(app, {
    path: "/api/leagues/follows",
    method: "POST",
    body: {
      platform: "espn",
      leagues: [{ league_id: "12345", team_id: "9" }, { league_id: "88", team_id: "2" }],
    },
  });

  assert.equal(status, 200);
  assert.deepEqual(body.followed, ["12345", "88"]);
  assert.deepEqual(followWrites.map((r) => r.team_id), ["9", "2"]);
});

test("no ESPN cookie value reaches a follows response or its rejection", async () => {
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, follows: [] },
    espnAdapter: espnWithDiscovery(),
  });

  const { body } = await request(app, {
    path: "/api/leagues/follows",
    method: "POST",
    body: { platform: "espn", leagues: [{ league_id: "nope" }] },
  });

  const serialized = JSON.stringify(body);
  assert.doesNotMatch(serialized, /espn-cookie-secret|swid-secret/);
});
