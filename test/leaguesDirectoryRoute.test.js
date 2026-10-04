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
const { createLeagueMembershipDb } = require("./fixtures/fakeLeagueMembershipDb");

function fakeSupabase({
  rows = [],
  missingSelectionColumn = true,
  updates = [],
  updateError = null,
  // Redo step 03 (`leagues`, `league_memberships`). Absent by default, so every older test keeps
  // exercising the degraded path; passing a `createLeagueMembershipDb()` opts into the applied world.
  memberships = createLeagueMembershipDb({ missing: true }),
} = {}) {
  return {
    rpc: (name, params) => memberships.client.rpc(name, params),
    from(table) {
      if (table === "leagues" || table === "league_memberships") return memberships.client.from(table);
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

/**
 * What ESPN's own league read says each team is. Deliberately disagrees with the fan payload's
 * `entryId` below: that mismatch is the bug this fixture exists to catch.
 */
const ESPN_LEAGUE_TEAMS = Object.freeze({
  "12345": { team_id: 9, team_name: "ESPN Team" },
  "77": { team_id: 4, team_name: "Zeta Squad" },
  "88": { team_id: 2, team_name: "Mid Squad" },
});

function defaultEspnAdapter(overrides = {}) {
  return {
    // Keyed by league so the directory's per-league resolution is actually observable;
    // a constant here would have passed no matter which league was asked about.
    verifyLeagueAccess: async (leagueId) => (
      ESPN_LEAGUE_TEAMS[String(leagueId)] || { team_id: 9, team_name: "ESPN Team" }
    ),
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
            || (async () => ({
              client: options.yahooClient || {
                // Both, because the real client has both and the directory calls the
                // team-bearing one. A stub missing it is stub drift, not a route bug.
                getUserLeagues: async () => ([{ league_id: "449.l.1", name: "Work League", season: 2026 }]),
                getUserLeaguesWithTeams: async () => ([
                  { league_id: "449.l.1", name: "Work League", season: 2026, team_id: "7", team_name: "Desk Jockeys" },
                ]),
              },
            })),
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
  id: "conn-sleeper", platform: "sleeper", is_active: true, league_id: "L-alpha",
  platform_username: "justin", platform_user_id: "sleeper-user-1",
};
const ESPN_ROW = {
  id: "conn-espn", platform: "espn", is_active: true, league_id: "12345",
  espn_secret_id: "vault-espn", swid_secret_id: "vault-swid", espn_team_id: "9",
};
const YAHOO_ROW = {
  id: "conn-yahoo", platform: "yahoo", is_active: true, league_id: "449.l.1", token_secret_id: "vault-yahoo",
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

// The founder's ESPN connection pointed at league 517756847 with `espn_team_id = 1` — his team
// id in a *different* league (13338821) — while ESPN said he is team 8 there. Omen rendered
// another manager's roster as his. `persistSelection` only wrote the team id when the client sent
// one (`if (teamId != null)`), and both native clients send none, so a league switch changed
// `league_id` and left the previous league's team behind.
test("POST /api/leagues/active never carries a previous league's ESPN team id across a switch", async () => {
  const updates = [];
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, updates },
    // ESPN resolves the caller's own team from the SWID when asked without one.
    espnAdapter: defaultEspnAdapter({
      verifyLeagueAccess: async () => ({ team_id: "8", team_name: "Hall Be Thy Name" }),
    }),
  });

  const { status } = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "espn", league_id: "12345" },
  });

  assert.equal(status, 200);
  const set = updates.find((u) => u.patch.is_selected === true);
  // The field must be written, not omitted — omitting it is what let the stale value survive.
  assert.equal(Object.hasOwn(set.patch, "espn_team_id"), true);
  assert.equal(set.patch.espn_team_id, "8", "the team must come from ESPN, not from the old row");
});

