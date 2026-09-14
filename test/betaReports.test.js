"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
const { createBetaReportsRouter } = require("../src/routes/betaReports");
const valid = { screen: "command_center", app_version: "0.1.0", build: "6", os_version: "iOS 18.0", device_model: "iPhone", connection_state: "espn:connected", recent_error_codes: ["provider_unavailable"], message: "The button does not respond.", disclosure_accepted: true };
async function run(body, options = {}) {
  const stored = [];
  const app = express(); app.use(express.json());
  app.use(createBetaReportsRouter({
    authenticate: (req, res, next) => { req.user = { id: "owner" }; next(); },
    store: async (row) => { stored.push(row); return { id: "report-1" }; },
    ...options,
  }));
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const text = await response.text();
    return { status: response.status, body: text.startsWith("{") ? JSON.parse(text) : null, stored };
  } finally { await new Promise((r) => server.close(r)); }
}
test("report stores only allowlisted metadata under the authenticated owner", async () => {
  const result = await run(valid);
  assert.equal(result.status, 201);
  assert.equal(result.stored[0].user_id, "owner");
  assert.equal(result.stored[0].message, valid.message);
  assert.equal(result.body.contract_version, "beta-report.v1");
});
test("report rejects credentials, league payloads, screenshots and unacknowledged disclosure without storage", async () => {
  for (const patch of [{ user_id: "victim" }, { league_name: "private" }, { roster: [] }, { screenshot: "pixels" }, { message: "espn_s2=secret" }, { connection_state: "espn:my-league" }, { recent_error_codes: ["provider said secret"] }, { disclosure_accepted: false }]) {
    const result = await run({ ...valid, ...patch });
    assert.equal(result.status, 400);
    assert.equal(result.stored.length, 0);
    assert.doesNotMatch(JSON.stringify(result.body), /secret|my-league/);
  }
});
test("report fails closed on authentication and storage failure", async () => {
  assert.equal((await run(valid, { authenticate: (_q, r) => r.status(401).json({ error: "unauthorized" }) })).status, 401);
  const result = await run(valid, { store: async () => { throw Error("private database detail"); } });
  assert.equal(result.status, 503);
  assert.doesNotMatch(JSON.stringify(result.body), /private database/);
});
