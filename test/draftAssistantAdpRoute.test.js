"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
process.env.NODE_ENV = "test";
delete process.env.REDIS_URL;
delete process.env.REDIS_TOKEN;

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");

function buildApp() {
  const routePath = require.resolve("../src/routes/draftAssistant");
  delete require.cache[routePath];

  const app = express();
  app.use(express.json());
  app.use("/api/draft-assistant", require("../src/routes/draftAssistant"));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function request(app, path = "/api/draft-assistant/adp?format=half-ppr&teams=12") {
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

test("GET /api/draft-assistant/adp returns mock ADP shape outside production Redis", async () => {
  const res = await request(buildApp());
  const expectedMockNames = [
    "Sample RB1",
    "Mock WR Starter",
    "Example TE Value",
    "Sample Flex Upside",
    "Sample WR2",
  ];

  assert.equal(res.status, 200);
  assert.equal(res.body.is_mock, true);
  assert.equal(res.body.format, "half-ppr");
  assert.equal(res.body.teams, 12);
  assert.equal(typeof res.body.note, "string");

  for (const sourceName of ["ffc", "yahoo", "mfl"]) {
    const source = res.body.sources[sourceName];
    assert.equal(typeof source.fetched_at, "string");
    assert.equal(Array.isArray(source.players), true);
    assert.equal(source.players.length, 5);
    assert.deepEqual(source.players.map((player) => player.name), expectedMockNames);
    for (const player of source.players) {
      assert.equal(typeof player.name, "string");
      assert.equal(typeof player.position, "string");
      assert.equal(typeof player.team, "string");
      assert.equal(typeof player.adp, "number");
      assert.equal(typeof player.player_id, "string");
    }
  }

  assert.equal(res.body.sources.ffc.attribution, "Fantasy Football Calculator");
  assert.equal(res.body.sources.ffc.attribution_url, "https://fantasyfootballcalculator.com");
  assert.equal(res.body.weighting.config_path, "default_scoring_rules.adp_source_weights");
  assert.equal(res.body.weighting.defaults_applied, true);
  assert.equal(res.body.weighted_players.length, expectedMockNames.length);
  assert.equal(res.body.weighted_players[0].lower_is_better, true);
  assert.equal(res.body.weighted_players[0].source_count, 3);
});
