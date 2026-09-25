"use strict";

// Deliberately independent from the producer modules. A shared constant or hashing helper would
// let a producer defect validate itself, which defeats this boundary.
const crypto = require("node:crypto");

const EXPECTED = Object.freeze({
  readModel: "football-intelligence-read-model.v1",
  schemeDna: "scheme-dna.v1",
  schemeDnaModel: "scheme-dna-model.v1",
  systemSignal: "system-signal.v1",
  systemSignalModel: "system-signal-model.v1",
  coachingTreeEdge: "coaching-tree-edge.v1",
  coachingTreeModel: "coaching-tree-model.v1",
  similarityModel: "scheme-dna-similarity.v1",
});
const HASH = /^sha256:[a-f0-9]{64}$/;
const COVERAGE = new Set(["none", "partial", "complete"]);
const CONFIDENCE = new Set(["low", "medium", "high"]);
const AVAILABILITY = new Set(["available", "insufficient_data", "source_unavailable", "unsupported", "invalid"]);
const SIGNAL_STATES = new Set(["emerging", "established", "reversing", "insufficient_data"]);

class FootballIntelligenceValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "FootballIntelligenceValidationError";
    this.code = code;
  }
}

function validateArtifact(artifact) {
  object(artifact, "artifact");
  exact(artifact.contract_version, EXPECTED.readModel, "read-model contract");
  hash(artifact.input_hash, "read-model input_hash");
  hash(artifact.output_hash, "read-model output_hash");
  array(artifact.scheme_dna, "scheme_dna");
  array(artifact.system_signals, "system_signals");
  array(artifact.provenance, "provenance");
  object(artifact.coaching_tree, "coaching_tree");
  exact(artifact.coaching_tree.model_version, EXPECTED.coachingTreeModel, "Coaching Tree model");
  array(artifact.coaching_tree.nodes, "coaching_tree.nodes");
  array(artifact.coaching_tree.edges, "coaching_tree.edges");

  rejectNonFinite(artifact, "artifact");

  const dnaByHash = new Map();
  const windowIds = new Set();
  for (const dna of artifact.scheme_dna) {
    validateDna(dna);
    if (dnaByHash.has(dna.output_hash)) fail("DUPLICATE_DNA_HASH", `duplicate Scheme DNA hash ${dna.output_hash}`);
    dnaByHash.set(dna.output_hash, dna);
    windowIds.add(dna.window_id);
  }

  const nodeIds = new Set();
  for (const node of artifact.coaching_tree.nodes) {
    object(node, "coaching tree node");
    const key = entityKey(node);
    if (nodeIds.has(key)) fail("DUPLICATE_TREE_NODE", `duplicate Coaching Tree node ${key}`);
    nodeIds.add(key);
  }
  for (const edge of artifact.coaching_tree.edges) validateEdge(edge, { dnaByHash, nodeIds });
  const edgeHashes = artifact.coaching_tree.edges.map((edge) => edge.edge_hash);
  if (new Set(edgeHashes).size !== edgeHashes.length) fail("DUPLICATE_TREE_EDGE", "duplicate Coaching Tree edge hash");
  for (const signal of artifact.system_signals) validateSignal(signal, { dnaByHash, windowIds });

  const expectedInputHash = independentHash({
    scheme_dna: artifact.scheme_dna.map((item) => item.output_hash).sort(),
    system_signals: artifact.system_signals.map((item) => item.output_hash).sort(),
    coaching_tree_edges: artifact.coaching_tree.edges.map((item) => item.edge_hash).sort(),
    provenance: [...artifact.provenance].sort((a, b) => independentHash(a).localeCompare(independentHash(b))),
  });
  if (artifact.input_hash !== expectedInputHash) fail("READ_MODEL_INPUT_MISMATCH", "read-model input_hash does not match its component artifacts");

  const expectedOutputHash = independentHash(withoutKey(artifact, "output_hash"));
  if (artifact.output_hash !== expectedOutputHash) {
    fail("READ_MODEL_HASH_MISMATCH", "read-model output_hash does not bind its exact contents");
  }

  return Object.freeze({
    status: "validated",
    scheme_dna: artifact.scheme_dna.length,
    system_signals: artifact.system_signals.length,
    coaching_tree_nodes: artifact.coaching_tree.nodes.length,
    coaching_tree_edges: artifact.coaching_tree.edges.length,
    output_hash: artifact.output_hash,
  });
}

