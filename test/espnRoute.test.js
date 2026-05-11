"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

const SAMPLE_ROSTER = {
  week: 1,
  league_key: "12345",
  team_key: "9",
  slots: {
    starters: [
      {
        player_key: "espn:1001",
        player_id: "1001",
        name: "Starter QB",
        position: "QB",
        eligible_positions: ["QB"],
        selected_position: "QB",
        team: "KC",
        opponent: null,
        status: null,
        projected_points: 18.7,
        actual_points: 21.3,
        image_url: "https://img.example/qb.png",
        is_starter: true,
        espn_id: "1001",
        yahoo_id: null,
        gsis_id: null,
      },
    ],
    bench: [],
    ir: [],
  },
  source: "espn",
};

function loadEspnRouter() {
  const routePath = require.resolve("../src/routes/espn");
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
    if (request === "../adapters/espn" && parent?.filename === routePath) {
      return {
        buildNormalizedRoster: async (leagueId, _espnS2, _swid, week) => ({
          ...SAMPLE_ROSTER,
          league_key: String(leagueId),
          week,
        }),
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/espn");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/espn", loadEspnRouter());
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

test("GET /api/espn/roster requires leagueId", async () => {
  const res = await request(buildApp(), "/api/espn/roster?week=1&espn_s2=cookie&swid={swid}");

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "leagueId query param required");
});

test("GET /api/espn/roster requires week", async () => {
  const res = await request(buildApp(), "/api/espn/roster?leagueId=12345&espn_s2=cookie&swid={swid}");

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "week query param required");
});

test("GET /api/espn/roster requires espn_s2", async () => {
  const res = await request(buildApp(), "/api/espn/roster?leagueId=12345&week=1&swid={swid}");

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "espn_s2 query param required");
});

test("GET /api/espn/roster requires swid", async () => {
  const res = await request(buildApp(), "/api/espn/roster?leagueId=12345&week=1&espn_s2=cookie");

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "swid query param required");
});

test("GET /api/espn/roster returns normalized roster", async () => {
  const res = await request(buildApp(), "/api/espn/roster?leagueId=12345&week=1&espn_s2=cookie&swid={swid}");

  assert.equal(res.status, 200);
  assert.equal(res.body.source, "espn");
  assert.equal(res.body.week, 1);
  assert.equal(res.body.league_key, "12345");
  assert.equal(res.body.slots.starters[0].player_key, "espn:1001");
});
