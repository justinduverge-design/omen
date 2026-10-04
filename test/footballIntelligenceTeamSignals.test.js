"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { buildTeamSignals, headCoaches, ordinal, MIN_RANKED_TEAMS } = require("../src/services/footballIntelligence/teamSignals");
const { leagueRanks } = require("../src/services/footballIntelligence/leagueSchemeDna");
const { teamIdFor, canonicalAbbreviation, coachIdFor, TEAMS } = require("../src/services/footballIntelligence/nflTeams");

const PUBLICATION = {
  artifact_id: `sha256:${"1".repeat(64)}`, artifact_version: "league-2026-w4", published_at_utc: "2026-10-03T00:00:00Z",
  source_artifacts: [`sha256:${"2".repeat(64)}`],
};

function dna(team, rates, { status = "available", games = 17, plays = 1100 } = {}) {
  const features = {};
  for (const [k, v] of Object.entries(rates)) features[k] = { kind: "rate", value: v, numerator: Math.round(v * plays), denominator: plays };
  return { status, subject: { type: "team", id: team }, features, sample: { games, eligible_plays: plays }, coverage: { ratio: 0.98 } };
}

/** A league of `n` teams whose play-action rate rises with the index; team 0 is CHI. */
function league(n, season, { status = "available" } = {}) {
  const abbrs = ["CHI", ...Object.keys(TEAMS).filter((t) => t !== "CHI")].slice(0, n);
  return Object.fromEntries(abbrs.map((t, i) => [t, dna(t, {
    play_action_rate: t === "CHI" ? 0.30 : 0.05 + i * 0.002,
    motion_rate: 0.5,
    no_huddle_rate: t === "CHI" ? 0.01 : 0.10,
  }, { status })]));
}

function games(rows) {
  return rows.map(([season, week, home, away, homeCoach, awayCoach]) => ({
    season: String(season), week: String(week), game_type: "REG", home_team: home, away_team: away, home_coach: homeCoach, away_coach: awayCoach,
  }));
}

test("team ids are stable per franchise, and provider spellings map onto them", () => {
  assert.equal(Object.keys(TEAMS).length, 32);
  assert.equal(teamIdFor("CHI"), "omen:team:chi");
  assert.equal(teamIdFor("jac"), "omen:team:jax");
  assert.equal(teamIdFor("OAK"), "omen:team:lv");
  assert.equal(teamIdFor("WSH"), "omen:team:was");
  assert.equal(canonicalAbbreviation("XYZ"), null);
  assert.equal(coachIdFor("Ben Johnson"), "omen:coach:ben-johnson");
  assert.equal(coachIdFor("Raheem Morris Sr."), "omen:coach:raheem-morris-sr");
});

test("each team's head coach is the coach of its latest regular-season game", () => {
  const c = headCoaches(games([[2026, 1, "CHI", "MIN", "Ben Johnson", "Kevin O'Connell"], [2026, 3, "MIN", "CHI", "Kevin O'Connell", "Ben Johnson"]]));
  assert.equal(c["2026|CHI"], "Ben Johnson");
  assert.equal(c["2026|MIN"], "Kevin O'Connell");
  assert.equal(ordinal(1), "1st"); assert.equal(ordinal(2), "2nd"); assert.equal(ordinal(13), "13th"); assert.equal(ordinal(22), "22nd");
});

