"use strict";

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");
const { LIVE_CONTRACT_VERSION } = require("../services/systemContracts");
const { isOffSeason } = require("../services/nflSchedule");
const { ensureAppUser } = require("../services/appUser");
const {
  authRequiredMvpResponse,
  buildLiveOmenMvpMoveForUser,
  buildOmenMvpMoveResponse,
  authenticateOmenRequest,
  offSeasonMvpResponse,
} = require("../services/omen");
const llm = require("../services/llm");
const matchupService = require("../services/matchupService");
const { persistLiveRecommendation } = require("../services/moves");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

const LLM_ELIGIBLE_STATES = new Set(["success", "empty"]);
const LLM_BLOCKED_STATES = new Set([
  "platform_disconnected",
  "context_unavailable",
  "off_season",
  "pending_live_engine",
  "yahoo_reauth_required",
  "sleeper_league_context_missing",
  "espn_reauth_required",
  "espn_league_context_missing",
  "espn_import_blocked",
  "espn_recovery_needed",
  "error",
]);
const DVP_ELIGIBLE_STATES = new Set(["success"]);
const DETERMINISTIC_MOCK_OPPONENT_BY_TEAM = Object.freeze({
  DAL: "PHI",
});

function isExplicitMockRequest(body = {}) {
  return body.use_mock_data === true || body.mock_state != null;
}

function includeLlmReasoning(body = {}, { defaultEnabled = true } = {}) {
  const value = body?.include_signals?.llm_reasoning;
  if (value === undefined || value === null) return defaultEnabled;
  return value !== false;
}

function includeMatchupDvp(body = {}) {
  return body?.include_signals?.matchup_dvp !== false;
}

function parseRequiredPositiveInteger(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) return null;
  return number;
}

function parseOptionalStars(value) {
  if (value == null) return null;
  const stars = Number(value);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return undefined;
  return stars;
}

function parseOptionalNote(value) {
  if (value == null) return null;
  if (typeof value !== "string") return undefined;
  const note = value.trim();
  return note ? note.slice(0, 500) : null;
}

function parseFeedbackPayload(body = {}) {
  const week = parseRequiredPositiveInteger(body.week);
  const season = parseRequiredPositiveInteger(body.season);
  const stars = parseOptionalStars(body.stars);
  const note = parseOptionalNote(body.note);

  if (!week || !season) {
    return { error: "week and season are required" };
  }
  if (typeof body.followed !== "boolean") {
    return { error: "followed must be true or false" };
  }
  if (stars === undefined) {
    return { error: "stars must be an integer from 1 to 5 or null" };
  }
  if (note === undefined) {
    return { error: "note must be a string or null" };
  }

  return {
    value: {
      week,
      season,
      followed: body.followed,
      stars,
      note,
    },
  };
}

function isValidExplanation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  for (const field of ["summary", "why_it_matters", "risk", "confidence"]) {
    if (typeof value[field] !== "string" || !value[field].trim()) return false;
  }
  return Array.isArray(value.data_used)
    && value.data_used.length > 0
    && value.data_used.every((item) => typeof item === "string" && item.trim());
}

function safeSignalFacts(signals = {}) {
  return Object.fromEntries(
    Object.entries(signals).map(([name, signal]) => [
      name,
      {
        status: signal?.status,
        message: signal?.message,
      },
    ])
  );
}

function explanationTarget(response) {
  if (response.state === "success") return response.recommendation?.explanation;
  if (response.state === "empty") return response.explanation;
  return null;
}

