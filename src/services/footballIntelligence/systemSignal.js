"use strict";

const { CONTRACTS, MODELS } = require("./contracts");
const { hashCanonical } = require("./canonicalize");
const { compareSchemeDna } = require("./schemeDna");

function buildSystemSignal({ subject, baseline, comparison, fantasyImplications = [], alternativeExplanations = [], limitations = [] }) {
  const similarity = compareSchemeDna(baseline, comparison);
  const state = classifyState(baseline, comparison, similarity);
  const evidence = similarity.components.map((component) => {
    const previous = scalarValue(baseline.features[component.feature]);
    const current = scalarValue(comparison.features[component.feature]);
    return {
      feature: component.feature,
      baseline_value: previous,
      comparison_value: current,
      direction: previous === null || current === null ? "distribution_similarity" : current > previous ? "up" : current < previous ? "down" : "flat",
      delta: previous === null || current === null ? null : round(current - previous),
      similarity: component.similarity,
    };
  });
  const confidence = signalConfidence(baseline, comparison, similarity);
  const artifact = {
    contract_version: CONTRACTS.systemSignal,
    model_version: MODELS.systemSignal,
    signal_type: "tendency_similarity",
    state,
    subject: subject || comparison.subject,
    baseline: { scheme_dna_hash: baseline.output_hash, subject: baseline.subject, window_id: baseline.window_id },
    comparison: { scheme_dna_hash: comparison.output_hash, subject: comparison.subject, window_id: comparison.window_id },
    similarity,
    evidence,
    confidence,
    fantasy_implications: cleanStrings(fantasyImplications),
    alternative_explanations: cleanStrings(alternativeExplanations),
    limitations: [...new Set([...limitations, ...similarity.limitations, ...baseline.limitations, ...comparison.limitations])].sort(),
  };
  return { ...artifact, output_hash: hashCanonical(artifact) };
}

function classifyState(baseline, comparison, similarity) {
  if (similarity.status !== "available" || similarity.score === null) return "insufficient_data";
  const minGames = Math.min(baseline.sample.games, comparison.sample.games);
  if (similarity.score >= 0.8) return minGames >= 6 ? "established" : "emerging";
  return similarity.score < 0.5 ? "reversing" : "emerging";
}

function signalConfidence(baseline, comparison, similarity) {
  if (similarity.status !== "available") return "low";
  const levels = { low: 0, medium: 1, high: 2 };
  return levels[baseline.confidence] <= levels[comparison.confidence] ? baseline.confidence : comparison.confidence;
}
function scalarValue(feature) { return feature && feature.kind === "rate" ? feature.value : null; }
function cleanStrings(values) { if (!Array.isArray(values) || values.some((value) => typeof value !== "string" || !value.trim())) throw invalid("explanation fields must be arrays of non-empty strings"); return [...new Set(values.map((value) => value.trim()))].sort(); }
function round(value) { return Number(value.toFixed(6)); }
function invalid(message) { const error = new TypeError(message); error.code = "FOOTBALL_INTELLIGENCE_INVALID"; return error; }

module.exports = { buildSystemSignal, classifyState };
