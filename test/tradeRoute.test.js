"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const tradeRoutes = require("../src/routes/trade");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/trade", tradeRoutes);
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

test("POST /api/trade/compare requires send array", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: { receive: [{ name: "B", position: "WR" }] },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "send must be a non-empty array");
});

test("POST /api/trade/compare requires receive array", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: { send: [{ name: "A", position: "RB" }] },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "receive must be a non-empty array");
});

test("POST /api/trade/compare rejects non-array send", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: { send: "A", receive: [{ name: "B", position: "WR" }] },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "send must be a non-empty array");
});

test("POST /api/trade/compare caps send at 10 players", async () => {
  const app = buildApp();
  const res = await request(app, {
    body: {
      send: Array.from({ length: 11 }, (_, i) => ({ name: `A${i}`, position: "RB" })),
      receive: [{ name: "B", position: "WR" }],
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "send may contain 1-10 players");
});

test("POST /api/trade/compare returns public comparison for valid one-for-one payload", async () => {
  const app = buildApp();
  const res = await request(app, {
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
  const app = buildApp();
  const res = await request(app, {
    body: {
      send: [{ name: "Known WR", position: "WR", projected_points: 12 }],
      receive: [{ name: "Unknown RB", position: "RB" }],
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.confidence, "low");
});
