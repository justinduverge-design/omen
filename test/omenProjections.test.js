"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_PRIORS,
  METHOD_VERSION,
  STAT_KEYS,
  buildPriors,
  projectPlayerWeek,
  scoreStatLine,
  scoreSleeperStatLine,
  sleeperStatLineToFacts,
  toSleeperStatLine,
  interpretStatus,
} = require("../src/services/omenProjections");

const emptyStats = Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
function wrGame(week, over = {}, season = 2025) {
  return {
    season,
    week,
    team: "KC",
    stats: { ...emptyStats, targets: 8, receptions: 5, receiving_yards: 70, ...over },
    opp: null,
    implied_points: 24,
  };
}
function rbGame(week, over = {}, season = 2025) {
  return {
    season,
    week,
    team: "SF",
    stats: { ...emptyStats, carries: 16, rushing_yards: 70, targets: 3, receptions: 2, receiving_yards: 14, ...over },
    opp: null,
    implied_points: 24,
  };
}
function history(make, weeks, season = 2025, over = {}) {
  return weeks.map((w) => make(w, over, season));
}

test("a projection is a stat line in nflverse keys, never a points total", () => {
  const out = projectPlayerWeek({
    position: "WR",
    season: 2025,
    week: 6,
    team: "KC",
    history: history(wrGame, [1, 2, 3, 4, 5]),
    game: { implied_points: 24 },
  });
  assert.equal(out.method_version, METHOD_VERSION);
  assert.deepEqual(Object.keys(out.stat_line), [...STAT_KEYS]);
  assert.equal(JSON.stringify(out).includes("fantasy_points"), false);
  assert.equal(out.stat_line.attempts, 0);
  assert.ok(out.stat_line.targets > 6 && out.stat_line.targets < 9);
  for (const value of Object.values(out.stat_line)) assert.ok(value >= 0 && Number.isFinite(value));
});

test("deterministic: the same input gives the same output", () => {
  const input = {
    position: "RB",
    season: 2025,
    week: 8,
    team: "SF",
    history: history(rbGame, [1, 2, 3, 4, 5, 6, 7]),
    game: { implied_points: 26 },
  };
  assert.deepEqual(projectPlayerWeek(input), projectPlayerWeek(JSON.parse(JSON.stringify(input))));
});

test("rows at or after the target week are ignored and counted, never used", () => {
  const prior = history(wrGame, [1, 2, 3]);
  const base = projectPlayerWeek({ position: "WR", season: 2025, week: 4, team: "KC", history: prior });
  const tainted = projectPlayerWeek({
    position: "WR",
    season: 2025,
    week: 4,
    team: "KC",
    history: [
      ...prior,
      wrGame(4, { targets: 40, receiving_yards: 900 }),
      wrGame(5, { targets: 40 }),
      wrGame(1, { targets: 40 }, 2026),
    ],
  });
  assert.deepEqual(tainted.stat_line, base.stat_line);
  assert.equal(tainted.inputs.ignored_future_rows, 3);
  assert.equal(base.inputs.ignored_future_rows, 0);
  assert.deepEqual(tainted.inputs.history_through, { season: 2025, week: 3 });
});

test("bye weeks and OUT-type statuses are empty lines by rule, with no band", () => {
  const h = history(wrGame, [1, 2, 3, 4]);
  const bye = projectPlayerWeek({ position: "WR", season: 2025, week: 5, history: h, game: { bye: true } });
  assert.equal(bye.availability.state, "bye");
  assert.ok(Object.values(bye.stat_line).every((v) => v === 0));
  assert.equal(bye.confidence.band, null);
  assert.deepEqual(bye.flags, ["bye_week"]);
  for (const status of ["Out", "IR", "injured reserve", "Suspended", "PUP"]) {
    const out = projectPlayerWeek({ position: "WR", season: 2025, week: 5, history: h, status });
    assert.equal(out.availability.state, "out", status);
    assert.ok(Object.values(out.stat_line).every((v) => v === 0));
    assert.equal(out.confidence.band, null);
  }
});

