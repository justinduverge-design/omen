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

  maybeSingle() {
    return Promise.resolve({
      data: this.applyFilters()[0] || null,
      error: null,
    });
  }

  then(resolve, reject) {
    return Promise.resolve({
      data: this.applyFilters(),
      error: null,
    }).then(resolve, reject);
  }

  applyFilters() {
    return this.rows.filter((row) =>
      this.filters.every(({ field, value }) => row[field] === value)
    );
  }
}

function loadDashboardRouter({
  platformRows = [],
  profileRows = [],
  subscriptionRows = [],
  userRows = [],
  requireAuth,
  context,
  offSeason = false,
  sleeperAdapter,
  yahooAdapter,
  espnAdapter,
  getAuthenticatedYahooClient,
  getAuthenticatedEspnCredentials,
} = {}) {
  const routePath = require.resolve("../src/routes/dashboard");
  delete require.cache[routePath];

  const fakeSupabase = {
    from(table) {
      return {
        select() {
          if (table === "platform_connections") return new FakeQuery(platformRows);
          if (table === "profiles") return new FakeQuery(profileRows);
          if (table === "subscriptions") return new FakeQuery(subscriptionRows);
          if (table === "users") return new FakeQuery(userRows);
          throw new Error(`unexpected table ${table}`);
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
        requireAuth: requireAuth || ((req, _res, next) => {
          req.user = { id: "test-user" };
          next();
        }),
      };
    }
    if (request === "../middleware/logging" && parent?.filename === routePath) {
      return { logger: { warn() {}, error() {}, info() {} } };
    }
    if (request === "../services/nflSchedule" && parent?.filename === routePath) {
      return {
        getCurrentNflWeekContext: () => context || {
          season: 2026,
          week: 1,
          season_type: "regular",
        },
        isOffSeason: () => offSeason,
      };
    }
    if (request === "../services/yahooAuth" && parent?.filename === routePath) {
      return {
        getAuthenticatedYahooClient: getAuthenticatedYahooClient || (async () => ({
          client: {
            getMyTeamKey: async () => "449.l.123.t.7",
          },
        })),
      };
    }
    if (request === "../services/espnAuth" && parent?.filename === routePath) {
      return {
        getAuthenticatedEspnCredentials: getAuthenticatedEspnCredentials || (async () => ({
          espn_s2: "espn-cookie-secret",
          swid: "{swid-secret}",
        })),
      };
    }
    if (request === "../adapters/sleeper" && parent?.filename === routePath) {
      return sleeperAdapter || {
        fetchSleeperUser: async () => ({ user_id: "sleeper-user-1" }),
        fetchSleeperLastResult: async () => null,
      };
    }
    if (request === "../adapters/yahoo" && parent?.filename === routePath) {
      return yahooAdapter || {
        fetchYahooLastResult: async () => null,
      };
    }
    if (request === "../adapters/espn" && parent?.filename === routePath) {
      return espnAdapter || {
        fetchEspnLastResult: async () => null,
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/dashboard");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options = {}) {
  const app = express();
  app.use("/api/dashboard", loadDashboardRouter(options));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function request(app, path, options = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: options.headers,
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/dashboard/summary rejects missing auth", async () => {
  const app = buildApp({
    requireAuth: (_req, res) => res.status(401).json({ error: "Missing bearer token" }),
  });

  const res = await request(app, "/api/dashboard/summary");

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Missing bearer token");
});

test("GET /api/dashboard/summary returns platform-aware tool summary", async () => {
  const app = buildApp({
    platformRows: [
      {
        user_id: "test-user",
        platform: "yahoo",
        is_active: true,
        league_id: "449.l.123",
        token_secret_id: "secret-id",
        token_expires_at: "2999-01-01T00:00:00.000Z",
      },
      {
        user_id: "test-user",
        platform: "sleeper",
        is_active: true,
        platform_username: "sleepy",
      },
    ],
    userRows: [
      { id: "test-user", is_subscribed: true },
    ],
    profileRows: [
      { user_id: "test-user", favorite_team: "KC" },
    ],
    subscriptionRows: [
      {
        user_id: "test-user",
        plan: "monthly",
        status: "active",
        subscribed_at: "2026-05-24T12:00:00.000Z",
        canceled_at: null,
        expires_at: "2026-06-24T12:00:00.000Z",
        stripe_customer_id: "cus_test",
      },
    ],
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "dashboard-summary.v1");
  assert.equal(res.body.is_mock, false);
  assert.deepEqual(res.body.user, { favorite_team: "KC" });
  assert.deepEqual(res.body.subscription, {
    is_subscribed: true,
    status: "active",
    plan: "monthly",
    subscribed_at: "2026-05-24T12:00:00.000Z",
    canceled_at: null,
    expires_at: "2026-06-24T12:00:00.000Z",
    trial_ends_at: null,
    current_period_end: "2026-06-24T12:00:00.000Z",
    can_manage_billing: true,
  });
  assert.deepEqual(res.body.platforms.yahoo, {
    connected: true,
    league_id: "449.l.123",
    lastResult: null,
    lastGameId: null,
    lastGameKickoff: null,
  });
  assert.deepEqual(res.body.platforms.sleeper, {
    connected: true,
    username: "sleepy",
    lastResult: null,
    lastGameId: null,
    lastGameKickoff: null,
  });
  assert.deepEqual(res.body.platforms.espn, {
    connected: false,
    lastResult: null,
    lastGameId: null,
    lastGameKickoff: null,
  });
  assert.deepEqual(res.body.tools.omen_of_the_week, {
    available: true,
    mode: "pro",
    status: "ready",
  });
  assert.deepEqual(res.body.tools.waiver_wire, {
    available: true,
    mode: "pro",
    status: "ready",
  });
});

test("GET /api/dashboard/summary marks expired Yahoo OAuth token for reconnect UI", async () => {
  const app = buildApp({
    platformRows: [
      {
        user_id: "test-user",
        platform: "yahoo",
        is_active: true,
        league_id: "449.l.123",
        token_secret_id: "expired-secret-id",
        token_expires_at: "2000-01-01T00:00:00.000Z",
      },
    ],
    userRows: [
      { id: "test-user", is_subscribed: true },
    ],
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.platforms.yahoo, {
    connected: false,
    league_id: "449.l.123",
    status: "token_expired",
    lastResult: null,
    lastGameId: null,
    lastGameKickoff: null,
  });
  assert.deepEqual(res.body.tools.omen_of_the_week, {
    available: false,
    mode: "pro",
    status: "pending_live_engine",
  });
  assert.deepEqual(res.body.tools.waiver_wire, {
    available: false,
    mode: "pro",
    status: "needs_platform",
  });
});

test("GET /api/dashboard/summary marks Omen pending and waiver needing platform without usable Omen context", async () => {
  const app = buildApp({
    platformRows: [
      {
        user_id: "test-user",
        platform: "sleeper",
        is_active: true,
        platform_username: "sleepy",
      },
    ],
    userRows: [
      { id: "test-user", is_subscribed: true },
    ],
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.tools.omen_of_the_week, {
    available: false,
    mode: "pro",
    status: "pending_live_engine",
  });
  assert.deepEqual(res.body.tools.waiver_wire, {
    available: false,
    mode: "pro",
    status: "needs_platform",
  });
});

test("GET /api/dashboard/summary marks Omen ready for subscribed Sleeper users with usable league context", async () => {
  const app = buildApp({
    platformRows: [
      {
        user_id: "test-user",
        platform: "sleeper",
        is_active: true,
        league_id: "sleeper-league-1",
        platform_username: "sleepy",
      },
    ],
    userRows: [
      { id: "test-user", is_subscribed: true },
    ],
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.tools.omen_of_the_week, {
    available: true,
    mode: "pro",
    status: "ready",
  });
  assert.deepEqual(res.body.tools.waiver_wire, {
    available: false,
    mode: "pro",
    status: "needs_platform",
  });
});

test("GET /api/dashboard/summary marks Omen off-season for subscribed users with usable league context", async () => {
  const app = buildApp({
    offSeason: true,
    platformRows: [
      {
        user_id: "test-user",
        platform: "sleeper",
        is_active: true,
        league_id: "sleeper-league-1",
        platform_username: "sleepy",
      },
    ],
    userRows: [
      { id: "test-user", is_subscribed: true },
    ],
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.tools.omen_of_the_week, {
    available: false,
    mode: "pro",
    status: "off_season",
  });
});

test("GET /api/dashboard/summary applies Sleeper last-result enrichment", async () => {
  const app = buildApp({
    context: { season: 2026, week: 8, season_type: "regular" },
    platformRows: [
      {
        user_id: "test-user",
        platform: "sleeper",
        is_active: true,
        league_id: "sleeper-league-1",
        platform_username: "sleepy",
        platform_user_id: "sleeper-user-1",
      },
    ],
    userRows: [
      { id: "test-user", is_subscribed: true },
    ],
    sleeperAdapter: {
      fetchSleeperLastResult: async (opts) => {
        assert.deepEqual(opts, {
          leagueId: "sleeper-league-1",
          userId: "sleeper-user-1",
          season: 2026,
          week: 7,
        });
        return {
          lastResult: "W",
          lastGameId: "sleeper-league-1:7:3",
          lastGameKickoff: null,
        };
      },
    },
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.platforms.sleeper, {
    connected: true,
    username: "sleepy",
    lastResult: "W",
    lastGameId: "sleeper-league-1:7:3",
    lastGameKickoff: null,
  });
});

test("GET /api/dashboard/summary marks Omen ready for subscribed ESPN users with usable league context", async () => {
  const app = buildApp({
    platformRows: [
      {
        user_id: "test-user",
        platform: "espn",
        is_active: true,
        league_id: "espn-league-1",
        espn_secret_id: "espn-secret",
        swid_secret_id: "swid-secret",
      },
    ],
    userRows: [
      { id: "test-user", is_subscribed: true },
    ],
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.tools.omen_of_the_week, {
    available: true,
    mode: "pro",
    status: "ready",
  });
  assert.deepEqual(res.body.platforms.espn, {
    connected: true,
    lastResult: null,
    lastGameId: null,
    lastGameKickoff: null,
  });
});

test("GET /api/dashboard/summary doesn't hang when a platform last-result lookup never resolves", async () => {
  const app = buildApp({
    context: { season: 2026, week: 8, season_type: "regular" },
    platformRows: [
      {
        user_id: "test-user",
        platform: "sleeper",
        is_active: true,
        league_id: "sleeper-league-1",
        platform_username: "sleepy",
        platform_user_id: "sleeper-user-1",
      },
    ],
    userRows: [
      { id: "test-user", is_subscribed: true },
    ],
    sleeperAdapter: {
      fetchSleeperLastResult: () => new Promise(() => {}),
    },
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.platforms.sleeper, {
    connected: true,
    username: "sleepy",
    lastResult: null,
    lastGameId: null,
    lastGameKickoff: null,
  });
});

test("GET /api/dashboard/summary marks Omen pro-gated when platform exists but user is not subscribed", async () => {
  const app = buildApp({
    platformRows: [
      {
        user_id: "test-user",
        platform: "yahoo",
        is_active: true,
        league_id: "449.l.123",
        token_secret_id: "secret-id",
        token_expires_at: "2999-01-01T00:00:00.000Z",
      },
    ],
    userRows: [
      { id: "test-user", is_subscribed: false },
    ],
    subscriptionRows: [
      {
        user_id: "test-user",
        plan: "monthly",
        status: "canceled",
        subscribed_at: "2026-05-01T12:00:00.000Z",
        canceled_at: "2026-05-20T12:00:00.000Z",
        expires_at: null,
        stripe_customer_id: "cus_test",
      },
    ],
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.tools.omen_of_the_week, {
    available: false,
    mode: "pro",
    status: "needs_subscription",
  });
  assert.deepEqual(res.body.subscription, {
    is_subscribed: false,
    status: "canceled",
    plan: "monthly",
    subscribed_at: "2026-05-01T12:00:00.000Z",
    canceled_at: "2026-05-20T12:00:00.000Z",
    expires_at: null,
    trial_ends_at: null,
    current_period_end: null,
    can_manage_billing: true,
  });
});
