"use strict";

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");
const { getCurrentNflWeekContext } = require("../services/nflSchedule");
const { logger } = require("../middleware/logging");
const { isMissingColumnError } = require("../services/activeSelection");
const { buildDecisionCapabilities, CAPABILITY_CONTRACT } = require("../services/decisionCapabilities");
const { attachDecisionReceipt, createDecisionContext } = require("../services/decisionContext");
const { scoringCoverageCapability } = require("../services/waiverScoringCapabilities");
const { LABELS: BAND_LABELS } = require("../services/decisionBriefV2");
const ledger = require("../services/ledger");
const { bandFromScore } = require("../services/confidencePolicy");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

function nowIso() {
  return new Date().toISOString();
}

function defaultSeason() {
  return getCurrentNflWeekContext().season;
}

function parsePositiveInteger(value, fallback, { max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > max) return null;
  return parsed;
}

// --- Schema-tolerant reads ---------------------------------------------------
//
// Production `public.moves` was not created from the definition this code assumed (verified
// 2026-09-28, GlitchTip #13): it has no `result`, `scored_at`, `platform` or `league_id`. The
// hand-written "legacy" column list still named `result`, so the fallback failed with the
// same error it was meant to absorb. Optional columns are now dropped one at a time, as the
// database names them, so any combination of absent columns degrades instead of failing.

function namesColumn(error, column) {
  const message = error?.message || "";
  return new RegExp(`column [^ ]*\\b${column}\\b|'${column}' column`, "i").test(message);
}

async function selectTolerantly(columns, optional, run) {
  let selected = [...columns];
  for (;;) {
    const result = await run(selected.join(","));
    if (!result.error || !isMissingColumnError(result.error)) return result;
    const absent = selected.find((column) => optional.includes(column) && namesColumn(result.error, column));
    if (!absent) return result;
    selected = selected.filter((column) => column !== absent);
  }
}

function ledgerScopeUnavailable() {
  return {
    contract_version: "moves-history-error.v1",
    error: "Ledger unavailable",
    code: "league_scope_unavailable",
    message: "Omen cannot yet tell which league each saved call belongs to, so it is not showing this league's Ledger.",
    action: "back",
  };
}

// The Ledger's league scope lives in the redo's leagues/decisions tables. When the database lacks
// them (relation or column absent) Omen cannot attribute any call to a league, so it refuses
// rather than 500 or show the user's other leagues' calls as this one's.
const SCOPE_UNREADABLE_CODES = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);
function isLedgerScopeUnreadable(error) {
  return error instanceof ledger.LedgerError && SCOPE_UNREADABLE_CODES.has(error.code);
}

// move-detail.v1 requires call_type to be a string; a legacy moves row may have no move_type.
const UNKNOWN_CALL_TYPE = "unknown";

function recommendationFrom(row = {}) {
  return row.headline || row.reasoning || null;
}

function normalizeMove(row = {}) {
  return {
    id: row.id,
    season: row.season,
    week: row.week_num,
    move_type: row.move_type || null,
    recommendation: recommendationFrom(row),
    followed: row.followed ?? null,
    stars: row.user_stars ?? null,
    outcome: row.outcome || "pending",
    effectiveness_pct: Number.isFinite(Number(row.eff)) ? Number(row.eff) : null,
    created_at: row.created_at || null,
  };
}

