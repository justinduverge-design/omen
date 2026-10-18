"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { resolveWarehouseOutcomes } = require("../src/services/footballWarehouse/ledgerOutcomes");

const entry = (id, playerId) => ({
  decision: { id, season: 2026, week: 5, recommendation: { primary_player: { id: playerId } } },
});

test("provider ids are mapped to GSIS through the crosswalk before the warehouse is asked", async () => {
  const asked = [];
  const repository = {
    isWeekIngested: async () => true,
    readWeekOutcomes: async ({ refs }) => {
      asked.push(...refs);
      return new Map([["gsis:00-0033873", { resolved: true, hasLine: true, ppr: 18.4, receptions: 5 }]]);
    },
  };
  const found = await resolveWarehouseOutcomes({
    entries: [entry("d1", "sleeper:4046"), entry("d2", "espn:999")],
    repository,
    resolveGsis: async (keys) => new Map(keys.filter((k) => k === "sleeper:4046").map((k) => [k, "00-0033873"])),
  });
  assert.deepEqual(asked, [
    { provider: "gsis", providerId: "00-0033873" },
    { provider: "espn", providerId: "999" },
  ]);
  assert.deepEqual(found.get("d1"), { kind: "points", ppr: 18.4, receptions: 5 });
  assert.equal(found.get("d2").kind, "unresolved", "an unmapped id stays unresolved, never guessed");
});

test("a crosswalk failure falls back to the provider ids instead of failing grading", async () => {
  const repository = { isWeekIngested: async () => true, readWeekOutcomes: async () => new Map() };
  const found = await resolveWarehouseOutcomes({
    entries: [entry("d1", "sleeper:4046")],
    repository,
    resolveGsis: async () => {
      throw new Error("supabase down");
    },
  });
  assert.equal(found.get("d1").kind, "unresolved");
});
