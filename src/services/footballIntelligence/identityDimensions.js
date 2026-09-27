"use strict";

const { hashCanonical } = require("./canonicalize");

const CONTRACTS = Object.freeze({
  franchise: "football-franchise.v1",
  teamAlias: "football-team-alias.v1",
  namespaceAssertion: "football-identity-assertion.v1",
  coachIdentity: "football-coach-identity.v1",
  coachAssignment: "football-coach-assignment.v1",
  snapshot: "football-identity-snapshot.v1",
});

const ENTITY_TYPES = new Set(["team", "franchise", "coach", "player"]);
const REVIEW_STATES = new Set(["confirmed", "unresolved", "disputed"]);
const CONFIDENCE_CLASSES = new Set(["authoritative", "corroborated", "candidate"]);
const PROVIDER_NAMESPACES = new Set(["yahoo", "sleeper", "espn", "cbs"]);

function createFranchise({ franchiseId, source } = {}) {
  requireCanonicalId(franchiseId, "franchise");
  const record = { contract_version: CONTRACTS.franchise, franchise_id: franchiseId, source: validateSource(source) };
  return freezeWithId(record, "franchise_record_id");
}

function createTeamAlias({ teamId, franchiseId, alias, effectiveWindow, source } = {}) {
  requireCanonicalId(teamId, "team");
  requireCanonicalId(franchiseId, "franchise");
  const record = {
    contract_version: CONTRACTS.teamAlias,
    team_id: teamId,
    franchise_id: franchiseId,
    alias: requireString(alias, "alias").toUpperCase(),
    effective_window: validateWindow(effectiveWindow),
    source: validateSource(source),
  };
  return freezeWithId(record, "team_alias_id");
}

function createNamespaceAssertion({
  entityType, canonicalId = null, candidateCanonicalIds = [], namespace, externalId,
  effectiveWindow, confidenceClass, reviewState, source, supersedesAssertionId = null,
} = {}) {
  if (!ENTITY_TYPES.has(entityType)) fail("entityType is not supported");
  const normalizedNamespace = requireString(namespace, "namespace").toLowerCase();
  const normalizedState = requireEnum(reviewState, REVIEW_STATES, "reviewState");
  requireEnum(confidenceClass, CONFIDENCE_CLASSES, "confidenceClass");
  if (canonicalId !== null) requireCanonicalId(canonicalId, entityType);
  const candidates = uniqueSorted(candidateCanonicalIds);
  candidates.forEach((id) => requireCanonicalId(id, entityType));
  if (normalizedState === "confirmed" && !canonicalId) fail("confirmed assertion requires a canonical ID");
  if (normalizedState !== "confirmed" && canonicalId !== null) fail(`${normalizedState} assertion cannot carry a serving canonical ID`);
  if (normalizedState === "unresolved" && candidates.length) fail("unresolved assertion cannot carry candidate canonical IDs");
  if (normalizedState === "disputed" && candidates.length < 2) fail("disputed assertion requires at least two candidate canonical IDs");
  if (PROVIDER_NAMESPACES.has(normalizedNamespace) && canonicalId === `${normalizedNamespace}:${externalId}`) {
    fail("provider identifiers cannot be promoted to an Omen canonical ID");
  }
  if (supersedesAssertionId !== null) requireHash(supersedesAssertionId, "supersedesAssertionId");
  const assertion = {
    contract_version: CONTRACTS.namespaceAssertion,
    entity_type: entityType,
    canonical_id: canonicalId,
    candidate_canonical_ids: candidates,
    namespace: normalizedNamespace,
    external_id: requireString(externalId, "externalId"),
    effective_window: validateWindow(effectiveWindow),
    confidence_class: confidenceClass,
    review_state: normalizedState,
    source: validateSource(source),
    supersedes_assertion_id: supersedesAssertionId,
  };
  return freezeWithId(assertion, "assertion_id");
}

function createCoachIdentity({ coachId, displayName, source } = {}) {
  requireCanonicalId(coachId, "coach");
  const record = {
    contract_version: CONTRACTS.coachIdentity,
    coach_id: coachId,
    display_name: requireString(displayName, "displayName"),
    source: validateSource(source),
  };
  return freezeWithId(record, "coach_identity_id");
}

