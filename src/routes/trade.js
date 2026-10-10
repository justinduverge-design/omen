"use strict";

const crypto = require("node:crypto");
const express = require("express");
const { Redis } = require("@upstash/redis");
const config = require("../config");
const llm = require("../services/llm");
const { buildLiveAdpResponse } = require("../services/adp");
const {
  DEFAULT_SHARE_TTL_SECONDS,
  createDefaultTradeShareStore,
} = require("../services/tradeShareStore");
const { buildTradeShareOgSvg } = require("../services/tradeShareOg");
const { compareTrade } = require("../services/tradeValue");
const { resolveNflPlayerInputs } = require("../services/playerSearch");
const { withWarehouseIdentityFallback } = require("../services/tradePlayerIdentity");
const { createFailSafeWarehouseReadRuntime } = require("../services/footballWarehouse/readRuntime");
const { resolveTradeLeagueContext } = require("../services/tradeLeagueContext");
const { createDefaultTradeSavedQueueStore } = require("../services/tradeSavedQueueStore");
const { createSupabaseSavedTradesStore } = require("../services/savedTradesStore");
const {
  VALID_OUTCOME_SET,
  currentNeedFor,
  staleness: computeStaleness,
} = require("../services/tradeSavedQueue");
const { findLeagueTradeCandidates, MAX_OPPONENT_TEAMS_PER_SCAN, MAX_CANDIDATES_RETURNED } = require("../services/tradeFind");
const { createSearchBudget } = require("../services/tradeLineup");
const {
  DEFAULT_FIND_CACHE_TTL_SECONDS,
  createDefaultTradeFindCache,
} = require("../services/tradeFindCacheStore");
const { authenticateOmenRequest, getActivePlatformConnections } = require("../services/omen");
const { getCurrentNflWeekContext } = require("../services/nflSchedule");
const { logger } = require("../middleware/logging");
const { attachDecisionReceipt, createDecisionContext } = require("../services/decisionContext");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");
const yahooAdapter = require("../adapters/yahoo");
const { getAuthenticatedEspnCredentials } = require("../services/espnAuth");
const { getAuthenticatedYahooClient } = require("../services/yahooAuth");

const MAX_PLAYERS_PER_SIDE = 10;
const MAX_SHARE_PAYLOAD_BYTES = 16 * 1024;
const TRADE_SHARE_CONTRACT = "trade-share.v1";
// Additive. v1 consumers (web Trade Analyzer, trade-share.v1 snapshots) keep
// reading `verdict`; v2 clients read `verdict_state`, which is the only field
// carrying the four approved verdict labels.
const TRADE_COMPARE_CONTRACT = "trade-compare.v2";
const TRADE_FIND_CONTRACT = "trade-find.v1";
const VALID_CONTEXT_PLATFORMS = new Set(["yahoo", "sleeper", "espn"]);
const MAX_LEAGUE_ID_LENGTH = 64;
const TRADE_SAVED_QUEUE_CONTRACT = "trade-saved-queue.v1";
const MAX_CANDIDATE_ID_LENGTH = 200;
// Same posture as MAX_SHARE_PAYLOAD_BYTES — a guardrail against abuse, not a
// realistic ceiling for a reasoning payload this shape (a handful of short
// strings and two small need objects).
const MAX_SAVED_REASONING_BYTES = 16 * 1024;

// T1 — three-team trade capability (omen-trade-rework-v1.md). Beta's ceiling per the workshop's
// locked decision: "Beta supports two-team and three-team trades; three is the maximum." A
// three-team deal is expressed as `legs` — literal player transfers between named teams — rather
// than a generic N-sided payload, because (a) the native artboards already model a leg exactly
// this way (`OmenTradeLeg`: direction + "RB · IND → Davante's"), and (b) the split-submission
// copy this shape must produce needs to know *which* players move *where*, not just each
// participant's aggregate gain/loss.
const THREE_TEAM_COUNT = 3;
const MIN_THREE_TEAM_LEGS = 2;
const MAX_THREE_TEAM_LEGS = 6;

// Approved verdict vocabulary (visual briefs §9.2). The shipped three-value
// enum maps onto the first three; the fourth is reachable only through the
// evaluability signal and never by inference on the client.
const VERDICT_STATE_BY_VERDICT = Object.freeze({
  accept: "favors_you",
  decline: "you_give_up_too_much",
  neutral: "close_needs_context",
});
const VERDICT_STATE_INSUFFICIENT = "insufficient_data";
const VALID_SCORING_FORMATS = new Set(["ppr", "half_ppr", "standard"]);
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SENSITIVE_FIELD_RE = /(cookie|espn_s2|swid|token|secret|authorization|password)/i;
const tradePulseRedis = config.isProd && config.redisUrl && config.redisToken
  ? new Redis({ url: config.redisUrl, token: config.redisToken })
  : null;

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function validatePlayers(players, side) {
  if (!Array.isArray(players) || players.length === 0) {
    return `${side} must be a non-empty array`;
  }
  // Product guardrail: cap comparison size until abuse limits and UX are clearer.
  if (players.length > MAX_PLAYERS_PER_SIDE) {
    return `${side} may contain 1-10 players`;
  }

  for (const player of players) {
    if (!isPlainObject(player)) {
      return "each player must be an object";
    }
    if (
      Object.prototype.hasOwnProperty.call(player, "projected_points")
      && !Number.isFinite(Number(player.projected_points))
    ) {
      return "projected_points must be a number";
    }
  }

  return null;
}

function validateTradePayload(body = {}) {
  if (
    body.scoring_format != null
    && !VALID_SCORING_FORMATS.has(String(body.scoring_format))
  ) {
    return "scoring_format must be one of ppr, half_ppr, standard";
  }

  const sendError = validatePlayers(body.send, "send");
  if (sendError) return sendError;

  const receiveError = validatePlayers(body.receive, "receive");
  if (receiveError) return receiveError;

  return null;
}

/**
 * `league_context` is a request for personalization, not the data itself.
 * The client may name which connected league to use; it may never supply the
 * roster, scoring rules, or settings — those are read server-side from the
 * user's own stored connection.
 */
function validateLeagueContext(body = {}) {
  const context = body.league_context;
  if (context == null) return null;
  if (!isPlainObject(context)) {
    return "league_context must be an object";
  }
  if (
    context.platform != null
    && !VALID_CONTEXT_PLATFORMS.has(String(context.platform).toLowerCase())
  ) {
    return "league_context.platform must be one of yahoo, sleeper, espn";
  }
  if (context.league_id != null && String(context.league_id).length > MAX_LEAGUE_ID_LENGTH) {
    return "league_context.league_id is too long";
  }
  return null;
}

/**
 * One player transfer between two named teams — the unit a three-team trade is built from.
 * `from`/`to` are caller-chosen opaque ids (a roster/team id, or just "you"); `from_name`/
 * `to_name` are optional display names carried through to the submission copy.
 */
function validateLeg(leg, index) {
  if (!isPlainObject(leg)) {
    return `legs[${index}] must be an object`;
  }
  if (typeof leg.from !== "string" || !leg.from.trim()) {
    return `legs[${index}].from is required`;
  }
  if (typeof leg.to !== "string" || !leg.to.trim()) {
    return `legs[${index}].to is required`;
  }
  if (leg.from === leg.to) {
    return `legs[${index}].from and legs[${index}].to must be different teams`;
  }
  if (leg.from_name != null && typeof leg.from_name !== "string") {
    return `legs[${index}].from_name must be a string`;
  }
  if (leg.to_name != null && typeof leg.to_name !== "string") {
    return `legs[${index}].to_name must be a string`;
  }
  return validatePlayers(leg.players, `legs[${index}].players`);
}

function validateLegs(legs) {
  if (!Array.isArray(legs) || legs.length < MIN_THREE_TEAM_LEGS) {
    return `legs must be an array of at least ${MIN_THREE_TEAM_LEGS} transfers`;
  }
  if (legs.length > MAX_THREE_TEAM_LEGS) {
    return `legs may contain at most ${MAX_THREE_TEAM_LEGS} transfers`;
  }
  for (let index = 0; index < legs.length; index += 1) {
    const error = validateLeg(legs[index], index);
    if (error) return error;
  }
  return null;
}

