"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  MAX_OPPONENT_TEAMS_PER_SCAN,
  MAX_CANDIDATES_RETURNED,
  buildTeamNeedProfile,
  findLeagueTradeCandidates,
} = require("../src/services/tradeFind");
const { createSearchBudget } = require("../src/services/tradeLineup");

const ROSTER_POSITIONS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF", "BN", "BN"];

function player(id, position, points, overrides = {}) {
  return {
    player_id: id,
    player_key: id,
    name: id,
    position,
    eligible_positions: [position],
    selected_position: "BN",
    projected_points: points,
    ...overrides,
  };
}

function team(teamId, teamName, players) {
  return { team_id: teamId, team_name: teamName, players };
}

// A roster that is thin at RB (one below-replacement RB) and deep at WR.
function thinAtRbRoster(tag) {
  return [
    player(`${tag}-qb`, "QB", 20),
    player(`${tag}-rb1`, "RB", 8),
    player(`${tag}-wr1`, "WR", 16),
    player(`${tag}-wr2`, "WR", 15),
    player(`${tag}-wr3`, "WR", 14),
    player(`${tag}-wr4`, "WR", 13),
    player(`${tag}-te`, "TE", 9),
    player(`${tag}-k`, "K", 7),
    player(`${tag}-def`, "DEF", 6),
  ];
}

// A roster that is deep at RB and thin at WR — the natural trade partner for
// the roster above.
function deepAtRbRoster(tag) {
  return [
    player(`${tag}-qb`, "QB", 19),
    player(`${tag}-rb1`, "RB", 22),
    player(`${tag}-rb2`, "RB", 20),
    player(`${tag}-rb3`, "RB", 18),
    player(`${tag}-wr1`, "WR", 11),
    player(`${tag}-te`, "TE", 8),
    player(`${tag}-k`, "K", 6),
    player(`${tag}-def`, "DEF", 5),
  ];
}

// The exact one-for-one improvement fixture proven in
// tradeLineup.test.js ("findTradeCandidate keeps only a fair swap that
// improves both starting lineups"), reused here so a candidate is
// guaranteed to exist without re-deriving the lineup math by hand.
const CANDIDATE_ROSTER_POSITIONS = ["RB", "RB", "WR"];

function ownCandidateRoster() {
  return [player("my-rb", "RB", 18), player("rb-one", "RB", 20), player("rb-two", "RB", 19), player("low-wr", "WR", 5)];
}

function opponentCandidateRoster() {
  return [
    player("their-wr", "WR", 12),
    player("wr-one", "WR", 20),
    player("wr-two", "WR", 19),
    player("low-rb", "RB", 5),
  ];
}

test("buildTeamNeedProfile reports a real hole where roster depth is below what the league starts", () => {
  const profile = buildTeamNeedProfile({
    team: team("1", "Own Team", thinAtRbRoster("own")),
    rosterPositions: ROSTER_POSITIONS,
  });

  assert.equal(profile.team_id, "1");
  assert.equal(profile.team_name, "Own Team");
  assert.ok(profile.needs.RB, "expected an RB need entry");
  assert.equal(profile.needs.RB.status, "hole");
  assert.ok(profile.needs.WR);
  assert.equal(profile.needs.WR.status, "surplus");
});

