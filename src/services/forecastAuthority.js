"use strict";

// Convert stored, same-player Sight/provider accuracy summaries into a fail-closed authority receipt.
// Only like-for-like weekly PPR rows are admitted. Older accuracy runs lack
// `sight_mae_same_players`; those runs deliberately cannot elect a leader.

const DEFAULT_POLICY = Object.freeze({
  version: "forecast-authority.v1",
  scoringFamily: "ppr",
  horizon: "weekly",
  minimumPlayers: 50,
  minimumWeeks: 2,
  tieMarginMae: 0.15,
  maximumAgeDays: 21,
});

const round = (value) => Math.round(value * 100) / 100;
const finite = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

function unresolved(
  state,
  { position, modelVersion, policy, sampleSize = 0, weeks = 0, evaluatedAt = null, window = {} } = {},
) {
  return {
    version: policy.version,
    state,
    position: position || null,
    scoring_family: policy.scoringFamily,
    horizon: policy.horizon,
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
 * @param {string} args.modelVersion
 * @param {Array<{week:number,finished_at?:string,summary?:object}>} args.evaluations
 */
function resolveForecastAuthority({
  position,
  modelVersion,
  evaluations,
  now = new Date(),
  policy: overrides = {},
} = {}) {
  const policy = { ...DEFAULT_POLICY, ...overrides };
  const rows = (Array.isArray(evaluations) ? evaluations : []).flatMap((evaluation) => {
    const block = evaluation?.summary?.positions?.[position]?.provider;
    const n = finite(block?.n);
    const omenMae = finite(block?.sight_mae_same_players);
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
  if (!rows.length) return unresolved("unresolved_low_sample", { position, modelVersion, policy });

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
  const state =
    difference < policy.tieMarginMae ? "unresolved_tie" : omenMae < providerMae ? "omen_leads" : "provider_leads";
  return {
    version: policy.version,
    state,
    position,
    scoring_family: policy.scoringFamily,
    horizon: policy.horizon,
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

module.exports = { DEFAULT_POLICY, resolveForecastAuthority };
