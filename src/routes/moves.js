"use strict";

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");
const { getCurrentNflWeekContext } = require("../services/nflSchedule");
const { isMissingColumnError } = require("../services/activeSelection");
const { buildDecisionCapabilities, CAPABILITY_CONTRACT } = require("../services/decisionCapabilities");
const { attachDecisionReceipt, createDecisionContext } = require("../services/decisionContext");
const { scoringCoverageCapability } = require("../services/waiverScoringCapabilities");

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

    const load = (columns) => {
      let query = supabase
      .from("moves")
      .select(columns)
      .eq("user_id", req.user.id)
      .eq("season", season)
      .order("created_at", { ascending: false })
      .limit(limit);
      if (native) query = query.eq("platform", req.query.platform).eq("league_id", req.query.league_id);
      return query;
    };

    let { data, error } = await load(native ? DETAIL_COLUMNS : "id,week_num,season,move_type,headline,reasoning,followed,user_stars,outcome,eff,created_at");
    if (native && error && isMissingColumnError(error)) ({ data, error } = await load(DETAIL_COLUMNS_LEGACY));

    if (error) throw new Error(`moves lookup failed: ${error.message}`);

    if (native) return res.json({
      contract_version: "moves-history.v2",
      generated_at: nowIso(), season,
      moves: (Array.isArray(data) ? data : []).map(ledgerRow),
    });

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

function ledgerRow(row) {
  // Legacy records have no provenance field. Do not equate a result string or
  // a user's follow report with provider-verified scoring.
  const verified = row.reconciliation_state === "exact" && ["win", "loss"].includes(row.outcome);
  return {
    id: row.id, season: row.season, week: row.week_num,
    move_type: row.move_type || null, headline: recommendationFrom(row),
    issued_at: row.created_at || null, issued_at_timezone: "UTC",
    followed: typeof row.followed === "boolean" ? row.followed : null,
    action_provenance: typeof row.followed === "boolean" ? "self_reported" : "unknown",
    provenance: verified ? "verified" : "unknown",
    outcome: row.outcome === "pending" || !row.outcome ? "pending"
      : verified ? (row.outcome === "win" ? "worked" : "did_not_work") : "not_verified",
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
  // A6 contract fields. Absent on the production schema until the reviewed
  // migration is applied, which is the gated founder sequence, so the query
  // falls back rather than failing.
  "scoring", "scoring_contract_version", "scoring_coverage_state", "reconciliation_state",
].join(",");

const DETAIL_COLUMNS_LEGACY = [
  "id", "user_id", "week_num", "season", "move_type", "headline", "reasoning",
  "confidence", "target_player", "followed", "user_stars", "user_note",
  "outcome", "eff", "result", "created_at", "scored_at",
].join(",");

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
  if (row?.confidence != null) {
    evidence.push({ category: "model_input", kind: "model", statement: `Omen recorded ${Number(row.confidence)}% confidence at issue time.` });
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

function attachLedgerDecisionReceipt(response, row) {
  const context = createDecisionContext({ profile: "ledger" });
  const persistedRecommendation = recommendationFrom(row);
  const hasDecisionReceipt = typeof persistedRecommendation === "string" && persistedRecommendation.trim().length > 0;
  const outcome = scoringOutcomeStatus(row);

  context.record("decision_receipt", hasDecisionReceipt ? {
    state: "live",
    source: "moves_persisted_receipt",
    observed_at: row.created_at || null,
  } : {
    state: "unavailable",
    source: "moves_persisted_receipt",
    reason_code: "issue_time_recommendation_not_recorded",
  });
  if (hasDecisionReceipt) context.use("decision_receipt");

  context.record("scoring_outcome", {
    state: outcome.state,
    source: "moves_reconciliation",
    reason_code: outcome.reason_code,
    observed_at: row.scored_at || null,
  });
  if (outcome.used) context.use("scoring_outcome");
  attachDecisionReceipt(response, context);

  const decisionReceiptCapability = hasDecisionReceipt ? {
    state: "live",
    used: true,
    kind: "verified",
    source: "moves_persisted_receipt",
    statement: "Omen preserved the recommendation and evidence recorded when this call was issued.",
    observed_at: row.created_at || null,
  } : {
    state: "unavailable",
    used: false,
    kind: "limitation",
    source: "moves_persisted_receipt",
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
    call_type: row.move_type || null,
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
    // The user_id filter is the isolation boundary. It is applied in the query,
    // never checked after the fact.
    const load = async (columns) => supabase
      .from("moves")
      .select(columns)
      .eq("id", id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    let { data, error } = await load(DETAIL_COLUMNS);
    if (error && isMissingColumnError(error)) {
      ({ data, error } = await load(DETAIL_COLUMNS_LEGACY));
    }
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
module.exports.detailState = detailState;
module.exports.userAction = userAction;
module.exports.observedOutcome = observedOutcome;
module.exports.attachLedgerDecisionReceipt = attachLedgerDecisionReceipt;
module.exports.hasExactScoringOutcome = hasExactScoringOutcome;
module.exports.hasLegacyEstimatedOutcome = hasLegacyEstimatedOutcome;
module.exports.scoringOutcomeStatus = scoringOutcomeStatus;
