"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-key";

const test = require("node:test");
const assert = require("node:assert/strict");

const { buildExplanationInput, writeExplanation, mode } = require("../src/services/decisionExplanation");
const {
  createMemoryDecisionExplanationStore,
  getBounded,
  BOUNDED_BUDGET_MS,
  RESULT_TTL_SECONDS,
} = require("../src/services/decisionExplanationStore");
const { drainOnce, inQuietWindow } = require("../src/services/decisionExplanationWorker");
const {
  shadowDecisionExplanation,
  queueDecisionExplanation,
  getLiveDecisionExplanation,
} = require("../src/services/decisionExplanationShadow");

const WHY = [
  { rank: 1, text: "Bijan Robinson has 21.7 carries per game over the last 3 games.", basis: "observed" },
  { rank: 2, text: "Bijan Robinson is projected for 18.4 points against 12.1 for Tony Pollard.", basis: "projection" },
  { rank: 3, text: "Tony Pollard's usage data is incomplete this week.", basis: "limitation" },
];
const ARGS = { type: "start_sit", decision: "Start Bijan Robinson over Tony Pollard at FLEX.", why: WHY };
const silent = { info() {}, warn() {} };

function fakeFetch(content, { status = 200 } = {}) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: status === 200, status, json: async () => ({ message: { content } }) };
  };
  impl.calls = calls;
  return impl;
}

test("mode is off unless explicitly shadow or live", () => {
  assert.equal(mode({}), "off");
  assert.equal(mode({ DECISION_EXPLANATIONS_MODE: "on" }), "off");
  assert.equal(mode({ DECISION_EXPLANATIONS_MODE: "shadow" }), "shadow");
  assert.equal(mode({ DECISION_EXPLANATIONS_MODE: "live" }), "live");
});

test("cron execution drains in live and shadow mode, skips when off", async () => {
  const { main } = require("../src/omen_decision_explanation_cron");
  assert.deepEqual(await main({ env: { DECISION_EXPLANATIONS_MODE: "off" } }), { skipped: "off" });
  assert.deepEqual(await main({ env: {} }), { skipped: "off" });
  const liveResult = await main({ env: { DECISION_EXPLANATIONS_MODE: "live" } });
  assert.equal(liveResult.processed, 0);
  assert.equal(typeof liveResult.written, "number");
  const shadowResult = await main({ env: { DECISION_EXPLANATIONS_MODE: "shadow" } });
  assert.equal(shadowResult.processed, 0);
  assert.equal(typeof shadowResult.written, "number");
});

test("input keeps the decision and non-limitation reasons, hashed by facts only", () => {
  const input = buildExplanationInput(ARGS);
  assert.deepEqual(input.facts.reasons, [WHY[0].text, WHY[1].text]);
  assert.equal(input.facts.decision, ARGS.decision);
  assert.equal(buildExplanationInput({ ...ARGS }).hash, input.hash);
  assert.notEqual(
    buildExplanationInput({ ...ARGS, decision: "Start Tony Pollard over Bijan Robinson at FLEX." }).hash,
    input.hash,
  );
});

test("no input without a known type, a decision or a real reason", () => {
  assert.equal(buildExplanationInput({ ...ARGS, type: "nope" }), null);
  assert.equal(buildExplanationInput({ ...ARGS, decision: " " }), null);
  assert.equal(buildExplanationInput({ ...ARGS, why: [WHY[2]] }), null);
});

test("a grounded model answer is accepted; thinking is off and the model is configurable", async () => {
  const fetchImpl = fakeFetch(
    "Start Bijan Robinson over Tony Pollard: he has 21.7 carries per game over the last 3 games and is projected for 18.4 points against 12.1.",
  );
  const out = await writeExplanation(buildExplanationInput(ARGS), {
    baseUrl: "http://100.67.187.57:11434/",
    model: "qwen3:1.7b",
    fetchImpl,
  });
  assert.equal(out.ok, true, JSON.stringify(out));
  assert.equal(fetchImpl.calls[0].url, "http://100.67.187.57:11434/api/chat");
  assert.equal(fetchImpl.calls[0].body.think, false);
  assert.equal(fetchImpl.calls[0].body.model, "qwen3:1.7b");
});

test("an invented claim is dropped, not repaired", async () => {
  const out = await writeExplanation(buildExplanationInput(ARGS), {
    baseUrl: "http://x:1",
    fetchImpl: fakeFetch("Start Bijan Robinson, he has a great matchup and 30 touches."),
  });
  assert.equal(out.ok, false);
  assert.equal(out.text, null);
  assert.ok(out.reasons.length > 0);
});