test("questionable and doubtful scale the line by Omen's rule and lower the band; unknown status does not", () => {
  const h = history(wrGame, [1, 2, 3, 4, 5, 6, 7, 8]);
  const none = projectPlayerWeek({ position: "WR", season: 2025, week: 9, team: "KC", history: h });
  const q = projectPlayerWeek({
    position: "WR",
    season: 2025,
    week: 9,
    team: "KC",
    history: h,
    status: "Questionable",
  });
  const d = projectPlayerWeek({ position: "WR", season: 2025, week: 9, team: "KC", history: h, status: "Doubtful" });
  assert.equal(none.inputs.status, "unknown");
  assert.equal(none.availability.state, "unknown");
  assert.ok(Math.abs(q.stat_line.targets - none.stat_line.targets * 0.85) < 0.01);
  assert.ok(d.stat_line.targets < q.stat_line.targets);
  assert.equal(none.confidence.band, "high");
  assert.equal(q.confidence.band, "medium");
  assert.ok(q.flags.includes("status_questionable"));
  assert.deepEqual(interpretStatus("who knows"), { state: "unknown", probability: 1, known: false, recognised: false });
  assert.ok(
    projectPlayerWeek({ position: "WR", season: 2025, week: 9, history: h, status: "who knows" }).flags.includes(
      "status_unrecognized",
    ),
  );
});

test("no history is flagged, low confidence, and uses the debut prior, never an invented history", () => {
  const out = projectPlayerWeek({ position: "RB", season: 2025, week: 1, team: "SF", history: [], rookie: true });
  assert.ok(out.flags.includes("rookie"));
  assert.equal(out.confidence.band, "low");
  assert.equal(out.sample.games_used, 0);
  assert.equal(out.stat_line.carries, DEFAULT_PRIORS.positions.RB.debut_volume.carries);
  const veteran = projectPlayerWeek({ position: "RB", season: 2025, week: 1, team: "SF", history: [] });
  assert.ok(veteran.flags.includes("no_history"));
  assert.equal(veteran.confidence.band, "low");
});

test("thin samples are shrunk toward the position; deep samples trust the player", () => {
  // One huge game: a 1-game WR with 20 targets must not be projected near 20.
  const thin = projectPlayerWeek({
    position: "WR",
    season: 2025,
    week: 3,
    team: "KC",
    history: [wrGame(1, { targets: 20 })],
  });
  assert.ok(thin.stat_line.targets < 20 * 0.75 + 4.6 * 0.25 + 0.01);
  assert.ok(thin.stat_line.targets > DEFAULT_PRIORS.positions.WR.volume.targets);
  assert.ok(thin.flags.includes("thin_sample"));
  assert.equal(thin.confidence.band, "low");
  const deep = projectPlayerWeek({
    position: "WR",
    season: 2025,
    week: 12,
    team: "KC",
    history: history(wrGame, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 2025, { targets: 20 }),
  });
  assert.ok(deep.stat_line.targets > thin.stat_line.targets);
  assert.ok(deep.stat_line.targets > 15);
  assert.equal(deep.confidence.band, "high");
});

test("efficiency regresses to the position: a lucky touchdown rate is pulled down", () => {
  const lucky = history(rbGame, [1, 2, 3, 4], 2025, { rushing_tds: 1 });
  const out = projectPlayerWeek({ position: "RB", season: 2025, week: 5, team: "SF", history: lucky });
  const rawRate = 1 / 16;
  const prior = DEFAULT_PRIORS.positions.RB.rates.rush_td_per_carry;
  assert.ok(out.components.rates.rush_td_per_carry < rawRate);
  assert.ok(out.components.rates.rush_td_per_carry > prior);
});

test("recent games count more than old ones, and a prior season counts less than this season", () => {
  const rising = [
    ...history(wrGame, [1, 2, 3, 4], 2025, { targets: 4 }),
    ...history(wrGame, [5, 6, 7, 8], 2025, { targets: 12 }),
  ];
  const falling = [
    ...history(wrGame, [1, 2, 3, 4], 2025, { targets: 12 }),
    ...history(wrGame, [5, 6, 7, 8], 2025, { targets: 4 }),
  ];
  const up = projectPlayerWeek({ position: "WR", season: 2025, week: 9, team: "KC", history: rising });
  const down = projectPlayerWeek({ position: "WR", season: 2025, week: 9, team: "KC", history: falling });
  assert.ok(up.stat_line.targets > down.stat_line.targets + 1);
  const lastYearBig = [
    ...history(wrGame, [10, 11, 12, 13], 2024, { targets: 14 }),
    ...history(wrGame, [1, 2, 3, 4], 2025, { targets: 6 }),
  ];
  const out = projectPlayerWeek({ position: "WR", season: 2025, week: 5, team: "KC", history: lastYearBig });
  assert.ok(out.stat_line.targets < 10);
});

