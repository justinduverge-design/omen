"use strict";

/**
 * Signal vs noise (decision_log 2026-10-04, engine step 6).
 *
 * Omen does not try to beat provider projections; it explains them. This module separates what is
 * likely noise from what is observed fact, using OBSERVED values only (the projection gap a provider
 * published and box-score usage already played). It predicts nothing and never calls anything
 * "predictive". Pure and deterministic: no I/O, no clock, no randomness, and it never throws on
 * odd input.
 *
 * Every number that appears in a sentence is computed from the inputs. Missing data yields
 * 'insufficient_data' or no statement, never a guess.
 */

const { THRESHOLDS: CONFIDENCE_THRESHOLDS } = require("./confidencePolicy");

// Defensive fallback: if the confidence scale ever drops the line, keep the documented 1.5 rather than
// letting `gap < undefined` misclassify everything. The test asserts the import is live.
const COIN_FLIP_FALLBACK = 1.5;

const THRESHOLDS = Object.freeze({
  // Same coin-flip line as the confidence scale (imported, not duplicated).
  GAP_NOISE_BELOW: Number.isFinite(CONFIDENCE_THRESHOLDS.COIN_FLIP_BELOW) ? CONFIDENCE_THRESHOLDS.COIN_FLIP_BELOW : COIN_FLIP_FALLBACK,
  // Provider projections are right ~82% of the time at 8+ pts (omen-decision-engine-v2.md), the
  // research point where a gap stops being a lean. Describes the gap's size only.
  GAP_LARGE_AT: 8,
  // Counted games looked at (most recent) and the least needed to say anything.
  WINDOW_GAMES: 6,
  MIN_GAMES: 3,
  // Mean absolute deviation (MAD) around the window mean. Snap share: 0.10 (10 points) matches the
  // meaningful-change line in playerUsage.js (SNAP_MIN_DELTA); smaller swings are game-script jitter.
  SNAP_SHARE_MAD_VOLATILE: 0.1,
  // Targets/carries: 2 a game matches playerUsage.js VOLUME_MIN_DELTA, so a role swinging by two
  // touches a game on average is uneven, while a touch of drift is ordinary.
  VOLUME_MAD_VOLATILE: 2,
});

// Values from evidenceVocabulary START_SIT.kinds; membership is asserted in the test, not at load time.
const KIND = Object.freeze({ OBSERVED: "observed_context", PROJECTION: "projection" });

const fmt = (n) => Number(n.toFixed(1));
const round2 = (n) => Number(n.toFixed(2));
const pts = (n) => `${n} pt${n === 1 ? "" : "s"}`;
const pct = (share) => `${Math.round(share * 100)}%`;
const cap1 = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;
// "an 8-point gap", "a 3.2-point gap": 8, 11, 18 and 80-89 take "an".
const article = (n) => (/^(8|11|18|8\d)(\.|$)/.test(String(n)) ? "an" : "a");

function toNumber(v) {
  if (typeof v !== "number" && typeof v !== "string") return null; // objects ([] coerces to 0), Symbols, booleans
  try {
    if (typeof v === "string" && v.trim() === "") return null; // blank is missing, never 0
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null; // Symbol, throwing valueOf, etc.
  }
}

/** Classify a projection gap (points, either sign). */
function gapNoise(gapPts) {
  const g = toNumber(gapPts);
  if (g === null) return { classification: null, gap: null, sentence: null };
  // One rule: classify on the value shown. The gap is rounded to 2 decimals (as confidencePolicy
  // renders it) and that rounded number is both compared with the lines and printed.
  const gap = round2(Math.abs(g));
  if (gap < THRESHOLDS.GAP_NOISE_BELOW) {
    return { classification: "inside_noise", gap, sentence: `The projection gap (${pts(gap)}) is inside normal projection variance.` };
  }
  const a = cap1(article(gap));
  if (gap < THRESHOLDS.GAP_LARGE_AT) {
    return { classification: "real_edge", gap, sentence: `${a} ${gap}-point projection gap is outside normal projection variance: a real edge on paper.` };
  }
  return { classification: "large_edge", gap, sentence: `${a} ${gap}-point projection gap is a large edge on paper.` };
}

// Order is the preference order for the "change since last week" figure.
const METRICS = [
  { key: "snap_share", label: "snap share", mad: THRESHOLDS.SNAP_SHARE_MAD_VOLATILE, share: true },
  { key: "targets", label: "targets", mad: THRESHOLDS.VOLUME_MAD_VOLATILE },
  { key: "carries", label: "carries", mad: THRESHOLDS.VOLUME_MAD_VOLATILE },
];

function metricValue(row, key) {
  let v = toNumber(row[key]);
  if (v === null && key === "snap_share") v = toNumber(row.offense_pct);
  if (v === null || v < 0) return null;
  if (key === "snap_share") {
    // Ambiguity: exactly 1 could be 100% or 1%. Values <= 1 are treated as a fraction (nflverse
    // snap files and the table's snap_share are fractions); only values above 1 are read as percent.
    if (v > 1 && v <= 100) v /= 100;
    if (v > 1) return null;
  }
  return v;
}

