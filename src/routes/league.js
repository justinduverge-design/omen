"use strict";

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");
const { logger } = require("../middleware/logging");
const { getCurrentNflWeekContext, isOffSeason } = require("../services/nflSchedule");
const { getAuthenticatedYahooClient } = require("../services/yahooAuth");
const { getAuthenticatedEspnCredentials } = require("../services/espnAuth");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

const VALID_PLATFORMS = new Set(["yahoo", "sleeper", "espn"]);
const PLATFORM_PRIORITY = ["yahoo", "sleeper", "espn"];
const ERROR_COPY = Object.freeze({
  invalid_platform: {
    error: "Invalid platform",
    message: "League standings only supports Yahoo, Sleeper, or ESPN.",
    action: "choose_supported_platform",
  },
  league_not_connected: {
    error: "No connected league found",
    message: "Connect a Yahoo, Sleeper, or ESPN league before viewing standings.",
    action: "connect_league",
  },
  reconnect_required: {
    error: "League provider reconnect required",
    message: "Omen needs a fresh connection before it can load these standings.",
    action: "reconnect_platform",
  },
  provider_failed: {
    error: "League standings provider failed",
    message: "Omen could not load standings from the league provider right now.",
    action: "retry_later",
  },
});

function nowIso() {
  return new Date().toISOString();
}

function normalizePlatform(value) {
  return value == null || value === "" ? null : String(value).trim().toLowerCase();
}

function normalizeLeagueId(value) {
  return value == null || value === "" ? null : String(value).trim();
}

function connectionUsable(row) {
  if (!row?.is_active || !row?.league_id) return false;
  if (row.platform === "yahoo") return Boolean(row.token_secret_id);
  if (row.platform === "sleeper") return Boolean(row.platform_username || row.platform_user_id);
  if (row.platform === "espn") return Boolean(row.espn_secret_id && row.swid_secret_id);
  return false;
}

function selectConnection(rows, { platform, leagueId }) {
  const candidates = (rows || [])
    .filter(connectionUsable)
    .filter((row) => !platform || row.platform === platform)
    .filter((row) => !leagueId || String(row.league_id) === String(leagueId));

  return candidates.sort((a, b) => (
    PLATFORM_PRIORITY.indexOf(a.platform) - PLATFORM_PRIORITY.indexOf(b.platform)
  ))[0] || null;
}

async function getConnectionRows(userId) {
  const { data, error } = await supabase
    .from("platform_connections")
    .select("platform,is_active,league_id,platform_username,platform_user_id,token_secret_id,refresh_secret_id,espn_secret_id,swid_secret_id,espn_team_id")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) throw new Error(`platform_connections lookup failed: ${error.message}`);
  return data || [];
}

function baseEnvelope(connection, context, extra = {}) {
  return {
    contract_version: "league-standings.v1",
    generated_at: nowIso(),
    platform: connection.platform,
    league_id: String(connection.league_id),
    league_name: extra.league_name || null,
    season: Number(extra.season || context.season),
    week: Number(extra.week || context.week),
    standings: extra.standings || [],
  };
}

async function yahooStandings(connection, userId, context) {
  const { client } = await getAuthenticatedYahooClient(userId);
  const [metadata, myTeamKey] = await Promise.all([
    client.getLeagueMetadata(connection.league_id).catch(() => ({})),
    client.getMyTeamKey(connection.league_id).catch(() => null),
  ]);
  const standings = await client.getLeagueStandings(connection.league_id, myTeamKey);
  return baseEnvelope(connection, context, {
    league_name: metadata.league_name,
    season: metadata.season,
    week: metadata.week,
    standings,
  });
}

async function sleeperStandings(connection, context) {
  const sleeperUserId = connection.platform_user_id
    || (connection.platform_username
      ? (await sleeperAdapter.fetchSleeperUser(connection.platform_username)).user_id
      : null);

  if (!sleeperUserId) {
    const err = new Error("Sleeper connection is missing user context");
    err.status = 404;
    throw err;
  }

  const [league, standings] = await Promise.all([
    sleeperAdapter.fetchSleeperLeague(connection.league_id),
    sleeperAdapter.fetchSleeperStandings(connection.league_id, sleeperUserId),
  ]);

  return baseEnvelope(connection, context, {
    league_name: league?.name || null,
    season: Number(league?.season) || context.season,
    standings,
  });
}

async function espnStandings(connection, userId, context) {
  const credentials = await getAuthenticatedEspnCredentials(userId);
  const standings = await espnAdapter.buildLeagueStandings(
    connection.league_id,
    credentials.espn_s2,
    credentials.swid,
    {
      seasonId: context.season,
      week: context.week,
      teamId: connection.espn_team_id,
    }
  );

  return baseEnvelope(connection, context, { standings });
}

function providerAuthCode(platform) {
  return `${platform}_reconnect_required`;
}

function errorEnvelope({ code, status, platform = null }) {
  const copy = ERROR_COPY[code]
    || (code?.endsWith("_reconnect_required") ? ERROR_COPY.reconnect_required : null)
    || ERROR_COPY.provider_failed;
  return {
    status,
    body: {
      contract_version: "league-standings-error.v1",
      error: copy.error,
      code,
      message: copy.message,
      action: copy.action,
      ...(platform ? { platform } : {}),
    },
  };
}

router.get("/standings", requireAuth, async (req, res, next) => {
  const platform = normalizePlatform(req.query.platform);
  const leagueId = normalizeLeagueId(req.query.leagueId);

  if (platform && !VALID_PLATFORMS.has(platform)) {
    const result = errorEnvelope({ code: "invalid_platform", status: 400 });
    return res.status(result.status).json(result.body);
  }

  try {
    const context = getCurrentNflWeekContext();
    const rows = await getConnectionRows(req.user.id);
    const connection = selectConnection(rows, { platform, leagueId });

    if (!connection) {
      const result = errorEnvelope({ code: "league_not_connected", status: 404 });
      return res.status(result.status).json(result.body);
    }

    if (isOffSeason()) {
      return res.json(baseEnvelope(connection, context));
    }

    try {
      if (connection.platform === "yahoo") {
        return res.json(await yahooStandings(connection, req.user.id, context));
      }
      if (connection.platform === "sleeper") {
        return res.json(await sleeperStandings(connection, context));
      }
      if (connection.platform === "espn") {
        return res.json(await espnStandings(connection, req.user.id, context));
      }
    } catch (e) {
      if (e?.status === 401 || e?.status === 404) {
        const result = errorEnvelope({
          code: providerAuthCode(connection.platform),
          status: e.status,
          platform: connection.platform,
        });
        return res.status(result.status).json(result.body);
      }

      logger.error("League standings provider failed", {
        err: e.message,
        platform: connection.platform,
      });
      const result = errorEnvelope({
        code: "league_standings_provider_failed",
        status: 502,
        platform: connection.platform,
      });
      return res.status(result.status).json(result.body);
    }

    const result = errorEnvelope({ code: "invalid_platform", status: 400 });
    return res.status(result.status).json(result.body);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
module.exports.selectConnection = selectConnection;
module.exports.connectionUsable = connectionUsable;
module.exports.errorEnvelope = errorEnvelope;
