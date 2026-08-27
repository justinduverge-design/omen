"use strict";

/**
 * Start/Sit detail (visual briefs §5).
 *
 * Mounted alongside `src/routes/startSit.js` at /api/start-sit, but kept as its
 * own router deliberately: that file's `POST /` is a public, unauthenticated,
 * config-free comparator, and pulling the provider services into it would make
 * the whole router unloadable without Supabase env.
 *
 * The two are different features. `POST /api/start-sit` takes two players from
 * the caller and returns a winner. §5 opens on the *user's own* highest-priority
 * unresolved lineup decision, names the league's scoring rule, and separates
 * fact from inference — none of which the old route can reach, because it never
 * touches a provider.
 *
 * SECURITY: no ESPN cookie value in any response or log line
 * (facts-of-record #6).
 */

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { logger } = require("../middleware/logging");
const { requireAuth } = require("../middleware/auth");
const rosterSvc = require("../services/roster");
const { getAuthenticatedYahooClient } = require("../services/yahooAuth");
const { getAuthenticatedEspnCredentials } = require("../services/espnAuth");
const { getCurrentNflWeekContext, isOffSeason } = require("../services/nflSchedule");
const { isOmenReadyConnection } = require("../services/omenReadiness");
const { readConnectionsWithSelection, resolveActiveConnection } = require("../services/activeSelection");
const { buildStartSitDetail } = require("../services/startSitDetail");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

const ERROR_CONTRACT = "start-sit-detail-error.v1";
// token_expires_at is load-bearing: isOmenReadyConnection() treats an absent
// expiry as expired, so omitting it would make every Yahoo connection unusable.
const CONNECTION_COLUMNS =
  "platform,is_active,league_id,platform_username,platform_user_id,token_secret_id,token_expires_at,espn_secret_id,swid_secret_id,espn_team_id";

function detailError({ code, message, action, platform = null }) {
  return {
    contract_version: ERROR_CONTRACT,
    error: "Start/Sit detail unavailable",
    code,
    message,
    action,
    ...(platform ? { platform } : {}),
  };
}

function scoringFormatFromSleeperLeague(league) {
  const rec = Number(league?.scoring_settings?.rec);
  if (rec === 0) return "standard scoring";
  if (rec === 0.5) return "0.5 PPR";
  if (rec === 1) return "1 point per reception";
  return null;
}

async function loadDetailContext(connection, userId, week, season) {
  if (connection.platform === "sleeper") {
    const league = await sleeperAdapter.fetchSleeperLeague(connection.league_id).catch(() => null);
    const roster = await sleeperAdapter.buildNormalizedRoster(
      connection.league_id, connection.platform_username, week, { season }
    );
    return { roster, leagueName: league?.name || null, scoringFormat: scoringFormatFromSleeperLeague(league) };
  }

  if (connection.platform === "espn") {
    const credentials = await getAuthenticatedEspnCredentials(userId);
    const roster = await espnAdapter.buildNormalizedRoster(
      connection.league_id, credentials.espn_s2, credentials.swid, week,
      { teamId: connection.espn_team_id }
    );
    // ESPN scoring rules are unverified, so this stays null rather than
    // defaulting to PPR — that default is the A6 defect.
    return { roster, leagueName: null, scoringFormat: null };
  }

  if (connection.platform === "yahoo") {
    const { client } = await getAuthenticatedYahooClient(userId);
    const cacheKey = `ssff:start-sit-detail:${userId}:${connection.league_id}:${week || "current"}`;
    const [roster, metadata] = await Promise.all([
      rosterSvc.fetchAndNormalizeRoster(client, connection.league_id, week, cacheKey),
      client.getLeagueMetadata(connection.league_id).catch(() => ({})),
    ]);
    return { roster, leagueName: metadata?.league_name || null, scoringFormat: null };
  }

  const err = new Error(`Unsupported platform: ${connection.platform}`);
  err.status = 400;
  throw err;
}

function parseWeek(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 18) return undefined;
  return parsed;
}

router.get("/detail", requireAuth, async (req, res, next) => {
  const week = parseWeek(req.query.week);
  if (week === undefined) {
    return res.status(400).json(detailError({
      code: "invalid_week", message: "Week must be between 1 and 18.", action: "retry",
    }));
  }

  try {
    const context = getCurrentNflWeekContext();
    const resolvedWeek = week || context.week;
    const { rows } = await readConnectionsWithSelection(supabase, req.user.id, CONNECTION_COLUMNS);
    const connection = resolveActiveConnection(rows, { isUsable: (row) => isOmenReadyConnection(row) });

    if (!connection) {
      return res.status(404).json(detailError({
        code: "no_usable_league",
        message: "Connect a league and pick a team before Omen can compare a lineup decision.",
        action: "connect",
      }));
    }

    let loaded;
    try {
      loaded = await loadDetailContext(connection, req.user.id, resolvedWeek, context.season);
    } catch (error) {
      // Never echo the provider message; it can carry credential fragments.
      logger.warn("Start/Sit detail provider read failed", {
        platform: connection.platform, status: error?.status || null,
      });
      const status = error?.status === 401 || error?.status === 403 ? 401 : 502;
      return res.status(status).json(detailError({
        code: status === 401 ? `${connection.platform}_reconnect_required` : "provider_unavailable",
        message: status === 401
          ? "Reconnect this platform so Omen can read your roster."
          : "Omen could not reach this platform. Try again shortly.",
        action: status === 401 ? "reconnect" : "retry",
        platform: connection.platform,
      }));
    }

    return res.json(buildStartSitDetail({
      roster: loaded.roster,
      platform: connection.platform,
      leagueId: connection.league_id,
      leagueName: loaded.leagueName,
      teamName: loaded.roster?.team_name || null,
      week: resolvedWeek,
      season: context.season,
      scoringFormat: loaded.scoringFormat,
      slot: req.query.slot ? String(req.query.slot) : null,
      offSeason: isOffSeason(),
    }));
  } catch (e) {
    logger.error("Start/Sit detail failed", { err: e.message });
    return next(e);
  }
});

module.exports = router;
module.exports.scoringFormatFromSleeperLeague = scoringFormatFromSleeperLeague;
