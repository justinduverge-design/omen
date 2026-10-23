"use strict";

const { reasonsFor } = require("./moveReasons");

const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const {
  CONTRACT_VERSION,
  DEFAULT_SCORING_FORMAT,
  LIVE_CONTRACT_VERSION,
  getOmenLiveEmpty,
} = require("./systemContracts");
const { getAuthenticatedYahooClient } = require("./yahooAuth");
const rosterSvc = require("./roster");
const optimizer = require("./optimizer");
const { buildEvidenceWhy } = require("./evidenceWhy");
const { queueDecisionExplanation } = require("./decisionExplanationShadow");
const { assessConfidence, bandFromScore, bandSentence, mvpLabelForBand, scoreForBand } = require("./confidencePolicy");
const omenSelector = require("./omenSelector");
const { isOmenReadyConnection } = require("./omenReadiness");
const { SELECTION_COLUMN, orderBySelection, readConnectionsWithSelection } = require("./activeSelection");
const { getCurrentNflWeekContext, suppressLiveFootballData } = require("./nflSchedule");
const waiverSystemSvc = require("./waiverSystem");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");
const { logger } = require("../middleware/logging");
const { getUsageReader } = require("./footballWarehouse/sharedUsageAccess");
const { readRosterUsage } = require("./usageCorroborationReader");
const { withSpan } = require("./telemetry");
const yahooAdapter = require("../adapters/yahoo");
const { projectYahooPool } = require("./yahooProjections");
const { evaluateTradeForConnection, TRADE_READ_BUDGET_MS } = require("./omenTradeCandidate");
const { buildHold } = require("./omenHold");
const { getRuntime: getSharedWarehouseRuntime } = require("./footballWarehouse/sharedUsageAccess");
const { createSightEnricher } = require("./sightEnrichment");
const { connectionForLeague } = require("./leagueDiscovery");
const { withinLatencyBudget } = require("./latencyBudget");
const { attachDecisionReceipt, createDecisionContext } = require("./decisionContext");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const { createTradeUsageEvidence, usageRowsForTrade } = require("./tradeUsageEvidence");
// Observed usage for the two players in Omen's trade call. Evidence only; a no-op in `supabase` mode.
const tradeUsageEvidence = createTradeUsageEvidence({
  getRuntime: () => getSharedWarehouseRuntime({ logger }),
  getSupabase: () => supabase,
  log: logger,
});
const ACTIVE_STATUSES = new Set(["", "P", "PROBABLE", "ACTIVE"]);
const RISK_STATUSES = new Set(["Q", "QUESTIONABLE", "GTD", "DTD", "DOUBTFUL"]);
const OUT_STATUSES = new Set(["O", "OUT", "IR", "IR-R", "PUP", "SUSP"]);
const STATUS_LABELS = {
  Q: "questionable",
  GTD: "game-time decision",
  DTD: "day-to-day",
  O: "out",
  IR: "ir",
  "IR-R": "ir",
  PUP: "pup",
  SUSP: "suspended",
};

function safePlatformSummary(row) {
  return {
    platform: row.platform,
    league_id: row.league_id || null,
    username: row.platform === "sleeper" ? row.platform_username || null : null,
  };
}

function hasUsableLeagueId(connection) {
  const leagueId = String(connection?.league_id || "").trim();
  return Boolean(leagueId) && leagueId !== connection?.platform;
}

function selectYahooConnection(connections = []) {
  return connections.find((row) => row.platform === "yahoo" && hasUsableLeagueId(row)) || null;
}

function selectUsableYahooMvpConnection(connections = []) {
  return connections.find((row) => row.platform === "yahoo" && row.token_secret_id && hasUsableLeagueId(row)) || null;
}

function selectUsableSleeperMvpConnection(connections = []) {
  return connections.find((row) => row.platform === "sleeper" && isOmenReadyConnection(row)) || null;
}

function selectUsableEspnMvpConnection(connections = []) {
  return connections.find((row) => row.platform === "espn" && isOmenReadyConnection(row)) || null;
}

function normalizedStatus(status) {
  return String(status || "")
    .trim()
    .toUpperCase();
}

function displayStatus(status) {
  const normalized = normalizedStatus(status);
  if (ACTIVE_STATUSES.has(normalized)) return "active";
  return STATUS_LABELS[normalized] || (normalized ? normalized.toLowerCase() : "active");
}

function isRiskyStatus(status) {
  return RISK_STATUSES.has(normalizedStatus(status));
}

function isOutStatus(status) {
  return OUT_STATUSES.has(normalizedStatus(status));
}

const LIVE_LABEL_FOR_BAND = Object.freeze({ confident: "strong lean", leaning: "lean", coin_flip: "slight edge" });

function confidenceLabelFromScore(score) {
  return LIVE_LABEL_FOR_BAND[bandFromScore(score)] || "slight edge";
}

function mvpConfidenceLabelFromScore(score) {
  return mvpLabelForBand(bandFromScore(score));
}

