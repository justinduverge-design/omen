"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
const test = require("node:test");
const { createFootballIntelligenceRouter } = require("../src/routes/footballIntelligence");

async function request({ path = "/signals/coach-transfer?team_id=omen:team:chicago-2026&coach_id=omen:coach:ben-johnson&season=2026", authenticate, repositoryFactory } = {}) {
  const app = express();
  app.use(createFootballIntelligenceRouter({
    authenticate: authenticate || ((req, _res, next) => { req.user = { id: "user-1" }; next(); }),
    repositoryFactory,
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { headers: { authorization: "Bearer user-token" } });
    return { status: response.status, body: await response.json() };
  } finally { await new Promise((resolve) => server.close(resolve)); }
}

function repository(value) {
  return () => ({ findPublishedCoachTransfer: async () => value });
}

test("coach-transfer route is authenticated before repository access", async () => {
  let called = false;
  const result = await request({
    authenticate: (_req, res) => res.status(401).json({ error: "Missing bearer token" }),
    repositoryFactory: () => { called = true; return {}; },
  });
  assert.equal(result.status, 401);
  assert.equal(called, false);
});

test("coach-transfer route validates the complete bounded scope", async () => {
  for (const path of [
    "/signals/coach-transfer?coach_id=omen:coach:ben-johnson&season=2026",
    "/signals/coach-transfer?team_id=omen:team:chicago-2026&coach_id=omen:coach:ben-johnson&season=twenty",
    "/signals/coach-transfer?team_id=omen:team:chicago-2026&coach_id=omen:coach:ben-johnson&season=2026&latest=true",
  ]) {
    const result = await request({ path, repositoryFactory: repository(null) });
    assert.equal(result.status, 400);
    assert.equal(result.body.contract_version, "football-intelligence-signal-error.v1");
  }
});

test("coach-transfer route returns a published domain payload and passes request context to the repository factory", async () => {
  let observed;
  const signal = { contract_version: "football-intelligence-signal.v1", status: "disputed", signal_type: "coach_transfer_system_signal" };
  const result = await request({ repositoryFactory: (req) => { observed = req.headers.authorization; return { findPublishedCoachTransfer: async (scope) => { assert.deepEqual(scope, { teamId: "omen:team:chicago-2026", coachId: "omen:coach:ben-johnson", season: 2026 }); return signal; } }; } });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, signal);
  assert.equal(observed, "Bearer user-token");
});

test("coach-transfer route returns the stable unavailable envelope when no publication exists", async () => {
  const result = await request({ repositoryFactory: repository(null) });
  assert.equal(result.status, 200);
  assert.equal(result.body.contract_version, "football-intelligence-signal.v1");
  assert.equal(result.body.status, "unavailable");
  assert.equal(result.body.reason_code, "not_published");
  assert.equal(result.body.interpretation.association_only, true);
  assert.deepEqual(result.body.evidence.source_artifacts, []);
});

test("coach-transfer route sanitizes serving failures", async () => {
  const result = await request({ repositoryFactory: () => ({ findPublishedCoachTransfer: async () => { throw new Error("private database detail"); } }) });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "serving_unavailable");
  assert.doesNotMatch(JSON.stringify(result.body), /private|database detail/);
});
