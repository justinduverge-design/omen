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
  stripYahooProjections,
  isTransientMeta,
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
    sleeperPlayers: { "S-K": { yahoo_id: 7, full_name: "Kay Kicker", position: "K" }, "S-WR": { yahoo_id: 111, full_name: "Wes Receiver", position: "WR" } },
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

  for (const value of ["1", "true", "TRUE"]) {
    process.env.YAHOO_PROJECTIONS_DISABLED = value;
    try {
      assert.equal((await enrichYahooPlayers(roster, { client, leagueKey: "L", week: 8, season: 2026, deps })).reason, "disabled", value);
    } finally {
      delete process.env.YAHOO_PROJECTIONS_DISABLED;
    }
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
const yahooRosterOf = (starters, bench) => ({ ...rosterOf(starters, bench), projection_meta: { available: true } });
const wr = (key, projected, extra = {}) => ({
  player_key: key, name: key, position: "WR", eligible_positions: ["WR"], selected_position: "WR", status: "", projected_points: projected, ...extra,
});

test("an unprojected starter is never swapped for a projected bench player", () => {
  const bench = { ...wr("bench", 14), selected_position: "BN" };
  assert.deepEqual(optimizer.evaluateLineup(yahooRosterOf([wr("starter", null)], [bench])), []);
});

test("an OUT starter without a projection is still replaced", () => {
  const bench = { ...wr("bench", 14), selected_position: "BN" };
  const swaps = optimizer.evaluateLineup(yahooRosterOf([wr("starter", null, { status: "OUT" })], [bench]));
  assert.equal(swaps.length, 1);
  assert.equal(swaps[0].delta, 14);
});

test("an unprojected bench player is never offered as the better choice", () => {
  const bench = { ...wr("bench", null), selected_position: "BN" };
  assert.deepEqual(optimizer.evaluateLineup(yahooRosterOf([wr("starter", 4)], [bench])), []);
});

test("waiver moves ignore unprojected pool players and unprojected rostered players", () => {
  const roster = yahooRosterOf([wr("starter", 9)], [{ ...wr("unprojected", null), selected_position: "BN" }]);
  const pool = [wr("fa-null", null), wr("fa", 12)];
  const moves = optimizer.findWaiverMoves(roster, pool);
  assert.equal(moves.length, 1);
  assert.equal(moves[0].add.player_key, "fa");
  assert.equal(moves[0].drop.player_key, "starter");
  assert.equal(moves[0].delta, 3);
});

// --- review follow-ups ------------------------------------------------------------------------------

test("a same-named player at a different position is not paired", async () => {
  const { client, deps } = fixture({
    sleeperPlayers: { "S-1": { yahoo_id: 5, full_name: "Wes Receiver", position: "TE", fantasy_positions: ["TE"] } },
    statLines: { "S-1": WR_LINE },
  });
  const roster = [{ player_id: "5", name: "Wes Receiver", position: "WR", projected_points: null }];
  await enrichYahooPlayers(roster, { client, leagueKey: "L", week: 8, season: 2026, deps });
  assert.equal(roster[0].projected_points, null);
});

test("a mapped player whose whole NFL team has no projection this week is on a bye and projects zero", async () => {
  const sleeperPlayers = {
    "S-BYE": { yahoo_id: 61, full_name: "Bye Back", position: "RB", team: "MIA" },
    "S-INJ": { yahoo_id: 62, full_name: "Hurt Back", position: "RB", team: "KC" },
    "S-KC": { yahoo_id: 63, full_name: "Kay See", position: "WR", team: "KC" },
  };
  const statLines = { "S-KC": WR_LINE };
  for (let i = 0; i < 120; i += 1) {
    sleeperPlayers[`F${i}`] = { yahoo_id: 1000 + i, full_name: `Filler ${i}`, position: "WR", team: "KC" };
    statLines[`F${i}`] = WR_LINE;
  }
  const { client, deps } = fixture({ sleeperPlayers, statLines });
  const roster = [
    { player_id: "61", name: "Bye Back", position: "RB", projected_points: null },
    { player_id: "62", name: "Hurt Back", position: "RB", projected_points: null },
  ];
  await enrichYahooPlayers(roster, { client, leagueKey: "L", week: 8, season: 2026, deps });

  assert.equal(roster[0].projected_points, 0);
  assert.equal(roster[0].projection_basis, "bye_week");
  assert.equal(roster[1].projected_points, null, "his team plays, so a missing line is unknown, not zero");
});

test("a thin projection feed is never read as a league-wide bye", async () => {
  const { client, deps } = fixture({
    sleeperPlayers: { "S-X": { yahoo_id: 70, full_name: "Some Back", position: "RB", team: "MIA" }, "S-WR": { yahoo_id: 111, full_name: "Wes Receiver", position: "WR", team: "KC" } },
    statLines: { "S-WR": WR_LINE },
  });
  const roster = [{ player_id: "70", name: "Some Back", position: "RB", projected_points: null }];
  await enrichYahooPlayers(roster, { client, leagueKey: "L", week: 8, season: 2026, deps });
  assert.equal(roster[0].projected_points, null);
});

test("stripYahooProjections removes only what this module wrote", () => {
  const players = [
    { projected_points: 9, projection_source: "sleeper_public_projections", projection_basis: "league_scoring" },
    { projected_points: 7 },
  ];
  stripYahooProjections(players);
  assert.equal(players[0].projected_points, null);
  assert.equal("projection_source" in players[0], false);
  assert.equal(players[1].projected_points, 7);
});

test("only timeouts and provider errors count as transient", () => {
  assert.equal(isTransientMeta({ reason: "timed_out" }), true);
  assert.equal(isTransientMeta({ reason: "provider_error" }), true);
  assert.equal(isTransientMeta({ reason: "scoring_unreadable" }), false);
  assert.equal(isTransientMeta(null), false);
});

test("after a roster pass timed out, the pool gets only a short grace instead of a second full budget", async () => {
  const { client, deps } = fixture();
  deps.fetchStatLines = () => new Promise(() => {});
  const started = Date.now();
  const result = await require("../src/services/yahooProjections").projectYahooPool(
    client, "L", 8, [{ player_id: "111", name: "Wes Receiver", position: "WR" }],
    { rosterMeta: { reason: "timed_out" }, deps }
  );
  assert.ok(Date.now() - started < 1000);
  assert.equal(result.projectionMeta.reason, "timed_out");
});

// --- optimizer: who counts a null projection as zero --------------------------------------------

test("Sleeper and ESPN: a bye-week starter with no projection still swaps for a projected bench player", () => {
  const roster = rosterOf([wr("bye-starter", null)], [{ ...wr("bench", 11), selected_position: "BN" }]);
  const swaps = optimizer.evaluateLineup(roster);
  assert.equal(swaps.length, 1);
  assert.equal(swaps[0].to.player_key, "bench");
  assert.equal(swaps[0].delta, 11);
});

test("Yahoo: the same unprojected healthy starter is not swapped on an invented zero", () => {
  const roster = {
    ...rosterOf([wr("starter", null)], [{ ...wr("bench", 11), selected_position: "BN" }]),
    projection_meta: { available: true, players_total: 2, players_with_projection: 1 },
  };
  assert.deepEqual(optimizer.evaluateLineup(roster), []);
});

test("Yahoo: a bye-week starter carries an explicit zero and does swap", () => {
  const roster = {
    ...rosterOf([wr("starter", 0, { projection_basis: "bye_week" })], [{ ...wr("bench", 11), selected_position: "BN" }]),
    projection_meta: { available: true, players_total: 2, players_with_projection: 2 },
  };
  assert.equal(optimizer.evaluateLineup(roster).length, 1);
});
