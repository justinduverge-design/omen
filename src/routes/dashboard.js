"use strict";

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");
const { logger } = require("../middleware/logging");
const { getCurrentNflWeekContext, isOffSeason } = require("../services/nflSchedule");
const { getOmenReadiness, isOmenReadyConnection } = require("../services/omenReadiness");
const { getAuthenticatedYahooClient } = require("../services/yahooAuth");
const { getAuthenticatedEspnCredentials } = require("../services/espnAuth");
const sleeperAdapter = require("../adapters/sleeper");
const yahooAdapter = require("../adapters/yahoo");
const espnAdapter = require("../adapters/espn");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

function nowIso() {
  return new Date().toISOString();
}

function hasUsableLeagueId(row) {
  const leagueId = String(row?.league_id || "").trim();
  return Boolean(leagueId) && leagueId !== "yahoo";
}

function isExpiredYahooToken(row, now = new Date()) {
  if (row?.platform !== "yahoo" || !row?.is_active || !row?.token_secret_id) return false;
  const expiresAt = row.token_expires_at ? Date.parse(row.token_expires_at) : NaN;
  return !Number.isFinite(expiresAt) || expiresAt <= now.getTime();
}

function hasUsableYahooToken(row, now = new Date()) {
  return Boolean(
    row?.platform === "yahoo"
    && row?.is_active
    && row?.token_secret_id
    && !isExpiredYahooToken(row, now)
  );
}

function hasUsableSleeperContext(row) {
  return Boolean(
    row?.platform === "sleeper"
    && row?.is_active
    && row?.platform_username
    && hasUsableLeagueId(row)
  );
}

function hasUsableEspnContext(row) {
  return Boolean(
    row?.platform === "espn"
    && row?.is_active
    && row?.espn_secret_id
    && row?.swid_secret_id
    && hasUsableLeagueId(row)
  );
}

function buildPlatformSummary(rows = [], now = new Date()) {
  const activeRows = rows.filter((row) => row?.is_active);
  const yahoo = activeRows.find((row) => row.platform === "yahoo" && row.token_secret_id);
  const yahooTokenExpired = isExpiredYahooToken(yahoo, now);
  const sleeper = activeRows.find((row) => row.platform === "sleeper" && row.platform_username);
  const espn = activeRows.find((row) =>
    row.platform === "espn" && row.espn_secret_id && row.swid_secret_id
  );

  const yahooSummary = {
    connected: Boolean(yahoo && !yahooTokenExpired),
    league_id: yahoo?.league_id || null,
    ...emptyLastResult(),
  };
  if (yahooTokenExpired) {
    yahooSummary.status = "token_expired";
  }

  return {
    yahoo: yahooSummary,
    sleeper: {
      connected: Boolean(sleeper),
      username: sleeper?.platform_username || null,
      ...emptyLastResult(),
    },
    espn: {
      connected: Boolean(espn),
      ...emptyLastResult(),
    },
  };
}

function emptyLastResult() {
  return {
    lastResult: null,
    lastGameId: null,
    lastGameKickoff: null,
  };
}

function previousWeekContext(context = getCurrentNflWeekContext()) {
  const season = Number(context?.season);
  const week = Number(context?.week);
  if (!Number.isFinite(season) || !Number.isFinite(week) || week <= 1) return null;
  return { season, week: week - 1 };
}

function applyLastResult(summary, platform, result) {
  if (!summary?.[platform] || !result) return;
  summary[platform].lastResult = result.lastResult ?? null;
  summary[platform].lastGameId = result.lastGameId ?? null;
  summary[platform].lastGameKickoff = result.lastGameKickoff ?? null;
}

async function getSleeperLastResult(row, context) {
  const sleeperUserId = row.platform_user_id
    || (row.platform_username
      ? (await sleeperAdapter.fetchSleeperUser(row.platform_username)).user_id
      : null);
  if (!sleeperUserId) return null;
  return sleeperAdapter.fetchSleeperLastResult({
    leagueId: row.league_id,
    userId: sleeperUserId,
    season: context.season,
    week: context.week,
  });
}

async function getYahooLastResult(row, userId, context) {
  const { client } = await getAuthenticatedYahooClient(userId);
  const teamKey = await client.getMyTeamKey(row.league_id);
  if (!teamKey) return null;
  return yahooAdapter.fetchYahooLastResult({
    client,
    leagueKey: row.league_id,
    teamKey,
    season: context.season,
    week: context.week,
  });
}

