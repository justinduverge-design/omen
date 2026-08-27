"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

class FakeMovesQuery {
  constructor(rows, state) {
    this.rows = rows;
    this.state = state;
    this.result = null;
  }

  upsert(payload, options = {}) {
    this.state.upserts.push({ payload, options });
    const existingIndex = this.rows.findIndex((row) =>
      row.user_id === payload.user_id
      && row.week_num === payload.week_num
      && row.season === payload.season
    );

    if (existingIndex >= 0) {
      this.rows[existingIndex] = { ...this.rows[existingIndex], ...payload };
      this.result = this.rows[existingIndex];
    } else {
      this.result = { id: `move-${this.rows.length + 1}`, ...payload };
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

function loadOmenRouter({ moveRows = [], requireAuth } = {}) {
  const routePath = require.resolve("../src/routes/omen");
  delete require.cache[routePath];

  const state = { upserts: [], appUsers: [] };
  const fakeSupabase = {
    from(table) {
      if (table !== "moves") throw new Error(`unexpected table ${table}`);
      return new FakeMovesQuery(moveRows, state);
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
          if (!req.headers.authorization) {
            return _res.status(401).json({ error: "Missing bearer token" });
          }
          req.user = { id: "user-1", email: "user@example.com" };
          return next();
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
    return { router: require("../src/routes/omen"), state, moveRows };
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options = {}) {
  const app = express();
  app.use(express.json());
  const loaded = loadOmenRouter(options);
  app.use("/api/omen", loaded.router);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return { app, ...loaded };
}

async function post(app, path, body, headers = { authorization: "Bearer valid-token" }) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "POST",
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

test("POST /api/omen/feedback rejects missing auth", async () => {
  const { app } = buildApp();

  const res = await post(app, "/api/omen/feedback", {
    followed: true,
    stars: 4,
    note: "Worked",
    week: 1,
    season: 2026,
  }, {});

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Missing bearer token");
});

test("POST /api/omen/feedback records a new move feedback row", async () => {
  const { app, moveRows, state } = buildApp();

  const res = await post(app, "/api/omen/feedback", {
    followed: true,
    stars: 4,
    note: "Changed lineup last minute, worked out",
    week: 1,
    season: 2026,
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { recorded: true, move_id: "move-1" });
  assert.equal(moveRows.length, 1);
  assert.deepEqual(moveRows[0], {
    id: "move-1",
    user_id: "user-1",
    week_num: 1,
    season: 2026,
    followed: true,
    user_stars: 4,
    user_note: "Changed lineup last minute, worked out",
    scoring_contract_required: true,
  });
  assert.deepEqual(state.appUsers, [{ id: "user-1", email: "user@example.com" }]);
  assert.equal(state.upserts[0].options.onConflict, "user_id,week_num,season");
});

test("POST /api/omen/feedback is idempotent for the same week and season", async () => {
  const { app, moveRows } = buildApp({
    moveRows: [{
      id: "move-existing",
      user_id: "user-1",
      week_num: 1,
      season: 2026,
      followed: false,
      user_stars: null,
      user_note: null,
    }],
  });

  const first = await post(app, "/api/omen/feedback", {
    followed: true,
    stars: 5,
    note: "First note",
    week: 1,
    season: 2026,
  });
  const second = await post(app, "/api/omen/feedback", {
    followed: false,
    stars: 2,
    note: "Corrected later",
    week: 1,
    season: 2026,
  });

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.deepEqual(second.body, { recorded: true, move_id: "move-existing" });
  assert.equal(moveRows.length, 1);
  assert.deepEqual(moveRows[0], {
    id: "move-existing",
    user_id: "user-1",
    week_num: 1,
    season: 2026,
    followed: false,
    user_stars: 2,
    user_note: "Corrected later",
    scoring_contract_required: true,
  });
});

test("POST /api/omen/feedback rejects invalid feedback shape", async () => {
  const { app, moveRows } = buildApp();

  const res = await post(app, "/api/omen/feedback", {
    followed: true,
    stars: 6,
    note: "Too many stars",
    week: 1,
    season: 2026,
  });

  assert.equal(res.status, 422);
  assert.equal(res.body.error, "stars must be an integer from 1 to 5 or null");
  assert.equal(moveRows.length, 0);
});