function buildSummary(moves = []) {
  let wins = 0;
  let losses = 0;
  let pending = 0;
  let followedCount = 0;
  const scoredEff = [];

  for (const move of moves) {
    if (move.outcome === "pending") pending += 1;
    if (move.followed !== true) continue;

    followedCount += 1;
    if (move.outcome === "win") wins += 1;
    if (move.outcome === "loss") losses += 1;
    if (
      (move.outcome === "win" || move.outcome === "loss")
      && Number.isFinite(Number(move.effectiveness_pct))
    ) {
      scoredEff.push(Number(move.effectiveness_pct));
    }
  }

  const avg = scoredEff.length
    ? Math.round(scoredEff.reduce((sum, value) => sum + value, 0) / scoredEff.length)
    : null;

  return {
    wins,
    losses,
    pending,
    avg_effectiveness_pct: avg,
    followed_count: followedCount,
    total_count: moves.length,
  };
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const native = req.query.contract_version === "moves-history.v2";
    if (req.query.contract_version && !native && req.query.contract_version !== "moves-history.v1") {
      return res.status(400).json({ error: "unsupported_moves_contract" });
    }
    if (native && (!["espn", "yahoo", "sleeper"].includes(req.query.platform)
      || typeof req.query.league_id !== "string" || !req.query.league_id.trim() || req.query.league_id.length > 128)) {
      return res.status(400).json({ error: "ledger_context_required" });
    }
    const season = parsePositiveInteger(req.query.season, defaultSeason(), { max: 9999 });
    const limit = parsePositiveInteger(req.query.limit, 20, { max: 100 });

    if (!season) return res.status(400).json({ error: "season must be a positive integer" });
    if (!limit) return res.status(400).json({ error: "limit must be an integer between 1 and 100" });

    // v2 is the native Ledger, read from the redo's decisions tables (sql/2026-10-01-redo/05).
    // Every decision belongs to a league, so the old "cannot attribute a row" refusal is gone:
    // a league Omen has no record of is simply an empty Ledger.
    if (native) {
      let calls;
      try {
        calls = await ledger.listLedgerCalls(supabase, {
          userId: req.user.id,
          platform: req.query.platform,
          providerLeagueId: req.query.league_id.trim(),
          season,
          limit,
        });
      } catch (err) {
        if (!isLedgerScopeUnreadable(err)) throw err;
        logger.warn("moves ledger cannot be league-scoped: Ledger tables unreadable", { message: err.message });
        return res.status(503).json(ledgerScopeUnavailable());
      }
      return res.json({
        contract_version: "moves-history.v2",
        generated_at: nowIso(), season,
        moves: calls.map(decisionLedgerRow),
      });
    }

    const { data, error } = await supabase
      .from("moves")
      .select("id,week_num,season,move_type,headline,reasoning,followed,user_stars,outcome,eff,created_at")
      .eq("user_id", req.user.id)
      .eq("season", season)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`moves lookup failed: ${error.message}`);

    const moves = (Array.isArray(data) ? data : []).map(normalizeMove);
    return res.json({
      contract_version: "moves-history.v1",
      generated_at: nowIso(),
      season,
      summary: buildSummary(moves),
      moves,
    });
  } catch (e) {
    return next(e);
  }
});

function textOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** A legacy call (copied from moves by step 05) keeps its original move type. */
function decisionCallType(decision) {
  if (decision.call_type !== "legacy") return decision.call_type || null;
  return textOrNull(decision.recommendation?.move_type);
}

function isVerifiedOutcome(outcome) {
  return outcome?.state === "resolved" && outcome.provenance === "verified" && ["win", "loss"].includes(outcome.result);
}

/**
 * One moves-history.v2 row from a decision, its action and its outcome — the shape the native
 * apps already decode. Only an exactly reconciled result is worked/did_not_work; an estimate or a
 * not-executed call is `not_verified`; no outcome, or an incomplete one, is `pending`. A user's
 * follow report is never equated with verified scoring. The engine's internal number is not read.
 */
function decisionLedgerRow({ decision, action, outcome }) {
  const followed = typeof action?.followed === "boolean" ? action.followed : null;
  const verified = isVerifiedOutcome(outcome);
  return {
    id: decision.id, season: decision.season, week: decision.week,
    move_type: decisionCallType(decision),
    headline: textOrNull(decision.headline) || textOrNull(decision.summary),
    issued_at: decision.issued_at || null, issued_at_timezone: decision.issued_at_timezone || "UTC",
    followed,
    action_provenance: followed === null ? "unknown" : (action.provenance || "self_reported"),
    provenance: verified ? "verified" : "unknown",
    outcome: !outcome || outcome.state === "data_incomplete" ? "pending"
      : verified ? (outcome.result === "win" ? "worked" : "did_not_work") : "not_verified",
  };
}


