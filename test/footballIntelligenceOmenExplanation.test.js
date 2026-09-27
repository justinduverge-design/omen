"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { enrichOmenWithFootballIntelligence } = require("../src/services/footballIntelligence/omenExplanation");

function response(teamId = null) {
  return {
    state: "success", season: 2026, signals: {},
    recommendation: { primary_player: { name: "Player", team: "CHI", omen_team_id: teamId } },
  };
}

function published(status = "available") {
  return {
    contract_version: "football-intelligence-signal.v1", status,
    signal_type: "coach_transfer_system_signal", summary: "The current offense moved toward the coach's prior tendency profile.",
    subject: { team_id: "omen:team:chicago-2026", coach_id: "omen:coach:ben-johnson", season: 2026 },
    interpretation: { direction: "toward_prior_profile", association_only: true, what_could_change_this: ["Another four games could weaken the similarity."] },
    evidence: { coverage_ratio: 0.8 }, quality: { state: "published", limitations: [] }, freshness: { state: status === "stale" ? "stale" : "fresh" },
    publication: { artifact_id: `sha256:${"a".repeat(64)}`, artifact_version: "version-1", published_at_utc: "2026-09-26T12:00:00.000Z" },
  };
}

test("unresolved NFL abbreviation never becomes an Omen canonical identity", async () => {
  let called = false;
  const value = response();
  await enrichOmenWithFootballIntelligence({ response: value, repository: { async findPublishedTeamSignal() { called = true; } } });
  assert.equal(called, false);
  assert.equal(value.football_intelligence.status, "unavailable");
  assert.equal(value.football_intelligence.reason_code, "identity_unresolved");
  assert.equal(value.football_intelligence.summary, null);
  assert.equal(value.signals.football_intelligence.status, "unavailable");
});

test("accepted available or stale evidence is contextual and never marked as deciding the call", async () => {
  for (const status of ["available", "stale"]) {
    const value = response("omen:team:chicago-2026");
    await enrichOmenWithFootballIntelligence({ response: value, repository: { async findPublishedTeamSignal() { return published(status); } } });
    assert.equal(value.football_intelligence.status, status);
    assert.equal(value.signals.football_intelligence.status, "live");
    assert.equal(value.signals.football_intelligence.used, false);
  }
});

test("missing publication and repository failure stay explicit unavailable states", async () => {
  const missing = response("omen:team:chicago-2026");
  await enrichOmenWithFootballIntelligence({ response: missing, repository: { async findPublishedTeamSignal() { return null; } } });
  assert.equal(missing.football_intelligence.reason_code, "not_published");
  const failed = response("omen:team:chicago-2026");
  await enrichOmenWithFootballIntelligence({ response: failed, repository: { async findPublishedTeamSignal() { throw Error("secret database detail"); } } });
  assert.equal(failed.football_intelligence.reason_code, "serving_unavailable");
  assert.doesNotMatch(JSON.stringify(failed), /secret database detail/);
});

test("incomplete or candidate evidence never becomes advisory context", async () => {
  for (const mutation of [
    (signal) => { signal.publication.artifact_version = ""; },
    (signal) => { signal.quality.state = "candidate"; },
    (signal) => { signal.summary = ""; },
  ]) {
    const signal = published();
    mutation(signal);
    const value = response("omen:team:chicago-2026");
    await enrichOmenWithFootballIntelligence({ response: value, repository: { async findPublishedTeamSignal() { return signal; } } });
    assert.equal(value.signals.football_intelligence.status, "unavailable");
    assert.equal(value.signals.football_intelligence.used, false);
  }
});
