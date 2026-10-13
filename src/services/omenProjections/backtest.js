"use strict";

/**
 * Walk-forward backtest of the Omen projection (omen-proj-v1).
 *
 * For every week of every test season the model projects each player who then played, using ONLY facts from
 * strictly earlier weeks, and is compared with what happened. Leakage is prevented structurally, not by care:
 *   - a player's history is appended to the store only AFTER every projection of that week is made;
 *   - position priors are rebuilt once per season from seasons strictly before it;
 *   - the interval widths used for calibration are learned from earlier weeks' residuals only.
 * `test/omenProjectionsBacktest.test.js` proves this by changing the data at and after a week and checking that
 * nothing projected up to that week moves.
 *
 * This module is pure over a `source` ({ loadSeason(season), loadSleeper?(season) }); the PostgreSQL source is in
 * pgSource.js and only ever reads. Metrics are computed on fantasy points under standard, half-PPR and PPR.
 */

const { CONFIDENCE, ENVIRONMENT, HALF_LIFE_GAMES_EFFICIENCY, HALF_LIFE_GAMES_VOLUME, METHOD_VERSION, POSITIONS, SEASON_DECAY, SHRINKAGE } =
  require("./constants");
const { buildPriors } = require("./priors");
const { projectPlayerWeek } = require("./projectPlayerWeek");
const { SCORING_PRESETS, scoreSleeperStatLine, scoreStatLine } = require("./scoring");

const SCORINGS = Object.freeze(["standard", "half_ppr", "ppr"]);
const PREDICTORS = Object.freeze(["model", "model_no_context", "last3", "season_avg", "sleeper"]);
const BASELINES = Object.freeze(["model_no_context", "last3", "season_avg", "sleeper"]);
const BANDS = Object.freeze(["low", "medium", "high"]);
const RELEVANCE_POLICY = Object.freeze({
  version: "preweek-opportunity-v1",
  window_games: 3,
  minimum_average_opportunities: Object.freeze({ QB: 20, RB: 8, WR: 4, TE: 3 }),
});
const MIN_RESIDUALS_FOR_INTERVAL = 100;
const Z_80 = 1.2815515655446004;
const MIN_GROUP_FOR_RANK = 8;
const PAIRED_EVIDENCE_POLICY = Object.freeze({
  version: "paired-evidence-v1",
  minimum_rows: 100,
  minimum_player_clusters: 20,
});

function impliedPoints(game, team) {
  const spread = Number(game.spread_line);
  const total = Number(game.total_line);
  if (!Number.isFinite(spread) || !Number.isFinite(total) || total <= 0) return null;
  // nflverse spread_line is from the home team's side: positive means the home team is favoured.
  if (team === game.home) return (total + spread) / 2;
  if (team === game.away) return (total - spread) / 2;
  return null;
}

function bucketFor(priorGames) {
  return priorGames === 0 ? "debut" : priorGames <= 3 ? "thin" : "established";
}

function mean(values) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

function scoreAll(statLine) {
  return Object.fromEntries(SCORINGS.map((scoring) => [scoring, scoreStatLine(statLine, scoring)]));
}

/** Select the evaluation population from pre-week opportunity only, never from a predictor. */
function relevanceFromHistory(position, history) {
  const threshold = RELEVANCE_POLICY.minimum_average_opportunities[position];
  if (!Number.isFinite(threshold)) return { eligible: false, average_opportunities: null, games: 0 };
  const rows = Array.isArray(history) ? history.slice(-RELEVANCE_POLICY.window_games) : [];
  if (rows.length < RELEVANCE_POLICY.window_games) {
    return { eligible: false, average_opportunities: null, games: rows.length };
  }
  const opportunities = rows.map((row) => {
    const stats = row?.stats || {};
    return position === "QB"
      ? Number(stats.attempts || 0) + Number(stats.carries || 0)
      : Number(stats.carries || 0) + Number(stats.targets || 0);
  });
  const average = mean(opportunities);
  return {
    eligible: Number.isFinite(average) && average >= threshold,
    average_opportunities: round(average),
    games: rows.length,
  };
}

function ranks(values) {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const out = new Array(values.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].value === order[i].value) j += 1;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) out[order[k].index] = rank;
    i = j + 1;
  }
  return out;
}

function pearson(xs, ys) {
  const n = xs.length;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}

function spearman(predicted, actual) {
  if (predicted.length < 3) return null;
  return pearson(ranks(predicted), ranks(actual));
}