/** A game was played unless flagged otherwise or the row is all zero/empty (bye, inactive, DNP). */
function playedGame(row) {
  if (!row || typeof row !== "object") return false;
  if (row.played === false || row.bye === true || row.did_not_play === true) return false;
  const share = metricValue(row, "snap_share");
  const snaps = toNumber(row.snaps);
  const touches = ["targets", "carries", "receptions"].map((k) => toNumber(row[k]));
  return (share !== null && share > 0) || (snaps !== null && snaps > 0) || touches.some((t) => t !== null && t > 0);
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const meanAbsDev = (xs) => {
  const m = mean(xs);
  return mean(xs.map((x) => Math.abs(x - m)));
};

/**
 * Is a player's recent role steady? `weeklyRows`: rows with `week` and any of snap_share (0-1,
 * 0-100, or offense_pct), targets, carries, snaps. A row with `injury_shortened: true` is left out
 * of the statistics (an early exit is not a role change); bye weeks, missing weeks and all-zero rows
 * are not games and are left out too. Uses the last WINDOW_GAMES counted games.
 */
function usageStability(weeklyRows, { name = null } = {}) {
  const rows = (Array.isArray(weeklyRows) ? weeklyRows : [])
    .filter((r) => r && typeof r === "object" && Number.isInteger(toNumber(r.week)))
    .map((r) => ({ ...r, week: toNumber(r.week) }));
  const byWeek = new Map(rows.map((r) => [r.week, r])); // one row per week; the last one given wins
  const played = [...byWeek.values()].filter(playedGame).sort((a, b) => a.week - b.week);
  const counted = played.filter((r) => r.injury_shortened !== true).slice(-THRESHOLDS.WINDOW_GAMES);
  // Only injury-shortened games inside the window (from its first counted week on) are reported.
  const windowStart = counted.length ? counted[0].week : -Infinity;
  const excluded = played.filter((r) => r.injury_shortened === true && r.week >= windowStart).length;
  const who = name ? `${name}'s` : "his";

  const metrics = [];
  for (const m of METRICS) {
    const series = counted.map((r) => ({ week: r.week, v: metricValue(r, m.key) })).filter((p) => p.v !== null);
    if (series.length < THRESHOLDS.MIN_GAMES) continue;
    const values = series.map((p) => p.v);
    const dev = meanAbsDev(values);
    metrics.push({
      metric: m.key, label: m.label, share: !!m.share, games: series.length, mean: mean(values), mad: dev,
      min: Math.min(...values), max: Math.max(...values),
      volatile: Number(dev.toFixed(6)) >= m.mad, // rounded so 0.5/0.7 alternating (MAD 0.1) is not lost to float error
      series,
    });
  }

  if (!metrics.length) {
    const n = counted.length;
    const need = THRESHOLDS.MIN_GAMES;
    let sentence;
    if (!n) {
      sentence = excluded
        ? `No full games of usage on record (only injury-shortened ones), so Omen cannot call ${who} role stable or volatile.`
        : "No usage history on record, so Omen cannot call this role stable or volatile.";
    } else if (n < need) {
      sentence = `Only ${n} ${n === 1 ? "game" : "games"} of usage on record (${need} needed), too few to call ${who} role stable or volatile.`;
    } else {
      sentence = `${n} games are on record, but fewer than ${need} have snap share, targets or carries, so Omen cannot call ${who} role stable or volatile.`;
    }
    return { stability: "insufficient_data", games: n, change_since_last_week: null, metrics: [], excluded_injury_games: excluded, sentence };
  }

  const lead = metrics.find((m) => m.volatile) || metrics[0];
  const stability = metrics.some((m) => m.volatile) ? "volatile" : "stable";
  const last2 = lead.series.slice(-2);
  const change = last2.length === 2
    ? { metric: lead.metric, from: last2[0].v, to: last2[1].v, delta: last2[1].v - last2[0].v, from_week: last2[0].week, to_week: last2[1].week }
    : null;

  const show = (m, v) => (m.share ? pct(v) : String(fmt(v)));
  const span = `over the last ${lead.games} games`;
  const swing = lead.share ? `${Math.round(lead.mad * 100)} points` : `${fmt(lead.mad)}`;
  const range = lead.min === lead.max
    ? `held at ${show(lead, lead.min)}`
    : `held between ${show(lead, lead.min)} and ${show(lead, lead.max)}`;
  let sentence = stability === "volatile"
    ? `${cap1(lead.label)} swung by about ${swing} a game ${span} (from ${show(lead, lead.min)} to ${show(lead, lead.max)}), so ${who} recent usage is uneven.`
    : `${cap1(lead.label)} ${range} ${span}, so ${who} recent usage is steady.`;
  if (excluded) sentence += ` ${excluded} injury-shortened ${excluded === 1 ? "game was" : "games were"} left out.`;
  return { stability, games: counted.length, change_since_last_week: change, metrics, excluded_injury_games: excluded, sentence };
}

/**
 * At most 2 statements, each tagged with the evidence it came from. Gap first (projection), then
 * usage (observed_context). A statement is omitted when its input is missing; usage with too little
 * history says so rather than guessing.
 */
function signalNoiseSummary({ gapPts, usageRows, name = null } = {}) {
  const statements = [];
  const gap = gapNoise(gapPts);
  if (gap.sentence) statements.push({ source: "gap", kind: KIND.PROJECTION, classification: gap.classification, text: gap.sentence });
  const usage = Array.isArray(usageRows) ? usageStability(usageRows, { name }) : null;
  if (usage) {
    statements.push({ source: "usage", kind: KIND.OBSERVED, classification: usage.stability, text: usage.sentence, change_since_last_week: usage.change_since_last_week });
  }
  return { statements: statements.slice(0, 2), gap, usage };
}

module.exports = { THRESHOLDS, KIND, gapNoise, usageStability, signalNoiseSummary };
