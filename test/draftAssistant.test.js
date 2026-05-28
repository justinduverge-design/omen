"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
delete process.env.REDIS_URL;
delete process.env.REDIS_TOKEN;

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/draft-assistant", require("../src/routes/draftAssistant"));
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
    const res = await fetch(`http://127.0.0.1:${port}/api/draft-assistant/recommendations`, {
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

test("POST /api/draft-assistant/recommendations returns UI-compatible mock recommendations", async () => {
  const res = await request(buildApp(), {
    scoring_format: "half_ppr",
    draft_position: 4,
    round: 2,
    position_needs: ["RB", "WR"],
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.feature, "draft_assistant");
  assert.equal(res.body.mode, "mock");
  assert.equal(res.body.is_mock, true);
  assert.equal(res.body.scoring_format, "half_ppr");
  assert.equal(res.body.draft_position, 4);
  assert.equal(res.body.round, 2);
  assert.equal(
    res.body.note,
    "Mock recommendations — live Draft Assistant requires session + platform data."
  );
  assert.equal(res.body.recommendations.length, 3);

  for (const rec of res.body.recommendations) {
    assert.equal(typeof rec.rank, "number");
    assert.equal(typeof rec.name, "string");
    assert.equal(typeof rec.position, "string");
    assert.equal(typeof rec.team, "string");
    assert.equal(typeof rec.player.name, "string");
    assert.equal(rec.player.name, rec.name);
    assert.equal(rec.player.position, rec.position);
    assert.equal(rec.player.team, rec.team);
    assert.equal(typeof rec.vorp_score, "number");
    assert.equal(typeof rec.rationale, "string");
    assert.equal(typeof rec.headline, "string");
    assert.ok(Array.isArray(rec.reasoning));
    assert.equal(typeof rec.confidence_score, "number");
  }
});

test("POST /api/draft-assistant/recommendations uses provider-backed ADP rows when supplied", async () => {
  const res = await request(buildApp(), {
    scoring_format: "ppr",
    draft_position: 8,
    round: 3,
    position_needs: ["WR"],
    adp_players: [
      { name: "Real Receiver", position: "WR", team: "DAL", adp: 22.4 },
      { name: "Real Runner", position: "RB", team: "ATL", adp: 25.1 },
    ],
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.mode, "live_adp");
  assert.equal(res.body.is_mock, false);
  assert.equal(res.body.status, "adp_backed");
  assert.equal(res.body.recommendations[0].name, "Real Receiver");
  assert.equal(res.body.recommendations[0].recommendation_type, "roster_fit");
  assert.match(res.body.note, /Provider-backed ADP/);
});
