"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { cleanupPlan, parseArgs, planSession, resourceNames } = require("../infra/warehouse/backup/projection-analysis-session");

const GOOD = Object.freeze({
  sessionId: "analysis-20261014T180000Z-deadbeef",
  runId: "warehouse-20261014T071500Z",
  ttlSeconds: 7200,
  now: "2026-10-14T18:00:00Z",
  nextRestoreElapse: "2026-10-18T14:11:00Z",
});

test("analysis plan derives only names in the analysis namespace", () => {
  const plan = planSession(GOOD);
  assert.equal(plan.contract_version, "omen-warehouse-projection-analysis-plan.v1");
  assert.equal(plan.cleanup_deadline, "2026-10-14T20:30:00.000Z");
  for (const value of [plan.resources.container, plan.resources.volume]) {
    assert.match(value, /^omen-warehouse-analysis-analysis-/);
    assert.doesNotMatch(value, /omen-warehouse-restore-/);
  }
  assert.equal(plan.resources.receipt, "/var/lib/omen/warehouse-analysis-receipts/analysis-20261014T180000Z-deadbeef.json");
  assert.equal(plan.resources.label, "omen.analysis.session=analysis-20261014T180000Z-deadbeef");
});

test("analysis plan refuses malformed identities and out-of-range TTLs", () => {
  for (const sessionId of ["restore-x", "analysis-../../x", "analysis-20261014T180000Z-DEADBEEF"]) {
    assert.throws(() => resourceNames(sessionId), (error) => error.code === "invalid_session");
  }
  assert.throws(() => planSession({ ...GOOD, runId: "warehouse-latest" }), (error) => error.code === "invalid_run");
  for (const ttlSeconds of [0, 299, 7201, 1.5]) {
    assert.throws(() => planSession({ ...GOOD, ttlSeconds }), (error) => error.code === "invalid_ttl");
  }
});

test("analysis plan refuses any TTL plus cleanup reserve that intersects Sunday protected time", () => {
  assert.throws(() => planSession({ ...GOOD, now: "2026-10-18T11:59:59Z", ttlSeconds: 300, nextRestoreElapse: null }),
    (error) => error.code === "restore_window_overlap");
  assert.throws(() => planSession({ ...GOOD, now: "2026-10-18T16:59:59Z", ttlSeconds: 300, nextRestoreElapse: null }),
    (error) => error.code === "restore_window_overlap");
  assert.doesNotThrow(() => planSession({ ...GOOD, now: "2026-10-18T17:00:00Z", ttlSeconds: 300, nextRestoreElapse: null }));
});

test("analysis plan independently refuses a reported restore timer inside the reserved interval", () => {
  assert.throws(() => planSession({ ...GOOD, nextRestoreElapse: "2026-10-14T20:29:59Z" }),
    (error) => error.code === "restore_timer_overlap");
  assert.doesNotThrow(() => planSession({ ...GOOD, nextRestoreElapse: "2026-10-14T20:30:01Z" }));
});

test("analysis CLI parser is strict and never invents current time", () => {
  const parsed = parseArgs(["--session-id", GOOD.sessionId, "--run-id", GOOD.runId, "--ttl-seconds", "7200", "--now", GOOD.now]);
  assert.equal(parsed.ttlSeconds, 7200);
  assert.equal(parsed.nextRestoreElapse, null);
  assert.throws(() => parseArgs(["--session-id", GOOD.sessionId]), /missing|usage/);
  assert.throws(() => parseArgs(["--session-id", GOOD.sessionId, "--session-id", GOOD.sessionId, "--run-id", GOOD.runId, "--ttl-seconds", "7200", "--now", GOOD.now]), /duplicate/);
  assert.throws(() => parseArgs(["--session-id", GOOD.sessionId, "--run-id", GOOD.runId, "--ttl-seconds", "7e3", "--now", GOOD.now]), (error) => error.code === "invalid_ttl");
  assert.throws(() => planSession({ ...GOOD, now: "October 14 2026 18:00 UTC" }), (error) => error.code === "invalid_time");
  assert.throws(() => planSession({ ...GOOD, now: "2026-02-30T18:00:00Z" }), (error) => error.code === "invalid_time");
});

test("cleanup core returns only exact labeled analysis resources in safe order", () => {
  const names = resourceNames(GOOD.sessionId);
  const observed = {
    container: { name: names.container, label: names.label },
    volume: { name: names.volume, label: names.label },
    socketDir: { path: names.socketDir, owner: "root", mode: "710", symlink: false },
    sourceDir: { path: names.sourceDir, owner: "root", mode: "700", symlink: false },
  };
  assert.deepEqual(cleanupPlan(GOOD.sessionId, observed).map((item) => item.kind), ["container", "volume", "socketDir", "sourceDir"]);
  assert.throws(() => cleanupPlan(GOOD.sessionId, { ...observed, container: { ...observed.container, label: "omen.restore=true" } }),
    (error) => error.code === "unsafe_cleanup_target");
  assert.throws(() => cleanupPlan(GOOD.sessionId, { ...observed, sourceDir: { ...observed.sourceDir, path: "/var/lib/omen/warehouse-restore-sources/x" } }),
    (error) => error.code === "unsafe_cleanup_target");
  assert.throws(() => cleanupPlan(GOOD.sessionId, { ...observed, extra: {} }),
    (error) => error.code === "invalid_cleanup_inventory");
});
