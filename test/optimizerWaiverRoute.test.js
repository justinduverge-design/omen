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

const SAMPLE_ROSTER = {
  week: 3,
  league_key: "449.l.123",
  team_key: "449.l.123.t.7",
  slots: {
    starters: [
      {
        player_key: "starter-rb",
        name: "Roster RB",
        position: "RB",
        projected_points: 8,
        status: null,
      },
      {
        player_key: "starter-wr",
        name: "Roster WR",
        position: "WR",
        projected_points: 10,
        status: null,
      },
    ],
    bench: [],
    ir: [],
  },
};

class FakeQuery {
  constructor(rows) {
    this.rows = rows;
    this.filters = [];
  }

  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }

  then(resolve, reject) {
    return Promise.resolve({
      data: this.rows.filter((row) =>
        this.filters.every(({ field, value }) => row[field] === value)
      ),
      error: null,
    }).then(resolve, reject);
  }
}

function loadOptimizerRouter(options = {}) {
  const routePath = require.resolve("../src/routes/optimizer");
  delete require.cache[routePath];

  const state = {
    rosterCalls: [],
    availableCalls: [],
    rows: options.rows || [
      {
        user_id: "test-user",
        platform: "yahoo",
        is_active: true,
        league_id: "449.l.123",
        token_secret_id: "token-secret-id",
        updated_at: "2026-05-18T00:00:00.000Z",
      },
    ],
    waiverPool: options.waiverPool || [
      {
        name: "Live RB Add",
        position: "RB",
        team: "LIV",
        projected_points: 14,
        status: null,
      },
      {
        name: "Live WR Add",
        position: "WR",
        team: "LIV",
        projected_points: 13,
        status: null,
      },
      {
        name: "Live TE Add",
        position: "TE",
        team: "LIV",
        projected_points: 8,
        status: null,
      },
      {
        name: "Live RB Depth",
        position: "RB",
        team: "LIV",
        projected_points: 10,
        status: null,
      },
      {
        name: "Live WR Depth",
        position: "WR",
        team: "LIV",
        projected_points: 11,
        status: null,
      },
      {
        name: "Live QB Stream",
        position: "QB",
        team: "LIV",
        projected_points: 17,
        status: null,
      },
    ],
  };

  const fakeSupabase = {
    from(table) {
      assert.equal(table, "platform_connections");
      return {
        select() {
          return new FakeQuery(state.rows);
        },
      };
    },
  };

  const yahoo = {
    getAvailablePlayers: async (...args) => {
      state.availableCalls.push(args);
      if (options.availableError) throw options.availableError;
      return options.rawWaivers || { ok: true };
    },
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === routePath) {
      return { createClient: () => fakeSupabase };
    }
    if (parent?.filename === routePath && request === "../middleware/auth") {
      return {
        requireAuth: options.requireAuth || ((req, _res, next) => {
          req.user = { id: "test-user" };
          next();
        }),
      };
    }
    if (parent?.filename === routePath && request === "../services/yahooAuth") {
      return {
        getAuthenticatedYahooClient: async () => ({ client: yahoo }),
      };
    }
    if (parent?.filename === routePath && request === "../services/roster") {
      return {
        fetchAndNormalizeRoster: async (_yahoo, leagueKey, week, cacheKey) => {
          state.rosterCalls.push({ leagueKey, week, cacheKey });
          return { ...SAMPLE_ROSTER, week: week || SAMPLE_ROSTER.week };
        },
        normalizeYahooWaivers: () => state.waiverPool,
      };
    }
    if (parent?.filename === routePath && request === "../services/optimizer") {
      return {
        evaluateLineup: () => [],
        findWaiverMoves: () => [],
      };
    }
    if (parent?.filename === routePath && request === "../services/agents") {
      return { getMVPMove: async () => ({}) };
    }
    if (parent?.filename === routePath && request === "../middleware/logging") {
      return { logger: { error() {}, warn() {}, info() {} } };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return { router: require("../src/routes/optimizer"), state };
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options = {}) {
  const loaded = loadOptimizerRouter(options);
  const app = express();
  app.use(express.json());
  app.use("/api/optimizer", loaded.router);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return { app, state: loaded.state };
}

async function request(app, path = "/api/optimizer/waiver?week=3") {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/optimizer/waiver rejects missing auth", async () => {
  const { app } = buildApp({
    requireAuth: (_req, res) => res.status(401).json({ error: "Missing bearer token" }),
  });

  const res = await request(app);

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Missing bearer token");
});

test("GET /api/optimizer/waiver returns live Yahoo waiver recommendations", async () => {
  const { app, state } = buildApp();
  const res = await request(app);

  assert.equal(res.status, 200);
  assert.equal(res.body.week, 3);
  assert.equal(res.body.platform, "yahoo");
  assert.equal(res.body.pool_size, 6);
  assert.equal(res.body.is_mock, false);
  assert.equal(Object.prototype.hasOwnProperty.call(res.body, "note"), false);
  assert.equal(res.body.recommendations.length, 5);
  assert.equal(res.body.recommendations[0].name, "Live RB Add");
  assert.equal(res.body.recommendations[0].available, true);
  assert.equal(
    res.body.recommendations.every((rec, index, arr) =>
      index === 0 || arr[index - 1].vorp_delta >= rec.vorp_delta
    ),
    true
  );
  assert.equal(state.rosterCalls[0].leagueKey, "449.l.123");
  assert.equal(state.availableCalls[0][0], "449.l.123");
  assert.deepEqual(state.availableCalls[0][1], { count: 50, sort: "AR" });
});

test("GET /api/optimizer/waiver returns mock fallback when availability fetch fails", async () => {
  const { app } = buildApp({
    availableError: new Error("Yahoo availability unavailable"),
  });

  const res = await request(app);

  assert.equal(res.status, 200);
  assert.equal(res.body.is_mock, true);
  assert.equal(res.body.pool_size, 0);
  assert.equal(
    res.body.note,
    "Player availability API not connected. Returning mock waiver candidates for UI integration."
  );
  assert.equal(res.body.recommendations[0].name, "Mock RB Pickup");
});

test("GET /api/optimizer/waiver returns 400 for invalid week", async () => {
  const { app } = buildApp();
  const res = await request(app, "/api/optimizer/waiver?week=19");

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "week must be between 1 and 18");
});

test("GET /api/optimizer/waiver returns 400 without usable Yahoo league", async () => {
  const { app } = buildApp({ rows: [] });
  const res = await request(app);

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Yahoo league connection required");
});
