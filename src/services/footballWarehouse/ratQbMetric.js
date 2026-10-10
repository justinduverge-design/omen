"use strict";

// RAT-QB v0 (stored as metric_name "omen_qb_grade", formula_version "v0").
// Pure math only: no database access, no clock. The spec is
// Blueprints/specs/football-data/omen-rat-qb-v0.md; keep the two in step.
//
// v0 is UNFITTED and has NO opponent adjustment: weights are equal and fixed,
// shrinkage constants are documented judgment values, not fitted values.

const METRIC_NAME = "omen_qb_grade";
const FORMULA_VERSION = "v0";
const REGISTRY_ID = "RAT-QB";

const QUALIFICATION_MIN_DROPBACKS = 100;
// A grade is a ranking against a cohort. Below this many qualified QBs the
// scale (mean and standard deviation) is meaningless, so nothing is stored.
const MIN_QUALIFIED_COHORT = 8;
const GRADE_CENTER = 50;
const GRADE_POINTS_PER_SD = 10;

// Components, in fixed order. `sign` +1 means higher raw is better. `weight`
// is unfitted (equal). `shrinkK` is the pseudo-observation count pulling the
// component toward the qualified-cohort pooled mean: shrunk = (n*x + k*mu)/(n + k).
const COMPONENTS = Object.freeze([
  Object.freeze({ key: "epa_per_dropback", sign: 1, weight: 0.2, shrinkK: 150, unit: "dropbacks" }),
  Object.freeze({ key: "cpoe", sign: 1, weight: 0.2, shrinkK: 250, unit: "pass attempts with cpoe" }),
  Object.freeze({ key: "sack_avoidance_rate", sign: 1, weight: 0.2, shrinkK: 300, unit: "dropbacks" }),
  Object.freeze({ key: "turnover_rate", sign: -1, weight: 0.2, shrinkK: 500, unit: "dropbacks" }),
  Object.freeze({ key: "rush_epa", sign: 1, weight: 0.2, shrinkK: 100, unit: "designed QB rushes" }),
]);

const ROUND_DIGITS = 6;
const SD_EPSILON = 1e-9; // a standard deviation below this is floating-point noise, not spread

function round(value) {
  const factor = 10 ** ROUND_DIGITS;
  return Math.round(value * factor) / factor;
}

function isFlag(value) {
  if (value === true) return true;
  if (value == null || value === "" || value === false) return false;
  return Number(value) === 1;
}

function finiteOrNull(value) {
  if (value == null || value === "" || value === "NA") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function emptyAggregate() {
  return {
    dropbacks: 0, epaSum: 0, sacks: 0, cpoeSum: 0, cpoeN: 0,
    interceptions: 0, fumblesLost: 0, rushes: 0, rushEpaSum: 0,
  };
}

// plays: [{ passerId, rusherId, epa, cpoe, qbDropback, qbScramble, qbSpike,
//           qbKneel, sack, passAttempt, rushAttempt, interception,
//           fumbleLost, fumbledGsisId }]
// Flag fields are nflverse 0/1 values (strings or numbers).
// qbGsisById: Map or object, omen player id -> gsis id, for QBs only. Only these
// entities are aggregated; plays by anyone else are ignored.
function aggregateQbPlays(plays, qbGsisById) {
  const gsis = qbGsisById instanceof Map ? qbGsisById : new Map(Object.entries(qbGsisById || {}));
  const byQb = new Map();
  const get = (id) => {
    if (!byQb.has(id)) byQb.set(id, emptyAggregate());
    return byQb.get(id);
  };
  for (const play of plays) {
    if (isFlag(play.qbSpike) || isFlag(play.qbKneel)) continue;
    const epa = finiteOrNull(play.epa);
    if (epa == null) continue;
    if (isFlag(play.qbDropback)) {
      const id = play.passerId || (isFlag(play.qbScramble) ? play.rusherId : null);
      if (!id || !gsis.has(id)) continue;
      const agg = get(id);
      agg.dropbacks += 1;
      agg.epaSum += epa;
      if (isFlag(play.sack)) agg.sacks += 1;
      const cpoe = finiteOrNull(play.cpoe);
      if (isFlag(play.passAttempt) && cpoe != null) { agg.cpoeSum += cpoe; agg.cpoeN += 1; }
      if (isFlag(play.interception)) agg.interceptions += 1;
      const ownGsis = gsis.get(id);
      if (isFlag(play.fumbleLost) && ownGsis && play.fumbledGsisId === ownGsis) agg.fumblesLost += 1;
    } else if (play.rusherId && gsis.has(play.rusherId) && isFlag(play.rushAttempt) && !isFlag(play.qbScramble)) {
      const agg = get(play.rusherId);
      agg.rushes += 1;
      agg.rushEpaSum += epa;
    }
  }
  return byQb;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function populationSd(values) {
  const center = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - center) ** 2)));
}

function rawComponents(agg) {
  const db = agg.dropbacks;
  return {
    epa_per_dropback: { raw: agg.epaSum / db, n: db, sum: agg.epaSum },
    cpoe: { raw: agg.cpoeN > 0 ? agg.cpoeSum / agg.cpoeN : null, n: agg.cpoeN, sum: agg.cpoeSum },
    sack_avoidance_rate: { raw: 1 - agg.sacks / db, n: db, sum: db - agg.sacks },
    turnover_rate: { raw: (agg.interceptions + agg.fumblesLost) / db, n: db, sum: agg.interceptions + agg.fumblesLost },
    rush_epa: { raw: agg.rushes > 0 ? agg.rushEpaSum / agg.rushes : null, n: agg.rushes, sum: agg.rushEpaSum },
  };
}

