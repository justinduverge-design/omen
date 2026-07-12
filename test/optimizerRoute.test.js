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

function loadOptimizerRouter(state) {
  const routePath = require.resolve("../src/routes/optimizer");
  delete require.cache[routePath];

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (parent?.filename === routePath && request === "../middleware/auth") {
      return {
        requireAuth: (req, _res, next) => {
          req.user = { id: "test-user" };
          next();
        },
      };
    }
    if (parent?.filename === routePath && request === "../services/yahooAuth") {
      return {
        getAuthenticatedYahooClient: async (userId) => {
          state.yahooUserIds.push(userId);
          return { client: { kind: "fake-yahoo-client" } };
        },
      };
    }
    if (parent?.filename === routePath && request === "../services/roster") {
      return {
        fetchAndNormalizeRoster: async (_yahoo, leagueKey, week, cacheKey) => {
          state.rosterCalls.push({ leagueKey, week, cacheKey });
          return {
            week: week || 9,
            league_key: leagueKey,
            team_key: "team-1",
            slots: {
              starters: [{ name: "Starter RB", position: "RB", projected_points: 12 }],
              bench: [{ name: "Bench WR", position: "WR", projected_points: 8 }],
              ir: [],
            },
          };
        },
      };
    }
    if (parent?.filename === routePath && request === "../services/agents") {
      return {
        getMVPMove: async (players, opts) => {
          state.mvpMoveCalls.push({ players, opts });
          return {
            move_type: "lineup",
            headline: "Start the safer RB",
            confidence: 82,
            reasoning: "Stubbed test response.",
          };
        },
      };
    }
    if (parent?.filename === routePath && request === "../services/omen") {
      return {
        buildLiveOmenMvpMoveForUser: async (userId) => {
          state.mvpMoveCalls.push({ userId });
          return {
            status: 200,
            body: {
              state: "success",
              feature: "omen_mvp_move",
              recommendation: { type: "start_sit" },
            },
          };
        },
      };
    }
    if (parent?.filename === routePath && request === "../services/optimizer") {
      return {
        evaluateLineup: () => [],
        findWaiverMoves: () => [],
      };
    }
    if (parent?.filename === routePath && request === "../middleware/logging") {
      return { logger: { error() {}, warn() {}, info() {} } };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/optimizer");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp() {
  const state = {
    yahooUserIds: [],
    rosterCalls: [],
    mvpMoveCalls: [],
  };
  const app = express();
  app.use(express.json());
  app.use("/api/optimizer", loadOptimizerRouter(state));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return { app, state };
}

async function postMvpMove(app, body) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/optimizer/mvp-move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("POST /api/optimizer/mvp-move is retired with canonical Omen route hint", async () => {
  const { app, state } = buildApp();
  const res = await postMvpMove(app, {});

  assert.equal(res.status, 410);
  assert.deepEqual(res.body, {
    error: "Legacy endpoint retired",
    code: "legacy_route_retired",
    deprecated_endpoint: "/api/optimizer/mvp-move",
    canonical_endpoint: "/api/omen/mvp-move",
  });
  assert.deepEqual(state.yahooUserIds, []);
  assert.deepEqual(state.rosterCalls, []);
  assert.deepEqual(state.mvpMoveCalls, []);
});