// A stale id is worse than no id: only the stale one is confidently wrong, and the adapters
// re-resolve a missing one from the SWID on the next read.
test("POST /api/leagues/active clears the ESPN team id when ESPN cannot be reached", async () => {
  const updates = [];
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, updates },
    espnAdapter: defaultEspnAdapter({
      verifyLeagueAccess: async () => { throw new Error("ESPN 401"); },
    }),
  });

  const { status } = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "espn", league_id: "12345" },
  });

  assert.equal(status, 200);
  const set = updates.find((u) => u.patch.is_selected === true);
  assert.equal(set.patch.espn_team_id, null);
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
// 2026-09-27: the two ESPN provider calls this route makes (membership check, team resolution)
// used to run one after the other for no data-dependency reason -- diagnosed as the lead cause
// of visible lag when switching leagues. Proves they now actually run concurrently, not just
// that the end result is unchanged, by giving each an independent artificial delay and
// asserting the total request time is close to the SLOWER one, not their sum. A regression back
// to sequential calls (`await` one, then the other) would make this take close to the sum and
// fail the upper-bound assertion.
test("POST /api/leagues/active dispatches the ESPN membership and team-resolution calls concurrently", async () => {
  const delay = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
  const CALL_DELAY_MS = 150;

  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, updates: [] },
    espnAdapter: defaultEspnAdapter({
      fetchEspnFanLeagues: () => delay(CALL_DELAY_MS, [{ league_id: "12345" }]),
      verifyLeagueAccess: () => delay(CALL_DELAY_MS, { team_id: "9", team_name: "Hall Be Thy Name" }),
    }),
  });

  const startedAt = Date.now();
  const { status } = await request(app, {
    path: "/api/leagues/active", method: "POST", body: { platform: "espn", league_id: "12345" },
  });
  const elapsedMs = Date.now() - startedAt;

  assert.equal(status, 200);
  // Sequential would be >= 2 * CALL_DELAY_MS (300ms); concurrent stays close to one delay.
  // The threshold leaves generous room for test-runner overhead without also passing if the
  // two calls were run one after another.
  assert.ok(
    elapsedMs < CALL_DELAY_MS * 1.8,
    `expected concurrent dispatch (~${CALL_DELAY_MS}ms); took ${elapsedMs}ms, consistent with sequential calls`
  );
});

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

// Shaped the way the founder's real account answered: ESPN's fan endpoint carries a league name
// but no team name, and its `entryId` is an entry identifier — not the 1..n `team.id` the rest of
// the ESPN surface matches on. Both are wrong here on purpose.
const ESPN_FAN_LEAGUES = [
  { league_id: "77", league_name: "Zeta Office", season: 2026, team_id: "900004", team_name: null },
  { league_id: "12345", league_name: "Alpha Dynasty", season: 2026, team_id: "900009", team_name: null },
  { league_id: "88", league_name: "Mid Money", season: 2026, team_id: "900002", team_name: null },
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

// The only confirmed beta defect on the ESPN switcher: every discovered ESPN league rendered as
// "Your team" because the fan payload carries no team name, and the row's `team_id` was ESPN's
// entry id rather than the league-scoped `team.id` that `POST /api/leagues/active` stores and
// every later roster read matches against.
test("ESPN discovery resolves each league's real team name and league-scoped team id", async () => {
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false },
    espnAdapter: espnWithDiscovery(),
  });
  const { body } = await request(app);

  const espn = body.platforms.find((p) => p.platform === "espn");
  assert.deepEqual(espn.leagues.map((l) => l.team_name), ["ESPN Team", "Mid Squad", "Zeta Squad"]);
  // Not the fan payload's 900009/900002/900004.
  assert.deepEqual(espn.leagues.map((l) => l.team_id), ["9", "2", "4"]);
});

