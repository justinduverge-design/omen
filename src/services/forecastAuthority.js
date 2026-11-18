"use strict";

// Convert stored, same-player Sight/provider accuracy summaries into a fail-closed authority receipt.
// Evaluates either points (default) or individual stat lines per position and horizon.
// Only like-for-like rows are admitted. Older accuracy runs lack
// `sight_mae_same_players` or statline blocks; those runs deliberately cannot elect a leader.

const DEFAULT_POLICY = Object.freeze({
  version: "forecast-authority.v1",
  scoringFamily: "ppr",
  horizon: "weekly",
  minimumPlayers: 50,
  minimumWeeks: 2,
  tieMarginMae: 0.15,
  maximumAgeDays: 21,
});

const STATS_BY_POSITION = Object.freeze({
  QB: Object.freeze([
    "attempts",
    "completions",
    "passing_yards",
    "passing_tds",
    "passing_interceptions",
    "carries",
    "rushing_yards",
    "rushing_tds",
    "fumbles_lost",
  ]),
  RB: Object.freeze([
    "carries",
    "rushing_yards",
    "rushing_tds",
    "targets",
    "receptions",
    "receiving_yards",
    "receiving_tds",
    "fumbles_lost",
  ]),
  WR: Object.freeze([
    "targets",
    "receptions",
    "receiving_yards",
    "receiving_tds",
    "carries",
    "rushing_yards",
    "rushing_tds",
    "fumbles_lost",
  ]),
  TE: Object.freeze([
    "targets",
    "receptions",
    "receiving_yards",
    "receiving_tds",
    "fumbles_lost",
  ]),
});

const round = (value) => Math.round(value * 100) / 100;
const finite = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

function unresolved(
  state,
  {
    position,
    stat = null,
    horizon = null,
    modelVersion,
    policy,
    sampleSize = 0,
    weeks = 0,
    evaluatedAt = null,
    window = {},
  } = {},
) {
  return {
    version: policy.version,
    state,
    position: position || null,
    stat: stat || null,
    scoring_family: stat ? null : policy.scoringFamily,
    horizon: horizon ?? (stat ? 1 : policy.horizon),
    model_version: modelVersion || null,
    sample_size: sampleSize,
    weeks,
    season_start: window.seasonStart ?? null,
    season_end: window.seasonEnd ?? null,
    week_start: window.weekStart ?? null,
    week_end: window.weekEnd ?? null,
    evaluated_at: evaluatedAt,
    metric: "mae",
    omen_mae: null,
    provider_mae: null,
  };
}

/**
 * @param {object} args
 * @param {string} args.position
 * @param {string=} args.stat
 * @param {number|string=} args.horizon
 * @param {string} args.modelVersion
 * @param {Array<{week:number,finished_at?:string,summary?:object}>} args.evaluations
 * @param {Date=} args.now
 * @param {object=} args.policy
 */
