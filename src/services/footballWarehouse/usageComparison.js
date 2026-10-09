"use strict";

// Legacy weekly rows intentionally expose only these signal/noise inputs. Richer
// warehouse facts are compared through the shared summary fields instead.
const WEEK_FIELDS = Object.freeze(["targets", "carries", "snap_share"]);
const SUMMARY_FIELDS = Object.freeze([
  "games", "targets_per_game", "receptions_per_game", "carries_per_game",
  "attempts_per_game", "target_share", "snap_share",
]);
const FLOAT_TOLERANCE = 1e-6;

function map(value, name) {
  if (!(value instanceof Map)) throw new TypeError(`${name} must be a Map`);
  return value;
}

function number(value) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function equalValue(left, right) {
  const a = number(left);
  const b = number(right);
  if (a == null || b == null) return a === b;
  return Math.abs(a - b) <= FLOAT_TOLERANCE;
}

function rowsByWeek(rows) {
  const out = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const week = Number(row?.week);
    if (Number.isInteger(week)) out.set(week, row);
  }
  return out;
}

/**
 * Compare only the public football-fact shape shared by both readers. The result is deliberately
 * aggregate-only: it cannot reveal a provider key, GSIS id, player name, or either source payload.
 */
function compareUsageBundles(legacy, warehouse) {
  const legacyUsage = map(legacy?.usage, "legacy.usage");
  const legacyWeekly = map(legacy?.weekly, "legacy.weekly");
  const warehouseUsage = map(warehouse?.usage, "warehouse.usage");
  const warehouseWeekly = map(warehouse?.weekly, "warehouse.weekly");
  const keys = new Set([
    ...legacyUsage.keys(), ...legacyWeekly.keys(),
    ...warehouseUsage.keys(), ...warehouseWeekly.keys(),
  ]);

  const result = {
    outcome: "match",
    compared_players: keys.size,
    compared_weeks: 0,
    missing_legacy_players: 0,
    missing_warehouse_players: 0,
    missing_legacy_weeks: 0,
    missing_warehouse_weeks: 0,
    mismatched_fields: 0,
  };

  for (const key of keys) {
    const legacyPresent = legacyUsage.has(key) || legacyWeekly.has(key);
    const warehousePresent = warehouseUsage.has(key) || warehouseWeekly.has(key);
    if (!legacyPresent) result.missing_legacy_players += 1;
    if (!warehousePresent) result.missing_warehouse_players += 1;

    const leftSummary = legacyUsage.get(key);
    const rightSummary = warehouseUsage.get(key);
    if (leftSummary && rightSummary) {
      for (const field of SUMMARY_FIELDS) {
        if (!equalValue(leftSummary[field], rightSummary[field])) result.mismatched_fields += 1;
      }
    }

    const leftWeeks = rowsByWeek(legacyWeekly.get(key));
    const rightWeeks = rowsByWeek(warehouseWeekly.get(key));
    const weeks = new Set([...leftWeeks.keys(), ...rightWeeks.keys()]);
    result.compared_weeks += weeks.size;
    for (const week of weeks) {
      if (!leftWeeks.has(week)) result.missing_legacy_weeks += 1;
      else if (!rightWeeks.has(week)) result.missing_warehouse_weeks += 1;
      else for (const field of WEEK_FIELDS) {
        if (!equalValue(leftWeeks.get(week)[field], rightWeeks.get(week)[field])) result.mismatched_fields += 1;
      }
    }
  }

  if (result.missing_legacy_players || result.missing_warehouse_players
    || result.missing_legacy_weeks || result.missing_warehouse_weeks || result.mismatched_fields) {
    result.outcome = "mismatch";
  }
  return Object.freeze(result);
}

module.exports = { compareUsageBundles };
