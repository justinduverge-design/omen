"use strict";

/**
 * Source-specific enrichment helpers for the Omen MVP response.
 *
 * These helpers never select a move, mutate numeric confidence/risk, or turn a
 * missing source into a live capability. The route composes them only after the
 * deterministic MVP response exists. Keeping that boundary here makes it
 * testable without touching production configuration or a live provider.
 */

const llm = require("./llm");
const matchupService = require("./matchupService");

const DVP_POSITIONS = new Set(["QB", "RB", "WR", "TE"]);
const LIVE_SCHEDULE_SOURCES = new Set(["espn_scoreboard"]);
const MOCK_SCHEDULE_SOURCES = new Set(["mock_schedule_fixture"]);
const EXPLANATION_FIELDS = Object.freeze(["summary", "why_it_matters", "risk", "confidence"]);
const MAX_LLM_FIELD_LENGTH = 240;
const MAX_LLM_DATA_USED = 8;
const MAX_LLM_MODEL_LABEL_LENGTH = 80;

function shortSafeString(value, maxLength = MAX_LLM_FIELD_LENGTH) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}

function countWords(text) {
  return String(text || "").match(/\b[\w'-]+\b/g)?.length || 0;
}

function countSentences(text) {
  const value = String(text || "").trim();
  if (!value) return 0;
  return value.match(/[.!?]+(?=\s|$)/g)?.length || 1;
}

function explanationTarget(response = {}) {
  if (response.state === "success") return response.recommendation?.explanation || null;
  if (response.state === "empty") return response.explanation || null;
  return null;
}

function safeSignalFacts(signals = {}) {
  return Object.fromEntries(
    Object.entries(signals).map(([name, signal]) => [
      name,
      {
        status: shortSafeString(signal?.status, 32),
        // Signal messages are already user-safe public API copy. Bound them so
        // a future source cannot create an unbounded private-model prompt.
        message: shortSafeString(signal?.message, 240),
      },
    ])
  );
}

/**
 * The private model receives only facts already safe for the user-visible
 * response. No league/user identifiers, roster player IDs, raw provider data,
 * request bodies, headers, tokens, cookies, stack traces, or error objects are
 * included.
 */
function buildMvpLlmPayload(response = {}) {
  const recommendation = response.recommendation || {};
  const explanation = explanationTarget(response) || {};
  const risk = recommendation.risk || response.risk || {};
  const confidence = recommendation.confidence || response.confidence || {};

  const player = (value) => value ? {
    name: shortSafeString(value.name),
    position: shortSafeString(value.position, 12),
    team: shortSafeString(value.team, 12),
  } : null;

  return {
    state: shortSafeString(response.state, 32),
    recommendation_type: shortSafeString(recommendation.type, 64),
    title: shortSafeString(recommendation.title),
    move: shortSafeString(recommendation.move),
    primary_player: player(recommendation.primary_player),
    comparison_player: player(recommendation.comparison_player),
    expected_value_delta: recommendation.expected_value_delta
      ? {
          points: Number.isFinite(Number(recommendation.expected_value_delta.points))
            ? Number(recommendation.expected_value_delta.points)
            : null,
          label: shortSafeString(recommendation.expected_value_delta.label, 32),
        }
      : null,
    confidence: {
      score: Number.isFinite(Number(confidence.score)) ? Number(confidence.score) : null,
      label: shortSafeString(confidence.label, 32),
      rationale: shortSafeString(confidence.rationale),
    },
    risk: {
      level: shortSafeString(risk.level, 32),
      reasons: Array.isArray(risk.reasons)
        ? risk.reasons.map((value) => shortSafeString(value)).filter(Boolean).slice(0, 8)
        : [],
    },
    signal_statuses: safeSignalFacts(response.signals),
    data_used: Array.isArray(explanation.data_used)
      ? explanation.data_used.map((value) => shortSafeString(value, 120)).filter(Boolean).slice(0, MAX_LLM_DATA_USED)
      : [],
  };
}

function isBoundedLlmExplanation(value, allowedDataUsed = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const text = [];
  for (const field of EXPLANATION_FIELDS) {
    const current = shortSafeString(value[field]);
    if (!current) return false;
    text.push(current);
  }
  if (countWords(text.join(" ")) > 50 || countSentences(text.join(" ")) > 2) return false;

  if (!Array.isArray(value.data_used) || value.data_used.length === 0 || value.data_used.length > MAX_LLM_DATA_USED) {
    return false;
  }
  const permitted = new Map(allowedDataUsed.map((item) => [item.toLowerCase(), item]));
  return value.data_used.every((item) => {
    const current = shortSafeString(item, 120);
    return Boolean(current && permitted.has(current.toLowerCase()));
  });
}

function safeModelLabel(value) {
  const model = String(value || "").trim();
  return /^[a-z0-9][a-z0-9._:-]{0,79}$/i.test(model) && model.length <= MAX_LLM_MODEL_LABEL_LENGTH
    ? model
    : "local-model";
}

function sourceForModel(model) {
  return /^gemma/i.test(model) ? "ollama_gemma" : "ollama_local";
}

/**
 * Returns only a verified model narration. Model-generated risk/confidence and
 * `data_used` are validated but intentionally not applied: those fields remain
 * deterministic so a narrator cannot change decision facts or invent sources.
 */
async function generateMvpLlmNarration(response, { llmService = llm, timeoutMs } = {}) {
  const target = explanationTarget(response);
  if (!target) return null;

  const payload = buildMvpLlmPayload(response);
  if (!payload.data_used.length) return null;
  const generated = await llmService.explainOmenMvpMove(payload, {
    ...(timeoutMs == null ? {} : { timeoutMs }),
  });
  if (!isBoundedLlmExplanation(generated, payload.data_used)) return null;

  const bridge = typeof llmService.getLlmBridgeStatus === "function"
    ? llmService.getLlmBridgeStatus()
    : null;
  if (bridge && bridge.status !== "configured_private") return null;
  const model = safeModelLabel(bridge?.model);
  return {
    explanation: {
      summary: generated.summary.trim(),
      why_it_matters: generated.why_it_matters.trim(),
      risk: target.risk,
      confidence: target.confidence,
      data_used: [...target.data_used],
    },
    source: sourceForModel(model),
    model,
  };
}

function applyMvpLlmNarration(response, narration) {
  const target = explanationTarget(response);
  if (!target || !narration?.explanation?.summary || !narration?.explanation?.why_it_matters) return false;

  Object.assign(target, narration.explanation);
  if (response.signals?.llm_reasoning) {
    response.signals.llm_reasoning = {
      status: "live",
      used: true,
      source: narration.source,
      model: narration.model,
      generated_fields: ["summary", "why_it_matters"],
      message: `Live ${narration.model} reasoning generated the plain-English explanation from deterministic decision facts.`,
    };
  }
  return true;
}

function normalizedTeam(value) {
  const team = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2,3}$/.test(team) ? team : null;
}

/**
 * DvP requires schedule-backed opponent context. In particular, there is no
 * live fallback map from a player's team to an invented opponent. Explicit mock
 * fixtures may use their declared mock schedule source, but mock permission must
 * be supplied by the route after it recognizes an explicit mock request.
 */
function deriveVerifiedDvpLookup(response = {}, { explicitMock = false } = {}) {
  if (response.state !== "success" || response.recommendation?.type === "waiver_pickup") return null;
  const primary = response.recommendation?.primary_player;
  const context = response.recommendation?.matchup_context;
  const position = String(primary?.position || "").trim().toUpperCase();
  const opponentTeam = normalizedTeam(context?.opponent_team);
  const source = String(context?.source || "").trim();
  const contextStatus = String(context?.status || "").trim();
  const season = Number.parseInt(response.league?.season, 10);
  const week = Number.parseInt(response.league?.week, 10);

  if (!DVP_POSITIONS.has(position) || !opponentTeam || !Number.isInteger(season) || !Number.isInteger(week)) return null;
  if (response.mode === "live") {
    if (!LIVE_SCHEDULE_SOURCES.has(source) || contextStatus !== "live") return null;
  } else if (explicitMock && response.mode === "mock") {
    if (!MOCK_SCHEDULE_SOURCES.has(source) || contextStatus !== "mock") return null;
  } else {
    return null;
  }

  return { position, opponentTeam, season, week };
}

function isValidDvpContextForLookup(value, lookup) {
  if (!value || !lookup || typeof value !== "object" || Array.isArray(value)) return false;
  return normalizedTeam(value.opponent_team) === lookup.opponentTeam
    && String(value.position || "").trim().toUpperCase() === lookup.position
    && Number.isFinite(Number(value.avg_points_allowed))
    && Number.isInteger(Number(value.sample_weeks))
    && Number(value.sample_weeks) >= 3
    && ["favorable", "neutral", "tough"].includes(value.dvp_label);
}

function applyDvpContext(response, dvp) {
  if (!response.signals?.matchup_dvp || !dvp) return false;
  response.signals.matchup_dvp = {
    status: "live",
    used: true,
    source: "nflverse_data",
    message: `Matchup DvP uses nflverse-data: ${dvp.opponent_team} vs ${dvp.position} is ${dvp.dvp_label} across ${dvp.sample_weeks} prior regular-season weeks.`,
  };
  const explanation = explanationTarget(response);
  if (explanation && Array.isArray(explanation.data_used) && !explanation.data_used.includes("matchup DvP")) {
    explanation.data_used.push("matchup DvP");
  }

  // DvP never chooses the move or changes its numeric confidence/risk level.
  // It does, however, replace the honest pre-enrichment "stubbed" limitation
  // in the deterministic copy. Leaving it there after verified DvP is applied
  // would make the response contradict its own evidence receipt.
  const recommendation = response.recommendation;
  if (typeof recommendation?.confidence?.rationale === "string") {
    recommendation.confidence.rationale = recommendation.confidence.rationale.replace(
      /matchup DvP is still stubbed\./i,
      "Matchup DvP is live from nflverse-data."
    );
  }
  if (Array.isArray(recommendation?.risk?.reasons)) {
    recommendation.risk.reasons = recommendation.risk.reasons.map((reason) => String(reason).replace(
      /one matchup signal is still stubbed\./i,
      "Matchup DvP is live from nflverse-data."
    ));
  }
  if (typeof explanation?.risk === "string") {
    explanation.risk = explanation.risk.replace(
      /matchup DvP and some projection inputs are still stubbed\./i,
      "some projection inputs remain unavailable; matchup DvP is live from nflverse-data."
    );
  }
  return true;
}

async function resolveMvpDvpContext(response, options = {}, { matchup = matchupService } = {}) {
  const lookup = deriveVerifiedDvpLookup(response, options);
  if (!lookup) return null;
  const dvp = await matchup.getDvpContext(lookup);
  return isValidDvpContextForLookup(dvp, lookup) ? dvp : null;
}

module.exports = {
  applyDvpContext,
  applyMvpLlmNarration,
  buildMvpLlmPayload,
  deriveVerifiedDvpLookup,
  generateMvpLlmNarration,
  isBoundedLlmExplanation,
  isValidDvpContextForLookup,
  resolveMvpDvpContext,
  safeModelLabel,
};
