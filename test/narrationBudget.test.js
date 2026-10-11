"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createNarrationGuard, NARRATION_BUDGET_MS, FAILURE_THRESHOLD, OPEN_MS } = require("../src/services/narrationBudget");

function harness() {
  const lines = [];
  const logger = { warn: (message, meta) => lines.push({ message, ...meta }) };
  const guard = createNarrationGuard({ logger });
  return { guard, lines };
}

test("budgets match the agreed per-surface values", () => {
  assert.deepEqual({ ...NARRATION_BUDGET_MS }, { omen: 1250, trade_compare: 1500, start_sit: 1500 });
  assert.equal(FAILURE_THRESHOLD, 3);
  assert.equal(OPEN_MS, 60_000);
});

test("a fast result passes through; empty results are not failures unless asked", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { guard, lines } = harness();
  assert.deepEqual(await guard.run("x", 1000, async () => "hello"), { status: "ok", value: "hello" });
  for (let i = 0; i < 5; i += 1) assert.equal((await guard.run("x", 1000, async () => null)).status, "empty");
  assert.equal(guard.state(), "closed");
  assert.equal(lines.length, 0);
});

test("a call that outlives its budget resolves as a timeout", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { guard } = harness();
  const pending = guard.run("x", 1250, () => new Promise(() => {}));
  t.mock.timers.tick(1250);
  assert.equal((await pending).status, "timeout");
});

test("three consecutive timeouts open the breaker for 60s, then one probe closes it", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { guard, lines } = harness();
  for (let i = 0; i < 3; i += 1) {
    const pending = guard.run("trade_compare", 1500, () => new Promise(() => {}));
    t.mock.timers.tick(1500);
    assert.equal((await pending).status, "timeout");
  }
  assert.equal(guard.state(), "open");
  assert.equal(lines.length, 1);
  assert.equal(lines[0].event, "narration_breaker_opened");
  assert.equal(lines[0].site, "trade_compare");

  let calls = 0;
  const op = async () => { calls += 1; return "text"; };
  assert.equal((await guard.run("trade_compare", 1500, op)).status, "skipped");
  t.mock.timers.tick(59_000);
  assert.equal((await guard.run("trade_compare", 1500, op)).status, "skipped");
  assert.equal(calls, 0);

  t.mock.timers.tick(1_000);
  assert.equal(guard.state(), "half_open");
  assert.deepEqual(await guard.run("trade_compare", 1500, op), { status: "ok", value: "text" });
  assert.equal(calls, 1);
  assert.equal(guard.state(), "closed");
  assert.equal(lines.length, 2);
  assert.equal(lines[1].event, "narration_breaker_closed");
});

test("a failed half-open probe re-opens for another full window", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { guard, lines } = harness();
  for (let i = 0; i < 3; i += 1) await guard.run("x", 1000, async () => { throw new Error("down"); });
  assert.equal(guard.state(), "open");
  t.mock.timers.tick(60_000);
  assert.equal((await guard.run("x", 1000, async () => { throw new Error("still down"); })).status, "error");
  assert.equal(guard.state(), "open");
  assert.equal((await guard.run("x", 1000, async () => "late")).status, "skipped");
  assert.equal(lines.filter((line) => line.event === "narration_breaker_opened").length, 2);
});

test("only consecutive failures count: a success resets the streak", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { guard } = harness();
  const fail = async () => { throw new Error("x"); };
  await guard.run("x", 1000, fail);
  await guard.run("x", 1000, fail);
  await guard.run("x", 1000, async () => "ok");
  await guard.run("x", 1000, fail);
  await guard.run("x", 1000, fail);
  assert.equal(guard.state(), "closed");
});

test("nullIsFailure counts empty results; log lines carry no prompt or secrets", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { guard, lines } = harness();
  for (let i = 0; i < 3; i += 1) await guard.run("start_sit", 1500, async () => null, { nullIsFailure: true });
  assert.equal(guard.state(), "open");
  assert.deepEqual(Object.keys(lines[0]).sort(), ["consecutive_failures", "event", "half_open_probe_failed", "message", "reason", "site", "skip_ms"]);
});

test("only one probe is admitted while half-open", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { guard } = harness();
  for (let i = 0; i < 3; i += 1) await guard.run("x", 1000, async () => { throw new Error("down"); });
  t.mock.timers.tick(60_000);
  let release;
  const probe = guard.run("x", 5000, () => new Promise((resolve) => { release = resolve; }));
  assert.equal((await guard.run("x", 5000, async () => "second")).status, "skipped");
  release("fine");
  assert.equal((await probe).status, "ok");
});
