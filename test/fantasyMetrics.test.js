"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("zlib");
const { Readable } = require("stream");

const fp = require("../src/services/fantasyMetrics/fatedPoints");
const lines = require("../src/services/fantasyMetrics/fantasyMetricsLines");
const data = require("../src/services/fantasyMetrics/fantasyMetricsData");
const tables = require("../src/services/fantasyMetrics/xfp-tables-v1.json");
const { buildOpportunity } = require("../src/services/nflverseFacts");
const { START_SIT } = require("../src/services/evidenceVocabulary");
const { buildEvidenceWhy } = require("../src/services/evidenceWhy");

function pbpRow(overrides = {}) {
  return {
    season: "2026", week: "3", season_type: "REG", game_id: "g", play_id: "1", posteam: "CAR",
    play_type: "pass", two_point_attempt: "0", qb_kneel: "0", qb_spike: "0", qb_scramble: "0",
    receiver_player_id: "WR1", rusher_player_id: "", td_player_id: "", fumbled_1_player_id: "",
    yardline_100: "30", down: "1", ydstogo: "10", goal_to_go: "0", air_yards: "8", cp: "0.7",
    xyac_mean_yardage: "4", complete_pass: "1", touchdown: "0", fumble_lost: "0",
    receiving_yards: "12", rushing_yards: "", ...overrides,
  };
}

const carry = (o = {}) => pbpRow({ play_type: "run", receiver_player_id: "", rusher_player_id: "RB1", air_yards: "", cp: "", xyac_mean_yardage: "", complete_pass: "0", receiving_yards: "", rushing_yards: "5", ...o });

test("lookup tables are a versioned artifact trained on earlier seasons only", () => {
  assert.equal(tables.formula_version, fp.FORMULA_VERSION);
  assert.deepEqual(tables.training_seasons, [2023, 2024, 2025]);
  assert.match(tables.content_sha256, /^sha256:[0-9a-f]{64}$/);
  assert.equal(tables.attribution, "nflverse");
  for (const key of ["t", "r", "s"]) assert.ok(tables.buckets[key].n >= fp.MIN_BUCKET_PLAYS, key);
});

test("bucket edges", () => {
  assert.equal(fp.yardlineBucket(2), "1-2");
  assert.equal(fp.yardlineBucket(3), "3-5");
  assert.equal(fp.yardlineBucket(20), "11-20");
  assert.equal(fp.yardlineBucket(99), "81-99");
  assert.equal(fp.airBucket(0), "le0");
  assert.equal(fp.airBucket(9), "1-9");
  assert.equal(fp.airBucket(20), "20+");
  assert.equal(fp.airBucket(null), "na");
  assert.equal(fp.togoBucket(11), "11+");
});

test("compactPlay counts targets and carries, and excludes two-point tries, kneels, spikes, no-plays", () => {
  assert.equal(fp.compactPlay(pbpRow()).type, "target");
  assert.equal(fp.compactPlay(carry()).type, "carry");
  assert.equal(fp.compactPlay(pbpRow({ two_point_attempt: "1" })), null);
  assert.equal(fp.compactPlay(carry({ qb_kneel: "1" })), null);
  assert.equal(fp.compactPlay(pbpRow({ qb_spike: "1" })), null);
  assert.equal(fp.compactPlay(pbpRow({ play_type: "no_play" })), null);
  assert.equal(fp.compactPlay(pbpRow({ season_type: "PRE" })), null);
  assert.equal(fp.compactPlay(pbpRow({ yardline_100: "NA" })), null);
});

test("a TD or lost fumble counts only for the player it belongs to", () => {
  const mine = fp.compactPlay(pbpRow({ touchdown: "1", td_player_id: "WR1" }));
  const theirs = fp.compactPlay(pbpRow({ touchdown: "1", td_player_id: "OTHER" }));
  assert.equal(mine.td, true);
  assert.equal(theirs.td, false);
  assert.equal(fp.compactPlay(carry({ fumble_lost: "1", fumbled_1_player_id: "RB1" })).fumbleLost, true);
});

test("target expectation uses nflverse cp and xyac, and falls back to the table when they are missing", () => {
  const model = fp.playFacts(fp.compactPlay(pbpRow()), tables);
  assert.equal(model.fallback, false);
  assert.equal(model.expected.receiving_receptions, 0.7);
  assert.ok(Math.abs(model.expected.receiving_yards - 0.7 * (8 + 4)) < 1e-9);
  const fallback = fp.playFacts(fp.compactPlay(pbpRow({ cp: "NA" })), tables);
  assert.equal(fallback.fallback, true);
  assert.ok(fallback.expected.receiving_receptions > 0 && fallback.expected.receiving_receptions < 1);
});

