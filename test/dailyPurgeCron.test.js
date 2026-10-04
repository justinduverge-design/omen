"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { runPurges, PURGES } = require("../src/omen_daily_purge_cron");

const root = path.join(__dirname, "..");

function fakeClient(results) {
  const calls = [];
  return {
    calls,
    rpc: async (name, args) => {
      calls.push({ name, args });
      return results[name];
    },
  };
}

function capture() {
  const lines = [];
  return { lines, log: { info: (...a) => lines.push(["info", a.join(" ")]), error: (...a) => lines.push(["error", a.join(" ")]) } };
}

test("daily purge runs both redo purges and logs each count (plan A3)", async () => {
  assert.deepEqual(PURGES, ["beta_reports_purge_expired", "retired_rows_purge_due"]);
  const client = fakeClient({ beta_reports_purge_expired: { data: 3, error: null }, retired_rows_purge_due: { data: 0, error: null } });
  const { lines, log } = capture();
  const result = await runPurges({ client, log });
  assert.deepEqual(client.calls.map((c) => c.name), PURGES);
  assert.deepEqual(result, { beta_reports_purge_expired: 3, retired_rows_purge_due: 0 });
  assert.ok(lines.some(([lvl, l]) => lvl === "info" && /beta_reports_purge_expired purged 3/.test(l)));
  assert.ok(lines.some(([lvl, l]) => lvl === "info" && /retired_rows_purge_due purged 0/.test(l)));
});

test("a purge function that does not exist yet is skipped quietly, so the job can ship before steps 08/09", async () => {
  for (const error of [{ code: "PGRST202", message: "Could not find the function" }, { code: "42883", message: "function does not exist" }]) {
    const client = fakeClient({ beta_reports_purge_expired: { data: null, error }, retired_rows_purge_due: { data: null, error } });
    const { lines, log } = capture();
    const result = await runPurges({ client, log });
    assert.deepEqual(result, { beta_reports_purge_expired: "skipped", retired_rows_purge_due: "skipped" });
    assert.equal(lines.filter(([lvl]) => lvl === "error").length, 0);
  }
});

test("a real purge failure is reported, does not stop the other purge, and fails the run", async () => {
  const client = fakeClient({
    beta_reports_purge_expired: { data: null, error: { code: "42501", message: "permission denied" } },
    retired_rows_purge_due: { data: 2, error: null },
  });
  const { lines, log } = capture();
  await assert.rejects(runPurges({ client, log }), /beta_reports_purge_expired/);
  assert.deepEqual(client.calls.map((c) => c.name), PURGES);
  assert.ok(lines.some(([lvl, l]) => lvl === "error" && /beta_reports_purge_expired/.test(l)));
  assert.ok(lines.some(([lvl, l]) => lvl === "info" && /retired_rows_purge_due purged 2/.test(l)));
});

test("cron Dockerfile schedules the daily purge alongside the Tuesday worker", () => {
  const dockerfile = fs.readFileSync(path.join(root, "Dockerfile.cron"), "utf8");
  assert.match(dockerfile, /"\d+ \d+ \* \* \* node \/app\/src\/omen_daily_purge_cron\.js >> \/var\/log\/omen_cron\.log 2>&1"/);
  assert.match(dockerfile, /node \/app\/src\/omen_tuesday_cron\.js/);
});
