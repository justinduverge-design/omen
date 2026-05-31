"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

class FakeQuery {
  constructor(rows, state) {
    this.rows = rows;
    this.state = state;
    this.filters = [];
    this.limitValue = null;
    this.orderSpec = null;
  }

  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }

  order(field, options) {
    this.orderSpec = { field, options };
    return this;
  }

  limit(value) {
    this.limitValue = value;
    return this;
  }

  then(resolve, reject) {
    return Promise.resolve({
      data: this.apply(),
      error: null,
    }).then(resolve, reject);
  }

  apply() {
    let result = this.rows.filter((row) =>
      this.filters.every(({ field, value }) => row[field] === value)
    );

    if (this.orderSpec) {
      const { field, options } = this.orderSpec;
      const direction = options?.ascending === false ? -1 : 1;
      result = [...result].sort((a, b) => (
        String(a[field] || "").localeCompare(String(b[field] || "")) * direction
      ));
    }

    if (this.limitValue != null) result = result.slice(0, this.limitValue);
    this.state.lastQuery = {
      filters: this.filters,
      order: this.orderSpec,
      limit: this.limitValue,
    };
    return result;
  }
}

function loadMovesRouter({ rows = [], requireAuth } = {}) {
  const routePath = require.resolve("../src/routes/moves");
  delete require.cache[routePath];

  const state = { lastQuery: null };
  const fakeSupabase = {
    from(table) {
      assert.equal(table, "moves");
      return {
        select(columns) {
          state.select = columns;
          return new FakeQuery(rows, state);
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
          req.user = { id: "user-1" };
          next();
        }),
      };
    }
    if (request === "../services/nflSchedule" && parent?.filename === routePath) {
      return { getCurrentNflWeekContext: () => ({ season: 2026, week: 1 }) };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return { router: require("../src/routes/moves"), state };
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options = {}) {
  const app = express();
  app.use(express.json());
  const loaded = loadMovesRouter(options);
  app.use("/api/moves", loaded.router);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return { app, ...loaded };
}

async function request(app, path, headers = { authorization: "Bearer valid-token" }) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/moves rejects missing auth", async () => {
  const { app } = buildApp({
    requireAuth: (_req, res) => res.status(401).json({ error: "Missing bearer token" }),
  });

  const res = await request(app, "/api/moves", {});

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Missing bearer token");
});

test("GET /api/moves returns empty history with current season default", async () => {
  const { app } = buildApp();

  const res = await request(app, "/api/moves");

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "moves-history.v1");
  assert.equal(res.body.season, 2026);
  assert.deepEqual(res.body.summary, {
    wins: 0,
    losses: 0,
    pending: 0,
    avg_effectiveness_pct: null,
    followed_count: 0,
    total_count: 0,
  });
  assert.deepEqual(res.body.moves, []);
});

test("GET /api/moves maps moves and computes W/L effectiveness summary", async () => {
  const rows = [
    {
      id: "move-1",
      user_id: "user-1",
      season: 2026,
      week_num: 8,
      move_type: "start_sit",
      headline: "Start Breece Hall over James Conner",
      reasoning: "Longer explanation",
      followed: true,
      user_stars: 4,
      outcome: "win",
      eff: 84,
      created_at: "2026-10-20T12:00:00.000Z",
    },
    {
      id: "move-2",
      user_id: "user-1",
      season: 2026,
      week_num: 7,
      move_type: "waiver_pickup",
      headline: null,
      reasoning: "Pick up the upside bench RB",
      followed: true,
      user_stars: 2,
      outcome: "loss",
      eff: 42,
      created_at: "2026-10-13T12:00:00.000Z",
    },
    {
      id: "move-3",
      user_id: "user-1",
      season: 2026,
      week_num: 6,
      move_type: "trade_suggestion",
      headline: "Shop the touchdown-dependent WR",
      followed: null,
      user_stars: null,
      outcome: "pending",
      eff: null,
      created_at: "2026-10-06T12:00:00.000Z",
    },
    {
      id: "other-user",
      user_id: "user-2",
      season: 2026,
      week_num: 8,
      headline: "Do not leak",
      followed: true,
      outcome: "win",
      eff: 100,
      created_at: "2026-10-20T12:00:00.000Z",
    },
  ];
  const { app } = buildApp({ rows });

  const res = await request(app, "/api/moves?season=2026");

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.summary, {
    wins: 1,
    losses: 1,
    pending: 1,
    avg_effectiveness_pct: 63,
    followed_count: 2,
    total_count: 3,
  });
  assert.deepEqual(res.body.moves.map((move) => move.id), ["move-1", "move-2", "move-3"]);
  assert.deepEqual(res.body.moves[0], {
    id: "move-1",
    season: 2026,
    week: 8,
    move_type: "start_sit",
    recommendation: "Start Breece Hall over James Conner",
    followed: true,
    stars: 4,
    outcome: "win",
    effectiveness_pct: 84,
    created_at: "2026-10-20T12:00:00.000Z",
  });
  assert.equal(res.body.moves[1].recommendation, "Pick up the upside bench RB");
});

test("GET /api/moves applies season filter and limit", async () => {
  const rows = [
    { id: "new-1", user_id: "user-1", season: 2026, week_num: 2, created_at: "2026-09-15T00:00:00.000Z" },
    { id: "new-2", user_id: "user-1", season: 2026, week_num: 1, created_at: "2026-09-08T00:00:00.000Z" },
    { id: "old-1", user_id: "user-1", season: 2025, week_num: 18, created_at: "2025-12-30T00:00:00.000Z" },
  ];
  const { app, state } = buildApp({ rows });

  const res = await request(app, "/api/moves?season=2026&limit=1");

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.moves.map((move) => move.id), ["new-1"]);
  assert.deepEqual(state.lastQuery.filters, [
    { field: "user_id", value: "user-1" },
    { field: "season", value: 2026 },
  ]);
  assert.equal(state.lastQuery.limit, 1);
});

test("GET /api/moves rejects invalid query params", async () => {
  const { app } = buildApp();

  const badSeason = await request(app, "/api/moves?season=soon");
  const badLimit = await request(app, "/api/moves?limit=101");

  assert.equal(badSeason.status, 400);
  assert.equal(badSeason.body.error, "season must be a positive integer");
  assert.equal(badLimit.status, 400);
  assert.equal(badLimit.body.error, "limit must be an integer between 1 and 100");
});
