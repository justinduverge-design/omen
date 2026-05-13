"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

function loadTradeRouterWithAuth(requireAuth) {
  const routePath = require.resolve("../src/routes/trade");
  delete require.cache[routePath];

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "../middleware/auth" && parent?.filename === routePath) {
      return { requireAuth };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/trade");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(requireAuth) {
  const app = express();
  app.use(express.json());
  app.use("/api/trade", loadTradeRouterWithAuth(requireAuth));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function request(app, { body, headers = {} } = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/trade/compare`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function authRequired(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  if (auth !== "Bearer valid-token") {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.user = { id: "test-user" };
  return next();
}

test("POST /api/trade/compare rejects missing authorization", async () => {
  const app = buildApp(authRequired);
  const res = await request(app, {
    body: { send: [{ name: "A", position: "RB" }], receive: [{ name: "B", position: "WR" }] },
  });

  assert.equal(res.status, 401);
});

test("POST /api/trade/compare rejects invalid authorization", async () => {
  const app = buildApp(authRequired);
  const res = await request(app, {
    headers: { authorization: "Bearer bad-token" },
    body: { send: [{ name: "A", position: "RB" }], receive: [{ name: "B", position: "WR" }] },
  });

  assert.equal(res.status, 401);
});

test("POST /api/trade/compare requires send array", async () => {
  const app = buildApp(authRequired);
  const res = await request(app, {
    headers: { authorization: "Bearer valid-token" },
    body: { receive: [{ name: "B", position: "WR" }] },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "send must be a non-empty array");
});

test("POST /api/trade/compare requires receive array", async () => {
  const app = buildApp(authRequired);
  const res = await request(app, {
    headers: { authorization: "Bearer valid-token" },
    body: { send: [{ name: "A", position: "RB" }] },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "receive must be a non-empty array");
});

test("POST /api/trade/compare rejects non-array send", async () => {
  const app = buildApp(authRequired);
  const res = await request(app, {
    headers: { authorization: "Bearer valid-token" },
    body: { send: "A", receive: [{ name: "B", position: "WR" }] },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "send must be a non-empty array");
});

test("POST /api/trade/compare caps send at 10 players", async () => {
  const app = buildApp(authRequired);
  const res = await request(app, {
    headers: { authorization: "Bearer valid-token" },
    body: {
      send: Array.from({ length: 11 }, (_, i) => ({ name: `A${i}`, position: "RB" })),
      receive: [{ name: "B", position: "WR" }],
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "send may contain 1-10 players");
});

test("POST /api/trade/compare returns comparison for valid one-for-one payload", async () => {
  const app = buildApp(authRequired);
  const res = await request(app, {
    headers: { authorization: "Bearer valid-token" },
    body: {
      send: [{ name: "Bench RB", position: "RB", projected_points: 10 }],
      receive: [{ name: "Starter WR", position: "WR", projected_points: 14 }],
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.net_value, 2.5); // recalibrated 2026-05-13
  assert.equal(res.body.verdict, "accept");
});

test("POST /api/trade/compare handles missing projections with low confidence", async () => {
  const app = buildApp(authRequired);
  const res = await request(app, {
    headers: { authorization: "Bearer valid-token" },
    body: {
      send: [{ name: "Known WR", position: "WR", projected_points: 12 }],
      receive: [{ name: "Unknown RB", position: "RB" }],
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.confidence, "low");
});
