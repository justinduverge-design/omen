"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createNarrationCache, BACKGROUND_TIMEOUT_MS } = require("../src/services/narrationCache");

test("the same decision facts give the same key; different facts a different one", () => {
  const cache = createNarrationCache();
  assert.equal(cache.keyFor({ a: 1 }), cache.keyFor({ a: 1 }));
  assert.notEqual(cache.keyFor({ a: 1 }), cache.keyFor({ a: 2 }));
});

test("a generation is stored, joined while in flight, and given the long timeout", async () => {
  const cache = createNarrationCache();
  let calls = 0;
  let seenTimeout = null;
  const produce = async (timeoutMs) => {
    calls += 1;
    seenTimeout = timeoutMs;
    return { summary: "s" };
  };
  const [a, b] = await Promise.all([cache.generate("k", produce), cache.generate("k", produce)]);
  assert.deepEqual(a, { summary: "s" });
  assert.equal(a, b);
  assert.equal(calls, 1, "a second request joins the first generation");
  assert.equal(seenTimeout, BACKGROUND_TIMEOUT_MS);
  assert.deepEqual(cache.get("k"), { summary: "s" });
});

test("null and thrown generations are not stored and never reject", async () => {
  const cache = createNarrationCache();
  assert.equal(await cache.generate("n", async () => null), null);
  assert.equal(await cache.generate("t", async () => Promise.reject(new Error("x"))), null);
  assert.equal(cache.get("n"), undefined);
  assert.equal(cache.get("t"), undefined);
});

test("entries expire after the TTL", async () => {
  let clock = 0;
  const cache = createNarrationCache({ now: () => clock, ttlMs: 100 });
  await cache.generate("k", async () => ({ summary: "s" }));
  clock = 101;
  assert.equal(cache.get("k"), undefined);
});

test("a slow host stops requests from waiting on it", async () => {
  let clock = 0;
  const cache = createNarrationCache({ now: () => clock });
  assert.equal(cache.hostFitsBudget(1250), true, "no evidence yet: wait");
  await cache.generate("k", async () => {
    clock += 25_000;
    return { summary: "s" };
  });
  assert.equal(cache.hostFitsBudget(1250), false);
});

test("generations run one at a time", async () => {
  const cache = createNarrationCache();
  let running = 0;
  let peak = 0;
  const produce = async () => {
    running += 1;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 5));
    running -= 1;
    return { summary: "s" };
  };
  await Promise.all([cache.generate("a", produce), cache.generate("b", produce), cache.generate("c", produce)]);
  assert.equal(peak, 1);
});