async function getEspnLastResult(row, userId, context) {
  const credentials = await getAuthenticatedEspnCredentials(userId);
  return espnAdapter.fetchEspnLastResult(
    row.league_id,
    credentials.espn_s2,
    credentials.swid,
    {
      seasonId: context.season,
      week: context.week,
      teamId: row.espn_team_id,
    }
  );
}

const LAST_RESULT_TIMEOUT_MS = 4000;

/**
 * Bounds a platform lookup to LAST_RESULT_TIMEOUT_MS. Yahoo's client uses
 * plain fetch with no timeout and ESPN's https.request has none either
 * (Sleeper's axios call does) - without this, a hung upstream call would
 * stall the whole dashboard summary response indefinitely.
 */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    }),
  ]);
}

async function buildPlatformSummaryForUser(rows = [], userId, now = new Date()) {
  const summary = buildPlatformSummary(rows, now);
  const lastResultContext = previousWeekContext(getCurrentNflWeekContext(now));
  if (!lastResultContext) return summary;

  const activeRows = rows.filter((row) => row?.is_active);
  const lookups = [
    {
      platform: "sleeper",
      row: activeRows.find(hasUsableSleeperContext),
      run: (row) => getSleeperLastResult(row, lastResultContext),
    },
    {
      platform: "yahoo",
      row: activeRows.find((row) => hasUsableYahooToken(row, now) && hasUsableLeagueId(row)),
      run: (row) => getYahooLastResult(row, userId, lastResultContext),
    },
    {
      platform: "espn",
      row: activeRows.find(hasUsableEspnContext),
      run: (row) => getEspnLastResult(row, userId, lastResultContext),
    },
  ];

  await Promise.all(lookups.map(async ({ platform, row, run }) => {
    if (!row) return;
    try {
      applyLastResult(summary, platform, await withTimeout(run(row), LAST_RESULT_TIMEOUT_MS));
    } catch (e) {
      logger.warn("Dashboard platform last-result lookup failed", {
        platform,
        message: e?.message,
      });
    }
  }));

  return summary;
}

function buildOmenTool({ rows = [], offSeason = false } = {}) {
  return getOmenReadiness({ rows, offSeason });
}

function buildWaiverTool({ rows = [] }) {
  const activeRows = rows.filter((row) => row?.is_active);
  const ready = activeRows.some((row) => isOmenReadyConnection(row));

  return ready
    ? { available: true, mode: "free", status: "ready" }
    : { available: false, mode: "free", status: "needs_platform" };
}

async function getPlatformRows(userId) {
  const { data, error } = await supabase
    .from("platform_connections")
    .select("platform,is_active,league_id,platform_username,platform_user_id,token_secret_id,token_expires_at,espn_secret_id,swid_secret_id,espn_team_id")
    .eq("user_id", userId);

  if (error) throw new Error(`platform_connections lookup failed: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("favorite_team")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { favorite_team: null };
  }

  return {
    favorite_team: data?.favorite_team || null,
  };
}

router.get("/summary", requireAuth, async (req, res, next) => {
  try {
    const [rows, userProfile] = await Promise.all([
      getPlatformRows(req.user.id),
      getUserProfile(req.user.id),
    ]);

    return res.json({
      contract_version: "dashboard-summary.v1",
      generated_at: nowIso(),
      is_mock: false,
      user: userProfile,
      platforms: await buildPlatformSummaryForUser(rows, req.user.id),
      tools: {
        // `draft_assistant` was hardcoded `available: true, status: "ready"`
        // here and removed 2026-08-16 (P1-DraftAssistantSideline). Draft
        // Assistant is cut from 1.0 and must not appear in the advertised tool
        // list (facts-of-record #9). Restore this line for 2027 alongside
        // DRAFT_ASSISTANT_ENABLED; see `config.draftAssistant`.
        omen_of_the_week: buildOmenTool({ rows, offSeason: isOffSeason() }),
        start_sit: { available: true, mode: "free", status: "ready" },
        trade_analyzer: { available: true, mode: "free", status: "ready" },
        waiver_wire: buildWaiverTool({ rows }),
      },
    });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
module.exports.buildPlatformSummary = buildPlatformSummary;
module.exports.buildPlatformSummaryForUser = buildPlatformSummaryForUser;
module.exports.buildOmenTool = buildOmenTool;
module.exports.buildWaiverTool = buildWaiverTool;
module.exports.isExpiredYahooToken = isExpiredYahooToken;
module.exports.emptyLastResult = emptyLastResult;
