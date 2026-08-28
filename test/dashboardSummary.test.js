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
        // The six user-facing gates now call suppressLiveFootballData(). Mirroring the
        // same flag keeps these cases testing the suppressed path, which is what
        // OMEN_WEEK1_PREVIEW=false restores in production.
        suppressLiveFootballData: () => offSeason,
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
      { id: "test-user" },
    ],
    profileRows: [
      { user_id: "test-user", favorite_team: "KC" },
    ],
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "dashboard-summary.v1");
  assert.equal(res.body.is_mock, false);
  assert.deepEqual(res.body.user, { favorite_team: "KC" });
  assert.equal(res.body.subscription, undefined);
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
    mode: "free",
    status: "ready",
  });
  assert.deepEqual(res.body.tools.waiver_wire, {
    available: true,
    mode: "free",
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
      { id: "test-user" },
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
    mode: "free",
    status: "pending_live_engine",
  });
  assert.deepEqual(res.body.tools.waiver_wire, {
    available: false,
    mode: "free",
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
      { id: "test-user" },
    ],
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.tools.omen_of_the_week, {
    available: false,
    mode: "free",
    status: "pending_live_engine",
  });
  assert.deepEqual(res.body.tools.waiver_wire, {
    available: false,
    mode: "free",
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
      { id: "test-user" },
    ],
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.tools.omen_of_the_week, {
    available: true,
    mode: "free",
    status: "ready",
  });
  assert.deepEqual(res.body.tools.waiver_wire, {
    available: true,
    mode: "free",
    status: "ready",
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
      { id: "test-user" },
    ],
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.tools.omen_of_the_week, {
    available: false,
    mode: "free",
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
      { id: "test-user" },
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
      { id: "test-user" },
    ],
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.tools.omen_of_the_week, {
    available: true,
    mode: "free",
    status: "ready",
  });
  assert.deepEqual(res.body.tools.waiver_wire, {
    available: true,
    mode: "free",
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
      { id: "test-user" },
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

test("GET /api/dashboard/summary omits subscription entirely now that Omen is free", async () => {
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
      { id: "test-user" },
    ],
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.subscription, undefined);
});

// P1-DraftAssistantSideline (2026-08-16). Draft Assistant is cut from 1.0 and
// sidelined to the 2027 season (facts-of-record #9). The tool entry was
// hardcoded `available: true, status: "ready"`, so every signed-in user was
// told a feature exists that must not appear in the advertised tool list.
test("GET /api/dashboard/summary does not advertise Draft Assistant", async () => {
  const app = buildApp({
    platformRows: [
      {
        user_id: "test-user",
        platform: "sleeper",
        is_active: true,
        platform_username: "sleepy",
      },
    ],
    userRows: [{ id: "test-user" }],
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.tools.draft_assistant, undefined,
    "draft_assistant must not appear in the advertised tool list");
  assert.ok(!Object.keys(res.body.tools).some((key) => /draft/i.test(key)),
    "no tool key may reference the draft");
  // The tools that ARE in 1.0 must be untouched by the removal.
  assert.equal(res.body.tools.trade_analyzer.status, "ready");
  assert.equal(res.body.tools.start_sit.status, "ready");
  assert.ok(res.body.tools.omen_of_the_week);
  assert.ok(res.body.tools.waiver_wire);
});