test("ESPN discovery keeps a league whose team read fails, rather than dropping it", async () => {
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false },
    espnAdapter: defaultEspnAdapter({
      fetchEspnFanLeagues: async () => ESPN_FAN_LEAGUES,
      verifyLeagueAccess: async (leagueId) => {
        if (String(leagueId) === "88") throw new Error("ESPN team not found in this league");
        return ESPN_LEAGUE_TEAMS[String(leagueId)];
      },
    }),
  });
  const { body } = await request(app);

  const espn = body.platforms.find((p) => p.platform === "espn");
  assert.deepEqual(espn.leagues.map((l) => l.league_name), ["Alpha Dynasty", "Mid Money", "Zeta Office"]);
  assert.deepEqual(espn.leagues.map((l) => l.team_name), ["ESPN Team", null, "Zeta Squad"]);
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

// Yahoo rows carried no team at all until 2026-09-05: `yahooLeagues` built them without a team
// id or name, so every Yahoo league in the switcher showed its league title where a team name
// belongs, and a user with two Yahoo teams could not tell them apart. The founder asked for this
// directly — "we gotta make sure that Yahoo shows the team name too".
test("GET /api/leagues carries the Yahoo team name, not just the league name", async () => {
  const app = buildApp({
    supabase: { rows: [YAHOO_ROW], missingSelectionColumn: false },
    yahooClient: {
      getUserLeaguesWithTeams: async () => ([
        { league_id: "449.l.1", name: "Work League", season: 2026, team_id: "7", team_name: "Desk Jockeys" },
      ]),
    },
  });

  const { body } = await request(app);
  const yahoo = body.platforms.find((p) => p.platform === "yahoo");

  assert.equal(yahoo.leagues[0].team_name, "Desk Jockeys");
  assert.equal(yahoo.leagues[0].team_id, "7");
  // The league name is still carried; the team is additional, not a replacement.
  assert.equal(yahoo.leagues[0].league_name, "Work League");
});

// A team name Yahoo will not supply must not cost the user the league.
test("a Yahoo league with no team still appears, with a null team name", async () => {
  const app = buildApp({
    supabase: { rows: [YAHOO_ROW], missingSelectionColumn: false },
    yahooClient: {
      getUserLeaguesWithTeams: async () => ([
        { league_id: "449.l.1", name: "Work League", season: 2026 },
      ]),
    },
  });

  const { body } = await request(app);
  const yahoo = body.platforms.find((p) => p.platform === "yahoo");

  assert.equal(yahoo.leagues.length, 1);
  assert.equal(yahoo.leagues[0].team_name, null);
});