test("transport failures never throw", async () => {
  const input = buildExplanationInput(ARGS);
  assert.deepEqual((await writeExplanation(input, { baseUrl: "" })).reasons, ["no_llm_base_url"]);
  assert.deepEqual(
    (await writeExplanation(input, { baseUrl: "http://x:1", fetchImpl: fakeFetch("", { status: 500 }) })).reasons,
    ["http_500"],
  );
  const boom = async () => {
    throw new Error("down");
  };
  assert.deepEqual((await writeExplanation(input, { baseUrl: "http://x:1", fetchImpl: boom })).reasons, [
    "request_failed",
  ]);
});

test("shadow queues once, then reports available after the worker writes", async () => {
  const store = createMemoryDecisionExplanationStore();
  const env = { DECISION_EXPLANATIONS_MODE: "shadow" };
  assert.equal(await shadowDecisionExplanation(ARGS, { env: {}, store, log: silent }), "off");
  assert.equal(await shadowDecisionExplanation(ARGS, { env, store, log: silent }), "queued");
  assert.equal(await shadowDecisionExplanation(ARGS, { env, store, log: silent }), "pending");

  const writer = async () => ({ ok: true, text: "grounded text", reasons: [], model: "m", ms: 5 });
  const monday = () => new Date("2026-10-19T12:00:00Z");
  const summary = await drainOnce({ store, writer, now: monday });
  assert.deepEqual({ processed: summary.processed, written: summary.written }, { processed: 1, written: 1 });
  assert.equal(await shadowDecisionExplanation(ARGS, { env, store, log: silent }), "available");
});

test("a rejected write is stored so the same facts are not retried", async () => {
  const store = createMemoryDecisionExplanationStore();
  const env = { DECISION_EXPLANATIONS_MODE: "shadow" };
  await shadowDecisionExplanation(ARGS, { env, store, log: silent });
  const writer = async () => ({ ok: false, text: null, reasons: ["ungrounded_stat:matchup"], model: "m", ms: 5 });
  const summary = await drainOnce({ store, writer, now: () => new Date("2026-10-19T12:00:00Z") });
  assert.deepEqual(summary.reasons, { ungrounded_stat: 1 });
  assert.equal(await shadowDecisionExplanation(ARGS, { env, store, log: silent }), "rejected");
});

test("the worker stays out of KVM2's restore-proof and maintenance windows", async () => {
  assert.equal(inQuietWindow(new Date("2026-10-18T13:50:00Z")), "sunday_restore_proof");
  assert.equal(inQuietWindow(new Date("2026-10-18T13:40:00Z")), null);
  assert.equal(inQuietWindow(new Date("2026-10-23T06:15:00Z")), "friday_maintenance");
  const store = createMemoryDecisionExplanationStore();
  await store.enqueue(buildExplanationInput(ARGS));
  const writer = async () => {
    throw new Error("must not run");
  };
  const summary = await drainOnce({ store, writer, now: () => new Date("2026-10-18T14:30:00Z") });
  assert.equal(summary.skipped, "sunday_restore_proof");
});

test("items left when the deadline passes go back on the queue", async () => {
  const store = createMemoryDecisionExplanationStore();
  const a = buildExplanationInput(ARGS);
  const b = buildExplanationInput({ ...ARGS, decision: "Start Tony Pollard over Bijan Robinson at FLEX." });
  await store.enqueue(a);
  await store.enqueue(b);
  let calls = 0;
  const writer = async () => {
    calls += 1;
    return { ok: true, text: "t", reasons: [], model: "m", ms: 1 };
  };
  const summary = await drainOnce({ store, writer, now: () => new Date("2026-10-19T12:00:00Z"), deadlineMs: -1 });
  assert.equal(calls, 0);
  assert.equal(summary.processed, 0);
  assert.equal((await store.dequeue(10)).length, 2);
});

test("a number word with no matching digit is still rejected", async () => {
  const { validateGroundedText } = require("../src/services/narrationGrounding");
  const r = validateGroundedText("Smith has 9 carries over the last three games.", { name: "Smith", f: "9 carries" });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.includes("ungrounded_number_word:three"));
});

test("live helper: cache hit returns grounded explanation text", async () => {
  const store = createMemoryDecisionExplanationStore();
  const input = buildExplanationInput(ARGS);
  await store.put(input.hash, {
    version: input.version,
    type: input.type,
    ok: true,
    text: "Start Bijan Robinson over Tony Pollard: he has 21.7 carries per game.",
    created_at: new Date().toISOString(),
  });
  const env = { DECISION_EXPLANATIONS_MODE: "live" };
  const text = await getLiveDecisionExplanation(ARGS, { env, store, log: silent });
  assert.equal(text, "Start Bijan Robinson over Tony Pollard: he has 21.7 carries per game.");
});

