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

module.exports = {
  authenticateOmenRequest,
  getActivePlatformConnections,
  getLiveOmenForUser,
  selectYahooConnection,
  mapLineupSwapToOmen,
};
