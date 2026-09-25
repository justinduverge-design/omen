"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { validateArtifact } = require("../src/services/footballIntelligence/validateArtifact");

function stable(value) {
  if (value === null || typeof value !== "object") return Object.is(value, -0) ? 0 : value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function hash(value) {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex")}`;
}
function hashed(value) { return { ...value, output_hash: hash(value) }; }

function artifact() {
  const baseline = hashed({
    contract_version: "scheme-dna.v1", model_version: "scheme-dna-model.v1",
    subject: { type: "team", id: "DET" }, window_id: "det-2024",
    features: {
      motion_rate: { kind: "rate", value: 0.25, numerator: 10, denominator: 40, missing: 0, source_family: "ftn_charting", effective_window: { from: { season: 2024, week: 1 }, through: { season: 2024, week: 4 } } },
      qb_location: { kind: "distribution", counts: { shotgun: 30, under_center: 10 }, distribution: { shotgun: 0.75, under_center: 0.25 }, denominator: 40, missing: 0, source_family: "ftn_charting", effective_window: { from: { season: 2024, week: 1 }, through: { season: 2024, week: 4 } } },
    },
    status: "available", sample: { eligible_plays: 40, games: 4 }, coverage: "complete", confidence: "medium", limitations: [], input_hash: hash({ source: "det" }),
  });
  const { output_hash: _baselineHash, ...baselineBody } = baseline;
  const comparison = hashed({
    ...baselineBody, subject: { type: "team", id: "CHI" }, window_id: "chi-2025",
    features: { ...baseline.features, motion_rate: { ...baseline.features.motion_rate, value: 0.3, numerator: 12 } },
    input_hash: hash({ source: "chi" }),
  });
  const signal = hashed({
    contract_version: "system-signal.v1", model_version: "system-signal-model.v1",
    signal_type: "tendency_similarity", state: "emerging", subject: { type: "team", id: "CHI" },
    baseline: { scheme_dna_hash: baseline.output_hash }, comparison: { scheme_dna_hash: comparison.output_hash },
    evidence: [{ feature: "motion_rate", baseline_value: 0.25, comparison_value: 0.3, direction: "up", delta: 0.05, similarity: 0.95 }],
    confidence: "medium", fantasy_implications: [], alternative_explanations: ["Roster change"], limitations: [],
  });
  const assignmentBody = { contract_version: "coaching-tree-edge.v1", edge_type: "confirmed_assignment", from: { type: "coach", id: "ben-johnson" }, to: { type: "team", id: "CHI" }, role: "head_coach", effective_window: { from: { season: 2025, week: 1 }, through: { season: 2025, week: 18 } }, source: { artifact_sha256: hash({ employment: 1 }), row_key: "ben-johnson:chi:2025" }, confidence: "confirmed" };
  const influenceBody = { contract_version: "coaching-tree-edge.v1", edge_type: "inferred_system_influence", model_version: "coaching-tree-model.v1", from: { type: "coach", id: "ben-johnson" }, to: { type: "team", id: "CHI" }, effective_window: assignmentBody.effective_window, compared_scheme_dna: { baseline_hash: baseline.output_hash, comparison_hash: comparison.output_hash }, evidence: { baseline_sample: baseline.sample, baseline_coverage: baseline.coverage, comparison_sample: comparison.sample, comparison_coverage: comparison.coverage }, similarity: { model_version: "scheme-dna-similarity.v1", score: 0.78, components: [] }, confidence: "medium", limitations: [] };
  const assignment = { ...assignmentBody, edge_hash: hash(assignmentBody) };
  const influence = { ...influenceBody, edge_hash: hash(influenceBody) };
  const provenance = [{ source_family: "ftn_charting", artifact_sha256: hash({ fixture: 1 }) }];
  const model = {
    contract_version: "football-intelligence-read-model.v1",
    scheme_dna: [baseline, comparison],
    system_signals: [signal],
    coaching_tree: {
      model_version: "coaching-tree-model.v1",
      nodes: [{ type: "coach", id: "ben-johnson" }, { type: "team", id: "CHI" }],
      edges: [assignment, influence],
    },
    provenance,
    input_hash: hash({ scheme_dna: [baseline.output_hash, comparison.output_hash].sort(), system_signals: [signal.output_hash], coaching_tree_edges: [assignment.edge_hash, influence.edge_hash].sort(), provenance }),
  };
  return hashed(model);
}

function rehash(model) {
  const copy = structuredClone(model);
  delete copy.output_hash;
  copy.output_hash = hash(copy);
  return copy;
}

test("independently validates a self-consistent football-intelligence read model", () => {
  const result = validateArtifact(artifact());
  assert.deepEqual(result, {
    status: "validated", scheme_dna: 2, system_signals: 1,
    coaching_tree_nodes: 2, coaching_tree_edges: 2, output_hash: artifact().output_hash,
  });
});

test("rejects exact version drift and non-finite rates", () => {
  const wrongVersion = artifact();
  wrongVersion.scheme_dna[0].model_version = "scheme-dna-model.v2";
  assert.throws(() => validateArtifact(wrongVersion), (error) => error.code === "VERSION_MISMATCH");

  const nonFinite = artifact();
  nonFinite.scheme_dna[0].features.motion_rate.value = Infinity;
  assert.throws(() => validateArtifact(nonFinite), (error) => error.code === "NON_FINITE_VALUE");
});

test("recomputes rate and distribution denominators", () => {
  const badRate = artifact();
  badRate.scheme_dna[0].features.motion_rate.numerator = 11;
  assert.throws(() => validateArtifact(badRate), (error) => error.code === "FEATURE_DENOMINATOR_INVALID");

  const badDistribution = artifact();
  badDistribution.scheme_dna[0].features.qb_location.counts.shotgun = 29;
  assert.throws(() => validateArtifact(badDistribution), (error) => error.code === "FEATURE_DENOMINATOR_INVALID");
});

test("enforces coverage and confidence honesty", () => {
  const impossibleCoverage = artifact();
  impossibleCoverage.scheme_dna[0].features.motion_rate = { ...impossibleCoverage.scheme_dna[0].features.motion_rate, value: null, numerator: 0, denominator: 0 };
  assert.throws(() => validateArtifact(impossibleCoverage), (error) => error.code === "COVERAGE_MISMATCH");

  const impossibleConfidence = artifact();
  impossibleConfidence.scheme_dna[0].sample.eligible_plays = 0;
  impossibleConfidence.scheme_dna[0].confidence = "high";
  assert.throws(() => validateArtifact(impossibleConfidence), (error) => error.code === "CONFIDENCE_MISMATCH");
});

test("keeps confirmed assignments separate from inferred influence", () => {
  const confirmedWithModel = artifact();
  confirmedWithModel.coaching_tree.edges[0].model_version = "coaching-tree-model.v1";
  const confirmedBody = { ...confirmedWithModel.coaching_tree.edges[0] };
  delete confirmedBody.edge_hash;
  confirmedWithModel.coaching_tree.edges[0].edge_hash = hash(confirmedBody);
  assert.throws(() => validateArtifact(confirmedWithModel), (error) => error.code === "TREE_EDGE_TYPE_MISMATCH");

  const inferredAsConfirmed = artifact();
  inferredAsConfirmed.coaching_tree.edges[1].confidence = "confirmed";
  const inferredBody = { ...inferredAsConfirmed.coaching_tree.edges[1] };
  delete inferredBody.edge_hash;
  inferredAsConfirmed.coaching_tree.edges[1].edge_hash = hash(inferredBody);
  assert.throws(() => validateArtifact(inferredAsConfirmed), (error) => ["STATE_INVALID", "TREE_EDGE_TYPE_MISMATCH"].includes(error.code));
});

test("requires signal evidence and DNA links to resolve inside the read model", () => {
  const noEvidence = artifact();
  noEvidence.system_signals[0].evidence = [];
  assert.throws(() => validateArtifact(noEvidence), (error) => error.code === "SIGNAL_EVIDENCE_MISSING");

  const missingDna = artifact();
  missingDna.system_signals[0].comparison.scheme_dna_hash = hash({ missing: true });
  assert.throws(() => validateArtifact(missingDna), (error) => error.code === "SIGNAL_DNA_LINK_INVALID");
});

test("binds component and read-model hashes to their exact contents", () => {
  const corruptedDna = artifact();
  corruptedDna.scheme_dna[0].limitations.push("changed after hashing");
  assert.throws(() => validateArtifact(rehash(corruptedDna)), (error) => error.code === "DNA_HASH_MISMATCH");

  const inconsistentInputs = artifact();
  inconsistentInputs.provenance.push({ source_family: "play_by_play", artifact_sha256: hash({ fixture: 2 }) });
  assert.throws(() => validateArtifact(inconsistentInputs), (error) => error.code === "READ_MODEL_INPUT_MISMATCH");

  const corruptedReadModel = artifact();
  corruptedReadModel.output_hash = hash({ wrong: true });
  assert.throws(() => validateArtifact(corruptedReadModel), (error) => error.code === "READ_MODEL_HASH_MISMATCH");
});

test("rejects duplicate edges and mismatched inferred evidence", () => {
  const duplicate = artifact();
  duplicate.coaching_tree.edges.push(duplicate.coaching_tree.edges[0]);
  assert.throws(() => validateArtifact(duplicate), (error) => error.code === "DUPLICATE_TREE_EDGE");

  const mismatched = artifact();
  mismatched.coaching_tree.edges[1].evidence.baseline_sample = { eligible_plays: 999, games: 1 };
  const body = { ...mismatched.coaching_tree.edges[1] };
  delete body.edge_hash;
  mismatched.coaching_tree.edges[1].edge_hash = hash(body);
  assert.throws(() => validateArtifact(mismatched), (error) => error.code === "TREE_EVIDENCE_MISMATCH");
});
