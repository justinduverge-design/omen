"use strict";

/**
 * Corvus Tuesday scoring worker.
 *
 * The previous generated worker was not valid JavaScript and the cron image was
 * pointing at an old ssffmvp filename. This worker now fails closed by default:
 * no data is scored unless CORVUS_CRON_SCORING_ENABLED=true is present.
 */

const { createClient } = require("@supabase/supabase-js");
const { Redis } = require("@upstash/redis");

const REQUIRED_SCORING_ENV = Object.freeze([
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "SPORTRADAR_API_KEY",
]);

const CURRENT_SEASON = new Date().getFullYear();
const SPORTRADAR_BASE = "https://api.sportradar.com/nfl/official/trial/v7/en";

function timestamp() {
  return new Date().toISOString();
}

const log = {
  info: (...args) => console.log(`[${timestamp()}] [corvus-cron]`, ...args),
  warn: (...args) => console.warn(`[${timestamp()}] [corvus-cron] WARN`, ...args),
  error: (...args) => console.error(`[${timestamp()}] [corvus-cron] ERROR`, ...args),
};

function isScoringEnabled(env = process.env) {
  return env.CORVUS_CRON_SCORING_ENABLED === "true";
}

function missingScoringEnv(env = process.env) {
  return REQUIRED_SCORING_ENV.filter((name) => !env[name]);
}

function getCurrentNFLWeek(now = new Date(), season = CURRENT_SEASON) {
  const seasonStart = new Date(`${season}-09-05T00:00:00.000Z`);
  const elapsedWeeks = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(18, elapsedWeeks + 1));
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

