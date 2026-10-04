"use strict";

/**
 * Omen Tuesday scoring worker.
 *
 * The previous generated worker was not valid JavaScript and the cron image was
 * pointing at an old ssffmvp filename. This worker now fails closed by default:
 * no data is scored unless OMEN_CRON_SCORING_ENABLED=true is present. The
 * former CORVUS_* flag remains a compatibility fallback during deployment.
 */

const { initSentry, flushSentry } = require("./middleware/sentry");
initSentry({ component: "cron" });

const Sentry = require("@sentry/node");
const { createClient } = require("@supabase/supabase-js");
const { Redis } = require("@upstash/redis");
const {
  RECONCILIATION_STATES,
  reconcileMoveScoring,
} = require("./services/scoringReconciliation");
const ledgerStore = require("./services/ledger");
const { bandFromScore } = require("./services/confidencePolicy");
const { getCurrentNflWeekContext } = require("./services/nflSchedule");

const REQUIRED_SCORING_ENV = Object.freeze([
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
]);

const CURRENT_SEASON = new Date().getFullYear();
// nflverse reorganized its releases: the `player_stats` tag stopped receiving new
// seasons after 2024, and weekly stats now ship under `stats_player` as
// `stats_player_week_<season>.csv`. The old path 404s for every season from 2025
// on, which the 404-deferral path would otherwise read as "not published yet"
// forever. Verified against the live release index 2026-08-15.
const NFLVERSE_BASE_URL =
  "https://github.com/nflverse/nflverse-data/releases/download/stats_player";

function nflverseStatsFileName(season) {
  return `stats_player_week_${season}.csv`;
}

// nflverse publishes REG (weeks 1-18) and POST (weeks 19-22) rows in one file and
// never publishes PRE. Omen grades regular-season weeks, so REG is the default —
// without this filter a source that does carry preseason rows (Sleeper does) would
// collide preseason week N with regular week N.
const DEFAULT_SEASON_TYPE = "REG";

function timestamp() {
  return new Date().toISOString();
}

const log = {
  info: (...args) => console.log(`[${timestamp()}] [omen-cron]`, ...args),
  warn: (...args) => console.warn(`[${timestamp()}] [omen-cron] WARN`, ...args),
  error: (...args) => console.error(`[${timestamp()}] [omen-cron] ERROR`, ...args),
};

function isScoringEnabled(env = process.env) {
  return (env.OMEN_CRON_SCORING_ENABLED ?? env.CORVUS_CRON_SCORING_ENABLED) === "true";
}

function isDryRun(env = process.env) {
  return env.OMEN_CRON_DRY_RUN === "true";
}

function missingScoringEnv(env = process.env) {
  return REQUIRED_SCORING_ENV.filter((name) => !env[name]);
}

function getMostRecentSunday(now = new Date()) {
  const date = new Date(now);
  date.setUTCHours(0, 0, 0, 0);
  const daysSinceSunday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - daysSinceSunday);
  return date;
}

