"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  solveOptimalLineup,
  solveOptimalLineupExhaustive,
  findTradeCandidate,
  createSearchBudget,
} = require("../src/services/tradeLineup");

function player(id, positions, points) {
  return {
    player_id: id,
    name: id,
    position: positions[0],
    eligible_positions: positions,
    projected_points: points,
  };
}

test("solveOptimalLineup fills constrained slots before flex and maximizes projection", () => {
  const result = solveOptimalLineup({
    players: [
      player("qb", ["QB"], 20),
      player("wr", ["WR"], 15),
      player("rb", ["RB"], 14),
      player("te", ["TE"], 9),
    ],
    rosterPositions: ["QB", "WR", "FLEX"],
  });

  assert.equal(result.total, 49);
  assert.deepEqual(result.starters.map((row) => row.player.player_id), ["qb", "wr", "rb"]);
});

test("solveOptimalLineup supports super-flex and leaves unprojected players out", () => {
  const result = solveOptimalLineup({
    players: [
      player("qb-one", ["QB"], 20),
      player("qb-two", ["QB"], 18),
      player("wr", ["WR"], 16),
      player("unknown", ["RB"], null),
    ],
    rosterPositions: ["QB", "SUPER_FLEX", "FLEX"],
  });

  assert.equal(result.total, 54);
  assert.deepEqual(result.starters.map((row) => row.player.player_id), ["qb-one", "qb-two", "wr"]);
});

test("solveOptimalLineup leaves an unfillable slot empty instead of inventing points", () => {
  const result = solveOptimalLineup({
    players: [player("qb", ["QB"], 20)],
    rosterPositions: ["QB", "TE"],
  });

  assert.equal(result.total, 20);
  assert.equal(result.starters[1].player, null);
});

test("solveOptimalLineup keeps IR and taxi players tradeable but out of starting totals", () => {
  const result = solveOptimalLineup({
    rosterPositions: ["RB", "WR"],
    players: [
      player("active-rb", ["RB"], 14),
      { ...player("ir-wr", ["WR"], 30), selected_position: "IR" },
      { ...player("taxi-wr", ["WR"], 25), selected_position: "TAXI" },
    ],
  });

  assert.equal(result.total, 14);
  assert.equal(result.starters[1].player, null);
});

test("findTradeCandidate keeps only a fair swap that improves both starting lineups", () => {
  const result = findTradeCandidate({
    ownTeam: { roster_id: "mine", players: [player("my-rb", ["RB"], 18), player("rb-one", ["RB"], 20), player("rb-two", ["RB"], 19), player("low-wr", ["WR"], 5)] },
    opponentTeams: [{ roster_id: "other", team_name: "Team 2", players: [player("their-wr", ["WR"], 12), player("wr-one", ["WR"], 20), player("wr-two", ["WR"], 19), player("low-rb", ["RB"], 5)] }],
    rosterPositions: ["RB", "RB", "WR"],
    fairnessGuard: () => true,
  });

  assert.ok(result);
  assert.ok(result.userDelta > 0);
  assert.ok(result.opponentDelta > 0);
});

// --- 2026-09-05 outage regression -------------------------------------------
//
// `findTradeCandidate` solves the optimal lineup twice per (own player x opponent player)
// pair, per opponent — ~5,600 exhaustive searches in an eleven-team league. Measured before
// the budget landed: **177 seconds for two opponents** on a normal 16-player roster,
// extrapolating to ~15 minutes for a real league, synchronously, on the thread that serves
// every request. Production served nothing at all until a watchdog restarted it.
//
// It had never run before: everything is gated on a finite `projected_points`, and ESPN
// published no 2026 projections until week 1 went live. The code did not change; the data did.

const OUTAGE_SLOTS = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "K", "DEF"];

function outageRoster(tag) {
  const mk = (id, position) => ({
    player_id: `${tag}-${id}`,
    position,
    eligible_positions: [position],
    selected_position: "BN",
    projected_points: 5 + (id.length % 9),
  });
  const players = [mk("qb", "QB")];
  for (let i = 0; i < 5; i += 1) players.push(mk(`rb${i}`, "RB"));
  for (let i = 0; i < 6; i += 1) players.push(mk(`wr${i}`, "WR"));
  for (let i = 0; i < 2; i += 1) players.push(mk(`te${i}`, "TE"));
  players.push(mk("k", "K"));
  players.push(mk("def", "DEF"));
  return players;
}

