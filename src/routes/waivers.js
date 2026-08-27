"use strict";

/**
 * Provider-neutral Waiver Analysis (visual briefs §6).
 *
 * `GET /api/optimizer/waivers` and `/waiver` are Yahoo-only — both call
 * getAuthenticatedYahooClient() unconditionally — and Yahoo's Fantasy API is
 * refused at the app-entitlement level (facts-of-record #11). ESPN's
 * fetchEspnWaiverPool and Sleeper's fetchSleeperAvailablePlayers reached the app
 * only through POST /api/omen/mvp-move, as a single MVP move. Neither path can
 * serve the approved screen.
 *
 * SECURITY: no ESPN cookie value in any response, log line, or error payload
 * (facts-of-record #6).
 */

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { logger } = require("../middleware/logging");
const { requireAuth } = require("../middleware/auth");
const { getAuthenticatedYahooClient } = require("../services/yahooAuth");
const { getAuthenticatedEspnCredentials } = require("../services/espnAuth");
const { getCurrentNflWeekContext, isOffSeason } = require("../services/nflSchedule");
const { isOmenReadyConnection } = require("../services/omenReadiness");
const { readConnectionsWithSelection, resolveActiveConnection } = require("../services/activeSelection");
const { buildWaiverAnalysis } = require("../services/waiverAnalysis");
const rosterSvc = require("../services/roster");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

const ERROR_CONTRACT = "waiver-analysis-error.v1";
const CONNECTION_COLUMNS =
  // token_expires_at is load-bearing: isOmenReadyConnection() treats an absent
// expiry as expired, so omitting it here would make every Yahoo connection
// unusable.
  "platform,is_active,league_id,platform_username,platform_user_id,token_secret_id,token_expires_at,espn_secret_id,swid_secret_id,espn_team_id";

function errorBody({ code, message, action, platform = null }) {
  return {
    contract_version: ERROR_CONTRACT,
    error: "Waiver analysis unavailable",
    code,
    message,
    action,
    ...(platform ? { platform } : {}),
  };
}

function scoringFormatFromSleeperLeague(league) {
  const rec = Number(league?.scoring_settings?.rec);
  if (rec === 0) return "standard";
  if (rec === 0.5) return "half PPR";
  if (rec === 1) return "PPR";
  return null;
}

/**
 * A null pool is "Omen could not read the pool" and an empty array is "the pool
 * is genuinely empty". buildWaiverAnalysis renders those as different states, so
 * this must never collapse one into the other.
 */
async function loadSleeper(connection, week, season) {
  const league = await sleeperAdapter.fetchSleeperLeague(connection.league_id).catch(() => null);
  const roster = await sleeperAdapter.buildNormalizedRoster(
    connection.league_id,
    connection.platform_username,
    week,
    { season }
  );
  const pool = await sleeperAdapter
    .fetchSleeperAvailablePlayers(connection.league_id, week, String(season))
    .catch(() => null);

  return {
    roster,
    pool,
    scoringFormat: scoringFormatFromSleeperLeague(league),
    // Sleeper's rosters endpoint is the league's own truth about who is rostered,
    // so an unrostered player really is a free agent in this league.
    availabilityConfirmed: pool != null,
    limitations: [],
  };
}

async function loadEspn(connection, userId, week) {
  const credentials = await getAuthenticatedEspnCredentials(userId);
  const roster = await espnAdapter.buildNormalizedRoster(
    connection.league_id,
    credentials.espn_s2,
    credentials.swid,
    week,
    { teamId: connection.espn_team_id }
  );
  const pool = await espnAdapter
    .fetchEspnWaiverPool(connection.league_id, credentials.espn_s2, credentials.swid, week)
    .catch(() => null);

  return {
    roster,
    pool,
    // ESPN exposes no scoring-settings mapping Omen has verified, so this stays
    // null rather than defaulting to PPR — that default is the A6 defect.
    scoringFormat: null,
    availabilityConfirmed: pool != null,
    limitations: pool == null
      ? []
      : ["Omen has not verified this league's scoring rules, so evidence omits league scoring."],
  };
}

