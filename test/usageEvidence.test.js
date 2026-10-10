"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const test = require("node:test");
const assert = require("node:assert/strict");

const optimizer = require("../src/services/optimizer");
const { readRosterUsage } = require("../src/services/usageCorroborationReader");
const { buildWaiverAnalysis } = require("../src/services/waiverAnalysis");
const { waiverUsageSentence, createWaiverUsageEnricher } = require("../src/services/waiverUsageEvidence");
const { createWarehouseUsageRepository } = require("../src/services/footballWarehouse/usageRepository");
const { WAIVER } = require("../src/services/evidenceVocabulary");

// ---------------------------------------------------------------- Omen call confidence

function roster(startStatus = "ACTIVE") {
  return {
    slots: {
      starters: [{ player_key: "sleeper:1", name: "Starter", position: "WR", selected_position: "WR", projected_points: 10, status: startStatus, eligible_positions: ["WR"] }],
      bench: [{ player_key: "sleeper:2", name: "Bench", position: "WR", projected_points: 15, status: "ACTIVE", eligible_positions: ["WR"] }],
    },
  };
}
const usageMap = () => new Map([
  ["sleeper:2", { target_share: 0.28, snap_share: 0.9 }],
  ["sleeper:1", { target_share: 0.15, snap_share: 0.7 }],
]);

test("usage that favors the bench player corroborates the call and can lift it to Confident", () => {
  const [plain] = optimizer.evaluateLineup(roster());
  assert.equal(plain.confidence_band, "leaning");
  const [withUsage] = optimizer.evaluateLineup(roster(), { usage: usageMap() });
  assert.equal(withUsage.confidence_band, "confident");
  assert.match(withUsage.confidence_reason, /recent usage/);
  assert.equal(typeof withUsage.confidence, "number"); // band representative, not rendered as a percent
  assert.doesNotMatch(withUsage.confidence_reason, /%/);
});

test("absent, empty, or contradicting usage leaves the swap exactly as today", () => {
  const [plain] = optimizer.evaluateLineup(roster());
  assert.deepEqual(optimizer.evaluateLineup(roster(), { usage: new Map() })[0], plain);
  assert.deepEqual(optimizer.evaluateLineup(roster(), { usage: null })[0], plain);
  const against = new Map([["sleeper:2", { target_share: 0.1 }], ["sleeper:1", { target_share: 0.3 }]]);
  assert.deepEqual(optimizer.evaluateLineup(roster(), { usage: against })[0], plain);
});

test("readRosterUsage returns usage from the reader in its own mode and never throws", async () => {
  let seen;
  const reader = { mode: "shadow", read: async (args) => { seen = args; return { usage: usageMap(), weekly: new Map() }; } };
  const usage = await readRosterUsage({ reader, supabase: {}, roster: roster(), season: 2026, beforeWeek: 6 });
  assert.equal(seen.mode, "shadow");
  assert.deepEqual(seen.input.playerKeys.sort(), ["sleeper:1", "sleeper:2"]);
  assert.equal(seen.input.beforeWeek, 6);
  assert.ok(usage instanceof Map);

  const failing = { mode: "warehouse", read: async () => { throw new Error("warehouse down"); } };
  assert.equal(await readRosterUsage({ reader: failing, supabase: {}, roster: roster(), season: 2026, beforeWeek: 6 }), null);
  const slow = { mode: "shadow", read: () => new Promise(() => {}) };
  assert.equal(await readRosterUsage({ reader: slow, supabase: {}, roster: roster(), season: 2026, beforeWeek: 6, budgetMs: 20 }), null);
  assert.equal(await readRosterUsage({ reader: null, supabase: {}, roster: roster(), season: 2026, beforeWeek: 6 }), null);
  assert.equal(await readRosterUsage({ reader: { mode: "shadow", read: async () => ({ usage: new Map() }) }, supabase: {}, roster: roster(), season: 2026, beforeWeek: 6 }), null);
});