function validateDna(dna) {
  object(dna, "Scheme DNA");
  exact(dna.contract_version, EXPECTED.schemeDna, "Scheme DNA contract");
  exact(dna.model_version, EXPECTED.schemeDnaModel, "Scheme DNA model");
  entity(dna.subject, "Scheme DNA subject");
  nonEmpty(dna.window_id, "Scheme DNA window_id");
  object(dna.features, "Scheme DNA features");
  object(dna.sample, "Scheme DNA sample");
  nonNegativeInteger(dna.sample.eligible_plays, "Scheme DNA eligible plays");
  nonNegativeInteger(dna.sample.games, "Scheme DNA games");
  member(dna.coverage, COVERAGE, "Scheme DNA coverage");
  member(dna.confidence, CONFIDENCE, "Scheme DNA confidence");
  member(dna.status, AVAILABILITY, "Scheme DNA status");
  array(dna.limitations, "Scheme DNA limitations");
  hash(dna.input_hash, "Scheme DNA input_hash");
  hash(dna.output_hash, "Scheme DNA output_hash");

  for (const [key, feature] of Object.entries(dna.features)) validateFeature(feature, `Scheme DNA feature ${key}`);
  if (dna.coverage === "complete" && Object.values(dna.features).some((feature) => feature.denominator === 0)) {
    fail("COVERAGE_MISMATCH", "complete Scheme DNA cannot contain an unobserved feature");
  }
  if (dna.sample.eligible_plays === 0 && dna.confidence !== "low") {
    fail("CONFIDENCE_MISMATCH", "zero-play Scheme DNA cannot exceed low confidence");
  }

  if (dna.output_hash !== independentHash(withoutKey(dna, "output_hash"))) {
    fail("DNA_HASH_MISMATCH", `Scheme DNA output_hash is invalid for ${dna.window_id}`);
  }
}

function validateFeature(feature, label) {
  object(feature, label);
  if (!new Set(["rate", "distribution"]).has(feature.kind)) fail("FEATURE_KIND_INVALID", `${label} has unsupported kind`);
  nonNegativeInteger(feature.denominator, `${label} denominator`);
  nonNegativeInteger(feature.missing, `${label} missing`);
  nonEmpty(feature.source_family, `${label} source_family`);
  object(feature.effective_window, `${label} effective_window`);

  if (feature.kind === "rate") {
    nonNegativeInteger(feature.numerator, `${label} numerator`);
    if (feature.numerator > feature.denominator) fail("FEATURE_DENOMINATOR_INVALID", `${label} numerator exceeds denominator`);
    if (feature.denominator === 0) {
      if (feature.value !== null) fail("FEATURE_VALUE_INVALID", `${label} must use null when its denominator is zero`);
    } else {
      finite(feature.value, `${label} value`);
      if (feature.value < 0 || feature.value > 1) fail("FEATURE_VALUE_INVALID", `${label} rate must be between 0 and 1`);
      if (!near(feature.value, feature.numerator / feature.denominator)) {
        fail("FEATURE_DENOMINATOR_INVALID", `${label} value does not equal numerator/denominator`);
      }
    }
    return;
  }

  object(feature.counts, `${label} counts`);
  object(feature.distribution, `${label} distribution`);
  const total = Object.values(feature.counts).reduce((sum, count) => {
    nonNegativeInteger(count, `${label} category count`);
    return sum + count;
  }, 0);
  if (total !== feature.denominator) fail("FEATURE_DENOMINATOR_INVALID", `${label} counts do not sum to denominator`);
  if (!sameKeys(feature.counts, feature.distribution)) fail("FEATURE_DISTRIBUTION_INVALID", `${label} counts/distribution categories differ`);
  let distributionTotal = 0;
  for (const [category, value] of Object.entries(feature.distribution)) {
    finite(value, `${label} distribution ${category}`);
    if (value < 0 || value > 1 || (feature.denominator > 0 && !near(value, feature.counts[category] / feature.denominator))) {
      fail("FEATURE_DISTRIBUTION_INVALID", `${label} distribution does not match counts`);
    }
    distributionTotal += value;
  }
  if (feature.denominator === 0 ? distributionTotal !== 0 : !near(distributionTotal, 1)) {
    fail("FEATURE_DISTRIBUTION_INVALID", `${label} distribution has invalid total`);
  }
}