function priorityFromScore(score) {
  if (score >= 75) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function riskLevelForStart(startPlayer = {}) {
  if (isOutStatus(startPlayer.status)) return "high";
  if (isRiskyStatus(startPlayer.status)) return "medium";
  return "low";
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function projectedPoints(player = {}, fallback) {
  const rawProjection = finiteNumber(player.projected_points);
  if (rawProjection !== null) return rawProjection;
  return finiteNumber(fallback);
}

function rosterPlayers(roster = {}) {
  const slots = roster.slots || {};
  return [
    ...(Array.isArray(slots.starters) ? slots.starters : []),
    ...(Array.isArray(slots.bench) ? slots.bench : []),
    ...(Array.isArray(slots.ir) ? slots.ir : []),
  ].filter(Boolean);
}

function findRosterPlayer(roster, playerKey) {
  return rosterPlayers(roster).find((player) => player.player_key === playerKey) || null;
}

function actionPlayer(player, fallback) {
  const source = player || fallback || {};
  return {
    player_key: source.player_key || null,
    name: source.name || "Unknown",
    position: source.position || null,
    team: source.team || null,
    opponent: source.opponent || null,
    projected_points: projectedPoints(source, fallback?.projected),
    status: displayStatus(source.status),
  };
}

function formatDelta(delta) {
  const value = finiteNumber(delta) || 0;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} pts`;
}

function buildEvidence({ swap, startPlayer, sitPlayer }) {
  const evidence = [
    {
      label: "Projection edge",
      value: formatDelta(swap.delta),
      weight: priorityFromScore(swap.confidence),
    },
    {
      label: "Roster slot",
      value: swap.slot || "lineup",
      weight: "medium",
    },
  ];

  if (isRiskyStatus(startPlayer?.status) || isOutStatus(startPlayer?.status)) {
    evidence.push({
      label: "Start-side availability",
      value: `${startPlayer?.name || swap.to.name} ${displayStatus(startPlayer?.status)}`,
      weight: isOutStatus(startPlayer?.status) ? "high" : "medium",
    });
  } else if (isRiskyStatus(sitPlayer?.status) || isOutStatus(sitPlayer?.status)) {
    evidence.push({
      label: "Sit-side availability",
      value: `${sitPlayer?.name || swap.from.name} ${displayStatus(sitPlayer?.status)}`,
      weight: isOutStatus(sitPlayer?.status) ? "high" : "medium",
    });
  }

  return evidence;
}

function mapLineupSwapToOmen({ roster, swap, connection, connectedPlatforms }) {
  const startPlayer = findRosterPlayer(roster, swap.to.player_key);
  const sitPlayer = findRosterPlayer(roster, swap.from.player_key);
  const confidence = finiteNumber(swap.confidence) || 50;
  const delta = finiteNumber(swap.delta) || 0;
  const headline = `Start ${swap.to.name} over ${swap.from.name}`;
  const rosterSlot = swap.slot || sitPlayer?.selected_position || sitPlayer?.position || null;

  return {
    feature: "omen_of_the_week",
    status: "live",
    mode: "live",
    is_mock: false,
    contract_version: LIVE_CONTRACT_VERSION,
    generated_at: new Date().toISOString(),
    season: new Date().getFullYear(),
    week: roster.week || null,
    scoring_format: DEFAULT_SCORING_FORMAT,
    source: {
      platform: "yahoo",
      league_id: connection.league_id,
      team_key: roster.team_key || null,
      roster_source: roster.source || "yahoo",
      connected_platforms: connectedPlatforms,
    },
    recommendation: {
      id: `live-omen-lineup-swap-${swap.to.player_key || "unknown"}`,
      move_type: "lineup_swap",
      priority: priorityFromScore(confidence),
      headline,
      summary:
        `${headline} in the ${rosterSlot || "lineup"} slot. ` +
        `The optimizer sees a ${delta.toFixed(2)} point edge from the normalized Yahoo roster.`,
      confidence_score: confidence,
      confidence_label: confidenceLabelFromScore(confidence),
      risk_level: riskLevelForStart(startPlayer || swap.to),
      primary_action: {
        type: "start_sit",
        roster_slot: rosterSlot,
        start: actionPlayer(startPlayer, swap.to),
        sit: actionPlayer(sitPlayer, swap.from),
        projected_points_delta: delta,
      },
      impact: {
        projected_points_delta: delta,
        win_probability_delta: null,
        floor_delta: null,
        ceiling_delta: null,
      },
      reasoning: [
        swap.reasoning || `${swap.to.name} has the better adjusted projection.`,
        "Live Omen v1 uses normalized roster data and deterministic optimizer math before any LLM enhancement.",
      ],
      evidence: buildEvidence({ swap, startPlayer, sitPlayer }),
      alternatives: [],
      disclaimer:
        "Live Yahoo roster data. Projections and injury tags depend on the currently normalized platform payload.",
    },
  };
}

async function authenticateOmenRequest(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw Object.assign(new Error("Missing bearer token"), { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw Object.assign(new Error("Missing bearer token"), { status: 401 });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw Object.assign(new Error("Invalid or expired token"), { status: 401 });
  }

  return data.user;
}

async function getActivePlatformConnections(userId) {
  const { rows } = await readConnectionsWithSelection(
    supabase,
    userId,
    "id,platform,league_id,platform_username,is_active,token_secret_id,espn_secret_id,swid_secret_id,espn_team_id",
  );
  return Array.isArray(rows) ? rows : [];
}

async function getLiveOmenForUser(userId) {
  const connections = await getActivePlatformConnections(userId);

  if (!connections.length) {
    return getOmenLiveEmpty({
      status: "needs_platform_connection",
      message: "Connect Yahoo, Sleeper, or ESPN before a personalized Omen can be generated.",
      connected_platforms: [],
    });
  }

  const connectedPlatforms = connections.map(safePlatformSummary);
  const yahooConnection = selectYahooConnection(connections);

  if (!yahooConnection) {
    return getOmenLiveEmpty({
      status: "connected_platform_pending_live_engine",
      message:
        "A fantasy platform is connected, but live Omen v1 currently supports Yahoo roster-backed recommendations first.",
      connected_platforms: connectedPlatforms,
    });
  }

  const { client: yahoo } = await getAuthenticatedYahooClient(userId);
  const leagueId = yahooConnection.league_id;
  const cacheKey = `ssff:omen-roster:${userId}:${leagueId}:current`;
  const roster = await rosterSvc.fetchAndNormalizeRoster(yahoo, leagueId, null, cacheKey);
  const [swap] = optimizer.evaluateLineup(roster);

  if (!swap) {
    return getOmenLiveEmpty({
      status: "connected_platform_pending_live_engine",
      message: "Yahoo roster data loaded, but the normalized roster does not currently produce a lineup edge.",
      connected_platforms: connectedPlatforms,
      week: roster.week || null,
    });
  }

  return mapLineupSwapToOmen({
    roster,
    swap,
    connection: yahooConnection,
    connectedPlatforms,
  });
}

const FEATURE = "omen_mvp_move";
const VALID_PLATFORMS = new Set(["yahoo", "sleeper", "espn"]);
const VALID_STATES = new Set([
  "success",
  "empty",
  "off_season",
  "platform_disconnected",
  "pending_live_engine",
  "yahoo_reauth_required",
  "sleeper_league_context_missing",
  "espn_reauth_required",
  "espn_league_context_missing",
  "espn_import_blocked",
  "espn_recovery_needed",
  "error",
]);
const VALID_SIGNAL_STATUSES = new Set(["live", "stub", "mock", "demo", "unavailable"]);

function nowIso() {
  return new Date().toISOString();
}

function requestId() {
  return `omen_req_${Date.now()}`;
}

function normalizePlatform(platform) {
  return String(platform || "yahoo")
    .trim()
    .toLowerCase();
}

function normalizeScoringFormat(scoringFormat) {
  const value = String(scoringFormat || "ppr")
    .trim()
    .toLowerCase();
  return ["ppr", "half_ppr", "standard"].includes(value) ? value : "ppr";
}

function signal(status, used, source, message) {
  if (!VALID_SIGNAL_STATUSES.has(status)) {
    throw new Error(`Invalid signal status: ${status}`);
  }
  return { status, used, source, message };
}

function exactEspnScoringSignal(platform) {
  if (normalizePlatform(platform) !== "espn") return {};
  return {
    exact_espn_scoring_unavailable: signal(
      "unavailable",
      false,
      "provider_restricted",
      "Omen may recognize some league settings, but cannot yet verify every scoring rule and final ESPN result for this league. Any point-based guidance is not an exact final-score calculation.",
    ),
  };
}

function buildSignals({ connected = true, useMockData = false, platform = "yahoo" } = {}) {
  const liveOrMock = useMockData ? "mock" : "live";
  const weatherStatus = useMockData ? "mock" : process.env.OPENWEATHER_API_KEY ? "live" : "stub";

  return {
    roster: signal(
      connected ? liveOrMock : "unavailable",
      connected,
      connected ? "platform_adapter" : "platform_adapter",
      connected
        ? "Roster imported from the selected platform or deterministic mock fixture."
        : "No connected roster is available.",
    ),
    projections: signal(
      useMockData ? "mock" : "stub",
      true,
      useMockData ? "mock_projection_fixture" : "internal_stub",
      "Projection provider is not finalized yet.",
    ),
    weather: signal(
      weatherStatus,
      true,
      weatherStatus === "live" ? "openweathermap" : "weather_fixture_or_stub",
      "Live when OPENWEATHER_API_KEY is configured; stub or mock fallback otherwise.",
    ),
    travel_home_away: signal(
      useMockData ? "mock" : "live",
      true,
      useMockData ? "mock_schedule_fixture" : "espn_scoreboard",
      "Home/away context from ESPN scoreboard or deterministic mock schedule.",
    ),
    game_time_tv: signal(
      useMockData ? "mock" : "live",
      true,
      useMockData ? "mock_schedule_fixture" : "espn_scoreboard",
      "Kickoff and slate context from ESPN scoreboard or deterministic mock schedule.",
    ),
    matchup_dvp: signal(
      "stub",
      false,
      "pending_nflverse_data",
      "Matchup DvP is live from nflverse-data when enough trailing-week opponent data exists; stub fallback otherwise.",
    ),
    waivers: signal(
      useMockData ? "mock" : "stub",
      true,
      useMockData ? "mock_waiver_pool" : "platform_or_mock_pool",
      "Live waiver pool wiring is platform-dependent.",
    ),
    // The private Ollama/Gemma bridge is wired (src/routes/omen.js
    // enrichWithLlm -> src/services/mvpEvidenceEnrichment.js) and is
    // attempted by default for this mock/demo route. This default reflects
    // the pre-attempt state; a successful live narration overwrites it to
    // "live", and a failed/timed-out attempt overwrites it to "unavailable"
    // naming Ollama, never leaving this stale claim in place after a real try.
    llm_reasoning: signal(
      "stub",
      true,
      "template_pending_llm_attempt",
      "This response uses a deterministic template explanation. Live Gemma narration is attempted by default for this route and replaces it when available.",
    ),
    ...exactEspnScoringSignal(platform),
  };
}

function baseEnvelope(body = {}, state = "success") {
  const platform = normalizePlatform(body.platform);
  const explicitMock = Boolean(body.use_mock_data || body.mock_state);
  return {
    contract_version: CONTRACT_VERSION,
    state,
    feature: FEATURE,
    mode: explicitMock ? "mock" : "demo",
    request_id: requestId(),
    generated_at: nowIso(),
    platform: {
      name: platform,
      status: "connected",
      recovery: null,
    },
    league: {
      id: body.league_id || "mock-league-1",
      name: "Mock Omen League",
      season: Number.isInteger(Number(body.season)) ? Number(body.season) : new Date().getFullYear(),
      week: Number.isInteger(Number(body.week)) ? Number(body.week) : 1,
      scoring_format: normalizeScoringFormat(body.scoring_format),
    },
    team: {
      id: body.team_id || "mock-team-1",
      name: "Mock Omen Team",
    },
    signals: buildSignals({ connected: true, useMockData: explicitMock, platform }),
    recommendation: null,
    alternatives: [],
    warnings: [],
  };
}

function liveBaseEnvelope({
  platform = "yahoo",
  platformStatus = "connected",
  recovery = null,
  leagueId = null,
  leagueName = null,
  teamId = null,
  teamName = null,
  season = new Date().getFullYear(),
  week = null,
  scoringFormat = null,
  state = "success",
} = {}) {
  return {
    contract_version: LIVE_CONTRACT_VERSION,
    state,
    feature: FEATURE,
    mode: "live",
    request_id: requestId(),
    generated_at: nowIso(),
    platform: {
      name: platform,
      status: platformStatus,
      recovery,
    },
    league: {
      id: leagueId,
      name: leagueName,
      season,
      week,
      // Live provider scoring is unknown until a lawful, complete provider-rule
      // snapshot is captured. Defaulting this field to PPR mislabels standard
      // and half-PPR leagues and can make the grading worker score them wrong.
      scoring_format: scoringFormat == null ? null : normalizeScoringFormat(scoringFormat),
    },
    team: {
      id: teamId,
      name: teamName,
    },
    signals: {},
    recommendation: null,
    alternatives: [],
    warnings: [],
  };
}

function unavailableSignal(source, message) {
  return signal("unavailable", false, source, message);
}

function liveMvpBlockedResponse({
  status = "error",
  platform = "unknown",
  platformStatus = "error",
  recovery = null,
  code,
  message,
  httpStatus = 409,
  retryable = false,
} = {}) {
  const response = liveBaseEnvelope({
    platform,
    platformStatus,
    recovery,
    state: status,
  });
  response.signals = {
    roster: unavailableSignal("platform_adapter", message || "A usable connected-league roster is not available."),
  };
  response.error = code ? { code, message, retryable } : undefined;
  return { status: httpStatus, body: response };
}

function authRequiredMvpResponse(message = "Authentication is required for Most Valuable Play.") {
  return liveMvpBlockedResponse({
    status: "error",
    platformStatus: "auth_required",
    recovery: {
      code: "sign_in",
      message,
      cta: "Sign In",
    },
    code: "omen_auth_required",
    message,
    httpStatus: 401,
  });
}

function offSeasonMvpResponse() {
  const context = getCurrentNflWeekContext();
  const response = liveBaseEnvelope({
    platform: "unknown",
    platformStatus: "off_season",
    season: context.season,
    week: context.week,
    state: "off_season",
  });
  response.signals = {
    roster: signal(
      "unavailable",
      false,
      "nfl_calendar",
      "Omen does not generate live lineup advice outside the NFL regular season.",
    ),
  };
  response.explanation = {
    summary: "Omen is paused until the NFL regular season starts.",
    why_it_matters: "Live lineup recommendations need current weekly matchups and active rosters.",
    risk: "Showing stale offseason advice would be misleading.",
    confidence: "Omen has no live weekly move to make right now.",
    data_used: ["NFL calendar"],
  };
  response.confidence = noConfidence("The shared NFL calendar is outside the regular season window.");
  response.warnings.push("Live MVP Move is paused outside the NFL regular season.");
  return { status: 200, body: response };
}

function platformDisconnectedMvpResponse() {
  const response = liveBaseEnvelope({
    platform: "unknown",
    platformStatus: "disconnected",
    recovery: {
      code: "connect_platform",
      message: "Connect Yahoo before Omen can produce a live Most Valuable Play.",
      cta: "Connect League",
    },
    state: "platform_disconnected",
  });
  response.signals = {
    roster: unavailableSignal("platform_adapter", "No connected fantasy platform roster is available."),
  };
  return { status: 200, body: response };
}

function contextUnavailableMvpResponse() {
  const message = "The selected league is no longer available. Choose an active connected league and try again.";
  const response = liveBaseEnvelope({
    platform: "unknown",
    platformStatus: "context_unavailable",
    recovery: {
      code: "select_active_league",
      message,
      cta: "Select League",
    },
    state: "context_unavailable",
  });
  response.signals = {
    roster: unavailableSignal("selected_context", message),
  };
  response.error = {
    code: "omen_context_unavailable",
    message,
    retryable: false,
  };
  return { status: 200, body: response };
}

function pendingLiveEngineMvpResponse(connections = []) {
  const preferred =
    connections.find((connection) => connection.platform === "sleeper") ||
    connections.find((connection) => connection.platform === "espn") ||
    connections[0] ||
    {};
  const platform = preferred.platform || "unknown";
  const response = liveBaseEnvelope({
    platform,
    platformStatus: "pending_live_engine",
    recovery: {
      code: "live_engine_pending",
      message:
        "This platform is connected, but it does not have enough usable league context for live Most Valuable Play yet.",
      cta: "Reconnect League",
    },
    leagueId: preferred.league_id || null,
    state: "pending_live_engine",
  });
  response.signals = {
    roster: unavailableSignal(
      `${platform}_adapter`,
      "A platform connection exists, but Omen cannot safely build a live roster from it yet.",
    ),
  };
  response.warnings.push("Live MVP Move requires a usable Yahoo, Sleeper, or ESPN league connection.");
  return { status: 200, body: response };
}

function platformRecoveryMvpResponse({
  platform,
  state,
  code,
  message,
  cta = "Reconnect League",
  fieldsNeeded = [],
  leagueId = null,
  retryable = false,
}) {
  const response = liveBaseEnvelope({
    platform,
    platformStatus: "recovery_needed",
    recovery: {
      code,
      message,
      cta,
      ...(fieldsNeeded.length ? { fields_needed: fieldsNeeded } : {}),
    },
    leagueId,
    state,
  });
  response.signals = {
    roster: unavailableSignal(`${platform}_adapter`, message),
  };
  response.error = { code, message, retryable };
  return { status: 200, body: response };
}

function displayPlatform(platform) {
  const value = String(platform || "").toLowerCase();
  if (value === "espn") return "ESPN";
  if (value === "sleeper") return "Sleeper";
  if (value === "yahoo") return "Yahoo";
  return "Platform";
}

function liveEmptyMvpResponse({ roster, connection, connectedPlatforms, waiverSignal = null, hold = null }) {
  const platform = connection.platform || roster.source || "unknown";
  const platformLabel = displayPlatform(platform);
  const response = liveBaseEnvelope({
    platform,
    leagueId: connection.league_id,
    teamId: roster.team_key || null,
    season: new Date().getFullYear(),
    week: roster.week || null,
    state: "empty",
  });
  response.signals = buildLiveMvpSignals({ connectedPlatforms, platform });
  if (waiverSignal) response.signals.waivers = waiverSignal;
  response.explanation = {
    summary: "No move clears the recommendation threshold this week.",
    why_it_matters: "The current lineup and bench options do not show a strong enough live edge to force a move.",
    risk: "Forcing a marginal lineup change can create avoidable downside.",
    confidence: bandSentence("leaning", "Standing pat is better than forcing a move."),
    data_used: [`${platformLabel} roster`, "normalized lineup slots", "optimizer projection edge"],
  };
  response.confidence = leaningConfidence(`No ${platformLabel} lineup swap cleared the optimizer threshold.`);
  response.quiet_inputs = { injured_starter: require("./quietWeek").starterInjuryState(roster) };
  // Additive: the state stays "empty" so shipped clients keep rendering their empty screen, and a
  // client that knows `hold` can show the real reasons instead.
  if (hold) {
    response.call_kind = "hold";
    response.hold = hold;
    if (hold.projections && hold.projections.available === false) {
      // "No move clears the threshold" would claim a comparison that never happened.
      response.explanation = {
        ...response.explanation,
        summary: `Omen cannot rank a move for this ${platformLabel} league this week.`,
        why_it_matters: `Omen could not build enough usable weekly projections for this ${platformLabel} league, so lineup swaps and trades cannot be scored.`,
        confidence: "Omen has no projection to judge a move against.",
        data_used: [`${platformLabel} roster`],
      };
      response.confidence = noConfidence(`${platformLabel} did not supply weekly projections.`);
    }
  }
  return { status: 200, body: response };
}

/**
 * A league that has not drafted has no rosters, so "no move clears the
 * recommendation threshold" would be a false statement rather than a
 * conservative one. Verified live 2026-07-26: a real `pre_draft` Sleeper league
 * returns `players: []` with `starters: ["0" x 10]` placeholder slots.
 *
 * This is a third state, not a variant of off-season. Off-season means the
 * season is over or not started; pre-draft means this specific league has no
 * team to advise on yet.
 */
function preDraftMvpResponse({ connection, roster, connectedPlatforms }) {
  const platform = connection.platform || roster?.source || "unknown";
  const platformLabel = displayPlatform(platform);
  const response = liveBaseEnvelope({
    platform,
    platformStatus: "pre_draft",
    leagueId: connection.league_id,
    teamId: roster?.team_key || null,
    season: new Date().getFullYear(),
    week: roster?.week || null,
    state: "empty",
  });
  response.signals = buildLiveMvpSignals({ connectedPlatforms, platform });
  response.signals.roster = unavailableSignal(
    `${platform}_league`,
    "This league has not drafted yet, so there is no roster to advise on.",
  );
  response.explanation = {
    summary: `Your ${platformLabel} league has not drafted yet.`,
    why_it_matters: "Omen needs a drafted roster before it can weigh a lineup, waiver, or trade move.",
    risk: "Acting on advice for an undrafted team would mean acting on players you do not have.",
    confidence: "Omen has no move to recommend before the draft.",
    data_used: [`${platformLabel} league status`],
  };
  response.confidence = noConfidence(`The ${platformLabel} league status is pre-draft.`);
  response.warnings.push(`Omen resumes for this league once the ${platformLabel} draft is complete.`);
  return { status: 200, body: response };
}

/**
 * The waiver path is deliberately narrow: a genuinely OUT starter and a real,
 * projected, same-position player in the pool. Anything less declines rather
 * than filling the screen — per issue #162, an honest empty beats a
 * manufactured move.
 *
 * B2-D4 note: the waiver path no longer waits for start/sit to find nothing.
 * Both types now produce candidates and the selector compares them by score.
 * The preconditions above are unchanged — they are what makes the comparison
 * honest, and they are also what keeps the cost near zero, since no pool is
 * ever fetched for a roster with no OUT starter.
 */
/**
 * Describe the league's waiver system in one sentence, for the risk list and
 * the warning. Says only what was verified: a determined FAAB league gets its
 * budget, a determined priority league gets its position, and anything else
 * keeps the original "not modeled" language, which stays true where nothing
 * was read.
 *
 * Never claims the add will clear. §6.2: "Do not imply claim success."
 */
function waiverClearanceNote(model, platformLabel) {
  if (waiverSystemSvc.mayShowFaab(model) && typeof model.budget_remaining === "number") {
    return `This is a FAAB league and you have $${model.budget_remaining} left; the add still has to win its bid.`;
  }
  if (waiverSystemSvc.mayShowPriority(model) && typeof model.priority_position === "number") {
    return `This is a waiver-priority league and you are number ${model.priority_position}; the add may not clear.`;
  }
  return `Waiver priority, FAAB budget, and drop candidates are not modeled — confirm the add is possible in ${platformLabel}.`;
}

function mapWaiverPickupToMvpMove({
  roster,
  connection,
  connectedPlatforms,
  outStarter,
  pickup,
  waiverSignal = null,
  waiverSystemModel = null,
}) {
  const platform = connection.platform || roster.source || "unknown";
  const platformLabel = displayPlatform(platform);
  const slot = outStarter.selected_position || outStarter.position || "lineup";
  const pickupPoints = finiteNumber(pickup.projected_points) || 0;
  const starterPoints = finiteNumber(outStarter.projected_points) || 0;
  const delta = pickupPoints - starterPoints;
  const statusLabel = STATUS_LABELS[normalizedStatus(outStarter.status)] || "unavailable";
  // A waiver add still has to clear waivers, so it never reads above a lean.
  const waiverPickupVerdict = (() => {
    const v = assessConfidence({
      gap: delta,
      sitStatus: outStarter.status,
      startStatus: pickup.status,
      maxBand: "leaning",
    });
    return { ...v, score: scoreForBand(v.band) ?? 50 };
  })();

  const response = liveBaseEnvelope({
    platform,
    leagueId: connection.league_id,
    teamId: roster.team_key || null,
    season: new Date().getFullYear(),
    week: roster.week || null,
    state: "success",
  });

  response.signals = buildLiveMvpSignals({ connectedPlatforms, platform });
  if (waiverSignal) response.signals.waivers = waiverSignal;
  response.recommendation = {
    id: `live_omen_waiver_${pickup.player_key || "unknown"}`,
    type: "waiver_pickup",
    title: `Add ${pickup.name} for ${outStarter.name}`,
    move: `Pick up ${pickup.name} to cover your ${slot} slot while ${outStarter.name} is ${statusLabel}.`,
    primary_player: playerForMvp(pickup, pickup),
    comparison_player: playerForMvp(outStarter, outStarter),
    expected_value_delta: {
      points: delta,
      label: expectedValueLabel(delta),
    },
    confidence: confidence(
      waiverPickupVerdict.score,
      mvpLabelForBand(waiverPickupVerdict.band),
      `${outStarter.name} is ${statusLabel} and ${pickup.name} is the best projected ${slot} available in your ${platformLabel} league.`,
    ),
    risk: risk("medium", [
      `${outStarter.name} is ${statusLabel}, so the ${slot} slot is already compromised.`,
      `${pickup.name} is unrostered, which usually means limited or unproven volume.`,
      waiverClearanceNote(waiverSystemModel, platformLabel),
    ]),
    explanation: {
      summary: `Your best live move is to add ${pickup.name} while ${outStarter.name} is ${statusLabel}.`,
      why_it_matters: `${outStarter.name} cannot produce in your ${slot} slot, and ${pickup.name} is the highest-projected available replacement at that position.`,
      risk: `Risk is medium because ${pickup.name} is unrostered and ${
        waiverSystemSvc.mayShowFaab(waiverSystemModel) || waiverSystemSvc.mayShowPriority(waiverSystemModel)
          ? "the add still has to clear waivers"
          : "waiver priority is not modeled"
      }.`,
      confidence: bandSentence(waiverPickupVerdict.band, waiverPickupVerdict.reason),
      data_used: [
        `${platformLabel} roster`,
        `${platformLabel} available player pool`,
        "player availability status",
        "projected point comparison",
      ],
    },
  };
  response.warnings.push(waiverClearanceNote(waiverSystemModel, platformLabel));
  return { status: 200, body: response };
}

/**
 * Yahoo publishes no player projections. When Omen filled them in (yahooProjections.js: Sleeper's
 * public stat line scored with the Yahoo league's own rules) the response must say so, and must say
 * "approximate" when the league has a scoring rule Omen cannot reproduce. Never claims the number
 * is Yahoo's, and never calls approximate scoring exact.
 */
function yahooProjectionDisclosure(meta) {
  if (!meta || meta.available !== true) return null;
  const approximate = meta.scoring_basis === "approximate_scoring";
  return {
    source: approximate
      ? "sleeper_public_projections_yahoo_scoring_approximate"
      : "sleeper_public_projections_yahoo_scoring",
    message: approximate
      ? "Yahoo gives no projections. These are Sleeper's public weekly projections scored with your Yahoo league's rules; the league has scoring rules Omen cannot reproduce, so the totals are approximate, not exact league scoring."
      : "Yahoo gives no projections. These are Sleeper's public weekly projections re-scored with your Yahoo league's own scoring rules.",
    dataUsed: approximate
      ? "Sleeper public projections, approximately scored with your Yahoo league rules"
      : "Sleeper public projections, scored with your Yahoo league rules",
    warning: approximate
      ? "Projection totals are approximate: this Yahoo league has scoring rules Omen cannot yet reproduce."
      : null,
  };
}

/** The roster and the waiver pool are separate passes; either may have projected, and approximate wins. */
function mergeYahooProjectionMeta(...metas) {
  const available = metas.filter((meta) => meta && meta.available === true);
  if (!available.length) return null;
  return {
    ...available[0],
    scoring_basis: available.some((meta) => meta.scoring_basis === "approximate_scoring")
      ? "approximate_scoring"
      : available[0].scoring_basis,
  };
}

function applyYahooProjectionDisclosure(body, roster, connection, poolMeta = null) {
  if (!body || connection?.platform !== "yahoo") return;
  const disclosure = yahooProjectionDisclosure(mergeYahooProjectionMeta(roster?.projection_meta, poolMeta));
  if (!disclosure) return;
  if (body.signals && typeof body.signals === "object") {
    body.signals.projections = signal("live", true, disclosure.source, disclosure.message);
  }
  const explanation = body.recommendation?.explanation || body.explanation;
  if (explanation && Array.isArray(explanation.data_used)) explanation.data_used.push(disclosure.dataUsed);
  if (disclosure.warning && Array.isArray(body.warnings)) body.warnings.push(disclosure.warning);
}

/**
 * Sleeper and ESPN provide projection-backed pools. Yahoo's availability-only
 * fallback remains separate because it deliberately has no numeric decision
 * score. The analysis returns an optional candidate plus the provider signal
 * needed to distinguish live-empty data from an unavailable pool.
 *
 * Returns the raw pieces plus a decision score rather than a finished envelope,
 * so the selector can compare it against start/sit before anything is rendered.
 */
async function buildWaiverCandidateForConnection({ connection, roster, espnCredentials = null, yahooClient = null }) {
  const noAnalysis = { candidate: null, waiverSignal: null };
  if (connection.platform !== "sleeper" && connection.platform !== "espn" && connection.platform !== "yahoo")
    return noAnalysis;
  if (connection.platform === "yahoo" && !yahooClient) return noAnalysis;

  const starters = Array.isArray(roster?.slots?.starters) ? roster.slots.starters : [];
  const outStarter = starters.find((player) => isOutStatus(player?.status));
  // No compromised slot means no waiver need. Do not price a pool to look busy.
  if (!outStarter) {
    return {
      candidate: null,
      waiverSignal:
        connection.platform === "espn"
          ? signal(
              "unavailable",
              false,
              "espn_available_players",
              "No unavailable ESPN starter required a waiver-pool lookup.",
            )
          : null,
    };
  }

  // Yahoo's eligible_positions also list flex and bench slots (W/R/T, BN, IR); matching on those
  // would offer a quarterback for a receiver slot, so a Yahoo add must share the primary position.
  const slotPositions = new Set(
    (connection.platform !== "yahoo" &&
    Array.isArray(outStarter.eligible_positions) &&
    outStarter.eligible_positions.length
      ? outStarter.eligible_positions
      : [outStarter.position]
    ).filter(Boolean),
  );
  if (!slotPositions.size) return noAnalysis;

  let pool;
  let yahooProjection = null;
  try {
    if (connection.platform === "yahoo") {
      const raw = await yahooClient.getAvailablePlayers(connection.league_id, { count: 50, sort: "AR" });
      const projected = await projectYahooPool(
        yahooClient,
        connection.league_id,
        roster.week,
        rosterSvc.normalizeYahooWaivers(raw),
        { rosterMeta: roster.projection_meta },
      );
      pool = projected.pool;
      yahooProjection = projected.projectionMeta;
    } else if (connection.platform === "sleeper") {
      pool = await sleeperAdapter.fetchSleeperAvailablePlayers(
        connection.league_id,
        roster.week,
        String(new Date().getFullYear()),
      );
    } else {
      if (!espnCredentials?.espnS2 || !espnCredentials?.swid) return noAnalysis;
      pool = await espnAdapter.fetchEspnWaiverPool(
        connection.league_id,
        espnCredentials.espnS2,
        espnCredentials.swid,
        roster.week,
      );
    }
  } catch {
    // A pool failure degrades to the normal empty response. It must never
    // surface as an error or as a recommendation built on partial data. Yahoo's availability
    // fallback (selectedYahooWaiverCandidate below) reports the unreadable pool without a retry.
    return {
      yahooPoolFailed: connection.platform === "yahoo",
      candidate: null,
      waiverSignal:
        connection.platform === "espn"
          ? signal(
              "unavailable",
              false,
              "espn_available_players",
              "ESPN available-player data is unavailable, so Omen will not generate waiver advice.",
            )
          : null,
    };
  }

  const yahooDisclosure = yahooProjectionDisclosure(yahooProjection);
  const waiverSignal =
    connection.platform === "espn"
      ? signal(
          "live",
          true,
          "espn_available_players",
          "Available-player and projection data came from the selected ESPN league.",
        )
      : connection.platform === "yahoo" && yahooDisclosure
        ? signal(
            "live",
            true,
            "yahoo_available_players",
            `Available players came from the selected Yahoo league. ${yahooDisclosure.message}`,
          )
        : null;

  // §6.2 verification for this surface. Omen of the Week previously told every
  // user "FAAB budget is not modeled" — true then, but false for a Sleeper
  // league once waiver analysis started modelling it. The same league must not
  // describe its own waiver system two different ways on two screens.
  //
  // ESPN stays not_determined: its probe is spec Phase 0 and is not built.
  let waiverSystemModel = waiverSystemSvc.undetermined("waiver system not read for this surface");
  if (connection.platform === "sleeper") {
    try {
      const league = await sleeperAdapter.fetchSleeperLeague(connection.league_id);
      const user = await sleeperAdapter.fetchSleeperUser(connection.platform_username);
      const raw = await sleeperAdapter.fetchSleeperRoster(connection.league_id, user.user_id);
      waiverSystemModel = waiverSystemSvc.fromSleeper({ league, roster: raw.roster });
    } catch {
      // not_determined. A settings read must never break the week's recommendation.
    }
  }

  const candidate = (Array.isArray(pool) ? pool : [])
    .filter((player) => {
      // null projection means "unknown", not zero. An unprojected add is not
      // evidence-backed, so it never becomes a recommendation.
      //
      // The null check is explicit and must stay that way: Number(null) is 0,
      // which is finite, so a Number.isFinite guard alone silently admits every
      // unprojected player. That is the same null-vs-zero trap the S0 projection
      // fix exists to prevent.
      const points = player?.projected_points;
      if (points == null || !Number.isFinite(Number(points))) return false;
      const positions =
        Array.isArray(player?.eligible_positions) && player.eligible_positions.length
          ? player.eligible_positions
          : [player?.position];
      return positions.some((pos) => slotPositions.has(pos));
    })
    .sort(
      (left, right) =>
        Number(right.projected_points) - Number(left.projected_points) ||
        String(left.player_key).localeCompare(String(right.player_key)),
    )[0];
  if (!candidate) {
    return {
      candidate: null,
      waiverSignal,
      waiverSystemModel,
      yahooProjection,
      yahooPool: connection.platform === "yahoo" ? pool : null,
    };
  }

  // Same unit as a lineup swap's delta: expected points gained this week. An
  // OUT starter's own projection is subtracted rather than assumed to be zero,
  // so the two types are genuinely comparable instead of merely both numeric.
  const pickupPoints = finiteNumber(candidate.projected_points) || 0;
  const starterPoints = finiteNumber(outStarter.projected_points) || 0;

  return {
    waiverSystemModel,
    candidate: {
      id: `live_omen_waiver_${candidate.player_key || "unknown"}`,
      type: "waiver_pickup",
      decisionScore: pickupPoints - starterPoints,
      requiredSignalsLive: true,
      contextVerified: true,
      inputKinds: ["live"],
      outStarter,
      pickup: candidate,
    },
    waiverSignal,
    yahooProjection,
  };
}

/**
 * Weigh a trade for the selected league on any provider (see omenTradeCandidate.js for the rules
 * and the honest-unavailable reasons). Returns the evaluation, plus the selector candidate when a
 * trade cleared.
 */
async function evaluateTradeForSelectedConnection({ connection, roster, espnCredentials = null, yahooAuth = null }) {
  const evaluation = await evaluateTradeForConnection({
    connection,
    roster,
    platformLabel: displayPlatform(connection.platform),
    deps: {
      adapters: { sleeper: sleeperAdapter, espn: espnAdapter, yahoo: yahooAdapter },
      credentials: espnCredentials,
      yahooAuth,
      getRuntime: () => getSharedWarehouseRuntime({ logger }),
      logger,
      // The league-wide read is an extra provider call on a request that already made one.
      // It is bounded so a slow provider costs the user a stated reason, not a spinner.
      withinBudget: (fn) => withinLatencyBudget("omen_trade_read", TRADE_READ_BUDGET_MS, fn),
      // The budget tripping means a user silently lost their trade suggestion. That must be
      // visible: the 2026-09-05 outage ran for most of a day partly because the only signal was
      // a watchdog restarting a wedged container 650 times, which nobody was reading as a bug.
      onBudgetExceeded: (stats, shape) => {
        logger.warn("Trade search budget exceeded; no suggestion issued", {
          solves: stats.solves,
          elapsed_ms: stats.elapsedMs,
          opponents: shape.opponents,
          own_players: shape.own_players,
        });
      },
    },
  });
  if (evaluation.status !== "candidate") return { evaluation, selectorCandidate: null };
  const candidate = evaluation.candidate;
  const usage = await tradeUsageEvidence([candidate.give, candidate.receive], {
    season: getCurrentNflWeekContext().season,
    week: roster?.week,
  });
  candidate.usage_evidence = usageRowsForTrade(candidate, usage.byKey);
  return {
    evaluation,
    selectorCandidate: {
      id: `live_omen_trade_${candidate.give.player_key || "unknown"}_${candidate.receive.player_key || "unknown"}`,
      type: "trade_suggestion",
      decisionScore: candidate.userDelta,
      requiredSignalsLive: true,
      contextVerified: true,
      inputKinds: ["live"],
      trade: candidate,
    },
  };
}

/**
 * Pre-draft is only knowable from league metadata, so it is checked lazily —
 * once start/sit has already declined — rather than on every request.
 */
async function preDraftGuard({ connection, roster, connectedPlatforms }) {
  if (connection.platform !== "sleeper") return null;
  let league;
  try {
    league = await sleeperAdapter.fetchSleeperLeague(connection.league_id);
  } catch {
    return null;
  }
  const status = typeof league?.status === "string" ? league.status.toLowerCase() : "";
  if (status !== "pre_draft" && status !== "drafting") return null;
  return preDraftMvpResponse({ connection, roster, connectedPlatforms });
}

function expectedValueLabel(delta) {
  const value = Math.abs(Number(delta) || 0);
  if (value >= 5) return "major";
  if (value >= 2) return "meaningful";
  return "small";
}

function riskReasonsForSwap({ startPlayer, sitPlayer, swap, platform }) {
  const platformLabel = displayPlatform(platform);
  // Reasons first (moveReasons.js): who is out or hurt, Omen's read of both players, then the lineup change.
  const reasons = reasonsFor({ gain: startPlayer, lose: sitPlayer, lineupGain: swap?.delta });
  if (!reasons.length) reasons.push(`Your ${platformLabel} lineup gains ${formatDelta(swap.delta)} with this swap.`);
  reasons.push(`Waiver and trade market signals are not part of this first live ${platformLabel} MVP Move.`);
  return reasons;
}

function playerForMvp(player, fallback) {
  const source = player || fallback || {};
  return {
    id: source.player_key || null,
    name: source.name || "Unknown",
    position: source.position || null,
    team: source.team || null,
    opponent_team: source.opponent || null,
    // Kept on the Ledger so grading can tell a contested call from an easy one (the alternative was OUT or on bye).
    status: source.projection_basis === "bye_week" ? "BYE" : source.status || null,
  };
}

function buildLiveMvpSignals({ connectedPlatforms = [], platform = "yahoo" } = {}) {
  const platformLabel = displayPlatform(platform);
  return {
    roster: signal("live", true, `${platform}_roster`, `Roster imported from the connected ${platformLabel} league.`),
    projections: signal(
      "live",
      true,
      `${platform}_roster_or_optimizer_projection`,
      "Projection edge comes from normalized roster projection fields and optimizer math.",
    ),
    weather: signal(
      process.env.OPENWEATHER_API_KEY ? "live" : "stub",
      Boolean(process.env.OPENWEATHER_API_KEY),
      process.env.OPENWEATHER_API_KEY ? "openweathermap" : "weather_not_used",
      process.env.OPENWEATHER_API_KEY
        ? "Weather provider is configured, but weather is not decision-critical for this lineup swap."
        : `Weather is not used in this first live ${platformLabel} MVP Move.`,
    ),
    travel_home_away: signal(
      "stub",
      false,
      "pending_schedule_context",
      `Home/away and travel context are not decision-critical for this first live ${platformLabel} MVP Move.`,
    ),
    game_time_tv: signal(
      "stub",
      false,
      "pending_schedule_context",
      `Kickoff and TV context are not decision-critical for this first live ${platformLabel} MVP Move.`,
    ),
    matchup_dvp: signal(
      "stub",
      false,
      "pending_nflverse_data",
      "Matchup DvP is attempted only when the selected player has enough opponent context.",
    ),
    waivers: signal(
      "unavailable",
      false,
      `not_in_scope_for_${platform}_mvp_v1`,
      `Waiver pool is not used in this first live ${platformLabel} MVP Move.`,
    ),
    // Same bridge as buildSignals() above, but the live MVP route gates this
    // route's narration behind an explicit `include_signals.llm_reasoning:
    // true` request (native clients already send it). This default reflects
    // the pre-attempt/opted-out state; enrichWithLlm overwrites it to "live"
    // on success or "unavailable" naming Ollama on a real attempted failure.
    llm_reasoning: signal(
      "stub",
      true,
      "template_pending_llm_attempt",
      "This response uses a deterministic template explanation from optimizer facts. Live Gemma narration runs only when requested via include_signals.llm_reasoning.",
    ),
    connected_platforms: signal(
      "live",
      connectedPlatforms.length > 0,
      "platform_connections",
      `${connectedPlatforms.length} active platform connection(s) considered.`,
    ),
    ...exactEspnScoringSignal(platform),
  };
}

