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
const { Pool } = require("pg");
const config = require("../config");
const { logger } = require("../middleware/logging");
const { requireAuth } = require("../middleware/auth");
const rosterSvc = require("../services/roster");
const { getAuthenticatedYahooClient } = require("../services/yahooAuth");
const { getAuthenticatedEspnCredentials } = require("../services/espnAuth");
const { getCurrentNflWeekContext, suppressLiveFootballData } = require("../services/nflSchedule");
const { isOmenReadyConnection } = require("../services/omenReadiness");
const { readConnectionsWithSelection, resolveActiveConnection } = require("../services/activeSelection");
const {
  CONTRACT_VERSION,
  CONTRACT_VERSION_V2,
  buildStartSitDetail,
} = require("../services/startSitDetail");
const { getUsageBundle } = require("../services/playerUsage");
const { createWarehouseReadRuntime } = require("../services/footballWarehouse/readRuntime");
const { createUsageShadowRunner } = require("../services/footballWarehouse/usageShadow");
const { getWarehouseUsageBundle } = require("../services/footballWarehouse/warehouseUsageBundle");
const { getTeamSystemSummaries } = require("../services/footballIntelligence/teamSystemLines");
const { rosterProjectionBreakdowns } = require("../services/projectionBreakdown");
const { withinLatencyBudget } = require("../services/latencyBudget");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");

const router = express.Router();

// The points breakdown is advisory; its extra reads never hold the route longer than this.
const PROJECTION_BREAKDOWN_BUDGET_MS = 2500;
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const warehouseUsageRuntime = createWarehouseReadRuntime({ Pool });
const usageReader = createUsageShadowRunner({
  readLegacy: (input) => getUsageBundle(input),
  readWarehouse: (input) => getWarehouseUsageBundle({
    ...input, repository: warehouseUsageRuntime.repository,
  }),
  emitTelemetry: (event) => logger.info("Football warehouse usage shadow", event),
});

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
    return {
      roster,
      leagueName: league?.name || null,
      scoringFormat: scoringFormatFromSleeperLeague(league),
      // In memory only, for the points breakdown; never stored (projection explainer spec).
      sleeperScoringSettings: league?.scoring_settings || null,
    };
  }

  if (connection.platform === "espn") {
    const credentials = await getAuthenticatedEspnCredentials(userId);
    const [{ roster, projectionLines }, espnRules] = await Promise.all([
      espnAdapter.buildNormalizedRosterWithProjectionLines(
        connection.league_id, credentials.espn_s2, credentials.swid, week,
        { teamId: connection.espn_team_id }
      ),
      // Only the points breakdown reads these rules. A slow or failed read costs that line,
      // never the roster.
      suppressLiveFootballData()
        ? null
        : withinLatencyBudget("start_sit_espn_scoring", PROJECTION_BREAKDOWN_BUDGET_MS, () =>
          espnAdapter.fetchEspnScoringSettings(connection.league_id, credentials.espn_s2, credentials.swid)
        ).catch(() => null),
    ]);
    // ESPN scoring rules are unverified, so this stays null rather than
    // defaulting to PPR — that default is the A6 defect.
    return { roster, leagueName: null, scoringFormat: null, espnProjectionLines: projectionLines, espnRules };
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

/**
 * `player_key -> breakdown` for the projection explainer (layer 1), or null when it could not
 * be computed. Advisory: any failure is logged without provider detail and costs only the
 * breakdown rows, never the route.
 */
async function loadProjectionBreakdowns({ connection, loaded, season, week }) {
  try {
    if (connection.platform === "sleeper") {
      const statLines = await withinLatencyBudget("start_sit_projection_stat_lines", PROJECTION_BREAKDOWN_BUDGET_MS, () =>
        sleeperAdapter.fetchSleeperProjectionStatLines(season, week));
      return rosterProjectionBreakdowns({
        platform: "sleeper",
        roster: loaded.roster,
        sleeper: { statLines, scoringSettings: loaded.sleeperScoringSettings },
      });
    }
    if (connection.platform === "espn") {
      return rosterProjectionBreakdowns({
        platform: "espn",
        roster: loaded.roster,
        espn: { projections: loaded.espnProjectionLines, rules: loaded.espnRules },
      });
    }
    return rosterProjectionBreakdowns({ platform: connection.platform, roster: loaded.roster });
  } catch (error) {
    logger.warn("Start/Sit projection breakdown unavailable", {
      platform: connection.platform, status: error?.status || null,
    });
    return null;
  }
}

function parseWeek(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 18) return undefined;
  return parsed;
}

function parseContractVersion(value) {
  if (value == null || value === "") return CONTRACT_VERSION;
  return [CONTRACT_VERSION, CONTRACT_VERSION_V2].includes(value) ? value : undefined;
}

router.get("/detail", requireAuth, async (req, res, next) => {
  const week = parseWeek(req.query.week);
  if (week === undefined) {
    return res.status(400).json(detailError({
      code: "invalid_week", message: "Week must be between 1 and 18.", action: "retry",
    }));
  }
  const contractVersion = parseContractVersion(req.query.contract_version);
  if (contractVersion === undefined) {
    return res.status(400).json(detailError({
      code: "unsupported_contract_version",
      message: "This Start/Sit contract version is not supported by Omen.",
      action: "retry",
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

    const rosterKeys = [...(loaded.roster?.slots?.starters || []), ...(loaded.roster?.slots?.bench || [])]
      .map((player) => player?.player_key).filter(Boolean);
    const rosterTeams = [...(loaded.roster?.slots?.starters || []), ...(loaded.roster?.slots?.bench || [])]
      .map((player) => player?.team).filter(Boolean);
    // One usage read yields both the summaries and the per-week rows (signal vs noise), so the second
    // costs no extra round trip; any failure is empty maps and the response is unchanged.
    const [{ usage, weekly: weeklyUsage }, teamSystem] = suppressLiveFootballData()
      ? [{ usage: new Map(), weekly: new Map() }, new Map()]
      : await Promise.all([
        usageReader.read({
          mode: warehouseUsageRuntime.mode,
          input: {
            supabase,
            playerKeys: rosterKeys,
            season: Number(context.season),
            beforeWeek: Number(resolvedWeek),
            log: logger,
          },
        }),
        getTeamSystemSummaries({ supabase, teams: rosterTeams, season: Number(context.season), log: logger }),
      ]);
    const breakdowns = suppressLiveFootballData()
      ? null
      : await loadProjectionBreakdowns({ connection, loaded, season: Number(context.season), week: Number(resolvedWeek) });

    return res.json(buildStartSitDetail({
      usage,
      weeklyUsage,
      teamSystem,
      breakdowns,
      roster: loaded.roster,
      platform: connection.platform,
      leagueId: connection.league_id,
      leagueName: loaded.leagueName,
      teamName: loaded.roster?.team_name || null,
      week: resolvedWeek,
      season: context.season,
      scoringFormat: loaded.scoringFormat,
      slot: req.query.slot ? String(req.query.slot) : null,
      offSeason: suppressLiveFootballData(),
      contractVersion,
    }));
  } catch (e) {
    logger.error("Start/Sit detail failed", { err: e.message });
    return next(e);
  }
});

module.exports = router;
module.exports.scoringFormatFromSleeperLeague = scoringFormatFromSleeperLeague;
module.exports.closeWarehouseUsageRuntime = () => warehouseUsageRuntime.close();