test("a tie in league count breaks alphabetically, not by connection order", async () => {
  const app = buildApp({
    supabase: { rows: [YAHOO_ROW, SLEEPER_ROW], missingSelectionColumn: false },
    yahooClient: {
      getUserLeaguesWithTeams: async () => ([
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

// --- Memberships (redo step 03, plan A5) -------------------------------------------------------

const CONNECTIONS = [
  { id: "conn-sleeper", user_id: "user-1", platform: "sleeper", is_active: true },
  { id: "conn-espn", user_id: "user-1", platform: "espn", is_active: true },
  { id: "conn-yahoo", user_id: "user-1", platform: "yahoo", is_active: true },
];

function appliedMemberships(options = {}) {
  return createLeagueMembershipDb({ connections: CONNECTIONS, ...options });
}

test("with memberships applied, a directory read writes a followed membership for every discovered league", async () => {
  const memberships = appliedMemberships();
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false, memberships } });
  const { body } = await request(app);

  assert.equal(body.follow_persistence, "explicit");
  const sleeper = body.platforms.find((p) => p.platform === "sleeper");
  assert.ok(sleeper.leagues.every((l) => l.is_followed === true));
  const stored = memberships.membershipsOf("user-1");
  assert.deepEqual(stored.map((m) => m.provider_league_id).sort(), ["L-alpha", "L-zeta"]);
  assert.ok(stored.every((m) => m.source === "backfill" && m.connection_id === "conn-sleeper"));
  // The team the directory resolved is what is stored.
  assert.equal(stored.find((m) => m.provider_league_id === "L-alpha").team_name, "Team L-alpha");
});

// The backfill: an existing connection whose memberships were lost (or never written past the one
// step 03's backfill made) gets every league back on its next directory read, with no manual SQL.
test("an existing ESPN connection with one stored membership gets all its leagues back on the next read", async () => {
  const memberships = appliedMemberships();
  await require("../src/services/leagueMemberships").syncMemberships(memberships.client, {
    userId: "user-1", platform: "espn", season: 2026, leagues: [{ league_id: "12345" }], source: "backfill",
  });
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, memberships },
    espnAdapter: espnWithDiscovery(),
  });
  await request(app);

  const stored = memberships.membershipsOf("user-1");
  assert.deepEqual(stored.map((m) => m.provider_league_id).sort(), ["12345", "77", "88"]);
  assert.ok(stored.every((m) => m.is_followed));
  // League-scoped team ids from ESPN's league read, never the fan payload's entry ids.
  assert.deepEqual(
    stored.sort((a, b) => a.provider_league_id.localeCompare(b.provider_league_id)).map((m) => m.provider_team_id),
    ["9", "4", "2"]
  );
});

test("an ESPN team the league read could not confirm is never stored on a membership", async () => {
  const memberships = appliedMemberships();
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, memberships },
    espnAdapter: defaultEspnAdapter({
      fetchEspnFanLeagues: async () => ESPN_FAN_LEAGUES,
      verifyLeagueAccess: async (leagueId) => {
        if (String(leagueId) === "88") throw new Error("ESPN team not found in this league");
        return ESPN_LEAGUE_TEAMS[String(leagueId)];
      },
    }),
  });
  await request(app);

  const stored = memberships.membershipsOf("user-1");
  assert.equal(stored.length, 3);
  // Not the fan payload's entry id 900002.
  assert.equal(stored.find((m) => m.provider_league_id === "88").provider_team_id, null);
  assert.equal(stored.find((m) => m.provider_league_id === "77").provider_team_id, "4");
});

test("a confirmed stored ESPN team wins over an unconfirmed one in the switcher", async () => {
  const memberships = appliedMemberships();
  await require("../src/services/leagueMemberships").syncMemberships(memberships.client, {
    userId: "user-1", platform: "espn", season: 2026,
    leagues: [{ league_id: "88", team_id: "2", team_name: "Mid Squad" }],
  });
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, memberships },
    espnAdapter: defaultEspnAdapter({
      fetchEspnFanLeagues: async () => ESPN_FAN_LEAGUES,
      verifyLeagueAccess: async (leagueId) => {
        if (String(leagueId) === "88") throw new Error("ESPN team not found in this league");
        return ESPN_LEAGUE_TEAMS[String(leagueId)];
      },
    }),
  });
  const { body } = await request(app);

  const mid = body.platforms.find((p) => p.platform === "espn").leagues.find((l) => l.league_id === "88");
  assert.equal(mid.team_id, "2");
  assert.equal(mid.team_name, "Mid Squad");
  assert.equal(memberships.membershipsOf("user-1").find((m) => m.provider_league_id === "88").provider_team_id, "2");
});

test("a stored unfollow is reported, and only followed leagues are marked followed", async () => {
  const memberships = appliedMemberships();
  const svc = require("../src/services/leagueMemberships");
  await svc.syncMemberships(memberships.client, {
    userId: "user-1", platform: "sleeper", season: 2026, leagues: [{ league_id: "L-alpha" }, { league_id: "L-zeta" }],
  });
  await svc.replaceFollowed(memberships.client, { userId: "user-1", platform: "sleeper", season: 2026, leagueIds: ["L-alpha"] });

  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false, memberships } });
  const { body } = await request(app);

  assert.equal(body.follow_persistence, "explicit");
  const sleeper = body.platforms.find((p) => p.platform === "sleeper");
  assert.deepEqual(sleeper.leagues.filter((l) => l.is_followed).map((l) => l.league_id), ["L-alpha"]);
  // Still listed: the switcher can re-follow it.
  assert.equal(sleeper.leagues.length, 2);
});

