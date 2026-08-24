"use strict";

// This is deliberately a provider-neutral language. Provider adapters must preserve
// their original settings and map each setting here or return an explicit coverage
// failure; an unknown provider key is never treated as a zero-point rule.
const SCORING_CONTRACT_VERSION = "omen-scoring-contract-v1";

const COVERAGE_STATES = new Set([
  "supported",
  "provider_adjusted",
  "provider_restricted",
  "unsupported",
  "ambiguous",
  "mismatch",
  "pending",
]);

const EVENT_KEYS = new Set([
  // Offensive player facts.
  "passing_yards", "passing_touchdowns", "passing_interceptions",
  "rushing_yards", "rushing_touchdowns", "receiving_receptions",
  "receiving_yards", "receiving_touchdowns", "fumbles_lost",
  "two_point_conversions", "return_touchdowns",
  // Kicker facts.
  "extra_points_made", "extra_points_missed", "field_goals_made",
  "field_goals_missed", "field_goals_made_0_39", "field_goals_made_40_49",
  "field_goals_made_50_plus",
  // Team defense / special teams facts.
  "defense_sacks", "defense_interceptions", "defense_fumble_recoveries",
  "defense_touchdowns", "defense_safeties", "defense_blocks",
  "defense_return_touchdowns", "defense_points_allowed", "defense_yards_allowed",
  // Individual defensive player facts.
  "idp_solo_tackles", "idp_assisted_tackles", "idp_tackles_for_loss",
  "idp_sacks", "idp_interceptions", "idp_passes_defended", "idp_forced_fumbles",
  "idp_fumble_recoveries", "idp_defensive_touchdowns", "idp_safeties",
]);

const OPERATORS = new Set(["per_event", "per_unit", "threshold_bonus", "range_event"]);

function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`scoring rule requires finite ${field}`);
  return number;
}

function inspectScoringContract(contract) {
  const rules = Array.isArray(contract?.rules) ? contract.rules : [];
  const declared = COVERAGE_STATES.has(contract?.coverage_state)
    ? contract.coverage_state
    : "unsupported";
  const unsupportedEventKeys = [...new Set(rules
    .map((rule) => rule?.event_key)
    .filter((eventKey) => !EVENT_KEYS.has(eventKey)))];
  const invalidOperators = [...new Set(rules
    .map((rule) => rule?.operator)
    .filter((operator) => !OPERATORS.has(operator)))];
  const coverageState = unsupportedEventKeys.length || invalidOperators.length || !rules.length
    ? "unsupported"
    : declared;

  return {
    contract_version: contract?.ruleset_version || null,
    coverage_state: coverageState,
    exact: coverageState === "supported",
    unsupported_event_keys: unsupportedEventKeys,
    invalid_operators: invalidOperators,
  };
}

function pointsForRule(rule, facts) {
  const observed = finite(facts?.[rule.event_key] ?? 0, `fact ${rule.event_key}`);
  const value = finite(rule.value, "value");

  switch (rule.operator) {
    case "per_event":
      return observed * value;
    case "per_unit": {
      const unit = finite(rule.unit, "unit");
      if (unit <= 0) throw new Error("per_unit scoring rule requires a positive unit");
      return (observed / unit) * value;
    }
    case "threshold_bonus":
      return observed >= finite(rule.threshold, "threshold") ? value : 0;
    case "range_event": {
      const min = finite(rule.min, "min");
      const max = finite(rule.max, "max");
      if (max < min) throw new Error("range_event scoring rule requires max >= min");
      return observed >= min && observed <= max ? value : 0;
    }
    default:
      throw new Error(`unsupported scoring operator: ${rule.operator}`);
  }
}

function calculateContractScore(contract, facts = {}) {
  const inspection = inspectScoringContract(contract);
  if (inspection.coverage_state !== "supported") {
    throw new Error(`unsupported scoring contract: ${inspection.coverage_state}`);
  }
  if (inspection.contract_version !== SCORING_CONTRACT_VERSION) {
    throw new Error(`unsupported scoring contract version: ${inspection.contract_version || "missing"}`);
  }

  const points = contract.rules.reduce((total, rule) => total + pointsForRule(rule, facts), 0);
  return {
    points: Number(points.toFixed(8)),
    coverage_state: inspection.coverage_state,
    ruleset_version: inspection.contract_version,
  };
}

module.exports = {
  COVERAGE_STATES,
  EVENT_KEYS,
  OPERATORS,
  SCORING_CONTRACT_VERSION,
  calculateContractScore,
  inspectScoringContract,
};
