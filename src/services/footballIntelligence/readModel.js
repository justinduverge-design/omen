"use strict";

const { CONTRACTS } = require("./contracts");
const { hashCanonical } = require("./canonicalize");

function buildFootballIntelligenceReadModel({ schemeDna, systemSignals, coachingTree, provenance = [] }) {
  if (!Array.isArray(schemeDna) || !Array.isArray(systemSignals) || !coachingTree || !Array.isArray(coachingTree.nodes) || !Array.isArray(coachingTree.edges) || !Array.isArray(provenance)) {
    throw invalid("read model inputs have invalid shapes");
  }
  const orderedDna = [...schemeDna].sort((a, b) => a.output_hash.localeCompare(b.output_hash));
  const orderedSignals = [...systemSignals].sort((a, b) => a.output_hash.localeCompare(b.output_hash));
  const orderedProvenance = [...provenance].sort((a, b) => hashCanonical(a).localeCompare(hashCanonical(b)));
  const inputHash = hashCanonical({
    scheme_dna: orderedDna.map((item) => item.output_hash),
    system_signals: orderedSignals.map((item) => item.output_hash),
    coaching_tree_edges: coachingTree.edges.map((item) => item.edge_hash).sort(),
    provenance: orderedProvenance,
  });
  const artifact = {
    contract_version: CONTRACTS.readModel,
    scheme_dna: orderedDna,
    system_signals: orderedSignals,
    coaching_tree: coachingTree,
    provenance: orderedProvenance,
    input_hash: inputHash,
  };
  return { ...artifact, output_hash: hashCanonical(artifact) };
}

function invalid(message) { const error = new TypeError(message); error.code = "FOOTBALL_INTELLIGENCE_INVALID"; return error; }

module.exports = { buildFootballIntelligenceReadModel };