function round(value, digits = 4) {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Walk every test season week by week. Returns per-player-week records and run metadata. */
async function walkForward({ source, testSeasons, warmupSeasons = 2, positions = POSITIONS, onProgress = () => {} }) {
  if (!source || typeof source.loadSeason !== "function") throw new TypeError("source.loadSeason is required");
  const tests = [...new Set(testSeasons)].sort((a, b) => a - b);
  if (!tests.length) throw new TypeError("testSeasons is empty");
  const first = tests[0] - Math.max(0, warmupSeasons);
  const last = tests[tests.length - 1];

  const histories = new Map(); // player_id -> rows already played, oldest first
  const trainRows = []; // every normalized row of seasons already finished
  const records = [];
  const residuals = new Map(); // "POS|band" -> { n, sum, sumsq } of (actual ppr - model ppr), earlier weeks only
  const meta = { seasons: {}, scoring_check: { n: 0, abs_diff_sum: 0, within_half_point: 0, max_abs_diff: 0 }, sleeper: { requested: false, rows: 0, available: false } };
  const testSet = new Set(tests);

  for (let season = first; season <= last; season += 1) {
    const loaded = await source.loadSeason(season);
    if (!loaded) continue;
    const { playerWeeks = [], games = [] } = loaded;
    const gameByTeamWeek = new Map();
    for (const game of games) {
      gameByTeamWeek.set(`${game.week}|${game.home}`, game);
      gameByTeamWeek.set(`${game.week}|${game.away}`, game);
    }
    const sleeper = testSet.has(season) && typeof source.loadSleeper === "function" ? await source.loadSleeper(season) : null;
    if (testSet.has(season) && typeof source.loadSleeper === "function") {
      meta.sleeper.requested = true;
      if (sleeper) { meta.sleeper.available = true; meta.sleeper.rows += sleeper.size; }
    }

    const rows = playerWeeks
      .filter((row) => positions.includes(row.position))
      .map((row) => {
        const game = gameByTeamWeek.get(`${row.week}|${row.team}`) || null;
        return { ...row, season, game, implied_points: game ? impliedPoints(game, row.team) : null };
      });
    const byWeek = new Map();
    for (const row of rows) {
      if (!byWeek.has(row.week)) byWeek.set(row.week, []);
      byWeek.get(row.week).push(row);
    }
    const weeks = [...byWeek.keys()].sort((a, b) => a - b);
    meta.seasons[season] = { tested: testSet.has(season), player_weeks: rows.length, weeks: weeks.length, games: games.length };

    // Priors for this season: rows of strictly earlier seasons only.
    const priors = testSet.has(season) ? buildPriors(trainRows) : null;
    if (priors) meta.seasons[season].priors_version = priors.version;

    for (const week of weeks) {
      const target = byWeek.get(week);
      const weekRecords = [];
      if (testSet.has(season)) {
        for (const row of target) {
          const history = histories.get(row.player_id) || [];
          const common = {
            player_id: row.player_id, position: row.position, season, week, team: row.team, priors,
            history, game: row.game ? { implied_points: row.implied_points } : null,
          };
          const model = projectPlayerWeek(common, { useGameContext: true });
          const noContext = projectPlayerWeek(common, { useGameContext: false });
          const recent = history.slice(-3);
          const relevance = relevanceFromHistory(row.position, history);
          const sameSeason = history.filter((h) => h.season === season);
          const seasonRows = sameSeason.length ? sameSeason : history.filter((h) => h.season === season - 1);
          const baselineScores = (selected) => (selected.length
            ? Object.fromEntries(SCORINGS.map((s) => [s, mean(selected.map((h) => scoreStatLine(h.stats, s)))]))
            : null);
          const sleeperLine = sleeper ? sleeper.get(`${week}|${row.player_id}`) : null;
          const last3 = baselineScores(recent);
          const record = {
            season, week, player_id: row.player_id, position: row.position,
            prior_games: history.length,
            bucket: bucketFor(history.length),
            band: model.confidence.band,
            flags: model.flags,
            actual: scoreAll(row.stats),
            pred: {
              model: scoreAll(model.stat_line),
              model_no_context: scoreAll(noContext.stat_line),
              last3,
              season_avg: baselineScores(seasonRows),
              sleeper: sleeperLine ? Object.fromEntries(SCORINGS.map((s) => [s, scoreSleeperStatLine(sleeperLine, s)])) : null,
            },
            relevance_eligible: relevance.eligible,
            relevance_opportunities: relevance.average_opportunities,
            relevance_games: relevance.games,
            sd_hat_ppr: null,
          };
          const acc = residuals.get(`${row.position}|${record.band}`);
          if (acc && acc.n >= MIN_RESIDUALS_FOR_INTERVAL) {
            const meanRes = acc.sum / acc.n;
            record.sd_hat_ppr = Math.sqrt(Math.max(0, acc.sumsq / acc.n - meanRes * meanRes));
          }
          weekRecords.push(record);

          if (Number.isFinite(row.reported_ppr)) {
            const diff = Math.abs(record.actual.ppr - row.reported_ppr);
            meta.scoring_check.n += 1;
            meta.scoring_check.abs_diff_sum += diff;
            if (diff <= 0.5) meta.scoring_check.within_half_point += 1;
            meta.scoring_check.max_abs_diff = Math.max(meta.scoring_check.max_abs_diff, diff);
          }
        }
        for (const record of weekRecords) {
          const key = `${record.position}|${record.band}`;
          const acc = residuals.get(key) || { n: 0, sum: 0, sumsq: 0 };
          const residual = record.actual.ppr - record.pred.model.ppr;
          acc.n += 1; acc.sum += residual; acc.sumsq += residual * residual;
          residuals.set(key, acc);
        }
        records.push(...weekRecords);
      }
      // Only now does the week become history.
      for (const row of target) {
        if (!histories.has(row.player_id)) histories.set(row.player_id, []);
        histories.get(row.player_id).push({
          season, week, team: row.team, stats: row.stats, opp: row.opp || null, implied_points: row.implied_points,
        });
        trainRows.push({
          player_id: row.player_id, position: row.position, season, week, stats: row.stats, opp: row.opp || null,
          implied_points: row.implied_points,
        });
      }
    }
    onProgress({ season, tested: testSet.has(season), records: records.length });
  }
  return { records, meta };
}

function errorStats(records, predictor, scoring) {
  const errors = [];
  for (const record of records) {
    const pred = record.pred[predictor];
    if (!pred) continue;
    errors.push(pred[scoring] - record.actual[scoring]);
  }
  if (!errors.length) return { n: 0, mae: null, rmse: null, bias: null };
  return {
    n: errors.length,
    mae: round(mean(errors.map(Math.abs))),
    rmse: round(Math.sqrt(mean(errors.map((e) => e * e)))),
    bias: round(mean(errors)),
  };
}

/** Mean of the within-week rank correlation of predicted and actual points, per position. */
function weeklyRankCorrelation(records, predictor, scoring) {
  const groups = new Map();
  for (const record of records) {
    if (!record.pred[predictor]) continue;
    const key = `${record.season}|${record.week}|${record.position}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  const rhos = [];
  for (const group of groups.values()) {
    if (group.length < MIN_GROUP_FOR_RANK) continue;
    const rho = spearman(group.map((r) => r.pred[predictor][scoring]), group.map((r) => r.actual[scoring]));
    if (rho != null) rhos.push(rho);
  }
  return { weeks: rhos.length, spearman: round(mean(rhos)) };
}

/**
 * Paired absolute-error comparison of two predictors on the player-weeks where both exist.
 * The standard error is clustered by player (the same player appears in many weeks), so it is not understated.
 */
function pairedComparison(records, a, b, scoring) {
  const rows = records.filter((r) => r.pred[a] && r.pred[b]);
  const playerClusters = new Set(rows.map((r) => r.player_id)).size;
  const insufficient = rows.length < PAIRED_EVIDENCE_POLICY.minimum_rows
    || playerClusters < PAIRED_EVIDENCE_POLICY.minimum_player_clusters;
  if (insufficient) return {
    n: rows.length,
    player_clusters: playerClusters,
    adequately_powered: false,
    evidence_policy: PAIRED_EVIDENCE_POLICY.version,
    minimum_rows: PAIRED_EVIDENCE_POLICY.minimum_rows,
    minimum_player_clusters: PAIRED_EVIDENCE_POLICY.minimum_player_clusters,
    a, b,
    mean_abs_error_a: rows.length ? round(mean(rows.map((r) => Math.abs(r.pred[a][scoring] - r.actual[scoring])))) : null,
    mean_abs_error_b: rows.length ? round(mean(rows.map((r) => Math.abs(r.pred[b][scoring] - r.actual[scoring])))) : null,
    mean_diff: rows.length ? round(mean(rows.map((r) => Math.abs(r.pred[a][scoring] - r.actual[scoring]) - Math.abs(r.pred[b][scoring] - r.actual[scoring])))) : null,
    se: null,
    a_closer_share: null,
    verdict: "insufficient_data",
  };
  const diffs = rows.map((r) => Math.abs(r.pred[a][scoring] - r.actual[scoring]) - Math.abs(r.pred[b][scoring] - r.actual[scoring]));
  const m = mean(diffs);
  const clusters = new Map();
  rows.forEach((r, i) => {
    const c = clusters.get(r.player_id) || { sum: 0, n: 0 };
    c.sum += diffs[i]; c.n += 1;
    clusters.set(r.player_id, c);
  });
  let ss = 0;
  for (const c of clusters.values()) ss += (c.sum - c.n * m) ** 2;
  const finiteClusterCorrection = playerClusters / (playerClusters - 1);
  const se = Math.sqrt(finiteClusterCorrection * ss) / rows.length;
  const verdict = se === 0 ? (m < 0 ? "a_better" : m > 0 ? "b_better" : "no_clear_difference")
    : m + 1.96 * se < 0 ? "a_better" : m - 1.96 * se > 0 ? "b_better" : "no_clear_difference";
  return {
    n: rows.length, player_clusters: playerClusters, adequately_powered: true,
    evidence_policy: PAIRED_EVIDENCE_POLICY.version, a, b,
    mean_abs_error_a: round(mean(rows.map((r) => Math.abs(r.pred[a][scoring] - r.actual[scoring])))),
    mean_abs_error_b: round(mean(rows.map((r) => Math.abs(r.pred[b][scoring] - r.actual[scoring])))),
    mean_diff: round(m), se: round(se),
    a_closer_share: round(diffs.filter((d) => d < 0).length / diffs.length),
    verdict,
  };
}

const MIN_PAIRED_FOR_DISAGREEMENT = 20;

/**
 * Where Omen and the provider (stored Sleeper) disagree, who was closer to what happened. This is the evidence
 * behind the "challenger" evidence row: a gap is only worth showing if the side it favours wins often enough.
 * Gap = Omen - provider, in the scoring's points. The threshold is the model's own MAE on the same paired set
 * (in-sample here; production uses the value fitted on earlier seasons and recorded in the spec's table).
 */
function disagreement(records, scoring = "ppr") {
  const rows = records.filter((r) => r.pred.model && r.pred.sleeper);
  if (rows.length < MIN_PAIRED_FOR_DISAGREEMENT) return null;
  const all = rows.map((r) => {
    const gap = r.pred.model[scoring] - r.pred.sleeper[scoring];
    return {
      r, gap, abs: Math.abs(gap),
      omenErr: Math.abs(r.pred.model[scoring] - r.actual[scoring]),
      providerErr: Math.abs(r.pred.sleeper[scoring] - r.actual[scoring]),
    };
  });
  const threshold = mean(all.map((e) => e.omenErr));
  const summarize = (list) => {
    if (!list.length) return { n: 0 };
    const decided = list.filter((e) => e.omenErr !== e.providerErr);
    return {
      n: list.length,
      mean_abs_gap: round(mean(list.map((e) => e.abs))),
      omen_mae: round(mean(list.map((e) => e.omenErr))),
      provider_mae: round(mean(list.map((e) => e.providerErr))),
      omen_closer_share: decided.length ? round(decided.filter((e) => e.omenErr < e.providerErr).length / decided.length) : null,
      verdict: pairedComparison(list.map((e) => e.r), "model", "sleeper", scoring).verdict,
    };
  };
  const sorted = [...all].sort((a, b) => b.abs - a.abs);
  const over = all.filter((e) => e.abs > threshold);
  const deciles = [];
  for (let d = 0; d < 10; d += 1) {
    const slice = sorted.slice(Math.floor((d * sorted.length) / 10), Math.floor(((d + 1) * sorted.length) / 10));
    deciles.push({ decile: d + 1, ...summarize(slice) }); // decile 1 = the largest disagreements
  }
  return {
    scoring,
    paired_n: rows.length,
    threshold_points: round(threshold),
    threshold_rule: "model MAE on this paired set (in-sample)",
    over_threshold: summarize(over),
    over_threshold_omen_higher: summarize(over.filter((e) => e.gap > 0)),
    over_threshold_omen_lower: summarize(over.filter((e) => e.gap < 0)),
    top_decile: deciles[0],
    deciles,
  };
}

function predictorTable(records) {
  const table = {};
  for (const scoring of SCORINGS) {
    table[scoring] = {};
    for (const predictor of PREDICTORS) {
      const stats = errorStats(records, predictor, scoring);
      if (!stats.n) continue;
      table[scoring][predictor] = { ...stats, ...weeklyRankCorrelation(records, predictor, scoring) };
    }
  }
  return table;
}

function comparisons(records) {
  const out = {};
  for (const scoring of SCORINGS) {
    out[scoring] = {};
    for (const baseline of BASELINES) {
      const result = pairedComparison(records, "model", baseline, scoring);
      if (result.n >= 2) out[scoring][baseline] = result;
    }
  }
  return out;
}

function calibration(records) {
  const out = {};
  for (const band of BANDS) {
    const rows = records.filter((r) => r.band === band);
    if (!rows.length) continue;
    const errors = rows.map((r) => r.pred.model.ppr - r.actual.ppr);
    const withInterval = rows.filter((r) => r.sd_hat_ppr != null && r.sd_hat_ppr > 0);
    const inside = withInterval.filter((r) => Math.abs(r.actual.ppr - r.pred.model.ppr) <= Z_80 * r.sd_hat_ppr).length;
    const meanActual = mean(rows.map((r) => r.actual.ppr));
    out[band] = {
      n: rows.length,
      mae_ppr: round(mean(errors.map(Math.abs))),
      mean_actual_ppr: round(meanActual),
      mae_over_mean_actual: meanActual > 0 ? round(mean(errors.map(Math.abs)) / meanActual) : null,
      bias_ppr: round(mean(errors)),
      interval_80: {
        n: withInterval.length,
        share_inside: withInterval.length ? round(inside / withInterval.length) : null,
      },
    };
  }
  const rel = BANDS.map((b) => out[b]?.mae_over_mean_actual).filter((v) => v != null);
  return { bands: out, error_falls_as_confidence_rises: rel.length >= 2 ? rel.every((v, i) => i === 0 || v <= rel[i - 1] + 1e-9) : null };
}

function bySeason(records, predictors = ["model", "last3", "season_avg"]) {
  const out = {};
  const seasons = [...new Set(records.map((r) => r.season))].sort((a, b) => a - b);
  for (const season of seasons) {
    const rows = records.filter((r) => r.season === season);
    out[season] = {};
    for (const predictor of predictors) {
      const stats = errorStats(rows, predictor, "ppr");
      if (stats.n) out[season][predictor] = { n: stats.n, mae: stats.mae };
    }
  }
  return out;
}

function shipRuleForPosition(records) {
  const seasons = [...new Set(records.map((r) => r.season))].sort((a, b) => a - b);
  const scoringFamilies = {};
  for (const scoring of SCORINGS) {
    const bySeasonVerdict = {};
    let passingSeasons = 0;
    let insufficientSeasons = 0;
    for (const season of seasons) {
      const rows = records.filter((r) => r.season === season);
      const last3 = pairedComparison(rows, "model", "last3", scoring);
      const seasonAvg = pairedComparison(rows, "model", "season_avg", scoring);
      const insufficient = last3.verdict === "insufficient_data" || seasonAvg.verdict === "insufficient_data";
      const passes = last3.verdict === "a_better" && seasonAvg.verdict === "a_better";
      if (passes) passingSeasons += 1;
      if (insufficient) insufficientSeasons += 1;
      bySeasonVerdict[season] = { passes, insufficient, model_vs_last3: last3, model_vs_season_avg: seasonAvg };
    }
    scoringFamilies[scoring] = {
      status: seasons.length < 3 || insufficientSeasons > 0 ? "HOLD" : passingSeasons >= 2 ? "PASS" : "FAIL",
      passing_seasons: passingSeasons,
      insufficient_seasons: insufficientSeasons,
      required_passing_seasons: 2,
      tested_seasons: seasons.length,
      by_season: bySeasonVerdict,
    };
  }
  const familyStatuses = Object.values(scoringFamilies).map((family) => family.status);
  return {
    status: familyStatuses.every((status) => status === "PASS")
      ? "PASS"
      : familyStatuses.some((status) => status === "HOLD") ? "HOLD" : "FAIL",
    tested_seasons: seasons.length,
    evidence_policy: PAIRED_EVIDENCE_POLICY,
    scoring_families: scoringFamilies,
  };
}

function evaluate(records, { positions = POSITIONS } = {}) {
  const universes = {
    relevant: records.filter((r) => r.relevance_eligible === true),
    all: records,
  };
  const results = {};
  for (const [name, universe] of Object.entries(universes)) {
    results[name] = { n: universe.length, positions: {} };
    for (const position of positions) {
      const rows = universe.filter((r) => r.position === position);
      if (!rows.length) continue;
      results[name].positions[position] = {
        n: rows.length,
        predictors: predictorTable(rows),
        model_vs: comparisons(rows),
        by_season: bySeason(rows),
        by_bucket: Object.fromEntries(["debut", "thin", "established"].map((bucket) => {
          const subset = rows.filter((r) => r.bucket === bucket);
          return [bucket, { n: subset.length, predictors: subset.length ? predictorTable(subset).ppr : {} }];
        })),
        calibration: calibration(rows),
        disagreement: Object.fromEntries(SCORINGS.map((scoring) => [scoring, disagreement(rows, scoring)]).filter(([, v]) => v)),
        ship_rule: shipRuleForPosition(rows),
      };
    }
  }
  return results;
}

async function runBacktest({ source, testSeasons, warmupSeasons = 2, positions = POSITIONS, onProgress, now = () => new Date() }) {
  const { records, meta } = await walkForward({ source, testSeasons, warmupSeasons, positions, onProgress });
  const check = meta.scoring_check;
  const results = evaluate(records, { positions });
  const positionDecisions = {};
  for (const position of positions) {
    const relevant = results.relevant.positions[position]?.ship_rule;
    const all = results.all.positions[position]?.ship_rule;
    const scoringFamilies = {};
    for (const scoring of SCORINGS) {
      const relevantStatus = relevant?.scoring_families?.[scoring]?.status || "HOLD";
      const allStatus = all?.scoring_families?.[scoring]?.status || "HOLD";
      scoringFamilies[scoring] = {
        status: relevantStatus === "PASS" && allStatus === "PASS"
          ? "PASS"
          : relevantStatus === "HOLD" || allStatus === "HOLD" ? "HOLD" : "FAIL",
        relevant: relevantStatus,
        all: allStatus,
      };
    }
    const statuses = Object.values(scoringFamilies).map((family) => family.status);
    const status = statuses.every((familyStatus) => familyStatus === "PASS")
      ? "PASS"
      : statuses.some((familyStatus) => familyStatus === "HOLD") ? "HOLD" : "FAIL";
    positionDecisions[position] = { status, scoring_families: scoringFamilies };
  }
  return {
    meta: {
      generated_at: now().toISOString(),
      method_version: METHOD_VERSION,
      test_seasons: [...new Set(testSeasons)].sort((a, b) => a - b),
      warmup_seasons: warmupSeasons,
      positions,
      scorings: SCORINGS,
      scoring_presets: Object.fromEntries(Object.entries(SCORING_PRESETS).map(([k, v]) => [k, v.rules.map((r) => `${r.event_key}=${r.value}`)])),
      relevant_universe: `${RELEVANCE_POLICY.version}: trailing ${RELEVANCE_POLICY.window_games} pre-week games meet the position opportunity threshold ${JSON.stringify(RELEVANCE_POLICY.minimum_average_opportunities)}; no fantasy-points predictor participates in selection`,
      relevance_policy: RELEVANCE_POLICY,
      universe_note: "Only players who actually played the week are scored (the warehouse has no historical injury report); every predictor is conditional on playing.",
      seasons: meta.seasons,
      constants: {
        half_life_games_volume: HALF_LIFE_GAMES_VOLUME, half_life_games_efficiency: HALF_LIFE_GAMES_EFFICIENCY,
        season_decay: SEASON_DECAY, shrinkage: SHRINKAGE, environment: ENVIRONMENT, confidence: CONFIDENCE,
      },
      leakage_guards: [
        "history appended only after every projection of a week is made",
        "priors built from seasons strictly before the test season",
        "interval widths learned from residuals of earlier weeks only",
      ],
      scoring_check: {
        n: check.n,
        mean_abs_diff: check.n ? round(check.abs_diff_sum / check.n) : null,
        share_within_half_point: check.n ? round(check.within_half_point / check.n) : null,
        max_abs_diff: round(check.max_abs_diff),
        note: "Omen's recomputed PPR from stat lines against nflverse fantasy_points_ppr (two-point conversions are not modelled).",
      },
      sleeper: meta.sleeper,
      records: records.length,
    },
    results,
    position_decisions: positionDecisions,
  };
}

function fmt(value, digits = 2) {
  return value == null ? "-" : Number(value).toFixed(digits);
}

function renderMarkdown(report) {
  const { meta, results } = report;
  const lines = [];
  lines.push(`# Omen projections backtest (${meta.method_version})`);
  lines.push("");
  lines.push(`Generated ${meta.generated_at}. Test seasons ${meta.test_seasons.join(", ")} (warm-up ${meta.warmup_seasons} earlier seasons for history and priors). ${meta.records} player-weeks.`);
  lines.push("");
  lines.push(`- Relevant universe: ${meta.relevant_universe}.`);
  lines.push(`- ${meta.universe_note}`);
  lines.push(`- Leakage guards: ${meta.leakage_guards.join("; ")}.`);
  lines.push(`- Scoring check (recomputed PPR vs nflverse): n=${meta.scoring_check.n}, mean abs diff ${fmt(meta.scoring_check.mean_abs_diff, 3)}, within 0.5: ${fmt(meta.scoring_check.share_within_half_point, 3)}, max ${fmt(meta.scoring_check.max_abs_diff)}.`);
  lines.push(`- Sleeper benchmark: ${meta.sleeper.requested ? (meta.sleeper.available ? `${meta.sleeper.rows} stored projection rows` : "requested but none available") : "not requested"}.`);
  lines.push("");
  lines.push("## Position ship decisions");
  lines.push("");
  lines.push("A position/scoring family passes only when the per-season rule passes in both the independent relevant universe and the all-player universe.");
  lines.push("");
  lines.push("| position | overall | standard | half-PPR | PPR |");
  lines.push("|---|---|---|---|---|");
  for (const [position, decision] of Object.entries(report.position_decisions || {})) {
    lines.push(`| ${position} | ${decision.status} | ${decision.scoring_families.standard.status} | ${decision.scoring_families.half_ppr.status} | ${decision.scoring_families.ppr.status} |`);
  }
  lines.push("");
  for (const universe of ["relevant", "all"]) {
    const block = results[universe];
    lines.push(`## Universe: ${universe} (${block.n} player-weeks)`);
    lines.push("");
    for (const [position, data] of Object.entries(block.positions)) {
      lines.push(`### ${position} (${data.n})`);
      lines.push("");
      lines.push("Certification evidence by scoring family and season:");
      lines.push("");
      lines.push("| scoring | season | passes | insufficient | vs last3 (rows / players / verdict) | vs season avg (rows / players / verdict) |");
      lines.push("|---|---:|---|---|---|---|");
      for (const [scoring, family] of Object.entries(data.ship_rule.scoring_families)) {
        for (const [season, verdict] of Object.entries(family.by_season)) {
          const last3 = verdict.model_vs_last3;
          const seasonAvg = verdict.model_vs_season_avg;
          lines.push(`| ${scoring} | ${season} | ${verdict.passes} | ${verdict.insufficient} | ${last3.n} / ${last3.player_clusters} / ${last3.verdict} | ${seasonAvg.n} / ${seasonAvg.player_clusters} / ${seasonAvg.verdict} |`);
        }
      }
      lines.push("");
      for (const scoring of SCORINGS) {
        const table = data.predictors[scoring];
        if (!table || !Object.keys(table).length) continue;
        lines.push(`**${scoring}** (points)`);
        lines.push("");
        lines.push("| predictor | n | MAE | RMSE | bias | weekly rank corr (weeks) |");
        lines.push("|---|---:|---:|---:|---:|---:|");
        for (const [predictor, s] of Object.entries(table)) {
          lines.push(`| ${predictor} | ${s.n} | ${fmt(s.mae)} | ${fmt(s.rmse)} | ${fmt(s.bias)} | ${fmt(s.spearman, 3)} (${s.weeks}) |`);
        }
        lines.push("");
        const vs = data.model_vs[scoring] || {};
        if (Object.keys(vs).length) {
          lines.push("| model against | paired n | model MAE | other MAE | mean diff (model - other) | clustered SE | model closer | verdict |");
          lines.push("|---|---:|---:|---:|---:|---:|---:|---|");
          for (const [other, c] of Object.entries(vs)) {
            lines.push(`| ${other} | ${c.n} | ${fmt(c.mean_abs_error_a)} | ${fmt(c.mean_abs_error_b)} | ${fmt(c.mean_diff, 3)} | ${fmt(c.se, 3)} | ${fmt(c.a_closer_share, 3)} | ${c.verdict} |`);
          }
          lines.push("");
        }
      }
      lines.push("MAE by season, PPR:");
      lines.push("");
      lines.push("| season | model | last3 | season_avg |");
      lines.push("|---|---:|---:|---:|");
      for (const [season, s] of Object.entries(data.by_season)) {
        lines.push(`| ${season} | ${fmt(s.model?.mae)} | ${fmt(s.last3?.mae)} | ${fmt(s.season_avg?.mae)} |`);
      }
      lines.push("");
      lines.push("Experience bucket (prior games), PPR MAE: model / last3 / season_avg");
      lines.push("");
      lines.push("| bucket | n | model | last3 | season_avg |");
      lines.push("|---|---:|---:|---:|---:|");
      for (const [bucket, b] of Object.entries(data.by_bucket)) {
        lines.push(`| ${bucket} | ${b.n} | ${fmt(b.predictors.model?.mae)} | ${fmt(b.predictors.last3?.mae)} | ${fmt(b.predictors.season_avg?.mae)} |`);
      }
      lines.push("");
      for (const [scoring, d] of Object.entries(data.disagreement || {})) {
        lines.push(`Omen vs provider disagreement, ${scoring} (gap = Omen - provider; threshold ${fmt(d.threshold_points)} points = model MAE; ${d.paired_n} paired player-weeks). Who was closer:`);
        lines.push("");
        lines.push("| group | n | mean abs gap | Omen MAE | provider MAE | Omen closer share | verdict (Omen vs provider) |");
        lines.push("|---|---:|---:|---:|---:|---:|---|");
        const groups = [["over threshold", d.over_threshold], ["over threshold, Omen higher", d.over_threshold_omen_higher],
          ["over threshold, Omen lower", d.over_threshold_omen_lower],
          ...d.deciles.map((x) => [`decile ${x.decile}${x.decile === 1 ? " (largest gaps)" : ""}`, x])];
        for (const [name, g] of groups) {
          if (!g.n) { lines.push(`| ${name} | 0 | - | - | - | - | - |`); continue; }
          lines.push(`| ${name} | ${g.n} | ${fmt(g.mean_abs_gap)} | ${fmt(g.omen_mae)} | ${fmt(g.provider_mae)} | ${fmt(g.omen_closer_share, 3)} | ${g.verdict} |`);
        }
        lines.push("");
      }
      lines.push(`Confidence-band calibration (PPR). Error relative to mean actual falls as confidence rises: ${data.calibration.error_falls_as_confidence_rises ?? "n/a"}.`);
      lines.push("");
      lines.push("| band | n | MAE | mean actual | MAE / mean actual | bias | 80% interval n | share inside (target ~0.80) |");
      lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
      for (const [band, c] of Object.entries(data.calibration.bands)) {
        lines.push(`| ${band} | ${c.n} | ${fmt(c.mae_ppr)} | ${fmt(c.mean_actual_ppr)} | ${fmt(c.mae_over_mean_actual, 3)} | ${fmt(c.bias_ppr)} | ${c.interval_80.n} | ${fmt(c.interval_80.share_inside, 3)} |`);
      }
      lines.push("");
    }
  }
  lines.push("## How to read this");
  lines.push("");
  lines.push(`- Ship rule (spec section 9): for each scoring family, the model must beat both \`last3\` and \`season_avg\` with a clustered-SE verdict of \`a_better\`, in at least two of three test seasons, in both universes. Every season/baseline comparison requires at least ${PAIRED_EVIDENCE_POLICY.minimum_rows} paired rows and ${PAIRED_EVIDENCE_POLICY.minimum_player_clusters} player clusters (${PAIRED_EVIDENCE_POLICY.version}).`);
  lines.push("- A `no_clear_difference` verdict is not a pass.");
  lines.push("- Confidence bands are labels, never percentages. The 80% interval share is a check on how wide the bands' error really is.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

module.exports = {
  BANDS, BASELINES, PAIRED_EVIDENCE_POLICY, PREDICTORS, RELEVANCE_POLICY, SCORINGS,
  calibration, disagreement, errorStats, evaluate, impliedPoints, pairedComparison, ranks, renderMarkdown, runBacktest, spearman, walkForward,
  relevanceFromHistory, shipRuleForPosition, weeklyRankCorrelation,
};