test("when ESPN discovery cannot run, the switcher lists the stored leagues instead of shrinking to one", async () => {
  const memberships = appliedMemberships();
  await require("../src/services/leagueMemberships").syncMemberships(memberships.client, {
    userId: "user-1", platform: "espn", season: 2026,
    leagues: [
      { league_id: "12345", league_name: "Alpha Dynasty", team_id: "9", team_name: "ESPN Team" },
      { league_id: "77", league_name: "Zeta Office", team_id: "4", team_name: "Zeta Squad" },
      { league_id: "88", league_name: "Mid Money", team_id: "2", team_name: "Mid Squad" },
    ],
  });
  const app = buildApp({ supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, memberships } });
  const { body } = await request(app);

  const espn = body.platforms.find((p) => p.platform === "espn");
  assert.equal(espn.connection_state, "connected");
  assert.equal(espn.discovery, "bound_only");
  assert.deepEqual(espn.leagues.map((l) => l.league_name), ["Alpha Dynasty", "Mid Money", "Zeta Office"]);
  assert.deepEqual(espn.leagues.map((l) => l.team_name), ["ESPN Team", "Mid Squad", "Zeta Squad"]);
  assert.deepEqual(espn.leagues.map((l) => l.is_active), [true, false, false]);
  assert.match(espn.notice, /couldn't ask ESPN for your full league list/);
  assert.match(espn.notice, /last sync/);
  // A partial answer never unfollows anything.
  assert.ok(memberships.membershipsOf("user-1").every((m) => m.is_followed));
});

test("a league the provider no longer lists is unfollowed, not deleted, and leaves the switcher", async () => {
  const memberships = appliedMemberships();
  await require("../src/services/leagueMemberships").syncMemberships(memberships.client, {
    userId: "user-1", platform: "sleeper", season: 2026,
    leagues: [{ league_id: "L-alpha" }, { league_id: "L-zeta" }, { league_id: "L-left", league_name: "Left League" }],
  });
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false, memberships } });
  const { body } = await request(app);

  const sleeper = body.platforms.find((p) => p.platform === "sleeper");
  assert.deepEqual(sleeper.leagues.map((l) => l.league_id), ["L-alpha", "L-zeta"]);
  const left = memberships.membershipsOf("user-1").find((m) => m.provider_league_id === "L-left");
  assert.equal(left.is_followed, false);
});

test("a rejected ESPN connection writes no memberships", async () => {
  const memberships = appliedMemberships();
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, memberships },
    espnAdapter: defaultEspnAdapter({
      fetchEspnFanLeagues: async () => { const e = new Error("unauthorized"); e.status = 401; throw e; },
      verifyLeagueAccess: async () => { const e = new Error("unauthorized"); e.status = 401; throw e; },
    }),
  });
  const { body } = await request(app);

  assert.equal(body.platforms.find((p) => p.platform === "espn").connection_state, "reconnect_required");
  assert.equal(memberships.state.memberships.length, 0);
});

test("a membership write failure never breaks the directory", async () => {
  const memberships = appliedMemberships({ failWrites: () => true });
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false, memberships } });
  const { status, body } = await request(app);

  assert.equal(status, 200);
  const sleeper = body.platforms.find((p) => p.platform === "sleeper");
  assert.equal(sleeper.leagues.length, 2);
  assert.ok(sleeper.leagues.every((l) => l.is_followed === true));
});

