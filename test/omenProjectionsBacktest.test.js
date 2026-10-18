"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calibration,
  errorStats,
  evaluate,
  impliedPoints,
  PAIRED_EVIDENCE_POLICY,
  pairedComparison,
  ranks,
  relevanceFromHistory,
  renderMarkdown,
  runBacktest,
  shipRuleForPosition,
  spearman,
  walkForward,
  weeklyRankCorrelation,
} = require("../src/services/omenProjections/backtest");
const {
  createPgSource,
  EXPECTED_DATABASE,
  EXPECTED_LOGIN_ROLE,
  GAMES_SQL,
  PLAYER_WEEKS_SQL,
  SESSION_IDENTITY_SQL,
  SLEEPER_SQL,
  statsFromRow,
} = require("../src/services/omenProjections/pgSource");
const { parseArgs, parseSeasons, poolConfig } = require("../scripts/omen-projections-backtest");

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const TEAMS = ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG", "HHH"];

/** A small synthetic league: stable usage per player plus noise, 3 seasons x 17 weeks, deterministic. */
function makeWorld() {
  const players = [];
  for (let i = 0; i < 24; i += 1) {
    const kind = i % 3 === 0 ? "RB" : i % 3 === 1 ? "WR" : "TE";
    players.push({
      id: `omen:player:${kind.toLowerCase()}${i}`,
      kind,
      team: TEAMS[i % TEAMS.length],
      base: 3 + (i % 7) * 1.4,
      rb: 8 + (i % 5) * 3,
    });
  }
  const seasons = {};
  for (const season of [2021, 2022, 2023]) {
    const rand = lcg(season * 7919);
    const playerWeeks = [];
    const games = [];
    for (let week = 1; week <= 17; week += 1) {
      for (let t = 0; t < TEAMS.length; t += 2) {
        games.push({
          week,
          game_id: `${season}_${week}_${t}`,
          home: TEAMS[t],
          away: TEAMS[t + 1],
          spread_line: (rand() - 0.5) * 10,
          total_line: 40 + rand() * 10,
        });
      }
      for (const p of players) {
        if (rand() < 0.08) continue; // missed game
        const noise = () => (rand() - 0.5) * 4;
        const carries = p.kind === "RB" ? Math.max(0, Math.round(p.rb + noise() * 2)) : 0;
        const targets = Math.max(0, Math.round((p.kind === "RB" ? p.base / 2 : p.base) + noise()));
        const receptions = Math.round(targets * 0.65);
        const stats = {
          attempts: 0,
          completions: 0,
          passing_yards: 0,
          passing_tds: 0,
          passing_interceptions: 0,
          carries,
          rushing_yards: Math.round(carries * (4 + noise() / 2)),
          rushing_tds: rand() < carries * 0.003 ? 1 : 0,
          targets,
          receptions,
          receiving_yards: Math.round(receptions * (9 + noise())),
          receiving_tds: rand() < targets * 0.006 ? 1 : 0,
          fumbles_lost: 0,
        };
        playerWeeks.push({
          player_id: p.id,
          position: p.kind,
          team: p.team,
          week,
          stats,
          opp: { red_zone_carries: Math.round(carries * 0.1), red_zone_targets: Math.round(targets * 0.1) },
          reported_ppr: null,
        });
      }
    }
    seasons[season] = { playerWeeks, games };
  }
  return seasons;
}

function sourceFor(world, extra = {}) {
  return {
    loadedSeasons: [],
    async loadSeason(season) {
      this.loadedSeasons.push(season);
      const data = world[season];
      return data ? JSON.parse(JSON.stringify(data)) : null;
    },
    ...extra,
  };
}

function comparable(records, maxWeek) {
  return records
    .filter((r) => r.week <= maxWeek)
    .map((r) => ({
      season: r.season,
      week: r.week,
      id: r.player_id,
      pred: r.pred,
      band: r.band,
      sd: r.sd_hat_ppr,
      bucket: r.bucket,
      flags: r.flags,
    }));
}

