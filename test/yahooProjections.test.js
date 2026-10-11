"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  enrichYahooPlayers,
  projectYahooPool,
  resetYahooProjectionMemo,
  scoreStatLine,
  scoringFromSettings,
  settingsFromLeague,
} = require("../src/services/yahooProjections");
const optimizer = require("../src/services/optimizer");

// Yahoo stat ids from the live-verified map in scoringRuleSnapshot.YAHOO_STAT_MAP.
const stat = (stat_id, value) => ({ stat: { stat_id, value: String(value) } });
const PPR_MODIFIERS = [
  stat(4, 0.04), stat(5, 4), stat(6, -1), stat(9, 0.1), stat(10, 6),
  stat(11, 1), stat(12, 0.1), stat(13, 6), stat(18, -2),
];
const settingsWith = (modifiers, categories = []) => ({
  stat_modifiers: { stats: modifiers },
  stat_categories: { stats: categories },
});
const category = (stat_id, position_type) => ({ stat: { stat_id, position_type, position_types: [{ position_type }] } });

// What Sleeper returns for one player: stats plus its own PPR total, which must never be used.
const WR_LINE = { rec: 6, rec_yd: 80, rec_td: 0.5, rush_yd: 0, fum_lost: 0.1, pts_ppr: 999, pts_half_ppr: 999 };
const QB_LINE = { pass_yd: 250, pass_td: 1.8, pass_int: 0.7, rush_yd: 20, rush_td: 0.2 };

test("scoring a stat line with PPR rules reproduces the PPR total, and half-PPR does not", () => {
  const ppr = scoringFromSettings(settingsWith(PPR_MODIFIERS));
  assert.equal(ppr.approximateFor.size, 0);
  // 6 rec + 8.0 yds + 3.0 td - 0.2 fum
  assert.equal(scoreStatLine(WR_LINE, ppr.values), 16.8);

  const half = scoringFromSettings(settingsWith(PPR_MODIFIERS.map((m) => (m.stat.stat_id === 11 ? stat(11, 0.5) : m))));
  assert.equal(scoreStatLine(WR_LINE, half.values), 13.8);
});

test("Sleeper's own pts_* totals are never used, and an unscorable line is null, not zero", () => {
  const ppr = scoringFromSettings(settingsWith(PPR_MODIFIERS));
  assert.equal(scoreStatLine({ pts_ppr: 20 }, ppr.values), null);
  assert.equal(scoreStatLine({ gp: 1, bonus_rec_te: 3 }, ppr.values), null);
  assert.equal(scoreStatLine(null, ppr.values), null);
});

test("a rule for defence only makes the league approximate for nobody who is projected from offensive stats", () => {
  const settings = settingsWith([...PPR_MODIFIERS, stat(50, 10)], [category(50, "DT"), category(11, "O")]);
  const scoring = scoringFromSettings(settings);
  assert.deepEqual(scoring.unmapped, ["stat_50"]);
  assert.equal(scoring.approximateFor.size, 0);
});

test("an unmapped offensive rule, or one whose type is unknown, makes the totals approximate", () => {
  const offensive = scoringFromSettings(settingsWith([...PPR_MODIFIERS, stat(57, 2)], [category(57, "O")]));
  assert.deepEqual([...offensive.approximateFor], ["O"]);

  const unknownType = scoringFromSettings(settingsWith([...PPR_MODIFIERS, stat(57, 2)]));
  assert.deepEqual([...unknownType.approximateFor].sort(), ["K", "O"]);
});

test("unreadable settings give no scoring at all", () => {
  assert.equal(scoringFromSettings(null), null);
  assert.equal(scoringFromSettings({}), null);
});

test("league payload walk matches how the settings resolver reads it", () => {
  const settings = settingsWith(PPR_MODIFIERS);
  assert.equal(settingsFromLeague([{ league_key: "x" }, { settings: [settings] }]), settings);
  assert.equal(settingsFromLeague({ settings: [settings] }), settings);
  assert.equal(settingsFromLeague(null), null);
});

