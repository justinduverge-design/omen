"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/start-sit", require("../src/routes/startSit"));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function request(app, body) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/start-sit`, {
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

test("POST /api/start-sit returns a ranked recommendation for valid players", async () => {
  const app = buildApp();
  const res = await request(app, {
    playerA: { name: "Josh Allen", position: "QB", projected_points: 18.2 },
    playerB: { name: "Tyreek Hill", position: "WR", projected_points: 21.7 },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.winner, "B");
  assert.equal(res.body.pointsDelta, 3.5);
  assert.equal(res.body.recommendation, "Start Tyreek Hill over Josh Allen");
  assert.ok(Object.prototype.hasOwnProperty.call(res.body, "explanation"));
});

test("POST /api/start-sit returns 400 when a required field is missing", async () => {
  const app = buildApp();
  const res = await request(app, {
    playerA: { name: "Josh Allen", position: "QB", projected_points: 18.2 },
    playerB: { name: "Tyreek Hill", position: "WR" },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "playerB.projected_points must be a number");
});