function validateSignal(signal, { dnaByHash }) {
  object(signal, "System Signal");
  exact(signal.contract_version, EXPECTED.systemSignal, "System Signal contract");
  if (signal.model_version !== undefined) exact(signal.model_version, EXPECTED.systemSignalModel, "System Signal model");
  nonEmpty(signal.signal_type, "System Signal type");
  member(signal.state, SIGNAL_STATES, "System Signal state");
  entity(signal.subject, "System Signal subject");
  object(signal.baseline, "System Signal baseline");
  object(signal.comparison, "System Signal comparison");
  hash(signal.baseline.scheme_dna_hash, "System Signal baseline hash");
  hash(signal.comparison.scheme_dna_hash, "System Signal comparison hash");
  if (!dnaByHash.has(signal.baseline.scheme_dna_hash) || !dnaByHash.has(signal.comparison.scheme_dna_hash)) {
    fail("SIGNAL_DNA_LINK_INVALID", "System Signal references Scheme DNA outside the read model");
  }
  member(signal.confidence, CONFIDENCE, "System Signal confidence");
  array(signal.evidence, "System Signal evidence");
  array(signal.fantasy_implications, "System Signal fantasy_implications");
  array(signal.alternative_explanations, "System Signal alternative_explanations");
  array(signal.limitations, "System Signal limitations");
  hash(signal.output_hash, "System Signal output_hash");
  if (signal.state !== "insufficient_data" && signal.evidence.length === 0) {
    fail("SIGNAL_EVIDENCE_MISSING", "usable System Signal must carry evidence");
  }
  for (const evidence of signal.evidence) {
    object(evidence, "System Signal evidence item");
    nonEmpty(evidence.feature, "System Signal evidence feature");
    const baselineDna = dnaByHash.get(signal.baseline.scheme_dna_hash);
    const comparisonDna = dnaByHash.get(signal.comparison.scheme_dna_hash);
    if (!baselineDna.features[evidence.feature] || !comparisonDna.features[evidence.feature]) {
      fail("SIGNAL_EVIDENCE_LINK_INVALID", `evidence feature ${evidence.feature} is absent from linked Scheme DNA`);
    }
  }
  if (signal.output_hash !== independentHash(withoutKey(signal, "output_hash"))) fail("SIGNAL_HASH_MISMATCH", "System Signal output_hash is invalid");
}

function validateEdge(edge, { dnaByHash, nodeIds }) {
  object(edge, "Coaching Tree edge");
  exact(edge.contract_version, EXPECTED.coachingTreeEdge, "Coaching Tree edge contract");
  entity(edge.from, "Coaching Tree edge from");
  entity(edge.to, "Coaching Tree edge to");
  if (!nodeIds.has(entityKey(edge.from)) || !nodeIds.has(entityKey(edge.to))) {
    fail("TREE_NODE_LINK_INVALID", "Coaching Tree edge endpoint is absent from nodes");
  }
  hash(edge.edge_hash, "Coaching Tree edge_hash");
  if (edge.edge_hash !== independentHash(withoutKey(edge, "edge_hash"))) fail("TREE_HASH_MISMATCH", "Coaching Tree edge_hash is invalid");
  if (edge.edge_type === "confirmed_assignment") {
    exact(edge.confidence, "confirmed", "confirmed assignment confidence");
    object(edge.effective_window, "confirmed assignment effective_window");
    object(edge.source, "confirmed assignment source");
    hash(edge.source.artifact_sha256, "confirmed assignment source artifact_sha256");
    nonEmpty(edge.source.row_key, "confirmed assignment source row_key");
    if (edge.model_version !== undefined || edge.similarity !== undefined || edge.compared_scheme_dna !== undefined) {
      fail("TREE_EDGE_TYPE_MISMATCH", "confirmed assignment must not carry modeled influence fields");
    }
    return;
  }
  if (edge.edge_type !== "inferred_system_influence") fail("TREE_EDGE_TYPE_INVALID", `unsupported Coaching Tree edge ${edge.edge_type}`);
  exact(edge.model_version, EXPECTED.coachingTreeModel, "inferred Coaching Tree model");
  member(edge.confidence, CONFIDENCE, "inferred influence confidence");
  if (edge.confidence === "confirmed") fail("TREE_EDGE_TYPE_MISMATCH", "inferred influence cannot be confirmed");
  object(edge.compared_scheme_dna, "inferred influence compared_scheme_dna");
  const comparedHashes = [edge.compared_scheme_dna.baseline_hash, edge.compared_scheme_dna.comparison_hash];
  if (comparedHashes.some((value) => !dnaByHash.has(value))) {
    fail("TREE_DNA_LINK_INVALID", "inferred influence must reference two Scheme DNA artifacts in the read model");
  }
  object(edge.similarity, "inferred influence similarity");
  object(edge.evidence, "inferred influence evidence");
  const baseline = dnaByHash.get(edge.compared_scheme_dna.baseline_hash);
  const comparison = dnaByHash.get(edge.compared_scheme_dna.comparison_hash);
  if (JSON.stringify(edge.evidence.baseline_sample) !== JSON.stringify(baseline.sample)
    || edge.evidence.baseline_coverage !== baseline.coverage
    || JSON.stringify(edge.evidence.comparison_sample) !== JSON.stringify(comparison.sample)
    || edge.evidence.comparison_coverage !== comparison.coverage) fail("TREE_EVIDENCE_MISMATCH", "inferred influence evidence does not match compared Scheme DNA");
  exact(edge.similarity.model_version, EXPECTED.similarityModel, "similarity model");
  finite(edge.similarity.score, "inferred influence similarity score");
  if (edge.similarity.score < 0 || edge.similarity.score > 1) fail("TREE_SIMILARITY_INVALID", "inferred influence similarity must be between 0 and 1");
}

