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

function loadPlayersRouter({ source, sourceError } = {}) {
  const routePath = require.resolve("../src/routes/players");
  delete require.cache[routePath];

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "../adapters/sleeper" && parent?.filename === routePath) {
      return {
        fetchSleeperPlayers: async () => {
          if (sourceError) throw sourceError;
          return source || {
            100: {
              full_name: "Patrick Mahomes",
              position: "QB",
              team: "KC",
              active: true,
            },
            200: {
              full_name: "Tony Pollard",
              position: "RB",
              team: "TEN",
              active: true,
            },
          };
        },
      };
    }
    if (request === "../middleware/logging" && parent?.filename === routePath) {
      return { logger: { warn() {} } };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/players");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options = {}) {
  const app = express();
  app.use(express.json());
  app.use("/api/players", loadPlayersRouter(options));
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

test("GET /api/players/search returns matching autocomplete rows", async () => {
  const app = buildApp();
  const res = await request(app, "/api/players/search?position=QB&q=pat");

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, [{
    id: "sleeper:100",
    name: "Patrick Mahomes",
    position: "QB",
    team: "KC",
    projected_points: null,
  }]);
});

test("GET /api/players/search returns [] for a blank q", async () => {
  const app = buildApp();
  const res = await request(app, "/api/players/search?position=RB");

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
});

test("GET /api/players/search rejects invalid position values", async () => {
  const app = buildApp();
  const res = await request(app, "/api/players/search?position=LB&q=pat");

  assert.equal(res.status, 400);
  assert.deepEqual(res.body, {
    error: "position must be one of QB, RB, WR, TE, K, DEF",
    code: "player_search_invalid_position",
  });
});

test("GET /api/players/search returns source-unavailable envelope on fetch failure", async () => {
  const app = buildApp({ sourceError: new Error("Sleeper unavailable") });
  const res = await request(app, "/api/players/search?position=QB&q=pat");

  assert.equal(res.status, 503);
  assert.deepEqual(res.body, {
    error: "Player search source unavailable",
    code: "player_search_source_unavailable",
  });
});
