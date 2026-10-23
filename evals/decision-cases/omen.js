"use strict";

// Runs Omen's own engines on a saved case, so "the cases pass" means Omen's answer is right, not just the grader.

const { solveOptimalLineup } = require("../../src/services/tradeLineup");
const { buildWaiverAnalysis } = require("../../src/services/waiverAnalysis");

/** The owner's roster in the shape the waiver route reads: starters in their slots for the decision week, the rest on the bench. */
function rosterFor(snapshot) {
  const own = snapshot.teams.find((t) => t.own);
  const week = snapshot.weeks[0];
  const rows = own.players.map((p) => ({
    ...p,
    player_key: p.player_key ?? p.player_id ?? p.name,
    status: p.injury_status ?? p.status ?? null,
    projected_points: p.projected_points_by_week?.[week] ?? null,
    selected_position: p.reserve ? "IR" : "BN",
  }));
  const solved = solveOptimalLineup({ players: rows, rosterPositions: snapshot.league.roster_positions });
  const starters = solved.starters.filter((s) => s.player).map((s) => ({ ...s.player, selected_position: s.slot }));
  const started = new Set(starters.map((p) => p.player_key));
  // Lineup slots the solver could not fill still count as slots.
  const empty = solved.starters.filter((s) => !s.player).length;
  return {
    week,
    slots: {
      starters,
      bench: rows.filter((p) => !started.has(p.player_key) && p.selected_position !== "IR"),
      ir: rows.filter((p) => p.selected_position === "IR"),
    },
    empty_slots: empty,
  };
}

function poolFor(snapshot) {
  const week = snapshot.weeks[0];
  return snapshot.pool.map((p) => ({
    ...p,
    player_key: p.player_key ?? p.player_id ?? p.name,
    status: p.injury_status ?? p.status ?? null,
    projected_points: p.projected_points_by_week?.[week] ?? null,
  }));
}

/** Omen's waiver answer for the case's league and week, judged over the weeks the case carries. */
function omenWaiverMove(snapshot) {
  const analysis = buildWaiverAnalysis({
    roster: rosterFor(snapshot),
    pool: poolFor(snapshot),
    platform: snapshot.source?.provider ?? "sleeper",
    leagueId: "case",
    week: snapshot.weeks[0],
    availabilityConfirmed: true,
    lastPlayoffWeek: snapshot.weeks[snapshot.weeks.length - 1],
  });
  return analysis.best_move
    ? { add: analysis.best_move.add?.name ?? null, drop: analysis.best_move.drop?.name ?? null, gain: analysis.best_move.lineup_gain }
    : { add: null, drop: null, state: analysis.state };
}

module.exports = { rosterFor, poolFor, omenWaiverMove };
