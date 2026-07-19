"use strict";

const { getLlmBridgeStatus } = require("./llm");

const CONTRACT_VERSION = "2026-05-18.omen-mock.v1";
const LIVE_CONTRACT_VERSION = "2026-05-18.omen-live.v1";
const DEFAULT_SCORING_FORMAT = "PPR";

function nowIso(now = new Date()) {
  return now.toISOString();
}

function getHealthStatus(now = new Date()) {
  return {
    status: "ok",
    service: "omen-api",
    uptime: process.uptime(),
    timestamp: nowIso(now),
    contract_version: "system-health.v1",
  };
}

function getOmenOfTheWeekMock(now = new Date()) {
  return {
    feature: "omen_of_the_week",
    status: "mock_ready",
    mode: "mock",
    is_mock: true,
    contract_version: CONTRACT_VERSION,
    generated_at: nowIso(now),
    season: 2026,
    week: 1,
    scoring_format: DEFAULT_SCORING_FORMAT,
    recommendation: {
      id: "mock-omen-lineup-swap-001",
      move_type: "lineup_swap",
      priority: "high",
      headline: "Start the higher-floor flex option",
      summary:
        "The mock model prefers the safer flex play because the projected point edge is meaningful and the bench alternative carries more role volatility.",
      confidence_score: 78,
      confidence_label: "strong lean",
      risk_level: "medium",
      primary_action: {
        type: "start_sit",
        roster_slot: "FLEX",
        start: {
          player_key: "mock:wr-starter-candidate",
          name: "Sample WR Starter",
          position: "WR",
          team: "EXA",
          opponent: "OPP",
          projected_points: 14.2,
          status: "active",
        },
        sit: {
          player_key: "mock:rb-bench-candidate",
          name: "Sample RB Bench",
          position: "RB",
          team: "SAM",
          opponent: "DEF",
          projected_points: 10.4,
          status: "questionable",
        },
        projected_points_delta: 3.8,
      },
      impact: {
        projected_points_delta: 3.8,
        win_probability_delta: 4.2,
        floor_delta: 2.1,
        ceiling_delta: -0.6,
      },
      reasoning: [
        "Projection edge favors the starter candidate by 3.8 points.",
        "The bench candidate is tagged questionable, so the floor is lower than the raw projection suggests.",
        "The recommendation is a disciplined weekly edge, not a guaranteed outcome.",
      ],
      evidence: [
        {
          label: "Projection edge",
          value: "+3.8 pts",
          weight: "high",
        },
        {
          label: "Availability risk",
          value: "Bench option questionable",
          weight: "medium",
        },
        {
          label: "Matchup context",
          value: "Neutral mock matchup",
          weight: "low",
        },
      ],
      alternatives: [
        {
          id: "mock-omen-waiver-001",
          move_type: "waiver_pickup",
          headline: "Monitor the top available RB depth add",
          confidence_score: 61,
          risk_level: "medium",
        },
        {
          id: "mock-omen-trade-001",
          move_type: "trade",
          headline: "Hold trade assets until live roster context is connected",
          confidence_score: 54,
          risk_level: "low",
        },
      ],
      disclaimer:
        "Mock data for frontend integration only. Do not present this as live fantasy advice.",
    },
  };
}

function getOmenLiveEmpty({
  status = "needs_platform_connection",
  message = "No personalized Omen is available yet.",
  connected_platforms = [],
  season = 2026,
  week = null,
  scoring_format = DEFAULT_SCORING_FORMAT,
} = {}, now = new Date()) {
  return {
    feature: "omen_of_the_week",
    status,
    mode: "live",
    is_mock: false,
    contract_version: LIVE_CONTRACT_VERSION,
    generated_at: nowIso(now),
    season,
    week,
    scoring_format,
    recommendation: null,
    empty_state: {
      code: status,
      message,
      connected_platforms,
    },
  };
}

function configuredStatus(value) {
  return value ? "configured" : "not_configured";
}

function getPlatformStatus(config, now = new Date()) {
  const llmStatus = getLlmBridgeStatus();

  return {
    status: "ok",
    service: "omen-api",
    mode: "contract_ready",
    generated_at: nowIso(now),
    contract_version: "platform-status.v1",
    endpoints: {
      health: {
        method: "GET",
        path: "/api/health",
        auth_required: false,
        status: "ready",
      },
      omen_of_the_week: {
        method: "POST",
        path: "/api/omen/mvp-move",
        auth_required: false,
        status: "mock_ready_live_auth_gated",
        note: "Mock previews do not require auth. Non-mock live requests require bearer auth and a usable Yahoo, Sleeper, or ESPN league connection.",
      },
      current_week: {
        method: "GET",
        path: "/api/system/current-week",
        auth_required: false,
        status: "ready",
      },
      platform_status: {
        method: "GET",
        path: "/api/platform-status",
        auth_required: false,
        status: "ready",
      },
      user_platform_connections: {
        method: "GET",
        path: "/api/platforms/status",
        auth_required: true,
        status: "ready",
      },
    },
    platforms: {
      yahoo: {
        status: "adapter_ready",
        auth: "oauth2",
        normalized_roster: true,
      },
      sleeper: {
        status: "adapter_ready",
        auth: "username_lookup",
        normalized_roster: true,
      },
      espn: {
        status: "adapter_ready_feature_gated",
        auth: "vault_encrypted_cookies",
        normalized_roster: true,
      },
    },
    dependencies: {
      supabase: {
        status: config.supabaseUrl && config.supabaseServiceKey ? "configured" : "missing_required",
        required: true,
      },
      redis: {
        status: config.redisUrl && config.redisToken ? "configured" : "not_configured",
        required: false,
      },
      openweather: {
        status: configuredStatus(config.openWeatherApiKey),
        required: false,
      },
      llm: {
        ...llmStatus,
        model: llmStatus.model || config.llm.model,
        timeout_ms: llmStatus.timeout_ms || config.llm.timeoutMs,
      },
    },
  };
}

module.exports = {
  CONTRACT_VERSION,
  LIVE_CONTRACT_VERSION,
  DEFAULT_SCORING_FORMAT,
  getHealthStatus,
  getOmenOfTheWeekMock,
  getOmenLiveEmpty,
  getPlatformStatus,
};
