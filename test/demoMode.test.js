"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");

const { buildDemoModeResponse } = require("../src/services/demoMode");
const demoRoutes = require("../src/routes/demo");

function buildApp() {
  const app = express();
  app.use("/api/demo", demoRoutes);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function request(app, { headers = {} } = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/demo`, { headers });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("buildDemoModeResponse returns deterministic sample data with explicit demo labeling", () => {
  const now = new Date("2026-06-19T12:00:00.000Z");
  const first = buildDemoModeResponse(now);
  const second = buildDemoModeResponse(now);

  assert.deepEqual(first, second);
  assert.equal(first.contract_version, "corvus-demo.v1");
  assert.equal(first.mode, "demo");
  assert.equal(first.is_demo, true);
  assert.equal(first.is_live, false);
  assert.equal(first.is_mock, false);
  assert.equal(first.demo_notice.deterministic_fixture, true);
  assert.equal(first.demo_notice.requires_explicit_live_switch, true);
  assert.deepEqual(first.telemetry, {
    analytics_eligible: false,
    llm_training_eligible: false,
  });
});

test("demo roster follows the normalized roster contract and produces a recommendation", () => {
  const response = buildDemoModeResponse(new Date("2026-06-19T12:00:00.000Z"));
  const { roster, omen } = response;

  assert.equal(roster.source, "demo_fixture");
  assert.ok(roster.slots.starters.length > 0);
  assert.ok(roster.slots.bench.length > 0);
  assert.ok(roster.slots.ir.length > 0);

  for (const player of [...roster.slots.starters, ...roster.slots.bench, ...roster.slots.ir]) {
    assert.equal(typeof player.player_key, "string");
    assert.equal(typeof player.name, "string");
    assert.equal(typeof player.position, "string");
    assert.equal(Array.isArray(player.eligible_positions), true);
    assert.equal(Number.isFinite(player.projected_points), true);
  }

  assert.equal(omen.state, "success");
  assert.equal(omen.mode, "demo");
  assert.equal(omen.recommendation.title, "Start Sample RB Breakout over Sample RB Starter");
  assert.equal(omen.recommendation.expected_value_delta.points, 5.6);
  assert.equal(omen.recommendation.confidence.score, 95);
  assert.equal(omen.recommendation.risk.level, "low");
  assert.ok(omen.recommendation.risk.reasons.length > 0);
});

test("demo signals and warnings never present sample data as live or mock", () => {
  const response = buildDemoModeResponse(new Date("2026-06-19T12:00:00.000Z"));

  for (const signal of Object.values(response.omen.signals)) {
    assert.equal(signal.status, "demo");
    assert.match(signal.source, /^demo_/);
  }

  const serialized = JSON.stringify(response).toLowerCase();
  assert.match(serialized, /sample/);
  assert.match(serialized, /not live fantasy advice/);
  assert.match(serialized, /never mixes with connected league data/);
});

test("GET /api/demo is public and returns the demo contract", async () => {
  const app = buildApp();
  const res = await request(app);

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "corvus-demo.v1");
  assert.equal(res.body.mode, "demo");
  assert.equal(res.body.omen.mode, "demo");
});

test("GET /api/demo ignores bearer identity and never returns user data", async () => {
  const app = buildApp();
  const res = await request(app, {
    headers: { authorization: "Bearer should-not-be-used" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.mode, "demo");
  assert.equal(Object.prototype.hasOwnProperty.call(res.body, "user"), false);
  assert.equal(JSON.stringify(res.body).includes("should-not-be-used"), false);
});
