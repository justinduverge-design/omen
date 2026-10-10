"use strict";

/**
 * Usage-based reason for a waiver add, from the warehouse's per-week opportunity counts
 * (targets, carries, red-zone work). Observed facts only: every number in the sentence comes from a
 * warehouse row, a missing count is left out rather than guessed, and when there is nothing real to
 * say the analysis is returned untouched (same object).
 *
 * Runs only when the football data mode has a warehouse reader (shadow or warehouse). In `supabase`
 * mode, or with any read failure or timeout, nothing changes.
 */

const { resolveGsis } = require("./playerUsage");
const { withinLatencyBudget } = require("./latencyBudget");

const RECENT_GAMES = 3;
const MIN_PRIOR_GAMES = 2;
const TREND_MIN_DELTA = 2;
const TREND_MIN_RATIO = 0.25;
const DEFAULT_BUDGET_MS = 1500;

const round1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
const count = (n, one, many) => `${round1(n)} ${Number(round1(n)) === 1 ? one : many}`;

function known(rows, key) {
  const values = rows.map((row) => row[key]).filter((value) => Number.isInteger(value));
  return values.length === rows.length && values.length ? values : null;
}

const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;

function movedStatement(recentAvg, priorAvg, label, priorGames) {
  const delta = recentAvg - priorAvg;
  if (Math.abs(delta) < TREND_MIN_DELTA || Math.abs(delta) < TREND_MIN_RATIO * Math.max(priorAvg, 1)) return null;
  return `${delta > 0 ? "Up" : "Down"} from ${round1(priorAvg)} ${label} a game over the first ${priorGames} games.`;
}

/**
 * @param {string} name
 * @param {string} position
 * @param {Array<object>} rows per-week opportunity rows (week, carries, targets, red_zone_*)
 * @returns {string|null}
 */
function waiverUsageSentence(name, position, rows) {
  const pos = String(position || "").toUpperCase();
  if (!["RB", "WR", "TE"].includes(pos)) return null;
  const played = (Array.isArray(rows) ? rows : [])
    .filter((row) => Number.isInteger(row?.week))
    .sort((a, b) => b.week - a.week);
  const recent = played.slice(0, RECENT_GAMES);
  if (!recent.length) return null;
  const prior = played.slice(RECENT_GAMES);
  const usePrior = recent.length === RECENT_GAMES && prior.length >= MIN_PRIOR_GAMES;
  const span = recent.length === 1 ? "in the last game" : `a game over the last ${recent.length} games`;

  const targets = known(recent, "targets");
  const carries = known(recent, "carries");
  const parts = [];
  let trend = null;

  if (pos === "RB") {
    if (carries) parts.push(count(mean(carries), "carry", "carries"));
    if (targets) parts.push(count(mean(targets), "target", "targets"));
    if (usePrior) {
      const priorCarries = known(prior, "carries");
      const priorTargets = known(prior, "targets");
      if (carries && priorCarries) trend = movedStatement(mean(carries), mean(priorCarries), "carries", prior.length);
      if (!trend && targets && priorTargets) trend = movedStatement(mean(targets), mean(priorTargets), "targets", prior.length);
    }
  } else {
    if (targets) parts.push(count(mean(targets), "target", "targets"));
    if (usePrior) {
      const priorTargets = known(prior, "targets");
      if (targets && priorTargets) trend = movedStatement(mean(targets), mean(priorTargets), "targets", prior.length);
    }
  }
  if (!parts.length) return null;

  let line = `${name}: ${parts.join(" and ")} ${span}`;
  const rzCarries = pos === "RB" ? known(recent, "red_zone_carries") : [];
  const rzTargets = known(recent, "red_zone_targets");
  if (rzTargets && rzCarries) {
    const touches = rzTargets.reduce((a, b) => a + b, 0) + rzCarries.reduce((a, b) => a + b, 0);
    if (touches > 0) line += `, with ${touches} red-zone touch${touches === 1 ? "" : "es"} in that stretch`;
  }
  line += ".";
  return trend ? `${line} ${trend}` : line;
}

/** Evidence row appended after the roster-math rows. Returns the same object when there is no sentence. */
function withUsageEvidence(analysis, sentence) {
  if (!sentence || !analysis || !Array.isArray(analysis.evidence)) return analysis;
  return {
    ...analysis,
    evidence: [...analysis.evidence, { category: "current_role", statement: sentence, kind: "observed_usage" }],
  };
}

/**
 * @param {object} deps
 * @param {() => ({mode: string, repository: object|null}|null)} deps.getRuntime
 * @param {object} deps.supabase crosswalk reads only (provider key -> public GSIS id)
 */
function createWaiverUsageEnricher({ getRuntime, supabase, budgetMs = DEFAULT_BUDGET_MS, log = null, resolve = resolveGsis }) {
  return async function enrich(analysis) {
    try {
      const add = analysis?.best_move?.add;
      if (!add?.player_key || analysis?.state === "off_season") return analysis;
      const runtime = getRuntime();
      if (!runtime || runtime.mode === "supabase" || typeof runtime.repository?.readOpportunityWeeks !== "function") {
        return analysis;
      }
      const season = Number(analysis.season);
      const week = Number(analysis.week);
      if (!Number.isInteger(season) || !Number.isInteger(week) || week < 1) return analysis;

      const sentence = await withinLatencyBudget("waiver_usage_evidence", budgetMs, async () => {
        const gsisByKey = await resolve(supabase, [add.player_key]);
        const gsis = gsisByKey.get(add.player_key);
        if (!gsis) return null;
        const rowsByGsis = await runtime.repository.readOpportunityWeeks({ gsisIds: [gsis], season, beforeWeek: week });
        return waiverUsageSentence(add.name || "This player", add.position, rowsByGsis.get(gsis));
      });
      return withUsageEvidence(analysis, sentence);
    } catch (error) {
      try { log?.warn?.("Waiver usage evidence unavailable", { code: error?.code || "failure" }); } catch {}
      return analysis;
    }
  };
}

module.exports = { waiverUsageSentence, withUsageEvidence, createWaiverUsageEnricher };