test("goal-line carries carry a much higher expected TD than midfield carries", () => {
  const goal = fp.playFacts(fp.compactPlay(carry({ yardline_100: "1", goal_to_go: "1", ydstogo: "1" })), tables);
  const mid = fp.playFacts(fp.compactPlay(carry({ yardline_100: "50" })), tables);
  assert.ok(goal.expected.rushing_touchdowns > 0.3);
  assert.ok(mid.expected.rushing_touchdowns < 0.02);
});

test("opportunity counts match nflverseFacts.buildOpportunity (the rules Codex Batch C uses)", () => {
  const rows = [
    pbpRow({ yardline_100: "18", air_yards: "20" }),
    pbpRow({ yardline_100: "8", air_yards: "3" }),
    pbpRow({ yardline_100: "40", air_yards: "25" }),
    carry({ yardline_100: "4" }),
    carry({ yardline_100: "15" }),
  ];
  const roll = fp.rollupPlayerWeeks(rows.map(fp.compactPlay), tables);
  const reference = buildOpportunity(rows);
  const wr = roll.get("WR1|3").opportunity;
  const wrRef = reference.get("WR1|2026|3");
  assert.equal(wr.rz_targets, wrRef.rz_targets);
  assert.equal(wr.i10_targets, wrRef.i10_targets);
  assert.equal(wr.ez_targets, wrRef.ez_targets);
  assert.equal(wr.deep_targets, wrRef.deep_targets);
  const rb = roll.get("RB1|3").opportunity;
  const rbRef = reference.get("RB1|2026|3");
  assert.equal(rb.rz_carries, rbRef.rz_carries);
  assert.equal(rb.i10_carries, rbRef.i10_carries);
  assert.equal(rb.gl_carries, rbRef.gl_carries);
});

test("formatPoints and scoring-format labels", () => {
  const facts = { receiving_receptions: 5, receiving_yards: 60, rushing_yards: 20, receiving_touchdowns: 1, fumbles_lost: 1 };
  assert.ok(Math.abs(fp.formatPoints(facts, 1) - (5 + 8 + 6 - 2)) < 1e-9);
  assert.ok(Math.abs(fp.formatPoints(facts, 0) - (8 + 6 - 2)) < 1e-9);
  assert.deepEqual(fp.formatFromLabel("0.5 PPR"), { rec: 0.5, label: "half-PPR", verified: true });
  assert.deepEqual(fp.formatFromLabel("standard scoring"), { rec: 0, label: "standard", verified: true });
  assert.deepEqual(fp.formatFromLabel("1 point per reception"), { rec: 1, label: "PPR", verified: true });
  assert.deepEqual(fp.formatFromLabel(null), { rec: 1, label: "PPR", verified: false });
});

function week(w, { expected, actual, team = "CAR", player = "WR1", targets = 6, carries = 0, opportunity = {} }) {
  return { player, week: w, team, targets, carries, expected, actual, fallbackPlays: 0, opportunity: { rz_targets: 0, i10_targets: 0, ez_targets: 0, deep_targets: 0, rz_carries: 0, i10_carries: 0, gl_carries: 0, ...opportunity } };
}

test("Fated Points line states the gap, and running hot or cold only past the threshold", () => {
  const exp = { receiving_receptions: 5, receiving_yards: 60 }; // 11 PPR
  const hot = lines.fatedLine({ name: "A", rows: [week(1, { expected: exp, actual: { receiving_receptions: 7, receiving_yards: 100 } })], rec: 1, label: "PPR" });
  assert.match(hot, /worth 11\.0 PPR points in his last game; he scored 17\.0 \(Fate Gap \+6\.0\)\. He has been running hot\./);
  const level = lines.fatedLine({ name: "A", rows: [week(1, { expected: exp, actual: exp })], rec: 1, label: "PPR" });
  assert.doesNotMatch(level, /running/);
  assert.doesNotMatch(level, /predict|will score/i);
  const unverified = lines.fatedLine({ name: "A", rows: [week(1, { expected: exp, actual: exp })], rec: 1, label: "PPR", verified: false });
  assert.match(unverified, /worth 11\.0 points in PPR scoring \(Omen hasn't verified this league's scoring\)/);
});

test("TD Fate Gap appears only when the gap is at least 1.5 TDs", () => {
  const rows = [1, 2, 3].map((w) => week(w, { expected: { receiving_touchdowns: 0.3 }, actual: { receiving_touchdowns: 1 } }));
  assert.match(lines.tdLine({ name: "A", rows }), /3 TDs this season on usage that usually produces 0\.9/);
  const close = [1, 2].map((w) => week(w, { expected: { receiving_touchdowns: 0.5 }, actual: { receiving_touchdowns: 1 } }));
  assert.equal(lines.tdLine({ name: "A", rows: close }), null);
});