/**
 * Replace the first-MVP placeholder signals with what the call actually used, once Omen's read,
 * the warehouse stats and the Omen Grades are attached to the call's players (founder, 2026-10-19:
 * "what moved this call? that's what Sight is"). Placeholders for inputs this call never needed
 * (waivers, kickoff/TV, travel) are removed, so nothing shows as "couldn't read" that was never
 * asked for. Real reads become live signals with the numbers in their statement.
 */
const STALE_MVP_SIGNALS = ["waivers", "travel_home_away", "game_time_tv"];

function refreshEvidenceSignals(body) {
  const rec = body?.recommendation;
  if (!rec || !body.signals || typeof body.signals !== "object") return body;
  const players = [rec.primary_player, rec.comparison_player].filter((p) => p && typeof p === "object");
  if (!players.length) return body;
  const fmt = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(1) : null);

  // Placeholders go only when real evidence replaces them (Sight on and attached), never a live
  // signal, and never the input the call itself used (waivers on a waiver call).
  const hasEvidence = players.some((p) => p.sight || p.stats || p.rating);
  if (hasEvidence) {
    const callType = String(rec.type || "");
    for (const key of STALE_MVP_SIGNALS) {
      if (body.signals[key]?.status === "live") continue;
      if (key === "waivers" && callType.includes("waiver")) continue;
      delete body.signals[key];
    }
    if (body.signals.weather && body.signals.weather.status !== "live") delete body.signals.weather;
    if (body.signals.matchup_dvp && body.signals.matchup_dvp.status !== "live") delete body.signals.matchup_dvp;
  }

  const reads = players
    .filter((p) => fmt(p.sight?.sight_points))
    .map(
      (p) =>
        `${p.name}: Omen ${fmt(p.sight.sight_points)}${fmt(p.projected_points) ? ` vs ${fmt(p.projected_points)} projected` : ""}`,
    );
  if (reads.length) body.signals.omen_read = signal("live", true, "omen_sight", `${reads.join("; ")}.`);

  const drivers = [];
  for (const p of players) {
    for (const d of Array.isArray(p.sight?.drivers) ? p.sight.drivers : []) {
      const pts = Number(d?.points);
      if (!d?.name || !Number.isFinite(pts) || Math.abs(pts) < 0.1) continue;
      drivers.push(`${p.name}: ${String(d.name).replace(/_/g, " ")} ${pts > 0 ? "+" : ""}${pts.toFixed(1)}`);
    }
  }
  if (drivers.length)
    body.signals.what_moved_it = signal("live", true, "omen_sight_drivers", `${drivers.slice(0, 4).join("; ")}.`);

  const stats = players
    .filter((p) => fmt(p.stats?.points_per_game))
    .map((p) => `${p.name}: ${fmt(p.stats.points_per_game)} PPG over ${p.stats.games} games`);
  if (stats.length) body.signals.season_stats = signal("live", true, "nflverse_weekly_stats", `${stats.join("; ")}.`);

  const grades = players
    .filter((p) => fmt(p.rating?.rating))
    .map((p) => `${p.name}: ${fmt(p.rating.rating)} Omen Grade`);
  if (grades.length) body.signals.omen_grade = signal("live", true, "omen_position_grade", `${grades.join("; ")}.`);

  const injuries = players.filter((p) => p.sight?.injury_status).map((p) => `${p.name}: ${p.sight.injury_status}`);
  if (injuries.length)
    body.signals.injuries = signal("live", true, "warehouse_injury_reports", `${injuries.join("; ")}.`);
  return body;
}

