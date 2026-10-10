"use strict";

/**
 * Start/sit evidence lines for the 2026-10-13 beta slice of Omen's own stats (registry FND-02..05,
 * ROL-01, ROL-03, ENV-01, ENV-02). Pure: takes the cached season bundle from fantasyMetricsData.js and
 * returns evidence rows `{ category, kind, statement }` in the closed vocabulary
 * (evidenceVocabulary.js START_SIT).
 *
 * Every line describes what happened (or, for Projected Team Score, what the game's lines imply).
 * None claims a prediction. Working names (Fated Points, Fate Gap, Pecking Order, Next Man Up,
 * Projected Team Score) are founder-approved working names (decision log 2026-10-10).
 */

const { formatPoints, formatFromLabel } = require("./fatedPoints");
const { canonicalAbbreviation, teamName } = require("../footballIntelligence/nflTeams");

const RECENT_GAMES = 3;
const HOT_COLD_PER_GAME = 3; // points a game between actual and Fated before "running hot/cold"
const TD_GAP_MIN = 1.5;
const BLOWOUT_SPREAD = 10;
const SHOOTOUT_TOTAL = 50;
const NEXT_MAN_UP_REGULAR = 4; // opportunities a game for a teammate to count as a regular
const NEXT_MAN_UP_MIN_DELTA = 3;
const NEXT_MAN_UP_MIN_RATIO = 0.3;
const NEXT_MAN_UP_MIN_MISSED = 2; // one game is a coincidence, not a pattern (trend evidence spec §6)
const SKILL = new Set(["RB", "WR", "TE"]);

const one = (n) => (Math.round(n * 10) / 10).toFixed(1);
const signed = (n) => `${n >= 0 ? "+" : "−"}${one(Math.abs(n))}`;
const pct = (share) => `${Math.round(share * 100)}%`;
const opportunities = (row) => row.targets + row.carries;

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function recentRows(rows, beforeWeek, count = RECENT_GAMES) {
  return (rows || []).filter((r) => r.week < beforeWeek).sort((a, b) => b.week - a.week).slice(0, count);
}

function sumFacts(rows, side) {
  const out = {};
  for (const row of rows) for (const [k, v] of Object.entries(row[side])) out[k] = (out[k] || 0) + v;
  return out;
}

/** FND-02/03: Fated Points and the Fate Gap over the last games. */
function fatedLine({ name, rows, rec, label }) {
  if (!rows.length) return null;
  const n = rows.length;
  const fated = formatPoints(sumFacts(rows, "expected"), rec) / n;
  const actual = formatPoints(sumFacts(rows, "actual"), rec) / n;
  const gap = actual - fated;
  const span = n === 1 ? "in his last game" : `a game over his last ${n} games`;
  let read = "";
  if (gap >= HOT_COLD_PER_GAME) read = " He has been running hot.";
  else if (gap <= -HOT_COLD_PER_GAME) read = " He has been running cold.";
  return `Fated Points (beta): ${name}'s usage was worth ${one(fated)} ${label} points ${span}; he scored ${one(actual)} (Fate Gap ${signed(gap)}).${read}`;
}

/** FND-04: TDs against expected TDs, season to date. */
function tdLine({ name, rows }) {
  if (rows.length < 2) return null;
  const facts = { exp: sumFacts(rows, "expected"), act: sumFacts(rows, "actual") };
  const expTd = (facts.exp.receiving_touchdowns || 0) + (facts.exp.rushing_touchdowns || 0);
  const actTd = (facts.act.receiving_touchdowns || 0) + (facts.act.rushing_touchdowns || 0);
  if (Math.abs(actTd - expTd) < TD_GAP_MIN) return null;
  return `TD Fate Gap (beta): ${name} has ${actTd} TD${actTd === 1 ? "" : "s"} this season on usage that usually produces ${one(expTd)}.`;
}

/** FND-05: red-zone work over the last games. */
function redZoneLine({ name, rows }) {
  if (!rows.length) return null;
  const o = rows.reduce((acc, r) => {
    for (const [k, v] of Object.entries(r.opportunity)) acc[k] = (acc[k] || 0) + v;
    return acc;
  }, {});
  const rz = o.rz_carries + o.rz_targets;
  if (!rz) return null;
  const parts = [];
  if (o.rz_carries) parts.push(`${o.rz_carries} carr${o.rz_carries === 1 ? "y" : "ies"}`);
  if (o.rz_targets) parts.push(`${o.rz_targets} target${o.rz_targets === 1 ? "" : "s"}`);
  const i10 = o.i10_carries + o.i10_targets;
  const tail = i10 ? `, ${i10} of them inside the 10` : "";
  const games = rows.length === 1 ? "his last game" : `his last ${rows.length} games`;
  return `Red-zone work (beta): ${name} had ${parts.join(" and ")} inside the 20 over ${games}${tail}.`;
}

/** ROL-01: rank by Fated Points share within the team's position group over the team's last games. */
function peckingOrderLine({ name, gsis, position, team, beforeWeek, bundle }) {
  const weeks = (bundle.teamWeeks.get(team) || []).filter((w) => w < beforeWeek).slice(-RECENT_GAMES);
  if (!weeks.length) return null;
  const weekSet = new Set(weeks);
  const totals = new Map();
  for (const row of bundle.byTeam.get(team) || []) {
    if (!weekSet.has(row.week) || bundle.positions.get(row.player) !== position) continue;
    totals.set(row.player, (totals.get(row.player) || 0) + formatPoints(row.expected, 1));
  }
  const room = [...totals.values()].reduce((a, b) => a + b, 0);
  if (!room || !totals.has(gsis)) return null;
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const rank = ranked.findIndex(([id]) => id === gsis) + 1;
  const share = totals.get(gsis) / room;
  const teamLabel = teamName(team) || team;
  return `Pecking Order (beta): ${name} is ${ordinal(rank)} among ${teamLabel} ${position}s, with ${pct(share)} of their Fated Points over the team's last ${weeks.length} game${weeks.length === 1 ? "" : "s"}.`;
}

