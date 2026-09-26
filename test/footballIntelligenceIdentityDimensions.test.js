"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildIdentitySnapshot,
  createCoachAssignment,
  createCoachIdentity,
  createFranchise,
  createNamespaceAssertion,
  createTeamAlias,
  resolveNamespaceIdentity,
} = require("../src/services/footballIntelligence/identityDimensions");

const HASH_A = `sha256:${"a".repeat(64)}`;
const HASH_B = `sha256:${"b".repeat(64)}`;
const source = (rowKey, hash = HASH_A) => ({ artifact_sha256: hash, row_key: rowKey });
const window = (from, through = null) => ({ from, through });

test("team and franchise dimensions retain effective-dated aliases across relocation", () => {
  const franchise = createFranchise({ franchiseId: "omen:franchise:raiders", source: source("franchise:raiders") });
  const oakland = createTeamAlias({
    teamId: "omen:team:raiders-oakland", franchiseId: franchise.franchise_id,
    alias: "OAK", effectiveWindow: window("1995-01-01", "2019-12-31"), source: source("alias:oak"),
  });
  const lasVegas = createTeamAlias({
    teamId: "omen:team:raiders-las-vegas", franchiseId: franchise.franchise_id,
    alias: "LV", effectiveWindow: window("2020-01-01"), source: source("alias:lv"),
  });
  assert.equal(oakland.franchise_id, lasVegas.franchise_id);
  assert.notEqual(oakland.team_id, lasVegas.team_id);
  assert.equal(oakland.contract_version, "football-team-alias.v1");
});

test("provider IDs remain assertions and resolve only inside their effective interval", () => {
  const assertion = createNamespaceAssertion({
    entityType: "team", canonicalId: "omen:team:sea", namespace: "espn", externalId: "26",
    effectiveWindow: window("2020-01-01"), confidenceClass: "authoritative", reviewState: "confirmed",
    source: source("espn:26"),
  });
  const snapshot = buildIdentitySnapshot({ namespaceAssertions: [assertion] });
  assert.deepEqual(resolveNamespaceIdentity(snapshot, { entityType: "team", namespace: "espn", externalId: "26", at: "2025-09-01" }), {
    state: "resolved", canonical_id: "omen:team:sea", assertion_ids: [assertion.assertion_id],
  });
  assert.deepEqual(resolveNamespaceIdentity(snapshot, { entityType: "team", namespace: "espn", externalId: "26", at: "2019-09-01" }), {
    state: "unresolved", reason: "no_effective_assertion", assertion_ids: [],
  });
  assert.equal(assertion.namespace, "espn");
  assert.notEqual(assertion.canonical_id, assertion.external_id);
});

test("active conflicting provider assertions produce disputed instead of last-write-wins", () => {
  const common = {
    entityType: "team", namespace: "yahoo", externalId: "nfl.t.12", effectiveWindow: window("2025-01-01"),
    confidenceClass: "authoritative", reviewState: "confirmed",
  };
  const first = createNamespaceAssertion({ ...common, canonicalId: "omen:team:first", source: source("yahoo:first") });
  const second = createNamespaceAssertion({ ...common, canonicalId: "omen:team:second", source: source("yahoo:second", HASH_B) });
  const snapshot = buildIdentitySnapshot({ namespaceAssertions: [second, first] });
  const resolution = resolveNamespaceIdentity(snapshot, { entityType: "team", namespace: "yahoo", externalId: "nfl.t.12", at: "2025-09-01" });
  assert.equal(resolution.state, "disputed");
  assert.deepEqual(resolution.candidate_canonical_ids, ["omen:team:first", "omen:team:second"]);
  assert.deepEqual(resolution.assertion_ids, [first.assertion_id, second.assertion_id].sort());
});

test("explicit unresolved and disputed assertions remain non-serving states", () => {
  const unresolved = createNamespaceAssertion({
    entityType: "team", canonicalId: null, namespace: "sleeper", externalId: "SEA",
    effectiveWindow: window("2025-01-01"), confidenceClass: "candidate", reviewState: "unresolved",
    source: source("sleeper:sea"),
  });
  const disputed = createNamespaceAssertion({
    entityType: "team", canonicalId: null, candidateCanonicalIds: ["omen:team:sea", "omen:team:not-sea"],
    namespace: "cbs", externalId: "SEA", effectiveWindow: window("2025-01-01"),
    confidenceClass: "candidate", reviewState: "disputed", source: source("cbs:sea"),
  });
  const snapshot = buildIdentitySnapshot({ namespaceAssertions: [disputed, unresolved] });
  assert.equal(resolveNamespaceIdentity(snapshot, { entityType: "team", namespace: "sleeper", externalId: "SEA", at: "2025-09-01" }).state, "unresolved");
  assert.equal(resolveNamespaceIdentity(snapshot, { entityType: "team", namespace: "cbs", externalId: "SEA", at: "2025-09-01" }).state, "disputed");
});

