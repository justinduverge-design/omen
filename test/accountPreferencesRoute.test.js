"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

class FakeProfileQuery {
  constructor(rows, state) {
    this.rows = rows;
    this.state = state;
    this.result = null;
  }

  upsert(payload, options = {}) {
    this.state.upserts.push({ payload, options });
    const existingIndex = this.rows.findIndex((row) => row.user_id === payload.user_id);
    if (existingIndex >= 0) {
      this.rows[existingIndex] = { ...this.rows[existingIndex], ...payload };
      this.result = this.rows[existingIndex];
    } else {
      this.result = { ...payload };
      this.rows.push(this.result);
    }
    return this;
  }

  select() {
    return this;
  }

  maybeSingle() {
    return Promise.resolve({ data: this.result, error: null });
  }
}

function loadAccountRouter({ profileRows = [], requireAuth } = {}) {
  const routePath = require.resolve("../src/routes/account");
  delete require.cache[routePath];

  const state = { upserts: [], appUsers: [] };
  const fakeSupabase = {
    from(table) {
      if (table !== "profiles") throw new Error(`unexpected table ${table}`);
      return new FakeProfileQuery(profileRows, state);
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
          req.user = { id: "user-1", email: "User@Example.com" };
          next();
        }),
      };
    }
    if (request === "../services/appUser" && parent?.filename === routePath) {
      return {
        ensureAppUser: async (authUser) => {
          state.appUsers.push(authUser);
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return { router: require("../src/routes/account"), state, profileRows };
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options = {}) {
  const app = express();
  app.use(express.json());
  const loaded = loadAccountRouter(options);
  app.use("/api/account", loaded.router);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return { app, ...loaded };
}

async function patch(app, path, body, headers = { authorization: "Bearer valid-token" }) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body || {}),
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("PATCH /api/account/preferences rejects missing auth", async () => {
  const { app } = buildApp({
    requireAuth: (_req, res) => res.status(401).json({ error: "Missing bearer token" }),
  });

  const res = await patch(app, "/api/account/preferences", { favorite_team: "KC" }, {});

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Missing bearer token");
});

test("PATCH /api/account/preferences upserts normalized favorite_team", async () => {
  const { app, profileRows, state } = buildApp();

  const res = await patch(app, "/api/account/preferences", { favorite_team: "kc" });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { updated: true, favorite_team: "KC" });
  assert.equal(profileRows.length, 1);
  assert.deepEqual(profileRows[0], { user_id: "user-1", favorite_team: "KC" });
  assert.deepEqual(state.appUsers, [{ id: "user-1", email: "User@Example.com" }]);
  assert.equal(state.upserts[0].options.onConflict, "user_id");
});

test("PATCH /api/account/preferences clears favorite_team with null", async () => {
  const { app, profileRows } = buildApp({
    profileRows: [{ user_id: "user-1", favorite_team: "KC" }],
  });

  const res = await patch(app, "/api/account/preferences", { favorite_team: null });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { updated: true, favorite_team: null });
  assert.equal(profileRows.length, 1);
  assert.equal(profileRows[0].favorite_team, null);
});

test("PATCH /api/account/preferences rejects non-string favorite_team", async () => {
  const { app, profileRows } = buildApp();

  const res = await patch(app, "/api/account/preferences", { favorite_team: 7 });

  assert.equal(res.status, 422);
  assert.equal(res.body.error, "favorite_team must be a string or null");
  assert.equal(profileRows.length, 0);
});
