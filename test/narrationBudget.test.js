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

test("a hard-down LLM returning null instantly neither opens the breaker nor masks real failures", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { guard, lines } = harness();
  const fail = async () => { throw new Error("x"); };
  for (let i = 0; i < 10; i += 1) assert.equal((await guard.run("omen", 1250, async () => null)).status, "empty");
  assert.equal(guard.state(), "closed");
  // Empty results in between do not reset the failure streak...
  await guard.run("omen", 1250, fail);
  await guard.run("omen", 1250, async () => null);
  await guard.run("omen", 1250, fail);
  await guard.run("omen", 1250, async () => null);
  assert.equal(guard.state(), "closed");
  await guard.run("omen", 1250, fail);
  // ...so three real failures still open it.
  assert.equal(guard.state(), "open");
  assert.deepEqual(Object.keys(lines[0]).sort(), ["consecutive_failures", "event", "half_open_probe_failed", "message", "reason", "site", "skip_ms"]);
  // An empty probe does not close it and frees the slot for another probe.
  t.mock.timers.tick(60_000);
  assert.equal((await guard.run("omen", 1250, async () => null)).status, "empty");
  assert.equal(guard.state(), "half_open");
  assert.equal((await guard.run("omen", 1250, async () => "real")).status, "ok");
  assert.equal(guard.state(), "closed");
});

test("results from an earlier epoch are ignored", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { guard, lines } = harness();
  let lateOk;
  let lateFail;
  const slowOk = guard.run("x", 100_000, () => new Promise((resolve) => { lateOk = resolve; }));
  const slowFail = guard.run("x", 100_000, () => new Promise((_, reject) => { lateFail = reject; }));
  for (let i = 0; i < 3; i += 1) await guard.run("x", 1000, async () => { throw new Error("down"); });
  assert.equal(guard.state(), "open");
  // A late success from before the open must not close it.
  lateOk("late");
  assert.equal((await slowOk).status, "ok");
  assert.equal(guard.state(), "open");
  // A late failure must not extend the window or log a second "opened".
  t.mock.timers.tick(50_000);
  lateFail(new Error("late"));
  assert.equal((await slowFail).status, "error");
  t.mock.timers.tick(10_000);
  assert.equal(guard.state(), "half_open", "window was not extended");
  assert.equal(lines.filter((line) => line.event === "narration_breaker_opened").length, 1);
});

test("a late result from an earlier epoch cannot clear the in-flight probe", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { guard } = harness();
  let lateEmpty;
  const early = guard.run("x", 1_000_000, () => new Promise((resolve) => { lateEmpty = resolve; }));
  for (let i = 0; i < 3; i += 1) await guard.run("x", 1000, async () => { throw new Error("down"); });
  t.mock.timers.tick(60_000);
  let finishProbe;
  const probe = guard.run("x", 1_000_000, () => new Promise((resolve) => { finishProbe = resolve; }));
  lateEmpty(null);
  assert.equal((await early).status, "empty");
  assert.equal((await guard.run("x", 1000, async () => "second")).status, "skipped", "probe slot still held");
  finishProbe("ok");
  assert.equal((await probe).status, "ok");
  assert.equal(guard.state(), "closed");
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