function fixture({ settings = settingsWith(PPR_MODIFIERS), sleeperPlayers, statLines } = {}) {
  resetYahooProjectionMemo();
  const calls = { settings: 0, statLines: 0, players: 0 };
  const client = { getLeagueSettings: async () => { calls.settings += 1; return [{ league_key: "L" }, { settings: [settings] }]; } };
  const players = sleeperPlayers || {
    "S-WR": { yahoo_id: 111, full_name: "Wes Receiver", position: "WR" },
    "S-QB": { yahoo_id: 222, full_name: "Quinn Passer Jr.", position: "QB" },
    "S-DUP1": { yahoo_id: 333, full_name: "Dupe One", position: "WR" },
    "S-DUP2": { yahoo_id: 333, full_name: "Dupe One", position: "WR" },
    "S-OTHER": { yahoo_id: 444, full_name: "Someone Else", position: "RB" },
  };
  const deps = {
    fetchStatLines: async () => { calls.statLines += 1; return statLines || { "S-WR": WR_LINE, "S-QB": QB_LINE, "S-DUP1": WR_LINE, "S-OTHER": WR_LINE }; },
    fetchPlayers: async () => { calls.players += 1; return players; },
  };
  return { client, deps, calls };
}

test("Yahoo players are projected through the Sleeper id, scored with the league's rules, and labelled", async () => {
  const { client, deps } = fixture();
  const roster = [
    { player_id: "111", name: "Wes Receiver", position: "WR", projected_points: null },
    { player_id: "222", name: "Quinn Passer", position: "QB", projected_points: null },
  ];
  const meta = await enrichYahooPlayers(roster, { client, leagueKey: "L", week: 8, season: 2026, deps });

  assert.equal(roster[0].projected_points, 16.8);
  assert.equal(roster[0].projection_source, "sleeper_public_projections");
  assert.equal(roster[0].projection_basis, "league_scoring");
  // 10 + 7.2 - 0.7 + 2 + 1.2
  assert.equal(roster[1].projected_points, 19.7);
  assert.deepEqual(meta, {
    available: true, source: "sleeper_public_projections", scoring_basis: "league_scoring",
    players_total: 2, players_with_projection: 2, reason: null,
  });
});

test("a pairing is refused when the names disagree, the id is shared, or Sleeper has no line", async () => {
  const { client, deps } = fixture();
  const roster = [
    { player_id: "444", name: "Totally Different", position: "RB", projected_points: null },
    { player_id: "333", name: "Dupe One", position: "WR", projected_points: null },
    { player_id: "999", name: "Unknown Guy", position: "WR", projected_points: null },
    { player_id: "555", name: "Team Defence", position: "DEF", projected_points: null },
  ];
  const meta = await enrichYahooPlayers(roster, { client, leagueKey: "L", week: 8, season: 2026, deps });

  assert.deepEqual(roster.map((p) => p.projected_points), [null, null, null, null]);
  assert.equal(meta.available, false);
  assert.equal(meta.reason, "no_matching_projections");
  assert.equal(meta.players_with_projection, 0);
});

test("when the league's scoring cannot be read there are no projections, never a PPR guess", async () => {
  const { client, deps, calls } = fixture();
  client.getLeagueSettings = async () => { throw new Error("yahoo down"); };
  const roster = [{ player_id: "111", name: "Wes Receiver", position: "WR", projected_points: null }];
  const meta = await enrichYahooPlayers(roster, { client, leagueKey: "L", week: 8, season: 2026, deps });

  assert.equal(roster[0].projected_points, null);
  assert.equal(meta.reason, "scoring_unreadable");
  assert.equal(calls.statLines, 0, "no Sleeper read is made without rules to score it");
});

test("an approximate league labels only the positions its unmapped rule touches", async () => {
  const settings = settingsWith([...PPR_MODIFIERS, stat(29, 1), stat(57, 2)], [category(57, "O")]);
  const { client, deps } = fixture({
    settings,
    sleeperPlayers: { "S-K": { yahoo_id: 7, full_name: "Kay Kicker", position: "K" }, "S-WR": { yahoo_id: 111, full_name: "Wes Receiver" } },
    statLines: { "S-K": { xpm: 3 }, "S-WR": WR_LINE },
  });
  const roster = [
    { player_id: "7", name: "Kay Kicker", position: "K", projected_points: null },
    { player_id: "111", name: "Wes Receiver", position: "WR", projected_points: null },
  ];
  const meta = await enrichYahooPlayers(roster, { client, leagueKey: "L", week: 8, season: 2026, deps });

  assert.equal(roster[0].projected_points, 3);
  assert.equal(roster[0].projection_basis, "league_scoring");
  assert.equal(roster[1].projection_basis, "approximate_scoring");
  assert.equal(meta.scoring_basis, "approximate_scoring");
});

