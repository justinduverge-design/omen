"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { compareUsageBundles } = require("../src/services/footballWarehouse/usageComparison");
const { createUsageShadowRunner } = require("../src/services/footballWarehouse/usageShadow");

const bundle = (targets = 4) => ({
  usage: new Map([["private-provider-key", { games: 1, targets_per_game: targets, receptions_per_game: 2, carries_per_game: 0, attempts_per_game: 0, target_share: 0.2, snap_share: 0.7 }]]),
  weekly: new Map([["private-provider-key", [{ week: 1, targets, receptions: 2, carries: 0, attempts: 0, target_share: 0.2, snap_share: 0.7 }]]]),
});

test("usage comparison emits aggregate facts only and identifies matching and mismatching fields", () => {
  assert.deepEqual(compareUsageBundles(bundle(), bundle()), {
    outcome: "match", compared_players: 1, compared_weeks: 1,
    missing_legacy_players: 0, missing_warehouse_players: 0,
    missing_legacy_weeks: 0, missing_warehouse_weeks: 0, mismatched_fields: 0,
  });
  const result = compareUsageBundles(bundle(), bundle(9));
  assert.equal(result.outcome, "mismatch");
  assert.equal(result.mismatched_fields, 2);
  assert.doesNotMatch(JSON.stringify(result), /private-provider-key|targets_per_game/);
});

test("shadow returns the exact legacy object without waiting for warehouse and emits no identifiers", async () => {
  const legacy = bundle();
  const events = [];
  let release;
  const runner = createUsageShadowRunner({
    readLegacy: async () => legacy,
    readWarehouse: () => new Promise((resolve) => { release = resolve; }),
    emitTelemetry: (event) => events.push(event),
    shadowTimeoutMs: 100,
  });
  const result = await runner.read({ mode: "shadow", input: { userId: "secret-user", playerKey: "private-provider-key" } });
  assert.equal(result, legacy);
  assert.equal(events.length, 0);
  await new Promise((resolve) => setImmediate(resolve));
  release(bundle(9));
  await runner.drain();
  assert.equal(events[0].outcome, "mismatch");
  assert.doesNotMatch(JSON.stringify(events), /secret-user|private-provider-key/);
});

test("shadow timeout and failure cannot fail the legacy request and reveal no error details", async () => {
  for (const readWarehouse of [
    async () => { throw new Error("password and player secret leaked"); },
    () => new Promise(() => {}),
  ]) {
    const events = [];
    const legacy = bundle();
    const runner = createUsageShadowRunner({ readLegacy: async () => legacy, readWarehouse, emitTelemetry: (event) => events.push(event), shadowTimeoutMs: 10 });
    assert.equal(await runner.read({ mode: "shadow", input: { userId: "secret-user" } }), legacy);
    await runner.drain();
    assert.match(events[0].outcome, /failure|timeout/);
    assert.doesNotMatch(JSON.stringify(events), /password|player|secret-user|leaked/);
  }
});

test("warehouse mode fails closed and supabase mode never starts a warehouse read", async () => {
  let warehouseCalls = 0;
  const failure = Object.assign(new Error("warehouse down"), { code: "warehouse_down" });
  const runner = createUsageShadowRunner({
    readLegacy: async () => bundle(),
    readWarehouse: async () => { warehouseCalls += 1; throw failure; },
  });
  assert.equal((await runner.read({ mode: "supabase", input: {} })).usage.size, 1);
  assert.equal(warehouseCalls, 0);
  await assert.rejects(runner.read({ mode: "warehouse", input: {} }), (error) => error === failure);
  assert.equal(warehouseCalls, 1);
});
