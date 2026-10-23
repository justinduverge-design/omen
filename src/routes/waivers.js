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
const { createWaiverUsageEnricher } = require("../services/waiverUsageEvidence");
const { createSightEnricher } = require("../services/sightEnrichment");
const { getRuntime: getWarehouseRuntime } = require("../services/footballWarehouse/sharedUsageAccess");
const { waiverCapabilitiesEnvelope } = require("../services/waiverScoringCapabilities");
const { attachDecisionReceipt, createDecisionContext } = require("../services/decisionContext");
const waiverSystem = require("../services/waiverSystem");
const rosterSvc = require("../services/roster");
const { projectYahooPool } = require("../services/yahooProjections");
const responseCache = require("../services/responseCache");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");

const router = express.Router();
// Request-scoped Sleeper read memo: repeated GETs of one URL inside a request collapse to one.
router.use(require("../services/sleeperRequestScope").middleware);
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

// Adds a usage-based reason to the recommended add from warehouse opportunity counts. A no-op in
// `supabase` mode and on any warehouse failure or timeout (the analysis is returned unchanged).
const enrichWithUsage = createWaiverUsageEnricher({
  getRuntime: () => getWarehouseRuntime({ logger }),
  supabase,
  log: logger,
});

// Sight on every player in the waiver answer, behind SIGHT_ENABLED.
const attachSight = createSightEnricher({ getRuntime: () => getWarehouseRuntime({ logger }), log: logger });

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
  // The stages are independent. The request-scoped memo makes the shared league,
  // rosters, users and user reads happen once however many stages ask for them.
  // The roster read is the only stage whose failure fails the load, as before.
  const leaguePromise = sleeperAdapter.fetchSleeperLeague(connection.league_id).catch(() => null);
  const rosterPromise = sleeperAdapter.buildNormalizedRoster(connection.league_id, connection.platform_username, week, {
    season,
  });
  const poolPromise = sleeperAdapter
    .fetchSleeperAvailablePlayers(connection.league_id, week, String(season))
    .catch(() => null);
  // §6.2 verification. Needs the RAW roster row, not the normalized one: the
  // waiver fields live on roster.settings and normalization drops them. A
  // failure here is not_determined, never a guess — the analysis still renders.
  const systemPromise = (async () => {
    try {
      const user = await sleeperAdapter.fetchSleeperUser(connection.platform_username);
      const [league, raw] = await Promise.all([
        leaguePromise,
        sleeperAdapter.fetchSleeperRoster(connection.league_id, user.user_id),
      ]);
      return waiverSystem.fromSleeper({ league, roster: raw.roster });
    } catch (_) {
      return waiverSystem.undetermined("sleeper waiver settings unavailable");
    }
  })();

  const [league, roster, pool, system] = await Promise.all([leaguePromise, rosterPromise, poolPromise, systemPromise]);

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
  // Roster, pool and settings are independent ESPN reads: run them together.
  const rosterRead = espnAdapter.buildNormalizedRoster(
    connection.league_id,
    credentials.espn_s2,
    credentials.swid,
    week,
    { teamId: connection.espn_team_id },
  );
  const poolRead = espnAdapter
    .fetchEspnWaiverPool(connection.league_id, credentials.espn_s2, credentials.swid, week)
    .catch(() => null);

  // §6.2 verification, provisional. fromEspn() fails closed: an unrecognized
  // settings shape yields not_determined, so ESPN behaves exactly as it did
  // before until scripts/probe-espn-waiver-settings.js confirms the mapping.
  const systemRead = (async () => {
    try {
      const data = await espnAdapter.fetchEspnApi(
        connection.league_id,
        credentials.espn_s2,
        credentials.swid,
        ["mTeam", "mSettings"],
        null,
      );
      const teams = Array.isArray(data?.teams) ? data.teams : [];
      const team =
        connection.espn_team_id != null
          ? teams.find((t) => String(t.id) === String(connection.espn_team_id)) || null
          : null;
      return waiverSystem.fromEspn({ settings: data?.settings, team });
    } catch (_) {
      // not_determined. A settings read must never break waiver advice.
      return NOT_DETERMINED_PENDING_PROBE();
    }
  })();
  // A rules read must never break waiver advice, even a synchronous throw.
  const rulesRead = Promise.resolve()
    .then(() => espnAdapter.fetchEspnScoringSettings(connection.league_id, credentials.espn_s2, credentials.swid))
    .catch(() => null);
  const [roster, pool, system, rules] = await Promise.all([rosterRead, poolRead, systemRead, rulesRead]);

  // ESPN's projected points are its own appliedTotal, already scored by this league's rules. Reading
  // the rules confirms that; without them the evidence still says so. scoringFormat stays null rather
  // than a PPR guess (the A6 defect).
  const rulesVerified = rules?.ruleCount > 0;
  return {
    roster,
    pool,
    waiverSystem: system,
    scoringFormat: null,
    availabilityConfirmed: pool != null,
    limitations:
      pool == null
        ? []
        : rulesVerified
          ? ["Projections are ESPN's own, scored with this league's rules."]
          : ["Omen has not verified this league's scoring rules, so evidence omits league scoring."],
  };
}

