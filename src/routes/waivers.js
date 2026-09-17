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
const { getCurrentNflWeekContext, suppressLiveFootballData } = require("../services/nflSchedule");
const { isOmenReadyConnection } = require("../services/omenReadiness");
const { readConnectionsWithSelection, resolveActiveConnection } = require("../services/activeSelection");
const { buildWaiverAnalysis } = require("../services/waiverAnalysis");
const { waiverCapabilitiesEnvelope } = require("../services/waiverScoringCapabilities");
const { attachDecisionReceipt, createDecisionContext } = require("../services/decisionContext");
const waiverSystem = require("../services/waiverSystem");
const rosterSvc = require("../services/roster");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

const ERROR_CONTRACT = "waiver-analysis-error.v1";
const WAIVER_ANALYSIS_V1 = "waiver-analysis.v1";
const WAIVER_ANALYSIS_V2 = "waiver-analysis.v2";
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

// v2 is additive: v1 consumers retain their exact payload, while a caller that
// opts in receives the canonical capability record alongside the existing
// waiver decision. The wrapper never recalculates availability, bids, or
// waiver-system fields.
function presentAnalysis(analysis, contractVersion = null) {
  if (contractVersion !== WAIVER_ANALYSIS_V2) return analysis;
  const capabilityEnvelope = waiverCapabilitiesEnvelope(analysis);
  const response = {
    ...analysis,
    contract_version: WAIVER_ANALYSIS_V2,
    ...capabilityEnvelope,
  };
  // The route has already read the selected roster and evaluated this pool.
  // Emit that fact in the shared receipt without widening v1 or inferring
  // provider projection coverage from a no-move result.
  const context = createDecisionContext({ profile: "waiver" });
  context.record("selected_context", {
    state: response.platform && response.league_id ? "live" : "unavailable",
    source: "selected_platform_connection",
    ...(response.platform && response.league_id ? {} : { reason_code: "context_unavailable" }),
  });
  context.record("roster", { state: "live", source: `${response.platform}_normalized_roster` });
  const waiver = capabilityEnvelope.capabilities[0];
  context.record("waivers", {
    state: waiver?.state === "live" ? "live" : "unavailable",
    source: waiver?.source || `${response.platform}_available_players`,
    ...(waiver?.state === "live" ? {} : { reason_code: "availability_unconfirmed" }),
  });
  context.record("projections", {
    state: "unavailable",
    source: `${response.platform}_available_players`,
    reason_code: "projection_coverage_not_emitted",
  });
  if (response.best_move || response.state === "no_credible_move") {
    context.use("selected_context");
    context.use("roster");
    context.use("waivers");
  }
  return attachDecisionReceipt(response, context);
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

  // §6.2 verification. Needs the RAW roster row, not the normalized one: the
  // waiver fields live on roster.settings and normalization drops them. A
  // failure here is not_determined, never a guess — the analysis still renders.
  let system = waiverSystem.undetermined("sleeper waiver settings unavailable");
  try {
    const user = await sleeperAdapter.fetchSleeperUser(connection.platform_username);
    const raw = await sleeperAdapter.fetchSleeperRoster(connection.league_id, user.user_id);
    system = waiverSystem.fromSleeper({ league, roster: raw.roster });
  } catch (_) {
    // keep not_determined
  }

  return {
    roster,
    pool,
    waiverSystem: system,
    scoringFormat: scoringFormatFromSleeperLeague(league),
    // Sleeper's rosters endpoint is the league's own truth about who is rostered,
    // so an unrostered player really is a free agent in this league.
    availabilityConfirmed: pool != null,
    limitations: [],
  };
}

// ESPN and Yahoo have no waiver-system probe yet (spec Phase 0 is Sleeper-only,
// ESPN gated on a founder-device session and Yahoo on API reapproval). They
// return not_determined, so §6.2 stays in force for them and their advice is
// unchanged. This is deliberate, not an oversight.
const NOT_DETERMINED_PENDING_PROBE = () =>
  waiverSystem.undetermined("waiver system probe not implemented for this provider");

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

  // §6.2 verification, provisional. fromEspn() fails closed: an unrecognized
  // settings shape yields not_determined, so ESPN behaves exactly as it did
  // before until scripts/probe-espn-waiver-settings.js confirms the mapping.
  let system = NOT_DETERMINED_PENDING_PROBE();
  try {
    const data = await espnAdapter.fetchEspnApi(
      connection.league_id,
      credentials.espn_s2,
      credentials.swid,
      ["mTeam", "mSettings"],
      null
    );
    const teams = Array.isArray(data?.teams) ? data.teams : [];
    const team = connection.espn_team_id != null
      ? teams.find((t) => String(t.id) === String(connection.espn_team_id)) || null
      : null;
    system = waiverSystem.fromEspn({ settings: data?.settings, team });
  } catch (_) {
    // not_determined. A settings read must never break waiver advice.
  }

  return {
    roster,
    pool,
    // ESPN exposes no scoring-settings mapping Omen has verified, so this stays
    // null rather than defaulting to PPR — that default is the A6 defect.
    waiverSystem: system,
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

  // §6.2 verification. The priority branch is VERIFIED (2026-09-06, three real
  // leagues); the FAAB branch is not — no Yahoo FAAB league was available to
  // read, so fromYahoo() returns not_determined for one and it shows nothing.
  let system = NOT_DETERMINED_PENDING_PROBE();
  try {
    const rawSettings = await client.getLeagueSettings(connection.league_id);
    const myTeamKey = await client.getMyTeamKey(connection.league_id).catch(() => null);
    system = waiverSystem.fromYahoo({
      // Pass the WHOLE league payload: the settings container is not league[0].
      settings: rawSettings,
      team: myTeamKey ? await client.get(`/team/${myTeamKey}`)
        .then((d) => d?.fantasy_content?.team?.[0] ?? null)
        .catch(() => null) : null,
    });
  } catch (_) {
    // not_determined. A settings read must never break waiver advice.
  }

  return {
    roster,
    pool,
    waiverSystem: system,
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
  const requestedContract = req.query.contract_version;
  if (requestedContract != null && ![WAIVER_ANALYSIS_V1, WAIVER_ANALYSIS_V2].includes(requestedContract)) {
    return res.status(400).json(errorBody({
      code: "unsupported_waiver_analysis_contract",
      message: "This version of waiver analysis is not supported.",
      action: "retry",
    }));
  }
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
      waiverSystem: loaded.waiverSystem || null,
      deadline: null,
      offSeason: suppressLiveFootballData(),
    });

    return res.json(presentAnalysis({ ...analysis, limitations: loaded.limitations }, requestedContract));
  } catch (e) {
    logger.error("Waiver analysis failed", { err: e.message });
    return next(e);
  }
});

module.exports = router;
module.exports.scoringFormatFromSleeperLeague = scoringFormatFromSleeperLeague;
module.exports.presentAnalysis = presentAnalysis;