// --- Ledger detail (visual briefs §7) ---------------------------------------
//
// GET / above is the list. §7 is the receipt for one call: what Omen said, what
// evidence it had at the time, what the user did when safely known, and what
// happened. There was no per-move route at all, and normalizeMove() projects ten
// fields, most of which §7 does not use.

const DETAIL_CONTRACT = "move-detail.v1";
const DETAIL_ERROR_CONTRACT = "move-detail-error.v1";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DETAIL_COLUMNS = [
  "id", "user_id", "week_num", "season", "move_type", "headline", "reasoning",
  "confidence", "target_player", "followed", "user_stars", "user_note",
  "outcome", "eff", "result", "created_at", "scored_at",
  "platform", "league_id",
  // A6 contract fields, present on production since the reviewed migration was applied.
  "scoring", "scoring_contract_version", "scoring_coverage_state", "reconciliation_state",
];

// Absent from production today; dropped from the query when the database says so. With no
// `result` the receipt never claims a retained final score, which is the safe direction.
const OPTIONAL_DETAIL_COLUMNS = DETAIL_COLUMNS.filter((column) => ![
  "id", "user_id", "week_num", "season", "move_type", "headline", "reasoning",
  "confidence", "target_player", "followed", "user_stars", "user_note", "outcome", "eff", "created_at",
].includes(column));

function detailError({ code, message, action }) {
  return {
    contract_version: DETAIL_ERROR_CONTRACT,
    error: "Ledger entry unavailable",
    code,
    message,
    action,
  };
}

function outcomeName(row) {
  return String(row?.outcome || "pending").toLowerCase();
}

function hasPersistedScoringMetadata(row) {
  return Boolean(
    row?.scoring_contract_version
    || row?.scoring_coverage_state
    || row?.reconciliation_state
  );
}

function hasExactScoringOutcome(row) {
  return row?.scoring_coverage_state === "supported"
    && row?.reconciliation_state === "exact"
    && ["win", "loss"].includes(outcomeName(row))
    && Boolean(row?.result);
}

function hasLegacyEstimatedOutcome(row) {
  // Pre-A6 records were intentionally graded against the documented PPR
  // fallback. They remain useful history, but are never provider-verified or
  // promoted into a league-exact capability.
  return !hasPersistedScoringMetadata(row)
    && ["win", "loss"].includes(outcomeName(row))
    && Boolean(row?.result);
}

function scoringOutcomeStatus(row) {
  if (hasExactScoringOutcome(row)) {
    return {
      state: "live",
      used: true,
      reason_code: null,
      statement: "Omen reproduced the provider's final score from this league's own rules.",
    };
  }

  if (outcomeName(row) === "pending") {
    return {
      state: "pending",
      used: false,
      reason_code: "awaiting_final_scoring",
      statement: "Final scoring for this recommendation is still pending.",
    };
  }

  if (hasLegacyEstimatedOutcome(row)) {
    return {
      state: "unavailable",
      used: false,
      reason_code: "legacy_ppr_estimate",
      statement: "This historical outcome is a PPR fallback estimate, not a provider-verified result.",
    };
  }

  if (!row?.result) {
    return {
      state: "unavailable",
      used: false,
      reason_code: "outcome_result_missing",
      statement: "A final outcome record is incomplete, so Omen cannot verify this result.",
    };
  }

  if (hasPersistedScoringMetadata(row)) {
    return {
      state: "unavailable",
      used: false,
      reason_code: `reconciliation_${String(row.reconciliation_state || "not_recorded").toLowerCase()}`,
      statement: "This result was not exactly reconciled against the league scoring contract.",
    };
  }

  return {
    state: "unavailable",
    used: false,
    reason_code: "scoring_reconciliation_not_recorded",
    statement: "Omen did not retain enough scoring reconciliation evidence to verify this result.",
  };
}