// Tagged evidence rows for a lineup swap, from fields the swap already carries. The statements
// quote those fields and nothing else; they feed buildEvidenceWhy.
function swapEvidenceRows({ swap, startPlayer, sitPlayer }) {
  const rows = [];
  const startPoints = swap.to?.projected == null ? null : finiteNumber(swap.to.projected);
  const sitPoints = swap.from?.projected == null ? null : finiteNumber(swap.from.projected);
  if (startPoints != null && sitPoints != null && swap.to?.name && swap.from?.name) {
    rows.push({
      category: "player_game_fact",
      kind: "projection",
      statement: `${swap.to.name} projects ${startPoints} and ${swap.from.name} projects ${sitPoints}.`,
    });
  }
  for (const [player, fallback] of [
    [startPlayer, swap.to],
    [sitPlayer, swap.from],
  ]) {
    const status = player?.status ?? fallback?.status;
    if (!(isRiskyStatus(status) || isOutStatus(status))) continue;
    rows.push({
      category: "current_status",
      kind: "verified",
      statement: `${player?.name || fallback?.name} is listed ${displayStatus(status)}.`,
    });
  }
  return rows;
}

function mapLineupSwapToMvpMove({ roster, swap, connection, connectedPlatforms }) {
  const platform = connection.platform || roster.source || "unknown";
  const platformLabel = displayPlatform(platform);
  const startPlayer = findRosterPlayer(roster, swap.to.player_key);
  const sitPlayer = findRosterPlayer(roster, swap.from.player_key);
  const confidenceScore = finiteNumber(swap.confidence) || 50;
  const delta = finiteNumber(swap.delta) || 0;
  const rosterSlot = swap.slot || sitPlayer?.selected_position || sitPlayer?.position || "lineup";
  const primary = playerForMvp(startPlayer, swap.to);
  const comparison = playerForMvp(sitPlayer, swap.from);
  const title = `Start ${primary.name} over ${comparison.name}`;
  const riskLevel = riskLevelForStart(startPlayer || swap.to);

  const response = liveBaseEnvelope({
    platform,
    leagueId: connection.league_id,
    teamId: roster.team_key || null,
    season: new Date().getFullYear(),
    week: roster.week || null,
    state: "success",
  });

  response.signals = buildLiveMvpSignals({ connectedPlatforms, platform });
  const swapWhy = buildEvidenceWhy(swapEvidenceRows({ swap, startPlayer, sitPlayer }));
  // Shadow only (DECISION_EXPLANATIONS_MODE): queue this decision's reasons for the local model. No response change.
  queueDecisionExplanation({
    type: "start_sit",
    decision: `Start ${primary.name} over ${comparison.name} at ${rosterSlot}.`,
    why: swapWhy,
  });
  response.recommendation = {
    id: `live_omen_start_sit_${swap.to.player_key || "unknown"}`,
    type: "start_sit",
    title,
    move: `Move ${primary.name} into your ${rosterSlot} slot and bench ${comparison.name}.`,
    primary_player: primary,
    comparison_player: comparison,
    expected_value_delta: {
      points: delta,
      label: expectedValueLabel(delta),
    },
    confidence: confidence(
      confidenceScore,
      mvpConfidenceLabelFromScore(confidenceScore),
      `${swap.confidence_reason || `The optimizer sees a ${formatDelta(delta)} edge.`} It comes from live ${platformLabel} roster context.`,
    ),
    risk: risk(riskLevel, riskReasonsForSwap({ startPlayer, sitPlayer, swap, platform })),
    explanation: {
      summary: `Your best live move is to start ${primary.name} over ${comparison.name}.`,
      // Reasons first (moveReasons.js): availability and Omen's read, the point gap last.
      why_it_matters:
        reasonsFor({ gain: startPlayer, lose: sitPlayer, lineupGain: delta }).join(" ") ||
        `${primary.name} is the better ${rosterSlot} option this week in your ${platformLabel} lineup.`,
      risk: `Risk is ${riskLevel} because this recommendation uses roster and projection math, not waiver availability or trade-acceptance forecasting.`,
      confidence: bandSentence(
        bandFromScore(confidenceScore),
        swap.confidence_reason || "The optimizer weighed the projected point edge.",
      ),
      // Additive: ranked statements built deterministically from tagged evidence rows.
      why_statements: swapWhy,
      data_used: [
        `${platformLabel} roster`,
        "starter and bench slots",
        "projected point edge",
        "player availability status",
      ],
    },
  };
  response.warnings.push(
    `This ${platformLabel} recommendation does not forecast waiver availability or trade acceptance.`,
  );
  return response;
}

