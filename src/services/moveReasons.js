"use strict";

/**
 * Why a move is right, in the words a manager uses, for every surface (Omen call, start/sit, waivers, trades).
 * Founder, 2026-10-23: "I don't wanna just see points being compared." Reasons come first, in this order:
 *
 *   1. Who is out, hurt or on bye, and for which weeks (injury from Sight, weeks from comingWeeks.js).
 *   2. Omen's own read of each player (Sight grade and the drivers behind it: role, usage, efficiency, team outlook).
 *   3. What the move does to the lineup over the weeks judged.
 *
 * Points appear only in the last reason, as the size of the lineup change. Pure; never throws; returns [] when it
 * knows nothing, so a caller can keep its old text.
 */

const DRIVER_WORDS = {
  target_share: "a big share of the targets",
  production_ppg: "steady weekly production",
  designed_rush_share: "designed runs near the goal line and in the open field",
  epa_per_dropback: "efficient passing",
  implied_team_total: "an offense expected to score",
  snap_share: "an every-down role",
  carry_share: "most of the carries",
  route_participation: "a route on nearly every dropback",
  red_zone_share: "red-zone work",
  air_yards_share: "the deep looks",
};

const OUT_WORDS = { IR: "on injured reserve", OUT: "out", PUP: "on PUP", SUSP: "suspended", Sus: "suspended" };

function weeksText(weeks) {
  if (!weeks.length) return "";
  if (weeks.length === 1) return `week ${weeks[0]}`;
  const contiguous = weeks.every((w, i) => i === 0 || w === weeks[i - 1] + 1);
  return contiguous ? `weeks ${weeks[0]}–${weeks[weeks.length - 1]}` : `weeks ${weeks.join(", ")}`;
}

/** Weeks this player is projected not to play, from his per-week numbers. */
function missedWeeks(player) {
  return Object.entries(player?.projected_points_by_week || {})
    .filter(([, v]) => v != null && Number(v) === 0)
    .map(([w]) => Number(w))
    .filter(Number.isInteger)
    .sort((a, b) => a - b);
}

function availability(player) {
  if (!player?.name) return null;
  const missed = missedWeeks(player);
  const injury = player?.sight?.injury;
  const status = String(injury?.status || player?.status || "").trim();
  const hurt = OUT_WORDS[status] || OUT_WORDS[status.toUpperCase()];
  const body = injury?.body_part ? ` (${String(injury.body_part).toLowerCase()})` : "";
  if (hurt && missed.length) return `${player.name} is ${hurt}${body} and projected to miss ${weeksText(missed)}.`;
  if (missed.length) return `${player.name} is projected not to play ${weeksText(missed)}.`;
  if (hurt) return `${player.name} is ${hurt}${body}.`;
  if (/^(Q|QUESTIONABLE|D|DOUBTFUL)$/i.test(status))
    return `${player.name} is ${status.length > 1 ? status.toLowerCase() : "questionable"}${body} this week.`;
  return null;
}

function topDriver(player) {
  const drivers = Array.isArray(player?.sight?.drivers) ? player.sight.drivers : [];
  const best = drivers
    .filter((d) => Number(d?.points) > 0 && DRIVER_WORDS[d?.name])
    .sort((a, b) => b.points - a.points)[0];
  return best ? DRIVER_WORDS[best.name] : null;
}

function grade(player) {
  const g = Number(player?.sight?.grade);
  return Number.isFinite(g) ? Math.round(g) : null;
}

/** Omen's read of the two players: grades, and what drives the one you get. */
function read(gain, lose) {
  const gainGrade = grade(gain);
  const loseGrade = grade(lose);
  const why = topDriver(gain);
  if (gainGrade != null && loseGrade != null && gainGrade > loseGrade) {
    const lead = `Omen grades ${gain.name} ${gainGrade} to ${lose.name}'s ${loseGrade}`;
    return why ? `${lead}: ${gain.name} has ${why}.` : `${lead}.`;
  }
  if (gainGrade != null && loseGrade != null && gainGrade < loseGrade) {
    // The better player is losing his place only because he can't play; say so instead of arguing against the move.
    const out = missedWeeks(lose).length > 0 || availability(lose) != null;
    if (out)
      return `${lose.name} is the better player when healthy (Omen ${loseGrade} to ${gainGrade}), but not while he's out.`;
    return why ? `${gain.name} has ${why}.` : null;
  }
  if (why) return `${gain.name} has ${why}.`;
  return null;
}

function lineupText(lineupGain, weeks) {
  const gain = Number(lineupGain);
  if (!Number.isFinite(gain) || gain === 0) return null;
  const span = weeks?.length > 1 ? ` over ${weeksText(weeks)}` : "";
  const size = Math.abs(gain).toFixed(1);
  return gain > 0
    ? `Your best lineup gains ${size} points a week${span}.`
    : `Your best lineup loses ${size} points a week${span}.`;
}

/**
 * gain: the player you start, add or receive. lose: the player you sit, drop or give. weeks: the weeks judged.
 * lineupGain: points a week the whole move adds to your best lineup (optional).
 */
function reasonsFor({ gain, lose = null, weeks = [], lineupGain = null } = {}) {
  const reasons = [];
  for (const line of [availability(lose), availability(gain)]) if (line) reasons.push(line);
  const omenRead = gain && lose ? read(gain, lose) : gain ? read(gain, {}) : null;
  if (omenRead) reasons.push(omenRead);
  const lineup = lineupText(lineupGain, weeks);
  if (lineup) reasons.push(lineup);
  return reasons;
}

module.exports = { reasonsFor, missedWeeks, weeksText, DRIVER_WORDS };