test("POST /api/leagues/follows stores a verified multiselect through league_follows_replace", async () => {
  const memberships = appliedMemberships();
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false, memberships } });

  const { status, body } = await request(app, {
    path: "/api/leagues/follows",
    method: "POST",
    body: {
      platform: "sleeper",
      leagues: [
        { league_id: "L-zeta", team_id: "7", league_name: "Zeta League" },
        { league_id: "L-alpha", team_id: "3", league_name: "Alpha League" },
      ],
    },
  });

  assert.equal(status, 200);
  assert.equal(body.contract_version, "league-follows.v1");
  assert.equal(body.follow_persistence, "explicit");
  assert.deepEqual(body.followed, ["L-zeta", "L-alpha"]);
  assert.deepEqual(body.refresh, ["command_center", "omen", "league", "waiver_watch", "ledger"]);
  const call = memberships.state.rpcs.find((c) => c.name === "league_follows_replace");
  assert.equal(call.params.p_platform, "sleeper");
  assert.equal(call.params.p_season, 2026);
  // Ids and submission order only: a shared league's name is never taken from a client.
  assert.deepEqual(call.params.p_entries, [{ league_id: "L-zeta", sort_order: 0 }, { league_id: "L-alpha", sort_order: 1 }]);
});

test("POST /api/leagues/follows rejects the whole set when one league is not on the account", async () => {
  const memberships = appliedMemberships();
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false, memberships } });

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
  assert.equal(memberships.state.rpcs.length, 0);
  assert.equal(memberships.state.memberships.length, 0);
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
  const memberships = appliedMemberships();
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, memberships },
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
  const followed = memberships.membershipsOf("user-1").filter((m) => m.is_followed).map((m) => m.provider_league_id);
  assert.deepEqual(followed.sort(), ["12345", "88"]);
});

test("POST /api/leagues/active mirrors the choice onto the memberships", async () => {
  const memberships = appliedMemberships();
  await require("../src/services/leagueMemberships").syncMemberships(memberships.client, {
    userId: "user-1", platform: "sleeper", season: 2026, leagues: [{ league_id: "L-alpha" }, { league_id: "L-zeta" }],
  });
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false, memberships } });

  const { status } = await request(app, {
    path: "/api/leagues/active",
    method: "POST",
    body: { platform: "sleeper", league_id: "L-zeta" },
  });

  assert.equal(status, 200);
  const active = memberships.membershipsOf("user-1").filter((m) => m.is_active_selection).map((m) => m.provider_league_id);
  assert.deepEqual(active, ["L-zeta"]);
});

test("POST /api/leagues/active still succeeds when the membership mirror cannot run", async () => {
  const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false } });
  const { status, body } = await request(app, {
    path: "/api/leagues/active",
    method: "POST",
    body: { platform: "sleeper", league_id: "L-zeta" },
  });
  assert.equal(status, 200);
  assert.equal(body.active.league_id, "L-zeta");
});

test("no ESPN cookie value reaches a follows response or its rejection", async () => {
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false, memberships: appliedMemberships() },
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

// A dead ESPN connection reported `connected`.
//
// `connectionState` tests whether the credential columns are POPULATED, which they are — a cookie
// that expired last week is still a cookie. So an account ESPN was rejecting outright came back
// `connection_state: "connected"` with `team_name: null` and no projections, and nothing anywhere
// told the user to reconnect. Found on a real account 2026-09-07. Presence is not liveness.
test("ESPN rejecting the credentials reports reconnect_required, not connected", async () => {
  const rejected = () => {
    const e = new Error("ESPN rejected the request — cookies may be invalid or expired");
    e.status = 401;
    throw e;
  };
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false },
    espnAdapter: defaultEspnAdapter({
      fetchEspnFanLeagues: rejected,
      verifyLeagueAccess: rejected,
    }),
  });
  const { body } = await request(app);

  const espn = body.platforms.find((p) => p.platform === "espn");
  assert.equal(espn.connection_state, "reconnect_required");
  assert.match(espn.notice, /Reconnect ESPN/);
});

// A read that merely FAILED is not a dead connection, and must not be reported as one — a flaky
// ESPN or a network blip would otherwise send the user to re-do a connection that is fine.
test("an ESPN read that fails without a 401 stays connected", async () => {
  const app = buildApp({
    supabase: { rows: [ESPN_ROW], missingSelectionColumn: false },
    espnAdapter: defaultEspnAdapter({
      fetchEspnFanLeagues: async () => { throw new Error("fan api unavailable"); },
      verifyLeagueAccess: async () => { const e = new Error("ESPN is down"); e.status = 502; throw e; },
    }),
  });
  const { body } = await request(app);

  const espn = body.platforms.find((p) => p.platform === "espn");
  assert.equal(espn.connection_state, "connected");
  assert.match(espn.notice, /full league list/);
});