function createCoachAssignment({
  coachId = null, candidateCoachIds = [], observedAlias, teamId, role,
  effectiveWindow, identityState, source,
} = {}) {
  requireCanonicalId(teamId, "team");
  const state = requireEnum(identityState, new Set(["resolved", "unresolved", "disputed"]), "identityState");
  if (coachId !== null) requireCanonicalId(coachId, "coach");
  const candidates = uniqueSorted(candidateCoachIds);
  candidates.forEach((id) => requireCanonicalId(id, "coach"));
  if (state === "resolved" && !coachId) fail("resolved assignment requires a coach ID");
  if (state === "resolved" && candidates.length) fail("resolved assignment cannot carry candidate coach IDs");
  if (state === "unresolved" && coachId) fail("unresolved assignment cannot carry a coach ID");
  if (state === "unresolved" && candidates.length) fail("unresolved assignment cannot carry candidate coach IDs");
  if (state === "disputed" && coachId) fail("disputed assignment cannot carry a serving coach ID");
  if (state === "disputed" && candidates.length < 2) fail("disputed assignment requires at least two candidate coach IDs");
  const assignment = {
    contract_version: CONTRACTS.coachAssignment,
    coach_id: coachId,
    candidate_coach_ids: candidates,
    observed_alias: requireString(observedAlias, "observedAlias"),
    team_id: teamId,
    role: requireString(role, "role").toLowerCase(),
    effective_window: validateWindow(effectiveWindow),
    identity_state: state,
    source: validateSource(source),
  };
  return freezeWithId(assignment, "assignment_id");
}

function buildIdentitySnapshot({ franchises = [], teamAliases = [], namespaceAssertions = [], coachIdentities = [], coachAssignments = [] } = {}) {
  const collections = [
    [franchises, CONTRACTS.franchise, "franchise_record_id", "franchises"],
    [teamAliases, CONTRACTS.teamAlias, "team_alias_id", "teamAliases"],
    [namespaceAssertions, CONTRACTS.namespaceAssertion, "assertion_id", "namespaceAssertions"],
    [coachIdentities, CONTRACTS.coachIdentity, "coach_identity_id", "coachIdentities"],
    [coachAssignments, CONTRACTS.coachAssignment, "assignment_id", "coachAssignments"],
  ];
  for (const [items, contract, idField, name] of collections) validateCollection(items, contract, idField, name);
  const assertions = sortById(namespaceAssertions, "assertion_id");
  const assertionsById = new Map(assertions.map((item) => [item.assertion_id, item]));
  for (const assertion of assertions) {
    if (assertion.supersedes_assertion_id && !assertionsById.has(assertion.supersedes_assertion_id)) {
      fail(`superseded assertion ${assertion.supersedes_assertion_id} is not present in the identity snapshot`);
    }
    if (assertion.supersedes_assertion_id === assertion.assertion_id) fail("an assertion cannot supersede itself");
    if (assertion.supersedes_assertion_id) {
      const prior = assertionsById.get(assertion.supersedes_assertion_id);
      if (prior.entity_type !== assertion.entity_type || prior.namespace !== assertion.namespace || prior.external_id !== assertion.external_id) {
        fail("a superseding assertion must retain entity type, namespace, and external ID");
      }
    }
  }
  const snapshot = {
    contract_version: CONTRACTS.snapshot,
    franchises: sortById(franchises, "franchise_record_id"),
    team_aliases: sortById(teamAliases, "team_alias_id"),
    namespace_assertions: assertions,
    coach_identities: sortById(coachIdentities, "coach_identity_id"),
    coach_assignments: sortById(coachAssignments, "assignment_id"),
  };
  return freezeWithId(snapshot, "snapshot_id");
}