test("no leakage: changing data at and after a week changes nothing projected up to and including that week", async () => {
  const world = makeWorld();
  const tainted = JSON.parse(JSON.stringify(world));
  for (const row of tainted[2023].playerWeeks) {
    if (row.week >= 6) {
      for (const key of Object.keys(row.stats)) row.stats[key] = row.stats[key] * 10 + 5;
    }
  }
  const options = { testSeasons: [2023], warmupSeasons: 2, positions: ["RB", "WR", "TE"] };
  const a = await walkForward({ source: sourceFor(world), ...options });
  const b = await walkForward({ source: sourceFor(tainted), ...options });
  assert.deepEqual(comparable(a.records, 6), comparable(b.records, 6));
  // ... while the actuals of week 6 really did change, so the comparison is not vacuous.
  const week6a = a.records.filter((r) => r.week === 6).map((r) => r.actual.ppr);
  const week6b = b.records.filter((r) => r.week === 6).map((r) => r.actual.ppr);
  assert.notDeepEqual(week6a, week6b);
  // and week 7 predictions DO see week 6 (history was appended after week 6 was projected).
  assert.notDeepEqual(
    comparable(a.records, 7).filter((r) => r.week === 7),
    comparable(b.records, 7).filter((r) => r.week === 7),
  );
});

test("no leakage: the whole test season, even its first week, never feeds its own priors", async () => {
  const world = makeWorld();
  const tainted = JSON.parse(JSON.stringify(world));
  for (const row of tainted[2023].playerWeeks)
    for (const key of Object.keys(row.stats)) row.stats[key] = row.stats[key] * 5 + 3;
  const options = { testSeasons: [2023], warmupSeasons: 2, positions: ["RB", "WR", "TE"] };
  const a = await walkForward({ source: sourceFor(world), ...options });
  const b = await walkForward({ source: sourceFor(tainted), ...options });
  assert.deepEqual(comparable(a.records, 1), comparable(b.records, 1));
  // A later test season does not leak backwards either: season 2022's projections ignore 2023.
  const both = await walkForward({
    source: sourceFor(world),
    testSeasons: [2022, 2023],
    warmupSeasons: 1,
    positions: ["RB", "WR", "TE"],
  });
  const onlyEarly = await walkForward({
    source: sourceFor({ 2021: world[2021], 2022: world[2022] }),
    testSeasons: [2022],
    warmupSeasons: 1,
    positions: ["RB", "WR", "TE"],
  });
  assert.deepEqual(
    comparable(
      both.records.filter((r) => r.season === 2022),
      99,
    ),
    comparable(onlyEarly.records, 99),
  );
});

test("interval widths come from earlier weeks only (no sd before enough earlier residuals)", async () => {
  const { records } = await walkForward({
    source: sourceFor(makeWorld()),
    testSeasons: [2023],
    warmupSeasons: 2,
    positions: ["RB", "WR", "TE"],
  });
  assert.ok(records.filter((r) => r.week === 1).every((r) => r.sd_hat_ppr == null));
  assert.ok(records.some((r) => r.sd_hat_ppr != null && r.sd_hat_ppr > 0));
});

test("implied team points follow nflverse's home-favoured sign convention", () => {
  const game = { home: "H", away: "A", spread_line: 3, total_line: 47 };
  assert.equal(impliedPoints(game, "H"), 25);
  assert.equal(impliedPoints(game, "A"), 22);
  assert.equal(impliedPoints(game, "Z"), null);
  assert.equal(impliedPoints({ ...game, total_line: null }, "H"), null);
});