function tradeStructure({ opponent, teamName, give, receive }) {
  const rawId = opponent?.team_id ?? opponent?.roster_id ?? opponent?.team_key ?? null;
  const side = (player) => ({ name: player.name, position: player.position || null, player_key: player.id || null });
  return {
    partner_team_name: teamName,
    partner_team_id: rawId == null || rawId === "" ? null : String(rawId),
    give: [side(give)],
    receive: [side(receive)],
  };
}

function mapTradeSuggestionToMvpMove({ roster, connection, connectedPlatforms, trade }) {
  const platform = connection.platform || roster.source || "unknown";
  const platformLabel = displayPlatform(platform);
  const give = playerForMvp(trade.give);
  const receive = playerForMvp(trade.receive);
  const delta = finiteNumber(trade.userDelta) || 0;
  const opponentDelta = finiteNumber(trade.opponentDelta) || 0;
  const teamName = trade.opponent?.team_name || "that team";
  const response = liveBaseEnvelope({
    platform,
    leagueId: connection.league_id,
    teamId: roster.team_key || null,
    season: new Date().getFullYear(),
    week: roster.week || null,
    state: "success",
  });

  response.signals = buildLiveMvpSignals({ connectedPlatforms, platform });
  response.signals.trade_rosters = signal(
    "live",
    true,
    `${platform}_league_rosters`,
    platform === "sleeper"
      ? "Candidate trade used normalized public Sleeper league rosters without manager identity."
      : `Candidate trade used the other ${platformLabel} rosters in this league, read with your connected account.`,
  );
  response.recommendation = {
    id: `live_omen_trade_${give.id || "unknown"}_${receive.id || "unknown"}`,
    type: "trade_suggestion",
    title: `Offer ${give.name} for ${receive.name}`,
    move: `Offer ${give.name} to ${teamName} for ${receive.name}.`,
    // Additive structured form of the same data the sentence above is built from.
    trade: tradeStructure({ opponent: trade.opponent, teamName, give, receive }),
    // Observed warehouse usage for the two players; empty when the warehouse has nothing real to say.
    usage_evidence: Array.isArray(trade.usage_evidence) ? trade.usage_evidence : [],
    primary_player: receive,
    comparison_player: give,
    expected_value_delta: { points: delta, label: expectedValueLabel(delta) },
    confidence: leaningConfidence(
      `Both projected starting lineups improve after the one-for-one swap in this ${platformLabel} league.`,
    ),
    risk: risk("medium", [
      `The other lineup improves by ${formatDelta(opponentDelta)} as well, but that does not predict acceptance.`,
      "This is a one-for-one, projection-backed candidate; packages, draft picks, and future weeks are not modeled.",
      "The VORP fairness guard limits season-long value loss relative to the weekly lineup gain.",
    ]),
    explanation: {
      summary: `Your best live trade candidate is ${give.name} for ${receive.name}.`,
      why_it_matters: `The swap adds ${formatDelta(delta)} to your optimal weekly lineup while also improving ${teamName}'s lineup.`,
      risk: "A fair projected lineup gain is not a guarantee that the other manager will accept the offer.",
      confidence: bandSentence(
        "leaning",
        "The roster and projection inputs are live, while acceptance behavior is not modeled.",
      ),
      data_used: [
        `${platformLabel} selected roster`,
        `${platformLabel} league rosters`,
        "weekly player projections",
        "optimal lineup comparison",
        "VORP fairness guard",
        ...(Array.isArray(trade.usage_evidence) && trade.usage_evidence.length
          ? ["NFL weekly usage (targets, carries, red-zone work)"]
          : []),
      ],
    },
  };
  response.warnings.push(
    "Trade acceptance, multi-player packages, draft picks, and future-week value are not modeled.",
  );
  return response;
}