function bundleFrom(rollups, positions, names = new Map(), games = []) {
  const byPlayer = new Map();
  const byTeam = new Map();
  for (const r of rollups) {
    if (!byPlayer.has(r.player)) byPlayer.set(r.player, []);
    byPlayer.get(r.player).push(r);
    if (!byTeam.has(r.team)) byTeam.set(r.team, []);
    byTeam.get(r.team).push(r);
  }
  const teamWeeks = new Map([...byTeam].map(([t, rows]) => [t, [...new Set(rows.map((r) => r.week))].sort((a, b) => a - b)]));
  return { byPlayer, byTeam, teamWeeks, positions, names, games };
}

test("Pecking Order ranks by Fated Points share within the position group", () => {
  const big = { receiving_receptions: 6, receiving_yards: 80 };
  const small = { receiving_receptions: 2, receiving_yards: 20 };
  const rollups = [1, 2, 3].flatMap((w) => [
    week(w, { player: "WR1", expected: big, actual: big }),
    week(w, { player: "WR2", expected: small, actual: small }),
    week(w, { player: "TE1", expected: big, actual: big }),
  ]);
  const bundle = bundleFrom(rollups, new Map([["WR1", "WR"], ["WR2", "WR"], ["TE1", "TE"]]));
  const line = lines.peckingOrderLine({ name: "B", gsis: "WR2", position: "WR", team: "CAR", beforeWeek: 4, bundle });
  assert.match(line, /2nd among Carolina WRs, with 22% of their Fated Points over the team's last 3 games/);
});

test("Next Man Up needs two quiet games, never says 'missed', and ignores weeks after a teammate moves", () => {
  const mk = (player, w, targets) => week(w, { player, targets, expected: {}, actual: {} });
  const base = [1, 2, 3, 4, 5].map((w) => mk("WR1", w, w <= 3 ? 4 : 11));
  const mateAll = [1, 2, 3].map((w) => mk("WR2", w, 8));
  const bundle = bundleFrom([...base, ...mateAll], new Map([["WR1", "WR"], ["WR2", "WR"]]), new Map([["WR2", "Mate"]]));
  assert.match(lines.nextManUpLine({ name: "B", gsis: "WR1", position: "WR", team: "CAR", beforeWeek: 6, bundle }),
    /in the 2 games Mate had no targets or carries, B averaged 11\.0 targets and carries, against 4\.0 when both were used/);
  const oneMissed = bundleFrom([...base.slice(0, 4), ...mateAll], new Map([["WR1", "WR"], ["WR2", "WR"]]));
  assert.equal(lines.nextManUpLine({ name: "B", gsis: "WR1", position: "WR", team: "CAR", beforeWeek: 5, bundle: oneMissed }), null);
  // The teammate was traded after week 3: weeks 4-5 are not "without him" on this team.
  const traded = bundleFrom([...base, ...mateAll, week(4, { player: "WR2", team: "NO", expected: {}, actual: {} })], new Map([["WR1", "WR"], ["WR2", "WR"]]));
  assert.equal(lines.nextManUpLine({ name: "B", gsis: "WR1", position: "WR", team: "CAR", beforeWeek: 6, bundle: traded }), null);
});

test("a player nflverse lists as FB is grouped with his team's RBs", () => {
  const big = { rushing_yards: 60 };
  const rollups = [1, 2, 3].flatMap((w) => [
    week(w, { player: "RB1", carries: 12, targets: 0, expected: big, actual: big }),
    week(w, { player: "FB1", carries: 3, targets: 0, expected: { rushing_yards: 10 }, actual: { rushing_yards: 10 } }),
  ]);
  const bundle = bundleFrom(rollups, new Map([["RB1", "RB"], ["FB1", "FB"]]));
  const rows = lines.fantasyMetricsEvidence({ name: "Full Back", gsis: "FB1", position: "RB", team: "CAR", beforeWeek: 4, scoringFormat: "0.5 PPR", bundle });
  assert.ok(rows.some((r) => /2nd among Carolina RBs/.test(r.statement)));
});

test("Projected Team Score: nflverse spread is home-positive; flags at 10-point spread and 50 total", () => {
  const bundle = { games: [{ week: 6, home: "LA", away: "ARI", spread: 10.5, total: 51.5 }] };
  assert.equal(lines.projectedTeamScore({ team: "ARI", week: 6, bundle }),
    "Projected Team Score: Arizona 20.5, the Rams 31.0, from the game's spread and total. Blowout watch, Shootout watch.");
  assert.equal(lines.projectedTeamScore({ team: "LA", week: 7, bundle }), null);
  assert.equal(lines.projectedTeamScore({ team: "LA", week: 6, bundle: { games: [{ week: 6, home: "LA", away: "ARI", spread: null, total: 44 }] } }), null);
});

test("evidence rows use the closed vocabulary, skip non-skill players, and rank under observed usage", () => {
  const rollups = [1, 2, 3].map((w) => week(w, { player: "WR1", expected: { receiving_receptions: 5, receiving_yards: 60 }, actual: { receiving_receptions: 5, receiving_yards: 60 }, opportunity: { rz_targets: 1 } }));
  const bundle = bundleFrom(rollups, new Map([["WR1", "WR"]]), new Map(), [{ week: 4, home: "CAR", away: "NO", spread: 3, total: 44 }]);
  const rows = lines.fantasyMetricsEvidence({ name: "A", gsis: "WR1", position: "WR", team: "CAR", beforeWeek: 4, scoringFormat: null, bundle });
  assert.ok(rows.length >= 2);
  for (const r of rows) {
    assert.ok(START_SIT.categories.includes(r.category));
    assert.ok(START_SIT.kinds.includes(r.kind));
  }
  assert.deepEqual(lines.fantasyMetricsEvidence({ name: "Q", gsis: "QB1", position: "QB", team: "CAR", beforeWeek: 4, bundle }), []);
  assert.deepEqual(lines.fantasyMetricsEvidence({ name: "A", gsis: "WR1", position: "WR", team: "CAR", beforeWeek: 4, bundle: null }), []);
  const env = lines.gameEnvironmentEvidence({ teams: ["CAR", "car", "NO"], week: 4, bundle });
  assert.equal(env.length, 2);
  for (const r of env) assert.ok(START_SIT.categories.includes(r.category));
  const why = buildEvidenceWhy([
    { category: "recent_usage", kind: "verified", statement: "Usage line." },
    ...rows,
  ]);
  assert.equal(why[0].text, "Usage line.");
});

function gz(text) { return zlib.gzipSync(Buffer.from(text)); }

function csv(rows) {
  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map((r) => headers.map((h) => r[h]).join(","))].join("\n");
}

