"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWarehouseSightRepository, hintOf } = require("../src/services/footballWarehouse/sightRepository");

test("hints normalize names, map provider team codes, and refuse non-skill positions", () => {
  assert.deepEqual(hintOf("yahoo:1", { name: "Puka Nacua", team: "LAR", position: "WR" }), {
    key: "yahoo:1",
    name: "pukanacua",
    team: "omen:team:la",
    position: "WR",
  });
  assert.equal(hintOf("yahoo:2", { name: "X", team: "KC", position: "DEF" }), null);
  assert.equal(hintOf("yahoo:3", { name: "", team: "KC", position: "WR" }), null);
});

test("an indexed player is not looked up by name; an unindexed one is", async () => {
  const calls = [];
  const query = async (q) => {
    calls.push(q.name);
    if (q.name === "warehouse-sight-read-v2")
      return { rows: [{ key: "yahoo:470.p.1", season: 2026, week: 6, value: 9, components: {} }] };
    if (q.name === "warehouse-sight-read-hint-v2") {
      assert.deepEqual(q.values[0], ["yahoo:470.p.2"]);
      return { rows: [{ key: "yahoo:470.p.2", season: 2026, week: 6, value: 12.3, components: { position: "QB" } }] };
    }
    return { rows: [] };
  };
  const hints = new Map([
    ["yahoo:470.p.1", { name: "A", team: "KC", position: "WR" }],
    ["yahoo:470.p.2", { name: "Cam Ward", team: "TEN", position: "QB" }],
  ]);
  const out = await createWarehouseSightRepository({ query }).readSight({
    playerKeys: [...hints.keys()],
    version: "v2",
    hints,
  });
  assert.equal(out.get("yahoo:470.p.2").sight_points, 12.3);
  assert.equal(out.size, 2);
  assert.ok(calls.includes("warehouse-sight-read-hint-v2"));
});

test("more players than one query holds are read in batches, none dropped", async () => {
  const sizes = [];
  const query = async (q) => {
    if (q.name !== "warehouse-sight-read-v2") return { rows: [] };
    const keys = q.values[0].map((r) => r.key ?? r);
    sizes.push(q.values[0].length);
    return { rows: keys.map((key) => ({ key: String(key), season: 2026, week: 6, value: 5, components: {} })) };
  };
  const playerKeys = Array.from({ length: 639 }, (_, i) => `sleeper:${1000 + i}`);
  const out = await createWarehouseSightRepository({ query }).readSight({ playerKeys, version: "v2" });
  assert.deepEqual(sizes, [400, 239]);
  assert.equal(out.size, 639);
});