test("a warehouse outage leaves the lineup recommendation byte-identical to today", async () => {
  const baseline = JSON.stringify(optimizer.evaluateLineup(roster()));
  for (const mode of ["shadow", "warehouse"]) {
    const reader = { mode, read: async () => { throw Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" }); } };
    const usage = await readRosterUsage({ reader, supabase: {}, roster: roster(), season: 2026, beforeWeek: 6 });
    assert.equal(JSON.stringify(optimizer.evaluateLineup(roster(), usage ? { usage } : {})), baseline);
  }
});

// ---------------------------------------------------------------- Waiver usage reason

const week = (n, f = {}) => ({
  week: n, carries: null, targets: null, red_zone_carries: null, red_zone_targets: null,
  inside_10_touches: null, inside_5_touches: null, end_zone_targets: null, deep_targets: null, ...f,
});

test("waiver sentence is built only from real numbers", () => {
  const rows = [week(1, { targets: 3, red_zone_targets: 0 }), week(2, { targets: 4, red_zone_targets: 0 }),
    week(3, { targets: 9, red_zone_targets: 2 }), week(4, { targets: 10, red_zone_targets: 1 }), week(5, { targets: 11, red_zone_targets: 0 })];
  const sentence = waiverUsageSentence("Sam Rookie", "WR", rows);
  assert.equal(sentence, "Sam Rookie: 10.0 targets a game over the last 3 games, with 3 red-zone touches in that stretch. Up from 3.5 targets a game over the first 2 games.");
  const rb = waiverUsageSentence("Back", "RB", [week(7, { carries: 12, targets: 2, red_zone_carries: 1, red_zone_targets: 0 })]);
  assert.equal(rb, "Back: 12.0 carries and 2.0 targets in the last game, with 1 red-zone touch in that stretch.");
});

test("waiver sentence stays silent when counts are unknown or the position has no usage line", () => {
  assert.equal(waiverUsageSentence("A", "WR", [week(1)]), null);
  assert.equal(waiverUsageSentence("A", "WR", []), null);
  assert.equal(waiverUsageSentence("A", "WR", null), null);
  assert.equal(waiverUsageSentence("A", "QB", [week(1, { targets: 1 })]), null);
  assert.equal(waiverUsageSentence("A", "K", [week(1, { targets: 1 })]), null);
  // unknown red-zone counts are omitted, not read as zero
  assert.equal(waiverUsageSentence("A", "WR", [week(1, { targets: 5 })]), "A: 5.0 targets in the last game.");
});

function pooledAnalysis() {
  return buildWaiverAnalysis({
    roster: {
      week: 6,
      slots: {
        starters: [{ player_key: "sleeper:1", name: "Weak WR", position: "WR", projected_points: 5, status: "ACTIVE" }],
        bench: [{ player_key: "sleeper:9", name: "Spare", position: "RB", projected_points: 2, status: "ACTIVE" }],
      },
    },
    pool: [{ player_key: "sleeper:77", name: "Sam Rookie", position: "WR", team: "DET", projected_points: 11, status: "ACTIVE" }],
    platform: "sleeper", leagueId: "L1", week: 6, season: 2026, scoringFormat: "PPR", availabilityConfirmed: true,
  });
}

function enricher(mode, repo) {
  const runtime = mode === null ? null : { mode, repository: repo };
  return createWaiverUsageEnricher({
    getRuntime: () => runtime,
    supabase: {},
    resolve: async () => new Map([["sleeper:77", "00-0099999"]]),
  });
}
const goodRepo = () => ({
  readOpportunityWeeks: async () => new Map([["00-0099999", [week(3, { targets: 8, red_zone_targets: 1 }), week(4, { targets: 9, red_zone_targets: 0 }), week(5, { targets: 10, red_zone_targets: 1 })]]]),
});

test("waiver best move gains a usage evidence row in shadow and warehouse modes", async () => {
  const analysis = pooledAnalysis();
  assert.equal(analysis.best_move.add.player_key, "sleeper:77");
  for (const mode of ["shadow", "warehouse"]) {
    const out = await enricher(mode, goodRepo())(analysis);
    const row = out.evidence.at(-1);
    assert.equal(row.category, "current_role");
    assert.equal(row.kind, "observed_usage");
    assert.match(row.statement, /^Sam Rookie: 9\.0 targets a game over the last 3 games, with 2 red-zone touches/);
    assert.equal(out.evidence.length, analysis.evidence.length + 1);
    assert.ok(WAIVER.categories.includes(row.category) && WAIVER.kinds.includes(row.kind));
  }
});

test("supabase mode never touches the warehouse and returns the same analysis", async () => {
  const analysis = pooledAnalysis();
  const repo = { readOpportunityWeeks: async () => { throw new Error("must not be called"); } };
  assert.equal(await enricher("supabase", repo)(analysis), analysis);
});

test("a warehouse outage, timeout, missing runtime or missing rows leaves the waiver response byte-identical", async () => {
  const analysis = pooledAnalysis();
  const baseline = JSON.stringify(analysis);
  const failing = { readOpportunityWeeks: async () => { throw new Error("refused"); } };
  const hanging = { readOpportunityWeeks: () => new Promise(() => {}) };
  const empty = { readOpportunityWeeks: async () => new Map([["00-0099999", []]]) };
  for (const [mode, repo] of [["shadow", failing], ["warehouse", failing], ["shadow", empty], ["shadow", { }], [null, null]]) {
    assert.equal(JSON.stringify(await enricher(mode, repo)(analysis)), baseline);
  }
  const slow = createWaiverUsageEnricher({
    getRuntime: () => ({ mode: "shadow", repository: hanging }), supabase: {}, budgetMs: 20,
    resolve: async () => new Map([["sleeper:77", "00-0099999"]]),
  });
  assert.equal(JSON.stringify(await slow(analysis)), baseline);
  const noCrosswalk = createWaiverUsageEnricher({
    getRuntime: () => ({ mode: "shadow", repository: goodRepo() }), supabase: {},
    resolve: async () => { throw new Error("crosswalk down"); },
  });
  assert.equal(JSON.stringify(await noCrosswalk(analysis)), baseline);
});

test("analyses without a recommended add are untouched (no projections, off season)", async () => {
  const offSeason = buildWaiverAnalysis({ roster: { slots: { starters: [], bench: [] } }, pool: [], platform: "yahoo", offSeason: true });
  assert.equal(await enricher("shadow", goodRepo())(offSeason), offSeason);
  const unprojected = buildWaiverAnalysis({
    roster: { slots: { starters: [{ player_key: "yahoo:1", name: "S", position: "WR", projected_points: 5 }], bench: [] } },
    pool: [{ player_key: "yahoo:2", name: "No Projection", position: "WR", projected_points: null }],
    platform: "yahoo", availabilityConfirmed: true,
  });
  assert.equal(unprojected.best_move, null);
  assert.equal(await enricher("shadow", goodRepo())(unprojected), unprojected);
});

// ---------------------------------------------------------------- Repository read

test("opportunity read is bounded, public-id only, and never selects snap data", async () => {
  let observed;
  const repository = createWarehouseUsageRepository({
    timeoutMs: 600,
    query: async (request) => {
      observed = request;
      return { rows: [{ gsis_id: "00-0031234", week: "3", carries: "10", targets: null, red_zone_carries: "2", red_zone_targets: null, inside_10_touches: null, inside_5_touches: null, end_zone_targets: null, deep_targets: "1" }] };
    },
  });
  const rows = await repository.readOpportunityWeeks({ gsisIds: ["00-0031234"], season: 2026, beforeWeek: 5 });
  assert.deepEqual(observed.values, [["00-0031234"], 2026, 5]);
  assert.equal(observed.query_timeout, 600);
  assert.match(observed.text, /season_type = 'REG'/);
  assert.doesNotMatch(observed.text, /snap|routes/i);
  assert.deepEqual(rows.get("00-0031234"), [{
    week: 3, carries: 10, targets: null, red_zone_carries: 2, red_zone_targets: null,
    inside_10_touches: null, inside_5_touches: null, end_zone_targets: null, deep_targets: 1,
  }]);
  await assert.rejects(repository.readOpportunityWeeks({ gsisIds: ["espn:1"], season: 2026, beforeWeek: 5 }), /public NFL GSIS identifiers/);
  assert.deepEqual(await repository.readOpportunityWeeks({ gsisIds: [], season: 2026, beforeWeek: 5 }), new Map());
});