// --- Short response cache ----------------------------------------------------

const responseCache = require("../src/services/responseCache");

async function requestWithHeaders(app, opts = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}${opts.path || "/api/leagues"}`, {
      method: opts.method || "GET",
      headers: { authorization: "Bearer valid-token", "content-type": "application/json" },
      body: opts.body == null ? undefined : JSON.stringify(opts.body),
    });
    return { status: response.status, body: await response.json(), cache: response.headers.get("x-omen-cache") };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/leagues: second read is a cache hit with the same body; no store means no header", async () => {
  responseCache.setStoreForTests(responseCache.createMemoryResponseCacheStore());
  try {
    let discoveries = 0;
    const app = buildApp({
      supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false },
      sleeperAdapter: defaultSleeperAdapter({
        fetchSleeperLeagues: async () => { discoveries += 1; return [{ league_id: "L-alpha", name: "Alpha", season: "2026", scoring_settings: { rec: 1 } }]; },
      }),
    });
    const first = await requestWithHeaders(app);
    const second = await requestWithHeaders(app);
    assert.equal(first.cache, "miss");
    assert.equal(second.cache, "hit");
    assert.deepEqual(second.body, first.body);
    assert.equal(discoveries, 1);

    responseCache.setStoreForTests(null);
    const bare = await requestWithHeaders(app);
    assert.equal(bare.status, 200);
    assert.equal(bare.cache, null);
  } finally {
    responseCache.setStoreForTests(undefined);
  }
});

test("GET /api/leagues: a selection change in the rows is a different key (league switch never replays the old payload)", async () => {
  responseCache.setStoreForTests(responseCache.createMemoryResponseCacheStore());
  try {
    const rows = [{ ...SLEEPER_ROW, league_id: "L-alpha" }];
    const app = buildApp({ supabase: { rows, missingSelectionColumn: false } });
    const alpha = await requestWithHeaders(app);
    assert.equal(alpha.body.active.league_id, "L-alpha");
    rows[0] = { ...SLEEPER_ROW, league_id: "L-zeta" };
    const zeta = await requestWithHeaders(app);
    assert.equal(zeta.cache, "miss");
    assert.equal(zeta.body.active.league_id, "L-zeta");
  } finally {
    responseCache.setStoreForTests(undefined);
  }
});

test("POST /api/leagues/active invalidates the user's cached entries even when the rows are unchanged", async () => {
  responseCache.setStoreForTests(responseCache.createMemoryResponseCacheStore());
  try {
    const app = buildApp({ supabase: { rows: [SLEEPER_ROW], missingSelectionColumn: false } });
    await requestWithHeaders(app);
    assert.equal((await requestWithHeaders(app)).cache, "hit");
    const switched = await requestWithHeaders(app, {
      path: "/api/leagues/active", method: "POST", body: { platform: "sleeper", league_id: "L-zeta" },
    });
    assert.equal(switched.status, 200);
    assert.equal((await requestWithHeaders(app)).cache, "miss");
  } finally {
    responseCache.setStoreForTests(undefined);
  }
});

test("GET /api/leagues: a connection that needs reconnecting is never cached", async () => {
  responseCache.setStoreForTests(responseCache.createMemoryResponseCacheStore());
  try {
    const app = buildApp({
      supabase: { rows: [{ platform: "espn", is_active: true, league_id: "12345", espn_secret_id: null, swid_secret_id: null }], missingSelectionColumn: false },
    });
    const first = await requestWithHeaders(app);
    const second = await requestWithHeaders(app);
    assert.equal(first.cache, "miss");
    assert.equal(second.cache, "miss");
  } finally {
    responseCache.setStoreForTests(undefined);
  }
});