/**
 * §7.5 states. `superseded` is not derivable from a single row and is left to a
 * later slice rather than guessed at; `data_incomplete` covers a scored row that
 * could not produce a result line.
 */
function detailState(row) {
  const outcome = outcomeName(row);
  if (outcome === "pending") return row?.scored_at ? "data_incomplete" : "pending";
  if (!row?.result) return "data_incomplete";
  if (hasExactScoringOutcome(row) || hasLegacyEstimatedOutcome(row)) return "resolved";
  return "data_incomplete";
}

/**
 * §7.3 "Only show user action when safely known." `followed` is null until the
 * user says so, and a null must never be read as "did not follow".
 */
function userAction(row) {
  if (row?.followed === true) return { known: true, followed: true, statement: "You marked this as followed." };
  if (row?.followed === false) return { known: true, followed: false, statement: "You marked this as not followed." };
  return {
    known: false,
    followed: null,
    statement: "Omen could not confirm whether you acted on this recommendation.",
  };
}

/**
 * §7.2 "Evidence distinguishes league context, player/game facts, model
 * inputs/freshness, Omen inference, and known limitations." Only what the stored
 * row genuinely supports is emitted — an absent field produces no sentence.
 */
function evidenceAtTheTime(row) {
  const evidence = [];

  if (row?.scoring) {
    evidence.push({ category: "league_context", kind: "verified", statement: `This recommendation was graded in ${row.scoring} scoring.` });
  }
  if (row?.target_player) {
    evidence.push({ category: "player_game_fact", kind: "verified", statement: `The recommendation named ${row.target_player}.` });
  }
  // The stored number is an internal ordering value; the response only ever says the band.
  const recordedBand = row?.confidence != null ? bandFromScore(Number(row.confidence)) : null;
  if (recordedBand) {
    evidence.push({ category: "model_input", kind: "model", statement: `Omen issued this call as ${BAND_LABELS[recordedBand]}.` });
  }
  if (row?.reasoning) {
    evidence.push({ category: "omen_inference", kind: "inference", statement: String(row.reasoning) });
  }
  if (!row?.scoring && !row?.scoring_contract_version) {
    // Facts-of-record: a recommendation with no recorded scoring format falls
    // back to PPR at grading time (A6). Saying so is part of the receipt.
    evidence.push({
      category: "limitation",
      kind: "limitation",
      statement: "This entry predates league scoring capture, so it was graded against the PPR fallback rather than this league's own rules.",
    });
  }

  return evidence;
}

/**
 * §7.3 "Use measured status language ... No WIN/LOSS marks, grades, streaks,
 * celebration, or self-congratulation." The stored `outcome` column literally
 * holds "win"/"loss"; it is translated here and never surfaced raw.
 */
function observedOutcome(row) {
  const state = detailState(row);
  if (state === "pending") return { known: false, statement: "This recommendation has not been scored yet.", awaiting: "final scoring for this week" };
  if (state === "data_incomplete") return { known: false, statement: scoringOutcomeStatus(row).statement, awaiting: null };

  const outcome = outcomeName(row);
  if (hasLegacyEstimatedOutcome(row)) {
    return {
      known: true,
      provenance: "legacy_estimate",
      statement: outcome === "win"
        ? "Historical PPR fallback estimate aligned with the recommendation."
        : "Historical PPR fallback estimate did not align with the recommendation.",
      detail: row.result || null,
      awaiting: null,
    };
  }

  return {
    known: true,
    provenance: "verified",
    statement: outcome === "win"
      ? "Observed outcome aligned with the recommendation."
      : "Observed outcome did not align with the recommendation.",
    detail: row.result || null,
    awaiting: null,
  };
}

