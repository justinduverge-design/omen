"use strict";

// Sight v1: Omen's weekly read of each skill player. Pure math (no database, no clock).
//
// For a season and a through-week it takes season-to-date components (RAT-RB/WR/TE's raw components),
// shrinks and z-scores them within the week's cohort, adds production (points per game to date, z-scored),
// and applies the weights fitted for THIS season, position and phase (sight-weights.v1.json: learned from
// the five seasons before it). The result is an expected PPR total for next week ("sight_points") and a
// 0-100 grade within the position. Each input's contribution (weight x value) is kept, so the read always
// shows why.

const WEIGHTS = require("./sight-weights.v1.json");
const { SPECS } = require("./ratSkillMetric");

const VERSION = "v1";
const MIN_COHORT = 8;

const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
const sd = (v) => { const m = mean(v); return Math.sqrt(mean(v.map((x) => (x - m) ** 2))); };
const r4 = (x) => Math.round(x * 1e4) / 1e4;

function phaseOf(week) {
  if (week <= 5) return "early";
  if (week <= 9) return "pre_deadline";
  return "post_deadline";
}

/** Weights for (season, position, phase): that season's era fit, else the latest earlier one. */
function weightsFor(season, position, phase) {
  const seasons = Object.keys(WEIGHTS.weights).map(Number).filter((s) => s <= season).sort((a, b) => b - a);
  for (const s of seasons) {
    const w = WEIGHTS.weights[s]?.[position]?.[phase]?.with_production;
    if (w) return { ...w, season: s, fitted_on: WEIGHTS.weights[s][position][phase].fitted_on };
  }
  return null;
}

function qualifies(position, agg, week) {
  if (position === "RB") return agg.carries >= Math.max(10, Math.round(40 * week / 17));
  if (position === "WR") return agg.targets >= Math.max(8, Math.round(25 * week / 17));
  return agg.targets >= Math.max(6, Math.round(20 * week / 17));
}

/**
 * @param {Map} aggregates aggregateSkillPlays output for weeks <= week
 * @param {Map} positions omen player id -> { position }
 * @param {Map} ppgToDate omen player id -> points per game through week (games played only)
 */
function computeSight({ season, week, aggregates, positions, ppgToDate }) {
  const phase = phaseOf(week);
  const values = [];
  const summary = { phase, version: VERSION, positions: {} };
  for (const position of Object.keys(SPECS)) {
    const spec = SPECS[position];
    const w = weightsFor(season, position, phase);
    const ids = [...aggregates.keys()].filter((id) => positions.get(id)?.position === position && qualifies(position, aggregates.get(id), week)).sort();
    if (!w || ids.length < MIN_COHORT) { summary.positions[position] = { graded: 0, reason: w ? "cohort_too_small" : "no_weights" }; continue; }
    const raws = ids.map((id) => spec.raw(aggregates.get(id)));
    const features = {};
    for (const c of spec.components) {
      const totalN = raws.reduce((s, r) => s + r[c.key].n, 0);
      const prior = totalN > 0 ? raws.reduce((s, r) => s + r[c.key].sum, 0) / totalN : 0;
      const shrunk = raws.map((r) => (r[c.key].raw == null || r[c.key].n === 0 ? prior : (r[c.key].n * r[c.key].raw + c.shrinkK * prior) / (r[c.key].n + c.shrinkK)));
      const m = mean(shrunk); const s = sd(shrunk);
      features[c.key] = shrunk.map((v) => (s > 1e-9 ? c.sign * (v - m) / s : 0));
    }
    const ppg = ids.map((id) => ppgToDate.get(id) ?? 0);
    const pm = mean(ppg); const ps = sd(ppg);
    features.production_ppg = ppg.map((v) => (ps > 1e-9 ? (v - pm) / ps : 0));

    const points = ids.map((_, i) => w.intercept + Object.entries(w.weights).reduce((s, [k, b]) => s + b * (features[k]?.[i] ?? 0), 0));
    const m = mean(points); const s = sd(points);
    ids.forEach((id, i) => {
      const contributions = Object.fromEntries(Object.entries(w.weights).map(([k, b]) => [k, { weight: b, z: r4(features[k][i]), points: r4(b * features[k][i]) }]));
      values.push({
        entityType: "player",
        entityId: id,
        value: r4(points[i]),
        components: {
          metric: "SIGHT", version: VERSION, position, phase,
          grade: r4(Math.min(100, Math.max(0, 50 + 10 * (s > 1e-9 ? (points[i] - m) / s : 0)))),
          sight_points: r4(points[i]),
          production_ppg: r4(ppg[i]),
          intercept: w.intercept,
          weights_season: w.season,
          weights_fitted_on: w.fitted_on,
          contributions,
        },
      });
    });
    summary.positions[position] = { graded: ids.length, weights_season: w.season };
  }
  return { values, summary: { ...summary, outcome: values.length ? "graded" : "no_qualified_entities" } };
}

module.exports = { VERSION, computeSight, phaseOf, weightsFor };
