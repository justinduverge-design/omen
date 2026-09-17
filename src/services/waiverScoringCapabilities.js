"use strict";

/**
 * Source-specific capability promotion for Waivers and league-exact scoring.
 *
 * This module deliberately does not fetch a provider, calculate a waiver bid,
 * or mutate a scoring record. It turns the already-authoritative results from
 * `waiver-analysis.v1` and the scoring snapshot/reconciliation path into the
 * small, safe records the shared decision-capabilities contract can carry.
 *
 * Keeping this mapping separate prevents each destination from deciding that
 * `engine_limitation` means "no moves", that a null bid means $0, or that
 * supported rules mean a reconciled final score.
 */

const CAPABILITY_CONTRACT = "decision-capabilities.v1";
const WAIVER_CAPABILITY = "waivers";
const SCORING_CAPABILITY = "league_exact_scoring";

const WAIVER_STATES = new Set([
  "confirmed_opportunity",
  "availability_unknown",
  "no_low_cost_drop",
  "no_credible_move",
  "engine_limitation",
  "off_season",
]);

const SCORING_COVERAGE_STATES = new Set([
  "supported",
  "provider_adjusted",
  "provider_restricted",
  "unsupported",
  "ambiguous",
  "mismatch",
  "pending",
]);

const RECONCILIATION_STATES = new Set([
  "exact",
  "provider_adjusted",
  "provider_restricted",
  "unsupported",
  "ambiguous",
  "mismatch",
  "pending",
]);

function safeIso(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function safeText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function capability({ name, state, used = false, kind, source, statement, observedAt = null, reasonCode, detailRef = null, coverageState = null, reconciliationState = null }) {
  return {
    name,
    // The shared contract's current state vocabulary is live/unavailable. The
    // reason code is required to retain the product distinction underneath it.
    state,
    used: used === true,
    kind,
    source,
    statement,
    observed_at: safeIso(observedAt),
    fresh_until: null,
    reason_code: reasonCode,
    ...(detailRef ? { detail_ref: detailRef } : {}),
    ...(coverageState ? { coverage_state: coverageState } : {}),
    ...(reconciliationState ? { reconciliation_state: reconciliationState } : {}),
  };
}

function waiverFallback(state) {
  switch (state) {
    case "confirmed_opportunity":
      return "Omen confirmed a waiver opportunity for this league.";
    case "availability_unknown":
      return "Omen cannot confirm waiver availability for this league.";
    case "no_low_cost_drop":
      return "Omen found a possible add but no low-cost drop it can defend.";
    case "no_credible_move":
      return "Omen read the waiver context and found no credible move right now.";
    case "engine_limitation":
      return "Omen could not read enough waiver context to make a waiver call.";
    case "off_season":
      return "Waiver analysis returns with the regular season.";
    default:
      return "Omen could not determine waiver availability for this league.";
  }
}

/**
 * Promote an existing waiver-analysis response without changing the waiver
 * decision itself. `no_credible_move` and `no_low_cost_drop` are live reads:
 * they are not service outages. Conversely, an unread pool remains an engine
 * limitation and never gets represented as an empty waiver wire.
 */
function waiverCapability(analysis = {}, { used = false } = {}) {
  const waiverState = WAIVER_STATES.has(analysis?.state)
    ? analysis.state
    : "availability_unknown";
  const state = ["confirmed_opportunity", "no_low_cost_drop", "no_credible_move"].includes(waiverState)
    ? "live"
    : "unavailable";

  return capability({
    name: WAIVER_CAPABILITY,
    state,
    used,
    kind: state === "live" ? "inference" : "limitation",
    source: safeText(analysis?.platform, "provider_unknown"),
    statement: safeText(analysis?.message, waiverFallback(waiverState)),
    observedAt: analysis?.generated_at,
    reasonCode: waiverState,
    detailRef: {
      contract: "waiver-analysis.v1",
      path: "/api/waivers/analysis",
    },
  });
}

function scoringFallback(coverageState, reconciliationState) {
  if (reconciliationState === "exact") {
    return "Omen reproduced the provider's final score from this league's own rules.";
  }
  if (reconciliationState === "provider_adjusted") {
    return "The provider's final score includes an adjustment Omen did not independently reproduce.";
  }
  if (reconciliationState === "mismatch") {
    return "Omen's calculation and the provider's final score do not reconcile, so an exact result is unavailable.";
  }
  if (coverageState === "supported") {
    return "Omen read a supported league scoring contract, but a league-exact final result has not been reconciled.";
  }
  if (coverageState === "ambiguous") {
    return "Omen read this league's rules but cannot reproduce every material rule, so it will not call a result league-exact.";
  }
  if (coverageState === "provider_restricted") {
    return "This provider has not granted Omen a path to verify the complete scoring contract, so league-exact scoring is unavailable.";
  }
  if (coverageState === "unsupported") {
    return "Omen cannot build a supported scoring contract for this league.";
  }
  return "Omen has not captured enough scoring evidence to call a result league-exact.";
}

/**
 * Promote precomputed snapshot/reconciliation metadata. The only `live`
 * league-exact scoring state is an authoritative exact reconciliation. A
 * supported rule snapshot is useful provenance, but is still unavailable for
 * a final-score claim until reconciliation says exact.
 */
function scoringCoverageCapability(scoring = {}, { used = false, observedAt = null } = {}) {
  const coverageState = SCORING_COVERAGE_STATES.has(scoring?.coverage_state)
    ? scoring.coverage_state
    : "pending";
  const reconciliationState = RECONCILIATION_STATES.has(scoring?.reconciliation_state)
    ? scoring.reconciliation_state
    : "pending";
  const exact = coverageState === "supported" && reconciliationState === "exact";

  return capability({
    name: SCORING_CAPABILITY,
    state: exact ? "live" : "unavailable",
    used,
    kind: exact ? "verified" : "limitation",
    source: "league_scoring_contract",
    statement: safeText(scoring?.reason, scoringFallback(coverageState, reconciliationState)),
    observedAt,
    reasonCode: exact ? "league_exact" : `coverage_${coverageState}`,
    coverageState,
    reconciliationState,
  });
}

/**
 * Compatibility bridge for `buildDecisionCapabilities()`. Extra source-specific
 * fields intentionally stay on the canonical record above; the legacy signal
 * envelope only has room for the common fields.
 */
function asLegacySignal(record) {
  return {
    status: record?.state === "live" ? "live" : "unavailable",
    used: record?.used === true,
    source: safeText(record?.source, "unknown"),
    message: safeText(record?.statement, "Omen could not provide a capability statement."),
    observed_at: safeIso(record?.observed_at),
    fresh_until: safeIso(record?.fresh_until),
  };
}

function waiverCapabilitiesEnvelope(analysis, options = {}) {
  return {
    capability_contract: CAPABILITY_CONTRACT,
    capabilities: [waiverCapability(analysis, options)],
  };
}

module.exports = {
  CAPABILITY_CONTRACT,
  WAIVER_CAPABILITY,
  SCORING_CAPABILITY,
  asLegacySignal,
  scoringCoverageCapability,
  waiverCapability,
  waiverCapabilitiesEnvelope,
};