function unavailableYahooStarters(roster) {
  const starters = Array.isArray(roster?.slots?.starters) ? roster.slots.starters : [];
  return starters
    .filter((player) => player?.player_key && player?.position && isOutStatus(player.status))
    .sort((a, b) => String(a.player_key).localeCompare(String(b.player_key)));
}

function selectedYahooWaiverCandidate(roster, waiverPool = []) {
  const unavailableStarters = unavailableYahooStarters(roster);

  const availablePlayers = waiverPool
    .map((player, index) => ({ player, availabilityRank: index + 1 }))
    .filter(({ player }) => player?.player_key && player?.name && player?.position && !isOutStatus(player.status));

  const candidates = [];
  for (const { player, availabilityRank } of availablePlayers) {
    for (const starter of unavailableStarters) {
      if (starter.position !== player.position) continue;
      candidates.push({ add: player, drop: starter, availabilityRank });
    }
  }

  return (
    candidates.sort(
      (left, right) =>
        left.availabilityRank - right.availabilityRank ||
        String(left.add.player_key).localeCompare(String(right.add.player_key)) ||
        String(left.drop.player_key).localeCompare(String(right.drop.player_key)),
    )[0] || null
  );
}

function mapYahooWaiverToMvpMove({ roster, waiver, connection, connectedPlatforms }) {
  const add = playerForMvp(waiver.add);
  const drop = playerForMvp(waiver.drop);
  const response = liveBaseEnvelope({
    platform: "yahoo",
    leagueId: connection.league_id,
    teamId: roster.team_key || null,
    season: new Date().getFullYear(),
    week: roster.week || null,
    state: "success",
  });

  response.signals = buildLiveMvpSignals({ connectedPlatforms, platform: "yahoo" });
  response.signals.projections = signal(
    "unavailable",
    false,
    "yahoo_available_players",
    "Yahoo's basic available-player response does not include a weekly projection for this waiver recommendation.",
  );
  response.signals.waivers = signal(
    "live",
    true,
    "yahoo_available_players",
    "Available-player data came from the selected Yahoo league, ordered by Yahoo average rank.",
  );
  response.recommendation = {
    id: `live_omen_yahoo_waiver_${add.id || "unknown"}`,
    type: "waiver_pickup",
    title: `Add ${add.name} for ${drop.name}`,
    move: `Add ${add.name} as a ${add.position} replacement for ${drop.name}, who is currently unavailable.`,
    primary_player: add,
    comparison_player: drop,
    expected_value_delta: {
      points: null,
      label: "unavailable",
    },
    confidence: leaningConfidence(
      "The selected Yahoo league shows an unavailable starter and an available same-position replacement, but no waiver projection.",
    ),
    risk: risk("medium", [
      `${drop.name} is unavailable, which creates the roster need.`,
      `${add.name} is currently available in the selected Yahoo league.`,
      "Yahoo's basic available-player response does not include a weekly projection, so Omen does not estimate a point delta.",
    ]),
    explanation: {
      summary: `Add ${add.name} to cover for ${drop.name}.`,
      why_it_matters: `${drop.name} is unavailable and ${add.name} is an available ${add.position} in the selected Yahoo league.`,
      risk: "This is an availability-based replacement, not a projection-backed claim about the better weekly player.",
      confidence: bandSentence(
        "leaning",
        "The roster need and availability are live, while a waiver projection is unavailable.",
      ),
      data_used: [
        "selected Yahoo roster",
        "starter availability status",
        `Yahoo available-player rank ${waiver.availabilityRank}`,
      ],
    },
  };
  response.warnings.push(
    "Live Yahoo availability supports this replacement; no weekly waiver projection was available.",
  );
  return response;
}

function currentNflWeek(now = new Date()) {
  return getCurrentNflWeekContext(now).week;
}

async function vaultDecrypt(secretId) {
  if (!secretId) return null;
  const { data, error } = await supabase.rpc("vault_decrypt_secret", { secret_id: secretId });
  if (error) throw new Error("platform credentials unavailable");
  return data?.decrypted_secret ?? data?.[0]?.decrypted_secret ?? null;
}

async function espnCredentialsForConnection(connection) {
  const espnS2 = await vaultDecrypt(connection.espn_secret_id);
  const swid = await vaultDecrypt(connection.swid_secret_id);
  if (!espnS2 || !swid) {
    const err = new Error("ESPN credentials missing");
    err.code = "espn_reauth_required";
    throw err;
  }
  return { espnS2, swid };
}

async function buildRosterForConnection(userId, connection, week, { yahooClient = null, espnCredentials = null } = {}) {
  if (connection.platform === "yahoo") {
    const yahoo = yahooClient || (await getAuthenticatedYahooClient(userId)).client;
    const cacheKey = `ssff:omen-mvp:${userId}:${connection.league_id}:current`;
    return rosterSvc.fetchAndNormalizeRoster(yahoo, connection.league_id, null, cacheKey);
  }

  if (connection.platform === "sleeper") {
    return sleeperAdapter.buildNormalizedRoster(connection.league_id, connection.platform_username, week);
  }

  if (connection.platform === "espn") {
    const { espnS2, swid } = espnCredentials || (await espnCredentialsForConnection(connection));
    return espnAdapter.buildNormalizedRoster(connection.league_id, espnS2, swid, week, {
      teamId: connection.espn_team_id || undefined,
    });
  }

  throw new Error(`Unsupported platform: ${connection.platform}`);
}

/**
 * Every connection Omen could build a live MVP from. Providers are peers - the
 * order here is a deterministic tie-break, not a ranking. Callers must try each
 * in turn so one dead provider cannot block a user with a healthy league.
 */
function pickLiveMvpConnections(connections = []) {
  // The user's switcher choice (visual briefs §10.3) comes first when one is
  // persisted; otherwise this is exactly the previous deterministic order.
  const ordered = orderBySelection(connections);
  return [
    selectUsableSleeperMvpConnection(ordered),
    selectUsableEspnMvpConnection(ordered),
    selectUsableYahooMvpConnection(ordered),
  ]
    .filter(Boolean)
    .sort((a, b) => Number(Boolean(b[SELECTION_COLUMN])) - Number(Boolean(a[SELECTION_COLUMN])));
}

function pickLiveMvpConnection(connections = []) {
  return pickLiveMvpConnections(connections)[0] || null;
}

function incompleteConnectionResponse(connections = []) {
  const yahoo = connections.find((row) => row.platform === "yahoo");
  if (yahoo && !selectUsableYahooMvpConnection([yahoo])) {
    return platformRecoveryMvpResponse({
      platform: "yahoo",
      state: "yahoo_reauth_required",
      code: "yahoo_reauth_required",
      message: "Reconnect Yahoo so Omen can refresh the league roster.",
      cta: "Reconnect Yahoo",
      fieldsNeeded: ["Yahoo OAuth token"],
      leagueId: yahoo.league_id || null,
    });
  }

  const sleeper = connections.find((row) => row.platform === "sleeper");
  if (sleeper && !selectUsableSleeperMvpConnection([sleeper])) {
    return platformRecoveryMvpResponse({
      platform: "sleeper",
      state: "sleeper_league_context_missing",
      code: "sleeper_league_context_missing",
      message: "Sleeper needs a username and league id before Omen can produce a live Most Valuable Play.",
      cta: "Reconnect Sleeper",
      fieldsNeeded: ["Sleeper username", "league id"],
      leagueId: sleeper.league_id || null,
    });
  }

  const espn = connections.find((row) => row.platform === "espn");
  if (espn && !selectUsableEspnMvpConnection([espn])) {
    return platformRecoveryMvpResponse({
      platform: "espn",
      state: "espn_reauth_required",
      code: "espn_reauth_required",
      message: "ESPN needs fresh cookie credentials and a league id before Omen can produce a live Most Valuable Play.",
      cta: "Reconnect ESPN",
      fieldsNeeded: ["ESPN_S2", "SWID", "league id"],
      leagueId: espn.league_id || null,
    });
  }

  return pendingLiveEngineMvpResponse(connections);
}

function espnRecoveryFromError(connection, err) {
  const status = err?.status || err?.response?.status;
  const message = String(err?.message || "").toLowerCase();
  if (
    err?.code === "espn_reauth_required" ||
    status === 401 ||
    status === 403 ||
    message.includes("unauthorized") ||
    message.includes("forbidden")
  ) {
    return platformRecoveryMvpResponse({
      platform: "espn",
      state: "espn_reauth_required",
      code: "espn_reauth_required",
      message: "Your ESPN connection needs fresh cookies before Omen can read this league.",
      cta: "Reconnect ESPN",
      fieldsNeeded: ["ESPN_S2", "SWID"],
      leagueId: connection.league_id,
    });
  }

  if (status === 404 || message.includes("team not found") || message.includes("league")) {
    return platformRecoveryMvpResponse({
      platform: "espn",
      state: "espn_league_context_missing",
      code: "espn_league_context_missing",
      message: "Omen could not find that ESPN league or team. Select the league again or re-import ESPN.",
      cta: "Select ESPN League",
      leagueId: connection.league_id,
    });
  }

  return platformRecoveryMvpResponse({
    platform: "espn",
    state: "espn_import_blocked",
    code: "espn_import_blocked",
    message: "ESPN returned an unexpected import response. Retry, reconnect, or verify league access.",
    cta: "Retry ESPN Import",
    leagueId: connection.league_id,
    retryable: true,
  });
}

let usageReaderProvider = () => getUsageReader({ logger });
const attachRosterSight = createSightEnricher({ getRuntime: () => getSharedWarehouseRuntime({ logger }), log: logger });

const MAX_SCOPE_LENGTH = 128;
const LEAGUE_DISCOVERY_BUDGET_MS = 2000;

// A present value is a request. Strings are trimmed; finite numbers are coerced (ESPN league ids are
// numeric); anything else, or anything over-length, is INVALID and fails closed rather than
// silently becoming "no request".
const INVALID_SCOPE = Symbol("invalid_scope");
function requestedText(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) value = String(value);
  if (typeof value !== "string") return INVALID_SCOPE;
  const text = value.trim();
  return text.length > MAX_SCOPE_LENGTH ? INVALID_SCOPE : text;
}

/**
 * Which league this answer is for, stated in the response (`answered_for`), so a client that asked
 * for league X can see that it got league X, and one that asked for nothing can see that the server
 * fell back to the account's selected league (`selection: "account_selected"`).
 */
function annotateAnswerScope(result, scope) {
  const body = result?.body;
  if (!body || typeof body !== "object" || body.state === "off_season") return result;
  const connection = scope.connection;
  if (body.call_kind === undefined && body.recommendation?.type) body.call_kind = body.recommendation.type;
  body.answered_for = {
    context_id: connection?.id ?? null,
    platform: connection?.platform ?? body.platform?.name ?? null,
    league_id: connection?.league_id != null ? String(connection.league_id) : (body.league?.id ?? null),
    team_id: body.team?.id ?? null,
    selection: scope.explicit ? "requested" : "account_selected",
    matched: scope.explicit ? Boolean(connection) : true,
    requested: {
      context_id: scope.requested.contextId,
      league_id: scope.requested.leagueId,
      platform: scope.requested.platform,
    },
  };
  return result;
}