function attachLedgerDecisionReceipt(response, row, { receiptSource = "moves_persisted_receipt", scoringSource = "moves_reconciliation" } = {}) {
  const context = createDecisionContext({ profile: "ledger" });
  const persistedRecommendation = recommendationFrom(row);
  const hasDecisionReceipt = typeof persistedRecommendation === "string" && persistedRecommendation.trim().length > 0;
  const outcome = scoringOutcomeStatus(row);

  context.record("decision_receipt", hasDecisionReceipt ? {
    state: "live",
    source: receiptSource,
    observed_at: row.created_at || null,
  } : {
    state: "unavailable",
    source: receiptSource,
    reason_code: "issue_time_recommendation_not_recorded",
  });
  if (hasDecisionReceipt) context.use("decision_receipt");

  context.record("scoring_outcome", {
    state: outcome.state,
    source: scoringSource,
    reason_code: outcome.reason_code,
    observed_at: row.scored_at || null,
  });
  if (outcome.used) context.use("scoring_outcome");
  attachDecisionReceipt(response, context);

  const decisionReceiptCapability = hasDecisionReceipt ? {
    state: "live",
    used: true,
    kind: "verified",
    source: receiptSource,
    statement: "Omen preserved the recommendation and evidence recorded when this call was issued.",
    observed_at: row.created_at || null,
  } : {
    state: "unavailable",
    used: false,
    kind: "limitation",
    source: receiptSource,
    statement: "Omen did not retain a readable issue-time recommendation for this entry.",
    reason_code: "issue_time_recommendation_not_recorded",
  };
  const scoringCapability = scoringCoverageCapability({
    coverage_state: row.scoring_coverage_state,
    reconciliation_state: row.reconciliation_state,
  }, {
    used: outcome.used,
    observedAt: row.scored_at || null,
  });
  // A scoring-contract state can only support this historical receipt when a
  // corresponding result line survived. Do not let an exact marker revive a
  // missing outcome, and never call a legacy PPR estimate provider-verified.
  if (!outcome.used) {
    scoringCapability.state = "unavailable";
    scoringCapability.used = false;
    scoringCapability.kind = "limitation";
    scoringCapability.statement = outcome.statement;
    scoringCapability.reason_code = outcome.reason_code;
  }
  const capabilityEnvelope = buildDecisionCapabilities({
    promoted: {
      decision_receipt: decisionReceiptCapability,
      league_exact_scoring: scoringCapability,
    },
  });
  response.capability_contract = CAPABILITY_CONTRACT;
  response.capabilities = capabilityEnvelope.capabilities;
  return response;
}

function moveDetail(row) {
  const response = {
    contract_version: DETAIL_CONTRACT,
    generated_at: nowIso(),
    id: row.id,
    call_type: row.move_type || UNKNOWN_CALL_TYPE,
    state: detailState(row),
    snapshot: {
      recommendation: recommendationFrom(row),
      season: row.season,
      week: row.week_num,
      platform: row.platform || null,
      league_id: row.league_id == null ? null : String(row.league_id),
      scoring_format: row.scoring || null,
      scoring_contract_version: row.scoring_contract_version || null,
      // §7.5 "Timestamps include a clear time zone."
      issued_at: row.created_at || null,
      issued_at_timezone: "UTC",
    },
    evidence_at_the_time: evidenceAtTheTime(row),
    user_action: userAction(row),
    observed_outcome: observedOutcome(row),
    feedback: {
      stars: row.user_stars ?? null,
      note: row.user_note || null,
    },
    fairness_note: "Omen shows what it knew when the call was made. Later information is never used to make an earlier recommendation look better.",
  };
  return attachLedgerDecisionReceipt(response, row);
}

// --- Ledger detail from the redo's tables ------------------------------------
//
// The same move-detail.v1 receipt, built from decisions + decision_factors + decision_actions +
// decision_outcomes. Evidence is the issue-time factor rows, never a current re-read. Two §7.5
// states the moves table could not express are now real: `superseded` (a later call for the same
// team-week replaced this one) and `not_executed` (the person said they did not act on it).