test("findTradeCandidate cannot block the event loop on a real league (2026-09-05 outage)", () => {
  const ownTeam = { roster_id: 0, players: outageRoster("own") };
  const opponentTeams = Array.from({ length: 11 }, (_, i) => ({
    roster_id: i + 1,
    players: outageRoster(`opp${i}`),
  }));

  const startedAt = Date.now();
  const candidate = findTradeCandidate({ ownTeam, opponentTeams, rosterPositions: OUTAGE_SLOTS });
  const elapsed = Date.now() - startedAt;

  // Generous ceiling so this does not flake on a loaded CI box, but far below the budget's
  // 2s trip: the point is that the search now *finishes on its merits* rather than being cut
  // off. Measured locally at ~65ms, against roughly 15 minutes for the exhaustive version.
  assert.ok(
    elapsed < 5_000,
    `trade search took ${elapsed}ms; the exact solver should finish this in well under a second`
  );
  // These rosters are deliberately identical in shape, so no swap improves both teams and
  // `null` here means "no good trade", not "gave up". The test above proves trades are still
  // found when they exist.
  assert.equal(candidate, null);
});

test("the exhaustive solver still reports a truncated search honestly", () => {
  // The budget machinery guards the *exhaustive* solver, which is now only the test oracle.
  // Kept covered because it is what `findTradeCandidate` falls back on if the fast path is
  // ever bypassed, and because "a truncated result must say so" is the property the whole
  // no-suggestion-on-timeout rule rests on.
  const spent = createSearchBudget({ budgetMs: -1 });
  const result = solveOptimalLineupExhaustive({
    players: outageRoster("own"),
    rosterPositions: OUTAGE_SLOTS,
    budget: spent,
  });

  assert.equal(result.exhaustive, false);
  assert.equal(result.starters.length, OUTAGE_SLOTS.length);
});

test("the fast solver cannot be truncated, so it always answers exhaustively", () => {
  const spent = createSearchBudget({ budgetMs: -1 });
  const result = solveOptimalLineup({
    players: outageRoster("own"),
    rosterPositions: OUTAGE_SLOTS,
    budget: spent,
  });

  // An already-spent budget changes nothing: assignment is polynomial and simply finishes.
  assert.equal(result.exhaustive, true);
  assert.equal(result.starters.length, OUTAGE_SLOTS.length);
});

// The property that makes the replacement safe: the fast solver is not an approximation.
// If these two ever disagree, the fast one is wrong — the exhaustive search is the definition
// of the right answer, just far too slow to ship.
test("the fast solver returns the exhaustive search's answer on randomised rosters", () => {
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];
  const SLOT_SETS = [
    ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"],
    ["QB", "RB", "WR", "WR", "REC_FLEX", "SUPER_FLEX"],
    ["QB", "QB", "RB", "RB", "RB", "WR", "WR", "FLEX"],
    ["RB", "WR", "FLEX", "FLEX"],
    ["QB"],
  ];

  for (let trial = 0; trial < 400; trial += 1) {
    const rosterPositions = pick(SLOT_SETS);
    const players = Array.from({ length: 1 + Math.floor(rnd() * 8) }, (_, i) => {
      const position = pick(POSITIONS);
      return {
        player_id: `p${i}`,
        position,
        // A quarter are multi-position, which is where a naive greedy solver goes wrong.
        eligible_positions: rnd() < 0.25 ? [position, pick(POSITIONS)] : [position],
        selected_position: rnd() < 0.1 ? pick(["IR", "TAXI", "BN"]) : "BN",
        // Negative projections included on purpose: the correct answer leaves that slot empty.
        projected_points: rnd() < 0.08 ? null : Math.round((rnd() * 40 - 5) * 10) / 10,
      };
    });

    const fast = solveOptimalLineup({ players, rosterPositions });
    const exhaustive = solveOptimalLineupExhaustive({ players, rosterPositions });
    assert.ok(
      Math.abs(fast.total - exhaustive.total) < 1e-6,
      `trial ${trial}: fast=${fast.total} exhaustive=${exhaustive.total} slots=${JSON.stringify(rosterPositions)}`
    );
  }
});

test("an unbudgeted solve is unchanged and reports itself exhaustive", () => {
  const result = solveOptimalLineup({
    players: [
      { player_id: "a", position: "QB", eligible_positions: ["QB"], projected_points: 20 },
      { player_id: "b", position: "RB", eligible_positions: ["RB"], projected_points: 12 },
    ],
    rosterPositions: ["QB", "RB"],
  });

  assert.equal(result.exhaustive, true);
  assert.equal(result.total, 32);
});