async function buildLiveOmenMvpMoveForUser(userId, { contextId = null, leagueId = null, platform = null } = {}) {
  const raw = {
    contextId: requestedText(contextId),
    leagueId: requestedText(leagueId),
    platform: requestedText(platform),
  };
  const invalid = Object.values(raw).includes(INVALID_SCOPE);
  const clean = (v) => (v === INVALID_SCOPE ? null : v);
  const requested = {
    contextId: clean(raw.contextId),
    // A blank league or platform is "not given"; a blank context_id keeps its legacy meaning (unavailable).
    leagueId: clean(raw.leagueId) || null,
    platform: clean(raw.platform) || null,
  };
  const scope = {
    requested,
    explicit: invalid || requested.contextId !== null || requested.leagueId !== null || requested.platform !== null,
    connection: null,
  };
  if (invalid) return annotateAnswerScope(contextUnavailableMvpResponse(), scope);
  const result = await buildLiveOmenMvpMoveForUserInner(userId, requested, scope);
  return annotateAnswerScope(result, scope);
}

async function buildLiveOmenMvpMoveForUserInner(userId, requested, scope) {
  if (suppressLiveFootballData()) return offSeasonMvpResponse();

  const connections = await withSpan("omen.db.read", () => getActivePlatformConnections(userId));
  if (!connections.length) return platformDisconnectedMvpResponse();

  let scopedConnections = connections;
  if (requested.contextId !== null) {
    scopedConnections = scopedConnections.filter((candidate) => candidate.id === requested.contextId);
  }
  if (requested.leagueId) {
    const wantedPlatform = requested.platform ? requested.platform.toLowerCase() : null;
    const bound = scopedConnections.filter(
      (candidate) =>
        String(candidate.league_id) === requested.leagueId &&
        (!wantedPlatform || candidate.platform === wantedPlatform),
    );
    if (bound.length) {
      scopedConnections = bound;
    } else {
      // A provider credential is per account, so it can read any league the account plays in. The
      // connection row binds only one league per provider; widening asks the provider to confirm
      // the requested league is the user's before serving it (a client id is never trusted alone).
      // Bounded: discovery is a provider call (ESPN fan lookup, Sleeper/Yahoo league lists); a slow
      // one is treated as "not confirmed", which fails closed.
      const widened = scopedConnections.length
        ? await withinLatencyBudget("league_discovery", LEAGUE_DISCOVERY_BUDGET_MS, () =>
            connectionForLeague(scopedConnections, {
              platform: wantedPlatform,
              leagueId: requested.leagueId,
              userId,
              season: getCurrentNflWeekContext().season,
              isUsable: (row) => pickLiveMvpConnections([row]).length > 0,
            }),
          ).catch(() => null)
        : null;
      scopedConnections = widened ? [widened] : [];
    }
  } else if (requested.platform) {
    scopedConnections = scopedConnections.filter(
      (candidate) => candidate.platform === requested.platform.toLowerCase(),
    );
  }
  if (scope.explicit && !scopedConnections.length) return contextUnavailableMvpResponse();

  const connectedPlatforms = scopedConnections.map(safePlatformSummary);
  const liveConnections = pickLiveMvpConnections(scopedConnections);
  if (!liveConnections.length) return incompleteConnectionResponse(scopedConnections);

  const week = currentNflWeek();
  let connection = null;
  let roster = null;
  let yahooClient = null;
  let yahooAccessToken = null;
  let espnCredentials = null;
  let firstFailure = null;

  // Try every usable connection before giving up. A provider that is down,
  // rate-limited, or not yet provisioned must never take down a user whose
  // other league still works.
  for (const candidate of liveConnections) {
    let candidateYahooClient = null;
    let candidateEspnCredentials = null;
    let candidateYahooAccessToken = null;
    try {
      if (candidate.platform === "yahoo") {
        ({ client: candidateYahooClient, accessToken: candidateYahooAccessToken } =
          await getAuthenticatedYahooClient(userId));
      }
      if (candidate.platform === "espn") {
        candidateEspnCredentials = await espnCredentialsForConnection(candidate);
      }
      roster = await withSpan(
        "omen.provider.read",
        () =>
          buildRosterForConnection(userId, candidate, week, {
            yahooClient: candidateYahooClient,
            espnCredentials: candidateEspnCredentials,
          }),
        { "omen.platform": candidate.platform },
      );
      connection = candidate;
      scope.connection = candidate;
      yahooClient = candidateYahooClient;
      yahooAccessToken = candidateYahooAccessToken;
      espnCredentials = candidateEspnCredentials;
      break;
    } catch (err) {
      if (!firstFailure) firstFailure = { connection: candidate, err };
    }
  }

  if (!connection) {
    const { connection: failed, err } = firstFailure;
    scope.connection = failed;
    if (failed.platform === "espn") return espnRecoveryFromError(failed, err);
    if (failed.platform === "sleeper") {
      return platformRecoveryMvpResponse({
        platform: "sleeper",
        state: "sleeper_league_context_missing",
        code: "sleeper_league_context_missing",
        message: "Sleeper roster import failed. Confirm the username and league selection, then reconnect Sleeper.",
        cta: "Reconnect Sleeper",
        fieldsNeeded: ["Sleeper username", "league id"],
        leagueId: failed.league_id,
        retryable: true,
      });
    }
    throw err;
  }

  // The selector already consumes this selected roster and its projections.
  // Put those facts into the shared receipt before candidate construction, but
  // do not mark them used until a candidate (or an honest empty conclusion)
  // has actually depended on them. This is intentionally request-scoped:
  // adapter-level caches remain responsible for safely keyed cross-request
  // caching and no user/league input is retained by this context.
  const rosterPlayers = [
    ...(Array.isArray(roster?.slots?.starters) ? roster.slots.starters : []),
    ...(Array.isArray(roster?.slots?.bench) ? roster.slots.bench : []),
  ];
  const hasLiveProjection = rosterPlayers.some(
    (player) => player?.projected_points != null && Number.isFinite(Number(player.projected_points)),
  );
  const decisionContext = createDecisionContext({
    profile: "omen_mvp",
    loaders: {
      selected_context: async () => ({ state: "live", source: "owned_platform_connection" }),
      roster: async () => ({ state: "live", source: `${connection.platform}_normalized_roster` }),
      projections: async () =>
        hasLiveProjection
          ? {
              state: "live",
              source:
                connection.platform === "yahoo"
                  ? "sleeper_public_projections_yahoo_scoring"
                  : `${connection.platform}_weekly_projections`,
            }
          : {
              state: "unavailable",
              source: `${connection.platform}_weekly_projections`,
              reason_code: "projection_unavailable",
            },
    },
  });
  await decisionContext.resolveMany(["selected_context", "roster", "projections"]);

  // The waiver pool is projected in its own pass; if the roster pass timed out but this one landed,
  // the response still has to say where its numbers came from.
  let waiverPoolProjection = null;

  function finalizeDecisionResult(result, inputNames = []) {
    for (const name of inputNames) decisionContext.use(name);
    applyYahooProjectionDisclosure(result.body, roster, connection, waiverPoolProjection);
    attachDecisionReceipt(result.body, decisionContext);
    return result;
  }

  // B2-D4 deterministic selection. Generate a candidate per supported type,
  // then rank — an order of operations, not a type priority. See
  // `Blueprints/specs/b2d-canonical-omen-context-and-capability-contract-v1.md`
  // § Deterministic selection.
  const candidates = [];

  // Observed recent usage may corroborate the call's confidence band (same helper as Start/Sit).
  // The read starts now, overlaps the waiver build, and is awaited only before the lineup evaluation.
  // It never rejects; no reader, supabase mode, a failed or slow read all leave today's output as is.
  const lineupUsagePromise = withSpan("omen.warehouse.usage", () =>
    readRosterUsage({
      reader: usageReaderProvider(),
      supabase,
      roster,
      season: getCurrentNflWeekContext().season,
      beforeWeek: roster.week || week,
      log: logger,
    }),
  );

  const waiverAnalysis = await withSpan(
    "omen.decision.waiver",
    () => buildWaiverCandidateForConnection({ connection, roster, espnCredentials, yahooClient }),
    { "omen.platform": connection.platform },
  );
  waiverPoolProjection = waiverAnalysis.yahooProjection || null;
  const lineupUsage = await lineupUsagePromise;
  // Sight on the roster before the lineup call, so Start/Sit weighs Omen's read (never throws, budgeted).
  await attachRosterSight(roster);
  const [swap] = withSpan("omen.decision.lineup", () =>
    optimizer.evaluateLineup(roster, lineupUsage ? { usage: lineupUsage } : {}),
  );
  if (swap) {
    candidates.push({
      id: `live_omen_start_sit_${swap.to?.player_key || "unknown"}`,
      type: "start_sit",
      decisionScore: finiteNumber(swap.delta),
      requiredSignalsLive: true,
      contextVerified: true,
      inputKinds: ["live"],
      swap,
    });
  }

  const waiverCandidate = waiverAnalysis.candidate;
  const waiverSignal = waiverAnalysis.waiverSignal;
  const waiverSystemModel = waiverAnalysis.waiverSystemModel || null;
  if (waiverCandidate) candidates.push(waiverCandidate);

  // B2-D3-S: trade reads every public league roster only when lineup and
  // waiver analysis produced no scoreable move. This keeps the larger public
  // surface off the common path and preserves the selected-context boundary.
  // A raw candidate with a zero/invalid score does not count as a move.
  const selectDecision = () =>
    withSpan("omen.decision.select", (span) => {
      const decision = omenSelector.selectDecision(candidates);
      span.setAttributes({
        "omen.candidates": candidates.length,
        "omen.selected_type": decision.selected?.type || "none",
      });
      return decision;
    });
  let { selected } = selectDecision();
  let tradeEvaluation = null;
  if (!selected) {
    // ESPN and Yahoo are evaluated too (omenTradeCandidate.js). A provider that cannot support a
    // trade answers with a stated reason, which the HOLD call below reports instead of going quiet.
    const trade = await evaluateTradeForSelectedConnection({
      connection,
      roster,
      espnCredentials,
      yahooAuth: { accessToken: yahooAccessToken },
    });
    tradeEvaluation = trade.evaluation;
    if (trade.selectorCandidate) candidates.push(trade.selectorCandidate);
    ({ selected } = selectDecision());
  }

  // The HOLD call: nothing cleared, so say what was weighed and why each option lost.
  const holdFor = (waiver = {}) =>
    buildHold({
      roster,
      platformLabel: displayPlatform(connection.platform),
      waiver: {
        signalMessage: waiver.signalMessage ?? waiverSignal?.message ?? null,
        signalStatus: waiver.signalStatus ?? waiverSignal?.status ?? null,
      },
      trade: tradeEvaluation,
      usage: lineupUsage || null,
      isOut: isOutStatus,
    });

  if (!selected) {
    // Yahoo's guarded waiver move is availability-based and deliberately has a
    // null point delta. It therefore cannot enter a selector that only ranks
    // positive numeric edges, but it must remain available when no scoreable
    // decision exists. Preserve its existing live-or-unavailable boundary.
    if (connection.platform === "yahoo") {
      if (unavailableYahooStarters(roster).length === 0) {
        return finalizeDecisionResult(
          liveEmptyMvpResponse({ roster, connection, connectedPlatforms, hold: holdFor() }),
          ["selected_context", "roster", "projections"],
        );
      }
      try {
        if (waiverAnalysis.yahooPoolFailed) throw new Error("yahoo_pool_unavailable");
        const yahooPool =
          waiverAnalysis.yahooPool ||
          rosterSvc.normalizeYahooWaivers(
            await yahooClient.getAvailablePlayers(connection.league_id, {
              count: 50,
              sort: "AR",
            }),
          );
        const waiver = selectedYahooWaiverCandidate(roster, yahooPool);
        if (waiver) {
          decisionContext.record("waivers", { state: "live", source: "yahoo_available_players" });
          return finalizeDecisionResult(
            {
              status: 200,
              body: mapYahooWaiverToMvpMove({ roster, waiver, connection, connectedPlatforms }),
            },
            ["selected_context", "roster", "waivers"],
          );
        }
        decisionContext.record("waivers", { state: "live", source: "yahoo_available_players" });
        const yahooLiveSignal = signal(
          "live",
          true,
          "yahoo_available_players",
          "Yahoo returned live available-player data, but no safe same-position replacement was found.",
        );
        return finalizeDecisionResult(
          liveEmptyMvpResponse({
            roster,
            connection,
            connectedPlatforms,
            waiverSignal: yahooLiveSignal,
            hold: holdFor({ signalStatus: yahooLiveSignal.status, signalMessage: yahooLiveSignal.message }),
          }),
          ["selected_context", "roster", "projections", "waivers"],
        );
      } catch {
        const yahooUnavailableSignal = signal(
          "unavailable",
          false,
          "yahoo_available_players",
          "Yahoo available-player data is unavailable, so Omen will not generate waiver advice.",
        );
        return finalizeDecisionResult(
          liveEmptyMvpResponse({
            roster,
            connection,
            connectedPlatforms,
            waiverSignal: yahooUnavailableSignal,
            hold: holdFor({
              signalStatus: yahooUnavailableSignal.status,
              signalMessage: yahooUnavailableSignal.message,
            }),
          }),
          ["selected_context", "roster", "projections"],
        );
      }
    }

    // Off-season already short-circuited at the top of this function. The
    // remaining split is pre-draft (no roster exists) vs in-season (a roster
    // exists and simply has no move worth making). An undrafted league must
    // never be told its lineup is fine.
    const preDraft = await preDraftGuard({ connection, roster, connectedPlatforms });
    if (preDraft) return finalizeDecisionResult(preDraft, ["selected_context", "roster"]);
    return finalizeDecisionResult(
      liveEmptyMvpResponse({
        roster,
        connection,
        connectedPlatforms,
        waiverSignal,
        hold: holdFor(),
      }),
      ["selected_context", "roster", "projections"],
    );
  }

  if (selected.type === "waiver_pickup") {
    decisionContext.record("waivers", {
      state: "live",
      source: `${connection.platform}_available_players`,
    });
    return finalizeDecisionResult(
      mapWaiverPickupToMvpMove({
        roster,
        connection,
        connectedPlatforms,
        outStarter: selected.outStarter,
        pickup: selected.pickup,
        waiverSignal,
        waiverSystemModel,
      }),
      ["selected_context", "roster", "projections", "waivers"],
    );
  }

  if (selected.type === "trade_suggestion") {
    decisionContext.record("trade_rosters", { state: "live", source: `${connection.platform}_league_rosters` });
    return finalizeDecisionResult(
      {
        status: 200,
        body: mapTradeSuggestionToMvpMove({
          roster,
          connection,
          connectedPlatforms,
          trade: selected.trade,
        }),
      },
      ["selected_context", "roster", "projections", "trade_rosters"],
    );
  }

  const result = {
    status: 200,
    body: mapLineupSwapToMvpMove({
      roster,
      swap: selected.swap,
      connection,
      connectedPlatforms,
    }),
  };
  if (waiverSignal) result.body.signals.waivers = waiverSignal;
  return finalizeDecisionResult(result, ["selected_context", "roster", "projections"]);
}