const SCORING_FORMAT_LABELS = Object.freeze({ ppr: "PPR", half_ppr: "Half PPR", standard: "Standard" });

function evidenceCategory(kind) {
  if (kind === "limitation") return "limitation";
  if (kind === "verified") return "player_game_fact";
  if (kind === "projection" || kind === "model") return "model_input";
  return "omen_inference";
}

function decisionEvidence({ decision, factors }) {
  const evidence = [];
  const format = textOrNull(decision.scoring_format);

  if (decision.call_type === "legacy" && !factors.length) {
    // A call copied from moves carries no factor rows; say only what the copied record supports.
    // The legacy confidence number is deliberately not repeated (it is the internal score).
    return evidenceAtTheTime({
      scoring: format,
      scoring_contract_version: decision.scoring_contract_version,
      target_player: textOrNull(decision.recommendation?.target_player),
      reasoning: textOrNull(decision.summary),
    });
  }

  if (format) {
    evidence.push({
      category: "league_context",
      kind: "verified",
      statement: `Omen read this league's scoring as ${SCORING_FORMAT_LABELS[format] || format}.`,
    });
  }
  if (decision.band && BAND_LABELS[decision.band]) {
    evidence.push({ category: "model_input", kind: "model", statement: `Omen issued this call as ${BAND_LABELS[decision.band]}.` });
  } else if (textOrNull(decision.band_unavailable_reason)) {
    evidence.push({ category: "limitation", kind: "limitation", statement: decision.band_unavailable_reason.trim() });
  }
  for (const factor of factors) {
    if (!textOrNull(factor.statement)) continue;
    evidence.push({
      category: textOrNull(factor.family) || evidenceCategory(factor.evidence_kind),
      kind: factor.evidence_kind,
      statement: factor.statement.trim(),
    });
  }
  return evidence;
}

function decisionObservedOutcome({ decision, outcome, superseded }) {
  if (superseded) {
    return { known: false, statement: "A later call for the same week replaced this one, so Omen does not score it.", awaiting: null };
  }
  if (!outcome) {
    return { known: false, statement: "This recommendation has not been scored yet.", awaiting: "final scoring for this week" };
  }
  if (outcome.state === "not_executed") {
    return { known: false, statement: "You marked this as not followed, so Omen did not score it.", awaiting: null };
  }
  if (outcome.state !== "resolved" || !["win", "loss"].includes(outcome.result)) {
    return {
      known: false,
      statement: "Omen could not complete a verifiable result for this call yet.",
      awaiting: "complete scoring data for this week",
    };
  }

  const aligned = outcome.result === "win";
  if (outcome.provenance === "verified") {
    return {
      known: true,
      provenance: "verified",
      statement: aligned ? "Observed outcome aligned with the recommendation." : "Observed outcome did not align with the recommendation.",
      detail: textOrNull(outcome.summary),
      awaiting: null,
    };
  }
  const legacy = decision.call_type === "legacy";
  return {
    known: true,
    provenance: outcome.provenance || "legacy_estimate",
    statement: legacy
      ? (aligned
        ? "Historical PPR fallback estimate aligned with the recommendation."
        : "Historical PPR fallback estimate did not align with the recommendation.")
      : (aligned
        ? "Omen's estimate from public stat lines aligned with the recommendation. It is not reconciled to this league's own scoring."
        : "Omen's estimate from public stat lines did not align with the recommendation. It is not reconciled to this league's own scoring."),
    detail: textOrNull(outcome.summary),
    awaiting: null,
  };
}

