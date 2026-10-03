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
    ensureUser: async () => {},
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
// Synthetic, cookie-shaped values (not real credentials) in the shapes people paste from a browser.
const FAKE_S2 = "AEBx7Kq2%2FfR9mZt4Lw8nYp3%2BvC6sJd1Qh5Ge0Uo7Ia2Xb9Nc4Rk8Tf3Wm6Zy1Ep5Hu0Lj7Vg2Dq9Os4Bn8Ck3Mx6Pz1Ar5Ft0Iw7Kv2Gs9Eh4Ly8Ud3Nj6Tq1Ob5Rm0Wc7Xp2Za9%3D";
const FAKE_SWID = "{3F2A9C1E-7B4D-4E8A-9F21-6C5D0B7A3E94}";
test("report rejects ESPN cookie label variants and bare cookie-shaped values (Codex #440, plan A2)", async () => {
  const pasted = [
    `ESPN S2 = ${FAKE_S2}`,
    `espn-s2: ${FAKE_S2}`,
    `my espnS2 is ${FAKE_S2}`,
    `s2=${FAKE_S2}`,
    `S2 : ${FAKE_S2}`,
    `here it is ${FAKE_S2} thanks`,
    FAKE_S2,
    `SWID ${FAKE_SWID}`,
    `my id is ${FAKE_SWID}`,
    `ESPN S2 and SWID pasted: ${FAKE_S2.slice(0, 40)}`,
  ];
  for (const message of pasted) {
    const result = await run({ ...valid, message });
    assert.equal(result.status, 400, message);
    assert.equal(result.stored.length, 0, message);
    assert.doesNotMatch(JSON.stringify(result.body), /AEBx7|3F2A9C1E/);
  }
});
test("report still accepts ordinary messages that mention screens, links and versions", async () => {
  for (const message of [
    "The S2 screen froze after I tapped Connect.",
    "Trade tab shows nothing for my ESPN league https://fantasy.espn.com/football/team?leagueId=123456&teamId=4&seasonId=2026",
    "Build 0.1.0 (6) on iOS 18.0: the waiver list is empty since week 4.",
    "Error said provider_unavailable twice, then it worked.",
  ]) {
    const result = await run({ ...valid, message });
    assert.equal(result.status, 201, message);
  }
});
test("report creates the reporter's app user row before storing (redo step 09: user_id references users)", async () => {
  const order = [];
  const result = await run(valid, {
    authenticate: (req, res, next) => { req.user = { id: "owner", email: "owner@example.test" }; next(); },
    ensureUser: async (user) => { order.push(`ensure:${user.id}`); },
    store: async (row) => { order.push(`store:${row.user_id}`); return { id: "report-1" }; },
  });
  assert.equal(result.status, 201);
  assert.deepEqual(order, ["ensure:owner", "store:owner"]);
});
test("report fails closed, unsaved, when the app user row cannot be created", async () => {
  const result = await run(valid, { ensureUser: async () => { throw Error("users upsert failed"); } });
  assert.equal(result.status, 503);
  assert.equal(result.stored.length, 0);
  assert.doesNotMatch(JSON.stringify(result.body), /upsert/);
});
test("the credential check is linear: a very long run without a percent sign is checked quickly (Codex, #523)", () => {
  const { looksSensitive } = require("../src/routes/betaReports");
  const run = "a".repeat(100000);
  const started = process.hrtime.bigint();
  assert.equal(looksSensitive(run), true); // 100k-character run: caught by the 80+ rule, and checked in linear time
  looksSensitive(`"message":"${run.slice(0, 79)}"`);
  looksSensitive(`"message":"x ${"ab ".repeat(30000)}"`);
  assert.equal(looksSensitive(`"${"a".repeat(56)}%2F"`), false); // 59-character run
  assert.equal(looksSensitive(`"${"a".repeat(57)}%2F"`), true); // 60-character run
  const shortRuns = `"${"a1b2c3d ".repeat(12000)}"`;
  assert.equal(looksSensitive(shortRuns), false);
  looksSensitive(run.replace(/a/g, (c, i) => (i % 79 === 78 ? " " : c)));
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  assert.ok(elapsedMs < 250, `took ${elapsedMs} ms`);
});