/** ROL-03: the teammate whose absences moved this player's work the most. */
function nextManUpLine({ name, gsis, position, team, beforeWeek, bundle }) {
  const teamWeeks = (bundle.teamWeeks.get(team) || []).filter((w) => w < beforeWeek);
  const mine = new Map((bundle.byPlayer.get(gsis) || []).filter((r) => r.team === team && r.week < beforeWeek).map((r) => [r.week, r]));
  if (mine.size < 3) return null;
  const mates = new Map();
  for (const row of bundle.byTeam.get(team) || []) {
    if (row.player === gsis || row.week >= beforeWeek || bundle.positions.get(row.player) !== position) continue;
    if (!mates.has(row.player)) mates.set(row.player, new Map());
    mates.get(row.player).set(row.week, row);
  }
  let best = null;
  for (const [mate, games] of mates) {
    const avg = [...games.values()].reduce((a, r) => a + opportunities(r), 0) / games.size;
    if (avg < NEXT_MAN_UP_REGULAR) continue;
    const first = Math.min(...games.keys());
    const missed = teamWeeks.filter((w) => w >= first && !games.has(w) && mine.has(w));
    const together = teamWeeks.filter((w) => games.has(w) && mine.has(w));
    if (missed.length < NEXT_MAN_UP_MIN_MISSED || together.length < 2) continue;
    const without = missed.reduce((a, w) => a + opportunities(mine.get(w)), 0) / missed.length;
    const withMate = together.reduce((a, w) => a + opportunities(mine.get(w)), 0) / together.length;
    const delta = without - withMate;
    if (Math.abs(delta) < NEXT_MAN_UP_MIN_DELTA || Math.abs(delta) < NEXT_MAN_UP_MIN_RATIO * Math.max(withMate, 1)) continue;
    if (!best || Math.abs(delta) > Math.abs(best.delta)) best = { mate, missed: missed.length, without, withMate, delta };
  }
  if (!best) return null;
  const mateName = bundle.names.get(best.mate) || "a teammate";
  return `Next Man Up (beta): in the ${best.missed} games ${mateName} missed, ${name} averaged ${one(best.without)} targets and carries, against ${one(best.withMate)} when both played.`;
}

/** ENV-01/02: expected team points from the game's spread and total, with blowout and shootout watch. */
function projectedTeamScore({ team, week, bundle }) {
  const game = (bundle.games || []).find((g) => g.week === week && (g.home === team || g.away === team));
  if (!game || game.spread == null || game.total == null) return null;
  const home = (game.total + game.spread) / 2;
  const away = (game.total - game.spread) / 2;
  const isHome = game.home === team;
  const mine = isHome ? home : away;
  const theirs = isHome ? away : home;
  const opponent = isHome ? game.away : game.home;
  const watch = [];
  if (Math.abs(game.spread) >= BLOWOUT_SPREAD) watch.push("Blowout watch");
  if (game.total >= SHOOTOUT_TOTAL) watch.push("Shootout watch");
  const flags = watch.length ? ` ${watch.join(", ")}.` : "";
  return `Projected Team Score: ${teamName(team) || team} ${one(mine)}, ${teamName(opponent) || opponent} ${one(theirs)}, from the game's spread and total.${flags}`;
}

/**
 * Evidence rows for one roster player.
 * @param {object} p { name, gsis, position, team (any provider alias), beforeWeek, scoringFormat, bundle }
 */
function fantasyMetricsEvidence({ name, gsis, position, team, beforeWeek, scoringFormat, bundle }) {
  const rows = [];
  const pos = String(position || "").toUpperCase();
  const teamAbbr = canonicalAbbreviation(team);
  if (!bundle || !name) return rows;
  if (gsis && SKILL.has(pos)) {
    const { rec, label } = formatFromLabel(scoringFormat);
    const all = (bundle.byPlayer.get(gsis) || []).filter((r) => r.week < beforeWeek);
    const recent = recentRows(all, beforeWeek);
    const playerTeam = recent[0]?.team || teamAbbr;
    const lines = [
      fatedLine({ name, rows: recent, rec, label }),
      tdLine({ name, rows: all }),
      redZoneLine({ name, rows: recent }),
      playerTeam ? peckingOrderLine({ name, gsis, position: pos, team: playerTeam, beforeWeek, bundle }) : null,
      playerTeam ? nextManUpLine({ name, gsis, position: pos, team: playerTeam, beforeWeek, bundle }) : null,
    ];
    for (const statement of lines) if (statement) rows.push({ category: "omen_metric", kind: "observed_context", statement });
  }
  return rows;
}

/** One Projected Team Score row per distinct team among the players. */
function gameEnvironmentEvidence({ teams, week, bundle }) {
  const rows = [];
  const seen = new Set();
  for (const team of teams) {
    const abbr = canonicalAbbreviation(team);
    if (!abbr || seen.has(abbr) || !bundle) continue;
    seen.add(abbr);
    const statement = projectedTeamScore({ team: abbr, week, bundle });
    if (statement) rows.push({ category: "game_environment", kind: "projection", statement });
  }
  return rows;
}

module.exports = {
  fantasyMetricsEvidence,
  gameEnvironmentEvidence,
  fatedLine,
  tdLine,
  redZoneLine,
  peckingOrderLine,
  nextManUpLine,
  projectedTeamScore,
};