function buildOmenLlmPayload(response) {
  const recommendation = response.recommendation || {};
  const explanation = explanationTarget(response) || {};
  const risk = recommendation.risk || response.risk || {};
  const confidence = recommendation.confidence || response.confidence || {};

  return {
    state: response.state,
    recommendation_type: recommendation.type || null,
    title: recommendation.title || null,
    move: recommendation.move || null,
    primary_player: recommendation.primary_player
      ? {
          name: recommendation.primary_player.name,
          position: recommendation.primary_player.position,
          team: recommendation.primary_player.team,
        }
      : null,
    comparison_player: recommendation.comparison_player
      ? {
          name: recommendation.comparison_player.name,
          position: recommendation.comparison_player.position,
          team: recommendation.comparison_player.team,
        }
      : null,
    expected_value_delta: recommendation.expected_value_delta || null,
    confidence: {
      score: confidence.score,
      label: confidence.label,
      rationale: confidence.rationale,
    },
    risk: {
      level: risk.level,
      reasons: Array.isArray(risk.reasons) ? risk.reasons : [],
    },
    signal_statuses: safeSignalFacts(response.signals),
    data_used: Array.isArray(explanation.data_used) ? explanation.data_used : [],
  };
}

function markLiveLlm(response) {
  if (!response.signals?.llm_reasoning) return;
  response.signals.llm_reasoning = {
    status: "live",
    used: true,
    source: "ollama_gemma",
    message: "Live Gemma reasoning generated the plain-English explanation.",
  };
}

function isValidDvpContext(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (typeof value.opponent_team !== "string" || !value.opponent_team.trim()) return false;
  if (typeof value.position !== "string" || !value.position.trim()) return false;
  if (!Number.isFinite(Number(value.avg_points_allowed))) return false;
  if (!Number.isInteger(Number(value.sample_weeks)) || Number(value.sample_weeks) < 3) return false;
  return ["favorable", "neutral", "tough"].includes(value.dvp_label);
}

function deriveDvpLookup(response) {
  const recommendation = response.recommendation;
  const primary = recommendation?.primary_player;
  if (!primary) return null;

  const team = String(primary.team || "").toUpperCase();
  const opponentTeam = String(
    primary.opponent_team
    || recommendation?.matchup_context?.opponent_team
    || DETERMINISTIC_MOCK_OPPONENT_BY_TEAM[team]
    || ""
  ).toUpperCase();

  if (!primary.position || !opponentTeam) return null;

  return {
    position: primary.position,
    opponentTeam,
    season: response.league?.season,
    week: response.league?.week,
  };
}

function formatDvpMessage(dvp) {
  return `Matchup DvP uses nflverse-data trailing-week fantasy points allowed: ${dvp.opponent_team} vs ${dvp.position} is ${dvp.dvp_label} over ${dvp.sample_weeks} games.`;
}

function enrichRecommendationWithDvp(response, dvp) {
  response.signals.matchup_dvp = {
    status: "live",
    used: true,
    source: "nflverse_data",
    message: formatDvpMessage(dvp),
  };

  const recommendation = response.recommendation;
  if (!recommendation) return;

  recommendation.confidence.rationale =
    `${recommendation.confidence.rationale} Matchup DvP is live from nflverse-data and rates ${dvp.opponent_team} vs ${dvp.position} as ${dvp.dvp_label}.`;

  recommendation.risk.reasons = recommendation.risk.reasons.map((reason) =>
    reason.includes("matchup signal is still stubbed")
      ? `Matchup DvP is live from nflverse-data: ${dvp.opponent_team} vs ${dvp.position} is ${dvp.dvp_label} based on ${dvp.sample_weeks} trailing games.`
      : reason
  );

  if (recommendation.explanation && Array.isArray(recommendation.explanation.data_used)) {
    if (!recommendation.explanation.data_used.includes("matchup DvP")) {
      recommendation.explanation.data_used.push("matchup DvP");
    }
    recommendation.explanation.risk =
      `The recommendation carries medium risk because projections and waiver inputs are still not fully live, while matchup DvP is ${dvp.dvp_label}.`;
  }
}

async function enrichWithDvp(response, body) {
  if (!includeMatchupDvp(body)) return response;
  if (!DVP_ELIGIBLE_STATES.has(response.state)) return response;
  if (response.recommendation?.type === "waiver_pickup") return response;
  if (!response.signals?.matchup_dvp) return response;

  const lookup = deriveDvpLookup(response);
  if (!lookup) return response;

  const dvp = await matchupService.getDvpContext(lookup);
  if (!isValidDvpContext(dvp)) return response;

  enrichRecommendationWithDvp(response, dvp);
  return response;
}

