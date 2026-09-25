"use strict";

const { CONTRACTS, MODELS } = require("./contracts");
const { hashCanonical } = require("./canonicalize");

function createConfirmedAssignmentEdge({ coachId, teamId, role, effectiveWindow, source }) {
  requireString(coachId, "coachId"); requireString(teamId, "teamId"); requireString(role, "role");
  requireWindow(effectiveWindow); requireObject(source, "source");
  if (!/^sha256:[a-f0-9]{64}$/.test(source.artifact_sha256 || "") || typeof source.row_key !== "string" || !source.row_key) throw invalid("confirmed assignment source requires a canonical artifact hash and row_key");
  const edge = {
    contract_version: CONTRACTS.coachingTreeEdge,
    edge_type: "confirmed_assignment",
    from: { type: "coach", id: coachId },
    to: { type: "team", id: teamId },
    role,
    effective_window: effectiveWindow,
    source,
    confidence: "confirmed",
  };
  return { ...edge, edge_hash: hashCanonical(edge) };
}

function createInferredInfluenceEdge({ coachId, teamId, effectiveWindow, baselineDna, comparisonDna, similarity, confidence = "low", limitations = [] }) {
  requireString(coachId, "coachId"); requireString(teamId, "teamId"); requireWindow(effectiveWindow);
  if (!baselineDna?.output_hash || !comparisonDna?.output_hash) throw invalid("inferred edge requires compared Scheme DNA hashes");
  if (!similarity || similarity.model_version !== MODELS.similarity || similarity.score === null) throw invalid("inferred edge requires an available similarity result");
  if (!["low", "medium", "high"].includes(confidence)) throw invalid("inferred edge confidence must not be confirmed");
  const edge = {
    contract_version: CONTRACTS.coachingTreeEdge,
    edge_type: "inferred_system_influence",
    model_version: MODELS.coachingTree,
    from: { type: "coach", id: coachId },
    to: { type: "team", id: teamId },
    effective_window: effectiveWindow,
    compared_scheme_dna: { baseline_hash: baselineDna.output_hash, comparison_hash: comparisonDna.output_hash },
    evidence: { baseline_sample: baselineDna.sample, baseline_coverage: baselineDna.coverage, comparison_sample: comparisonDna.sample, comparison_coverage: comparisonDna.coverage },
    similarity: { model_version: similarity.model_version, score: similarity.score, components: similarity.components },
    confidence,
    limitations: [...new Set(limitations)].sort(),
  };
  return { ...edge, edge_hash: hashCanonical(edge) };
}

function projectCoachingTree(edges) {
  if (!Array.isArray(edges)) throw invalid("edges must be an array");
  const ordered = [...edges].sort((a, b) => a.edge_hash.localeCompare(b.edge_hash));
  for (const edge of ordered) validateEdge(edge);
  assertNoConflictingAssignments(ordered.filter((edge) => edge.edge_type === "confirmed_assignment"));
  const nodeMap = new Map();
  for (const edge of ordered) {
    nodeMap.set(`${edge.from.type}:${edge.from.id}`, edge.from);
    nodeMap.set(`${edge.to.type}:${edge.to.id}`, edge.to);
  }
  return { model_version: MODELS.coachingTree, nodes: [...nodeMap.values()].sort(compareNode), edges: ordered };
}

function assertNoConflictingAssignments(edges) {
  for (let i = 0; i < edges.length; i += 1) for (let j = i + 1; j < edges.length; j += 1) {
    const a = edges[i]; const b = edges[j];
    if (a.from.id === b.from.id && a.role === b.role && a.to.id !== b.to.id && overlaps(a.effective_window, b.effective_window)) {
      throw invalid(`conflicting confirmed ${a.role} assignments for coach ${a.from.id}`);
    }
  }
}
function overlaps(a, b) { return compareDate(a.from, b.through) <= 0 && compareDate(b.from, a.through) <= 0; }
function compareDate(a, b) { return a.season - b.season || (a.week || 0) - (b.week || 0); }
function validateEdge(edge) { if (!edge || edge.contract_version !== CONTRACTS.coachingTreeEdge || !edge.edge_hash || !["confirmed_assignment", "inferred_system_influence"].includes(edge.edge_type)) throw invalid("invalid Coaching Tree edge"); }
function compareNode(a, b) { return a.type.localeCompare(b.type) || a.id.localeCompare(b.id); }
function requireWindow(value) { requireObject(value, "effectiveWindow"); requireObject(value.from, "effectiveWindow.from"); requireObject(value.through, "effectiveWindow.through"); if (!Number.isInteger(value.from.season) || !Number.isInteger(value.through.season)) throw invalid("effectiveWindow requires integer seasons"); }
function requireObject(value, name) { if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid(`${name} must be an object`); }
function requireString(value, name) { if (typeof value !== "string" || !value.trim()) throw invalid(`${name} must be a non-empty string`); }
function invalid(message) { const error = new TypeError(message); error.code = "FOOTBALL_INTELLIGENCE_INVALID"; return error; }

module.exports = { createConfirmedAssignmentEdge, createInferredInfluenceEdge, projectCoachingTree };