function normalizeName(name = "") {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

function scoreFromStats(stats = {}, scoring = "PPR") {
  const rushing = stats.rush || 0;
  const passing = stats.pass || 0;
  if (scoring === "Half PPR") return rushing + passing + (stats.rec_half || 0);
  if (scoring === "Standard") return rushing + passing + (stats.rec_std || 0);
  return rushing + passing + (stats.rec_ppr || 0);
}

function findBestMatch(target, keys) {
  const normalizedTarget = normalizeName(target);
  if (keys.includes(normalizedTarget)) return normalizedTarget;
  const lastName = normalizedTarget.split("_").filter(Boolean).pop();
  if (!lastName) return null;
  return keys.find((key) => key.endsWith(`_${lastName}`) || key.includes(lastName)) || null;
}

function createSupabase(env = process.env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

function createRedis(env = process.env) {
  if (!env.REDIS_URL || !env.REDIS_TOKEN) return null;
  return new Redis({ url: env.REDIS_URL, token: env.REDIS_TOKEN });
}

async function redisGetJson(redis, key) {
  if (!redis) return null;
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    return typeof cached === "string" ? JSON.parse(cached) : cached;
  } catch (error) {
    log.warn(`Redis read failed for ${key}: ${error.message}`);
    return null;
  }
}

async function redisSetJson(redis, key, value, ttlSeconds) {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch (error) {
    log.warn(`Redis write failed for ${key}: ${error.message}`);
  }
}

function parseCsvLine(line = "") {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function nflverseScoresFromCsv(csvText, { season, weekNum, seasonType = DEFAULT_SEASON_TYPE } = {}) {
  const lines = String(csvText || "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return {};
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  // `season_type` is required rather than optional-when-present: a file without it
  // cannot be filtered, and silently scoring an unfiltered file is the failure mode
  // this column exists to prevent. Fail closed and make the schema drift visible.
  const required = ["player_name", "season", "week", "season_type", "fantasy_points", "fantasy_points_ppr"];
  if (required.some((column) => !headers.includes(column))) {
    throw new Error("nflverse player stats are missing required scoring columns");
  }

  const targetSeason = Number(season);
  const targetWeek = Number(weekNum);
  const targetSeasonType = String(seasonType).toUpperCase();
  const scores = {};
  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ""]));
    if (row.season_type.toUpperCase() !== targetSeasonType) continue;
    if (Number(row.season) !== targetSeason || Number(row.week) !== targetWeek) continue;
    const standard = Number(row.fantasy_points);
    const ppr = Number(row.fantasy_points_ppr);
    if (!row.player_name || !Number.isFinite(standard) || !Number.isFinite(ppr)) continue;
    scores[normalizeName(row.player_name)] = {
      name: row.player_name,
      rec_std: standard,
      rec_half: (standard + ppr) / 2,
      rec_ppr: ppr,
    };
  }
  return scores;
}

