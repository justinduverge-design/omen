"use strict";

/**
 * The Ledger on the redo's tables (sql/2026-10-01-redo/05_ledger.up.sql).
 *
 *   decisions          one row per issued call, append-only. One FIRST call per team-week (unique
 *                      index); every later call must name the call it supersedes, and a call can be
 *                      superseded once, so a team-week is a single chain with one current call.
 *   decision_factors   the evidence lines as they stood at issue time, append-only.
 *   decision_actions   what the person says they did; the only mutable table.
 *   decision_outcomes  what happened, written by Tuesday scoring. Final once resolved/not_executed;
 *                      data_incomplete may be completed later.
 *
 * All four are server-only (RLS on, no policies, service_role grants), so every call here takes the
 * service-role client the routes and the cron already hold. Nothing here changes schema.
 *
 * Idempotency of the write path: the schema has no per-request key, so "the same call" is decided
 * by comparing the candidate with the team-week's current call (call type, headline, band and the
 * served recommendation id). A refresh that produces the same call writes nothing; a different
 * call for the same team-week supersedes the current one, exactly as the SQL intends.
 *
 * Errors carry a stage name and the Postgres/PostgREST code only — never row values, which hold
 * user ids and league ids.
 */

const { bandedConfidence, limitationStatements } = require("./decisionBriefV2");
const { buildDecisionCapabilities } = require("./decisionCapabilities");

const CALL_TYPES = new Set(["start_sit", "waiver_pickup", "trade_suggestion", "hold"]);
const PROVIDERS = new Set(["espn", "yahoo", "sleeper"]);
const EVIDENCE_KINDS = new Set(["verified", "projection", "model", "inference", "limitation"]);
const RISK_LEVELS = new Set(["low", "medium", "high"]);
const COVERAGE_STATES = new Set([
  "supported", "provider_adjusted", "provider_restricted", "unsupported", "ambiguous", "mismatch", "pending",
]);
const RECONCILIATION_STATES = new Set([
  "exact", "provider_adjusted", "provider_restricted", "unsupported", "ambiguous", "mismatch", "pending",
]);
const FINAL_OUTCOME_STATES = new Set(["resolved", "not_executed"]);
const UNIQUE_VIOLATION = "23505";
// PostgREST builds `in.(...)` filters into the URL; keep each batch comfortably short.
const IN_BATCH = 150;

const DECISION_LIST_COLUMNS = "id,season,week,call_type,headline,summary,recommendation,issued_at,issued_at_timezone";
const DECISION_DETAIL_COLUMNS = [
  "id", "user_id", "league_id", "provider_team_id", "season", "week", "call_type", "contract_version",
  "band", "band_drivers", "band_unavailable_reason", "headline", "summary", "recommendation",
  "scoring_format", "scoring_contract_version", "scoring_coverage_state", "issued_at", "issued_at_timezone",
  "supersedes_id", "legacy_move_id",
].join(",");
const SCORABLE_COLUMNS = [
  "id", "user_id", "season", "week", "call_type", "headline", "recommendation", "internal_score",
  "scoring_format", "scoring_contract_version", "scoring_contract_hash", "scoring_coverage_state",
].join(",");

class LedgerError extends Error {
  constructor(stage, error) {
    super(`ledger ${stage} failed${error?.code ? ` (${error.code})` : ""}`);
    this.name = "LedgerError";
    this.stage = stage;
    this.code = error?.code || null;
  }
}

function must(result, stage) {
  if (result?.error) throw new LedgerError(stage, result.error);
  return result?.data ?? null;
}