function independentHash(value) {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex")}`;
}
function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") { finite(value, "hash input"); return Object.is(value, -0) ? 0 : value; }
  if (Array.isArray(value)) return value.map(canonical);
  object(value, "hash input");
  return Object.fromEntries(Object.keys(value).sort().map((key) => {
    if (value[key] === undefined) fail("NON_CANONICAL_VALUE", `undefined hash property ${key}`);
    return [key, canonical(value[key])];
  }));
}
function withoutKey(value, key) { const copy = { ...value }; delete copy[key]; return copy; }
function rejectNonFinite(value, path) {
  if (typeof value === "number" && !Number.isFinite(value)) fail("NON_FINITE_VALUE", `${path} contains a non-finite number`);
  if (Array.isArray(value)) value.forEach((item, index) => rejectNonFinite(item, `${path}[${index}]`));
  else if (value && typeof value === "object") Object.entries(value).forEach(([key, item]) => rejectNonFinite(item, `${path}.${key}`));
}
function entity(value, label) { object(value, label); nonEmpty(value.type, `${label} type`); nonEmpty(value.id, `${label} id`); }
function entityKey(value) { entity(value, "entity"); return `${value.type}:${value.id}`; }
function object(value, label) { if (!value || typeof value !== "object" || Array.isArray(value)) fail("INVALID_SHAPE", `${label} must be an object`); }
function array(value, label) { if (!Array.isArray(value)) fail("INVALID_SHAPE", `${label} must be an array`); }
function exact(actual, expected, label) { if (actual !== expected) fail("VERSION_MISMATCH", `${label} must be ${expected}`); }
function hash(value, label) { if (!HASH.test(value || "")) fail("HASH_INVALID", `${label} must be a canonical sha256 hash`); }
function finite(value, label) { if (!Number.isFinite(value)) fail("NON_FINITE_VALUE", `${label} must be finite`); }
function nonNegativeInteger(value, label) { if (!Number.isInteger(value) || value < 0) fail("INVALID_COUNT", `${label} must be a non-negative integer`); }
function nonEmpty(value, label) { if (typeof value !== "string" || value.length === 0) fail("INVALID_SHAPE", `${label} must be a non-empty string`); }
function member(value, allowed, label) { if (!allowed.has(value)) fail("STATE_INVALID", `${label} is unsupported: ${value}`); }
function near(left, right) { return Math.abs(left - right) <= 1e-12; }
function sameKeys(left, right) { return JSON.stringify(Object.keys(left).sort()) === JSON.stringify(Object.keys(right).sort()); }
function fail(code, message) { throw new FootballIntelligenceValidationError(code, message); }

module.exports = { FootballIntelligenceValidationError, validateArtifact };
