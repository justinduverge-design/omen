"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseArgs, runParity, readOnlySupabase, percentile } = require("../scripts/warehouse-shadow-parity");

const summary = (targets = 4) => ({
  games: 1, targets_per_game: targets, receptions_per_game: 2, carries_per_game: 0,
  attempts_per_game: 0, target_share: 0.2, snap_share: 0.7,
});
const weekRow = (week, targets = 4) => ({ week, targets, receptions: 2, carries: 0, attempts: 0, target_share: 0.2, snap_share: 0.7 });
const bundleFor = (entries) => ({
  usage: new Map(entries.map(([key, targets]) => [key, summary(targets)])),
  weekly: new Map(entries.map(([key, targets]) => [key, [weekRow(1, targets)]])),
});
const empty = () => ({ usage: new Map(), weekly: new Map() });
const args = { season: 2026, week: 2, playerKeys: ["sleeper:1", "sleeper:2", "sleeper:3", "sleeper:4", "sleeper:5"], sample: null, provider: "sleeper" };
const resolveGsis = async (_supabase, keys) => new Map(keys.map((key) => [key, `00-00${key.slice(-1)}`]));

test("classifies matched, differing, missing-on-either-side and absent players", async () => {
  const legacy = { "sleeper:1": bundleFor([["sleeper:1", 4]]), "sleeper:2": bundleFor([["sleeper:2", 4]]),
    "sleeper:3": bundleFor([["sleeper:3", 4]]), "sleeper:4": empty(), "sleeper:5": empty() };
  const warehouse = { "sleeper:1": bundleFor([["sleeper:1", 4]]), "sleeper:2": bundleFor([["sleeper:2", 9]]),
    "sleeper:3": empty(), "sleeper:4": bundleFor([["sleeper:4", 4]]), "sleeper:5": empty() };
  const result = await runParity({
    args, supabase: {}, resolveGsis,
    readLegacy: async ({ playerKeys }) => legacy[playerKeys[0]],
    readWarehouse: async ({ playerKeys }) => warehouse[playerKeys[0]],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(
    [result.players_requested, result.matched, result.differing, result.missing_on_legacy_only,
      result.missing_on_warehouse_only, result.absent_on_both],
    [5, 1, 1, 1, 1, 1],
  );
  assert.equal(result.difference_kinds.mismatched_fields, 2);
  assert.equal(result.difference_kinds.missing_warehouse_player, 1);
  assert.equal(result.difference_kinds.missing_legacy_player, 1);
  assert.equal(result.difference_kinds.missing_warehouse_weeks, 1);
  const stats = result.sample_differences.filter((d) => d.kind.endsWith("field_mismatch"));
  assert.deepEqual(stats.map((d) => [d.gsis_id, d.week, d.stat, d.legacy, d.warehouse]),
    [["00-002", null, "targets_per_game", 4, 9], ["00-002", 1, "targets", 4, 9]]);
  assert.equal(result.latency.legacy.calls, 5);
  assert.equal(result.latency.warehouse.calls, 5);
  assert.doesNotMatch(JSON.stringify(result), /sleeper:/);
});

test("caps sample differences at 10", async () => {
  const keys = Array.from({ length: 12 }, (_, i) => `sleeper:${i}`);
  const result = await runParity({
    args: { ...args, playerKeys: keys }, supabase: {}, resolveGsis,
    readLegacy: async ({ playerKeys }) => bundleFor([[playerKeys[0], 4]]),
    readWarehouse: async ({ playerKeys }) => bundleFor([[playerKeys[0], 9]]),
  });
  assert.equal(result.differing, 12);
  assert.equal(result.sample_differences.length, 10);
});

test("a warehouse query error is counted without raw text and fails the run", async () => {
  const result = await runParity({
    args: { ...args, playerKeys: ["sleeper:1"] }, supabase: {}, resolveGsis,
    readLegacy: async () => bundleFor([["sleeper:1", 4]]),
    readWarehouse: async () => { throw Object.assign(new Error("password=hunter2 host=db"), { code: "ECONNREFUSED" }); },
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors.warehouse, 1);
  assert.deepEqual(result.errors.codes, ["warehouse:ECONNREFUSED"]);
  assert.equal(result.matched + result.differing, 0);
  assert.doesNotMatch(JSON.stringify(result), /hunter2|host=db/);
});

test("a degraded legacy reader (it swallows errors and warns) fails the run instead of looking like a diff", async () => {
  const result = await runParity({
    args: { ...args, playerKeys: ["sleeper:1"] }, supabase: {}, resolveGsis,
    readLegacy: async ({ log }) => { log.warn("player usage unavailable", { reason: "secret" }); return empty(); },
    readWarehouse: async () => bundleFor([["sleeper:1", 4]]),
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors.legacy_degraded, 1);
  assert.equal(result.missing_on_legacy_only, 0);
  assert.doesNotMatch(JSON.stringify(result), /secret/);
});

test("sampling reads only crosswalk rows, dedupes by gsis id and honours the count", async () => {
  const calls = [];
  const rows = [
    { provider_player_id: "10", players: { gsis_id: "00-1" } },
    { provider_player_id: "11", players: { gsis_id: "00-1" } },
    { provider_player_id: "12", players: { gsis_id: "00-2" } },
    { provider_player_id: "13", players: { gsis_id: "00-3" } },
    { provider_player_id: "14", players: null },
  ];
  const builder = {
    select(columns) { calls.push(["select", columns]); return builder; },
    eq(column, value) { calls.push(["eq", column, value]); return builder; },
    limit() { return Promise.resolve({ data: rows, error: null }); },
  };
  const seen = [];
  const supabase = readOnlySupabase({ from: (table) => { calls.push(["from", table]); return builder; } });
  const result = await runParity({
    args: { ...args, playerKeys: null, sample: 2 }, supabase, resolveGsis,
    readLegacy: async ({ playerKeys }) => { seen.push(playerKeys[0]); return empty(); },
    readWarehouse: async () => empty(),
  });
  assert.equal(result.players_requested, 2);
  assert.equal(new Set(seen).size, 2);
  assert.deepEqual(calls.filter((c) => c[0] === "from"), [["from", "player_provider_ids"]]);
  assert.ok(seen.every((key) => /^sleeper:1[0-3]$/.test(key)));
});

test("the read-only Supabase wrapper blocks user tables, writes and rpc", () => {
  const supabase = readOnlySupabase({ from: () => ({ select() { return "ok"; }, insert() { return "bad"; } }) });
  assert.throws(() => supabase.from("platform_connections"));
  assert.throws(() => supabase.from("users"));
  assert.throws(() => supabase.rpc("anything"));
  assert.equal(supabase.from("players").select(), "ok");
  assert.throws(() => supabase.from("players").insert({}));
});

test("argument parsing and percentile", () => {
  assert.deepEqual(parseArgs(["--season", "2026", "--week", "3", "--player-keys", "sleeper:1,sleeper:2"]).playerKeys, ["sleeper:1", "sleeper:2"]);
  assert.equal(parseArgs(["--season", "2026", "--week", "3", "--sample", "5"]).sample, 5);
  assert.throws(() => parseArgs(["--season", "2026", "--week", "3"]), /exactly one/);
  assert.throws(() => parseArgs(["--season", "2026", "--week", "3", "--sample", "5", "--player-keys", "a"]), /exactly one/);
  assert.throws(() => parseArgs(["--season", "2026", "--week", "3", "--sample", "9999"]));
  assert.throws(() => parseArgs(["--season", "2026", "--week", "3", "--sample", "5", "--bogus", "1"]), /unknown flag/);
  assert.equal(percentile([], 50), null);
  assert.equal(percentile([10, 20, 30, 40], 50), 20);
  assert.equal(percentile([10, 20, 30, 40], 95), 40);
});
