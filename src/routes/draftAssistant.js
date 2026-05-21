"use strict";

const express = require("express");
const { Redis } = require("@upstash/redis");
const config = require("../config");
const { logger } = require("../middleware/logging");
const {
  authenticateOmenRequest,
} = require("../services/omen");
const {
  getAuthenticatedYahooClient,
} = require("../services/yahooAuth");
const {
  buildLiveAdpResponse,
  buildMockAdpResponse,
  normalizeAdpQuery,
} = require("../services/adp");

const router = express.Router();
const VALID_SCORING_FORMATS = new Set(["ppr", "half_ppr", "standard"]);
const VALID_RECOMMENDATION_TYPES = [
  "best_available",
  "roster_fit",
  "value_pick",
  "risk_adjusted",
];

function nowIso() {
  return new Date().toISOString();
}

function numberOrDefault(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePositionNeeds(needs) {
  if (!Array.isArray(needs)) return [];
  return needs
    .map((need) => String(need || "").trim().toUpperCase())
    .filter(Boolean);
}

function recommendation({
  rank,
  name,
  position,
  team,
  type,
  headline,
  rationale,
  confidence,
  risk,
  vorp,
}) {
  return {
    rank,
    name,
    position,
    team,
    player: { name, position, team },
    recommendation_type: VALID_RECOMMENDATION_TYPES.includes(type) ? type : "best_available",
    headline,
    rationale,
    reasoning: [rationale],
    confidence_score: confidence,
    risk_level: risk,
    vorp_score: vorp,
  };
}

function buildMockRecommendations(positionNeeds = []) {
  const needs = new Set(positionNeeds);
  const rbNeed = needs.has("RB");
  const wrNeed = needs.has("WR");

  return [
    recommendation({
      rank: 1,
      name: rbNeed ? "Sample RB1" : "Mock WR Starter",
      position: rbNeed ? "RB" : "WR",
      team: "EXA",
      type: rbNeed ? "roster_fit" : "best_available",
      headline: rbNeed
        ? "Secure the sample lead back before the value tier breaks"
        : "Take the mock wideout with the cleanest value profile",
      rationale: rbNeed
        ? "Mock roster context shows RB as a selected need, so this example back gets the strongest VORP-adjusted fit."
        : "Mock board context favors the highest VORP player available without introducing real-player advice.",
      confidence: rbNeed ? 84 : 82,
      risk: "low",
      vorp: rbNeed ? 18.6 : 17.9,
    }),
    recommendation({
      rank: 2,
      name: wrNeed ? "Mock WR Starter" : "Example TE Value",
      position: wrNeed ? "WR" : "TE",
      team: wrNeed ? "SAM" : "COR",
      type: wrNeed ? "roster_fit" : "value_pick",
      headline: wrNeed
        ? "Fill the sample receiver slot with a strong mock target share"
        : "Consider the example tight end before scarcity tightens",
      rationale: wrNeed
        ? "Mock position needs include WR, and this fictional player balances roster fit with a strong VORP score."
        : "Mock tier context says the tight end pool is thinning, making this a reasonable example value pick.",
      confidence: wrNeed ? 77 : 74,
      risk: "medium",
      vorp: wrNeed ? 15.2 : 13.8,
    }),
    recommendation({
      rank: 3,
      name: "Sample Flex Upside",
      position: "WR",
      team: "OMN",
      type: "risk_adjusted",
      headline: "Keep the mock flex option in play as a balanced alternative",
      rationale:
        "This fictional flex recommendation gives the UI a lower-confidence alternative without implying live draft intelligence.",
      confidence: 66,
      risk: "medium",
      vorp: 11.4,
    }),
  ];
}

const redis = config.redisUrl && config.redisToken
  ? new Redis({ url: config.redisUrl, token: config.redisToken })
  : null;

async function getOptionalYahooClient(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  try {
    const user = await authenticateOmenRequest(authHeader);
    const { client } = await getAuthenticatedYahooClient(user.id);
    return client;
  } catch (e) {
    logger.warn("Draft Assistant ADP Yahoo source unavailable", { err: e.message });
    return null;
  }
}

router.post("/recommendations", (req, res) => {
  const body = req.body || {};
  const scoringFormat = VALID_SCORING_FORMATS.has(body.scoring_format)
    ? body.scoring_format
    : "ppr";
  const draftPosition = numberOrDefault(body.draft_position, 5);
  const round = numberOrDefault(body.round, 1);
  const positionNeeds = normalizePositionNeeds(body.position_needs);

  return res.json({
    feature: "draft_assistant",
    status: "mock_ready",
    mode: "mock",
    is_mock: true,
    contract_version: "draft-assistant-recommendations.v1",
    generated_at: nowIso(),
    scoring_format: scoringFormat,
    draft_position: draftPosition,
    round,
    position_needs: positionNeeds,
    note: "Mock recommendations — live Draft Assistant requires session + platform data.",
    recommendations: buildMockRecommendations(positionNeeds),
  });
});

router.get("/adp", async (req, res) => {
  const { format, teams } = normalizeAdpQuery(req.query);
  if (!format) {
    return res.status(400).json({ error: "format must be one of ppr, half-ppr, standard" });
  }
  if (!teams) {
    return res.status(400).json({ error: "teams must be an integer between 1 and 20" });
  }

  if (!config.isProd || !redis) {
    return res.json(buildMockAdpResponse({ format, teams }));
  }

  try {
    const yahooClient = await getOptionalYahooClient(req);
    const response = await buildLiveAdpResponse({
      redis,
      format,
      teams,
      year: new Date().getFullYear(),
      yahooClient,
    });
    return res.json(response);
  } catch (e) {
    logger.warn("Draft Assistant ADP live ingestion failed; returning mock ADP", { err: e.message });
    return res.json(buildMockAdpResponse({ format, teams }));
  }
});

module.exports = router;
module.exports.buildMockRecommendations = buildMockRecommendations;
