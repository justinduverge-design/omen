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
const { getCurrentNflWeekContext } = require("./nflSchedule");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");

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

function selectUsableYahooMvpConnection(connections = []) {
  return connections.find((row) =>
    row.platform === "yahoo"
    && row.token_secret_id
    && hasUsableLeagueId(row)
  ) || null;
}

function selectUsableSleeperMvpConnection(connections = []) {
  return connections.find((row) =>
    row.platform === "sleeper"
    && row.platform_username
    && hasUsableLeagueId(row)
  ) || null;
}

function selectUsableEspnMvpConnection(connections = []) {
  return connections.find((row) =>
    row.platform === "espn"
    && row.espn_secret_id
    && row.swid_secret_id
    && hasUsableLeagueId(row)
  ) || null;
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

function mvpConfidenceLabelFromScore(score) {
  if (score >= 85) return "high";
  if (score >= 70) return "medium_high";
  if (score >= 55) return "medium";
  return "low";
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
    .select("platform,league_id,platform_username,is_active,token_secret_id,espn_secret_id,swid_secret_id,espn_team_id")
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
      name: "Mock Omen League",
      season: Number.isInteger(Number(body.season)) ? Number(body.season) : new Date().getFullYear(),
      week: Number.isInteger(Number(body.week)) ? Number(body.week) : 1,
      scoring_format: normalizeScoringFormat(body.scoring_format),
    },
    team: {
      id: body.team_id || "mock-team-1",
      name: "Mock Omen Team",
    },
    signals: buildSignals({ connected: true, useMockData: Boolean(body.use_mock_data || body.mock_state) }),
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
  scoringFormat = "ppr",
  state = "success",
} = {}) {
  return {
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
      scoring_format: normalizeScoringFormat(scoringFormat),
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
    roster: unavailableSignal(
      "platform_adapter",
      message || "A usable connected-league roster is not available."
    ),
  };
  response.error = code
    ? { code, message, retryable }
    : undefined;
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

function pendingLiveEngineMvpResponse(connections = []) {
  const preferred = connections.find((connection) => connection.platform === "sleeper")
    || connections.find((connection) => connection.platform === "espn")
    || connections[0]
    || {};
  const platform = preferred.platform || "unknown";
  const response = liveBaseEnvelope({
    platform,
    platformStatus: "pending_live_engine",
    recovery: {
      code: "live_engine_pending",
      message: "This platform is connected, but it does not have enough usable league context for live Most Valuable Play yet.",
      cta: "Reconnect League",
    },
    leagueId: preferred.league_id || null,
    state: "pending_live_engine",
  });
  response.signals = {
    roster: unavailableSignal(
      `${platform}_adapter`,
      "A platform connection exists, but Omen cannot safely build a live roster from it yet."
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

function liveEmptyMvpResponse({ roster, connection, connectedPlatforms }) {
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
  response.explanation = {
    summary: "No move clears the recommendation threshold this week.",
    why_it_matters: "The current lineup and bench options do not show a strong enough live edge to force a move.",
    risk: "Forcing a marginal lineup change can create avoidable downside.",
    confidence: "Confidence is moderate that standing pat is better than forcing a move.",
    data_used: [`${platformLabel} roster`, "normalized lineup slots", "optimizer projection edge"],
  };
  response.confidence = confidence(68, "medium", `No ${platformLabel} lineup swap cleared the optimizer threshold.`);
  return { status: 200, body: response };
}

function expectedValueLabel(delta) {
  const value = Math.abs(Number(delta) || 0);
  if (value >= 5) return "major";
  if (value >= 2) return "meaningful";
  return "small";
}

function riskReasonsForSwap({ startPlayer, sitPlayer, swap, platform }) {
  const platformLabel = displayPlatform(platform);
  const reasons = [
    `The optimizer sees a ${formatDelta(swap.delta)} projection edge from the normalized ${platformLabel} roster.`,
  ];
  if (isRiskyStatus(startPlayer?.status)) {
    reasons.push(`${startPlayer.name} carries availability risk.`);
  }
  if (isOutStatus(sitPlayer?.status)) {
    reasons.push(`${sitPlayer.name} appears unavailable, which strengthens the swap.`);
  }
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
  };
}

function buildLiveMvpSignals({ connectedPlatforms = [], platform = "yahoo" } = {}) {
  const platformLabel = displayPlatform(platform);
  return {
    roster: signal(
      "live",
      true,
      `${platform}_roster`,
      `Roster imported from the connected ${platformLabel} league.`
    ),
    projections: signal(
      "live",
      true,
      `${platform}_roster_or_optimizer_projection`,
      "Projection edge comes from normalized roster projection fields and optimizer math."
    ),
    weather: signal(
      process.env.OPENWEATHER_API_KEY ? "live" : "stub",
      Boolean(process.env.OPENWEATHER_API_KEY),
      process.env.OPENWEATHER_API_KEY ? "openweathermap" : "weather_not_used",
      process.env.OPENWEATHER_API_KEY
        ? "Weather provider is configured, but weather is not decision-critical for this lineup swap."
        : `Weather is not used in this first live ${platformLabel} MVP Move.`
    ),
    travel_home_away: signal(
      "stub",
      false,
      "pending_schedule_context",
      `Home/away and travel context are not decision-critical for this first live ${platformLabel} MVP Move.`
    ),
    game_time_tv: signal(
      "stub",
      false,
      "pending_schedule_context",
      `Kickoff and TV context are not decision-critical for this first live ${platformLabel} MVP Move.`
    ),
    matchup_dvp: signal(
      "stub",
      false,
      "pending_nflverse_data",
      "Matchup DvP is attempted only when the selected player has enough opponent context."
    ),
    waivers: signal(
      "unavailable",
      false,
      `not_in_scope_for_${platform}_mvp_v1`,
      `Waiver pool is not used in this first live ${platformLabel} MVP Move.`
    ),
    llm_reasoning: signal(
      "stub",
      true,
      "template",
      "Plain-English explanation is generated from deterministic optimizer facts."
    ),
    connected_platforms: signal(
      "live",
      connectedPlatforms.length > 0,
      "platform_connections",
      `${connectedPlatforms.length} active platform connection(s) considered.`
    ),
  };
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
      `The optimizer sees a ${formatDelta(delta)} edge from live ${platformLabel} roster context.`
    ),
    risk: risk(riskLevel, riskReasonsForSwap({ startPlayer, sitPlayer, swap, platform })),
    explanation: {
      summary: `Your best live move is to start ${primary.name} over ${comparison.name}.`,
      why_it_matters:
        `${primary.name} grades as the better ${rosterSlot} option by ${formatDelta(delta)} in the normalized ${platformLabel} lineup.`,
      risk:
        `Risk is ${riskLevel} because this first live Omen uses roster and projection math, while waiver/trade context remains out of scope.`,
      confidence: `Confidence is ${confidenceScore} out of 100.`,
      data_used: [
        `${platformLabel} roster`,
        "starter and bench slots",
        "projected point edge",
        "player availability status",
      ],
    },
  };
  response.warnings.push(`Live ${platformLabel} MVP Move v1 covers lineup swaps first; waivers and trades are not included yet.`);
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

async function buildRosterForConnection(userId, connection, week) {
  if (connection.platform === "yahoo") {
    const { client: yahoo } = await getAuthenticatedYahooClient(userId);
    const cacheKey = `ssff:omen-mvp:${userId}:${connection.league_id}:current`;
    return rosterSvc.fetchAndNormalizeRoster(yahoo, connection.league_id, null, cacheKey);
  }

  if (connection.platform === "sleeper") {
    return sleeperAdapter.buildNormalizedRoster(
      connection.league_id,
      connection.platform_username,
      week
    );
  }

  if (connection.platform === "espn") {
    const espnS2 = await vaultDecrypt(connection.espn_secret_id);
    const swid = await vaultDecrypt(connection.swid_secret_id);
    if (!espnS2 || !swid) {
      const err = new Error("ESPN credentials missing");
      err.code = "espn_reauth_required";
      throw err;
    }
    return espnAdapter.buildNormalizedRoster(
      connection.league_id,
      espnS2,
      swid,
      week,
      { teamId: connection.espn_team_id || undefined }
    );
  }

  throw new Error(`Unsupported platform: ${connection.platform}`);
}

function pickLiveMvpConnection(connections = []) {
  return selectUsableYahooMvpConnection(connections)
    || selectUsableSleeperMvpConnection(connections)
    || selectUsableEspnMvpConnection(connections)
    || null;
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
    err?.code === "espn_reauth_required"
    || status === 401
    || status === 403
    || message.includes("unauthorized")
    || message.includes("forbidden")
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

async function buildLiveOmenMvpMoveForUser(userId) {
  const connections = await getActivePlatformConnections(userId);
  if (!connections.length) return platformDisconnectedMvpResponse();

  const connectedPlatforms = connections.map(safePlatformSummary);
  const connection = pickLiveMvpConnection(connections);
  if (!connection) return incompleteConnectionResponse(connections);

  const week = currentNflWeek();
  let roster;
  try {
    roster = await buildRosterForConnection(userId, connection, week);
  } catch (err) {
    if (connection.platform === "espn") return espnRecoveryFromError(connection, err);
    if (connection.platform === "sleeper") {
      return platformRecoveryMvpResponse({
        platform: "sleeper",
        state: "sleeper_league_context_missing",
        code: "sleeper_league_context_missing",
        message: "Sleeper roster import failed. Confirm the username and league selection, then reconnect Sleeper.",
        cta: "Reconnect Sleeper",
        fieldsNeeded: ["Sleeper username", "league id"],
        leagueId: connection.league_id,
        retryable: true,
      });
    }
    throw err;
  }
  const [swap] = optimizer.evaluateLineup(roster);

  if (!swap) {
    return liveEmptyMvpResponse({
      roster,
      connection,
      connectedPlatforms,
    });
  }

  return {
    status: 200,
    body: mapLineupSwapToMvpMove({
      roster,
      swap,
      connection,
      connectedPlatforms,
    }),
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
    why_it_matters: "Your current lineup is close enough to the available alternatives that Omen should not force a move.",
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
    message: `Connect ${response.platform.name} before Omen can read your roster.`,
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
    roster: signal(
      "unavailable",
      false,
      "espn_adapter",
      "ESPN roster import is blocked until recovery succeeds."
    ),
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
};