test("findLeagueTradeCandidates returns a candidate with reasoning naming which side's need it fills", () => {
  const teams = [team("1", "Own Team", ownCandidateRoster()), team("2", "Rival Team", opponentCandidateRoster())];

  const result = findLeagueTradeCandidates({
    ownTeamId: "1",
    teams,
    rosterPositions: CANDIDATE_ROSTER_POSITIONS,
  });

  assert.equal(result.status, "ok");
  assert.equal(result.degraded_teams.length, 0);
  assert.equal(result.budget_exceeded, false);
  assert.ok(result.candidates.length >= 1, "expected at least one candidate");

  const candidate = result.candidates[0];
  assert.equal(candidate.opponent_team_id, "2");
  assert.ok(Number.isFinite(candidate.user_lineup_delta));
  assert.ok(candidate.user_lineup_delta > 0);
  assert.ok(Number.isFinite(candidate.opponent_lineup_delta));
  assert.ok(candidate.opponent_lineup_delta > 0);

  // Reasoning is a required, tested field — not optional debug text.
  assert.ok(candidate.reasoning, "candidate must carry reasoning");
  assert.ok(Array.isArray(candidate.reasoning.fills_need_for));
  assert.ok(candidate.reasoning.user_receives.position);
  assert.ok(candidate.reasoning.opponent_receives.position);
  assert.ok(Array.isArray(candidate.reasoning.evidence) && candidate.reasoning.evidence.length > 0);

  // Never invents a value — valuation comes straight from the existing
  // tradeValue.js engine, unmodified.
  assert.ok(candidate.valuation);
  assert.ok(Number.isFinite(candidate.valuation.net_value));
  assert.equal(candidate.the_catch.status, "available");
  assert.equal(candidate.the_catch.code, "thin_position_after_trade");
  assert.match(candidate.the_catch.statement, /dedicated starting spot/);
});

test("findLeagueTradeCandidates never proposes a candidate against a roster it cannot read", () => {
  const teams = [
    team("1", "Own Team", ownCandidateRoster()),
    team("2", "Unreadable Team", []), // provider disclosed the team but not its roster
    team("3", "Rival Team", opponentCandidateRoster()),
  ];

  const result = findLeagueTradeCandidates({
    ownTeamId: "1",
    teams,
    rosterPositions: CANDIDATE_ROSTER_POSITIONS,
  });

  assert.equal(result.status, "ok");
  assert.equal(result.degraded_teams.length, 1);
  assert.equal(result.degraded_teams[0].team_id, "2");
  assert.equal(result.degraded_teams[0].reason, "roster_unreadable");
  // The scan must not fail closed just because one team's roster was bad.
  assert.ok(result.candidates.every((c) => c.opponent_team_id !== "2"));
  assert.ok(result.candidates.some((c) => c.opponent_team_id === "3"));
});

test("findLeagueTradeCandidates reports own_team_not_found rather than guessing a roster", () => {
  const teams = [team("2", "Rival Team", deepAtRbRoster("rival"))];
  const result = findLeagueTradeCandidates({
    ownTeamId: "does-not-exist",
    teams,
    rosterPositions: ROSTER_POSITIONS,
  });
  assert.equal(result.status, "own_team_not_found");
  assert.deepEqual(result.candidates, []);
});

// --- #404-shape regression: many connected teams, bounded compute ---------
//
// #404/#405: an unbounded trade search fanned out over every opponent with
// no ceiling and took production down for a day. #405's fix was a shared
// wall-clock + solve-count budget in tradeLineup.js. T2 scans a whole
// league instead of one opponent, so it reuses that exact budget (shared
// across every opponent processed in one call) plus a hard cap on how many
// opponent rosters are even considered.

test("findLeagueTradeCandidates caps opponent teams considered at MAX_OPPONENT_TEAMS_PER_SCAN (#404 shape)", () => {
  const teams = [team("own", "Own Team", thinAtRbRoster("own"))];
  const opponentCount = MAX_OPPONENT_TEAMS_PER_SCAN + 12; // a big dynasty-scale league
  for (let i = 0; i < opponentCount; i += 1) {
    teams.push(team(`opp-${String(i).padStart(3, "0")}`, `Opponent ${i}`, deepAtRbRoster(`opp${i}`)));
  }

  const startedAt = Date.now();
  const result = findLeagueTradeCandidates({ ownTeamId: "own", teams, rosterPositions: ROSTER_POSITIONS });
  const elapsed = Date.now() - startedAt;

  assert.equal(result.status, "ok");
  assert.ok(
    result.teams_considered <= MAX_OPPONENT_TEAMS_PER_SCAN,
    `expected teams_considered <= ${MAX_OPPONENT_TEAMS_PER_SCAN}, got ${result.teams_considered}`,
  );
  assert.equal(result.teams_skipped_for_cap.length, opponentCount - MAX_OPPONENT_TEAMS_PER_SCAN);
  assert.ok(result.candidates.length <= MAX_CANDIDATES_RETURNED);
  // Generous ceiling in the spirit of the #404 regression test in
  // tradeLineup.test.js: the point is "bounded", not a precise timing assertion.
  assert.ok(elapsed < 10_000, `league scan took ${elapsed}ms; bounding did not engage`);
});