test("metrics are computed correctly on a hand-made set", () => {
  const rec = (week, player, predicted, actual, extra = {}) => ({
    season: 2024,
    week,
    player_id: player,
    position: "WR",
    band: "high",
    sd_hat_ppr: null,
    pred: {
      model: { standard: predicted, half_ppr: predicted, ppr: predicted },
      ...(extra.last3 !== undefined ? { last3: extra.last3 } : {}),
    },
    actual: { standard: actual, half_ppr: actual, ppr: actual },
  });
  const records = [rec(1, "a", 10, 12), rec(1, "b", 8, 5), rec(1, "c", 3, 3), rec(2, "a", 11, 8)];
  const stats = errorStats(records, "model", "ppr");
  assert.equal(stats.n, 4);
  assert.equal(stats.mae, (2 + 3 + 0 + 3) / 4);
  assert.equal(stats.rmse, Math.round(Math.sqrt((4 + 9 + 0 + 9) / 4) * 10000) / 10000);
  assert.equal(stats.bias, (-2 + 3 + 0 + 3) / 4);
  assert.deepEqual(ranks([5, 1, 5, 9]), [2.5, 1, 2.5, 4]);
  assert.equal(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
  assert.equal(spearman([1, 2, 3, 4], [40, 30, 20, 10]), -1);
  assert.equal(spearman([1, 2], [1, 2]), null);
  // weekly rank correlation skips groups smaller than 8
  assert.equal(weeklyRankCorrelation(records, "model", "ppr").weeks, 0);
});

test("relevance is selected from pre-week opportunity and cannot be changed by a fantasy-points baseline", () => {
  const history = [1, 2, 3].map((week) => ({
    season: 2024,
    week,
    stats: { carries: 6, targets: 4, receptions: 0, rushing_yards: 0, receiving_yards: 0 },
  }));
  const selected = relevanceFromHistory("RB", history);
  assert.deepEqual(selected, { eligible: true, average_opportunities: 10, games: 3 });

  const fantasyInflated = history.map((row) => ({
    ...row,
    stats: { ...row.stats, receptions: 50, rushing_yards: 500, receiving_yards: 500 },
  }));
  assert.deepEqual(relevanceFromHistory("RB", fantasyInflated), selected);
  assert.equal(relevanceFromHistory("WR", history.slice(0, 2)).eligible, false, "three pre-week games are required");
});

test("the ship rule is explicit by season and must pass in both universes", () => {
  const records = [];
  for (const season of [2022, 2023, 2024]) {
    for (let i = 0; i < 120; i += 1) {
      const actual = 10;
      const modelError = season === 2024 ? 4 : 1;
      const baselineError = season === 2024 ? 1 : 4;
      records.push({
        season,
        week: 1 + (i % 17),
        player_id: `${season}-p${i}`,
        position: "WR",
        bucket: "established",
        band: "high",
        relevance_eligible: i < 110,
        sd_hat_ppr: null,
        actual: { standard: actual, half_ppr: actual, ppr: actual },
        pred: {
          model: { standard: actual + modelError, half_ppr: actual + modelError, ppr: actual + modelError },
          last3: { standard: actual + baselineError, half_ppr: actual + baselineError, ppr: actual + baselineError },
          season_avg: {
            standard: actual - baselineError,
            half_ppr: actual - baselineError,
            ppr: actual - baselineError,
          },
        },
      });
    }
  }
  const rule = shipRuleForPosition(records);
  assert.equal(rule.status, "PASS");
  assert.equal(rule.scoring_families.ppr.passing_seasons, 2);
  assert.equal(rule.scoring_families.ppr.by_season[2024].passes, false);

  const evaluated = evaluate(records, { positions: ["WR"] });
  assert.equal(evaluated.relevant.positions.WR.ship_rule.status, "PASS");
  assert.equal(evaluated.all.positions.WR.ship_rule.status, "PASS");
});

test("paired comparison: model clearly better, clearly worse, and indistinguishable", () => {
  const make = (modelErr, otherErr, n = 120) =>
    Array.from({ length: n }, (_, i) => ({
      season: 2024,
      week: 1 + (i % 17),
      player_id: `p${i}`,
      position: "RB",
      band: "high",
      sd_hat_ppr: null,
      actual: { standard: 10, half_ppr: 10, ppr: 10 },
      pred: {
        model: { standard: 10 + modelErr * (i % 2 ? 1 : -1), half_ppr: 0, ppr: 10 + modelErr * (i % 2 ? 1 : -1) },
        other: { standard: 10 + otherErr, half_ppr: 0, ppr: 10 + otherErr },
      },
    }));
  assert.equal(pairedComparison(make(1, 3), "model", "other", "ppr").verdict, "a_better");
  assert.equal(pairedComparison(make(3, 1), "model", "other", "ppr").verdict, "b_better");
  const same = pairedComparison(make(2, 2), "model", "other", "ppr");
  assert.equal(same.verdict, "no_clear_difference");
  assert.equal(pairedComparison([], "model", "other", "ppr").verdict, "insufficient_data");
  // pairs only where both predictors exist
  const mixed = make(1, 3, 10).map((r, i) => (i < 4 ? { ...r, pred: { model: r.pred.model } } : r));
  assert.equal(pairedComparison(mixed, "model", "other", "ppr").n, 6);
});

test("paired comparison holds below the versioned row and player-cluster evidence floors", () => {
  const make = (n, clusters) =>
    Array.from({ length: n }, (_, i) => ({
      season: 2024,
      week: 1 + (i % 17),
      player_id: `p${i % clusters}`,
      position: "WR",
      actual: { standard: 10, half_ppr: 10, ppr: 10 },
      pred: {
        model: { standard: 10, half_ppr: 10, ppr: 10 },
        last3: { standard: 20, half_ppr: 20, ppr: 20 },
      },
    }));
  assert.equal(pairedComparison(make(1, 1), "model", "last3", "ppr").verdict, "insufficient_data");
  assert.equal(pairedComparison(make(2, 2), "model", "last3", "ppr").verdict, "insufficient_data");
  assert.equal(pairedComparison(make(120, 1), "model", "last3", "ppr").verdict, "insufficient_data");
  assert.equal(
    pairedComparison(
      make(PAIRED_EVIDENCE_POLICY.minimum_rows, PAIRED_EVIDENCE_POLICY.minimum_player_clusters - 1),
      "model",
      "last3",
      "ppr",
    ).verdict,
    "insufficient_data",
  );
  const boundary = pairedComparison(
    make(PAIRED_EVIDENCE_POLICY.minimum_rows, PAIRED_EVIDENCE_POLICY.minimum_player_clusters),
    "model",
    "last3",
    "ppr",
  );
  assert.equal(boundary.verdict, "a_better");
  assert.equal(boundary.player_clusters, PAIRED_EVIDENCE_POLICY.minimum_player_clusters);
});

test("ship decisions are isolated by scoring family and sparse seasons hold", () => {
  const records = [];
  for (const season of [2022, 2023, 2024]) {
    for (let i = 0; i < 120; i += 1) {
      records.push({
        season,
        week: 1 + (i % 17),
        player_id: `${season}-p${i}`,
        position: "WR",
        relevance_eligible: true,
        actual: { standard: 10, half_ppr: 10, ppr: 10 },
        pred: {
          model: { standard: 15, half_ppr: 11, ppr: 11 },
          last3: { standard: 11, half_ppr: 14, ppr: 14 },
          season_avg: { standard: 9, half_ppr: 6, ppr: 6 },
        },
      });
    }
  }
  const rule = shipRuleForPosition(records);
  assert.equal(rule.scoring_families.standard.status, "FAIL");
  assert.equal(rule.scoring_families.half_ppr.status, "PASS");
  assert.equal(rule.scoring_families.ppr.status, "PASS");
  assert.equal(rule.status, "FAIL");

  const sparse = shipRuleForPosition(
    records.filter((row) => row.player_id.endsWith("p0") || row.player_id.endsWith("p1")),
  );
  assert.equal(sparse.status, "HOLD");
  assert.equal(sparse.scoring_families.ppr.insufficient_seasons, 3);
});

test("calibration reports error by band and the share of outcomes inside the 80% interval", () => {
  const records = [];
  for (let i = 0; i < 100; i += 1) {
    records.push({
      season: 2024,
      week: 1,
      player_id: `p${i}`,
      position: "WR",
      band: i < 50 ? "high" : "low",
      sd_hat_ppr: 2,
      actual: { ppr: 10 + (i % 10 < 8 ? 1 : 5), standard: 0, half_ppr: 0 },
      pred: { model: { ppr: 10, standard: 0, half_ppr: 0 } },
    });
  }
  const c = calibration(records);
  assert.equal(c.bands.high.n, 50);
  assert.equal(c.bands.high.interval_80.share_inside, 0.8); // |err| 1 inside (<= 2.56), 5 outside
  assert.equal(c.bands.low.interval_80.n, 50);
  assert.equal(typeof c.error_falls_as_confidence_rises, "boolean");
});

test("end to end on synthetic data: report shape, sensible errors, model not worse than naive on stable usage", async () => {
  const report = await runBacktest({
    source: sourceFor(makeWorld()),
    testSeasons: [2023],
    warmupSeasons: 2,
    positions: ["RB", "WR", "TE"],
    now: () => new Date("2026-10-12T00:00:00Z"),
  });
  assert.equal(report.meta.method_version, "omen-proj-v1");
  assert.equal(report.meta.generated_at, "2026-10-12T00:00:00.000Z");
  assert.deepEqual(report.meta.test_seasons, [2023]);
  assert.ok(report.meta.records > 300);
  assert.ok(report.meta.leakage_guards.length === 3);
  const wr = report.results.all.positions.WR;
  for (const scoring of ["standard", "half_ppr", "ppr"]) {
    for (const predictor of ["model", "model_no_context", "last3", "season_avg"]) {
      const s = wr.predictors[scoring][predictor];
      assert.ok(s.n > 100 && s.mae > 0 && s.rmse >= s.mae, `${scoring} ${predictor}`);
    }
    assert.equal(wr.predictors[scoring].sleeper, undefined);
  }
  // Sanity band only: a ~120-row synthetic position proves the harness runs, not that the model wins (the real
  // backtest decides that). The model must be in the same league as the naive baselines and not wildly biased.
  assert.ok(wr.predictors.ppr.model.mae <= wr.predictors.ppr.last3.mae * 1.3);
  assert.ok(Math.abs(wr.predictors.ppr.model.bias) < 1);
  assert.ok(Object.keys(wr.model_vs.ppr).includes("last3"));
  assert.ok(wr.by_bucket.established.n > 0);
  assert.ok(wr.calibration.bands.high || wr.calibration.bands.medium);
  const markdown = renderMarkdown(report);
  assert.match(markdown, /^# Omen projections backtest \(omen-proj-v1\)/);
  assert.match(markdown, /### WR/);
  assert.match(markdown, /Certification evidence by scoring family and season/);
  assert.match(markdown, /rows \/ players \/ verdict/);
  assert.match(markdown, /model against/);
  assert.match(markdown, /Confidence-band calibration/);
  assert.equal(
    /\d+(\.\d+)?%/.test(markdown.split("## How to read this")[0].replace(/80% interval|~0\.80/g, "")),
    false,
    "no percentages as confidence",
  );
});

test("the Sleeper benchmark appears only where stored projections exist", async () => {
  const world = makeWorld();
  const sleeper = new Map();
  for (const row of world[2023].playerWeeks) {
    if (row.week >= 3 && row.position === "WR")
      sleeper.set(`${row.week}|${row.player_id}`, { rec: 4, rec_yd: 50, rec_td: 0.3, pts_ppr: 999 });
  }
  const report = await runBacktest({
    source: sourceFor(world, { loadSleeper: async () => sleeper }),
    testSeasons: [2023],
    warmupSeasons: 2,
    positions: ["WR", "RB"],
  });
  assert.equal(report.meta.sleeper.available, true);
  assert.ok(report.results.all.positions.WR.predictors.ppr.sleeper.n > 50);
  assert.equal(report.results.all.positions.RB.predictors.ppr.sleeper, undefined);
  assert.ok(report.results.all.positions.WR.model_vs.ppr.sleeper.n > 50);
  const none = await runBacktest({
    source: sourceFor(world, { loadSleeper: async () => null }),
    testSeasons: [2023],
    warmupSeasons: 2,
    positions: ["WR"],
  });
  assert.equal(none.meta.sleeper.requested, true);
  assert.equal(none.meta.sleeper.available, false);
});

test("scoring check compares recomputed PPR with nflverse's number", async () => {
  const world = makeWorld();
  for (const row of world[2023].playerWeeks) {
    row.reported_ppr =
      row.stats.rushing_yards * 0.1 +
      row.stats.receiving_yards * 0.1 +
      row.stats.receptions +
      6 * (row.stats.rushing_tds + row.stats.receiving_tds);
  }
  const report = await runBacktest({
    source: sourceFor(world),
    testSeasons: [2023],
    warmupSeasons: 2,
    positions: ["RB", "WR", "TE"],
  });
  assert.ok(report.meta.scoring_check.n > 300);
  assert.ok(report.meta.scoring_check.max_abs_diff < 1e-6);
  assert.equal(report.meta.scoring_check.share_within_half_point, 1);
});

test("the postgres source only reads, refuses a writable session, and never selects snap counts", async () => {
  for (const sql of [PLAYER_WEEKS_SQL, GAMES_SQL, SLEEPER_SQL]) {
    assert.match(sql.trim(), /^SELECT/i);
    assert.equal(/\b(insert|update|delete|truncate|drop|alter|create|grant)\b/i.test(sql), false);
    assert.equal(/snap/i.test(sql), false);
  }
  assert.match(SESSION_IDENTITY_SQL.trim(), /^SELECT/i);
  const writable = createPgSource({
    query: async () => ({
      rows: [{ database_name: EXPECTED_DATABASE, role_name: EXPECTED_LOGIN_ROLE, transaction_read_only: "off" }],
    }),
  });
  await assert.rejects(() => writable.assertReadOnly(), /not read-only/);
  const superuser = createPgSource({
    query: async () => ({
      rows: [{ database_name: EXPECTED_DATABASE, role_name: "postgres", transaction_read_only: "on" }],
    }),
  });
  await assert.rejects(() => superuser.assertReadOnly(), /expected omen_warehouse_read/);
  const wrongDatabase = createPgSource({
    query: async () => ({
      rows: [{ database_name: "postgres", role_name: EXPECTED_LOGIN_ROLE, transaction_read_only: "on" }],
    }),
  });
  await assert.rejects(() => wrongDatabase.assertReadOnly(), /expected omen_warehouse_read/);
  const readOnly = createPgSource({
    query: async () => ({
      rows: [{ database_name: EXPECTED_DATABASE, role_name: EXPECTED_LOGIN_ROLE, transaction_read_only: "on" }],
    }),
  });
  await readOnly.assertReadOnly();

  const calls = [];
  const source = createPgSource({
    includeSleeper: true,
    query: async (text, values) => {
      calls.push(text);
      if (text.includes("nfl_player_weekly_stats")) {
        return {
          rows: [
            {
              week: 3,
              player_id: "omen:player:x",
              display_name: "X",
              position: "WR",
              team: "KC",
              fantasy_points_ppr: "12.5",
              passing_attempts: null,
              carries: "1",
              targets: "7",
              receptions: "5",
              passing_yards: null,
              rushing_yards: "3",
              receiving_yards: "80",
              stats: { receiving_tds: 1, receiving_fumbles_lost: 1, sack_fumbles_lost: 1 },
              has_opportunity: false,
              red_zone_targets: null,
              red_zone_carries: null,
            },
          ],
        };
      }
      if (text.includes("nfl_games"))
        return { rows: [{ week: 3, game_id: "g", home: "KC", away: "LV", spread_line: "-3.5", total_line: "47" }] };
      throw new Error("relation does not exist");
    },
  });
  const season = await source.loadSeason(2024);
  assert.deepEqual(season.playerWeeks[0].stats, {
    attempts: 0,
    completions: 0,
    passing_yards: 0,
    passing_tds: 0,
    passing_interceptions: 0,
    carries: 1,
    rushing_yards: 3,
    rushing_tds: 0,
    targets: 7,
    receptions: 5,
    receiving_yards: 80,
    receiving_tds: 1,
    fumbles_lost: 2,
  });
  assert.equal(season.playerWeeks[0].opp, null);
  assert.equal(season.games[0].spread_line, -3.5);
  assert.equal(await source.loadSleeper(2024), null);
  assert.ok(calls.every((c) => /^\s*SELECT/i.test(c)));
  assert.equal(statsFromRow({ stats: null }).targets, 0);
});

test("the script parses its flags strictly and forces a read-only session", () => {
  assert.deepEqual(parseSeasons("2022-2024"), [2022, 2023, 2024]);
  assert.deepEqual(parseSeasons("2025"), [2025]);
  assert.throws(() => parseSeasons("2025-2020"), RangeError);
  assert.throws(() => parseSeasons("abc"), TypeError);
  const args = parseArgs([
    "--seasons",
    "2023-2024",
    "--out-dir",
    "/tmp/x",
    "--socket",
    "/var/run/pg",
    "--sleeper",
    "--positions",
    "wr,rb",
  ]);
  assert.deepEqual(args.positions, ["WR", "RB"]);
  assert.equal(args.sleeper, true);
  assert.throws(() => parseArgs(["--seasons", "2024", "--out-dir", "relative"]), /absolute/);
  assert.throws(() => parseArgs(["--seasons", "2024", "--out-dir", "/tmp/x", "--bogus", "1"]), /unknown flag/);
  assert.throws(() => parseArgs(["--out-dir", "/tmp/x"]), /--seasons/);
  const config = poolConfig(args, {});
  assert.match(config.options, /default_transaction_read_only=on/);
  assert.equal(config.user, "omen_warehouse_read");
  assert.throws(() => poolConfig({ ...args, socket: null }, {}), /url-file/);
});
