"use strict";

const { CONTRACTS } = require("./contracts");
const { hashCanonical } = require("./canonicalize");

const DEFAULT_FEATURE_DEFINITIONS = Object.freeze([
  { key: "motion_rate", metric: "offense_motion", kind: "rate", source_family: "ftn_charting" },
  { key: "no_huddle_rate", metric: "no_huddle", kind: "rate", source_family: "play_by_play" },
  { key: "play_action_rate", metric: "play_action", kind: "rate", source_family: "ftn_charting" },
  { key: "rpo_rate", metric: "rpo", kind: "rate", source_family: "ftn_charting" },
  { key: "screen_rate", metric: "screen", kind: "rate", source_family: "ftn_charting" },
  { key: "qb_out_of_pocket_rate", metric: "qb_out_of_pocket", kind: "rate", source_family: "ftn_charting" },
  { key: "qb_location", metric: "qb_location", kind: "distribution", source_family: "ftn_charting" },
  { key: "backfield_count", metric: "backfield_count", kind: "distribution", source_family: "ftn_charting" },
  { key: "box_count", metric: "box_count", kind: "distribution", source_family: "ftn_charting" },
  { key: "blitzers", metric: "blitzers", kind: "distribution", source_family: "ftn_charting" },
  { key: "pass_rushers", metric: "pass_rushers", kind: "distribution", source_family: "ftn_charting" },
]);

function buildFeatureWindow({ facts, subject, from, through, featureDefinitions = DEFAULT_FEATURE_DEFINITIONS, windowId }) {
  requireObject(subject, "subject");
  requirePeriod(from, "from");
  requirePeriod(through, "through");
  if (!Array.isArray(facts)) throw invalid("facts must be an array");
  if (!Array.isArray(featureDefinitions) || featureDefinitions.length === 0) throw invalid("featureDefinitions must be non-empty");

  const eligible = facts.filter((fact) => validateAndSelectFact(fact, subject, from, through));
  eligible.sort(compareFacts);
  const playKeys = new Set(eligible.map(playKey));
  const gameKeys = new Set(eligible.map((fact) => fact.game_id));
  const eligiblePlays = playKeys.size;
  const features = {};

  for (const definition of [...featureDefinitions].sort((a, b) => a.key.localeCompare(b.key))) {
    validateDefinition(definition);
    const observations = eligible.filter((fact) => fact.metric === definition.metric && fact.availability === "observed");
    const byPlay = new Map();
    for (const fact of observations) {
      const key = playKey(fact);
      if (byPlay.has(key)) throw invalid(`duplicate observed metric ${definition.metric} for play ${key}`);
      byPlay.set(key, fact.value);
    }
    const values = [...byPlay.values()];
    const base = {
      denominator: values.length,
      missing: Math.max(0, eligiblePlays - values.length),
      source_family: definition.source_family,
      effective_window: { from, through },
    };
    if (definition.kind === "rate") {
      if (values.some((value) => typeof value !== "boolean" && value !== 0 && value !== 1)) {
        throw invalid(`${definition.metric} rate values must be boolean or 0/1`);
      }
      const numerator = values.reduce((sum, value) => sum + (value === true || value === 1 ? 1 : 0), 0);
      features[definition.key] = { ...base, kind: "rate", numerator, value: values.length ? numerator / values.length : null };
    } else {
      const counts = values.reduce((result, value) => {
        const category = String(value);
        result[category] = (result[category] || 0) + 1;
        return result;
      }, {});
      const distribution = Object.fromEntries(Object.keys(counts).sort().map((key) => [key, counts[key] / values.length]));
      features[definition.key] = { ...base, kind: "distribution", counts: sortObject(counts), distribution };
    }
  }

  const observedFeatures = Object.values(features).filter((feature) => feature.denominator > 0).length;
  const totalFeatures = featureDefinitions.length;
  const coverage = observedFeatures === 0 ? "none" : observedFeatures === totalFeatures ? "complete" : "partial";
  const limitations = [];
  if (eligiblePlays === 0) limitations.push("No eligible plays in the requested window.");
  if (coverage !== "complete") limitations.push(`${totalFeatures - observedFeatures} of ${totalFeatures} feature families have no observations.`);
  const identity = { subject, from, through, feature_definitions: featureDefinitions };

  return {
    contract_version: CONTRACTS.featureWindow,
    window_id: windowId || hashCanonical(identity),
    subject: { type: subject.type, id: subject.id },
    from: { season: from.season, week: from.week },
    through: { season: through.season, week: through.week },
    eligible_plays: eligiblePlays,
    games: gameKeys.size,
    features,
    coverage,
    limitations,
    input_hash: hashCanonical(eligible.map(canonicalFactInput)),
  };
}

function validateAndSelectFact(fact, subject, from, through) {
  requireObject(fact, "fact");
  for (const key of ["contract_version", "fact_key", "game_id", "play_id", "subject_type", "subject_id", "metric", "availability", "season", "week"]) {
    if (fact[key] === undefined || fact[key] === null || fact[key] === "") throw invalid(`fact missing ${key}`);
  }
  if (fact.contract_version !== CONTRACTS.observedFact) throw invalid(`unsupported observed fact contract: ${fact.contract_version}`);
  requireObject(fact.source, "fact.source");
  if (!/^sha256:[a-f0-9]{64}$/.test(fact.source.artifact_sha256 || "") || typeof fact.source.row_key !== "string" || !fact.source.row_key) throw invalid(`fact source provenance is invalid: ${fact.fact_key}`);
  if (fact.normalization_version !== "football-intelligence-normalization.v1") throw invalid(`unsupported normalization version: ${fact.fact_key}`);
  if (fact.value !== null && typeof fact.value === "number" && !Number.isFinite(fact.value)) throw invalid(`non-finite fact value: ${fact.fact_key}`);
  return fact.subject_type === subject.type && fact.subject_id === subject.id && fact.eligible !== false && comparePeriod(fact, from) >= 0 && comparePeriod(fact, through) <= 0;
}

function canonicalFactInput(fact) {
  return {
    fact_key: fact.fact_key, game_id: fact.game_id, play_id: String(fact.play_id), season: fact.season,
    week: fact.week, metric: fact.metric, value: fact.value, availability: fact.availability,
    source: fact.source, normalization_version: fact.normalization_version,
  };
}

function compareFacts(a, b) {
  return a.season - b.season || a.week - b.week || a.game_id.localeCompare(b.game_id) || String(a.play_id).localeCompare(String(b.play_id)) || a.metric.localeCompare(b.metric) || a.fact_key.localeCompare(b.fact_key);
}

function comparePeriod(a, b) { return Number(a.season) - Number(b.season) || Number(a.week) - Number(b.week); }
function playKey(fact) { return `${fact.game_id}:${fact.play_id}`; }
function requirePeriod(value, name) { requireObject(value, name); if (!Number.isInteger(value.season) || !Number.isInteger(value.week)) throw invalid(`${name} requires integer season and week`); }
function requireObject(value, name) { if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid(`${name} must be an object`); }
function validateDefinition(value) { requireObject(value, "feature definition"); if (!value.key || !value.metric || !["rate", "distribution"].includes(value.kind) || !value.source_family) throw invalid("invalid feature definition"); }
function sortObject(value) { return Object.fromEntries(Object.keys(value).sort().map((key) => [key, value[key]])); }
function invalid(message) { const error = new TypeError(message); error.code = "FOOTBALL_INTELLIGENCE_INVALID"; return error; }

module.exports = { DEFAULT_FEATURE_DEFINITIONS, buildFeatureWindow };