test("getSeasonBundle reads, caches with one download in flight, and returns null on failure", async () => {
  data._resetCache();
  const pbp = gz(csv([pbpRow(), carry({ week: "4" })]));
  const players = csv([{ gsis_id: "WR1", position: "WR", display_name: "Wide One" }, { gsis_id: "RB1", position: "RB", display_name: "Back One" }]);
  const games = csv([{ season: "2026", game_type: "REG", week: "5", home_team: "CAR", away_team: "NO", spread_line: "2.5", total_line: "41" }]);
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    if (url.endsWith(".csv.gz")) return { ok: true, status: 200, body: Readable.from([pbp]) };
    const text = url.endsWith("players.csv") ? players : games;
    return { ok: true, status: 200, text: async () => text };
  };
  const [a, b] = await Promise.all([
    data.getSeasonBundle({ season: 2026, fetchImpl, now: 1 }),
    data.getSeasonBundle({ season: 2026, fetchImpl, now: 2 }),
  ]);
  assert.equal(a, b);
  assert.equal(calls, 3);
  assert.equal(a.byPlayer.get("WR1").length, 1);
  assert.equal(a.positions.get("RB1"), "RB");
  assert.equal(a.games[0].home, "CAR");

  // Expired: the old bundle is returned at once and one background refresh starts.
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const stale = await data.getSeasonBundle({ season: 2026, fetchImpl, now: SIX_HOURS + 10 });
  assert.equal(stale, a);

  data._resetCache();
  let failingCalls = 0;
  const failing = async () => { failingCalls += 1; return { ok: false, status: 503 }; };
  assert.equal(await data.getSeasonBundle({ season: 2026, fetchImpl: failing, now: 3 }), null);
  const afterFirst = failingCalls;
  // Inside the failure window: no new downloads.
  assert.equal(await data.getSeasonBundle({ season: 2026, fetchImpl: failing, now: 4 }), null);
  assert.equal(failingCalls, afterFirst);
  data._resetCache();
});

test("readPlaysFromGzip rejects on a broken stream instead of hanging", async () => {
  const broken = new Readable({ read() { this.destroy(new Error("connection reset")); } });
  await assert.rejects(data.readPlaysFromGzip(broken), /connection reset|unexpected end/);
  await assert.rejects(data.readPlaysFromGzip(Readable.from([gz("a,b\n1,2\n")])), /missing columns/);
});
