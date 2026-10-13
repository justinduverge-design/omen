"use strict";

/**
 * The "challenger" evidence row: when Omen's projection and the league provider's projection are far apart, say so,
 * with the provider's number, Omen's number and the two or three real facts that drive the gap.
 *
 * Pure. Role `challenger` is a PROPOSED role in omen-decision-drivers-v1.md; nothing here is wired into a
 * route or into the protected brief builder. Every number comes from the two projections or from the player's own
 * history rows; nothing is estimated or written from a template of invented numbers.
 *
 * Shown only when all hold: both numbers exist in the league's scoring, |gap| > threshold, Omen's confidence band is
 * not `low` and not null, and the player is not out/bye/rookie. Threshold = the position's model MAE from the
 * backtest, recorded per position in the spec; it is passed in, never guessed here.
 */

const { SCORING_PRESETS, scoreStatLine, sleeperStatLineToFacts, statLineToFacts } = require("./scoring");

const LABELS = {
  passing_yards: "passing yards", passing_touchdowns: "passing touchdowns", passing_interceptions: "interceptions",
  rushing_yards: "rushing yards", rushing_touchdowns: "rushing touchdowns", receiving_receptions: "receptions",
  receiving_yards: "receiving yards", receiving_touchdowns: "receiving touchdowns", fumbles_lost: "fumbles lost",
};
const USAGE_KEYS = { QB: [["attempts", "pass attempts"], ["carries", "carries"]], RB: [["carries", "carries"], ["targets", "targets"]],
  WR: [["targets", "targets"], ["carries", "carries"]], TE: [["targets", "targets"], ["carries", "carries"]] };

const round = (v, d = 1) => { const f = 10 ** d; return Math.round(v * f) / f; };
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

function ruleValues(contract) {
  const out = new Map();
  for (const rule of contract.rules || []) if (rule.operator === "per_event" && Number.isFinite(rule.value)) out.set(rule.event_key, rule.value);
  return out;
}

/** Facts that explain the gap when the provider gives a stat line (Sleeper): biggest per-stat point differences. */
function statLineFacts(omenStatLine, providerFacts, contract) {
  const omenFacts = statLineToFacts(omenStatLine);
  const values = ruleValues(contract);
  const facts = [];
  for (const [eventKey, perUnit] of values) {
    if (!(eventKey in LABELS) || perUnit === 0) continue;
    const omen = omenFacts[eventKey] || 0;
    const provider = providerFacts[eventKey] || 0;
    const effect = (omen - provider) * perUnit;
    if (Math.abs(effect) >= 0.25) facts.push({ kind: "stat_difference", key: eventKey, label: LABELS[eventKey], omen: round(omen), provider: round(provider), points_effect: round(effect, 2) });
  }
  return facts.sort((a, b) => Math.abs(b.points_effect) - Math.abs(a.points_effect));
}

/** Facts that explain the gap from Omen's own inputs when the provider gives only points (ESPN). */
function usageFacts(omen, history) {
  const facts = [];
  const recent = [...(history || [])].sort((a, b) => b.season - a.season || b.week - a.week).slice(0, 3);
  for (const [key, label] of USAGE_KEYS[omen.position] || []) {
    const projected = omen.stat_line[key];
    if (recent.length >= 2 && projected > 0) {
      const last3 = mean(recent.map((r) => Number(r.stats?.[key]) || 0));
      if (last3 != null && Math.abs(projected - last3) >= 1) facts.push({ kind: "usage", key, label, omen_projected: round(projected), last_3_games_average: round(last3), games: recent.length });
    }
  }
  const rz = omen.components?.red_zone_ratio;
  for (const [key, name] of [["carries", "red-zone carry share"], ["targets", "red-zone target share"]]) {
    if (rz && Math.abs(rz[key] - 1) >= 0.25) facts.push({ kind: "red_zone", key, label: name, relative_to_position: round(rz[key], 2) });
  }
  const env = omen.components?.environment;
  if (env && Math.abs(env.volume_multiplier - 1) >= 0.03) facts.push({ kind: "environment", key: "implied_team_points", label: "team scoring environment this week vs recent games", volume_multiplier: round(env.volume_multiplier, 2) });
  return facts;
}

/**
 * @param {object} args
 * @param {string} args.providerLabel      e.g. "ESPN projection", "Sleeper projection"
 * @param {number} args.providerPoints     provider's projection in the league's scoring
 * @param {object=} args.providerStatLine  provider stat line in Sleeper keys, when it exposes one
 * @param {object} args.omen               result of projectPlayerWeek
 * @param {object|string} args.scoring     league scoring contract or preset name
 * @param {number} args.threshold          points; the position's model MAE from the backtest
 * @param {object[]=} args.history         the player's prior-week rows (for usage facts)
 * @param {{omen_closer_share:number, n:number}=} args.trackRecord  backtest evidence for gaps of this size
 */
function buildChallengerRow({ providerLabel, providerPoints, providerStatLine, omen, scoring = "ppr", threshold, history, trackRecord }) {
  if (!omen || omen.supported === false || !omen.stat_line) return null;
  if (!omen.confidence?.band || omen.confidence.band === "low") return null;
  if (omen.flags.includes("rookie") || omen.flags.includes("no_history")) return null;
  if (!Number.isFinite(providerPoints) || !Number.isFinite(threshold) || threshold <= 0) return null;
  const contract = typeof scoring === "string" ? SCORING_PRESETS[scoring] : scoring;
  if (!contract) return null;
  const omenPoints = scoreStatLine(omen.stat_line, contract);
  const gap = omenPoints - providerPoints;
  if (Math.abs(gap) <= threshold) return null;

  const facts = (providerStatLine ? statLineFacts(omen.stat_line, sleeperStatLineToFacts(providerStatLine), contract) : [])
    .concat(usageFacts(omen, history)).slice(0, 3);
  if (facts.length === 0) return null; // a gap with no real fact behind it is not shown

  const ratio = Math.abs(gap) / threshold;
  const proven = trackRecord && trackRecord.n >= 100 && trackRecord.omen_closer_share != null;
  // Weight never exceeds "slight" without a backtest record that the larger gaps favour Omen at least as often as not.
  const weight = !proven || trackRecord.omen_closer_share < 0.5 ? "slight" : ratio >= 2 ? "strong" : ratio >= 1.5 ? "moderate" : "slight";
  return {
    role: "challenger",
    weight,
    provider_label: providerLabel,
    provider_points: round(providerPoints, 1),
    omen_label: "Omen projection",
    omen_points: round(omenPoints, 1),
    gap_points: round(gap, 1),
    direction: gap > 0 ? "omen_higher" : "omen_lower",
    threshold_points: round(threshold, 1),
    confidence: omen.confidence.band,
    facts,
    track_record: trackRecord ? { omen_closer_share: trackRecord.omen_closer_share, n: trackRecord.n } : null,
    method_version: omen.method_version,
  };
}

module.exports = { buildChallengerRow };