function confidence(score, label, rationale) {
  return { score, label, rationale };
}

// States with no projection to judge (off-season, pre-draft) carry no band at all. A null score
// takes the decision brief's named-absence path; it is never Confident, never Coin flip.
function noConfidence(rationale) {
  return { score: null, label: null, rationale };
}

// Pinned to the Leaning band through the policy, not through a lucky number.
function leaningConfidence(rationale) {
  return confidence(scoreForBand("leaning"), mvpLabelForBand("leaning"), rationale);
}

function risk(level, reasons) {
  return { level, reasons };
}

function successResponse(body = {}) {
  const response = baseEnvelope(body, "success");
  response.recommendation = {
    id: "omen_mock_start_sit_1",
    type: "start_sit",
    title: "Start Marquise Vale over Trent Holloway",
    move: "Move Marquise Vale into your WR2 slot and bench Trent Holloway.",
    primary_player: {
      id: "mock-player-marquise-vale",
      name: "Marquise Vale",
      position: "WR",
      team: "DAL",
    },
    comparison_player: {
      id: "mock-player-trent-holloway",
      name: "Trent Holloway",
      position: "WR",
      team: "CHI",
    },
    // This fixture's DvP lookup is permitted only because the opponent is
    // explicitly declared as fixture schedule context. Live responses must
    // still obtain this from the ESPN scoreboard enrichment in the route.
    matchup_context: {
      opponent_team: "PHI",
      source: "mock_schedule_fixture",
      status: "mock",
    },
    expected_value_delta: {
      points: 4.2,
      label: "meaningful",
    },
    confidence: leaningConfidence("The projection gap is clear, but matchup DvP is still stubbed."),
    risk: risk("medium", [
      "Marquise Vale has the stronger weekly role, but one matchup signal is still stubbed.",
      "The recommendation should be treated as a contract-safe preview until live projections are finalized.",
    ]),
    explanation: {
      summary: "Your best move is to start Marquise Vale over Trent Holloway.",
      why_it_matters: "Vale projects for a better weekly role and gives your lineup a higher expected point total.",
      risk: "The recommendation carries medium risk because matchup DvP and some projection inputs are still stubbed.",
      confidence: bandSentence("leaning", "The projection gap is clear, but matchup DvP is still stubbed."),
      data_used: ["connected roster", "weekly projections", "home/away context", "game time context"],
    },
  };
  response.warnings.push("Mock endpoint response. Do not present as final live fantasy advice.");
  return response;
}

function emptyResponse(body = {}) {
  const response = baseEnvelope(body, "empty");
  response.recommendation = null;
  response.explanation = {
    summary: "No move clears the recommendation threshold this week.",
    why_it_matters:
      "Your current lineup is close enough to the available alternatives that Omen should not force a move.",
    risk: "Forcing a marginal move could create more downside than upside.",
    confidence: bandSentence(
      "leaning",
      "Standing pat is reasonable because no alternative clears the recommendation threshold.",
    ),
    data_used: ["connected roster", "weekly projections"],
  };
  response.confidence = leaningConfidence(
    "Available mock alternatives do not clear the current recommendation threshold.",
  );
  return response;
}

function platformDisconnectedResponse(body = {}) {
  const response = baseEnvelope(body, "platform_disconnected");
  response.recommendation = null;
  response.platform.status = "disconnected";
  response.platform.recovery = {
    code: "connect_platform",
    message: `Connect ${response.platform.name} before Omen can read your roster.`,
    cta: `Connect ${response.platform.name}`,
  };
  response.signals = {
    roster: signal("unavailable", false, "platform_adapter", "No connected roster is available."),
  };
  return response;
}

function espnRecoveryResponse(body = {}, state) {
  const response = baseEnvelope({ ...body, platform: "espn" }, state);
  const recoveryByState = {
    espn_reauth_required: {
      status: "reauth_required",
      code: "refresh_espn_cookies",
      message: "Your ESPN connection needs fresh cookies before Omen can read this league.",
      cta: "Reconnect ESPN",
      fields_needed: ["ESPN_S2", "SWID"],
    },
    espn_league_context_missing: {
      status: "league_context_missing",
      code: "select_or_reimport_espn_league",
      message: "Omen could not find that ESPN league or team. Select the league again or re-import ESPN.",
      cta: "Select ESPN League",
    },
    espn_import_blocked: {
      status: "import_blocked",
      code: "verify_espn_access",
      message: "ESPN blocked or returned an unexpected import response. Retry, reconnect, or verify league access.",
      cta: "Retry ESPN Import",
    },
    espn_recovery_needed: {
      status: "recovery_needed",
      code: "recover_espn_connection",
      message: "Omen cannot tell whether ESPN needs reauth, league selection, or a retry. Start ESPN recovery.",
      cta: "Recover ESPN",
    },
  };

  response.recommendation = null;
  response.platform.status = recoveryByState[state].status;
  response.platform.recovery = recoveryByState[state];
  response.signals = {
    roster: signal("unavailable", false, "espn_adapter", "ESPN roster import is blocked until recovery succeeds."),
  };
  return response;
}

function errorResponse(body = {}, message = "Omen could not generate an MVP Move right now.") {
  const response = baseEnvelope(body, "error");
  response.recommendation = null;
  response.signals = {};
  response.error = {
    code: "omen_generation_failed",
    message,
    retryable: true,
  };
  return response;
}

function offSeasonMockResponse(body = {}) {
  const response = baseEnvelope(body, "off_season");
  response.recommendation = null;
  response.signals = {
    roster: signal(
      "unavailable",
      false,
      "nfl_calendar",
      "Omen does not generate live lineup advice outside the NFL regular season.",
    ),
  };
  response.explanation = {
    summary: "Omen is paused until the NFL regular season starts.",
    why_it_matters: "Live lineup recommendations need current weekly matchups and active rosters.",
    risk: "Showing stale offseason advice would be misleading.",
    confidence: "Omen has no live weekly move to make right now.",
    data_used: ["NFL calendar"],
  };
  response.confidence = noConfidence("The shared NFL calendar is outside the regular season window.");
  response.warnings.push("Mock off-season state. Do not present as live fantasy advice.");
  return response;
}

function requestedState(body = {}) {
  const state = body.mock_state || "success";
  return String(state).trim().toLowerCase();
}

function buildOmenMvpMoveResponse(body = {}) {
  const platform = normalizePlatform(body.platform);
  if (!VALID_PLATFORMS.has(platform)) {
    return { status: 400, body: errorResponse(body, "platform must be yahoo, sleeper, or espn") };
  }

  const state = requestedState(body);
  if (!VALID_STATES.has(state)) {
    return { status: 400, body: errorResponse(body, "mock_state must be a supported Omen response state") };
  }

  if (state.startsWith("espn_")) {
    return { status: 200, body: espnRecoveryResponse(body, state) };
  }

  if (state === "empty") {
    return { status: 200, body: emptyResponse(body) };
  }

  if (state === "platform_disconnected") {
    return { status: 200, body: platformDisconnectedResponse(body) };
  }

  if (state === "off_season") {
    return { status: 200, body: offSeasonMockResponse(body) };
  }

  if (state === "error") {
    return { status: 500, body: errorResponse(body) };
  }

  return { status: 200, body: successResponse(body) };
}

module.exports = {
  // Exported for test: this is user-facing waiver language and it must never
  // claim an add will clear.
  waiverClearanceNote,
  authenticateOmenRequest,
  authRequiredMvpResponse,
  buildLiveOmenMvpMoveForUser,
  getActivePlatformConnections,
  getLiveOmenForUser,
  selectYahooConnection,
  mapLineupSwapToOmen,
  FEATURE,
  VALID_SIGNAL_STATUSES,
  VALID_STATES,
  buildOmenMvpMoveResponse,
  buildSignals,
  buildLiveMvpSignals,
  refreshEvidenceSignals,
  offSeasonMvpResponse,
  preDraftMvpResponse,
  mapWaiverPickupToMvpMove,
  mapYahooWaiverToMvpMove,
  mapTradeSuggestionToMvpMove,
  mapLineupSwapToMvpMove,
  // Exported so contract fixtures are built by the production builders, not hand-written.
  liveEmptyMvpResponse,
  annotateAnswerScope,
  // Test seam: replace how the Omen call obtains its usage reader. Returns the previous provider.
  __setUsageReaderProviderForTest(provider) {
    const previous = usageReaderProvider;
    usageReaderProvider = provider;
    return previous;
  },
};
