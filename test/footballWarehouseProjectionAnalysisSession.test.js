"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { parseArgs, planSession, resourceNames } = require("../infra/warehouse/backup/projection-analysis-session");

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
});