function resolveForecastAuthority({
  position,
  stat = null,
  horizon = null,
  modelVersion,
  evaluations,
  now = new Date(),
  policy: overrides = {},
} = {}) {
  const policy = { ...DEFAULT_POLICY, ...overrides };
  const effectiveHorizon = horizon ?? (stat ? 1 : policy.horizon);

  const rows = (Array.isArray(evaluations) ? evaluations : []).flatMap((evaluation) => {
    let block;
    const posBlock = evaluation?.summary?.positions?.[position];
    if (stat) {
      const statBlock = posBlock?.stats?.[stat];
      block =
        statBlock?.horizons?.[effectiveHorizon]?.provider ??
        statBlock?.horizons?.[String(effectiveHorizon)]?.provider ??
        posBlock?.horizons?.[effectiveHorizon]?.stats?.[stat]?.provider ??
        posBlock?.horizons?.[String(effectiveHorizon)]?.stats?.[stat]?.provider ??
        statBlock?.provider;
    } else if (horizon != null && horizon !== "weekly") {
      block =
        posBlock?.horizons?.[effectiveHorizon]?.provider ??
        posBlock?.horizons?.[String(effectiveHorizon)]?.provider ??
        posBlock?.provider;
    } else {
      block = posBlock?.provider;
    }

    const n = finite(block?.n);
    const omenMae = finite(block?.omen_mae_same_players ?? block?.sight_mae_same_players);
    const providerMae = finite(block?.mae);
    if (!Number.isInteger(n) || n < 3 || omenMae == null || providerMae == null) return [];
    return [
      {
        n,
        omenMae,
        providerMae,
        season: Number(evaluation.season),
        week: Number(evaluation.week),
        finishedAt: evaluation.finished_at || null,
      },
    ];
  });
  if (!rows.length) {
    return unresolved("unresolved_low_sample", {
      position,
      stat,
      horizon: effectiveHorizon,
      modelVersion,
      policy,
    });
  }

  const sampleSize = rows.reduce((sum, row) => sum + row.n, 0);
  const evaluatedAt =
    rows
      .map((row) => row.finishedAt)
      .filter(Boolean)
      .sort()
      .at(-1) || null;
  const seasons = rows.map((row) => row.season).filter(Number.isInteger);
  const weeks = rows.map((row) => row.week).filter(Number.isInteger);
  const window = {
    seasonStart: seasons.length ? Math.min(...seasons) : null,
    seasonEnd: seasons.length ? Math.max(...seasons) : null,
    weekStart: weeks.length ? Math.min(...weeks) : null,
    weekEnd: weeks.length ? Math.max(...weeks) : null,
  };
  if (rows.length < policy.minimumWeeks || sampleSize < policy.minimumPlayers) {
    return unresolved("unresolved_low_sample", {
      position,
      stat,
      horizon: effectiveHorizon,
      modelVersion,
      policy,
      sampleSize,
      weeks: rows.length,
      evaluatedAt,
      window,
    });
  }
  const evaluatedTime = evaluatedAt ? Date.parse(evaluatedAt) : NaN;
  if (!Number.isFinite(evaluatedTime) || now.getTime() - evaluatedTime > policy.maximumAgeDays * 86_400_000) {
    return unresolved("unresolved_stale", {
      position,
      stat,
      horizon: effectiveHorizon,
      modelVersion,
      policy,
      sampleSize,
      weeks: rows.length,
      evaluatedAt,
      window,
    });
  }

  const omenMae = rows.reduce((sum, row) => sum + row.omenMae * row.n, 0) / sampleSize;
  const providerMae = rows.reduce((sum, row) => sum + row.providerMae * row.n, 0) / sampleSize;
  const difference = Math.abs(omenMae - providerMae);
  const tieMargin =
    policy.statTieMargins?.[stat] ??
    (policy.tieMarginRatio != null
      ? policy.tieMarginRatio * Math.min(omenMae, providerMae)
      : policy.tieMarginMae);
  const state =
    difference < tieMargin ? "unresolved_tie" : omenMae < providerMae ? "omen_leads" : "provider_leads";
  return {
    version: policy.version,
    state,
    position,
    stat: stat || null,
    scoring_family: stat ? null : policy.scoringFamily,
    horizon: effectiveHorizon,
    model_version: modelVersion || null,
    sample_size: sampleSize,
    weeks: rows.length,
    season_start: window.seasonStart,
    season_end: window.seasonEnd,
    week_start: window.weekStart,
    week_end: window.weekEnd,
    evaluated_at: evaluatedAt,
    metric: "mae",
    omen_mae: round(omenMae),
    provider_mae: round(providerMae),
  };
}

/**
 * Resolves forecast authority across stats and horizons for a given position.
 * Returns { [stat]: { [horizon]: authorityReceipt } }.
 */
function resolveStatlineForecastAuthority({
  position,
  stats = null,
  horizons = [1, 2, 3, 4],
  modelVersion,
  evaluations,
  now = new Date(),
  policy = {},
} = {}) {
  const targetStats = stats || STATS_BY_POSITION[position] || [];
  const result = {};
  for (const stat of targetStats) {
    result[stat] = {};
    for (const h of horizons) {
      result[stat][h] = resolveForecastAuthority({
        position,
        stat,
        horizon: h,
        modelVersion,
        evaluations,
        now,
        policy,
      });
    }
  }
  return result;
}

module.exports = {
  DEFAULT_POLICY,
  STATS_BY_POSITION,
  resolveForecastAuthority,
  resolveStatlineForecastAuthority,
};