async function enrichWithLlm(response, body, options) {
  if (!includeLlmReasoning(body, options)) return response;
  if (LLM_BLOCKED_STATES.has(response.state)) return response;
  if (!LLM_ELIGIBLE_STATES.has(response.state)) return response;

  const target = explanationTarget(response);
  if (!target) return response;

  const explanation = await llm.explainOmenMvpMove(buildOmenLlmPayload(response));
  if (!isValidExplanation(explanation)) return response;

  Object.assign(target, explanation);
  markLiveLlm(response);
  return response;
}

async function liveOmenResult(req) {
  let user;
  try {
    user = await authenticateOmenRequest(req.headers.authorization);
  } catch (e) {
    return authRequiredMvpResponse(e.message);
  }

  try {
    if (isOffSeason()) {
      return { ...offSeasonMvpResponse(), userId: user.id };
    }
    const result = await buildLiveOmenMvpMoveForUser(user.id, {
      contextId: req.body?.context_id,
    });
    return { ...result, userId: user.id };
  } catch (e) {
    return {
      status: 500,
      body: {
        contract_version: LIVE_CONTRACT_VERSION,
        state: "error",
        feature: "omen_mvp_move",
        mode: "live",
        request_id: `omen_req_${Date.now()}`,
        generated_at: new Date().toISOString(),
        platform: {
          name: "unknown",
          status: "error",
          recovery: null,
        },
        league: null,
        team: null,
        signals: {},
        recommendation: null,
        alternatives: [],
        warnings: [],
        error: {
          code: "omen_live_generation_failed",
          message: "Omen could not generate a live Most Valuable Play right now.",
          retryable: true,
        },
      },
    };
  }
}

router.post("/feedback", requireAuth, async (req, res, next) => {
  try {
    const parsed = parseFeedbackPayload(req.body || {});
    if (parsed.error) {
      return res.status(422).json({ error: parsed.error });
    }

    const { week, season, followed, stars, note } = parsed.value;
    await ensureAppUser(req.user);

    const { data, error } = await supabase
      .from("moves")
      .upsert({
        user_id: req.user.id,
        week_num: week,
        season,
        followed,
        user_stars: stars,
        user_note: note,
      }, { onConflict: "user_id,week_num,season" })
      .select("id")
      .maybeSingle();

    if (error) throw new Error(`move feedback upsert failed: ${error.message}`);
    if (!data?.id) throw new Error("move feedback upsert failed: missing move id");

    return res.json({ recorded: true, move_id: data.id });
  } catch (e) {
    return next(e);
  }
});

router.post("/mvp-move", async (req, res) => {
  if (!isExplicitMockRequest(req.body || {})) {
    const result = await liveOmenResult(req);
    try {
      await enrichWithDvp(result.body, req.body || {});
    } catch {
      // DvP is an enhancement only. Keep deterministic response.
    }
    try {
      await enrichWithLlm(result.body, req.body || {}, { defaultEnabled: false });
    } catch {
      // LLM explanation is an enhancement only. Keep deterministic response.
    }
    try {
      await persistLiveRecommendation(supabase, result.userId, result.body);
    } catch {
      result.status = 500;
      result.body.state = "error";
      result.body.recommendation = null;
      result.body.error = {
        code: "omen_move_persistence_failed",
        message: "Omen could not safely record this recommendation for later scoring.",
        retryable: true,
      };
    }
    return res.status(result.status).json(result.body);
  }

  const result = buildOmenMvpMoveResponse(req.body || {});
  try {
    await enrichWithDvp(result.body, req.body || {});
  } catch {
    // DvP is an enhancement only. Keep deterministic response.
  }
  try {
    await enrichWithLlm(result.body, req.body || {});
  } catch {
    // LLM explanation is an enhancement only. Keep deterministic response.
  }
  return res.status(result.status).json(result.body);
});

module.exports = router;