function text(value) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function finite(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integerIn(value, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

function validIso(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null;
}

function jsonSafe(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function chunks(list, size = IN_BATCH) {
  const out = [];
  for (let index = 0; index < list.length; index += size) out.push(list.slice(index, index + size));
  return out;
}

function engineVersion(env = process.env) {
  const sha = text(env.GITHUB_SHA);
  return sha ? `omen-mvp-engine@${sha.slice(0, 12)}` : "omen-mvp-engine";
}

function skipped(reason) {
  return { written: false, reason };
}

// --- Write path ------------------------------------------------------------------------------------

/** Category a factor is shown under in the Ledger detail (move-detail.v1 evidence categories). */
function familyFor(capability) {
  if (capability.kind === "limitation") return "limitation";
  if (/scoring/.test(capability.name)) return "league_context";
  if (capability.kind === "verified") return "player_game_fact";
  if (capability.kind === "projection" || capability.kind === "model") return "model_input";
  return "omen_inference";
}

function lineLabelFor(capability) {
  if (capability.kind === "projection") return "projected";
  if (capability.name === "football_intelligence" && capability.state === "live") return "observed_context";
  return null;
}

/**
 * The evidence lines as served: the same canonical capability records every destination shares
 * (decision-capabilities.v1), plus football intelligence's "what could change this" lines when an
 * accepted publication was attached. Nothing is re-derived; this is a copy of what the call carried.
 */
function factorRows(response = {}) {
  const capabilities = buildDecisionCapabilities({
    signals: response.signals,
    promoted: response.capability_overrides,
    generatedAt: response.generated_at,
  }).capabilities;

  const rows = capabilities.map((capability) => {
    const kind = EVIDENCE_KINDS.has(capability.kind) ? capability.kind : "limitation";
    return {
      factor_key: capability.name,
      family: familyFor({ ...capability, kind }),
      line_label: lineLabelFor({ ...capability, kind }),
      evidence_kind: kind,
      used: capability.used === true,
      statement: capability.statement,
      contribution_points: null,
      range_lo: null,
      range_hi: null,
      direction: null,
      sample_size: null,
      source: text(capability.source) || "unknown",
      source_as_of: validIso(capability.observed_at),
      // The schema requires a reason on every limitation: something Omen could not read says why.
      reason_code: text(capability.reason_code) || (kind === "limitation" ? `capability_${capability.state || "unavailable"}` : null),
      details: jsonSafe({
        state: capability.state,
        ...(capability.coverage_state ? { coverage_state: capability.coverage_state } : {}),
        ...(capability.reconciliation_state ? { reconciliation_state: capability.reconciliation_state } : {}),
      }),
    };
  });

  const intelligence = response.football_intelligence;
  if (
    intelligence
    && ["available", "stale"].includes(intelligence.status)
    && response.signals?.football_intelligence?.status === "live"
  ) {
    const changes = Array.isArray(intelligence.interpretation?.what_could_change_this)
      ? intelligence.interpretation.what_could_change_this.map(text).filter(Boolean)
      : [];
    const games = integerIn(intelligence.evidence?.games, 0, Number.MAX_SAFE_INTEGER);
    for (const statement of changes) {
      rows.push({
        factor_key: "football_intelligence.what_could_change_this",
        family: "omen_inference",
        line_label: "could_change_this",
        evidence_kind: "inference",
        used: false,
        statement,
        contribution_points: null,
        range_lo: null,
        range_hi: null,
        direction: null,
        sample_size: games,
        source: "football_intelligence",
        source_as_of: validIso(intelligence.publication?.published_at_utc),
        reason_code: null,
        details: jsonSafe({
          artifact_id: text(intelligence.publication?.artifact_id),
          artifact_version: text(intelligence.publication?.artifact_version),
        }),
      });
    }
  }

  return rows.map((row, position) => ({ position, ...row }));
}

/**
 * The decisions row for one served call. `response` is the engine's body after enrichment;
 * `served` is what the client actually received (the presented contract), whose recommendation
 * object is stored as issued.
 */
function decisionRecord({ userId, leagueUuid, teamId, response, served = null, now = new Date() }) {
  const recommendation = response.recommendation;
  const confidence = recommendation.confidence;
  const banded = bandedConfidence(confidence, limitationStatements(response.signals));
  const scoring = recommendation.scoring && typeof recommendation.scoring === "object" ? recommendation.scoring : {};
  const servedRecommendation = served?.recommendation && typeof served.recommendation === "object"
    ? served.recommendation
    : recommendation;

  return {
    user_id: userId,
    league_id: leagueUuid,
    provider_team_id: teamId,
    season: Number(response.league.season),
    week: Number(response.league.week),
    call_type: recommendation.type,
    contract_version: text(served?.contract_version) || text(response.contract_version) || "unknown",
    engine_version: engineVersion(),
    band: banded.band,
    band_drivers: banded.band ? banded.drivers : [],
    band_unavailable_reason: banded.band ? null : banded.unavailable_reason.join(" "),
    internal_score: finite(typeof confidence === "number" ? confidence : confidence?.score),
    risk_level: RISK_LEVELS.has(recommendation.risk?.level) ? recommendation.risk.level : null,
    risk_reasons: Array.isArray(recommendation.risk?.reasons) ? recommendation.risk.reasons.map(text).filter(Boolean) : [],
    headline: text(recommendation.title) || text(recommendation.move) || text(recommendation.explanation?.summary),
    summary: text(recommendation.explanation?.summary),
    // players.id is the Omen canonical id (omen:player:*). The engine does not carry it yet, and a
    // guess would fail the foreign key and lose the whole call, so these stay null until it does.
    primary_player_id: null,
    comparison_player_id: null,
    expected_value_delta: finite(recommendation.expected_value_delta?.points),
    recommendation: jsonSafe(servedRecommendation),
    scoring_format: text(scoring.format),
    scoring_contract_version: text(scoring.contract_version),
    scoring_contract_hash: text(scoring.contract_hash),
    provider_rule_snapshot_hash: text(scoring.provider_rule_snapshot_hash),
    scoring_coverage_state: COVERAGE_STATES.has(scoring.coverage_state) ? scoring.coverage_state : null,
    issued_at: validIso(response.generated_at) || now.toISOString(),
    issued_at_timezone: "UTC",
    request_id: text(response.request_id),
  };
}

function sameCall(current, candidate) {
  return current.call_type === candidate.call_type
    && current.headline === candidate.headline
    && (current.band ?? null) === (candidate.band ?? null)
    && (current.recommendation?.id ?? null) === (candidate.recommendation?.id ?? null);
}

async function resolveLeagueId(supabase, { platform, providerLeagueId, season }) {
  const league = must(await supabase
    .from("leagues")
    .select("id")
    .eq("provider", platform)
    .eq("provider_league_id", providerLeagueId)
    .eq("season", season)
    .maybeSingle(), "league_lookup");
  return league?.id || null;
}

/** The team-week's current call: the one nothing supersedes. */
async function currentCall(supabase, { userId, leagueId, teamId, season, week }) {
  const rows = must(await supabase
    .from("decisions")
    .select("id,supersedes_id,call_type,headline,band,recommendation,issued_at")
    .eq("user_id", userId)
    .eq("league_id", leagueId)
    .eq("provider_team_id", teamId)
    .eq("season", season)
    .eq("week", week), "chain_lookup") || [];
  const superseded = new Set(rows.map((row) => row.supersedes_id).filter(Boolean));
  return rows
    .filter((row) => !superseded.has(row.id))
    .sort((left, right) => String(right.issued_at || "").localeCompare(String(left.issued_at || "")))[0] || null;
}

/**
 * Record one issued call. Returns `{ written, reason?, decision_id? }`; throws LedgerError on a
 * database failure. Callers on the request path use recordDecisionSafely().
 */
async function recordDecision(supabase, { userId, response, served = null, now = new Date() } = {}) {
  const recommendation = response?.recommendation;
  if (!userId || response?.state !== "success" || !recommendation || typeof recommendation !== "object") {
    return skipped("no_call");
  }
  // Fixture and demo responses are never calls.
  if (response.mode !== "live") return skipped("not_live");

  const platform = response.platform?.name;
  const providerLeagueId = text(response.league?.id);
  const season = integerIn(response.league?.season, 2000, 2100);
  const week = integerIn(response.league?.week, 1, 22);
  if (!PROVIDERS.has(platform) || !providerLeagueId || !season || !week) return skipped("context_incomplete");
  if (!CALL_TYPES.has(recommendation.type)) return skipped("call_type_unsupported");

  const leagueId = await resolveLeagueId(supabase, { platform, providerLeagueId, season });
  if (!leagueId) return skipped("league_not_registered");

  const membership = must(await supabase
    .from("league_memberships")
    .select("provider_team_id")
    .eq("user_id", userId)
    .eq("league_id", leagueId)
    .maybeSingle(), "membership_lookup");
  // decisions_check_insert refuses a call for a league the person does not follow.
  if (!membership) return skipped("league_not_followed");

  // The membership's team id is the stable key (it is what the backfill used); the response's own
  // team id is the fallback for a membership that never recorded one.
  const teamId = text(membership.provider_team_id) || text(response.team?.id);
  if (!teamId) return skipped("team_unknown");

  const row = decisionRecord({ userId, leagueUuid: leagueId, teamId, response, served, now });
  if (!row.headline) return skipped("headline_missing");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await currentCall(supabase, { userId, leagueId, teamId, season, week });
    if (current && sameCall(current, row)) {
      return { written: false, reason: "unchanged", decision_id: current.id };
    }

    const insert = await supabase
      .from("decisions")
      .insert({ ...row, supersedes_id: current?.id ?? null })
      .select("id")
      .single();
    // Another request for this team-week won the race; re-read the chain and supersede its call.
    if (insert.error?.code === UNIQUE_VIOLATION && attempt === 0) continue;
    const inserted = must(insert, "decision_insert");

    const factors = factorRows(response).map((factor) => ({ ...factor, decision_id: inserted.id, user_id: userId }));
    if (factors.length) must(await supabase.from("decision_factors").insert(factors), "factor_insert");

    return {
      written: true,
      decision_id: inserted.id,
      supersedes_id: current?.id ?? null,
      factor_count: factors.length,
    };
  }
  throw new LedgerError("decision_insert", { code: UNIQUE_VIOLATION });
}

/**
 * The request-path wrapper: a Ledger write must never cost the user their answer. Logs the stage,
 * the outcome and the database code — never user, league, player or recommendation values.
 */
async function recordDecisionSafely(supabase, input, { log } = {}) {
  try {
    const result = await recordDecision(supabase, input);
    if (!result.written && result.reason !== "unchanged" && result.reason !== "no_call" && log) {
      log.info("Ledger call not recorded", { reason: result.reason });
    }
    return result;
  } catch (error) {
    if (log) {
      log.warn("Ledger call write failed", {
        stage: error?.stage || "unknown",
        code: error?.code || null,
      });
    }
    return { written: false, reason: "write_failed" };
  }
}

/**
 * The person's own report of what they did (POST /api/omen/feedback). Applies to that week's one
 * current call; when they follow several leagues the request must name the league, otherwise the
 * report is not attributed rather than guessed.
 */
async function recordDecisionAction(supabase, {
  userId, season, week, followed, stars = null, note = null, platform = null, providerLeagueId = null, now = new Date(),
} = {}) {
  let leagueId = null;
  if (platform || providerLeagueId) {
    if (!PROVIDERS.has(platform) || !text(providerLeagueId)) return skipped("league_scope_invalid");
    leagueId = await resolveLeagueId(supabase, { platform, providerLeagueId: text(providerLeagueId), season });
    if (!leagueId) return skipped("league_not_registered");
  }

  let query = supabase
    .from("ledger_current_calls")
    .select("id")
    .eq("user_id", userId)
    .eq("season", season)
    .eq("week", week);
  if (leagueId) query = query.eq("league_id", leagueId);
  const calls = must(await query, "action_call_lookup") || [];
  if (calls.length !== 1) return skipped(calls.length ? "ambiguous_call" : "no_call");

  must(await supabase.from("decision_actions").upsert({
    decision_id: calls[0].id,
    user_id: userId,
    followed,
    stars,
    note,
    provenance: "self_reported",
    updated_at: now.toISOString(),
  }, { onConflict: "decision_id" }), "action_upsert");
  return { written: true, decision_id: calls[0].id };
}

// --- Read path -------------------------------------------------------------------------------------

async function byDecision(supabase, table, columns, ids, userId, stage) {
  const map = new Map();
  for (const batch of chunks(ids)) {
    const rows = must(await supabase.from(table).select(columns).in("decision_id", batch).eq("user_id", userId), stage) || [];
    for (const row of rows) map.set(row.decision_id, row);
  }
  return map;
}

/**
 * moves-history.v2 rows for one league: the current call per team-week (superseded calls stay in
 * the table and on their own receipts, but the list shows what Omen finally said).
 */
async function listLedgerCalls(supabase, { userId, platform, providerLeagueId, season, limit }) {
  const leagueId = await resolveLeagueId(supabase, { platform, providerLeagueId, season });
  if (!leagueId) return [];

  const decisions = must(await supabase
    .from("ledger_current_calls")
    .select(DECISION_LIST_COLUMNS)
    .eq("user_id", userId)
    .eq("league_id", leagueId)
    .eq("season", season)
    .order("issued_at", { ascending: false })
    .limit(limit), "ledger_list") || [];
  if (!decisions.length) return [];

  const ids = decisions.map((decision) => decision.id);
  const [actions, outcomes] = await Promise.all([
    byDecision(supabase, "decision_actions", "decision_id,followed,stars,provenance", ids, userId, "ledger_actions"),
    byDecision(supabase, "decision_outcomes", "decision_id,state,result,provenance,effectiveness", ids, userId, "ledger_outcomes"),
  ]);
  return decisions.map((decision) => ({
    decision,
    action: actions.get(decision.id) || null,
    outcome: outcomes.get(decision.id) || null,
  }));
}

/**
 * Everything one receipt needs. `id` may be a decisions id or, for a call copied from `moves` by
 * step 05, the original moves id (decisions.legacy_move_id). Returns null when neither is the
 * person's. The user filter is in every query.
 */
async function loadLedgerCall(supabase, { userId, id }) {
  let decision = must(await supabase
    .from("decisions").select(DECISION_DETAIL_COLUMNS).eq("id", id).eq("user_id", userId).maybeSingle(), "detail_lookup");
  if (!decision) {
    decision = must(await supabase
      .from("decisions").select(DECISION_DETAIL_COLUMNS).eq("legacy_move_id", id).eq("user_id", userId).maybeSingle(), "detail_legacy_lookup");
  }
  if (!decision) return null;

  const [factors, action, outcome, successors, league] = await Promise.all([
    supabase.from("decision_factors")
      .select("position,factor_key,family,line_label,evidence_kind,used,statement,source,source_as_of,reason_code")
      .eq("decision_id", decision.id).eq("user_id", userId).order("position", { ascending: true }),
    supabase.from("decision_actions")
      .select("followed,stars,note,provenance").eq("decision_id", decision.id).eq("user_id", userId).maybeSingle(),
    supabase.from("decision_outcomes")
      .select("state,result,provenance,reconciliation_state,scoring_coverage_state,scoring_format,effectiveness,summary,scored_at")
      .eq("decision_id", decision.id).eq("user_id", userId).maybeSingle(),
    supabase.from("decisions").select("id").eq("supersedes_id", decision.id).eq("user_id", userId).limit(1),
    supabase.from("leagues").select("provider,provider_league_id").eq("id", decision.league_id).maybeSingle(),
  ]);

  return {
    decision,
    factors: must(factors, "detail_factors") || [],
    action: must(action, "detail_action"),
    outcome: must(outcome, "detail_outcome"),
    superseded: (must(successors, "detail_successor") || []).length > 0,
    league: must(league, "detail_league"),
  };
}

// --- Tuesday scoring -------------------------------------------------------------------------------

/**
 * Current calls for finished weeks of `season` (week < beforeWeek) that have no final outcome yet.
 * A call with a `data_incomplete` outcome is returned again so a later run can complete it.
 */
async function fetchScorableDecisions(supabase, { season, beforeWeek }) {
  const decisions = must(await supabase
    .from("ledger_current_calls")
    .select(SCORABLE_COLUMNS)
    .eq("season", season)
    .lt("week", beforeWeek)
    .order("issued_at", { ascending: true }), "scoring_lookup") || [];
  if (!decisions.length) return [];

  const ids = decisions.map((decision) => decision.id);
  const outcomes = new Map();
  const actions = new Map();
  for (const batch of chunks(ids)) {
    for (const row of must(await supabase.from("decision_outcomes")
      .select("decision_id,state,result,reconciliation_state,summary").in("decision_id", batch), "scoring_outcomes") || []) {
      outcomes.set(row.decision_id, row);
    }
    for (const row of must(await supabase.from("decision_actions")
      .select("decision_id,followed").in("decision_id", batch), "scoring_actions") || []) {
      actions.set(row.decision_id, row);
    }
  }

  return decisions
    .filter((decision) => !FINAL_OUTCOME_STATES.has(outcomes.get(decision.id)?.state))
    .map((decision) => ({
      decision,
      outcome: outcomes.get(decision.id) || null,
      action: actions.get(decision.id) || null,
    }));
}

/**
 * Write one outcome. Insert when there is none; complete a data_incomplete one only when something
 * changed. A final outcome is never touched (the database refuses it too). A concurrent run that
 * inserted first is reported as `exists`, not an error.
 */
async function saveDecisionOutcome(supabase, { decision, existing = null, outcome, now = new Date() }) {
  if (existing && FINAL_OUTCOME_STATES.has(existing.state)) return "final";
  const row = {
    state: outcome.state,
    result: outcome.state === "resolved" ? outcome.result : null,
    provenance: outcome.provenance,
    reconciliation_state: RECONCILIATION_STATES.has(outcome.reconciliation_state) ? outcome.reconciliation_state : null,
    scoring_coverage_state: COVERAGE_STATES.has(decision.scoring_coverage_state) ? decision.scoring_coverage_state : null,
    scoring_format: text(decision.scoring_format),
    effectiveness: integerIn(outcome.effectiveness, 0, 100),
    summary: text(outcome.summary),
    scored_at: now.toISOString(),
  };

  if (existing) {
    const unchanged = existing.state === row.state
      && (existing.result ?? null) === row.result
      && (existing.reconciliation_state ?? null) === row.reconciliation_state
      && (existing.summary ?? null) === row.summary;
    if (unchanged) return "unchanged";
    must(await supabase.from("decision_outcomes").update(row)
      .eq("decision_id", decision.id).eq("state", "data_incomplete"), "outcome_update");
    return "updated";
  }

  const insert = await supabase.from("decision_outcomes").insert({ decision_id: decision.id, user_id: decision.user_id, ...row });
  if (insert.error?.code === UNIQUE_VIOLATION) return "exists";
  must(insert, "outcome_insert");
  return "inserted";
}

module.exports = {
  CALL_TYPES,
  LedgerError,
  decisionRecord,
  factorRows,
  fetchScorableDecisions,
  listLedgerCalls,
  loadLedgerCall,
  recordDecision,
  recordDecisionAction,
  recordDecisionSafely,
  resolveLeagueId,
  sameCall,
  saveDecisionOutcome,
};