test("league rules are read once per league, not once per call", async () => {
  const { client, deps, calls } = fixture();
  for (let i = 0; i < 3; i += 1) {
    await enrichYahooPlayers([{ player_id: "111", name: "Wes Receiver", position: "WR" }], { client, leagueKey: "L", week: 8, season: 2026, deps });
  }
  assert.equal(calls.settings, 1);
});

test("a slow provider costs this request its projections, not its latency", async () => {
  const { client, deps } = fixture();
  deps.fetchStatLines = () => new Promise(() => {});
  const roster = [{ player_id: "111", name: "Wes Receiver", position: "WR", projected_points: null }];
  const started = Date.now();
  const meta = await enrichYahooPlayers(roster, { client, leagueKey: "L", week: 8, season: 2026, deps, budgetMs: 50 });

  assert.ok(Date.now() - started < 1000);
  assert.equal(meta.reason, "timed_out");
  assert.equal(roster[0].projected_points, null);
});

test("an unknown week, no projectable players and the kill switch all leave players untouched", async () => {
  const { client, deps } = fixture();
  const roster = [{ player_id: "111", name: "Wes Receiver", position: "WR", projected_points: null }];
  assert.equal((await enrichYahooPlayers(roster, { client, leagueKey: "L", week: null, season: 2026, deps })).reason, "week_unknown");
  assert.equal((await enrichYahooPlayers([{ player_id: "1", name: "Defence", position: "DEF" }], { client, leagueKey: "L", week: 8, season: 2026, deps })).reason, "no_projectable_players");

  process.env.YAHOO_PROJECTIONS_DISABLED = "1";
  try {
    assert.equal((await enrichYahooPlayers(roster, { client, leagueKey: "L", week: 8, season: 2026, deps })).reason, "disabled");
  } finally {
    delete process.env.YAHOO_PROJECTIONS_DISABLED;
  }
  assert.equal(roster[0].projected_points, null);
});

test("projectYahooPool returns the pool with its coverage", async () => {
  const { client } = fixture();
  const pool = [{ player_id: "1", name: "Defence", position: "DEF" }];
  const result = await projectYahooPool(client, "L", 8, pool);
  assert.equal(result.pool, pool);
  assert.equal(result.projectionMeta.available, false);
});

// --- the engine must not turn "no number" into a zero -------------------------------------------

const rosterOf = (starters, bench) => ({ slots: { starters, bench, ir: [] } });
const wr = (key, projected, extra = {}) => ({
  player_key: key, name: key, position: "WR", eligible_positions: ["WR"], selected_position: "WR", status: "", projected_points: projected, ...extra,
});

test("an unprojected starter is never swapped for a projected bench player", () => {
  const bench = { ...wr("bench", 14), selected_position: "BN" };
  assert.deepEqual(optimizer.evaluateLineup(rosterOf([wr("starter", null)], [bench])), []);
});

test("an OUT starter without a projection is still replaced", () => {
  const bench = { ...wr("bench", 14), selected_position: "BN" };
  const swaps = optimizer.evaluateLineup(rosterOf([wr("starter", null, { status: "OUT" })], [bench]));
  assert.equal(swaps.length, 1);
  assert.equal(swaps[0].delta, 14);
});

test("an unprojected bench player is never offered as the better choice", () => {
  const bench = { ...wr("bench", null), selected_position: "BN" };
  assert.deepEqual(optimizer.evaluateLineup(rosterOf([wr("starter", 4)], [bench])), []);
});

test("waiver moves ignore unprojected pool players and unprojected rostered players", () => {
  const roster = rosterOf([wr("starter", 9)], [{ ...wr("unprojected", null), selected_position: "BN" }]);
  const pool = [wr("fa-null", null), wr("fa", 12)];
  const moves = optimizer.findWaiverMoves(roster, pool);
  assert.equal(moves.length, 1);
  assert.equal(moves[0].add.player_key, "fa");
  assert.equal(moves[0].drop.player_key, "starter");
  assert.equal(moves[0].delta, 3);
});
