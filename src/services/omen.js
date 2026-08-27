"use strict";

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
const omenSelector = require("./omenSelector");
const { isOmenReadyConnection } = require("./omenReadiness");
const { getCurrentNflWeekContext, isOffSeason } = require("./nflSchedule");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");
const { findTradeCandidate } = require("./tradeLineup");
const { compareTrade } = require("./tradeValue");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const ACTIVE_STATUSES = new Set(["", "P", "PROBABLE", "ACTIVE"]);
const RISK_STATUSES = new Set(["Q", "QUESTIONABLE", "GTD", "DTD", "DOUBTFUL"]);
const OUT_STATUSES = new Set(["O", "OUT", "IR", "IR-R", "PUP", "SUSP"]);
// A weekly-lineup gain may justify only a bounded loss in season-long VORP.
// Keep the policy explicit so it can be tuned without duplicating trade value.
const MAX_VORP_LOSS_PER_WEEKLY_POINT = 1;
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
    && isOmenReadyConnection(row)
  ) || null;
}

function selectUsableEspnMvpConnection(connections = []) {
  return connections.find((row) =>
    row.platform === "espn"
    && isOmenReadyConnection(row)
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
    .select("id,platform,league_id,platform_username,is_active,token_secret_id,espn_secret_id,swid_secret_id,espn_team_id")
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

function exactEspnScoringSignal(platform) {
  if (normalizePlatform(platform) !== "espn") return {};
  return {
    exact_espn_scoring_unavailable: signal(
      "unavailable",
      false,
      "provider_restricted",
      "Omen may recognize some league settings, but cannot yet verify every scoring rule and final ESPN result for this league. Any point-based guidance is not an exact final-score calculation."
    ),
  };
}

function buildSignals({ connected = true, useMockData = false, platform = "yahoo" } = {}) {
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
      "Omen does not generate live lineup advice outside the NFL regular season."
    ),
  };
  response.explanation = {
    summary: "Omen is paused until the NFL regular season starts.",
    why_it_matters: "Live lineup recommendations need current weekly matchups and active rosters.",
    risk: "Showing stale offseason advice would be misleading.",
    confidence: "Confidence is high that no live weekly move should be generated right now.",
    data_used: ["NFL calendar"],
  };
  response.confidence = confidence(
    100,
    "high",
    "The shared NFL calendar is outside the regular season window."
  );
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

function liveEmptyMvpResponse({ roster, connection, connectedPlatforms, waiverSignal = null }) {
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
    confidence: "Confidence is moderate that standing pat is better than forcing a move.",
    data_used: [`${platformLabel} roster`, "normalized lineup slots", "optimizer projection edge"],
  };
  response.confidence = confidence(68, "medium", `No ${platformLabel} lineup swap cleared the optimizer threshold.`);
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
    "This league has not drafted yet, so there is no roster to advise on."
  );
  response.explanation = {
    summary: `Your ${platformLabel} league has not drafted yet.`,
    why_it_matters: "Omen needs a drafted roster before it can weigh a lineup, waiver, or trade move.",
    risk: "Acting on advice for an undrafted team would mean acting on players you do not have.",
    confidence: "Confidence is high that no move exists to recommend before the draft.",
    data_used: [`${platformLabel} league status`],
  };
  response.confidence = confidence(100, "high", `The ${platformLabel} league status is pre-draft.`);
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
function mapWaiverPickupToMvpMove({ roster, connection, connectedPlatforms, outStarter, pickup, waiverSignal = null }) {
  const platform = connection.platform || roster.source || "unknown";
  const platformLabel = displayPlatform(platform);
  const slot = outStarter.selected_position || outStarter.position || "lineup";
  const pickupPoints = finiteNumber(pickup.projected_points) || 0;
  const starterPoints = finiteNumber(outStarter.projected_points) || 0;
  const delta = pickupPoints - starterPoints;
  const statusLabel = STATUS_LABELS[normalizedStatus(outStarter.status)] || "unavailable";

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
      70,
      mvpConfidenceLabelFromScore(70),
      `${outStarter.name} is ${statusLabel} and ${pickup.name} is the best projected ${slot} available in your ${platformLabel} league.`
    ),
    risk: risk("medium", [
      `${outStarter.name} is ${statusLabel}, so the ${slot} slot is already compromised.`,
      `${pickup.name} is unrostered, which usually means limited or unproven volume.`,
      "Waiver priority or FAAB cost is not modeled, so the add may not clear.",
    ]),
    explanation: {
      summary: `Your best live move is to add ${pickup.name} while ${outStarter.name} is ${statusLabel}.`,
      why_it_matters: `${outStarter.name} cannot produce in your ${slot} slot, and ${pickup.name} is the highest-projected available replacement at that position.`,
      risk: `Risk is medium because ${pickup.name} is unrostered and waiver priority is not modeled.`,
      confidence: "Confidence is 70 out of 100.",
      data_used: [
        `${platformLabel} roster`,
        `${platformLabel} available player pool`,
        "player availability status",
        "projected point comparison",
      ],
    },
  };
  response.warnings.push(
    `Waiver priority, FAAB budget, and drop candidates are not modeled — confirm the add is possible in ${platformLabel}.`
  );
  return { status: 200, body: response };
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
async function buildWaiverCandidateForConnection({ connection, roster, espnCredentials = null }) {
  const noAnalysis = { candidate: null, waiverSignal: null };
  if (connection.platform !== "sleeper" && connection.platform !== "espn") return noAnalysis;

  const starters = Array.isArray(roster?.slots?.starters) ? roster.slots.starters : [];
  const outStarter = starters.find((player) => isOutStatus(player?.status));
  // No compromised slot means no waiver need. Do not price a pool to look busy.
  if (!outStarter) {
    return {
      candidate: null,
      waiverSignal: connection.platform === "espn"
        ? signal(
          "unavailable",
          false,
          "espn_available_players",
          "No unavailable ESPN starter required a waiver-pool lookup."
        )
        : null,
    };
  }

  const slotPositions = new Set(
    (Array.isArray(outStarter.eligible_positions) && outStarter.eligible_positions.length
      ? outStarter.eligible_positions
      : [outStarter.position]
    ).filter(Boolean)
  );
  if (!slotPositions.size) return noAnalysis;

  let pool;
  try {
    if (connection.platform === "sleeper") {
      pool = await sleeperAdapter.fetchSleeperAvailablePlayers(
        connection.league_id,
        roster.week,
        String(new Date().getFullYear())
      );
    } else {
      if (!espnCredentials?.espnS2 || !espnCredentials?.swid) return noAnalysis;
      pool = await espnAdapter.fetchEspnWaiverPool(
        connection.league_id,
        espnCredentials.espnS2,
        espnCredentials.swid,
        roster.week
      );
    }
  } catch {
    // A pool failure degrades to the normal empty response. It must never
    // surface as an error or as a recommendation built on partial data.
    return {
      candidate: null,
      waiverSignal: connection.platform === "espn"
        ? signal(
          "unavailable",
          false,
          "espn_available_players",
          "ESPN available-player data is unavailable, so Omen will not generate waiver advice."
        )
        : null,
    };
  }

  const waiverSignal = connection.platform === "espn"
    ? signal(
      "live",
      true,
      "espn_available_players",
      "Available-player and projection data came from the selected ESPN league."
    )
    : null;

  const candidate = (Array.isArray(pool) ? pool : []).filter((player) => {
    // null projection means "unknown", not zero. An unprojected add is not
    // evidence-backed, so it never becomes a recommendation.
    //
    // The null check is explicit and must stay that way: Number(null) is 0,
    // which is finite, so a Number.isFinite guard alone silently admits every
    // unprojected player. That is the same null-vs-zero trap the S0 projection
    // fix exists to prevent.
    const points = player?.projected_points;
    if (points == null || !Number.isFinite(Number(points))) return false;
    const positions = Array.isArray(player?.eligible_positions) && player.eligible_positions.length
      ? player.eligible_positions
      : [player?.position];
    return positions.some((pos) => slotPositions.has(pos));
  }).sort((left, right) =>
    Number(right.projected_points) - Number(left.projected_points)
    || String(left.player_key).localeCompare(String(right.player_key))
  )[0];
  if (!candidate) return { candidate: null, waiverSignal };

  // Same unit as a lineup swap's delta: expected points gained this week. An
  // OUT starter's own projection is subtracted rather than assumed to be zero,
  // so the two types are genuinely comparable instead of merely both numeric.
  const pickupPoints = finiteNumber(candidate.projected_points) || 0;
  const starterPoints = finiteNumber(outStarter.projected_points) || 0;

  return {
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
  };
}

