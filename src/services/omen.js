"use strict";

const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const {
  DEFAULT_SCORING_FORMAT,
  LIVE_CONTRACT_VERSION,
  getOmenLiveEmpty,
} = require("./systemContracts");
const { getAuthenticatedYahooClient } = require("./yahooAuth");
const rosterSvc = require("./roster");
const optimizer = require("./optimizer");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
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

function normalizedStatus(status) {
  return String(status || "").trim().toUpperCase();
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

function confidenceLabelFromScore(score) {
  if (score >= 75) return "strong lean";
  if (score >= 60) return "lean";
  return "slight edge";
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
  const { data, error } = await supabase
    .from("platform_connections")
    .select("platform,league_id,platform_username,is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`platform_connections lookup failed: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
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
      message:
        "Yahoo roster data loaded, but the normalized roster does not currently produce a lineup edge.",
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
  "platform_disconnected",
  "espn_reauth_required",
  "espn_league_context_missing",
  "espn_import_blocked",
  "espn_recovery_needed",
  "error",
]);
const VALID_SIGNAL_STATUSES = new Set(["live", "stub", "mock", "unavailable"]);

function nowIso() {
  return new Date().toISOString();
}

function requestId() {
  return `omen_req_${Date.now()}`;
}

function normalizePlatform(platform) {
  return String(platform || "yahoo").trim().toLowerCase();
}

function normalizeScoringFormat(scoringFormat) {
  const value = String(scoringFormat || "ppr").trim().toLowerCase();
  return ["ppr", "half_ppr", "standard"].includes(value) ? value : "ppr";
}

function signal(status, used, source, message) {
  if (!VALID_SIGNAL_STATUSES.has(status)) {
    throw new Error(`Invalid signal status: ${status}`);
  }
  return { status, used, source, message };
}

function buildSignals({ connected = true, useMockData = false } = {}) {
  const liveOrMock = useMockData ? "mock" : "live";
  const weatherStatus = useMockData
    ? "mock"
    : process.env.OPENWEATHER_API_KEY
      ? "live"
      : "stub";

  return {
    roster: signal(
      connected ? liveOrMock : "unavailable",
      connected,
      connected ? "platform_adapter" : "platform_adapter",
      connected
        ? "Roster imported from the selected platform or deterministic mock fixture."
        : "No connected roster is available."
    ),
    projections: signal(
      useMockData ? "mock" : "stub",
      true,
      useMockData ? "mock_projection_fixture" : "internal_stub",
      "Projection provider is not finalized yet."
    ),
    weather: signal(
      weatherStatus,
      true,
      weatherStatus === "live" ? "openweathermap" : "weather_fixture_or_stub",
      "Live when OPENWEATHER_API_KEY is configured; stub or mock fallback otherwise."
    ),
    travel_home_away: signal(
      useMockData ? "mock" : "live",
      true,
      useMockData ? "mock_schedule_fixture" : "espn_scoreboard",
      "Home/away context from ESPN scoreboard or deterministic mock schedule."
    ),
    game_time_tv: signal(
      useMockData ? "mock" : "live",
      true,
      useMockData ? "mock_schedule_fixture" : "espn_scoreboard",
      "Kickoff and slate context from ESPN scoreboard or deterministic mock schedule."
    ),
    matchup_dvp: signal(
      "stub",
      false,
      "pending_nflverse_data",
      "Matchup DvP is live from nflverse-data when enough trailing-week opponent data exists; stub fallback otherwise."
    ),
    waivers: signal(
      useMockData ? "mock" : "stub",
      true,
      useMockData ? "mock_waiver_pool" : "platform_or_mock_pool",
      "Live waiver pool wiring is platform-dependent."
    ),
    llm_reasoning: signal(
      "stub",
      true,
      "ollama_gemma_or_template",
      "Plain-English explanation is templated until Gemma is wired for this route."
    ),
  };
}

function baseEnvelope(body = {}, state = "success") {
  const platform = normalizePlatform(body.platform);
  return {
    state,
    feature: FEATURE,
    mode: body.use_mock_data || body.mock_state ? "mock" : "hybrid",
    request_id: requestId(),
    generated_at: nowIso(),
    platform: {
      name: platform,
      status: "connected",
      recovery: null,
    },
    league: {
      id: body.league_id || "mock-league-1",
      name: "Mock Corvus League",
      season: Number.isInteger(Number(body.season)) ? Number(body.season) : new Date().getFullYear(),
      week: Number.isInteger(Number(body.week)) ? Number(body.week) : 1,
      scoring_format: normalizeScoringFormat(body.scoring_format),
    },
    team: {
      id: body.team_id || "mock-team-1",
      name: "Mock Corvus Team",
    },
    signals: buildSignals({ connected: true, useMockData: Boolean(body.use_mock_data || body.mock_state) }),
    recommendation: null,
    alternatives: [],
    warnings: [],
  };
}

function confidence(score, label, rationale) {
  return { score, label, rationale };
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
    expected_value_delta: {
      points: 4.2,
      label: "meaningful",
    },
    confidence: confidence(
      74,
      "medium_high",
      "The projection gap is clear, but matchup DvP is still stubbed."
    ),
    risk: risk("medium", [
      "Marquise Vale has the stronger weekly role, but one matchup signal is still stubbed.",
      "The recommendation should be treated as a contract-safe preview until live projections are finalized.",
    ]),
    explanation: {
      summary: "Your best move is to start Marquise Vale over Trent Holloway.",
      why_it_matters: "Vale projects for a better weekly role and gives your lineup a higher expected point total.",
      risk: "The recommendation carries medium risk because matchup DvP and some projection inputs are still stubbed.",
      confidence: "Confidence is 74 out of 100.",
      data_used: [
        "connected roster",
        "weekly projections",
        "home/away context",
        "game time context",
      ],
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
    why_it_matters: "Your current lineup is close enough to the available alternatives that Corvus should not force a move.",
    risk: "Forcing a marginal move could create more downside than upside.",
    confidence: "Confidence is 68 out of 100 that standing pat is reasonable.",
    data_used: ["connected roster", "weekly projections"],
  };
  response.confidence = confidence(
    68,
    "medium",
    "Available mock alternatives do not clear the current recommendation threshold."
  );
  return response;
}

function platformDisconnectedResponse(body = {}) {
  const response = baseEnvelope(body, "platform_disconnected");
  response.recommendation = null;
  response.platform.status = "disconnected";
  response.platform.recovery = {
    code: "connect_platform",
    message: `Connect ${response.platform.name} before Corvus can read your roster.`,
    cta: `Connect ${response.platform.name}`,
  };
  response.signals = {
    roster: signal(
      "unavailable",
      false,
      "platform_adapter",
      "No connected roster is available."
    ),
  };
  return response;
}

function espnRecoveryResponse(body = {}, state) {
  const response = baseEnvelope({ ...body, platform: "espn" }, state);
  const recoveryByState = {
    espn_reauth_required: {
      status: "reauth_required",
      code: "refresh_espn_cookies",
      message: "Your ESPN connection needs fresh cookies before Corvus can read this league.",
      cta: "Reconnect ESPN",
      fields_needed: ["ESPN_S2", "SWID"],
    },
    espn_league_context_missing: {
      status: "league_context_missing",
      code: "select_or_reimport_espn_league",
      message: "Corvus could not find that ESPN league or team. Select the league again or re-import ESPN.",
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
      message: "Corvus cannot tell whether ESPN needs reauth, league selection, or a retry. Start ESPN recovery.",
      cta: "Recover ESPN",
    },
  };

  response.recommendation = null;
  response.platform.status = recoveryByState[state].status;
  response.platform.recovery = recoveryByState[state];
  response.signals = {
    roster: signal(
      "unavailable",
      false,
      "espn_adapter",
      "ESPN roster import is blocked until recovery succeeds."
    ),
  };
  return response;
}

function errorResponse(body = {}, message = "Corvus could not generate an MVP Move right now.") {
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

  if (state === "error") {
    return { status: 500, body: errorResponse(body) };
  }

  return { status: 200, body: successResponse(body) };
}

module.exports = {
  authenticateOmenRequest,
  getActivePlatformConnections,
  getLiveOmenForUser,
  selectYahooConnection,
  mapLineupSwapToOmen,
  FEATURE,
  VALID_SIGNAL_STATUSES,
  VALID_STATES,
  buildOmenMvpMoveResponse,
  buildSignals,
};