function resolveNamespaceIdentity(snapshot, { entityType, namespace, externalId, at } = {}) {
  if (!snapshot || snapshot.contract_version !== CONTRACTS.snapshot) fail("a valid identity snapshot is required");
  if (!ENTITY_TYPES.has(entityType)) fail("entityType is not supported");
  const normalizedNamespace = requireString(namespace, "namespace").toLowerCase();
  const normalizedExternalId = requireString(externalId, "externalId");
  const date = validateDate(at, "at");
  const superseded = new Set(snapshot.namespace_assertions.map((item) => item.supersedes_assertion_id).filter(Boolean));
  const matches = snapshot.namespace_assertions.filter((item) =>
    !superseded.has(item.assertion_id) && item.entity_type === entityType &&
    item.namespace === normalizedNamespace && item.external_id === normalizedExternalId &&
    contains(item.effective_window, date));
  if (!matches.length) return { state: "unresolved", reason: "no_effective_assertion", assertion_ids: [] };
  const ids = matches.map((item) => item.assertion_id).sort();
  const explicitDisputes = matches.filter((item) => item.review_state === "disputed");
  const confirmed = uniqueSorted(matches.filter((item) => item.review_state === "confirmed").map((item) => item.canonical_id));
  const disputedCandidates = uniqueSorted(explicitDisputes.flatMap((item) => item.candidate_canonical_ids).concat(confirmed));
  if (explicitDisputes.length || confirmed.length > 1) {
    return { state: "disputed", candidate_canonical_ids: disputedCandidates, assertion_ids: ids };
  }
  if (confirmed.length === 1) return { state: "resolved", canonical_id: confirmed[0], assertion_ids: ids };
  return { state: "unresolved", reason: "identity_not_confirmed", assertion_ids: ids };
}

function validateCollection(items, contract, idField, name) {
  if (!Array.isArray(items)) fail(`${name} must be an array`);
  const seen = new Set();
  for (const item of items) {
    if (!item || item.contract_version !== contract || typeof item[idField] !== "string") fail(`${name} contains an invalid record`);
    const unsigned = { ...item };
    delete unsigned[idField];
    if (hashCanonical(unsigned) !== item[idField]) fail(`${name} contains a record whose content does not match its ID`);
    if (seen.has(item[idField])) fail(`${name} contains duplicate record IDs`);
    seen.add(item[idField]);
  }
}

function sortById(items, idField) { return Object.freeze([...items].sort((a, b) => a[idField].localeCompare(b[idField]))); }
function uniqueSorted(values) {
  if (!Array.isArray(values)) fail("candidate IDs must be an array");
  return Object.freeze([...new Set(values)].sort());
}
function validateSource(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) fail("source must be an object");
  requireHash(source.artifact_sha256, "source.artifact_sha256");
  return Object.freeze({ artifact_sha256: source.artifact_sha256, row_key: requireString(source.row_key, "source.row_key") });
}
function validateWindow(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("effective window must be an object");
  const from = validateDate(value.from, "effectiveWindow.from");
  const through = value.through === null || value.through === undefined ? null : validateDate(value.through, "effectiveWindow.through");
  if (through && through < from) fail("effective window cannot end before it begins");
  return Object.freeze({ from, through });
}
function validateDate(value, name) {
  const text = requireString(value, name);
  const parsed = new Date(`${text}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== text) fail(`${name} must be an ISO calendar date`);
  return text;
}
function contains(window, date) { return window.from <= date && (window.through === null || date <= window.through); }
function requireCanonicalId(value, type) {
  if (typeof value !== "string" || !new RegExp(`^omen:${type}:[a-z0-9][a-z0-9._-]*$`).test(value)) fail(`${type} identity requires an opaque provider-neutral Omen canonical ID`);
}
function requireString(value, name) { if (typeof value !== "string" || !value.trim()) fail(`${name} must be a non-empty string`); return value.trim(); }
function requireEnum(value, allowed, name) { if (!allowed.has(value)) fail(`${name} is not supported`); return value; }
function requireHash(value, name) { if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value)) fail(`${name} must be a canonical SHA-256 ID`); }
function freezeWithId(record, idField) {
  const id = hashCanonical(record);
  return Object.freeze({ ...record, [idField]: id });
}
function fail(message) { const error = new TypeError(message); error.code = "FOOTBALL_INTELLIGENCE_IDENTITY_INVALID"; throw error; }

module.exports = {
  IDENTITY_CONTRACTS: CONTRACTS,
  buildIdentitySnapshot,
  createCoachAssignment,
  createCoachIdentity,
  createFranchise,
  createNamespaceAssertion,
  createTeamAlias,
  resolveNamespaceIdentity,
};
