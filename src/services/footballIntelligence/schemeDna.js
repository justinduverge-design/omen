"use strict";

const { CONTRACTS, MODELS } = require("./contracts");
const { hashCanonical } = require("./canonicalize");

const DEFAULT_MINIMUM_PLAYS = 20;
const DEFAULT_MEDIUM_PLAYS = 80;
const DEFAULT_HIGH_PLAYS = 200;

const FEATURE_WEIGHTS = Object.freeze({
  motion_rate: 1, no_huddle_rate: 0.75, play_action_rate: 1, rpo_rate: 0.75,
  screen_rate: 0.75, qb_out_of_pocket_rate: 0.5, qb_location: 1,
  backfield_count: 0.75, box_count: 0.75, blitzers: 1, pass_rushers: 0.75,
});

function computeSchemeDna(featureWindow, options = {}) {
  validateWindow(featureWindow);
  const minimumPlays = integerOption(options.minimumPlays, DEFAULT_MINIMUM_PLAYS, "minimumPlays");
  const mediumPlays = integerOption(options.mediumPlays, DEFAULT_MEDIUM_PLAYS, "mediumPlays");
  const highPlays = integerOption(options.highPlays, DEFAULT_HIGH_PLAYS, "highPlays");
  const usableFeatures = Object.fromEntries(Object.entries(featureWindow.features)
    .filter(([, feature]) => feature.denominator > 0)
    .sort(([a], [b]) => a.localeCompare(b)));
  const limitations = [...featureWindow.limitations];
  let status = "available";
  if (featureWindow.eligible_plays < minimumPlays || Object.keys(usableFeatures).length === 0) {
    status = "insufficient_data";
    limitations.push(`At least ${minimumPlays} eligible plays and one observed feature are required.`);
  }
  const observedRatio = Object.keys(usableFeatures).length / Math.max(1, Object.keys(featureWindow.features).length);
  const confidence = confidenceFor(featureWindow.eligible_plays, observedRatio, status, { mediumPlays, highPlays });
  const artifact = {
    contract_version: CONTRACTS.schemeDna,
    model_version: MODELS.schemeDna,
    status,
    subject: featureWindow.subject,
    window_id: featureWindow.window_id,
    features: usableFeatures,
    sample: { eligible_plays: featureWindow.eligible_plays, games: featureWindow.games },
    coverage: featureWindow.coverage,
    confidence,
    limitations: [...new Set(limitations)].sort(),
    input_hash: hashCanonical(featureWindow),
  };
  return { ...artifact, output_hash: hashCanonical(artifact) };
}

function compareSchemeDna(baseline, comparison, options = {}) {
  validateDna(baseline, "baseline");
  validateDna(comparison, "comparison");
  const weights = { ...FEATURE_WEIGHTS, ...(options.weights || {}) };
  const shared = Object.keys(baseline.features).filter((key) => comparison.features[key]).sort();
  const components = [];
  for (const key of shared) {
    const a = baseline.features[key];
    const b = comparison.features[key];
    if (a.kind !== b.kind) throw invalid(`feature kind mismatch: ${key}`);
    const distance = a.kind === "rate"
      ? Math.abs(a.value - b.value)
      : jensenShannonDistance(a.distribution, b.distribution);
    const weight = weights[key] === undefined ? 0.5 : weights[key];
    if (!Number.isFinite(weight) || weight <= 0) throw invalid(`invalid weight for ${key}`);
    components.push({ feature: key, kind: a.kind, distance, similarity: 1 - distance, weight });
  }
  if (components.length === 0) return { model_version: MODELS.similarity, status: "insufficient_data", score: null, components: [], limitations: ["No comparable observed features."] };
  const weightTotal = components.reduce((sum, item) => sum + item.weight, 0);
  const distance = components.reduce((sum, item) => sum + item.distance * item.weight, 0) / weightTotal;
  return {
    model_version: MODELS.similarity,
    status: baseline.status === "available" && comparison.status === "available" ? "available" : "insufficient_data",
    score: round(1 - distance),
    components: components.map((item) => ({ ...item, distance: round(item.distance), similarity: round(item.similarity) })),
    limitations: baseline.status === "available" && comparison.status === "available" ? [] : ["At least one fingerprint is below its sample or coverage threshold."],
  };
}

function jensenShannonDistance(left = {}, right = {}) {
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  if (!keys.length) return 1;
  const divergence = keys.reduce((sum, key) => {
    const p = Number(left[key] || 0); const q = Number(right[key] || 0); const m = (p + q) / 2;
    if (![p, q].every((value) => Number.isFinite(value) && value >= 0)) throw invalid("distribution values must be finite and non-negative");
    return sum + (p ? 0.5 * p * Math.log(p / m) : 0) + (q ? 0.5 * q * Math.log(q / m) : 0);
  }, 0);
  return Math.sqrt(Math.max(0, divergence) / Math.log(2));
}

function confidenceFor(plays, ratio, status, thresholds) {
  if (status !== "available") return "low";
  if (plays >= thresholds.highPlays && ratio >= 0.8) return "high";
  if (plays >= thresholds.mediumPlays && ratio >= 0.5) return "medium";
  return "low";
}
function validateWindow(value) { if (!value || value.contract_version !== CONTRACTS.featureWindow || !value.subject || !value.features || !Number.isInteger(value.eligible_plays)) throw invalid("invalid feature window"); }
function validateDna(value, name) { if (!value || value.contract_version !== CONTRACTS.schemeDna || !value.output_hash || !value.features) throw invalid(`invalid ${name} Scheme DNA`); }
function integerOption(value, fallback, name) { if (value === undefined) return fallback; if (!Number.isInteger(value) || value < 1) throw invalid(`${name} must be a positive integer`); return value; }
function round(value) { return Number(value.toFixed(6)); }
function invalid(message) { const error = new TypeError(message); error.code = "FOOTBALL_INTELLIGENCE_INVALID"; return error; }

module.exports = { DEFAULT_MINIMUM_PLAYS, FEATURE_WEIGHTS, compareSchemeDna, computeSchemeDna, jensenShannonDistance };