async function loadYahoo(connection, userId, week) {
  const { client } = await getAuthenticatedYahooClient(userId);
  const cacheKey = `ssff:waiver-analysis:${userId}:${connection.league_id}:${week || "current"}`;
  const roster = await rosterSvc.fetchAndNormalizeRoster(client, connection.league_id, week, cacheKey);

  let pool = null;
  try {
    const raw = await client.getAvailablePlayers(connection.league_id, { count: 50, sort: "AR" });
    pool = rosterSvc.normalizeYahooWaivers(raw);
  } catch {
    pool = null;
  }

  return {
    roster,
    pool,
    scoringFormat: null,
    // Yahoo's /players;status=A carries no projection, so every candidate is
    // unprojected and none is evidence-backed. Availability alone is not enough
    // to rank a §6 recommendation, and saying so beats ranking on nothing.
    availabilityConfirmed: false,
    limitations: ["Yahoo's available-player response carries no weekly projection, so Omen cannot rank waiver adds for this league."],
  };
}

function loadForConnection(connection, userId, week, season) {
  if (connection.platform === "sleeper") return loadSleeper(connection, week, season);
  if (connection.platform === "espn") return loadEspn(connection, userId, week);
  if (connection.platform === "yahoo") return loadYahoo(connection, userId, week);
  const err = new Error(`Unsupported platform: ${connection.platform}`);
  err.status = 400;
  return Promise.reject(err);
}

function parseWeek(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 18) return undefined;
  return parsed;
}

router.get("/analysis", requireAuth, async (req, res, next) => {
  const requestedWeek = parseWeek(req.query.week);
  if (requestedWeek === undefined) {
    return res.status(400).json(errorBody({
      code: "invalid_week",
      message: "Week must be between 1 and 18.",
      action: "retry",
    }));
  }

  try {
    const context = getCurrentNflWeekContext();
    const week = requestedWeek || context.week;
    const { rows } = await readConnectionsWithSelection(supabase, req.user.id, CONNECTION_COLUMNS);
    const connection = resolveActiveConnection(rows, { isUsable: (row) => isOmenReadyConnection(row) });

    if (!connection) {
      return res.status(404).json(errorBody({
        code: "no_usable_league",
        message: "Connect a league and pick a team before Omen can analyse waivers.",
        action: "connect",
      }));
    }

    let loaded;
    try {
      loaded = await loadForConnection(connection, req.user.id, week, context.season);
    } catch (error) {
      // Never echo the provider message; it can carry credential fragments.
      logger.warn("Waiver analysis provider read failed", {
        platform: connection.platform,
        status: error?.status || null,
      });
      const status = error?.status === 401 || error?.status === 403 ? 401 : 502;
      return res.status(status).json(errorBody({
        code: status === 401 ? `${connection.platform}_reconnect_required` : "provider_unavailable",
        message: status === 401
          ? "Reconnect this platform so Omen can read your roster."
          : "Omen could not reach this platform. Try again shortly.",
        action: status === 401 ? "reconnect" : "retry",
        platform: connection.platform,
      }));
    }

    const analysis = buildWaiverAnalysis({
      roster: loaded.roster,
      pool: loaded.pool,
      platform: connection.platform,
      leagueId: connection.league_id,
      week,
      season: context.season,
      scoringFormat: loaded.scoringFormat,
      availabilityConfirmed: loaded.availabilityConfirmed,
      deadline: null,
      offSeason: isOffSeason(),
    });

    return res.json({ ...analysis, limitations: loaded.limitations });
  } catch (e) {
    logger.error("Waiver analysis failed", { err: e.message });
    return next(e);
  }
});

module.exports = router;
module.exports.scoringFormatFromSleeperLeague = scoringFormatFromSleeperLeague;
