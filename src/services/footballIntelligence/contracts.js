"use strict";

const CONTRACTS = Object.freeze({
  observedFact: "football-observed-fact.v1",
  featureWindow: "football-feature-window.v1",
  schemeDna: "scheme-dna.v1",
  systemSignal: "system-signal.v1",
  coachingTreeEdge: "coaching-tree-edge.v1",
  readModel: "football-intelligence-read-model.v1",
});

const MODELS = Object.freeze({
  normalization: "football-intelligence-normalization.v1",
  schemeDna: "scheme-dna-model.v1",
  similarity: "scheme-dna-similarity.v1",
  systemSignal: "system-signal-model.v1",
  coachingTree: "coaching-tree-model.v1",
});

const AVAILABILITY = Object.freeze([
  "available",
  "insufficient_data",
  "source_unavailable",
  "unsupported",
  "invalid",
]);

const CONFIDENCE = Object.freeze(["low", "medium", "high"]);

module.exports = { AVAILABILITY, CONFIDENCE, CONTRACTS, MODELS };