test("live helper: cache miss enqueues input and returns null immediately", async () => {
  const store = createMemoryDecisionExplanationStore();
  const env = { DECISION_EXPLANATIONS_MODE: "live" };
  const text = await getLiveDecisionExplanation(ARGS, { env, store, log: silent });
  assert.equal(text, null);
  await new Promise((resolve) => setImmediate(resolve));
  const dequeued = await store.dequeue(10);
  assert.equal(dequeued.length, 1);
  assert.equal(dequeued[0].hash, buildExplanationInput(ARGS).hash);
});

test("live helper: cache rejected returns fallback null without throwing or re-enqueuing", async () => {
  const store = createMemoryDecisionExplanationStore();
  const input = buildExplanationInput(ARGS);
  await store.put(input.hash, {
    version: input.version,
    type: input.type,
    ok: false,
    text: null,
    created_at: new Date().toISOString(),
  });
  const env = { DECISION_EXPLANATIONS_MODE: "live" };
  const text = await getLiveDecisionExplanation(ARGS, { env, store, log: silent });
  assert.equal(text, null);
  await new Promise((resolve) => setImmediate(resolve));
  const dequeued = await store.dequeue(10);
  assert.equal(dequeued.length, 0);
});

test("live helper: resilience - store error returns fallback null gracefully, logs warning, and does not throw", async () => {
  const warnings = [];
  const warnLog = {
    info() {},
    warn(msg, meta) {
      warnings.push({ msg, meta });
    },
  };
  const throwingStore = {
    async get() {
      const err = new Error("Redis connection lost");
      err.code = "ECONNREFUSED";
      throw err;
    },
    async enqueue() {},
  };
  const env = { DECISION_EXPLANATIONS_MODE: "live" };
  const text = await getLiveDecisionExplanation(ARGS, { env, store: throwingStore, log: warnLog });
  assert.equal(text, null);
  assert.ok(warnings.length >= 1);
  assert.match(warnings[0].msg, /failed/i);
});

test("step 2b: store whose get never resolves returns 'not ready' within the budget", async () => {
  const hangingStore = {
    async get() {
      return new Promise(() => {}); // never resolves
    },
  };
  const started = Date.now();
  const res = await getBounded(hangingStore, "somehash", 40);
  const elapsed = Date.now() - started;
  assert.equal(res, "not ready");
  assert.ok(elapsed >= 35 && elapsed < 250, `elapsed ms: ${elapsed}`);
});

test("step 2b: timer is cleared when read finishes first (no leaked timer)", async () => {
  let cleared = false;
  const origClearTimeout = global.clearTimeout;
  global.clearTimeout = (t) => {
    cleared = true;
    return origClearTimeout(t);
  };
  try {
    const store = createMemoryDecisionExplanationStore();
    await store.put("fast_hash", { ok: true, text: "fast" });
    const res = await getBounded(store, "fast_hash", 150);
    assert.deepEqual(res, { ok: true, text: "fast" });
    assert.equal(cleared, true);
  } finally {
    global.clearTimeout = origClearTimeout;
  }
});

test("step 2b: slow store does not delay live decision explanation beyond budget", async () => {
  const slowStore = {
    async get() {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { ok: true, text: "slow" };
    },
    async enqueue() {},
  };
  const env = { DECISION_EXPLANATIONS_MODE: "live" };
  const started = Date.now();
  const text = await getLiveDecisionExplanation(ARGS, { env, store: slowStore, budgetMs: 40, log: silent });
  const elapsed = Date.now() - started;
  assert.equal(text, null);
  assert.ok(elapsed >= 35 && elapsed < 250, `elapsed ms: ${elapsed}`);
});

test("stale and version check: mismatched version or expired timestamp returns fallback null", async () => {
  const store = createMemoryDecisionExplanationStore();
  const input = buildExplanationInput(ARGS);
  const env = { DECISION_EXPLANATIONS_MODE: "live" };

  // Mismatched version
  await store.put(input.hash, {
    version: "old-version.v0",
    ok: true,
    text: "Mismatched version text",
    created_at: new Date().toISOString(),
  });
  assert.equal(await getLiveDecisionExplanation(ARGS, { env, store, log: silent }), null);

  // Expired timestamp
  const expiredDate = new Date(Date.now() - (RESULT_TTL_SECONDS + 100) * 1000).toISOString();
  await store.put(input.hash, {
    version: input.version,
    ok: true,
    text: "Expired text",
    created_at: expiredDate,
  });
  assert.equal(await getLiveDecisionExplanation(ARGS, { env, store, log: silent }), null);
});

test("queueDecisionExplanation enqueues in live mode as well as shadow mode", async () => {
  const store = createMemoryDecisionExplanationStore();
  const env = { DECISION_EXPLANATIONS_MODE: "live" };
  queueDecisionExplanation(ARGS, { env, store, log: silent });
  await new Promise((resolve) => setImmediate(resolve));
  const dequeued = await store.dequeue(10);
  assert.equal(dequeued.length, 1);
  assert.equal(dequeued[0].hash, buildExplanationInput(ARGS).hash);
});