function uniqueTeamIdsFromLegs(legs) {
  const ids = [];
  for (const leg of legs) {
    if (!ids.includes(leg.from)) ids.push(leg.from);
    if (!ids.includes(leg.to)) ids.push(leg.to);
  }
  return ids;
}

function teamNamesFromLegs(legs) {
  const names = {};
  for (const leg of legs) {
    if (leg.from_name && !names[leg.from]) names[leg.from] = leg.from_name;
    if (leg.to_name && !names[leg.to]) names[leg.to] = leg.to_name;
  }
  return names;
}

/**
 * Bounded to three qualitative labels — never a fabricated percentage. Derived transparently
 * from the same `verdict_state` the screen already shows for that participant: a deal that
 * favors them is one they are more likely to accept, and the reverse.
 */
function acceptanceLikelihoodFor(verdictState) {
  switch (verdictState) {
    case "favors_you": return "likely";
    case "you_give_up_too_much": return "unlikely";
    case "close_needs_context": return "uncertain";
    default: return "uncertain";
  }
}

/**
 * Same shape as `evaluabilityFor`, summed across every participant's own evaluability rather
 * than a single send/receive pair. Insufficient anywhere means the trade as a whole cannot
 * responsibly receive a verdict — the same "do not force a verdict" rule `evaluabilityFor`
 * already applies to a two-team offer.
 */
function overallEvaluabilityAcrossParticipants(evaluabilities) {
  const missing = evaluabilities.reduce((sum, e) => sum + Number(e.missing_projection_count || 0), 0);
  const total = evaluabilities.reduce((sum, e) => sum + Number(e.total_player_count || 0), 0);

  if (!total) {
    return {
      status: "insufficient_data", reason: "no_players",
      missing_projection_count: 0, total_player_count: 0,
    };
  }
  if (missing > 0) {
    return {
      status: "insufficient_data", reason: "missing_projections",
      missing_projection_count: missing, total_player_count: total,
    };
  }
  return {
    status: "evaluable", reason: null,
    missing_projection_count: 0, total_player_count: total,
  };
}

/**
 * No connected provider (ESPN, Yahoo, Sleeper) publishes a three-team write API — the workshop's
 * locked fact, restated by `trade-capabilities.v1`'s `submission: "handoff_only"`. A three-team
 * deal is therefore always assembled as linked two-team handoffs, submitted in the order the
 * caller gave the legs. This states the mechanical fact and the concrete, data-derived order —
 * it never guesses which leg is "riskiest" or otherwise invents a judgment the engine has no
 * evidence for.
 */
function buildThreeTeamSubmission(resolvedLegs, teamNames) {
  const nameFor = (teamId) => teamNames[teamId] || teamId;
  const steps = resolvedLegs.map((leg, index) => {
    const players = leg.players.map((player) => player.name).join(", ");
    const contingency = index === 0 ? "" : ` Make it contingent on leg ${index} completing first.`;
    return `Leg ${index + 1}: send ${players} from ${nameFor(leg.from)} to ${nameFor(leg.to)}.${contingency}`;
  });

  return {
    mode: "split_handoff",
    reason: "no_connected_provider_publishes_a_three_team_write_api",
    caption: "No provider builds a three-team trade natively. Submit it as linked two-team trades, in this order.",
    steps,
  };
}

/**
 * Can Omen responsibly evaluate this offer at all?
 *
 * Visual briefs §9.4: "Incomplete player data — name incomplete input; do not
 * force verdict." A missing projection means one side's value is unknown, so
 * the comparison is reported as non-evaluable rather than dressed up as a
 * verdict. Derived from the same missing_projection_count the engine already
 * emits, per the founder decision of 2026-08-16.
 */
function evaluabilityFor(result) {
  const missing = Number(result?.send?.missing_projection_count || 0)
    + Number(result?.receive?.missing_projection_count || 0);
  const total = Number(result?.send?.player_count || 0)
    + Number(result?.receive?.player_count || 0);

  if (!total) {
    return {
      status: "insufficient_data",
      reason: "no_players",
      missing_projection_count: 0,
      total_player_count: 0,
    };
  }
  if (missing > 0) {
    return {
      status: "insufficient_data",
      reason: "missing_projections",
      missing_projection_count: missing,
      total_player_count: total,
    };
  }
  return {
    status: "evaluable",
    reason: null,
    missing_projection_count: 0,
    total_player_count: total,
  };
}

function verdictStateFor(result, evaluability) {
  if (evaluability.status === "insufficient_data") return VERDICT_STATE_INSUFFICIENT;
  return VERDICT_STATE_BY_VERDICT[result?.verdict] || "close_needs_context";
}

function neutralAnalysisContext(reason = null) {
  return {
    mode: "neutral",
    platform: null,
    league_id: null,
    league_name: null,
    applied: [],
    unavailable_reason: reason,
  };
}

// Identity-only warehouse reader (provider id -> Omen player). Built lazily on first use so importing
// this module never opens a pool, and any configuration problem degrades to the legacy resolver.
let tradeWarehouseRuntime;
function getTradeWarehouseRuntime() {
  if (tradeWarehouseRuntime !== undefined) return tradeWarehouseRuntime;
  try {
    tradeWarehouseRuntime = createFailSafeWarehouseReadRuntime({
      Pool: require("pg").Pool,
      onShadowUnavailable: (event) => logger.warn("Football warehouse reader unavailable", event),
    });
  } catch (error) {
    logger.warn("Trade warehouse identity disabled", { event: "trade_identity_startup", outcome: "unavailable" });
    tradeWarehouseRuntime = null;
  }
  return tradeWarehouseRuntime;
}

const defaultPlayerResolver = withWarehouseIdentityFallback(
  (players) => resolveNflPlayerInputs(players, { fetchPlayers: sleeperAdapter.fetchSleeperPlayers }),
  { getRuntime: getTradeWarehouseRuntime, logger },
);

function resolvedTradePlayers(inputs, resolutions) {
  return inputs.map((input, index) => {
    const canonical = resolutions[index].player;
    const out = {
      name: canonical.name,
      position: canonical.position,
      team: canonical.team,
      player_key: canonical.id,
    };
    if (Object.prototype.hasOwnProperty.call(input, "projected_points")) {
      out.projected_points = Number(input.projected_points);
    } else if (canonical.projected_points != null) {
      out.projected_points = canonical.projected_points;
    }
    if (input.status != null) out.status = input.status;
    return out;
  });
}

function unresolvedPlayersFor(side, inputs, resolutions) {
  const unresolved = [];
  resolutions.forEach((resolution, index) => {
    if (resolution.status === "resolved") return;
    unresolved.push({
      side,
      index,
      name: String(inputs[index]?.name || "").trim(),
      reason: resolution.status,
      suggestions: resolution.suggestions,
    });
  });
  return unresolved;
}

/**
 * Default personalization resolver: reads the caller's own connections and
 * the provider's league settings. Injected in tests so the maths is provable
 * without a network call.
 */
async function defaultLeagueContextResolver({ userId, platform, leagueId }) {
  return resolveTradeLeagueContext({
    userId,
    platform,
    leagueId,
    deps: {
      getConnections: getActivePlatformConnections,
      fetchSleeperLeague: (id) => sleeperAdapter.fetchSleeperLeague(id),
      buildSleeperRoster: async (id, username, league) => {
        const context = getCurrentNflWeekContext();
        const normalized = await sleeperAdapter.buildNormalizedRoster(
          id,
          username,
          context.week,
          { season: league?.season || context.season }
        );
        const slots = normalized?.slots || {};
        return [
          ...(slots.starters || []),
          ...(slots.bench || []),
          ...(slots.ir || []),
        ];
      },
      logger,
    },
  });
}

function jsonByteLength(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? {}), "utf8");
  } catch {
    return Infinity;
  }
}

function containsSensitiveField(value) {
  if (Array.isArray(value)) {
    return value.some((item) => containsSensitiveField(item));
  }
  if (!isPlainObject(value)) return false;

  return Object.entries(value).some(([key, nested]) => (
    SENSITIVE_FIELD_RE.test(key) || containsSensitiveField(nested)
  ));
}

