"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createTradeUsageEvidence, usageRowsForTrade, USAGE_STATES } = require("../src/services/tradeUsageEvidence");

const rb = { player_key: "espn:1", name: "Rae Runner", position: "RB" };
const wr = { player_key: "espn:2", name: "Wes Receiver", position: "WR" };
const qb = { player_key: "espn:3", name: "Quinn Passer", position: "QB" };

const weeks = (n, row) => Array.from({ length: n }, (_, i) => ({ week: i + 1, ...row }));

function harness({ mode = "warehouse", rows, gsis = { "espn:1": "G1", "espn:2": "G2", "espn:3": "G3" }, fail = false } = {}) {
  const calls = { read: [] };
  const runtime = mode === null ? null : {
    mode,
    repository: {
      async readOpportunityWeeks(args) {
        calls.read.push(args);
        if (fail) throw new Error("warehouse down");
        return new Map(args.gsisIds.map((id) => [id, (rows || {})[id] || []]));
      },
    },
  };
  const usageFor = createTradeUsageEvidence({
    getRuntime: () => runtime,
    resolve: async (_supabase, keys) => new Map(keys.filter((k) => gsis[k]).map((k) => [k, gsis[k]])),
  });
  return { usageFor, calls };
}

const RB_ROWS = weeks(4, { carries: 15, targets: 3, red_zone_carries: 2, red_zone_targets: 0 });
const WR_ROWS = weeks(4, { carries: 0, targets: 9, red_zone_carries: 0, red_zone_targets: 1 });

test("both sides of a trade get observed-usage evidence from one warehouse read", async () => {
  const { usageFor, calls } = harness({ rows: { G1: RB_ROWS, G2: WR_ROWS } });
  const usage = await usageFor([rb, wr, rb], { season: 2026, week: 6 });
  assert.equal(usage.state, USAGE_STATES.OK);
  assert.equal(calls.read.length, 1, "one query for the whole trade");
  assert.deepEqual(calls.read[0], { gsisIds: ["G1", "G2"], season: 2026, beforeWeek: 6 });
  const rows = usageRowsForTrade({ give: rb, receive: wr }, usage.byKey);
  assert.deepEqual(rows.map((r) => [r.side, r.player_key, r.kind, r.source]), [
    ["give", "espn:1", "observed_usage", "nfl_weekly_opportunity"],
    ["receive", "espn:2", "observed_usage", "nfl_weekly_opportunity"],
  ]);
  assert.match(rows[0].statement, /^Rae Runner: 15\.0 carries and 3\.0 targets/);
  assert.match(rows[1].statement, /^Wes Receiver: 9\.0 targets/);
});

test("a quarterback, an unmapped player or missing counts produce no row, never a guess", async () => {
  const { usageFor } = harness({ rows: { G1: weeks(3, { carries: null, targets: null }), G3: weeks(3, { carries: 3, targets: 0 }) }, gsis: { "espn:1": "G1", "espn:3": "G3" } });
  const usage = await usageFor([rb, wr, qb], { season: 2026, week: 6 });
  assert.equal(usage.state, USAGE_STATES.NONE);
  assert.deepEqual(usageRowsForTrade({ give: rb, receive: wr }, usage.byKey), []);
});

test("supabase mode, no runtime, a failing warehouse, or the preseason leave the trade untouched and say why", async () => {
  assert.equal((await harness({ mode: "supabase" }).usageFor([rb], { season: 2026, week: 6 })).state, USAGE_STATES.NOT_ENABLED);
  assert.equal((await harness({ mode: null }).usageFor([rb], { season: 2026, week: 6 })).state, USAGE_STATES.NOT_ENABLED);
  const down = await harness({ rows: { G1: RB_ROWS }, fail: true }).usageFor([rb], { season: 2026, week: 6 });
  assert.equal(down.state, USAGE_STATES.UNAVAILABLE);
  assert.equal(down.byKey.size, 0);
  const early = harness({ rows: { G1: RB_ROWS } });
  assert.equal((await early.usageFor([rb], { season: 2026, week: 0 })).state, USAGE_STATES.NOT_IN_SEASON);
  assert.equal(early.calls.read.length, 0, "no warehouse read outside the season");
});

test("shadow mode reads the warehouse too (evidence, not authority)", async () => {
  const { usageFor, calls } = harness({ mode: "shadow", rows: { G1: RB_ROWS } });
  const usage = await usageFor([rb], { season: 2026, week: 6 });
  assert.equal(usage.state, USAGE_STATES.OK);
  assert.equal(calls.read.length, 1);
});

test("evidence never changes who is proposed: rows are additive and keyed by player", async () => {
  const { usageFor } = harness({ rows: { G1: RB_ROWS } });
  const usage = await usageFor([rb, wr], { season: 2026, week: 6 });
  const rows = usageRowsForTrade({ give: rb, receive: wr }, usage.byKey);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].player_key, "espn:1");
});
