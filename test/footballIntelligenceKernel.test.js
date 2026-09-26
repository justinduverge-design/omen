"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  CONTRACTS, MODELS, buildFeatureWindow, buildFootballIntelligenceReadModel,
  buildSystemSignal, compareSchemeDna, computeSchemeDna,
  createConfirmedAssignmentEdge, createInferredInfluenceEdge, hashCanonical,
  projectCoachingTree, stableStringify,
} = require("../src/services/footballIntelligence");

function facts(team, startWeek, games, motionPattern) {
  const output = [];
  for (let game = 0; game < games; game += 1) {
    for (let play = 1; play <= 10; play += 1) {
      const common = {
        contract_version: CONTRACTS.observedFact, game_id: `2025_${startWeek + game}_${team}`,
        play_id: String(play), team_id: team, subject_type: "team", subject_id: team,
        season: 2025, week: startWeek + game, availability: "observed",
        normalization_version: MODELS.normalization,
        source: { artifact_sha256: `sha256:${"a".repeat(64)}`, row_key: `${game}:${play}` },
      };
      const values = {
        offense_motion: motionPattern(play), play_action: play % 4 === 0,
        qb_location: play % 3 === 0 ? "under_center" : "shotgun",
      };
      for (const [metric, value] of Object.entries(values)) output.push({ ...common, fact_key: `${team}:${game}:${play}:${metric}`, metric, value });
    }
  }
  return output;
}

const definitions = [
  { key: "motion_rate", metric: "offense_motion", kind: "rate", source_family: "ftn_charting" },
  { key: "play_action_rate", metric: "play_action", kind: "rate", source_family: "ftn_charting" },
  { key: "qb_location", metric: "qb_location", kind: "distribution", source_family: "ftn_charting" },
];

function windowFor(inputFacts, team, fromWeek, throughWeek) {
  return buildFeatureWindow({ facts: inputFacts, subject: { type: "team", id: team }, from: { season: 2025, week: fromWeek }, through: { season: 2025, week: throughWeek }, featureDefinitions: definitions });
}

test("canonical hashing ignores object key order and rejects non-finite values", () => {
  assert.equal(stableStringify({ b: 2, a: { d: 4, c: 3 } }), '{"a":{"c":3,"d":4},"b":2}');
  assert.equal(hashCanonical({ a: 1, b: 2 }), hashCanonical({ b: 2, a: 1 }));
  assert.throws(() => hashCanonical({ value: Infinity }), /finite/);
});

test("feature windows and Scheme DNA are deterministic when facts are shuffled", () => {
  const source = facts("SEA", 1, 4, (play) => play % 2 === 0);
  const forward = windowFor(source, "SEA", 1, 4);
  const reverse = windowFor([...source].reverse(), "SEA", 1, 4);
  assert.deepEqual(reverse, forward);
  assert.equal(forward.eligible_plays, 40);
  assert.deepEqual(forward.features.motion_rate, {
    kind: "rate", value: 0.5, numerator: 20, denominator: 40, missing: 0,
    source_family: "ftn_charting", effective_window: { from: { season: 2025, week: 1 }, through: { season: 2025, week: 4 } },
  });
  assert.deepEqual(computeSchemeDna(reverse), computeSchemeDna(forward));
});

test("missing observations remain missing and small samples are insufficient", () => {
  const source = facts("SEA", 1, 1, () => false).filter((fact) => fact.metric !== "play_action");
  const window = windowFor(source, "SEA", 1, 1);
  assert.equal(window.features.motion_rate.value, 0);
  assert.equal(window.features.play_action_rate.value, null);
  assert.equal(window.features.play_action_rate.denominator, 0);
  assert.equal(window.features.play_action_rate.missing, 10);
  const dna = computeSchemeDna(window);
  assert.equal(dna.status, "insufficient_data");
  assert.equal(dna.confidence, "low");
});

test("similarity, System Signal, and hashes change with a material tendency change", () => {
  const baseline = computeSchemeDna(windowFor(facts("ATL", 1, 6, (play) => play <= 2), "ATL", 1, 6));
  const matching = computeSchemeDna(windowFor(facts("SEA", 7, 6, (play) => play <= 2), "SEA", 7, 12));
  const changed = computeSchemeDna(windowFor(facts("SEA", 7, 6, (play) => play <= 9), "SEA", 7, 12));
  const close = compareSchemeDna(baseline, matching);
  const far = compareSchemeDna(baseline, changed);
  assert.equal(close.score, 1);
  assert.ok(far.score < close.score);
  assert.notEqual(matching.output_hash, changed.output_hash);
  const signal = buildSystemSignal({ baseline, comparison: matching, alternativeExplanations: ["Roster and opponent effects may explain part of the match."] });
  assert.equal(signal.state, "established");
  assert.equal(signal.baseline.scheme_dna_hash, baseline.output_hash);
  assert.match(signal.output_hash, /^sha256:[a-f0-9]{64}$/);
});