function extractPlayerStats(game, playerScores) {
  const processTeam = (team) => {
    for (const player of team?.rushing?.players || []) {
      const key = normalizeName(player.name);
      playerScores[key] = {
        ...(playerScores[key] || {}),
        name: player.name,
        rush: (player.yards || 0) * 0.1 + (player.touchdowns || 0) * 6,
      };
    }

    for (const player of team?.receiving?.players || []) {
      const key = normalizeName(player.name);
      const base = (player.yards || 0) * 0.1 + (player.touchdowns || 0) * 6;
      playerScores[key] = {
        ...(playerScores[key] || {}),
        name: player.name,
        rec_ppr: base + (player.receptions || 0),
        rec_half: base + (player.receptions || 0) * 0.5,
        rec_std: base,
      };
    }

    for (const player of team?.passing?.players || []) {
      const key = normalizeName(player.name);
      playerScores[key] = {
        ...(playerScores[key] || {}),
        name: player.name,
        pass: (player.yards || 0) * 0.04 + (player.touchdowns || 0) * 4 - (player.interceptions || 0) * 2,
      };
    }
  };

  processTeam(game.summary?.home);
  processTeam(game.summary?.away);
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

async function fetchPendingMoves(supabase, now = new Date()) {
  const cutoff = getMostRecentSunday(now).toISOString();

  const { data: moves, error } = await supabase
    .from("moves")
    .select("id, user_id, week_num, season, move_type, headline, confidence, scoring, target_player, platform, league_id, outcome, followed, created_at")
    .eq("outcome", "pending")
    .eq("followed", true)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Pending move lookup failed: ${error.message}`);
  return moves || [];
}

async function archiveNotExecutedMoves(supabase, now = new Date()) {
  const cutoff = getMostRecentSunday(now).toISOString();

  const { data: rows, error } = await supabase
    .from("moves")
    .select("id")
    .eq("outcome", "pending")
    .eq("followed", false)
    .lt("created_at", cutoff);

  if (error) throw new Error(`Not-executed lookup failed: ${error.message}`);
  if (!rows?.length) return 0;

  const { error: updateError } = await supabase
    .from("moves")
    .update({ outcome: "not_executed", scored_at: new Date().toISOString() })
    .in("id", rows.map((row) => row.id));

  if (updateError) throw new Error(`Not-executed archive failed: ${updateError.message}`);
  return rows.length;
}

async function fetchNFLScores({ weekNum, season = CURRENT_SEASON, redis = null, env = process.env }) {
  const cacheKey = `ssff:scores:${season}:${weekNum}`;
  const cached = await redisGetJson(redis, cacheKey);
  if (cached) return cached;

  const url = `${SPORTRADAR_BASE}/seasons/${season}/REG/${weekNum}/schedule.json?api_key=${env.SPORTRADAR_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sportradar ${response.status} ${response.statusText}`);

  const data = await response.json();
  const playerScores = {};

  for (const game of data.week?.games || []) {
    if (game.status === "closed") extractPlayerStats(game, playerScores);
  }

  await redisSetJson(redis, cacheKey, playerScores, 3600);
  return playerScores;
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
  const actual = scoreFromStats(stats, move.scoring);
  const confidence = Number(move.confidence) || 50;
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

  if (outcome === "win" && confidence >= 75) eff += 20;
  if (outcome === "win" && confidence < 50) eff += 10;
  if (outcome === "loss" && confidence >= 75) eff -= 15;
  if (outcome === "loss" && confidence < 50) eff -= 5;

  return {
    outcome,
    eff: Math.max(0, Math.min(100, Math.round(eff))),
    result: `${stats.name || target} scored ${actual.toFixed(1)} fantasy points (${move.scoring || "PPR"}).`,
  };
}

async function saveScoredMove(supabase, moveId, score) {
  const { error } = await supabase
    .from("moves")
    .update({
      outcome: score.outcome,
      eff: score.eff,
      result: score.result,
      scored_at: new Date().toISOString(),
    })
    .eq("id", moveId);

  if (error) throw new Error(`Move ${moveId} update failed: ${error.message}`);
}

async function runScoring({ env = process.env, now = new Date() } = {}) {
  const missing = missingScoringEnv(env);
  if (missing.length) {
    throw new Error(`Missing required scoring env: ${missing.join(", ")}`);
  }

  const supabase = createSupabase(env);
  const redis = createRedis(env);
  const archiveCount = await archiveNotExecutedMoves(supabase, now);
  const pendingMoves = await fetchPendingMoves(supabase, now);

  if (!pendingMoves.length) {
    return { archiveCount, scoredCount: 0, failedCount: 0 };
  }

  const weekNum = Math.max(1, getCurrentNFLWeek(now) - 1);
  const playerScores = await fetchNFLScores({ weekNum, redis, env });

  if (!Object.keys(playerScores).length) {
    throw new Error(`No closed-game player scores available for week ${weekNum}`);
  }

  let scoredCount = 0;
  let failedCount = 0;

  for (const move of pendingMoves) {
    try {
      const score = scoreMove(move, playerScores);
      await saveScoredMove(supabase, move.id, score);
      scoredCount += 1;
    } catch (error) {
      failedCount += 1;
      log.error(`Move ${move.id} failed: ${error.message}`);
    }
  }

  return { archiveCount, scoredCount, failedCount };
}

async function main({ env = process.env } = {}) {
  if (!isScoringEnabled(env)) {
    log.info("Tuesday scoring disabled. Set CORVUS_CRON_SCORING_ENABLED=true after scoring/provider validation.");
    return { disabled: true };
  }

  const result = await runScoring({ env });
  log.info(`Tuesday scoring complete: archived=${result.archiveCount} scored=${result.scoredCount} failed=${result.failedCount}`);
  return result;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      log.error(error.stack || error.message);
      process.exit(1);
    });
}

module.exports = {
  archiveNotExecutedMoves,
  fetchNFLScores,
  fetchPendingMoves,
  findBestMatch,
  getCurrentNFLWeek,
  getMostRecentSunday,
  isScoringEnabled,
  main,
  missingScoringEnv,
  normalizeName,
  runScoring,
  scoreFromStats,
  scoreMove,
};