test("findLeagueTradeCandidates shares one search budget across every opponent, so an exhausted budget stops the whole scan honestly", () => {
  const teams = [team("own", "Own Team", thinAtRbRoster("own"))];
  for (let i = 0; i < 5; i += 1) {
    teams.push(team(`opp-${i}`, `Opponent ${i}`, deepAtRbRoster(`opp${i}`)));
  }

  let exceededCalls = 0;
  const spentBudget = createSearchBudget({ budgetMs: -1 }); // already spent
  const result = findLeagueTradeCandidates({
    ownTeamId: "own",
    teams,
    rosterPositions: ROSTER_POSITIONS,
    budget: spentBudget,
    onBudgetExceeded: () => {
      exceededCalls += 1;
    },
  });

  assert.equal(result.status, "ok");
  assert.equal(result.candidates.length, 0, "a spent budget must yield no candidates, never a guessed one");
  assert.equal(result.budget_exceeded, true);
  assert.ok(exceededCalls > 0);
});

test("zero candidates always names why, from the narrowest step that ruled everything out", () => {
  const same = (tag) => thinAtRbRoster(tag);
  const mirror = findLeagueTradeCandidates({
    ownTeamId: "1",
    teams: [team("1", "Mine", same("a")), team("2", "Twin", same("b"))],
    rosterPositions: ROSTER_POSITIONS,
  });
  assert.equal(mirror.candidates.length, 0);
  assert.equal(mirror.empty_reason, "no_trade_helps_both_lineups");
  assert.ok(mirror.search_funnel.pairs_evaluated > 0);
  assert.equal(mirror.search_funnel.mutual_gain, 0);

  const blocked = findLeagueTradeCandidates({
    ownTeamId: "1",
    teams: [team("1", "Own Team", ownCandidateRoster()), team("2", "Rival Team", opponentCandidateRoster())],
    rosterPositions: CANDIDATE_ROSTER_POSITIONS,
    fairnessGuard: () => false,
  });
  assert.equal(blocked.candidates.length, 0);
  assert.equal(blocked.empty_reason, "no_fair_trade");
  assert.ok(blocked.search_funnel.mutual_gain > 0);

  const alone = findLeagueTradeCandidates({
    ownTeamId: "1",
    teams: [team("1", "Mine", thinAtRbRoster("a"))],
    rosterPositions: ROSTER_POSITIONS,
  });
  assert.equal(alone.empty_reason, "no_readable_opponents");

  const found = findLeagueTradeCandidates({
    ownTeamId: "1",
    teams: [team("1", "Own Team", ownCandidateRoster()), team("2", "Rival Team", opponentCandidateRoster())],
    rosterPositions: CANDIDATE_ROSTER_POSITIONS,
  });
  assert.ok(found.candidates.length > 0);
  assert.equal(found.empty_reason, null);
});

