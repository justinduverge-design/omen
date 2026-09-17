"use strict";

/**
 * Shared, additive evidence vocabulary for every Omen destination.
 *
 * This normalizes the engine's legacy signal envelope without changing the legacy
 * envelope itself.  It is intentionally presentation-neutral: Omen, Command,
 * League, Start/Sit, Trade, and Ledger may choose different layouts, but they must
 * not each decide independently whether a source is a fact, a projection, or a
 * limitation.
 */
const CAPABILITY_CONTRACT = "decision-capabilities.v1";

const LIVE_EVIDENCE_KIND = Object.freeze({
  roster: "verified",
  game_time_tv: "verified",
  matchup_dvp: "inference",
  projections: "projection",
  llm_reasoning: "model",
  travel_home_away: "model",
  weather: "inference",
  waivers: "inference",
  exact_scoring: "verified",
  exact_espn_scoring_unavailable: "verified",
});

function capabilityState(status) {
  // `stub` is a development implementation marker, not a user-facing capability
  // state. The capability contract exposes the safe user truth instead.
  if (status === "stub") return "unavailable";
  if (["live", "mock", "demo", "unavailable"].includes(status)) return status;
  return "unavailable";
}

function evidenceKindFor(name, signal = {}) {
  if (capabilityState(signal.status) !== "live") return "limitation";
  return LIVE_EVIDENCE_KIND[name] || "inference";
}

function safeIso(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function safeRecordObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function safeFacts(value) {
  if (!Array.isArray(value)) return null;
  const facts = value
    .map((fact) => safeRecordObject(fact))
    .filter(Boolean)
    .map((fact) => ({
      ...(typeof fact.name === "string" ? { name: fact.name } : {}),
      ...(typeof fact.kind === "string" ? { kind: fact.kind } : {}),
      ...(typeof fact.source === "string" ? { source: fact.source } : {}),
      ...(typeof fact.statement === "string" ? { statement: fact.statement } : {}),
      ...(typeof fact.value === "string" || typeof fact.value === "number" || fact.value === null
        ? { value: fact.value }
        : {}),
    }));
  return facts.length ? facts : null;
}

function toCapability(name, signal = {}, generatedAt = null) {
  const state = capabilityState(signal.status);
  const observedAt = safeIso(signal.observed_at) || (state === "live" ? safeIso(generatedAt) : null);
  return {
    name,
    state,
    used: signal.used === true,
    kind: evidenceKindFor(name, signal),
    source: typeof signal.source === "string" && signal.source.trim() ? signal.source : "unknown",
    statement: typeof signal.message === "string" && signal.message.trim()
      ? signal.message.trim()
      : "Omen did not provide a readable statement for this capability.",
    observed_at: observedAt,
    fresh_until: safeIso(signal.fresh_until),
  };
}

// Source-specific promotion modules may provide a richer record than the legacy Omen signal
// envelope. This adapter makes that record additive without letting every route invent its own
// state/kind conversion. `resolution` is deliberately fail-closed: anything other than an
// explicit available/live value remains unavailable in the shared contract.
function promotedCapability(name, record = {}, generatedAt = null) {
  const resolution = String(record.resolution || "").toLowerCase();
  const suppliedState = capabilityState(record.state || record.status);
  const state = resolution
    ? (["available", "live"].includes(resolution) ? suppliedState === "unavailable" ? "live" : suppliedState : "unavailable")
    : suppliedState;
  const kind = ["verified", "projection", "model", "inference", "limitation"].includes(record.kind)
    ? record.kind
    : state === "live" ? evidenceKindFor(name, { status: state }) : "limitation";
  return {
    name,
    state,
    used: record.used === true,
    kind,
    source: typeof record.source === "string" && record.source.trim() ? record.source : "unknown",
    statement: typeof record.statement === "string" && record.statement.trim()
      ? record.statement.trim()
      : typeof record.message === "string" && record.message.trim()
        ? record.message.trim()
        : "Omen did not provide a readable statement for this capability.",
    observed_at: safeIso(record.observed_at) || (state === "live" ? safeIso(generatedAt) : null),
    fresh_until: safeIso(record.fresh_until),
    ...(typeof record.reason_code === "string" && record.reason_code ? { reason_code: record.reason_code } : {}),
    ...(safeRecordObject(record.detail_ref) ? { detail_ref: record.detail_ref } : {}),
    ...(typeof record.coverage_state === "string" ? { coverage_state: record.coverage_state } : {}),
    ...(typeof record.reconciliation_state === "string" ? { reconciliation_state: record.reconciliation_state } : {}),
    ...(safeFacts(record.facts) ? { facts: safeFacts(record.facts) } : {}),
  };
}

function buildDecisionCapabilities({ signals = {}, promoted = {}, generatedAt = null } = {}) {
  const all = new Map(
    Object.entries(signals || {}).map(([name, signal]) => [name, toCapability(name, signal, generatedAt)])
  );
  for (const [name, record] of Object.entries(promoted || {})) {
    all.set(name, promotedCapability(name, record, generatedAt));
  }
  return {
    contract_version: CAPABILITY_CONTRACT,
    capabilities: [...all.values()].sort((left, right) => left.name.localeCompare(right.name)),
  };
}

module.exports = {
  CAPABILITY_CONTRACT,
  capabilityState,
  evidenceKindFor,
  toCapability,
  promotedCapability,
  buildDecisionCapabilities,
};
