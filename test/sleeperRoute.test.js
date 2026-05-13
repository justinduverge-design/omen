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
  week: 1,
  league_key: "league-1",
  team_key: "7",
  slots: {
    starters: [
      {
        player_key: "sleeper:100",
        player_id: "100",
        name: "Starter QB",
        position: "QB",
        eligible_positions: ["QB"],
        selected_position: "QB",
        team: "KC",
        opponent: null,
        status: null,
        projected_points: 18.4,
        actual_points: null,
        image_url: "https://sleepercdn.com/content/nfl/players/100.jpg",
        is_starter: true,
      },
    ],
    bench: [],
    ir: [],
  },
  source: "sleeper",
};

function loadSleeperRouter() {
  const routePath = require.resolve("../src/routes/sleeper");
  delete require.cache[routePath];

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "../middleware/auth" && parent?.filename === routePath) {
      return {
        requireAuth: (req, _res, next) => {
          req.user = { id: "test-slops-user" };
          next();
        },
      };
    }
    if (request === "../adapters/sleeper" && parent?.filename === routePath) {
      return {
        buildNormalizedRoster: async (leagueId, username, week) => ({
          ...SAMPLE_ROSTER,
          league_key: leagueId,
          week,
          requested_username: username,
        }),
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/sleeper");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/sleeper", loadSleeperRouter());
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function request(app, path) {
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

test("GET /api/sleeper/roster requires username", async () => {
  const res = await request(buildApp(), "/api/sleeper/roster?leagueId=league-1&week=1");

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "username query param required");
});

test("GET /api/sleeper/roster requires leagueId", async () => {
  const res = await request(buildApp(), "/api/sleeper/roster?username=testuser&week=1");

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "leagueId query param required");
});

test("GET /api/sleeper/roster requires week until week detection exists", async () => {
  const res = await request(buildApp(), "/api/sleeper/roster?username=testuser&leagueId=league-1");

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "week query param required until Sleeper week detection is added");
});

test("GET /api/sleeper/roster returns normalized roster", async () => {
  const res = await request(buildApp(), "/api/sleeper/roster?username=testuser&leagueId=league-1&week=1");

  assert.equal(res.status, 200);
  assert.equal(res.body.source, "sleeper");
  assert.equal(res.body.week, 1);
  assert.equal(res.body.league_key, "league-1");
  assert.equal(res.body.slots.starters[0].player_key, "sleeper:100");
});