test("a signal per team names its most distinctive tendencies with league rank, in the shared contract", () => {
  const dnaBySeason = { 2025: league(32, 2025), 2026: {} };
  const ranksBySeason = { 2025: leagueRanks(dnaBySeason[2025]), 2026: {} };
  const g = games([[2025, 18, "CHI", "DET", "Ben Johnson", "Dan Campbell"], [2026, 4, "CHI", "DET", "Ben Johnson", "Dan Campbell"]]);
  const signals = buildTeamSignals({ season: 2026, dnaBySeason, ranksBySeason, games: g, publication: PUBLICATION });
  const chi = signals.find((s) => s.subject.team_id === "omen:team:chi");
  assert.equal(chi.contract_version, "football-intelligence-signal.v1");
  assert.equal(chi.signal_type, "team_system_identity");
  assert.equal(chi.status, "available");
  assert.equal(chi.subject.coach_id, "omen:coach:ben-johnson");
  assert.equal(chi.subject.season, 2026);
  assert.equal(chi.basis_season, 2025);
  assert.equal(chi.freshness.state, "previous_season");
  assert.equal(chi.interpretation.association_only, true);
  assert.match(chi.summary, /^Chicago's offense in 2025: /);
  assert.match(chi.summary, /play-action on 30\.0% of plays \(1st of 32\)/);
  assert.match(chi.summary, /no-huddle on 1\.0% of plays \(32nd of 32\)/);
  assert.deepEqual(chi.publication, { artifact_id: PUBLICATION.artifact_id, artifact_version: PUBLICATION.artifact_version, published_at_utc: PUBLICATION.published_at_utc });
});

test("the current season is used for every team only once the league can be ranked on it", () => {
  const last = ["CHI", ...Object.keys(TEAMS).filter((t) => t !== "CHI")][31]; // outside the 24 that qualify
  const g = games([[2025, 18, "CHI", "DET", "Ben Johnson", "Dan Campbell"], [2026, 4, "CHI", "DET", "Ben Johnson", "Dan Campbell"],
                   [2025, 18, last, "DET", "Coach Last", "Dan Campbell"], [2026, 4, last, "DET", "Coach Last", "Dan Campbell"]]);
  const early = { 2025: league(32, 2025), 2026: league(2, 2026) };
  const earlySignals = buildTeamSignals({ season: 2026, dnaBySeason: early, games: g, publication: PUBLICATION,
    ranksBySeason: { 2025: leagueRanks(early[2025]), 2026: leagueRanks(early[2026]) } });
  assert.ok(earlySignals.every((s) => s.basis_season === 2025), "two qualifying teams cannot set a league rank");
  assert.match(earlySignals.find((s) => s.subject.team_abbreviation === "CHI").quality.limitations.join(" "), /Too few 2026 games are charted across the league/);

  const ready = { 2025: league(32, 2025), 2026: league(MIN_RANKED_TEAMS, 2026) };
  const readySignals = buildTeamSignals({ season: 2026, dnaBySeason: ready, games: g, publication: PUBLICATION,
    ranksBySeason: { 2025: leagueRanks(ready[2025]), 2026: leagueRanks(ready[2026]) } });
  const chi = readySignals.find((s) => s.subject.team_abbreviation === "CHI");
  assert.equal(chi.basis_season, 2026);
  assert.equal(chi.freshness.state, "current");
  const lagging = readySignals.find((s) => s.subject.team_abbreviation === last);
  assert.equal(ready[2026][last], undefined);
  assert.equal(lagging.basis_season, 2025, "a team still short of evidence falls back, and says so");
});

test("a head-coach change is stated as a fact, never as a cause", () => {
  const dnaBySeason = { 2025: league(32, 2025), 2026: {} };
  const g = games([[2025, 18, "MIA", "BUF", "Mike McDaniel", "Sean McDermott"], [2026, 4, "MIA", "BUF", "Jeff Hafley", "Sean McDermott"]]);
  const signals = buildTeamSignals({ season: 2026, dnaBySeason, games: g, publication: PUBLICATION,
    ranksBySeason: { 2025: leagueRanks(dnaBySeason[2025]), 2026: {} } });
  const mia = signals.find((s) => s.subject.team_abbreviation === "MIA");
  assert.deepEqual(mia.head_coach.change, { from: "Mike McDaniel", to: "Jeff Hafley" });
  assert.equal(mia.subject.coach_id, "omen:coach:jeff-hafley");
  assert.match(mia.quality.limitations.join(" "), /first season as Miami's head coach \(Mike McDaniel was last season\)/);
  assert.equal(mia.head_coach.change.similarity_to_previous_team, undefined, "no comparison without the new season's evidence");
  const buf = signals.find((s) => s.subject.team_abbreviation === "BUF");
  assert.equal(buf.head_coach.change, null);
});

test("a team with no usable evidence is published as insufficient, with no summary", () => {
  const dnaBySeason = { 2025: { ...league(31, 2025), NYG: dna("NYG", {}, { status: "insufficient_data", games: 2, plays: 50 }) }, 2026: {} };
  const g = games([[2025, 18, "NYG", "DAL", "Brian Daboll", "Brian Schottenheimer"], [2026, 4, "NYG", "DAL", "John Harbaugh", "Brian Schottenheimer"]]);
  const signals = buildTeamSignals({ season: 2026, dnaBySeason, games: g, publication: PUBLICATION,
    ranksBySeason: { 2025: leagueRanks(dnaBySeason[2025]), 2026: {} } });
  const nyg = signals.find((s) => s.subject.team_abbreviation === "NYG");
  assert.equal(nyg.status, "insufficient_coverage");
  assert.equal(nyg.summary, null);
  assert.equal(nyg.reason_code, "insufficient_evidence");
});