function decisionDetail({ decision, factors = [], action = null, outcome = null, superseded = false, league = null }) {
  const response = {
    contract_version: DETAIL_CONTRACT,
    generated_at: nowIso(),
    id: decision.id,
    call_type: decisionCallType(decision) || UNKNOWN_CALL_TYPE,
    state: superseded ? "superseded" : outcome?.state || "pending",
    snapshot: {
      recommendation: textOrNull(decision.headline) || textOrNull(decision.summary),
      season: decision.season,
      week: decision.week,
      platform: league?.provider || null,
      league_id: league?.provider_league_id == null ? null : String(league.provider_league_id),
      scoring_format: textOrNull(decision.scoring_format),
      scoring_contract_version: textOrNull(decision.scoring_contract_version),
      issued_at: decision.issued_at || null,
      issued_at_timezone: decision.issued_at_timezone || "UTC",
    },
    evidence_at_the_time: decisionEvidence({ decision, factors }),
    user_action: userAction({ followed: action?.followed }),
    observed_outcome: decisionObservedOutcome({ decision, outcome, superseded }),
    feedback: {
      stars: action?.stars ?? null,
      note: textOrNull(action?.note),
    },
    fairness_note: "Omen shows what it knew when the call was made. Later information is never used to make an earlier recommendation look better.",
  };

  // The capability manifest reuses the moves receipt rules on an equivalent view of the outcome.
  const resolved = outcome?.state === "resolved";
  return attachLedgerDecisionReceipt(response, {
    headline: decision.headline,
    reasoning: decision.summary,
    created_at: decision.issued_at,
    scored_at: outcome?.scored_at || null,
    outcome: resolved ? outcome.result : outcome ? outcome.state : "pending",
    result: resolved ? (textOrNull(outcome.summary) || outcome.result) : null,
    scoring: decision.scoring_format,
    scoring_contract_version: decision.scoring_contract_version,
    scoring_coverage_state: outcome?.scoring_coverage_state ?? decision.scoring_coverage_state,
    reconciliation_state: outcome?.reconciliation_state ?? null,
  }, { receiptSource: "ledger_decisions", scoringSource: "ledger_outcomes" });
}

router.get("/:id", requireAuth, async (req, res, next) => {
  const id = String(req.params.id || "").trim();
  if (!UUID_PATTERN.test(id)) {
    return res.status(400).json(detailError({
      code: "invalid_move_id",
      message: "That is not a valid Ledger entry id.",
      action: "back",
    }));
  }

  try {
    // The Ledger first: a decisions id, or the moves id a backfilled decision was copied from.
    // The user_id filter is in every query.
    const call = await ledger.loadLedgerCall(supabase, { userId: req.user.id, id });
    if (call) return res.json(decisionDetail(call));

    // A moves row the redo did not copy (v1 history ids). The user_id filter is the isolation
    // boundary. It is applied in the query, never checked after the fact.
    const load = async (columns) => supabase
      .from("moves")
      .select(columns)
      .eq("id", id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    const { data, error } = await selectTolerantly(DETAIL_COLUMNS, OPTIONAL_DETAIL_COLUMNS, load);
    if (error) throw new Error(`move lookup failed: ${error.message}`);

    if (!data) {
      return res.status(404).json(detailError({
        code: "move_not_found",
        message: "That Ledger entry is not available.",
        action: "back",
      }));
    }

    return res.json(moveDetail(data));
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
module.exports.buildSummary = buildSummary;
module.exports.normalizeMove = normalizeMove;
module.exports.moveDetail = moveDetail;
module.exports.decisionDetail = decisionDetail;
module.exports.evidenceAtTheTime = evidenceAtTheTime;
module.exports.decisionEvidence = decisionEvidence;
module.exports.evidenceCategory = evidenceCategory;
module.exports.decisionLedgerRow = decisionLedgerRow;
module.exports.detailState = detailState;
module.exports.userAction = userAction;
module.exports.observedOutcome = observedOutcome;
module.exports.attachLedgerDecisionReceipt = attachLedgerDecisionReceipt;
module.exports.hasExactScoringOutcome = hasExactScoringOutcome;
module.exports.hasLegacyEstimatedOutcome = hasLegacyEstimatedOutcome;
module.exports.scoringOutcomeStatus = scoringOutcomeStatus;