test("Coaching Tree keeps confirmed assignments distinct from inferred influence", () => {
  const baseline = computeSchemeDna(windowFor(facts("ATL", 1, 6, () => true), "ATL", 1, 6));
  const comparison = computeSchemeDna(windowFor(facts("SEA", 7, 6, () => true), "SEA", 7, 12));
  const similarity = compareSchemeDna(baseline, comparison);
  const assignment = createConfirmedAssignmentEdge({ coachId: "coach:smith", teamId: "SEA", role: "offensive_coordinator", effectiveWindow: { from: { season: 2025, week: 1 }, through: { season: 2025, week: 18 } }, source: { artifact_sha256: `sha256:${"b".repeat(64)}`, row_key: "smith:sea:2025" } });
  const influence = createInferredInfluenceEdge({ coachId: "coach:smith", teamId: "SEA", effectiveWindow: assignment.effective_window, baselineDna: baseline, comparisonDna: comparison, similarity, confidence: "medium" });
  const tree = projectCoachingTree([influence, assignment]);
  assert.deepEqual(tree.edges.map((edge) => edge.edge_type).sort(), ["confirmed_assignment", "inferred_system_influence"]);
  assert.equal(tree.edges.find((edge) => edge.edge_type === "confirmed_assignment").confidence, "confirmed");
  assert.notEqual(tree.edges.find((edge) => edge.edge_type === "inferred_system_influence").confidence, "confirmed");
});

test("Coaching Tree rejects conflicting confirmed assignments", () => {
  const common = { coachId: "coach:smith", role: "offensive_coordinator", effectiveWindow: { from: { season: 2025, week: 1 }, through: { season: 2025, week: 18 } }, source: { artifact_sha256: `sha256:${"b".repeat(64)}`, row_key: "row" } };
  const a = createConfirmedAssignmentEdge({ ...common, teamId: "SEA" });
  const b = createConfirmedAssignmentEdge({ ...common, teamId: "ATL", source: { ...common.source, row_key: "row2" } });
  assert.throws(() => projectCoachingTree([a, b]), /conflicting confirmed/);
});

test("read model sorts inputs and emits a stable compact projection", () => {
  const baseline = computeSchemeDna(windowFor(facts("ATL", 1, 6, () => true), "ATL", 1, 6));
  const comparison = computeSchemeDna(windowFor(facts("SEA", 7, 6, () => true), "SEA", 7, 12));
  const signal = buildSystemSignal({ baseline, comparison });
  const assignment = createConfirmedAssignmentEdge({ coachId: "coach:smith", teamId: "SEA", role: "head_coach", effectiveWindow: { from: { season: 2025, week: 1 }, through: { season: 2025, week: 18 } }, source: { artifact_sha256: `sha256:${"b".repeat(64)}`, row_key: "row" } });
  const tree = projectCoachingTree([assignment]);
  const first = buildFootballIntelligenceReadModel({ schemeDna: [comparison, baseline], systemSignals: [signal], coachingTree: tree, provenance: [{ artifact_sha256: "sha256:source" }] });
  const second = buildFootballIntelligenceReadModel({ schemeDna: [baseline, comparison], systemSignals: [signal], coachingTree: tree, provenance: [{ artifact_sha256: "sha256:source" }] });
  assert.deepEqual(first, second);
  assert.equal(first.contract_version, CONTRACTS.readModel);
  assert.match(first.output_hash, /^sha256:[a-f0-9]{64}$/);
});

test("observed facts require canonical provenance and normalization version", () => {
  const source = facts("SEA", 1, 1, () => false);
  delete source[0].source;
  assert.throws(() => windowFor(source, "SEA", 1, 1), /fact.source must/);
  const malformed = facts("SEA", 1, 1, () => false);
  malformed[0].source.artifact_sha256 = "bogus";
  assert.throws(() => windowFor(malformed, "SEA", 1, 1), /source provenance/);
  const wrongVersion = facts("SEA", 1, 1, () => false);
  wrongVersion[0].normalization_version = "football-intelligence-normalization.v0";
  assert.throws(() => windowFor(wrongVersion, "SEA", 1, 1), /normalization version/);
});
