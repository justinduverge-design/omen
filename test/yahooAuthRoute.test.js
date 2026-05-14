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
        return { data: { user: { id: "test-slops-user" } }, error: null };
      },
    },
    from(table) {
      assert.equal(table, "oauth_state");
      return {
        upsert(payload) {
          state.upserts.push(payload);
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };
}

function loadYahooRouter() {
  const routePath = require.resolve("../src/routes/yahoo");
  const authPath = require.resolve("../src/middleware/auth");
  delete require.cache[routePath];
  delete require.cache[authPath];

  const state = {
    authTokens: [],
    upserts: [],
    authUrlStates: [],
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
          throw new Error("callback not exercised in yahoo auth route tests");
        },
      };
    }
    if (request === "../services/yahooAuth" && parent?.filename === routePath) {
      return {
        getAuthenticatedYahooClient: async () => {
          throw new Error("roster path not exercised in yahoo auth route tests");
        },
        persistYahooTokens: async () => {
          throw new Error("callback not exercised in yahoo auth route tests");
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

function buildApp() {
  const app = express();
  const loaded = loadYahooRouter();
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
      headers: options.headers,
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
  assert.equal(state.authUrlStates[0], state.upserts[0].state);
  assert.equal(res.headers.get("location"), `https://yahoo.example/oauth?state=${state.upserts[0].state}`);
});