function yahooWaiverLimitations(meta) {
  if (!meta?.available) {
    return [
      "Yahoo's available-player response carries no weekly projection and Omen could not build one from Sleeper's public projections, so it cannot rank waiver adds for this league.",
    ];
  }
  const notes = [
    "Projections are Sleeper's public weekly projections, re-scored with this Yahoo league's rules; Yahoo does not publish player projections.",
  ];
  if (meta.scoring_basis === "approximate_scoring") {
    notes.push(
      "This league has scoring rules Omen cannot reproduce, so these point totals are approximate, not exact league scoring.",
    );
  }
  return notes;
}

// §6.2 verification. The priority branch is VERIFIED (2026-09-06, three real
// leagues); the FAAB branch is not — no Yahoo FAAB league was available to
// read, so fromYahoo() returns not_determined for one and it shows nothing.
async function readYahooWaiverSystem(client, leagueId) {
  try {
    const [rawSettings, myTeamKey] = await Promise.all([
      client.getLeagueSettings(leagueId),
      client.getMyTeamKey(leagueId).catch(() => null),
    ]);
    return waiverSystem.fromYahoo({
      // Pass the WHOLE league payload: the settings container is not league[0].
      settings: rawSettings,
      team: myTeamKey
        ? await client
            .get(`/team/${myTeamKey}`)
            .then((d) => d?.fantasy_content?.team?.[0] ?? null)
            .catch(() => null)
        : null,
    });
  } catch (_) {
    // not_determined. A settings read must never break waiver advice.
    return NOT_DETERMINED_PENDING_PROBE();
  }
}

// Yahoo's own ceiling per status (four pages of 25); the top 50 left useful adds out.
const YAHOO_POOL_COUNT = 100;