async function buildTradeCandidateForConnection({ connection, roster }) {
  if (connection.platform !== "sleeper") return null;

  let leagueRosters;
  try {
    leagueRosters = await sleeperAdapter.fetchSleeperLeagueRosters(
      connection.league_id,
      roster.week,
      String(new Date().getFullYear())
    );
  } catch {
    // Opponent-roster data is a required signal. A failed read means no trade
    // recommendation, never a partial or guessed one.
    return null;
  }

  const status = String(leagueRosters?.league_status || "").toLowerCase();
  if (status === "pre_draft" || status === "drafting") return null;
  const teams = Array.isArray(leagueRosters?.teams) ? leagueRosters.teams : [];
  const ownTeam = teams.find((team) => String(team?.roster_id) === String(roster?.team_key));
  if (!ownTeam) return null;

  const candidate = findTradeCandidate({
    ownTeam,
    opponentTeams: teams,
    rosterPositions: leagueRosters.roster_positions,
    fairnessGuard: ({ give, receive, userDelta }) => {
      const valuation = compareTrade({ send: [give], receive: [receive] });
      return Number.isFinite(valuation.net_value)
        && valuation.net_value >= -(userDelta * MAX_VORP_LOSS_PER_WEEKLY_POINT);
    },
  });
  if (!candidate) return null;

  return {
    id: `live_omen_trade_${candidate.give.player_key || "unknown"}_${candidate.receive.player_key || "unknown"}`,
    type: "trade_suggestion",
    decisionScore: candidate.userDelta,
    requiredSignalsLive: true,
    contextVerified: true,
    inputKinds: ["live"],
    trade: candidate,
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
    ...exactEspnScoringSignal(platform),
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
        `Risk is ${riskLevel} because this recommendation uses roster and projection math, not waiver availability or trade-acceptance forecasting.`,
      confidence: `Confidence is ${confidenceScore} out of 100.`,
      data_used: [
        `${platformLabel} roster`,
        "starter and bench slots",
        "projected point edge",
        "player availability status",
      ],
    },
  };
  response.warnings.push(`This ${platformLabel} recommendation does not forecast waiver availability or trade acceptance.`);
  return response;
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
    "sleeper_league_rosters",
    "Candidate trade used normalized public Sleeper league rosters without manager identity."
  );
  response.recommendation = {
    id: `live_omen_trade_${give.id || "unknown"}_${receive.id || "unknown"}`,
    type: "trade_suggestion",
    title: `Offer ${give.name} for ${receive.name}`,
    move: `Offer ${give.name} to ${teamName} for ${receive.name}.`,
    primary_player: receive,
    comparison_player: give,
    expected_value_delta: { points: delta, label: expectedValueLabel(delta) },
    confidence: confidence(
      66,
      "medium",
      `Both projected starting lineups improve after the one-for-one swap in this ${platformLabel} league.`
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
      confidence: "Confidence is medium because the roster and projection inputs are live, while acceptance behavior is not modeled.",
      data_used: [
        `${platformLabel} selected roster`,
        `${platformLabel} league rosters`,
        "weekly player projections",
        "optimal lineup comparison",
        "VORP fairness guard",
      ],
    },
  };
  response.warnings.push("Trade acceptance, multi-player packages, draft picks, and future-week value are not modeled.");
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
    .filter(({ player }) =>
      player?.player_key
      && player?.name
      && player?.position
      && !isOutStatus(player.status)
    );

  const candidates = [];
  for (const { player, availabilityRank } of availablePlayers) {
    for (const starter of unavailableStarters) {
      if (starter.position !== player.position) continue;
      candidates.push({ add: player, drop: starter, availabilityRank });
    }
  }

  return candidates.sort((left, right) =>
    left.availabilityRank - right.availabilityRank
    || String(left.add.player_key).localeCompare(String(right.add.player_key))
    || String(left.drop.player_key).localeCompare(String(right.drop.player_key))
  )[0] || null;
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
    "Yahoo's basic available-player response does not include a weekly projection for this waiver recommendation."
  );
  response.signals.waivers = signal(
    "live",
    true,
    "yahoo_available_players",
    "Available-player data came from the selected Yahoo league, ordered by Yahoo average rank."
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
    confidence: confidence(
      60,
      "medium",
      "The selected Yahoo league shows an unavailable starter and an available same-position replacement, but no waiver projection."
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
      confidence: "Confidence is medium because the roster need and availability are live, while a waiver projection is unavailable.",
      data_used: [
        "selected Yahoo roster",
        "starter availability status",
        `Yahoo available-player rank ${waiver.availabilityRank}`,
      ],
    },
  };
  response.warnings.push("Live Yahoo availability supports this replacement; no weekly waiver projection was available.");
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
    return sleeperAdapter.buildNormalizedRoster(
      connection.league_id,
      connection.platform_username,
      week
    );
  }

  if (connection.platform === "espn") {
    const { espnS2, swid } = espnCredentials || await espnCredentialsForConnection(connection);
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

/**
 * Every connection Omen could build a live MVP from. Providers are peers - the
 * order here is a deterministic tie-break, not a ranking. Callers must try each
 * in turn so one dead provider cannot block a user with a healthy league.
 */
function pickLiveMvpConnections(connections = []) {
  return [
    selectUsableSleeperMvpConnection(connections),
    selectUsableEspnMvpConnection(connections),
    selectUsableYahooMvpConnection(connections),
  ].filter(Boolean);
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

async function buildLiveOmenMvpMoveForUser(userId, { contextId = null } = {}) {
  if (isOffSeason()) return offSeasonMvpResponse();

  const connections = await getActivePlatformConnections(userId);
  if (!connections.length) return platformDisconnectedMvpResponse();

  const hasRequestedContext = contextId !== null && contextId !== undefined;
  const selectedContextId = typeof contextId === "string" ? contextId.trim() : "";
  const scopedConnections = hasRequestedContext
    ? connections.filter((candidate) => candidate.id === selectedContextId)
    : connections;
  if (hasRequestedContext && !scopedConnections.length) return contextUnavailableMvpResponse();

  const connectedPlatforms = scopedConnections.map(safePlatformSummary);
  const liveConnections = pickLiveMvpConnections(scopedConnections);
  if (!liveConnections.length) return incompleteConnectionResponse(scopedConnections);

  const week = currentNflWeek();
  let connection = null;
  let roster = null;
  let yahooClient = null;
  let espnCredentials = null;
  let firstFailure = null;

  // Try every usable connection before giving up. A provider that is down,
  // rate-limited, or not yet provisioned must never take down a user whose
  // other league still works.
  for (const candidate of liveConnections) {
    let candidateYahooClient = null;
    let candidateEspnCredentials = null;
    try {
      if (candidate.platform === "yahoo") {
        ({ client: candidateYahooClient } = await getAuthenticatedYahooClient(userId));
      }
      if (candidate.platform === "espn") {
        candidateEspnCredentials = await espnCredentialsForConnection(candidate);
      }
      roster = await buildRosterForConnection(userId, candidate, week, {
        yahooClient: candidateYahooClient,
        espnCredentials: candidateEspnCredentials,
      });
      connection = candidate;
      yahooClient = candidateYahooClient;
      espnCredentials = candidateEspnCredentials;
      break;
    } catch (err) {
      if (!firstFailure) firstFailure = { connection: candidate, err };
    }
  }

  if (!connection) {
    const { connection: failed, err } = firstFailure;
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
  // B2-D4 deterministic selection. Generate a candidate per supported type,
  // then rank — an order of operations, not a type priority. See
  // `Blueprints/specs/b2d-canonical-omen-context-and-capability-contract-v1.md`
  // § Deterministic selection.
  const candidates = [];

  const [swap] = optimizer.evaluateLineup(roster);
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

  const waiverAnalysis = await buildWaiverCandidateForConnection({ connection, roster, espnCredentials });
  const waiverCandidate = waiverAnalysis.candidate;
  const waiverSignal = waiverAnalysis.waiverSignal;
  if (waiverCandidate) candidates.push(waiverCandidate);

  // B2-D3-S: trade reads every public league roster only when lineup and
  // waiver analysis produced no scoreable move. This keeps the larger public
  // surface off the common path and preserves the selected-context boundary.
  // A raw candidate with a zero/invalid score does not count as a move.
  let { selected } = omenSelector.selectDecision(candidates);
  if (!selected) {
    const tradeCandidate = await buildTradeCandidateForConnection({ connection, roster });
    if (tradeCandidate) candidates.push(tradeCandidate);
    ({ selected } = omenSelector.selectDecision(candidates));
  }

  if (!selected) {
    // Yahoo's guarded waiver move is availability-based and deliberately has a
    // null point delta. It therefore cannot enter a selector that only ranks
    // positive numeric edges, but it must remain available when no scoreable
    // decision exists. Preserve its existing live-or-unavailable boundary.
    if (connection.platform === "yahoo") {
      if (unavailableYahooStarters(roster).length === 0) {
        return liveEmptyMvpResponse({ roster, connection, connectedPlatforms });
      }
      try {
        const rawWaiverPool = await yahooClient.getAvailablePlayers(connection.league_id, {
          count: 50,
          sort: "AR",
        });
        const waiver = selectedYahooWaiverCandidate(
          roster,
          rosterSvc.normalizeYahooWaivers(rawWaiverPool)
        );
        if (waiver) {
          return {
            status: 200,
            body: mapYahooWaiverToMvpMove({ roster, waiver, connection, connectedPlatforms }),
          };
        }
        return liveEmptyMvpResponse({
          roster,
          connection,
          connectedPlatforms,
          waiverSignal: signal(
            "live",
            true,
            "yahoo_available_players",
            "Yahoo returned live available-player data, but no safe same-position replacement was found."
          ),
        });
      } catch {
        return liveEmptyMvpResponse({
          roster,
          connection,
          connectedPlatforms,
          waiverSignal: signal(
            "unavailable",
            false,
            "yahoo_available_players",
            "Yahoo available-player data is unavailable, so Omen will not generate waiver advice."
          ),
        });
      }
    }

    // Off-season already short-circuited at the top of this function. The
    // remaining split is pre-draft (no roster exists) vs in-season (a roster
    // exists and simply has no move worth making). An undrafted league must
    // never be told its lineup is fine.
    const preDraft = await preDraftGuard({ connection, roster, connectedPlatforms });
    if (preDraft) return preDraft;
    return liveEmptyMvpResponse({
      roster,
      connection,
      connectedPlatforms,
      waiverSignal,
    });
  }

  if (selected.type === "waiver_pickup") {
    return mapWaiverPickupToMvpMove({
      roster,
      connection,
      connectedPlatforms,
      outStarter: selected.outStarter,
      pickup: selected.pickup,
      waiverSignal,
    });
  }

  if (selected.type === "trade_suggestion") {
    return {
      status: 200,
      body: mapTradeSuggestionToMvpMove({
        roster,
        connection,
        connectedPlatforms,
        trade: selected.trade,
      }),
    };
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
  return result;
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

function offSeasonMockResponse(body = {}) {
  const response = baseEnvelope(body, "off_season");
  response.recommendation = null;
  response.signals = {
    roster: signal(
      "unavailable",
      false,
      "nfl_calendar",
      "Omen does not generate live lineup advice outside the NFL regular season."
    ),
  };
  response.explanation = {
    summary: "Omen is paused until the NFL regular season starts.",
    why_it_matters: "Live lineup recommendations need current weekly matchups and active rosters.",
    risk: "Showing stale offseason advice would be misleading.",
    confidence: "Confidence is high that no live weekly move should be generated right now.",
    data_used: ["NFL calendar"],
  };
  response.confidence = confidence(
    100,
    "high",
    "The shared NFL calendar is outside the regular season window."
  );
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
  offSeasonMvpResponse,
};
