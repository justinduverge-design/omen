"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildFeatureWindow,
  buildIdentitySnapshot,
  buildObservedMetricFacts,
  createFranchise,
  createNamespaceAssertion,
  createTeamAlias,
} = require("../src/services/footballIntelligence");

const HASH = `sha256:${"a".repeat(64)}`;
const SOURCE = Object.freeze({ artifact_sha256: HASH, row_key: "fixture" });
const PROVENANCE = Object.freeze({ artifact_id: HASH, receipt_id: `receipt:${"b".repeat(64)}`, source_schema_fingerprint: HASH });

function identity(reviewState = "confirmed") {
  const franchise = createFranchise({ franchiseId: "omen:franchise:detroit", source: SOURCE });
  const alias = createTeamAlias({ teamId: "omen:team:detroit-2025", franchiseId: franchise.franchise_id, alias: "DET", effectiveWindow: { from: "2025-01-01", through: null }, source: SOURCE });
  const assertion = createNamespaceAssertion({
    entityType: "team", canonicalId: reviewState === "confirmed" ? alias.team_id : null,
    namespace: "nflverse", externalId: "DET", effectiveWindow: { from: "2025-01-01", through: null },
    confidenceClass: "authoritative", reviewState, source: SOURCE,
  });
  return buildIdentitySnapshot({ franchises: [franchise], teamAliases: [alias], namespaceAssertions: [assertion] });
}

function ordinary() {
  return { facts: [{
    schema: "football-observed-fact.v1", normalization_version: "football-intelligence-normalization.v1",
    game_id: "2025_01_GB_DET", play_id: 10, season: 2025, week: 1, season_type: "REG",
    possession_team: "DET", defense_team: "GB", situation: {}, play: { no_huddle: true }, result: {},
    provenance: { ...PROVENANCE, source_family: "play_by_play", intended_use: "current_denominator" },
  }] };
}

const schedules = { facts: [{ game_id: "2025_01_GB_DET", season: 2025, week: 1, gameday: "2025-09-07" }] };
function ftn(eligible) {
  const observation = (value) => ({ state: "observed", value });
  return {
    coverage_gate: { threshold: 0.7, ratio: eligible ? 0.8 : 0.6, state: eligible ? "coverage_met" : "insufficient_coverage", eligible_for_enrichment: eligible },
    facts: [{ game_id: "2025_01_GB_DET", play_id: 10, possession_team: "DET", observations: {
      motion: observation(true), play_action: observation(false), screen_pass: observation(false), rpo: observation(true),
      qb_out_of_pocket: observation(false), qb_location: observation("SHOTGUN"), offense_backfield: observation(1),
      defense_box: observation(6), blitzers: observation(5), pass_rushers: observation(4),
    }, provenance: { ...PROVENANCE, source_family: "ftn_charting", intended_use: "tactical_enrichment" } }],
  };
}

test("ordinary PBP remains denominator while coverage-gated FTN feeds the existing feature-window boundary", () => {
  const projected = buildObservedMetricFacts({ ordinaryPbp: ordinary(), schedules, identitySnapshot: identity(), ftnCharting: ftn(true) });
  const window = buildFeatureWindow({
    facts: projected.facts, subject: { type: "team", id: "omen:team:detroit-2025" },
    from: { season: 2025, week: 1 }, through: { season: 2025, week: 1 }, asOfUtc: "2025-09-08T00:00:00Z",
  });
  assert.equal(projected.denominator.source_family, "play_by_play");
  assert.equal(window.eligible_plays, 1);
  assert.equal(window.features.no_huddle_rate.value, 1);
  assert.equal(window.features.motion_rate.value, 1);
  assert.equal(window.features.box_count.distribution["6"], 1);
  assert.equal(window.coverage, "complete");
});

test("under-covered FTN stays unavailable and never changes the ordinary-PBP denominator", () => {
  const projected = buildObservedMetricFacts({ ordinaryPbp: ordinary(), schedules, identitySnapshot: identity(), ftnCharting: ftn(false) });
  const window = buildFeatureWindow({
    facts: projected.facts, subject: { type: "team", id: "omen:team:detroit-2025" },
    from: { season: 2025, week: 1 }, through: { season: 2025, week: 1 },
  });
  assert.equal(window.eligible_plays, 1);
  assert.equal(window.features.no_huddle_rate.denominator, 1);
  assert.equal(window.features.motion_rate.denominator, 0);
  assert.equal(projected.facts.filter((fact) => fact.source.source_family === "ftn_charting").every((fact) => fact.value === null && fact.availability === "not_covered"), true);
});

test("identity and join disagreements fail closed instead of promoting aliases", () => {
  assert.throws(
    () => buildObservedMetricFacts({ ordinaryPbp: ordinary(), schedules, identitySnapshot: identity("unresolved") }),
    (error) => error.code === "FOOTBALL_INTELLIGENCE_INVALID" && error.identity_resolution.state === "unresolved",
  );
  const mismatched = ftn(true);
  mismatched.facts[0].possession_team = "GB";
  assert.throws(
    () => buildObservedMetricFacts({ ordinaryPbp: ordinary(), schedules, identitySnapshot: identity(), ftnCharting: mismatched }),
    /possession team disagrees/,
  );
});
