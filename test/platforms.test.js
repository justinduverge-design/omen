"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

class FakeQuery {
  constructor(state, operation, columns) {
    this.state = state;
    this.operation = operation;
    this.columns = columns;
    this.filters = [];
  }

  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }

  maybeSingle() {
    const rows = this.applyFilters();
    return Promise.resolve({ data: rows[0] || null, error: null });
  }

  then(resolve, reject) {
    return Promise.resolve(this.execute()).then(resolve, reject);
  }

  applyFilters() {
    return this.state.rows.filter((row) =>
      this.filters.every(({ field, value }) => row[field] === value)
    );
  }

  execute() {
    if (this.operation === "select" && this.state.platformLookupError) {
      return { data: null, error: { message: this.state.platformLookupError } };
    }

    if (this.operation === "delete") {
      const rowsToDelete = new Set(this.applyFilters());
      this.state.rows = this.state.rows.filter((row) => !rowsToDelete.has(row));
      this.state.deleted.push(...rowsToDelete);
      return { data: null, error: null };
    }

    return { data: this.applyFilters(), error: null };
  }
}

function makeSupabase(state) {
  return {
    from(table) {
      assert.equal(table, "platform_connections");
      return {
        select(columns) {
          state.selects.push(columns);
          return new FakeQuery(state, "select", columns);
        },
        upsert(payload, options) {
          state.upserts.push({ payload, options });
          const index = state.rows.findIndex((row) =>
            row.user_id === payload.user_id && row.platform === payload.platform
          );
          if (index === -1) state.rows.push({ id: `row-${state.rows.length + 1}`, ...payload });
          else state.rows[index] = { ...state.rows[index], ...payload };
          return Promise.resolve({ data: null, error: null });
        },
        delete() {
          return new FakeQuery(state, "delete");
        },
      };
    },
    rpc(name, params) {
      state.rpcs.push({ name, params });
      if (name === "vault_create_secret") {
        return Promise.resolve({ data: `${params.name}-id`, error: null });
      }
      if (name === "vault_update_secret") {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === "vault_delete_secret") {
        if (state.vaultDeleteError) {
          return Promise.resolve({ data: null, error: { message: state.vaultDeleteError } });
        }
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

function loadPlatformsRouter({
  rows = [],
  sleeperUser,
  sleeperLeagues,
  sleeperRosterInfo,
  sleeperError,
  espnError,
  espnValid = true,
  vaultDeleteError,
  platformLookupError,
  rejectAuth = false,
  redisStore = new Map(),
  redisUnavailable = false,
  redisErrorMessage = "redis unavailable",
  redisFailOnSet = null,
  yahooEnabled = false,
} = {}) {
  const routePath = require.resolve("../src/routes/platforms");
  delete require.cache[routePath];

  const state = {
    rows: rows.map((row) => ({ ...row })),
    selects: [],
    upserts: [],
    deleted: [],
    rpcs: [],
    espnCalls: [],
    appUsers: [],
    logs: [],
    vaultDeleteError,
    platformLookupError,
    redisStore,
  };
  const fakeSupabase = makeSupabase(state);
  const originalLoad = Module._load;
  let redisSetCalls = 0;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === routePath) {
      return { createClient: () => fakeSupabase };
    }
    if (request === "../config" && parent?.filename === routePath) {
      return {
        redisUrl: "https://redis.example",
        redisToken: "test-redis-token",
        yahoo: { enabled: yahooEnabled },
      };
    }
    if (request === "@upstash/redis" && parent?.filename === routePath) {
      return {
        Redis: class MockRedis {
          async get(key) {
            if (redisUnavailable) throw new Error(redisErrorMessage);
            return state.redisStore.get(key) || null;
          }
          async set(key, value, options = {}) {
            if (redisUnavailable) throw new Error(redisErrorMessage);
            redisSetCalls += 1;
            if (redisFailOnSet === redisSetCalls) throw new Error(redisErrorMessage);
            if (options.nx && state.redisStore.has(key)) return null;
            state.redisStore.set(key, value);
            return "OK";
          }
          async del(key) {
            state.redisStore.delete(key);
            return 1;
          }
        },
      };
    }
    if (request === "../middleware/auth" && parent?.filename === routePath) {
      return {
        requireAuth: (req, res, next) => {
          if (rejectAuth) return res.status(401).json({ error: "Missing bearer token" });
          req.user = { id: "test-slops-user", email: "user@example.com" };
          next();
        },
      };
    }
    if (request === "../services/appUser" && parent?.filename === routePath) {
      return {
        ensureAppUser: async (authUser) => {
          state.appUsers.push(authUser);
        },
      };
    }
    if (request === "../middleware/logging" && parent?.filename === routePath) {
      return {
        logger: {
          error(message, meta) { state.logs.push({ level: "error", message, meta }); },
          warn(message, meta) { state.logs.push({ level: "warn", message, meta }); },
          info(message, meta) { state.logs.push({ level: "info", message, meta }); },
        },
      };
    }
    if (request === "../adapters/sleeper" && parent?.filename === routePath) {
      return {
        fetchSleeperUser: async (username) => {
          if (sleeperError) throw sleeperError;
          return sleeperUser || {
            user_id: "sleeper-user-1",
            username,
            display_name: username,
          };
        },
        fetchSleeperLeagues: async () => sleeperLeagues || [{
          league_id: "league-1",
          name: "The Bird Board",
          season: "2026",
          scoring_settings: { rec: 1 },
        }],
        fetchSleeperRoster: async () => sleeperRosterInfo || {
          roster_id: 7,
          users: [{
            user_id: "sleeper-user-1",
            username: "sleepy",
            display_name: "Sleepy",
            metadata: { team_name: "Old School Whistles" },
          }],
          roster: { roster_id: 7, owner_id: "sleeper-user-1" },
        },
      };
    }
    if (request === "../adapters/espn" && parent?.filename === routePath) {
      return {
        buildNormalizedRoster: async (...args) => {
          state.espnCalls.push(args);
          if (espnError) throw espnError;
          return espnValid ? { source: "espn", slots: { starters: [], bench: [], ir: [] } } : null;
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const router = require("../src/routes/platforms");
    return { router, state };
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options) {
  const app = express();
  const loaded = loadPlatformsRouter(options);
  app.use(express.json());
  app.use("/api/platforms", loaded.router);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return { app, state: loaded.state };
}

async function request(app, path, options = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: options.method || "GET",
      headers: options.body ? { "content-type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/platforms/status returns default shape for all three platforms", async () => {
  const { app } = buildApp();
  const res = await request(app, "/api/platforms/status");

  assert.equal(res.status, 200);
  const yahooDefault = {
    connected: false,
    platform: "yahoo",
    available: false,
    unavailableReason: "pending_provider_approval",
  };
  assert.deepEqual(res.body, {
    yahoo: yahooDefault,
    sleeper: { connected: false, platform: "sleeper", username: null },
    espn: { connected: false, platform: "espn" },
    connections: {
      yahoo: yahooDefault,
      sleeper: { connected: false, platform: "sleeper", username: null },
      espn: { connected: false, platform: "espn" },
    },
  });
});

test("Yahoo reports connected-but-unavailable while the entitlement is pending", async () => {
  // The trap this guards: a row written before the pause still reads
  // `connected: true`, which says nothing about whether Yahoo can serve data.
  const { app } = buildApp({
    rows: [
      { user_id: "test-slops-user", platform: "yahoo", is_active: true, token_secret_id: "yahoo-token" },
    ],
  });
  const res = await request(app, "/api/platforms/status");

  assert.equal(res.status, 200);
  assert.equal(res.body.yahoo.connected, true);
  assert.equal(res.body.yahoo.available, false);
  assert.equal(res.body.yahoo.unavailableReason, "pending_provider_approval");
});

test("flipping YAHOO_ENABLED reports Yahoo as available again", async () => {
  // Proves the pause is one flag, not a code change: this is the whole
  // re-enable procedure once Yahoo grants the entitlement.
  const { app } = buildApp({ yahooEnabled: true });
  const res = await request(app, "/api/platforms/status");

  assert.equal(res.status, 200);
  assert.equal(res.body.yahoo.available, true);
  assert.equal(res.body.yahoo.unavailableReason, null);
});

test("GET /api/platforms/status returns connected true when rows have credentials", async () => {
  const { app } = buildApp({
    rows: [
      { user_id: "test-slops-user", platform: "yahoo", is_active: true, token_secret_id: "yahoo-token" },
      { user_id: "test-slops-user", platform: "sleeper", is_active: true, platform_username: "sleepy" },
      {
        user_id: "test-slops-user",
        platform: "espn",
        is_active: true,
        espn_secret_id: "espn-secret",
        swid_secret_id: "swid-secret",
      },
    ],
  });
  const res = await request(app, "/api/platforms/status");

  assert.equal(res.status, 200);
  assert.equal(res.body.yahoo.connected, true);
  assert.equal(res.body.sleeper.connected, true);
  assert.equal(res.body.sleeper.username, "sleepy");
  assert.equal(res.body.espn.connected, true);
  assert.equal(res.body.connections.yahoo.connected, true);
  assert.equal(res.body.connections.sleeper.connected, true);
  assert.equal(res.body.connections.sleeper.username, "sleepy");
  assert.equal(res.body.connections.espn.connected, true);
});

test("GET /api/platforms returns UX contract with manual and selected league metadata", async () => {
  const { app } = buildApp({
    rows: [
      {
        user_id: "test-slops-user",
        platform: "sleeper",
        is_active: true,
        platform_username: "sleepy",
        league_id: "league-1",
      },
      {
        user_id: "test-slops-user",
        platform: "espn",
        is_active: true,
        espn_secret_id: "espn-secret",
        swid_secret_id: "swid-secret",
        league_id: "12345",
        espn_team_id: "7",
      },
    ],
  });
  const res = await request(app, "/api/platforms");

  assert.equal(res.status, 200);
  assert.equal(res.body.platforms.sleeper.status, "connected");
  assert.equal(res.body.platforms.sleeper.username, "sleepy");
  assert.deepEqual(res.body.platforms.sleeper.leagues, [{
    id: "league-1",
    name: null,
    season: null,
    scoring_format: null,
    team_id: null,
    team_name: null,
    selected: true,
  }]);
  assert.equal(res.body.platforms.espn.status, "connected");
  assert.equal(res.body.platforms.espn.leagues[0].team_id, "7");
  assert.deepEqual(res.body.platforms.manual, {
    platform: "manual",
    status: "disconnected",
    connected: false,
    team_name: null,
    leagues: [],
  });
});

test("GET /api/platforms treats the Yahoo league_id placeholder as no league selected", async () => {
  const { app } = buildApp({
    rows: [
      {
        user_id: "test-slops-user",
        platform: "yahoo",
        is_active: true,
        token_secret_id: "yahoo-secret",
        league_id: "yahoo",
      },
    ],
  });
  const res = await request(app, "/api/platforms");

  assert.equal(res.status, 200);
  assert.equal(res.body.platforms.yahoo.status, "connected");
  assert.deepEqual(res.body.platforms.yahoo.leagues, []);
});

test("GET /api/platforms/state returns safe machine-readable states from persisted connection context", async () => {
  const { app } = buildApp({
    rows: [
      {
        user_id: "test-slops-user",
        platform: "yahoo",
        is_active: true,
        league_id: "414.l.1",
      },
      {
        user_id: "test-slops-user",
        platform: "sleeper",
        is_active: true,
        platform_username: "sleepy",
      },
      {
        user_id: "test-slops-user",
        platform: "espn",
        is_active: true,
        espn_secret_id: "espn-secret-id",
        swid_secret_id: "swid-secret-id",
        league_id: "12345",
      },
    ],
  });

  const res = await request(app, "/api/platforms/state");

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "platform-provider-state.v1");
  assert.deepEqual(res.body.providers.yahoo, {
    platform: "yahoo",
    state: "needs_reauth",
    recovery_action: "reauthenticate",
    error_code: "yahoo_oauth_context_missing",
  });
  assert.deepEqual(res.body.providers.sleeper, {
    platform: "sleeper",
    state: "choosing_league",
    recovery_action: "choose_league",
    error_code: "sleeper_league_context_missing",
  });
  assert.deepEqual(res.body.providers.espn, {
    platform: "espn",
    state: "connected",
    recovery_action: null,
    error_code: null,
  });
  assert.equal(JSON.stringify(res.body).includes("espn-secret-id"), false);
  assert.equal(JSON.stringify(res.body).includes("swid-secret-id"), false);
});

test("GET /api/platforms/state reports choosing_league for the Yahoo league_id placeholder, not connected", async () => {
  const { app } = buildApp({
    rows: [
      {
        user_id: "test-slops-user",
        platform: "yahoo",
        is_active: true,
        token_secret_id: "yahoo-secret",
        league_id: "yahoo",
      },
    ],
  });

  const res = await request(app, "/api/platforms/state");

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.providers.yahoo, {
    platform: "yahoo",
    state: "choosing_league",
    recovery_action: "choose_league",
    error_code: "yahoo_league_context_missing",
  });
});

test("GET /api/platforms/state reports not_started and resolving_account without inferring an HTTP error", async () => {
  const { app } = buildApp({
    rows: [{
      user_id: "test-slops-user",
      platform: "sleeper",
      is_active: true,
      league_id: "league-1",
    }],
  });

  const res = await request(app, "/api/platforms/state");

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.providers.yahoo, {
    platform: "yahoo",
    state: "not_started",
    recovery_action: "start_connection",
    error_code: null,
  });
  assert.deepEqual(res.body.providers.sleeper, {
    platform: "sleeper",
    state: "resolving_account",
    recovery_action: "retry",
    error_code: "sleeper_account_context_missing",
  });
});

test("GET /api/platforms/state rejects missing auth and fails closed on an internal lookup error", async () => {
  const unauthenticated = buildApp({ rejectAuth: true });
  const unauthenticatedRes = await request(unauthenticated.app, "/api/platforms/state");
  assert.equal(unauthenticatedRes.status, 401);

  const unavailable = buildApp({ platformLookupError: "token=should-not-leak" });
  const unavailableRes = await request(unavailable.app, "/api/platforms/state");
  assert.equal(unavailableRes.status, 503);
  assert.deepEqual(unavailableRes.body, {
    contract_version: "platform-provider-state.v1",
    state: "retryable_error",
    recovery_action: "retry",
    error_code: "provider_state_unavailable",
  });
  assert.equal(JSON.stringify(unavailableRes.body).includes("should-not-leak"), false);
  assert.equal(JSON.stringify(unavailable.state.logs).includes("should-not-leak"), false);
});

test("POST /api/platforms/sleeper/resolve returns leagues for username-first flow", async () => {
  const { app } = buildApp();
  const res = await request(app, "/api/platforms/sleeper/resolve", {
    method: "POST",
    body: { sleeper_username: "sleepy", season: 2026 },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "resolved");
  assert.equal(res.body.platform, "sleeper");
  assert.equal(res.body.username, "sleepy");
  assert.equal(res.body.sleeper_user_id, "sleeper-user-1");
  assert.deepEqual(res.body.leagues, [{
    id: "league-1",
    name: "The Bird Board",
    season: 2026,
    scoring_format: "ppr",
    team_id: "7",
    team_name: "Old School Whistles",
  }]);
});

test("POST /api/platforms/sleeper/connect bootstraps app user before saving connection", async () => {
  const { app, state } = buildApp();
  const res = await request(app, "/api/platforms/sleeper/connect", {
    method: "POST",
    body: { sleeper_username: "sleepy", league_id: "league-1" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, {
    connected: true,
    status: "connected",
    platform: "sleeper",
    username: "sleepy",
    league_id: "league-1",
  });
  assert.deepEqual(state.appUsers, [{ id: "test-slops-user", email: "user@example.com" }]);
  assert.equal(state.upserts[0].payload.user_id, "test-slops-user");
  assert.equal(state.upserts[0].payload.platform, "sleeper");
  assert.equal(state.upserts[0].payload.platform_user_id, "sleeper-user-1");
  assert.equal(state.upserts[0].options.onConflict, "user_id,platform");
});

test("POST /api/platforms/sleeper/connect replays one completed native request without a second durable effect", async () => {
  const { app, state } = buildApp();
  const body = {
    sleeper_username: "sleepy",
    league_id: "league-1",
    request_id: "native-connect-request-0001",
  };

  const first = await request(app, "/api/platforms/sleeper/connect", { method: "POST", body });
  const second = await request(app, "/api/platforms/sleeper/connect", { method: "POST", body });

  assert.equal(first.status, 200);
  assert.equal(first.body.replayed, false);
  assert.equal(second.status, 200);
  assert.equal(second.body.replayed, true);
  assert.equal(second.body.request_id, "native-connect-request-0001");
  assert.equal(state.upserts.length, 1);
  assert.equal(JSON.stringify(second.body).includes("test-slops-user"), false);
});

test("POST /api/platforms/sleeper/connect fails closed for invalid or unavailable native request replay", async () => {
  const invalid = buildApp();
  const invalidRes = await request(invalid.app, "/api/platforms/sleeper/connect", {
    method: "POST",
    body: { sleeper_username: "sleepy", league_id: "league-1", request_id: "bad id" },
  });
  assert.equal(invalidRes.status, 422);
  assert.deepEqual(invalidRes.body, { error: "Invalid request_id", code: "invalid_request_id" });
  assert.equal(invalid.state.upserts.length, 0);

  const unavailable = buildApp({
    redisUnavailable: true,
    redisErrorMessage: "redis token=super-secret-token",
  });
  const unavailableRes = await request(unavailable.app, "/api/platforms/sleeper/connect", {
    method: "POST",
    body: { sleeper_username: "sleepy", league_id: "league-1", request_id: "native-connect-request-0002" },
  });
  assert.equal(unavailableRes.status, 503);
  assert.deepEqual(unavailableRes.body, {
    error: "Connection request replay is temporarily unavailable",
    code: "connection_replay_unavailable",
  });
  assert.equal(unavailable.state.upserts.length, 0);
  assert.equal(JSON.stringify(unavailable.state.logs).includes("super-secret-token"), false);
});

test("POST /api/platforms/sleeper/connect keeps in-progress duplicates inert and distinct request IDs independent", async () => {
  const inProgressId = "native-connect-request-0003";
  const inProgress = buildApp({
    redisStore: new Map([[
      `omen:connection-replay:test-slops-user:sleeper:${inProgressId}`,
      JSON.stringify({ status: "in_progress" }),
    ]]),
  });
  const inProgressRes = await request(inProgress.app, "/api/platforms/sleeper/connect", {
    method: "POST",
    body: { sleeper_username: "sleepy", league_id: "league-1", request_id: inProgressId },
  });
  assert.equal(inProgressRes.status, 409);
  assert.equal(inProgressRes.body.code, "connection_request_in_progress");
  assert.equal(inProgress.state.upserts.length, 0);

  const independent = buildApp();
  for (const requestId of ["native-connect-request-0004", "native-connect-request-0005"]) {
    const res = await request(independent.app, "/api/platforms/sleeper/connect", {
      method: "POST",
      body: { sleeper_username: "sleepy", league_id: "league-1", request_id: requestId },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.replayed, false);
  }
  assert.equal(independent.state.upserts.length, 2);
});

test("POST /api/platforms/sleeper/connect holds a retry inert if replay completion fails after the connection write", async () => {
  const { app, state } = buildApp({
    redisFailOnSet: 2,
    redisErrorMessage: "redis token=super-secret-token",
  });
  const body = {
    sleeper_username: "sleepy",
    league_id: "league-1",
    request_id: "native-connect-request-0006",
  };

  const first = await request(app, "/api/platforms/sleeper/connect", { method: "POST", body });
  const retry = await request(app, "/api/platforms/sleeper/connect", { method: "POST", body });

  assert.equal(first.status, 503);
  assert.equal(first.body.code, "connection_replay_unavailable");
  assert.equal(retry.status, 409);
  assert.equal(retry.body.code, "connection_request_in_progress");
  assert.equal(state.upserts.length, 1);
  assert.equal(JSON.stringify(state.logs).includes("super-secret-token"), false);
});

test("POST /api/sleeper/connect returns 400 for nonexistent username", async () => {
  const err = new Error("not found");
  err.status = 404;
  const { app } = buildApp({ sleeperError: err });
  const res = await request(app, "/api/platforms/sleeper/connect", {
    method: "POST",
    body: { username: "missing-user", league_id: "league-1" },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Sleeper username not found");
});

test("POST /api/platforms/espn/connect bootstraps app user before saving connection", async () => {
  const { app, state } = buildApp();
  const res = await request(app, "/api/platforms/espn/connect", {
    method: "POST",
    body: {
      espn_s2: "espn-cookie",
      swid: "{swid-cookie}",
      league_id: "12345",
      espn_team_id: "7",
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.connected, true);
  assert.equal(res.body.platform, "espn");
  assert.deepEqual(state.appUsers, [{ id: "test-slops-user", email: "user@example.com" }]);
  assert.equal(state.upserts[0].payload.user_id, "test-slops-user");
  assert.equal(state.upserts[0].payload.platform, "espn");
  assert.equal(state.upserts[0].payload.league_id, "12345");
  assert.equal(state.upserts[0].options.onConflict, "user_id,platform");
});

test("POST /api/platforms/espn/connect accepts copied cookie pairs and league URL", async () => {
  const { app, state } = buildApp();
  const res = await request(app, "/api/platforms/espn/connect", {
    method: "POST",
    body: {
      espn_s2: " espn_s2=espn-cookie; ",
      swid: " SWID=%7Baaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee%7D; ",
      league_id: "https://fantasy.espn.com/football/league?leagueId=2114292181",
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.connected, true);
  assert.equal(state.espnCalls[0][0], "2114292181");
  assert.equal(state.espnCalls[0][1], "espn-cookie");
  assert.equal(state.espnCalls[0][2], "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}");
  assert.equal(state.upserts[0].payload.league_id, "2114292181");
  assert.equal(state.rpcs.find((rpc) => rpc.params.name === "espn_s2_test-slops-user").params.secret, "espn-cookie");
  assert.equal(
    state.rpcs.find((rpc) => rpc.params.name === "espn_swid_test-slops-user").params.secret,
    "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}"
  );
});

test("POST /api/espn/connect returns 422 if espn_s2 or swid missing", async () => {
  const { app } = buildApp();
  const res = await request(app, "/api/platforms/espn/connect", {
    method: "POST",
    body: { swid: "{test-swid}", league_id: "12345" },
  });

  assert.equal(res.status, 422);
  assert.equal(res.body.status, "error");
  assert.equal(res.body.code, "espn_cookies_required");
});

test("POST /api/platforms/espn/connect returns safe message when ESPN rejects cookies", async () => {
  const { app } = buildApp({ espnValid: false });
  const res = await request(app, "/api/platforms/espn/connect", {
    method: "POST",
    body: {
      espn_s2: "espn-cookie",
      swid: "{swid-cookie}",
      league_id: "12345",
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.status, "error");
  assert.equal(res.body.code, "espn_cookies_invalid");
  assert.match(res.body.message, /same signed-in ESPN browser session/i);
  assert.equal(JSON.stringify(res.body).includes("espn-cookie"), false);
  assert.equal(JSON.stringify(res.body).includes("swid-cookie"), false);
});

test("POST /api/platforms/espn/connect returns safe league/team message for ESPN 404", async () => {
  const espnError = Object.assign(new Error("ESPN team not found in this league"), { status: 404 });
  const { app } = buildApp({ espnError });
  const res = await request(app, "/api/platforms/espn/connect", {
    method: "POST",
    body: {
      espn_s2: "espn-cookie",
      swid: "{swid-cookie}",
      league_id: "12345",
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.status, "error");
  assert.equal(res.body.code, "espn_league_or_team_not_found");
  assert.match(res.body.message, /Confirm the League ID/i);
  assert.equal(JSON.stringify(res.body).includes("espn-cookie"), false);
  assert.equal(JSON.stringify(res.body).includes("swid-cookie"), false);
});

test("DELETE /api/platforms/invalid returns 400", async () => {
  const { app } = buildApp();
  const res = await request(app, "/api/platforms/invalid", { method: "DELETE" });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Invalid platform");
});

test("DELETE /api/platforms/espn destroys Vault secrets and removes row", async () => {
  const { app, state } = buildApp({
    rows: [
      {
        user_id: "test-slops-user",
        platform: "espn",
        is_active: true,
        espn_secret_id: "espn-secret",
        swid_secret_id: "swid-secret",
      },
    ],
  });
  const res = await request(app, "/api/platforms/espn", { method: "DELETE" });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { disconnected: true, platform: "espn" });
  assert.equal(state.rows.length, 0);
  assert.deepEqual(
    state.rpcs.filter((rpc) => rpc.name === "vault_delete_secret").map((rpc) => rpc.params.secret_id),
    ["espn-secret", "swid-secret"]
  );
});

test("DELETE /api/platforms/espn never logs the raw Vault secret id when deletion fails", async () => {
  const { app, state } = buildApp({
    rows: [
      {
        user_id: "test-slops-user",
        platform: "espn",
        is_active: true,
        espn_secret_id: "espn-secret",
        swid_secret_id: "swid-secret",
      },
    ],
    vaultDeleteError: "rpc unavailable",
  });
  const res = await request(app, "/api/platforms/espn", { method: "DELETE" });

  assert.equal(res.status, 200);
  const serializedLogs = JSON.stringify(state.logs);
  assert.equal(serializedLogs.includes("espn-secret"), false);
  assert.equal(serializedLogs.includes("swid-secret"), false);
  assert.ok(state.logs.some((entry) => entry.level === "warn"));
});