test("a FLEX slot is not owed to one position: 1 TE + FLEX requires one TE, not two", () => {
  const { buildTeamNeedProfile } = require("../src/services/tradeFind");
  const players = [
    { position: "TE", eligible_positions: ["TE"] },
    { position: "TE", eligible_positions: ["TE"] },
    { position: "RB", eligible_positions: ["RB"] },
    { position: "RB", eligible_positions: ["RB"] },
  ];
  const profile = buildTeamNeedProfile({
    team: { team_id: "1", players },
    rosterPositions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "SUPER_FLEX", "BN", "BN"],
  });
  assert.equal(profile.needs.TE.required, 1);
  assert.equal(profile.needs.RB.required, 2);
  assert.equal(profile.needs.TE.flex_slots, 1);
  assert.equal(profile.needs.QB.required, 1);
  assert.equal(profile.needs.QB.superflex_slots, 1);
});

// Founder, 2026-10-23: "it's telling me to trade a RB for a defense when I'm light at RB."
test("a found trade never sends or asks for a kicker or a defense", () => {
  const { positionalGuard } = require("../src/services/tradeFind");
  assert.equal(positionalGuard({ give: player("a", "RB", 12), receive: player("b", "DEF", 14) }), false);
  assert.equal(positionalGuard({ give: player("a", "D/ST", 9), receive: player("b", "WR", 10) }), false);
  assert.equal(positionalGuard({ give: player("a", "K", 9), receive: player("b", "K", 10) }), false);
});

test("a cross-position trade never takes from a position the team is already short at", () => {
  const { positionalGuard } = require("../src/services/tradeFind");
  const short = buildTeamNeedProfile({ team: team("t1", "Short", thinAtRbRoster("s")), rosterPositions: ROSTER_POSITIONS });
  const deep = buildTeamNeedProfile({ team: team("t2", "Deep", deepAtRbRoster("d")), rosterPositions: ROSTER_POSITIONS });
  assert.equal(short.needs.RB.status, "hole");
  // Short at RB: may not send its RB away for a WR.
  assert.equal(positionalGuard({ give: player("s-rb1", "RB", 8), receive: player("d-wr1", "WR", 11), ownNeeds: short, opponentNeeds: deep }), false);
  // Deep at RB: may send one to the team that needs it.
  assert.equal(positionalGuard({ give: player("s-wr1", "WR", 16), receive: player("d-rb3", "RB", 18), ownNeeds: short, opponentNeeds: deep }), true);
  // Same position keeps the count, so depth is not the question.
  assert.equal(positionalGuard({ give: player("s-rb1", "RB", 8), receive: player("d-rb3", "RB", 18), ownNeeds: short, opponentNeeds: deep }), true);
});

test("a league scan does not propose trading a short-handed RB for a defense, even when the lineup total rises", () => {
  const own = [
    player("o-qb", "QB", 20),
    player("o-rb1", "RB", 14),
    player("o-rb2", "RB", 9),
    player("o-wr1", "WR", 15),
    player("o-wr2", "WR", 14),
    player("o-te", "TE", 9),
    player("o-k", "K", 7),
    player("o-def", "DEF", 2),
  ];
  const other = [
    player("x-qb", "QB", 18),
    player("x-rb1", "RB", 15),
    player("x-rb2", "RB", 13),
    player("x-rb3", "RB", 3),
    player("x-wr1", "WR", 12),
    player("x-wr2", "WR", 11),
    player("x-te", "TE", 8),
    player("x-k", "K", 6),
    player("x-def", "DEF", 16),
    player("x-def2", "DEF", 15),
  ];
  const result = findLeagueTradeCandidates({
    ownTeamId: "own",
    teams: [team("own", "Own", own), team("other", "Other", other)],
    rosterPositions: ROSTER_POSITIONS,
    budget: createSearchBudget(),
  });
  for (const candidate of result.candidates) {
    for (const side of [candidate.give, candidate.receive]) {
      assert.notEqual(side.position, "DEF", `proposed ${candidate.give.name} for ${candidate.receive.name}`);
      assert.notEqual(side.position, "K");
    }
    assert.notEqual(candidate.give.position === "RB" && candidate.receive.position !== "RB", true);
  }
});