test("a better game environment lifts volume and touchdowns, within the clamps; context can be turned off", () => {
  const h = history(rbGame, [1, 2, 3, 4, 5, 6]);
  const flat = projectPlayerWeek({
    position: "RB",
    season: 2025,
    week: 7,
    team: "SF",
    history: h,
    game: { implied_points: 24 },
  });
  const hot = projectPlayerWeek({
    position: "RB",
    season: 2025,
    week: 7,
    team: "SF",
    history: h,
    game: { implied_points: 32 },
  });
  const cold = projectPlayerWeek({
    position: "RB",
    season: 2025,
    week: 7,
    team: "SF",
    history: h,
    game: { implied_points: 10 },
  });
  const off = projectPlayerWeek(
    { position: "RB", season: 2025, week: 7, team: "SF", history: h, game: { implied_points: 32 } },
    { useGameContext: false },
  );
  assert.ok(hot.stat_line.carries > flat.stat_line.carries && hot.stat_line.rushing_tds > flat.stat_line.rushing_tds);
  assert.ok(cold.stat_line.carries < flat.stat_line.carries);
  assert.ok(hot.components.environment.volume_multiplier <= 1.1 + 1e-9);
  assert.ok(cold.components.environment.td_multiplier >= 0.8 - 1e-9);
  assert.equal(off.stat_line.carries, flat.stat_line.carries);
  assert.equal(off.inputs.game_context, "disabled");
  const missing = projectPlayerWeek({ position: "RB", season: 2025, week: 7, team: "SF", history: h, game: null });
  assert.ok(missing.flags.includes("no_game_context"));
  assert.equal(missing.stat_line.carries, flat.stat_line.carries);
});

test("red-zone work raises the touchdown rate, and the change is bounded", () => {
  const withRz = (rz) =>
    history(
      (w, o, s) => ({ ...rbGame(w, o, s), opp: { red_zone_carries: rz, red_zone_targets: 0 } }),
      [1, 2, 3, 4, 5, 6],
    );
  const none = projectPlayerWeek({ position: "RB", season: 2025, week: 7, team: "SF", history: withRz(0) });
  const lots = projectPlayerWeek({ position: "RB", season: 2025, week: 7, team: "SF", history: withRz(8) });
  assert.ok(lots.stat_line.rushing_tds > none.stat_line.rushing_tds);
  assert.ok(lots.components.red_zone_ratio.carries <= 2 + 1e-9);
  assert.ok(none.components.red_zone_ratio.carries >= 0.5 - 1e-9);
  assert.equal(lots.inputs.red_zone_detail, "used");
  const noDetail = projectPlayerWeek({
    position: "RB",
    season: 2025,
    week: 7,
    team: "SF",
    history: history(rbGame, [1, 2, 3, 4, 5, 6]),
  });
  assert.equal(noDetail.inputs.red_zone_detail, "unavailable");
  assert.ok(noDetail.flags.includes("no_red_zone_detail"));
});

test("a long gap or a team change lowers confidence and is flagged", () => {
  const h = history(wrGame, [1, 2, 3, 4, 5, 6]);
  const normal = projectPlayerWeek({ position: "WR", season: 2025, week: 7, team: "KC", history: h });
  const returning = projectPlayerWeek({ position: "WR", season: 2025, week: 13, team: "KC", history: h });
  const moved = projectPlayerWeek({ position: "WR", season: 2025, week: 7, team: "DAL", history: h });
  assert.equal(normal.confidence.band, "high");
  assert.ok(returning.flags.includes("returning_from_absence"));
  assert.equal(returning.confidence.band, "medium");
  assert.ok(moved.flags.includes("team_changed"));
  assert.equal(moved.confidence.band, "medium");
  assert.deepEqual(Object.keys(normal.confidence).sort(), ["band", "basis", "reasons"]);
  assert.equal(JSON.stringify(normal.confidence).includes("%"), false);
});