async function loadYahoo(connection, userId, week) {
  const { client } = await getAuthenticatedYahooClient(userId);
  // The waiver-system read needs neither roster nor pool: start it now, await it last.
  const systemRead = readYahooWaiverSystem(client, connection.league_id);
  const cacheKey = `ssff:waiver-analysis:${userId}:${connection.league_id}:${week || "current"}`;
  const roster = await rosterSvc.fetchAndNormalizeRoster(client, connection.league_id, week, cacheKey);

  let pool = null;
  let poolProjection = null;
  let poolStatusSplit = null;
  try {
    // G6: the pool is read as free agents and waivers separately, with percent owned, so a claim is
    // never judged as a free add (founder cases, 2026-10-23). YAHOO_POOL_STATUS_SPLIT=0 turns it off;
    // any failure or partial read falls back to the single status=A read below.
    let normalizedPool = null;
    if (process.env.YAHOO_POOL_STATUS_SPLIT !== "0" && typeof client.getAvailablePlayerPool === "function") {
      try {
        const split = await client.getAvailablePlayerPool(connection.league_id, {
          count: YAHOO_POOL_COUNT,
          sort: "AR",
        });
        if (split.pages.length && !split.failed.length) {
          normalizedPool = rosterSvc.normalizeYahooPool(split);
          poolStatusSplit = { truncated: Boolean(split.truncated) };
        }
      } catch {
        normalizedPool = null;
      }
    }
    if (!normalizedPool) {
      const raw = await client.getAvailablePlayers(connection.league_id, { count: YAHOO_POOL_COUNT, sort: "AR" });
      normalizedPool = rosterSvc.normalizeYahooWaivers(raw);
    }
    ({ pool, projectionMeta: poolProjection } = await projectYahooPool(
      client,
      connection.league_id,
      roster.week,
      normalizedPool,
      { rosterMeta: roster.projection_meta },
    ));
  } catch {
    pool = null;
  }

  const system = await systemRead;

  return {
    roster,
    pool,
    waiverSystem: system,
    scoringFormat: null,
    // Yahoo's /players;status=A is Yahoo's own list of this league's free agents but carries no
    // projection. Projections come from Sleeper's public stat lines scored with this league's rules
    // (yahooProjections.js). Without them no candidate is evidence-backed, and availability alone is
    // not enough to rank a §6 recommendation, so it stays unconfirmed and says so.
    availabilityConfirmed: pool != null && poolProjection?.available === true,
    limitations: [
      ...yahooWaiverLimitations(poolProjection),
      ...(poolStatusSplit
        ? [
            poolStatusSplit.truncated
              ? "Free agents and players on waivers were read separately; this is the top of the pool by Yahoo's average rank, not every available player."
              : "Free agents and players on waivers were read separately.",
          ]
        : []),
    ],
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
    return res.status(400).json(
      errorBody({
        code: "unsupported_waiver_analysis_contract",
        message: "This version of waiver analysis is not supported.",
        action: "retry",
      }),
    );
  }
  const requestedWeek = parseWeek(req.query.week);
  if (requestedWeek === undefined) {
    return res.status(400).json(
      errorBody({
        code: "invalid_week",
        message: "Week must be between 1 and 18.",
        action: "retry",
      }),
    );
  }

  try {
    const context = getCurrentNflWeekContext();
    const week = requestedWeek || context.week;
    const { rows } = await readConnectionsWithSelection(supabase, req.user.id, CONNECTION_COLUMNS);
    const connection = resolveActiveConnection(rows, { isUsable: (row) => isOmenReadyConnection(row) });

    if (!connection) {
      return res.status(404).json(
        errorBody({
          code: "no_usable_league",
          message: "Connect a league and pick a team before Omen can analyse waivers.",
          action: "connect",
        }),
      );
    }

    // Short per-user response cache. The key carries the resolved connection
    // (platform, league, ESPN team) as well as the week and contract, so a
    // league switch can never be answered from the previous league's entry.
    const cacheHandle = await responseCache.lookup({
      route: "waiver_analysis",
      userId: req.user.id,
      parts: {
        platform: connection.platform,
        league_id: String(connection.league_id),
        team_id: connection.espn_team_id == null ? null : String(connection.espn_team_id),
        selected: Boolean(connection.is_selected),
        week,
        season: context.season,
        contract_version: requestedContract ?? null,
      },
    });
    if (cacheHandle.hit) return responseCache.sendHit(res, cacheHandle);
    responseCache.setCacheHeader(res, cacheHandle);

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
      return res.status(status).json(
        errorBody({
          code: status === 401 ? `${connection.platform}_reconnect_required` : "provider_unavailable",
          message:
            status === 401
              ? "Reconnect this platform so Omen can read your roster."
              : "Omen could not reach this platform. Try again shortly.",
          action: status === 401 ? "reconnect" : "retry",
          platform: connection.platform,
        }),
      );
    }

    // Sight first, so the decision itself weighs Omen's read (not just the display).
    await attachSight({ roster: loaded.roster, pool: loaded.pool });
    const baseAnalysis = buildWaiverAnalysis({
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
    const analysis = await enrichWithUsage(baseAnalysis);

    const payload = presentAnalysis({ ...analysis, limitations: loaded.limitations }, requestedContract);
    await attachSight(payload);
    // Only a confirmed analysis is kept. availability_unknown / engine_limitation
    // mean a provider could not confirm the pool, which the user may fix or retry.
    await responseCache.store(cacheHandle, 200, payload, {
      cache:
        !responseCache.isActionState(analysis) &&
        ["confirmed_opportunity", "no_low_cost_drop", "no_credible_move"].includes(analysis.state),
    });
    return res.json(payload);
  } catch (e) {
    logger.error("Waiver analysis failed", { err: e.message });
    return next(e);
  }
});

module.exports = router;
module.exports.scoringFormatFromSleeperLeague = scoringFormatFromSleeperLeague;
module.exports.presentAnalysis = presentAnalysis;
// For evals/decision-cases/capture-server.js: the same roster and free-agent reads the waiver route makes.
module.exports.loadForConnection = loadForConnection;
module.exports.CONNECTION_COLUMNS = CONNECTION_COLUMNS;
