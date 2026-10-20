"use strict";

// Sight's shared grading engine: turn per-player raw components into a 0-100 grade against a cohort.
// Pure math (no database, no clock), the same method RAT-QB v0 uses:
//   1. shrink each component toward the qualified cohort's pooled mean: (n*x + k*mu) / (n + k),
//      so a small sample cannot look elite or terrible on noise;
//   2. z-score each shrunk component within the cohort;
//   3. weighted sum of signed z-scores -> composite;
//   4. grade = 50 + 10 * (composite z), clamped to 0-100.
// Every component is returned (raw, shrunk, z, n, weight), so a grade always shows its eye test.

const GRADE_CENTER = 50;
const GRADE_POINTS_PER_SD = 10;
const SD_EPSILON = 1e-9;
const ROUND_DIGITS = 6;

const round = (value) => Math.round(value * 10 ** ROUND_DIGITS) / 10 ** ROUND_DIGITS;
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const populationSd = (values) => {
  const c = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - c) ** 2)));
};

/**
 * @param {Map<string, object>} aggregates entity id -> aggregate
 * @param {object} spec { registryId, formulaVersion, components: [{key, sign, weight, shrinkK}],
 *   raw(agg) -> {key: {raw, n, sum}}, qualifies(agg) -> boolean, minCohort, describe(agg) -> object }
 */
function gradeCohort(aggregates, spec) {
  const ids = [...aggregates.keys()].sort();
  const qualified = ids.filter((id) => spec.qualifies(aggregates.get(id)));
  const baseSummary = {
    qualified_count: qualified.length,
    below_threshold_count: ids.length - qualified.length,
    min_qualified_cohort: spec.minCohort,
  };
  if (qualified.length < spec.minCohort) {
    return {
      values: [],
      summary: { ...baseSummary, outcome: qualified.length === 0 ? "no_qualified_entities" : "cohort_too_small" },
    };
  }

  const raws = new Map(qualified.map((id) => [id, spec.raw(aggregates.get(id))]));
  const shrunk = new Map(qualified.map((id) => [id, {}]));
  const cohort = {};
  for (const component of spec.components) {
    const totalN = qualified.reduce((sum, id) => sum + raws.get(id)[component.key].n, 0);
    const totalSum = qualified.reduce((sum, id) => sum + raws.get(id)[component.key].sum, 0);
    const prior = totalN > 0 ? totalSum / totalN : 0;
    for (const id of qualified) {
      const { raw, n } = raws.get(id)[component.key];
      shrunk.get(id)[component.key] =
        raw == null || n === 0 ? prior : (n * raw + component.shrinkK * prior) / (n + component.shrinkK);
    }
    const values = qualified.map((id) => shrunk.get(id)[component.key]);
    cohort[component.key] = { prior_mean: prior, shrunk_mean: mean(values), shrunk_sd: populationSd(values) };
  }

  const composite = new Map();
  const zs = new Map();
  for (const id of qualified) {
    let total = 0;
    const z = {};
    for (const component of spec.components) {
      const { shrunk_mean: c, shrunk_sd: sd } = cohort[component.key];
      z[component.key] = sd > SD_EPSILON ? (shrunk.get(id)[component.key] - c) / sd : 0;
      total += component.weight * component.sign * z[component.key];
    }
    composite.set(id, total);
    zs.set(id, z);
  }
  const compositeValues = qualified.map((id) => composite.get(id));
  const compositeMean = mean(compositeValues);
  const compositeSd = populationSd(compositeValues);

  const values = qualified.map((id) => {
    const unclamped =
      compositeSd > SD_EPSILON
        ? GRADE_CENTER + (GRADE_POINTS_PER_SD * (composite.get(id) - compositeMean)) / compositeSd
        : GRADE_CENTER;
    const components = {};
    for (const component of spec.components) {
      const entry = raws.get(id)[component.key];
      components[component.key] = {
        raw: entry.raw == null ? null : round(entry.raw),
        shrunk: round(shrunk.get(id)[component.key]),
        z: round(zs.get(id)[component.key]),
        n: entry.n,
        sign: component.sign,
        weight: component.weight,
      };
    }
    return {
      entityType: "player",
      entityId: id,
      value: round(Math.min(100, Math.max(0, unclamped))),
      components: {
        metric: spec.registryId,
        formula_version: spec.formulaVersion,
        fitted: false,
        opponent_adjusted: false,
        ...spec.describe(aggregates.get(id)),
        composite_z: round(composite.get(id)),
        unclamped_grade: round(unclamped),
        components,
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
      cohort: Object.fromEntries(
        Object.entries(cohort).map(([k, s]) => [
          k,
          { prior_mean: round(s.prior_mean), shrunk_mean: round(s.shrunk_mean), shrunk_sd: round(s.shrunk_sd) },
        ]),
      ),
    },
  };
}

module.exports = { gradeCohort, GRADE_CENTER, GRADE_POINTS_PER_SD };