test("QBs project passing; others do not; unsupported positions return no line", () => {
  const qbGame = (w, o, s) => ({
    season: s ?? 2025,
    week: w,
    team: "BUF",
    stats: {
      ...emptyStats,
      attempts: 34,
      completions: 22,
      passing_yards: 260,
      passing_tds: 2,
      passing_interceptions: 1,
      carries: 5,
      rushing_yards: 25,
    },
    opp: null,
    implied_points: 24,
  });
  const qb = projectPlayerWeek({
    position: "QB",
    season: 2025,
    week: 8,
    team: "BUF",
    history: history(qbGame, [1, 2, 3, 4, 5, 6, 7]),
  });
  assert.ok(qb.stat_line.attempts > 28 && qb.stat_line.passing_yards > 200 && qb.stat_line.passing_tds > 1);
  assert.equal(qb.stat_line.targets, 0);
  const wr = projectPlayerWeek({
    position: "WR",
    season: 2025,
    week: 8,
    team: "BUF",
    history: history(wrGame, [1, 2, 3]),
  });
  assert.equal(wr.stat_line.attempts, 0);
  const k = projectPlayerWeek({ position: "K", season: 2025, week: 8, history: [] });
  assert.equal(k.supported, false);
  assert.equal(k.stat_line, null);
  assert.throws(() => projectPlayerWeek({ position: "WR", season: "2025", week: 3 }), TypeError);
});

test("buildPriors pools rates from the rows given and keeps defaults where data is thin", () => {
  assert.equal(buildPriors([]).version, "default-judgment");
  const rows = [];
  for (let i = 0; i < 300; i += 1) {
    rows.push({
      player_id: `p${i % 40}`,
      position: "RB",
      season: 2022 + (i % 2),
      week: 1 + (i % 17),
      stats: { ...emptyStats, carries: 20, rushing_yards: 100, rushing_tds: 1, targets: 4, receptions: 3 },
      opp: { red_zone_carries: 4, red_zone_targets: 1 },
    });
  }
  const priors = buildPriors(rows);
  assert.equal(priors.positions.RB.rates.rush_yards_per_carry, 5);
  assert.equal(priors.positions.RB.volume.carries, 20);
  assert.equal(priors.positions.RB.red_zone.carry_share, 0.2);
  assert.equal(priors.positions.WR.rates.catch_rate, DEFAULT_PRIORS.positions.WR.rates.catch_rate);
  assert.match(priors.version, /^trained:300-rows/);
});

test("stat lines score under any scoring; Sleeper lines convert without using provider points", () => {
  const line = {
    passing_yards: 250,
    passing_tds: 2,
    passing_interceptions: 1,
    rushing_yards: 20,
    rushing_tds: 0,
    receptions: 0,
    receiving_yards: 0,
    receiving_tds: 0,
    fumbles_lost: 0.5,
  };
  assert.equal(Math.round(scoreStatLine(line, "standard") * 1000) / 1000, 10 + 8 - 2 + 2 - 1);
  const wr = { receptions: 6, receiving_yards: 80, receiving_tds: 0.5 };
  assert.equal(scoreStatLine(wr, "ppr") - scoreStatLine(wr, "standard"), 6);
  assert.equal(scoreStatLine(wr, "half_ppr") - scoreStatLine(wr, "standard"), 3);
  assert.equal(scoreStatLine(wr, "ppr"), 6 + 8 + 3);
  assert.throws(() => scoreStatLine(wr, "nope"), TypeError);
  const sleeper = { pts_ppr: 999, rec: 6, rec_yd: 80, rec_td: 0.5, rush_2pt: 0.1, pass_2pt: 0.1 };
  assert.deepEqual(sleeperStatLineToFacts(sleeper), {
    receiving_receptions: 6,
    receiving_yards: 80,
    receiving_touchdowns: 0.5,
    two_point_conversions: 0.2,
  });
  assert.equal(scoreSleeperStatLine(sleeper, "ppr"), 17);
  const conv = toSleeperStatLine({ ...Object.fromEntries(STAT_KEYS.map((k) => [k, 1])) });
  assert.equal(conv.rec, 1);
  assert.equal(conv.fum_lost, 1);
  assert.equal(scoreSleeperStatLine(toSleeperStatLine(wr), "ppr"), scoreStatLine(wr, "ppr"));
});
