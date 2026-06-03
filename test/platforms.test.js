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
  espnValid = true,
} = {}) {
  const routePath = require.resolve("../src/routes/platforms");
  delete require.cache[routePath];

  const state = {
    rows: rows.map((row) => ({ ...row })),
    selects: [],
    upserts: [],
    deleted: [],
    rpcs: [],
    appUsers: [],
  };
  const fakeSupabase = makeSupabase(state);
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === routePath) {
      return { createClient: () => fakeSupabase };
    }
    if (request === "../middleware/auth" && parent?.filename === routePath) {
      return {
        requireAuth: (req, _res, next) => {
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
      return { logger: { error() {}, warn() {}, info() {} } };
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
        buildNormalizedRoster: async () => (
          espnValid ? { source: "espn", slots: { starters: [], bench: [], ir: [] } } : null
        ),
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
  assert.deepEqual(res.body, {
    yahoo: { connected: false, platform: "yahoo" },
    sleeper: { connected: false, platform: "sleeper", username: null },
    espn: { connected: false, platform: "espn" },
    connections: {
      yahoo: { connected: false, platform: "yahoo" },
      sleeper: { connected: false, platform: "sleeper", username: null },
      espn: { connected: false, platform: "espn" },
    },
  });
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