test("supersession names an assertion in the same snapshot and does not rewrite it", () => {
  const original = createNamespaceAssertion({
    entityType: "team", canonicalId: "omen:team:old", namespace: "nflverse", externalId: "LA",
    effectiveWindow: window("2016-01-01", "2019-12-31"), confidenceClass: "authoritative",
    reviewState: "confirmed", source: source("nflverse:old"),
  });
  const correction = createNamespaceAssertion({
    entityType: "team", canonicalId: "omen:team:new", namespace: "nflverse", externalId: "LA",
    effectiveWindow: window("2016-01-01", "2019-12-31"), confidenceClass: "authoritative",
    reviewState: "confirmed", supersedesAssertionId: original.assertion_id, source: source("nflverse:new", HASH_B),
  });
  const snapshot = buildIdentitySnapshot({ namespaceAssertions: [original, correction] });
  assert.equal(correction.supersedes_assertion_id, original.assertion_id);
  assert.equal(snapshot.namespace_assertions.length, 2);
  assert.throws(() => buildIdentitySnapshot({ namespaceAssertions: [correction] }), /superseded assertion/);
  const wrongScope = createNamespaceAssertion({
    entityType: "team", canonicalId: "omen:team:new", namespace: "espn", externalId: "LA",
    effectiveWindow: window("2016-01-01", "2019-12-31"), confidenceClass: "authoritative",
    reviewState: "confirmed", supersedesAssertionId: original.assertion_id, source: source("espn:new", HASH_B),
  });
  assert.throws(() => buildIdentitySnapshot({ namespaceAssertions: [original, wrongScope] }), /retain entity type, namespace, and external ID/);
});

test("coach display names never resolve identity and assignments preserve unresolved or disputed state", () => {
  const coach = createCoachIdentity({ coachId: "omen:coach:01", displayName: "Alex Smith", source: source("coach:01") });
  const sameName = createCoachIdentity({ coachId: "omen:coach:02", displayName: "Alex Smith", source: source("coach:02", HASH_B) });
  assert.notEqual(coach.coach_id, sameName.coach_id);

  const unresolved = createCoachAssignment({
    coachId: null, observedAlias: "Alex Smith", teamId: "omen:team:sea", role: "offensive_coordinator",
    effectiveWindow: window("2025-01-01"), identityState: "unresolved", source: source("assignment:unresolved"),
  });
  const disputed = createCoachAssignment({
    coachId: null, candidateCoachIds: [coach.coach_id, sameName.coach_id], observedAlias: "Alex Smith",
    teamId: "omen:team:sea", role: "offensive_coordinator", effectiveWindow: window("2025-01-01"),
    identityState: "disputed", source: source("assignment:disputed"),
  });
  assert.equal(unresolved.coach_id, null);
  assert.equal(disputed.identity_state, "disputed");
  assert.deepEqual(disputed.candidate_coach_ids, ["omen:coach:01", "omen:coach:02"]);
  assert.throws(() => createCoachAssignment({
    coachId: "omen:coach:01", observedAlias: "Alex Smith", teamId: "omen:team:sea", role: "head_coach",
    effectiveWindow: window("2025-01-01"), identityState: "unresolved", source: source("bad"),
  }), /unresolved assignment cannot carry a coach ID/);
  assert.throws(() => createCoachAssignment({
    coachId: "omen:coach:01", candidateCoachIds: ["omen:coach:02"], observedAlias: "Alex Smith",
    teamId: "omen:team:sea", role: "head_coach", effectiveWindow: window("2025-01-01"),
    identityState: "resolved", source: source("bad:candidate"),
  }), /resolved assignment cannot carry candidate coach IDs/);
});

test("identity snapshots are deterministic under input reordering", () => {
  const a = createNamespaceAssertion({ entityType: "team", canonicalId: "omen:team:sea", namespace: "espn", externalId: "26", effectiveWindow: window("2020-01-01"), confidenceClass: "authoritative", reviewState: "confirmed", source: source("a") });
  const b = createNamespaceAssertion({ entityType: "team", canonicalId: "omen:team:sea", namespace: "cbs", externalId: "SEA", effectiveWindow: window("2020-01-01"), confidenceClass: "authoritative", reviewState: "confirmed", source: source("b", HASH_B) });
  assert.deepEqual(buildIdentitySnapshot({ namespaceAssertions: [a, b] }), buildIdentitySnapshot({ namespaceAssertions: [b, a] }));
});

test("canonical IDs are provider-neutral and malformed windows fail closed", () => {
  assert.throws(() => createNamespaceAssertion({
    entityType: "team", canonicalId: "espn:26", namespace: "espn", externalId: "26",
    effectiveWindow: window("2025-01-01"), confidenceClass: "authoritative", reviewState: "confirmed", source: source("bad:id"),
  }), /Omen canonical ID/);
  assert.throws(() => createTeamAlias({
    teamId: "omen:team:sea", franchiseId: "omen:franchise:sea", alias: "SEA",
    effectiveWindow: window("2025-12-01", "2025-01-01"), source: source("bad:window"),
  }), /effective window/);
  assert.throws(() => createTeamAlias({
    teamId: "omen:team:sea", franchiseId: "omen:franchise:sea", alias: "SEA",
    effectiveWindow: window("2025-02-30"), source: source("bad:date"),
  }), /ISO calendar date/);
});