function truncateString(value, maxLength) {
  const text = String(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function sanitizePlayer(player = {}) {
  const clean = {
    name: truncateString(player.name || "Unknown", 120),
    position: truncateString(player.position || "UNK", 16),
  };

  if (player.team != null) clean.team = truncateString(player.team, 16);
  if (player.status != null) clean.status = truncateString(player.status, 40);
  if (player.player_key != null) clean.player_key = truncateString(player.player_key, 160);

  const projected = Number(player.projected_points);
  if (Number.isFinite(projected)) {
    clean.projected_points = projected;
  }

  return clean;
}

function validateTradeSharePayload(body = {}) {
  if (!isPlainObject(body)) {
    return { status: 400, error: "trade_share_body_required" };
  }
  if (jsonByteLength(body) > MAX_SHARE_PAYLOAD_BYTES) {
    return { status: 413, error: "trade_share_payload_too_large" };
  }
  if (containsSensitiveField(body)) {
    return { status: 400, error: "trade_share_sensitive_field" };
  }

  const tradeError = validateTradePayload(body);
  return tradeError ? { status: 400, error: tradeError } : null;
}

function buildShareSnapshot({
  hash,
  body,
  now = () => new Date(),
  ttlSeconds = DEFAULT_SHARE_TTL_SECONDS,
}) {
  const createdAt = now();
  const expiresAt = new Date(createdAt.getTime() + ttlSeconds * 1000);
  const trade = {
    send: body.send.map(sanitizePlayer),
    receive: body.receive.map(sanitizePlayer),
    scoring_format: body.scoring_format || "ppr",
  };
  const result = compareTrade({
    send: trade.send,
    receive: trade.receive,
  }, {
    scoringFormat: trade.scoring_format,
  });

  return {
    contract_version: TRADE_SHARE_CONTRACT,
    hash,
    is_public: true,
    source: "trade_analyzer",
    created_at: createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    trade,
    result,
  };
}

function attachTradeDecisionReceipt(result, analysis = {}) {
  const context = createDecisionContext({ profile: "trade" });
  const personalized = analysis.mode === "personalized";
  const applied = new Set(Array.isArray(analysis.applied) ? analysis.applied : []);
  const missingProjectionCount = Number(result?.send?.missing_projection_count || 0)
    + Number(result?.receive?.missing_projection_count || 0);

  context.record("selected_context", personalized
    ? { state: "live", source: "owned_platform_connection" }
    : { state: "not_requested", source: "trade_request", reason_code: "league_context_not_requested" });
  context.record("roster", personalized && applied.has("roster_depth")
    ? { state: "live", source: "selected_league_roster" }
    : { state: "not_requested", source: "selected_league_roster", reason_code: "roster_context_not_used" });
  context.record("league_scoring", personalized && applied.has("scoring_format")
    ? { state: "live", source: "league_settings" }
    : { state: "not_requested", source: "league_settings", reason_code: "league_scoring_not_used" });
  // Player identity/value inputs were server-resolved before compareTrade. The
  // receipt names that evaluation input without serializing player IDs or raw
  // resolver output.
  context.record("projections", {
    state: missingProjectionCount === 0 ? "live" : "unavailable",
    source: "resolved_player_inputs",
    ...(missingProjectionCount === 0 ? {} : { reason_code: "projection_incomplete" }),
  });

  if (missingProjectionCount === 0) context.use("projections");
  if (personalized) context.use("selected_context");
  if (personalized && applied.has("roster_depth")) context.use("roster");
  if (personalized && applied.has("scoring_format")) context.use("league_scoring");
  return attachDecisionReceipt(result, context);
}

function handleStorageError(res, error) {
  if (error?.code === "trade_share_storage_unavailable") {
    res.status(503).json({ error: "trade_share_storage_unavailable" });
    return true;
  }
  return false;
}

function createTradeRouter({
  tradeShareStore = createDefaultTradeShareStore(),
  generateHash = () => crypto.randomUUID(),
  now = () => new Date(),
  tradePulseBuilder = buildLiveAdpResponse,
  tradePulseRedisClient = tradePulseRedis,
  authenticate = authenticateOmenRequest,
  leagueContextResolver = defaultLeagueContextResolver,
  playerResolver = defaultPlayerResolver,
  tradeExplainer = llm.explainTrade,
  // Injected so the route is testable without a network call — the same
  // opponent-roster read `buildTradeCandidateForConnection` in services/omen.js
  // already uses internally for Omen's own weekly recommendation.
  fetchLeagueRosters = (...args) => sleeperAdapter.fetchSleeperLeagueRosters(...args),
  nflWeekContext = getCurrentNflWeekContext,
  // Every-team-roster reads for ESPN and Yahoo. Each is a normalizer over an
  // already-authenticated call this codebase already makes for a narrower purpose
  // (see src/adapters/espn.js#fetchEspnLeagueRosters, src/adapters/yahoo.js
  // #fetchYahooLeagueRosters) — injected so the route is testable against fixtures
  // rather than a live ESPN/Yahoo session.
  fetchEspnLeagueRosters = (...args) => espnAdapter.fetchEspnLeagueRosters(...args),
  fetchYahooLeagueRosters = (...args) => yahooAdapter.fetchYahooLeagueRosters(...args),
  espnCredentials = getAuthenticatedEspnCredentials,
  yahooClient = getAuthenticatedYahooClient,
  // T2 find-a-trade: caches each league/week's roster-and-need-profile bundle so a
  // repeat request doesn't re-read the provider or re-derive need profiles. Same
  // client/connection pattern as tradeShareStore.js (see tradeFindCacheStore.js).
  tradeFindCache = createDefaultTradeFindCache(),
  // T4 — #519's Redis saved-trade blob. Since redo step 12 only a transition source, consulted for
  // ids that are not in `saved_trades` (see "Transition" below). New saves never go here.
  tradeSavedQueueStore = createDefaultTradeSavedQueueStore(),
  // T4 storage of record: the `saved_trades` table (redo step 12).
  savedTradesStore = createSupabaseSavedTradesStore(),
} = {}) {
  const router = express.Router();

  router.get("/capabilities", (_req, res) => res.json({
    contract_version: "trade-capabilities.v1", max_teams: THREE_TEAM_COUNT,
    comparison: "multi_sided", submission: "handoff_only",
    three_team: { supported: true, reason: null },
  }));

  /**
   * Every team's roster for a Sleeper league, in the route's unified shape. Wraps the same
   * `sleeperAdapter.fetchSleeperLeagueRosters` read `buildTradeCandidateForConnection`
   * (src/services/omen.js) already uses internally for Omen's own weekly recommendation —
   * no new Sleeper surface.
   */
  async function readSleeperRosters({ leagueId, week }) {
    const leagueRosters = await fetchLeagueRosters(leagueId, week, String(now().getFullYear()));
    const status = String(leagueRosters?.league_status || "").toLowerCase();
    if (status === "pre_draft" || status === "drafting") {
      return { status: "unavailable", reason: "league_not_active" };
    }
    const teams = (Array.isArray(leagueRosters?.teams) ? leagueRosters.teams : []).map((team) => ({
      team_id: String(team?.roster_id || ""),
      team_name: team?.team_name || null,
      players: Array.isArray(team?.players) ? team.players : [],
    }));
    return {
      status: "ok",
      week,
      roster_positions: Array.isArray(leagueRosters?.roster_positions) ? leagueRosters.roster_positions : [],
      teams,
    };
  }

  /**
   * Every team's roster for an ESPN league. `fetchEspnLeagueRosters` (src/adapters/espn.js)
   * walks the same `mMatchup`+`mMatchupScore` read `fetchEspnMatchup` already makes for the
   * caller's own matchup — ESPN's response already carries every team that week, this just
   * doesn't stop at the caller's own game. Credentials come from the user's own stored
   * connection (`getAuthenticatedEspnCredentials`), never from the request.
   */
  async function readEspnRosters({ userId, leagueId, week }) {
    let credentials;
    try {
      credentials = await espnCredentials(userId);
    } catch {
      return { status: "unavailable", reason: "provider_reauth_required" };
    }
    const rosters = await fetchEspnLeagueRosters(leagueId, credentials.espn_s2, credentials.swid, { week });
    const teams = (Array.isArray(rosters?.teams) ? rosters.teams : []).map((team) => ({
      team_id: String(team?.team_id || ""),
      team_name: team?.team_name || null,
      players: Array.isArray(team?.players) ? team.players : [],
    }));
    return {
      status: "ok",
      week,
      roster_positions: Array.isArray(rosters?.roster_positions) ? rosters.roster_positions : [],
      teams,
    };
  }

  /**
   * Every team's roster for a Yahoo league. `fetchYahooLeagueRosters` (src/adapters/yahoo.js)
   * composes two already-working calls: the standings read that lists every team key, and the
   * per-team roster read (`getRoster`) that already accepts an arbitrary key — it was never
   * restricted to the caller's own. The authenticated client comes from the user's own stored
   * connection (`getAuthenticatedYahooClient`), never from the request.
   */
  async function readYahooRosters({ userId, leagueId, week }) {
    let auth;
    try {
      auth = await yahooClient(userId);
    } catch {
      return { status: "unavailable", reason: "provider_reauth_required" };
    }
    const rosters = await fetchYahooLeagueRosters(leagueId, auth.accessToken, week);
    const teams = (Array.isArray(rosters?.teams) ? rosters.teams : []).map((team) => ({
      team_id: team?.team_id ? String(team.team_id) : "",
      team_name: team?.team_name || null,
      players: Array.isArray(team?.players) ? team.players : [],
    }));
    return {
      status: "ok",
      week: rosters?.week || week,
      roster_positions: Array.isArray(rosters?.roster_positions) ? rosters.roster_positions : [],
      teams,
    };
  }

  const ROSTER_READERS = Object.freeze({
    sleeper: readSleeperRosters,
    espn: readEspnRosters,
    yahoo: readYahooRosters,
  });

  /**
   * `GET /api/trade/roster?platform=&league_id=&week=&team_id=` → `trade-roster.v1`.
   *
   * Exposes every team's roster for the caller's connected league to `TradeBuild`/
   * `TradeRoster`, across all three providers. Each provider read is a normalizer over an
   * already-authenticated call this codebase already makes for a narrower purpose — see
   * `readSleeperRosters`/`readEspnRosters`/`readYahooRosters` above for exactly which one.
   *
   * A provider read that genuinely cannot supply this (no connection, a stale ESPN/Yahoo
   * session, an inactive league) answers with the honest "not available" shape this app uses
   * everywhere else (`waiver_system: not_determined`, `three_team.supported: false`) — never a
   * 500 and never a fabricated roster. That is the exception path, not the default: it fires
   * only for a real, named blocker on that provider or that user's connection.
   */
  router.get("/roster", async (req, res, next) => {
    try {
      let user;
      try {
        user = await authenticate(req.headers.authorization);
      } catch {
        user = null;
      }
      if (!user?.id) {
        return res.status(401).json({ error: "authentication_required", code: "trade_roster_auth_required" });
      }

      const platform = req.query.platform == null ? "" : String(req.query.platform).toLowerCase();
      const leagueId = req.query.league_id == null ? "" : String(req.query.league_id);
      if (!platform) {
        return res.status(400).json({ error: "platform query param required" });
      }
      if (!VALID_CONTEXT_PLATFORMS.has(platform)) {
        return res.status(400).json({ error: "platform must be one of yahoo, sleeper, espn" });
      }
      if (!leagueId) {
        return res.status(400).json({ error: "league_id query param required" });
      }
      if (leagueId.length > MAX_LEAGUE_ID_LENGTH) {
        return res.status(400).json({ error: "league_id is too long" });
      }

      let week = parseInt(req.query.week, 10);
      if (!Number.isFinite(week) || week < 1) {
        week = nflWeekContext(now())?.week || 1;
      }

      let result;
      try {
        result = await ROSTER_READERS[platform]({ userId: user.id, leagueId, week });
      } catch (e) {
        logger.warn("Trade roster read failed", { err: e.message, platform, league_id: leagueId });
        return res.status(503).json({ error: "roster_unavailable", code: "trade_roster_unavailable" });
      }

      if (result.status !== "ok") {
        return res.json({
          contract_version: "trade-roster.v1",
          status: "unavailable",
          platform,
          reason: result.reason || "provider_unsupported",
          teams: [],
        });
      }

      const teamId = req.query.team_id == null ? null : String(req.query.team_id);
      const teams = teamId ? result.teams.filter((team) => team.team_id === teamId) : result.teams;

      return res.json({
        contract_version: "trade-roster.v1",
        status: "ok",
        platform,
        week: result.week,
        roster_positions: result.roster_positions,
        teams,
      });
    } catch (e) {
      return next(e);
    }
  });

  // Scoped to the caller. The cache is read before the provider roster read, and
  // that read is the only ownership check (it uses the caller's own ESPN/Yahoo
  // credentials). A key without the user id would hand user A's warm bundle to
  // any user who names A's league id. Sleeper leagues are public, but they are
  // scoped the same way so the rule has no exceptions.
  function tradeFindCacheKey({ userId, platform, leagueId, week }) {
    return `${userId}:${platform}:${leagueId}:${week}`;
  }

  // T4 save lookup (decision log 2026-10-02, "the server remembers every trade it shows"). Each /find
  // response gets a batch token, folded into every candidate id as `{token}.{id}`, and the batch's
  // trades are kept per user for the find cache's lifetime. The app still sends only the id back.
  const SHOWN_BATCH_TOKEN_RE = /^([0-9a-f]{16})\./;

  function shownBatchKey(userId, token) {
    return `shown:${userId}:${token}`;
  }

  function keptTradePlayer(player) {
    if (!isPlainObject(player)) return null;
    const kept = sanitizePlayer(player);
    if (player.player_id != null) kept.player_id = truncateString(player.player_id, 160);
    return kept;
  }

  async function keepShownBatch({ userId, platform, leagueId, teamId, week, candidates }) {
    const token = crypto.randomBytes(8).toString("hex");
    const issued = candidates.map((candidate) => ({ ...candidate, id: `${token}.${candidate.id}` }));
    const context = nflWeekContext(now()) || {};
    const batch = {
      provider: platform,
      provider_league_id: leagueId,
      provider_team_id: teamId,
      season: Number.isInteger(context.season) ? context.season : now().getUTCFullYear(),
      week,
      trades: Object.fromEntries(issued.map((candidate) => [candidate.id, {
        give: keptTradePlayer(candidate.give),
        receive: keptTradePlayer(candidate.receive),
        opponent_team_id: candidate.opponent_team_id == null ? null : String(candidate.opponent_team_id),
        opponent_team_name: candidate.opponent_team_name ?? null,
      }])),
    };
    try {
      await tradeFindCache.write(shownBatchKey(userId, token), batch, DEFAULT_FIND_CACHE_TTL_SECONDS);
    } catch (e) {
      // The search still answers; saving from it will ask the user to refresh.
      logger.warn("Trade find shown-batch write failed; saves from this search will expire", { err: e.message });
    }
    return issued;
  }

  async function readShownTrade(userId, candidateId) {
    const match = SHOWN_BATCH_TOKEN_RE.exec(candidateId);
    if (!match) return null;
    const batch = await tradeFindCache.read(shownBatchKey(userId, match[1]));
    const trade = batch?.trades?.[candidateId];
    return trade ? { batch, trade } : null;
  }

  /**
   * `GET /api/trade/find?platform=&league_id=&team_id=&week=` → `trade-find.v1`.
   *
   * Scans every OTHER connected team's roster in the caller's league against the
   * caller's own team (`team_id`, the same query param `/roster` already uses to
   * pick one team out of a league) and returns ranked candidate trade packages.
   *
   * Bounding strategy (spec: `Blueprints/specs/omen-trade-rework-v1.md` §T2, the
   * #404/#405 non-negotiable constraint):
   *
   *   1. **Cache.** The provider roster read for a given platform/league/week is
   *      cached (`tradeFindCache`, `tradeFindCacheStore.js` — same Redis client
   *      pattern as `tradeShareStore.js`) for `DEFAULT_FIND_CACHE_TTL_SECONDS`,
   *      keyed per user (see `tradeFindCacheKey`). A repeat request by the same
   *      user in that window never re-reads the provider. This is the
   *      "not recomputed live on every call" half of the constraint. Refresh is
   *      TTL-based rather than webhook-driven because none of Yahoo, Sleeper, or
   *      ESPN publish a roster-change webhook today — see the open question noted
   *      in this item's report.
   *   2. **Compute bound.** Candidate generation (`findLeagueTradeCandidates`,
   *      `tradeFind.js`) reuses the exact #404/#405 shared search-budget pattern
   *      from `tradeLineup.js`, plus a hard cap on opponent teams considered
   *      (`MAX_OPPONENT_TEAMS_PER_SCAN`) and candidates returned
   *      (`MAX_CANDIDATES_RETURNED`). Both are surfaced in `bounds` below so a
   *      truncated scan is visible, never silent.
   *   3. **Partial failure.** A team whose roster the provider disclosed as empty
   *      or missing is skipped with a named reason in `degraded_teams` — the scan
   *      never fails closed over one bad team (fact-of-record #16: no candidate
   *      is ever proposed against a roster Omen cannot see).
   */
  router.get("/find", async (req, res, next) => {
    try {
      let user;
      try {
        user = await authenticate(req.headers.authorization);
      } catch {
        user = null;
      }
      if (!user?.id) {
        return res.status(401).json({ error: "authentication_required", code: "trade_find_auth_required" });
      }

      const platform = req.query.platform == null ? "" : String(req.query.platform).toLowerCase();
      const leagueId = req.query.league_id == null ? "" : String(req.query.league_id);
      const teamId = req.query.team_id == null ? "" : String(req.query.team_id);
      if (!platform) {
        return res.status(400).json({ error: "platform query param required" });
      }
      if (!VALID_CONTEXT_PLATFORMS.has(platform)) {
        return res.status(400).json({ error: "platform must be one of yahoo, sleeper, espn" });
      }
      if (!leagueId) {
        return res.status(400).json({ error: "league_id query param required" });
      }
      if (leagueId.length > MAX_LEAGUE_ID_LENGTH) {
        return res.status(400).json({ error: "league_id is too long" });
      }
      if (!teamId) {
        return res.status(400).json({
          error: "team_id query param required",
          code: "trade_find_team_id_required",
        });
      }

      let week = parseInt(req.query.week, 10);
      if (!Number.isFinite(week) || week < 1) {
        week = nflWeekContext(now())?.week || 1;
      }

      const cacheKey = tradeFindCacheKey({ userId: user.id, platform, leagueId, week });
      let bundle = null;
      let cacheHit = false;
      try {
        bundle = await tradeFindCache.read(cacheKey);
      } catch (e) {
        logger.warn("Trade find cache read failed; continuing uncached", { err: e.message });
      }

      if (bundle) {
        cacheHit = true;
      } else {
        let result;
        try {
          result = await ROSTER_READERS[platform]({ userId: user.id, leagueId, week });
        } catch (e) {
          logger.warn("Trade find roster read failed", { err: e.message, platform, league_id: leagueId });
          return res.status(503).json({ error: "roster_unavailable", code: "trade_find_unavailable" });
        }

        if (result.status !== "ok") {
          return res.json({
            contract_version: TRADE_FIND_CONTRACT,
            status: "unavailable",
            platform,
            league_id: leagueId,
            week,
            reason: result.reason || "provider_unsupported",
            candidates: [],
          });
        }

        bundle = {
          generated_at: now().toISOString(),
          week: result.week || week,
          roster_positions: result.roster_positions,
          teams: result.teams,
        };

        try {
          await tradeFindCache.write(cacheKey, bundle, DEFAULT_FIND_CACHE_TTL_SECONDS);
        } catch (e) {
          logger.warn("Trade find cache write failed; serving uncached this request", { err: e.message });
        }
      }

      let budgetExceededStats = null;
      const scan = findLeagueTradeCandidates({
        ownTeamId: teamId,
        teams: bundle.teams,
        rosterPositions: bundle.roster_positions,
        budget: createSearchBudget(),
        onBudgetExceeded: (stats) => { budgetExceededStats = stats; },
      });

      if (scan.status === "own_team_not_found") {
        return res.status(404).json({ error: "team_not_found", code: "trade_find_team_not_found" });
      }
      if (scan.status === "own_roster_unreadable") {
        return res.json({
          contract_version: TRADE_FIND_CONTRACT,
          status: "unavailable",
          platform,
          league_id: leagueId,
          week: bundle.week,
          reason: "own_roster_unavailable",
          candidates: [],
        });
      }

      if (budgetExceededStats) {
        // Mirrors the #404 postmortem lesson in services/omen.js: a budget trip
        // silently means fewer candidates were issued, which must be visible to
        // whoever is watching this deploy, not just to the caller.
        logger.warn("Trade find search budget exceeded", {
          ...budgetExceededStats,
          platform,
          league_id: leagueId,
        });
      }

      const responseStatus = scan.degraded_teams.length > 0
        || scan.teams_skipped_for_cap.length > 0
        || scan.budget_exceeded
        ? "degraded"
        : "ok";

      return res.json({
        contract_version: TRADE_FIND_CONTRACT,
        status: responseStatus,
        platform,
        league_id: leagueId,
        team_id: teamId,
        week: bundle.week,
        cache: {
          hit: cacheHit,
          generated_at: bundle.generated_at,
          ttl_seconds: DEFAULT_FIND_CACHE_TTL_SECONDS,
        },
        bounds: {
          max_opponent_teams: MAX_OPPONENT_TEAMS_PER_SCAN,
          max_candidates: MAX_CANDIDATES_RETURNED,
          teams_considered: scan.teams_considered,
          teams_skipped_for_cap: scan.teams_skipped_for_cap,
        },
        degraded_teams: scan.degraded_teams,
        budget_exceeded: scan.budget_exceeded,
        own_needs: scan.own_needs,
        candidates: await keepShownBatch({
          userId: user.id,
          platform,
          leagueId,
          teamId,
          week: bundle.week,
          candidates: scan.candidates,
        }),
      });
    } catch (e) {
      return next(e);
    }
  });

  // -------------------------------------------------------------------------
  // T4 — saved trade queue with tracked outcomes
  // (`Blueprints/specs/omen-trade-rework-v1.md` §T4).
  //
  // The save-action interface T3 already shipped and this item must match
  // exactly (`TradeFindReviewViewModel.save()`,
  // `Blueprints/specs/design/screen-contracts/TradeFindReview-v1.md`) is
  // `save_action(candidate_id, reasoning) -> { status: "saved" | "error" }` —
  // two arguments, no player identity, no league context. The trade and its
  // scope come from the caller's own kept /find batch (`readShownTrade`), never
  // from the request body, and are written to the `saved_trades` table (redo
  // step 12). An expired or unknown id is `trade_saved_candidate_expired`
  // ("refresh the search"); a row is never written without its trade.
  //
  // `U4-LedgerScreen`'s honesty pattern, applied here rather than reinvented:
  // `state` (`saved` -> `sent`) and `outcome` (`accepted`/`rejected`/
  // `countered`/`null`) are two separate fields, `outcome` is never set by
  // anything but the self-report endpoint below, and `null` is the only
  // honest resting value — never inferred from `state` or from any other
  // signal this server can observe.
  //
  // Transition: #519 kept saves in one Redis blob per user. Those items have no
  // league or players, so the table's checks reject them and they cannot be
  // migrated. Reads fall back to the blob for ids not in the table, and sent /
  // outcome / unsave keep working on such an item in place. No client ever
  // called #519's endpoint (T3 ships a local stub), so the blob is expected to
  // be empty; the fallback is a guard, and can go once that is confirmed.
  // -------------------------------------------------------------------------

  function isPlainSavedField(value, maxLength) {
    return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
  }

  function storageUnavailable(res, e) {
    logger.warn("Trade saved queue storage failed", { err: e.message, db_code: e.dbCode });
    return res.status(503).json({ status: "error", code: "trade_saved_queue_storage_unavailable" });
  }

  async function authenticatedUser(req, res) {
    let user;
    try {
      user = await authenticate(req.headers.authorization);
    } catch {
      user = null;
    }
    if (!user?.id) {
      res.status(401).json({ status: "error", code: "trade_saved_auth_required" });
      return null;
    }
    return user;
  }

  // A store with nothing behind it (production without Redis) can hold no legacy items.
  const legacyStoreUsable = () => tradeSavedQueueStore && tradeSavedQueueStore.kind !== "disabled";

  async function readLegacyItems(userId) {
    if (!legacyStoreUsable()) return [];
    return tradeSavedQueueStore.readAll(userId);
  }

  async function findLegacyItem(userId, candidateId) {
    const items = await readLegacyItems(userId);
    const index = items.findIndex((item) => item.candidate_id === candidateId);
    return { items, index, item: index >= 0 ? items[index] : null };
  }

  /** A `saved_trades` row in the shape the rest of this section (and #519's items) use. */
  function itemFromRow(row) {
    const trade = row.trade || {};
    return {
      candidate_id: row.candidate_id,
      reasoning: row.reasoning,
      give: trade.give ?? null,
      receive: trade.receive ?? null,
      opponent_team_id: trade.opponent_team_id ?? null,
      opponent_team_name: trade.opponent_team_name ?? null,
      platform: row.provider,
      league_id: row.provider_league_id,
      team_id: row.provider_team_id,
      state: row.state,
      outcome: row.outcome ?? null,
      saved_at: row.saved_at,
      sent_at: row.sent_at ?? null,
      outcome_reported_at: row.outcome_at ?? null,
    };
  }

  /**
   * Re-derives the position-level need snapshot the item was saved with
   * against a live roster read, reusing the exact `ROSTER_READERS` this
   * file's own `/roster` route already exposes — no new roster-fetch logic.
   * Answers `unknown` (never a guess) whenever the context needed to do a
   * live read isn't available. `readRoster` is memoized per request, so items
   * in one league read its rosters once.
   */
  async function stalenessForItem(item, { queryPlatform, queryLeagueId, queryTeamId, readRoster }) {
    const platform = item.platform || queryPlatform;
    const leagueId = item.league_id || queryLeagueId;
    const teamId = item.team_id || queryTeamId;
    const position = item.reasoning?.user_receives?.position;
    const savedNeed = item.reasoning?.user_receives?.need;

    if (!platform || !VALID_CONTEXT_PLATFORMS.has(platform) || !leagueId || !teamId || !position || !savedNeed) {
      return { status: "unknown", reason: "insufficient_context_for_staleness_check" };
    }

    try {
      const result = await readRoster(platform, leagueId);
      if (result.status !== "ok") {
        return { status: "unknown", reason: "insufficient_context_for_staleness_check" };
      }
      const ownTeam = result.teams.find((team) => team.team_id === String(teamId));
      if (!ownTeam) {
        return { status: "unknown", reason: "insufficient_context_for_staleness_check" };
      }
      const liveNeed = currentNeedFor({
        position,
        rosterPositions: result.roster_positions,
        players: ownTeam.players,
      });
      return computeStaleness({ savedNeed, liveNeed });
    } catch (e) {
      logger.warn("Trade saved queue staleness check failed; reporting unknown rather than guessing", { err: e.message });
      return { status: "unknown", reason: "insufficient_context_for_staleness_check" };
    }
  }

  function serializeSavedItem(item, staleInfo) {
    return {
      candidate_id: item.candidate_id,
      reasoning: item.reasoning,
      give: item.give ?? null,
      receive: item.receive ?? null,
      opponent_team_id: item.opponent_team_id ?? null,
      opponent_team_name: item.opponent_team_name ?? null,
      state: item.state,
      outcome: item.outcome ?? null,
      saved_at: item.saved_at,
      sent_at: item.sent_at ?? null,
      outcome_reported_at: item.outcome_reported_at ?? null,
      staleness: staleInfo,
    };
  }

  /**
   * `POST /api/trade/saved` — the documented save-action interface's real
   * endpoint: `save_action(candidate_id, reasoning) -> { status: "saved" |
   * "error" }`.
   */
  router.post("/saved", async (req, res, next) => {
    try {
      const user = await authenticatedUser(req, res);
      if (!user) return undefined;

      const body = isPlainObject(req.body) ? req.body : {};
      const candidateId = body.candidate_id;
      if (!isPlainSavedField(candidateId, MAX_CANDIDATE_ID_LENGTH)) {
        return res.status(400).json({ status: "error", code: "trade_saved_candidate_id_required" });
      }
      if (!isPlainObject(body.reasoning)) {
        return res.status(400).json({ status: "error", code: "trade_saved_reasoning_required" });
      }
      if (jsonByteLength(body.reasoning) > MAX_SAVED_REASONING_BYTES) {
        return res.status(413).json({ status: "error", code: "trade_saved_reasoning_too_large" });
      }
      if (containsSensitiveField(body)) {
        return res.status(400).json({ status: "error", code: "trade_saved_sensitive_field" });
      }

      let shown;
      try {
        shown = await readShownTrade(user.id, candidateId);
      } catch (e) {
        return storageUnavailable(res, e);
      }
      const trade = shown?.trade;
      if (!trade || !trade.give || !trade.receive || !trade.opponent_team_id) {
        return res.status(410).json({ status: "error", code: "trade_saved_candidate_expired" });
      }

      try {
        // Reasoning is retained VERBATIM from the first save: the insert
        // ignores a duplicate on the table's unique key, so a retried save
        // never regenerates or overwrites it (spec: "the user is reviewing the
        // reasoning that made them save it, not a refreshed opinion").
        await savedTradesStore.insertIfAbsent({
          user_id: user.id,
          provider: shown.batch.provider,
          provider_league_id: shown.batch.provider_league_id,
          season: shown.batch.season,
          week: shown.batch.week,
          provider_team_id: shown.batch.provider_team_id,
          candidate_id: candidateId,
          trade,
          reasoning: body.reasoning,
          state: "saved",
          saved_at: now().toISOString(),
        });
      } catch (e) {
        return storageUnavailable(res, e);
      }

      return res.status(200).json({ status: "saved" });
    } catch (e) {
      return next(e);
    }
  });

  /**
   * `GET /api/trade/saved?platform=&league_id=&team_id=&week=` ->
   * `trade-saved-queue.v1`. The user's saved candidates, each carrying its
   * verbatim reasoning, its `saved` -> `sent` -> self-reported-`outcome`
   * state, and an honest staleness read.
   */
  router.get("/saved", async (req, res, next) => {
    try {
      const user = await authenticatedUser(req, res);
      if (!user) return undefined;

      let items;
      try {
        items = (await savedTradesStore.list(user.id)).map(itemFromRow);
      } catch (e) {
        return storageUnavailable(res, e);
      }
      try {
        const inTable = new Set(items.map((item) => item.candidate_id));
        items = items.concat((await readLegacyItems(user.id)).filter((item) => !inTable.has(item.candidate_id)));
      } catch (e) {
        // The legacy blob is a transition guard; it never blocks the table-backed list.
        logger.warn("Trade saved queue legacy read failed; listing the table only", { err: e.message });
      }

      const queryPlatform = req.query.platform == null ? null : String(req.query.platform).toLowerCase();
      const queryLeagueId = req.query.league_id == null ? null : String(req.query.league_id);
      const queryTeamId = req.query.team_id == null ? null : String(req.query.team_id);
      let week = parseInt(req.query.week, 10);
      if (!Number.isFinite(week) || week < 1) {
        week = nflWeekContext(now())?.week || 1;
      }

      const rosterReads = new Map();
      const readRoster = (platform, leagueId) => {
        const key = `${platform}:${leagueId}`;
        if (!rosterReads.has(key)) rosterReads.set(key, ROSTER_READERS[platform]({ userId: user.id, leagueId, week }));
        return rosterReads.get(key);
      };

      const serialized = await Promise.all(items.map(async (item) => serializeSavedItem(
        item,
        await stalenessForItem(item, { queryPlatform, queryLeagueId, queryTeamId, readRoster }),
      )));

      return res.json({
        contract_version: TRADE_SAVED_QUEUE_CONTRACT,
        status: "ok",
        items: serialized,
      });
    } catch (e) {
      return next(e);
    }
  });

  /**
   * `POST /api/trade/saved/:candidateId/sent` — the user confirms they did
   * the provider handoff. Idempotent: calling it again on an already-`sent`
   * candidate is a no-op success, never an error.
   */
  router.post("/saved/:candidateId/sent", async (req, res, next) => {
    try {
      const user = await authenticatedUser(req, res);
      if (!user) return undefined;

      const candidateId = req.params.candidateId;
      const sentAt = now().toISOString();
      try {
        const row = await savedTradesStore.markSent(user.id, candidateId, sentAt);
        if (row) return res.json({ status: "sent", candidate_id: candidateId, sent_at: row.sent_at });

        const { items, index, item } = await findLegacyItem(user.id, candidateId);
        if (!item) return res.status(404).json({ status: "error", code: "trade_saved_not_found" });
        if (item.state !== "sent") {
          items[index] = { ...item, state: "sent", sent_at: sentAt };
          await tradeSavedQueueStore.writeAll(user.id, items);
        }
        return res.json({ status: "sent", candidate_id: candidateId, sent_at: items[index].sent_at });
      } catch (e) {
        return storageUnavailable(res, e);
      }
    } catch (e) {
      return next(e);
    }
  });

  /**
   * `POST /api/trade/saved/:candidateId/outcome` — self-report only. The
   * server never infers an outcome from any signal it can observe (the
   * spec's own rule); this is the only path that can ever set one, it only
   * accepts the three approved values, and it refuses to fire before the
   * user has confirmed the handoff via `/sent` — self-reporting an outcome
   * for a trade never actually sent would itself be a fabricated claim.
   */
  router.post("/saved/:candidateId/outcome", async (req, res, next) => {
    try {
      const user = await authenticatedUser(req, res);
      if (!user) return undefined;

      const outcome = isPlainObject(req.body) ? req.body.outcome : null;
      if (!VALID_OUTCOME_SET.has(outcome)) {
        return res.status(400).json({ status: "error", code: "trade_saved_invalid_outcome" });
      }

      const candidateId = req.params.candidateId;
      const reportedAt = now().toISOString();
      try {
        const result = await savedTradesStore.setOutcome(user.id, candidateId, outcome, reportedAt);
        if (result.status === "not_sent") {
          return res.status(409).json({ status: "error", code: "trade_saved_not_sent" });
        }
        if (result.status === "not_found") {
          const { items, index, item } = await findLegacyItem(user.id, candidateId);
          if (!item) return res.status(404).json({ status: "error", code: "trade_saved_not_found" });
          if (item.state !== "sent") return res.status(409).json({ status: "error", code: "trade_saved_not_sent" });
          items[index] = { ...item, outcome, outcome_reported_at: reportedAt };
          await tradeSavedQueueStore.writeAll(user.id, items);
        }
      } catch (e) {
        return storageUnavailable(res, e);
      }

      return res.json({ status: "ok", candidate_id: candidateId, outcome });
    } catch (e) {
      return next(e);
    }
  });

  /**
   * `DELETE /api/trade/saved/:candidateId` — unsave. Removes the table row (and
   * a legacy item with the same id, if one is left over). 404 when neither held it.
   */
  router.delete("/saved/:candidateId", async (req, res, next) => {
    try {
      const user = await authenticatedUser(req, res);
      if (!user) return undefined;

      const candidateId = req.params.candidateId;
      let removed;
      try {
        removed = await savedTradesStore.remove(user.id, candidateId);
      } catch (e) {
        return storageUnavailable(res, e);
      }
      try {
        const { items, index } = await findLegacyItem(user.id, candidateId);
        if (index >= 0) {
          items.splice(index, 1);
          await tradeSavedQueueStore.writeAll(user.id, items);
          removed = true;
        }
      } catch (e) {
        // The table row is gone; only a leftover legacy copy could not be checked.
        if (!removed) return storageUnavailable(res, e);
        logger.warn("Trade saved queue legacy unsave failed after the table delete", { err: e.message });
      }
      if (!removed) return res.status(404).json({ status: "error", code: "trade_saved_not_found" });
      return res.json({ status: "deleted", candidate_id: candidateId });
    } catch (e) {
      return next(e);
    }
  });

  router.get("/pulse", async (_req, res) => {
    const unavailable = () => res.json({
      contract_version: "trade-pulse.v1", status: "unavailable", is_mock: false,
      source_status: "live_adp_unavailable", buy_low: [], sell_high: [],
    });
    if (!tradePulseRedisClient) return unavailable();
    try {
      const adp = await tradePulseBuilder({ redis: tradePulseRedisClient, format: "ppr", teams: 12, year: new Date().getFullYear() });
      const players = Array.isArray(adp.weighted_players) ? adp.weighted_players.slice(0, 5) : [];
      return res.json({
        contract_version: "trade-pulse.v1", status: "live", is_mock: false,
        source_status: "live_adp", generated_at: new Date().toISOString(),
        buy_low: players.map((player) => ({
          name: player.name, position: player.position, team: player.team,
          reason: "Consensus ADP supports a value review before your league prices it in.",
        })), sell_high: [],
      });
    } catch {
      return unavailable();
    }
  });

  /**
   * Resolve personalization, or explain in one word why it could not happen.
   *
   * Failure is never fatal here: visual briefs §8.3 requires that an
   * unverifiable league quietly retains neutral analysis rather than erroring,
   * and §9.1 requires the screen to say which one it is.
   */
  async function resolveAnalysisContext(req) {
    const requested = req.body.league_context;
    if (requested == null) return { analysis: neutralAnalysisContext(), scoringConfig: {} };

    let user = null;
    try {
      user = await authenticate(req.headers.authorization);
    } catch {
      // Trade stays free and public; asking for personalization without a
      // session is a downgrade to neutral, not a 401.
      return { analysis: neutralAnalysisContext("unauthenticated"), scoringConfig: {} };
    }

    const resolved = await leagueContextResolver({
      userId: user.id,
      platform: requested.platform == null ? null : String(requested.platform).toLowerCase(),
      leagueId: requested.league_id == null ? null : String(requested.league_id),
    });

    if (resolved?.status !== "personalized") {
      return {
        analysis: neutralAnalysisContext(resolved?.reason || "league_context_unavailable"),
        scoringConfig: {},
      };
    }

    return {
      analysis: {
        mode: "personalized",
        platform: resolved.platform || null,
        league_id: resolved.league_id || null,
        league_name: resolved.league_name || null,
        applied: Array.isArray(resolved.applied) ? resolved.applied : [],
        unavailable_reason: null,
      },
      scoringConfig: resolved.scoringConfig || {},
    };
  }

  /**
   * `POST /api/trade/compare` with a `legs` body → the three-team branch of `trade-compare.v2`.
   *
   * Each participant is evaluated **separately**, by aggregating exactly what that team sends
   * and receives across the legs and running it through the same `compareTrade` fairness engine
   * the two-team path already uses — never a pairwise decomposition bolted on top. A payload
   * touching more or fewer than exactly three distinct teams is refused outright: T1's contract
   * is that a three-team request never silently collapses to two, and never expands past three.
   */
  async function handleThreeTeamCompare(req, res) {
    const legs = req.body.legs;
    const legsError = validateLegs(legs);
    if (legsError) {
      return res.status(400).json({ error: legsError });
    }

    const teamIds = uniqueTeamIdsFromLegs(legs);
    if (teamIds.length > THREE_TEAM_COUNT) {
      return res.status(422).json({
        error: "multi_team_trade_unsupported", max_teams: THREE_TEAM_COUNT,
        message: "Omen compares at most three teams. No trade analysis was performed.",
      });
    }
    if (teamIds.length < THREE_TEAM_COUNT) {
      return res.status(422).json({
        error: "three_team_shape_required", max_teams: THREE_TEAM_COUNT,
        message: "These legs only touch two teams. Use a two-team compare (send/receive) instead — "
          + "Omen never silently collapses a three-team request into a two-team one.",
      });
    }

    const contextError = validateLeagueContext(req.body);
    if (contextError) {
      return res.status(400).json({ error: contextError });
    }

    let resolvedLegs;
    try {
      resolvedLegs = await Promise.all(legs.map(async (leg) => ({
        leg,
        resolutions: await playerResolver(leg.players),
      })));
    } catch (error) {
      logger.warn("Trade player resolution unavailable", { err: error.message });
      return res.status(503).json({
        error: "player_resolution_unavailable",
        code: "player_resolution_unavailable",
      });
    }

    const unresolved = [];
    resolvedLegs.forEach(({ leg, resolutions }, index) => {
      unresolved.push(...unresolvedPlayersFor(`legs[${index}].players`, leg.players, resolutions));
    });
    if (unresolved.length) {
      return res.status(422).json({
        error: "unresolved_players",
        code: "trade_unresolved_players",
        unresolved,
      });
    }

    const resolvedLegsWithPlayers = resolvedLegs.map(({ leg, resolutions }) => ({
      from: leg.from,
      to: leg.to,
      players: resolvedTradePlayers(leg.players, resolutions),
    }));

    const { analysis, scoringConfig } = await resolveAnalysisContext(req);
    const scoring_format = analysis.mode === "personalized"
      ? scoringConfig.scoring_format
      : (req.body.scoring_format || "ppr");

    const teamNames = teamNamesFromLegs(legs);

    const participants = teamIds.map((teamId) => {
      const sends = resolvedLegsWithPlayers
        .filter((leg) => leg.from === teamId)
        .flatMap((leg) => leg.players);
      const receives = resolvedLegsWithPlayers
        .filter((leg) => leg.to === teamId)
        .flatMap((leg) => leg.players);

      const result = compareTrade({ send: sends, receive: receives }, { scoringFormat: scoring_format }, scoringConfig);
      const evaluability = evaluabilityFor(result);
      const verdict_state = verdictStateFor(result, evaluability);

      return {
        team_id: teamId,
        team_name: teamNames[teamId] || null,
        sends: result.send,
        receives: result.receive,
        net_value: result.net_value,
        verdict: result.verdict,
        verdict_state,
        acceptance_likelihood: acceptanceLikelihoodFor(verdict_state),
        confidence: result.confidence,
        // "Roster fit" reuses the same scarcity/tier and depth-discount signals the two-team
        // engine already computes — not a new scoring model, per the item's scope.
        roster_fit: {
          summary: result.scarcity_analysis.summary || null,
          depth_discounted: result.depth_discounted,
        },
        evaluability,
      };
    });

    const overall = overallEvaluabilityAcrossParticipants(participants.map((p) => p.evaluability));

    return res.json({
      contract_version: TRADE_COMPARE_CONTRACT,
      trade_shape: "three_team",
      team_count: THREE_TEAM_COUNT,
      participants,
      evaluability: overall,
      // The first team named across the legs, by convention — "your" headline when this request
      // came from the app's own builder, which always lists the caller's team first.
      verdict_state: participants[0].verdict_state,
      analysis_context: analysis,
      submission: buildThreeTeamSubmission(resolvedLegsWithPlayers, teamNames),
    });
  }

  router.post("/compare", async (req, res, next) => {
    try {
      if (req.body?.legs != null) {
        return await handleThreeTeamCompare(req, res);
      }
      if (req.body?.teams != null || req.body?.participants != null
        || (req.body?.team_count != null && req.body.team_count !== 2)) {
        return res.status(422).json({
          error: "multi_team_trade_unsupported", max_teams: 2,
          message: "Omen doesn't support that trade shape. Use send/receive for a two-team "
            + "compare, or legs for a three-team compare.",
        });
      }
      const validationError = validateTradePayload(req.body);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      const contextError = validateLeagueContext(req.body);
      if (contextError) {
        return res.status(400).json({ error: contextError });
      }

      // `F-BAR-29`: identity is a hard gate ahead of every score, tier,
      // summary, share snapshot and LLM call. Missing projections can produce
      // an honest non-verdict for a *real* player; they can never turn an
      // invented name into a low-confidence fantasy asset.
      let sendResolutions;
      let receiveResolutions;
      try {
        [sendResolutions, receiveResolutions] = await Promise.all([
          playerResolver(req.body.send),
          playerResolver(req.body.receive),
        ]);
      } catch (error) {
        logger.warn("Trade player resolution unavailable", { err: error.message });
        return res.status(503).json({
          error: "player_resolution_unavailable",
          code: "player_resolution_unavailable",
        });
      }

      const unresolved = [
        ...unresolvedPlayersFor("send", req.body.send, sendResolutions),
        ...unresolvedPlayersFor("receive", req.body.receive, receiveResolutions),
      ];
      if (unresolved.length) {
        return res.status(422).json({
          error: "unresolved_players",
          code: "trade_unresolved_players",
          unresolved,
        });
      }

      const send = resolvedTradePlayers(req.body.send, sendResolutions);
      const receive = resolvedTradePlayers(req.body.receive, receiveResolutions);

      const { analysis, scoringConfig } = await resolveAnalysisContext(req);
      // A personalized run derives its scoring format from the provider's own
      // settings; the client-supplied label only governs the neutral path.
      const scoring_format = analysis.mode === "personalized"
        ? scoringConfig.scoring_format
        : (req.body.scoring_format || "ppr");

      const result = compareTrade({
        send,
        receive,
      }, {
        scoringFormat: scoring_format,
      }, scoringConfig);

      const evaluability = evaluabilityFor(result);
      result.contract_version = TRADE_COMPARE_CONTRACT;
      result.evaluability = evaluability;
      result.verdict_state = verdictStateFor(result, evaluability);
      result.analysis_context = analysis;
      attachTradeDecisionReceipt(result, analysis);

      result.explanation = await tradeExplainer({
        send,
        receive,
        net_value: result.net_value,
        a_score: result.a_score,
        b_score: result.b_score,
        combined_score: result.combined_score,
        scarcity_analysis: result.scarcity_analysis,
        verdict:   result.verdict,
      });

      return res.json(result);
    } catch (e) {
      return next(e);
    }
  });

  router.post("/share", async (req, res, next) => {
    try {
      const validationError = validateTradeSharePayload(req.body);
      if (validationError) {
        return res.status(validationError.status).json({ error: validationError.error });
      }

      const hash = generateHash();
      const snapshot = buildShareSnapshot({ hash, body: req.body, now });
      await tradeShareStore.write(hash, snapshot, DEFAULT_SHARE_TTL_SECONDS);

      return res.status(201).json({
        contract_version: TRADE_SHARE_CONTRACT,
        hash,
        api_path: `/api/trade/share/${hash}`,
        expires_at: snapshot.expires_at,
      });
    } catch (e) {
      if (handleStorageError(res, e)) return undefined;
      return next(e);
    }
  });

  router.get("/share/:hash", async (req, res, next) => {
    try {
      const { hash } = req.params;
      if (!UUID_V4_RE.test(hash)) {
        return res.status(400).json({ error: "invalid_trade_share_hash" });
      }

      const snapshot = await tradeShareStore.read(hash);
      if (!snapshot) {
        return res.status(404).json({ error: "trade_share_not_found" });
      }

      return res.json(snapshot);
    } catch (e) {
      if (handleStorageError(res, e)) return undefined;
      return next(e);
    }
  });

  router.get("/share/:hash/og.svg", async (req, res, next) => {
    try {
      const { hash } = req.params;
      if (!UUID_V4_RE.test(hash)) {
        return res.status(400).json({ error: "invalid_trade_share_hash" });
      }

      const snapshot = await tradeShareStore.read(hash);
      if (!snapshot) {
        return res.status(404).json({ error: "trade_share_not_found" });
      }

      res.set("Content-Type", "image/svg+xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=300, s-maxage=300");
      return res.send(buildTradeShareOgSvg(snapshot));
    } catch (e) {
      if (handleStorageError(res, e)) return undefined;
      return next(e);
    }
  });

  return router;
}

const router = createTradeRouter();

module.exports = router;
module.exports.createTradeRouter = createTradeRouter;
module.exports.closeTradeWarehouseRuntime = async () => {
  const runtime = tradeWarehouseRuntime;
  tradeWarehouseRuntime = undefined;
  if (runtime) await runtime.close();
};
module.exports.validateTradeSharePayload = validateTradeSharePayload;
module.exports.validateTradePayload = validateTradePayload;
module.exports.validateLeagueContext = validateLeagueContext;
module.exports.evaluabilityFor = evaluabilityFor;
module.exports.verdictStateFor = verdictStateFor;
module.exports.TRADE_COMPARE_CONTRACT = TRADE_COMPARE_CONTRACT;
module.exports.attachTradeDecisionReceipt = attachTradeDecisionReceipt;
module.exports.validateLegs = validateLegs;
module.exports.uniqueTeamIdsFromLegs = uniqueTeamIdsFromLegs;
module.exports.acceptanceLikelihoodFor = acceptanceLikelihoodFor;
module.exports.overallEvaluabilityAcrossParticipants = overallEvaluabilityAcrossParticipants;
module.exports.THREE_TEAM_COUNT = THREE_TEAM_COUNT;
