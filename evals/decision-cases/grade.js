"use strict";

// Grades a whole move by what it does to the team's best legal lineup, week by week (founder-approved plan,
// 2026-10-23, phase 0). Everyone in the move counts: the add and the drop, the bench, flex and superflex slots, byes
// and injuries (a bye or OUT week is projected 0). Uses Omen's own lineup solver.

const { solveOptimalLineup } = require("../../src/services/tradeLineup");

function weekPlayers(players, week) {
  return players
    .filter((p) => !p.reserve)
    .map((p) => ({ ...p, projected_points: p.projected_points_by_week?.[week] ?? null }));
}

/** The team's best legal lineup total for each week, and the sum. */
function lineupByWeek(players, { roster_positions: slots }, weeks) {
  const byWeek = {};
  for (const week of weeks) {
    byWeek[week] = Math.round(solveOptimalLineup({ players: weekPlayers(players, week), rosterPositions: slots }).total * 100) / 100;
  }
  const total = Math.round(Object.values(byWeek).reduce((a, b) => a + b, 0) * 100) / 100;
  return { byWeek, total };
}

function findByName(list, name) {
  const found = list.find((p) => p.name === name);
  if (!found) throw new Error(`no player named ${name}`);
  return found;
}

/**
 * The lineup change from a move. `move` is one of:
 *   { type: "waiver", add: "Name", drop: "Name" }
 *   { type: "trade", give: ["Name"], receive: ["Name"] }   (partner found from whoever holds `receive`)
 * Returns the owner's change and, for a trade, the partner's.
 */
function gradeMove(snapshot, move) {
  const own = snapshot.teams.find((t) => t.own);
  const weeks = snapshot.weeks;
  const before = lineupByWeek(own.players, snapshot.league, weeks);
  if (move.type === "waiver") {
    const add = findByName(snapshot.pool, move.add);
    const after = own.players.filter((p) => p.name !== move.drop).concat([{ ...add, reserve: false }]);
    if (after.length === own.players.length + 1 && move.drop) throw new Error(`no player named ${move.drop}`);
    const result = lineupByWeek(after, snapshot.league, weeks);
    return { owner: delta(before, result), acquisition: add.acquisition };
  }
  const receive = move.receive.map((name) => {
    const holder = snapshot.teams.find((t) => !t.own && t.players.some((p) => p.name === name));
    if (!holder) throw new Error(`nobody else rosters ${name}`);
    return { holder, player: findByName(holder.players, name) };
  });
  const partner = receive[0].holder;
  const give = move.give.map((name) => findByName(own.players, name));
  const ownAfter = own.players.filter((p) => !move.give.includes(p.name)).concat(receive.map((r) => r.player));
  const partnerBefore = lineupByWeek(partner.players, snapshot.league, weeks);
  const partnerAfter = partner.players.filter((p) => !move.receive.includes(p.name)).concat(give);
  return {
    owner: delta(before, lineupByWeek(ownAfter, snapshot.league, weeks)),
    partner: delta(partnerBefore, lineupByWeek(partnerAfter, snapshot.league, weeks)),
    partner_team: partner.team_name,
  };
}

function delta(before, after) {
  const byWeek = {};
  for (const week of Object.keys(before.byWeek)) byWeek[week] = Math.round((after.byWeek[week] - before.byWeek[week]) * 100) / 100;
  return { before: before.total, after: after.total, change: Math.round((after.total - before.total) * 100) / 100, byWeek };
}

/** The best single add from what is actually attainable now, as the yardstick a claim must beat. */
function bestFreeAgentChange(snapshot, { position = null, drop } = {}) {
  let best = null;
  for (const add of snapshot.pool) {
    if (add.acquisition !== "free_agent" || (position && add.position !== position)) continue;
    const graded = gradeMove(snapshot, { type: "waiver", add: add.name, drop });
    if (!best || graded.owner.change > best.change) best = { name: add.name, change: graded.owner.change };
  }
  return best;
}

/**
 * What a player is worth in this league: points per week above the best player at his position anyone can add now,
 * over the case's weeks. A trade neither manager would accept gives away far more of this than it gets back, even
 * when it happens to raise both lineups this month (founder, 2026-10-23: a split-backfield RB for a top-three QB).
 */
function valueOverFreeAgent(snapshot, name) {
  const all = snapshot.teams.flatMap((t) => t.players).concat(snapshot.pool);
  const player = findByName(all, name);
  const free = snapshot.pool.filter((p) => p.acquisition === "free_agent" && p.position === player.position);
  let total = 0;
  for (const week of snapshot.weeks) {
    const best = Math.max(0, ...free.map((p) => p.projected_points_by_week?.[week] ?? 0));
    const mine = player.projected_points_by_week?.[week] ?? 0;
    total += mine - best;
  }
  return Math.round((total / snapshot.weeks.length) * 100) / 100;
}

/** Each side's value given and received, so a lopsided offer shows even when both lineups rise. */
function tradeBalance(snapshot, move) {
  const sum = (names) => Math.round(names.reduce((s, n) => s + valueOverFreeAgent(snapshot, n), 0) * 100) / 100;
  const given = sum(move.give);
  const received = sum(move.receive);
  return { owner_gives: given, owner_gets: received, gap: Math.round((received - given) * 100) / 100 };
}

module.exports = { lineupByWeek, gradeMove, bestFreeAgentChange, valueOverFreeAgent, tradeBalance };
