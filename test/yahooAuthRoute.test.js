"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
delete process.env.REDIS_URL;
delete process.env.REDIS_TOKEN;

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

function makeSupabase(state) {
  return {
    auth: {
      async getUser(token) {
        state.authTokens.push(token);
        if (token !== "valid-token") {
          return { data: { user: null }, error: new Error("invalid token") };
        }
        return { data: { user: { id: "test-slops-user", email: "user@example.com" } }, error: null };
      },
    },
    from(table) {
      assert.equal(table, "oauth_state");
      return {
        upsert(payload) {
          state.upserts.push(payload);
          return Promise.resolve({ data: null, error: null });
        },
        select() {
          const query = {
            filters: [],
            eq(field, value) {
              this.filters.push({ field, value });
              return this;
            },
            maybeSingle() {
              const row = state.oauthRows.find((candidate) =>
                this.filters.every(({ field, value }) => candidate[field] === value)
              );
              return Promise.resolve({ data: row || null, error: null });
            },
          };
          return query;
        },
        delete() {
          const query = {
            filters: [],
            eq(field, value) {
              this.filters.push({ field, value });
              return this;
            },
            then(resolve, reject) {
              const deleted = state.oauthRows.filter((candidate) =>
                this.filters.every(({ field, value }) => candidate[field] === value)
              );
              state.deletes.push(...deleted);
              state.oauthRows = state.oauthRows.filter((candidate) => !deleted.includes(candidate));
              return Promise.resolve({ data: null, error: null }).then(resolve, reject);
            },
          };
          return query;
        },
      };
    },
  };
}

function loadYahooRouter({ oauthRows = [] } = {}) {
  const routePath = require.resolve("../src/routes/yahoo");
  const authPath = require.resolve("../src/middleware/auth");
  delete require.cache[routePath];
  delete require.cache[authPath];

  const state = {
    authTokens: [],
    upserts: [],
    oauthRows: oauthRows.map((row) => ({ ...row })),
    deletes: [],
    authUrlStates: [],
    exchanges: [],
    persists: [],
    appUsers: [],
  };
  const fakeSupabase = makeSupabase(state);
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js") {
      return { createClient: () => fakeSupabase };
    }
    if (request === "../middleware/logging" && (parent?.filename === routePath || parent?.filename === authPath)) {
      return { logger: { error() {}, warn() {}, info() {} } };
    }
    if (request === "../middleware/yahooOAuth" && parent?.filename === routePath) {
      return {
        getYahooAuthUrl: (stateValue) => {
          state.authUrlStates.push(stateValue);
          return `https://yahoo.example/oauth?state=${stateValue}`;
        },
        exchangeYahooCode: async () => {
          state.exchanges.push("code");
          return {
            access_token: "yahoo-access-token",
            refresh_token: "yahoo-refresh-token",
            expires_in: 3600,
          };
        },
      };
    }
    if (request === "../services/yahooAuth" && parent?.filename === routePath) {
      return {
        getAuthenticatedYahooClient: async () => {
          throw new Error("roster path not exercised in yahoo auth route tests");
        },
        persistYahooTokens: async (userId, tokens, leagueId) => {
          state.persists.push({ userId, tokens, leagueId });
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
    if (request === "../adapters/yahoo" && parent?.filename === routePath) {
      return {
        buildNormalizedRoster: async () => {
          throw new Error("roster path not exercised in yahoo auth route tests");
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const router = require("../src/routes/yahoo");
    return { router, state };
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options) {
  const app = express();
  const loaded = loadYahooRouter(options);
  app.use(express.json());
  app.use("/api/yahoo", loaded.router);
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
      headers: {
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      redirect: "manual",
    });
    const contentType = res.headers.get("content-type") || "";
    return {
      status: res.status,
      headers: res.headers,
      body: contentType.includes("application/json") ? await res.json() : await res.text(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/yahoo/auth rejects missing authorization", async () => {
  const { app, state } = buildApp();
  const res = await request(app, "/api/yahoo/auth");

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Missing bearer token");
  assert.deepEqual(state.upserts, []);
  assert.deepEqual(state.appUsers, []);
});

test("GET /api/yahoo/auth uses authenticated user id for oauth_state", async () => {
  const { app, state } = buildApp();
  const res = await request(app, "/api/yahoo/auth?leagueId=league-1", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 302);
  assert.equal(state.authTokens[0], "valid-token");
  assert.equal(state.upserts.length, 1);
  assert.equal(state.upserts[0].platform, "yahoo");
  assert.equal(state.upserts[0].user_id, "test-slops-user");
  assert.equal(state.upserts[0].verifier, "league-1");
  assert.deepEqual(state.appUsers, [{ id: "test-slops-user", email: "user@example.com" }]);
  assert.equal(state.authUrlStates[0], state.upserts[0].state);
  assert.equal(res.headers.get("location"), `https://yahoo.example/oauth?state=${state.upserts[0].state}`);
});

test("POST /api/yahoo/auth rejects missing authorization", async () => {
  const { app, state } = buildApp();
  const res = await request(app, "/api/yahoo/auth", { method: "POST" });

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Missing bearer token");
  assert.deepEqual(state.upserts, []);
  assert.deepEqual(state.appUsers, []);
});

test("POST /api/yahoo/auth returns auth URL and bootstraps app user", async () => {
  const { app, state } = buildApp();
  const res = await request(app, "/api/yahoo/auth", {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: { leagueId: "league-1" },
  });

  assert.equal(res.status, 200);
  assert.equal(state.authTokens[0], "valid-token");
  assert.equal(state.upserts.length, 1);
  assert.equal(state.upserts[0].platform, "yahoo");
  assert.equal(state.upserts[0].user_id, "test-slops-user");
  assert.equal(state.upserts[0].verifier, "league-1");
  assert.deepEqual(state.appUsers, [{ id: "test-slops-user", email: "user@example.com" }]);
  assert.deepEqual(res.body, { url: `https://yahoo.example/oauth?state=${state.upserts[0].state}` });
});

test("GET /api/yahoo/callback redirects back to account connect onboarding", async () => {
  const { app, state } = buildApp({
    oauthRows: [{
      state: "valid-state",
      platform: "yahoo",
      user_id: "test-slops-user",
      verifier: "league-1",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    }],
  });
  const res = await request(app, "/api/yahoo/callback?code=code&state=valid-state");

  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "http://localhost:3000/account/connect?connected=yahoo");
  assert.equal(state.exchanges.length, 1);
  assert.deepEqual(state.persists[0], {
    userId: "test-slops-user",
    tokens: {
      access_token: "yahoo-access-token",
      refresh_token: "yahoo-refresh-token",
      expires_in: 3600,
    },
    leagueId: "league-1",
  });
  assert.equal(state.deletes[0].state, "valid-state");
});
