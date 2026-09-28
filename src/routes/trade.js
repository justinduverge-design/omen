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
const { resolveTradeLeagueContext } = require("../services/tradeLeagueContext");
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
const VALID_CONTEXT_PLATFORMS = new Set(["yahoo", "sleeper", "espn"]);
const MAX_LEAGUE_ID_LENGTH = 64;

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
  if (context.season != null && (!Number.isInteger(Number(context.season)) || Number(context.season) < 2000 || Number(context.season) > 2100)) {
    return "league_context.season must be a valid calendar year";
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

async function defaultPlayerResolver(players) {
  return resolveNflPlayerInputs(players, { fetchPlayers: sleeperAdapter.fetchSleeperPlayers });
}

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
async function defaultLeagueContextResolver({ userId, platform, leagueId, season = null }) {
  return resolveTradeLeagueContext({
    userId,
    platform,
    leagueId,
    season,
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
      season: requested.season == null ? null : Number(requested.season),
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
