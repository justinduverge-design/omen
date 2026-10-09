"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { getWarehouseUsageBundle } = require("../src/services/footballWarehouse/warehouseUsageBundle");

function supabaseCrosswalk(rows) {
  return {
    from() {
      return { select() { return { eq(_field, provider) { return { async in() {
        return { data: rows.filter((row) => row.provider === provider), error: null };
      }}; }}; }};
    },
  };
}

test("resolves provider identities in Supabase and sends only GSIS ids to the warehouse", async () => {
  let input;
  const supabase = supabaseCrosswalk([
    { provider: "espn", provider_player_id: "123", players: { gsis_id: "00-0031234" } },
  ]);
  const repository = { async readPlayerWeeks(value) {
    input = value;
    return new Map([["00-0031234", [
      { week: 1, team: "BUF", targets: 6, receptions: 4, carries: 1, attempts: 0, target_share: 0.25, snap_share: 0.8 },
      { week: 2, team: "BUF", targets: 9, receptions: 7, carries: 0, attempts: 0, target_share: 0.3, snap_share: 0.9 },
    ]]]);
  }};
  const bundle = await getWarehouseUsageBundle({
    supabase, repository, playerKeys: ["espn:123"], season: 2026, beforeWeek: 3,
  });
  assert.deepEqual(input, { gsisIds: ["00-0031234"], season: 2026, beforeWeek: 3 });
  assert.equal(JSON.stringify(input).includes("espn:123"), false);
  assert.equal(bundle.usage.get("espn:123").targets_per_game, 7.5);
  assert.deepEqual(bundle.weekly.get("espn:123").map((row) => row.week), [1, 2]);
});

test("unmatched identities return honest empty maps and never query the warehouse", async () => {
  let calls = 0;
  const result = await getWarehouseUsageBundle({
    supabase: supabaseCrosswalk([]),
    repository: { async readPlayerWeeks() { calls += 1; return new Map(); } },
    playerKeys: ["sleeper:missing"], season: 2026, beforeWeek: 4,
  });
  assert.equal(calls, 0);
  assert.equal(result.usage.size, 0);
  assert.equal(result.weekly.size, 0);
});
