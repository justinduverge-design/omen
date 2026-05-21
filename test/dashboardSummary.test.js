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

function loadDashboardRouter({ platformRows = [], userRows = [], requireAuth } = {}) {
  const routePath = require.resolve("../src/routes/dashboard");
  delete require.cache[routePath];

  const fakeSupabase = {
    from(table) {
      return {
        select() {
          if (table === "platform_connections") return new FakeQuery(platformRows);
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
  });

  const res = await request(app, "/api/dashboard/summary", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "dashboard-summary.v1");
  assert.equal(res.body.is_mock, false);
  assert.deepEqual(res.body.platforms.yahoo, {
    connected: true,
    league_id: "449.l.123",
  });
  assert.deepEqual(res.body.platforms.sleeper, {
    connected: true,
    username: "sleepy",
  });
  assert.deepEqual(res.body.platforms.espn, { connected: false });
  assert.deepEqual(res.body.tools.omen_of_the_week, {
    available: true,
    mode: "live",
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
  });
  assert.deepEqual(res.body.tools.omen_of_the_week, {
    available: false,
    mode: "live",
    status: "pending_live_engine",
  });
  assert.deepEqual(res.body.tools.waiver_wire, {
    available: false,
    mode: "pro",
    status: "needs_platform",
  });
});

test("GET /api/dashboard/summary marks Omen pending and waiver needing platform without usable Yahoo", async () => {
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
    mode: "live",
    status: "pending_live_engine",
  });
  assert.deepEqual(res.body.tools.waiver_wire, {
    available: false,
    mode: "pro",
    status: "needs_platform",
  });
});