async function fetchPendingMoves(supabase, now = new Date()) {
  const cutoff = getMostRecentSunday(now).toISOString();

  const { data: moves, error } = await supabase
    .from("moves")
    // The scoring-contract fields arrive only with the reviewed A6 schema. The
    // scoring-enable order is mandatory: approval -> staging schema -> verification
    // -> production schema -> scoring enablement. Until then this code must not
    // run Tuesday scoring against a live database.
    .select("id, week_num, season, headline, confidence, target_player, scoring, scoring_contract, scoring_contract_required, scoring_coverage_state, outcome, followed, created_at")
    .eq("outcome", "pending")
    .eq("followed", true)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Pending move lookup failed: ${error.message}`);
  return moves || [];
}

async function archiveNotExecutedMoves(supabase, now = new Date(), { dryRun = false } = {}) {
  const cutoff = getMostRecentSunday(now).toISOString();

  const { data: rows, error } = await supabase
    .from("moves")
    .select("id")
    .eq("outcome", "pending")
    .eq("followed", false)
    .lt("created_at", cutoff);

  if (error) throw new Error(`Not-executed lookup failed: ${error.message}`);
  if (!rows?.length) return 0;
  if (dryRun) return rows.length;

  const { error: updateError } = await supabase
    .from("moves")
    .update({ outcome: "not_executed", scored_at: new Date().toISOString() })
    .in("id", rows.map((row) => row.id));

  if (updateError) throw new Error(`Not-executed archive failed: ${updateError.message}`);
  return rows.length;
}

// A season CSV that nflverse has not published yet is an expected pre-season
// state, not an upstream failure. It is represented as a deferred marker so the
// caller can leave the pending move alone and retry on a later scheduled run.
const DEFERRED_SCORES = Symbol.for("omen.scoring.deferred");

function deferredScores(reason) {
  return { [DEFERRED_SCORES]: true, reason };
}

function isDeferredScores(value) {
  return Boolean(value && value[DEFERRED_SCORES] === true);
}

async function fetchNFLScores({
  weekNum,
  season = CURRENT_SEASON,
  seasonType = DEFAULT_SEASON_TYPE,
  redis = null,
  env = process.env,
}) {
  const cacheKey = `ssff:scores:${season}:${weekNum}`;
  const cached = await redisGetJson(redis, cacheKey);
  if (cached) return cached;

  const fileName = nflverseStatsFileName(season);
  const response = await fetch(`${NFLVERSE_BASE_URL}/${fileName}`);
  if (response.status === 404) {
    // Not published yet: no cache write, no Supabase write, retry next run.
    return deferredScores(`nflverse has not published ${fileName} yet`);
  }
  if (!response.ok) throw new Error(`nflverse ${response.status} ${response.statusText}`);
  const playerScores = nflverseScoresFromCsv(await response.text(), { season, weekNum, seasonType });

  await redisSetJson(redis, cacheKey, playerScores, 3600);
  return playerScores;
}

/**
 * A6. A recommendation that carries a full contract is graded BY that contract,
 * not by the legacy three-label fallback.
 *
 * This used to throw outright. Throwing was correct as a fail-closed stop-gap —
 * grading a contract row as PPR is the defect — but it left the contract engine
 * orphaned: `calculateContractScore` had no production caller. It is now wired
 * through reconciliation, which returns one of the seven named states rather
 * than an exception, so a row that cannot be graded is *deferred and recorded*
 * instead of failing the whole run.
 *
 * The current Tuesday source (nflverse `player_stats`) publishes aggregate
 * fantasy points, not the per-event facts a contract prices, so in practice this
 * reconciles to `unsupported` with the missing facts named. That is the honest
 * answer, and it is the seam the owned football-data pipeline plugs into. It is
 * deliberately NOT worked around by scoring a missing fact as zero.
 */
function scoreMoveByContract(move, stats) {
  const reconciliation = reconcileMoveScoring({
    contract: move.scoring_contract || null,
    snapshotCoverageState: move.scoring_coverage_state || null,
    facts: stats?.event_facts || null,
    providerFinalPoints: move.provider_final_points ?? null,
  });

  if (reconciliation.state !== RECONCILIATION_STATES.EXACT) {
    return {
      deferred: true,
      reconciliation_state: reconciliation.state,
      reason: reconciliation.reason,
    };
  }

  return { deferred: false, points: reconciliation.omen_points, reconciliation_state: reconciliation.state };
}

// Band-aware grading weight. `moves.confidence` is the internal band representative (85 / 68 / 50);
// rows written on the legacy scale keep working: >= 80 is Confident, <= 50 is a Coin flip.
function confidenceFlags(score) {
  // Missing, null, zero or non-finite confidence is neutral: no bonus either way.
  const n = score == null || score === "" ? NaN : Number(score);
  if (!Number.isFinite(n) || n <= 0) return { confident: false, coinFlip: false };
  return { confident: bandFromScore(n) === "confident", coinFlip: n <= 50 };
}

function scoreMove(move, playerScores) {
  const keys = Object.keys(playerScores);
  const target = move.target_player || move.headline || "";
  const playerKey = findBestMatch(target, keys);

  if (!playerKey) {
    return {
      outcome: "loss",
      eff: 25,
      result: `No matching stat line found for ${target || "recommended player"}.`,
    };
  }

  const stats = playerScores[playerKey];

  // A contract-required row must never reach the legacy fallback. If its
  // contract cannot be reconciled, the row is deferred with its state recorded,
  // not graded against points the league does not award.
  let actual;
  let scoringLabel;
  if (move.scoring_contract_required === true) {
    const graded = scoreMoveByContract(move, stats);
    if (graded.deferred) {
      return {
        outcome: "pending",
        eff: null,
        reconciliation_state: graded.reconciliation_state,
        result: `Not graded: ${graded.reason}`,
      };
    }
    actual = graded.points;
    scoringLabel = "this league's scoring contract";
  } else {
    // Only a row predating A6 lacks scoring_contract_required. Its historical
    // fallback stays PPR, which is the documented behavior for those rows.
    actual = scoreFromStats(stats, move.scoring || "PPR");
    scoringLabel = move.scoring || "PPR";
  }
  const confidence = move.confidence;
  const projectedBaseline = 12.5;
  const ratio = actual / projectedBaseline;
  let eff = 30;
  let outcome = "loss";

  if (ratio >= 1.15) {
    eff += 25;
    outcome = "win";
  } else if (ratio >= 1) {
    eff += 15;
    outcome = "win";
  } else if (ratio >= 0.85) {
    eff += 5;
  }

  const { confident, coinFlip } = confidenceFlags(confidence);
  if (outcome === "win" && confident) eff += 20;
  if (outcome === "win" && coinFlip) eff += 10;
  if (outcome === "loss" && confident) eff -= 15;
  if (outcome === "loss" && coinFlip) eff -= 5;

  return {
    outcome,
    eff: Math.max(0, Math.min(100, Math.round(eff))),
    reconciliation_state: move.scoring_contract_required === true ? RECONCILIATION_STATES.EXACT : null,
    result: `${stats.name || target} scored ${actual.toFixed(1)} fantasy points (${scoringLabel}).`,
  };
}

/**
 * A deferred contract row is recorded, not closed: `scored_at` stays null so the
 * next run picks it up again once lawful event facts exist. Stamping it would
 * silently retire a recommendation that was never actually graded.
 */
function scoredMovePatch(score) {
  const deferred = score.outcome === "pending";
  const patch = {
    outcome: score.outcome,
    eff: score.eff,
    result: score.result,
    scored_at: deferred ? null : new Date().toISOString(),
  };
  if (score.reconciliation_state != null) patch.reconciliation_state = score.reconciliation_state;
  return patch;
}

async function saveScoredMove(supabase, moveId, score) {
  const patch = scoredMovePatch(score);

  let { error } = await supabase.from("moves").update(patch).eq("id", moveId);

  // `reconciliation_state` arrives with the reviewed A6 schema, and applying it
  // is the gated founder sequence. Until then, save without it rather than
  // failing the run.
  if (error && Object.hasOwn(patch, "reconciliation_state")
    && /reconciliation_state/.test(error.message || "")) {
    const { reconciliation_state: _dropped, ...withoutState } = patch;
    ({ error } = await supabase.from("moves").update(withoutState).eq("id", moveId));
  }

  if (error) throw new Error(`Move ${moveId} update failed: ${error.message}`);
}

// --- The Ledger (decisions → decision_outcomes) ----------------------------------------------------

const LEGACY_SCORING_LABELS = Object.freeze({ ppr: "PPR", half_ppr: "Half PPR", standard: "Standard" });

function emptyLedgerTally() {
  return { inserted: 0, updated: 0, unchanged: 0, deferred: 0, failed: 0 };
}

function decisionTargetPlayer(decision) {
  const recommendation = decision.recommendation || {};
  const name = recommendation.primary_player?.name || recommendation.target_player || null;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

/**
 * Grade one decision with the same rules the moves worker applies (scoreMove), so the two Ledgers
 * cannot disagree about a call. Differences are deliberate and only ever more cautious:
 *   - a call the person said they did not follow is `not_executed`, not graded;
 *   - a player with no public stat line is `data_incomplete`, not a loss;
 *   - every call issued by the live engine is contract-required (A6), and the decisions row keeps
 *     the contract's version and hash but not its rule body, so it reconciles to a named state and
 *     is recorded `data_incomplete` until a league-exact source exists. Only a legacy call copied
 *     from moves without a contract is graded against the documented PPR-label fallback;
 *   - nothing graded from public fantasy totals is `verified` (that needs exact reconciliation).
 */
function gradeDecision({ decision, action }, playerScores) {
  if (action?.followed === false) {
    return {
      state: "not_executed",
      provenance: "self_reported",
      summary: "You marked this call as not followed.",
    };
  }

  const target = decisionTargetPlayer(decision);
  if (!target || !findBestMatch(target, Object.keys(playerScores))) {
    return {
      state: "data_incomplete",
      provenance: "legacy_estimate",
      summary: "No public stat line matched the recommended player.",
    };
  }

  const contractRequired = decision.call_type !== "legacy"
    || Boolean(decision.scoring_contract_version || decision.scoring_contract_hash);
  const score = scoreMove({
    target_player: target,
    headline: decision.headline,
    confidence: decision.internal_score,
    scoring: LEGACY_SCORING_LABELS[decision.scoring_format] || decision.scoring_format || "PPR",
    scoring_contract_required: contractRequired,
    scoring_contract: null,
    scoring_coverage_state: decision.scoring_coverage_state || null,
  }, playerScores);

  if (score.outcome === "pending") {
    return {
      state: "data_incomplete",
      provenance: "legacy_estimate",
      reconciliation_state: score.reconciliation_state,
      summary: score.result,
    };
  }
  return {
    state: "resolved",
    result: score.outcome,
    provenance: score.reconciliation_state === RECONCILIATION_STATES.EXACT ? "verified" : "legacy_estimate",
    reconciliation_state: score.reconciliation_state,
    effectiveness: score.eff,
    summary: score.result,
  };
}

/**
 * Write decision_outcomes for every current call in a finished week of the current season that has
 * no final outcome. "Finished" is week < the current NFL week (Omen's calendar rolls on Tuesday),
 * so a missed run is caught up next time. Re-runs are idempotent: a final outcome is never touched
 * and an unchanged incomplete one is not rewritten.
 */
async function scoreLedgerDecisions(supabase, {
  now = new Date(),
  dryRun = false,
  fetchScores = fetchNFLScores,
  redis = null,
  env = process.env,
  dependencies = {},
} = {}) {
  const tally = emptyLedgerTally();
  const { season, raw_week: rawWeek } = getCurrentNflWeekContext(now);
  if (!Number.isInteger(rawWeek) || rawWeek < 2) return tally;
  // nflverse REG weeks only: weeks 1-18.
  const beforeWeek = Math.min(rawWeek, 19);

  const fetchScorable = dependencies.fetchScorableDecisions || ledgerStore.fetchScorableDecisions;
  const saveOutcome = dependencies.saveDecisionOutcome || ledgerStore.saveDecisionOutcome;
  const pending = await fetchScorable(supabase, { season, beforeWeek });
  const scoreMaps = new Map();

  for (const entry of pending) {
    const { decision } = entry;
    try {
      let playerScores = {};
      if (entry.action?.followed !== false) {
        const scoreKey = `${decision.season}:${decision.week}`;
        if (!scoreMaps.has(scoreKey)) {
          scoreMaps.set(scoreKey, await fetchScores({ weekNum: decision.week, season: decision.season, redis, env }));
        }
        playerScores = scoreMaps.get(scoreKey);
        if (isDeferredScores(playerScores)) {
          tally.deferred += 1;
          continue;
        }
        if (!Object.keys(playerScores || {}).length) throw new Error(`No nflverse player scores for ${scoreKey}`);
      }

      const outcome = gradeDecision(entry, playerScores);
      if (dryRun) {
        tally[entry.outcome ? "updated" : "inserted"] += 1;
        continue;
      }
      const written = await saveOutcome(supabase, { decision, existing: entry.outcome, outcome, now: new Date() });
      if (written === "inserted") tally.inserted += 1;
      else if (written === "updated") tally.updated += 1;
      else tally.unchanged += 1;
    } catch (error) {
      tally.failed += 1;
      // The decision id is an opaque uuid; no user, league or player value is logged.
      log.error(`Ledger decision ${decision.id} failed: ${error.message}`);
    }
  }
  return tally;
}

async function runScoring({ env = process.env, now = new Date(), dependencies = {} } = {}) {
  const missing = missingScoringEnv(env);
  if (missing.length) {
    throw new Error(`Missing required scoring env: ${missing.join(", ")}`);
  }

  const dryRun = isDryRun(env);
  const resolvedCreateSupabase = dependencies.createSupabase || createSupabase;
  const resolvedCreateRedis = dependencies.createRedis || createRedis;
  const resolvedArchive = dependencies.archiveNotExecutedMoves || archiveNotExecutedMoves;
  const resolvedFetchPendingMoves = dependencies.fetchPendingMoves || fetchPendingMoves;
  const resolvedFetchNFLScores = dependencies.fetchNFLScores || fetchNFLScores;
  const resolvedSaveScoredMove = dependencies.saveScoredMove || saveScoredMove;
  const resolvedScoreLedger = dependencies.scoreLedgerDecisions || scoreLedgerDecisions;
  const supabase = resolvedCreateSupabase(env);
  const redis = resolvedCreateRedis(env);
  const archiveCount = await resolvedArchive(supabase, now, { dryRun });
  const pendingMoves = await resolvedFetchPendingMoves(supabase, now);

  // The Ledger is scored independently of moves: a failure in one never stops the other.
  const scoreLedger = async () => {
    try {
      return await resolvedScoreLedger(supabase, {
        now, dryRun, redis, env,
        fetchScores: dependencies.fetchNFLScores || fetchNFLScores,
      });
    } catch (error) {
      log.error(`Ledger scoring failed: ${error.message}`);
      return { ...emptyLedgerTally(), error: true };
    }
  };

  if (!pendingMoves.length) {
    return { dryRun, archiveCount, scoredCount: 0, failedCount: 0, deferredCount: 0, ledger: await scoreLedger() };
  }

  let scoredCount = 0;
  let failedCount = 0;
  let deferredCount = 0;
  const scoreMaps = new Map();

  for (const move of pendingMoves) {
    try {
      const season = Number(move.season);
      const weekNum = Number(move.week_num);
      if (!Number.isInteger(season) || !Number.isInteger(weekNum) || weekNum < 1) {
        throw new Error("Move is missing a valid stored season/week");
      }
      const scoreKey = `${season}:${weekNum}`;
      if (!scoreMaps.has(scoreKey)) {
        scoreMaps.set(scoreKey, await resolvedFetchNFLScores({ weekNum, season, redis, env }));
      }
      const playerScores = scoreMaps.get(scoreKey);
      if (isDeferredScores(playerScores)) {
        deferredCount += 1;
        log.info(`Move ${move.id} deferred for ${scoreKey}: ${playerScores.reason}`);
        continue;
      }
      if (!Object.keys(playerScores || {}).length) {
        throw new Error(`No nflverse player scores available for ${scoreKey}`);
      }
      const score = scoreMove(move, playerScores);
      if (!dryRun) await resolvedSaveScoredMove(supabase, move.id, score);
      scoredCount += 1;
    } catch (error) {
      failedCount += 1;
      log.error(`Move ${move.id} failed: ${error.message}`);
    }
  }

  return { dryRun, archiveCount, scoredCount, failedCount, deferredCount, ledger: await scoreLedger() };
}

async function main({ env = process.env } = {}) {
  if (!isScoringEnabled(env)) {
    log.info("Tuesday scoring disabled. Set OMEN_CRON_SCORING_ENABLED=true after scoring/provider validation.");
    return { disabled: true };
  }

  const result = await runScoring({ env });
  log.info(`Tuesday scoring complete: archived=${result.archiveCount} scored=${result.scoredCount} failed=${result.failedCount} deferred=${result.deferredCount}`);
  const ledger = result.ledger || {};
  log.info(`Ledger scoring: inserted=${ledger.inserted} updated=${ledger.updated} unchanged=${ledger.unchanged} deferred=${ledger.deferred} failed=${ledger.failed}${ledger.error ? " error=true" : ""}`);
  return result;
}

function installSentryProcessHandlers() {
  const handleUncaughtException = (error) => {
    Sentry.captureException(error);
    flushSentry().finally(() => {
      process.removeListener("uncaughtException", handleUncaughtException);
      throw error;
    });
  };

  process.on("uncaughtException", handleUncaughtException);
  process.on("unhandledRejection", (reason) => {
    Sentry.captureException(reason instanceof Error ? reason : new Error("Unhandled rejection"));
  });
}

if (require.main === module) {
  installSentryProcessHandlers();
  main()
    .then(async () => {
      await flushSentry();
      process.exit(0);
    })
    .catch(async (error) => {
      Sentry.captureException(error);
      log.error(error.stack || error.message);
      await flushSentry();
      process.exit(1);
    });
}

module.exports = {
  archiveNotExecutedMoves,
  confidenceFlags,
  fetchNFLScores,
  fetchPendingMoves,
  findBestMatch,
  getMostRecentSunday,
  gradeDecision,
  scoreLedgerDecisions,
  isDeferredScores,
  isDryRun,
  isScoringEnabled,
  main,
  missingScoringEnv,
  nflverseScoresFromCsv,
  normalizeName,
  runScoring,
  scoreFromStats,
  scoreMove,
  scoreMoveByContract,
  scoredMovePatch,
};