// byQb: Map<entityId, aggregate> from aggregateQbPlays.
// Returns { values: [{ entityType, entityId, value, components }], summary }.
// Entities under the dropback minimum receive no value ("not enough snaps yet").
function computeQbGrades(byQb) {
  const ids = [...byQb.keys()].sort();
  const qualifiedIds = ids.filter((id) => byQb.get(id).dropbacks >= QUALIFICATION_MIN_DROPBACKS);
  const belowThreshold = ids.length - qualifiedIds.length;
  const baseSummary = {
    qualified_count: qualifiedIds.length,
    below_threshold_count: belowThreshold,
    qualification_min_dropbacks: QUALIFICATION_MIN_DROPBACKS,
    min_qualified_cohort: MIN_QUALIFIED_COHORT,
  };
  if (qualifiedIds.length < MIN_QUALIFIED_COHORT) {
    return {
      values: [],
      summary: { ...baseSummary, outcome: qualifiedIds.length === 0 ? "no_qualified_entities" : "cohort_too_small" },
    };
  }

  const raws = new Map(qualifiedIds.map((id) => [id, rawComponents(byQb.get(id))]));

  const shrunk = new Map(qualifiedIds.map((id) => [id, {}]));
  const cohort = {};
  for (const component of COMPONENTS) {
    const totalN = qualifiedIds.reduce((sum, id) => sum + raws.get(id)[component.key].n, 0);
    const totalSum = qualifiedIds.reduce((sum, id) => sum + raws.get(id)[component.key].sum, 0);
    const prior = totalN > 0 ? totalSum / totalN : 0;
    for (const id of qualifiedIds) {
      const { raw, n } = raws.get(id)[component.key];
      shrunk.get(id)[component.key] = raw == null || n === 0
        ? prior
        : (n * raw + component.shrinkK * prior) / (n + component.shrinkK);
    }
    const shrunkValues = qualifiedIds.map((id) => shrunk.get(id)[component.key]);
    const center = mean(shrunkValues);
    const sd = populationSd(shrunkValues);
    cohort[component.key] = { prior_mean: prior, shrunk_mean: center, shrunk_sd: sd };
  }

  const composite = new Map();
  const zScores = new Map();
  for (const id of qualifiedIds) {
    let total = 0;
    const z = {};
    for (const component of COMPONENTS) {
      const { shrunk_mean: center, shrunk_sd: sd } = cohort[component.key];
      z[component.key] = sd > SD_EPSILON ? (shrunk.get(id)[component.key] - center) / sd : 0;
      total += component.weight * component.sign * z[component.key];
    }
    composite.set(id, total);
    zScores.set(id, z);
  }
  const compositeValues = qualifiedIds.map((id) => composite.get(id));
  const compositeMean = mean(compositeValues);
  const compositeSd = populationSd(compositeValues);

  const values = qualifiedIds.map((id) => {
    const rawGrade = compositeSd > SD_EPSILON
      ? GRADE_CENTER + GRADE_POINTS_PER_SD * (composite.get(id) - compositeMean) / compositeSd
      : GRADE_CENTER;
    const clamped = Math.min(100, Math.max(0, rawGrade));
    const agg = byQb.get(id);
    const perComponent = {};
    for (const component of COMPONENTS) {
      const entry = raws.get(id)[component.key];
      perComponent[component.key] = {
        raw: entry.raw == null ? null : round(entry.raw),
        shrunk: round(shrunk.get(id)[component.key]),
        z: round(zScores.get(id)[component.key]),
        n: entry.n,
        sign: component.sign,
        weight: component.weight,
      };
    }
    return {
      entityType: "player",
      entityId: id,
      value: round(clamped),
      components: {
        metric: REGISTRY_ID,
        formula_version: FORMULA_VERSION,
        fitted: false,
        opponent_adjusted: false,
        dropbacks: agg.dropbacks,
        sacks: agg.sacks,
        interceptions: agg.interceptions,
        fumbles_lost: agg.fumblesLost,
        designed_rushes: agg.rushes,
        pass_attempts_with_cpoe: agg.cpoeN,
        composite_z: round(composite.get(id)),
        unclamped_grade: round(rawGrade),
        components: perComponent,
      },
    };
  });

  return {
    values,
    summary: {
      ...baseSummary,
      outcome: "graded",
      composite_mean: round(compositeMean),
      composite_sd: round(compositeSd),
      cohort: Object.fromEntries(Object.entries(cohort).map(([key, stats]) => [key, {
        prior_mean: round(stats.prior_mean), shrunk_mean: round(stats.shrunk_mean), shrunk_sd: round(stats.shrunk_sd),
      }])),
    },
  };
}

function metricConstants() {
  return {
    registry_id: REGISTRY_ID,
    fitted: false,
    opponent_adjusted: false,
    qualification_min_dropbacks: QUALIFICATION_MIN_DROPBACKS,
    min_qualified_cohort: MIN_QUALIFIED_COHORT,
    grade_center: GRADE_CENTER,
    grade_points_per_sd: GRADE_POINTS_PER_SD,
    components: COMPONENTS.map(({ key, sign, weight, shrinkK }) => ({ key, sign, weight, shrink_k: shrinkK })),
  };
}

module.exports = {
  METRIC_NAME, FORMULA_VERSION, REGISTRY_ID, QUALIFICATION_MIN_DROPBACKS, MIN_QUALIFIED_COHORT,
  COMPONENTS, aggregateQbPlays, computeQbGrades, metricConstants,
};
