"use strict";

/**
 * A6 ← A7B seam: map the owned pipeline's fact rows onto the canonical event vocabulary
 * the Scoring Contract prices.
 *
 * A6's engine has been complete and unusable for one reason: the Tuesday source publishes
 * aggregate fantasy points, not the per-event facts a contract needs. The A7B pipeline
 * already collects those facts — this is the adapter between the two names for the same
 * thing, and nothing more.
 *
 * **A7B is not modified by this file.** It reads A7B's published row shape
 * (`PLAYER_REQUIRED_COLUMNS` / `TEAM_REQUIRED_COLUMNS` in
 * `src/services/footballData/scoringAcceptance.js`) and emits A6's `EVENT_KEYS`. The
 * dependency points one way, from A6 to A7B's output, so A7B's own gates are untouched.
 *
 * Three rules govern every mapping here, and all three exist because the alternative is a
 * confident wrong number:
 *
 *   1. **A missing input is absent, never zero.** `reconcileMoveScoring` refuses to grade a
 *      contract whose priced rules have no facts, and names them. That refusal is the
 *      safety property; defaulting to 0 would silently defeat it.
 *   2. **A summed fact is unknown if ANY component is unknown.** Fumbles lost is the sum of
 *      three columns. Two of three is not a fumble count — it is a smaller wrong number
 *      that looks entirely plausible.
 *   3. **A canonical key A7B cannot supply is simply not emitted.** It is not guessed at,
 *      and it is not zeroed. The contract engine then reports `unsupported` and names it.
 */

const { EVENT_KEYS } = require("./scoringContract");

/** One A7B column → one canonical key. */
const DIRECT = Object.freeze({
  passing_yards: "passing_yards",
  passing_tds: "passing_touchdowns",
  passing_interceptions: "passing_interceptions",
  rushing_yards: "rushing_yards",
  rushing_tds: "rushing_touchdowns",
  receptions: "receiving_receptions",
  receiving_yards: "receiving_yards",
  receiving_tds: "receiving_touchdowns",
  special_teams_tds: "return_touchdowns",
  pat_made: "extra_points_made",
  pat_missed: "extra_points_missed",
  fg_made: "field_goals_made",
  fg_missed: "field_goals_missed",
  fg_made_40_49: "field_goals_made_40_49",
});

/**
 * Canonical keys that are the sum of several A7B columns. Unknown if any part is unknown —
 * see rule 2. The banded field goals collapse here because A7B publishes six distance bands
 * and the canonical vocabulary has three.
 */
const SUMMED = Object.freeze({
  fumbles_lost: ["sack_fumbles_lost", "rushing_fumbles_lost", "receiving_fumbles_lost"],
  two_point_conversions: ["passing_2pt_conversions", "rushing_2pt_conversions", "receiving_2pt_conversions"],
  field_goals_made_0_39: ["fg_made_0_19", "fg_made_20_29", "fg_made_30_39"],
  field_goals_made_50_plus: ["fg_made_50_59", "fg_made_60_"],
});

/** Team-defence rows use their own column names. */
const TEAM_DIRECT = Object.freeze({
  def_sacks: "defense_sacks",
  def_interceptions: "defense_interceptions",
  fumble_recovery_opp: "defense_fumble_recoveries",
  def_tds: "defense_touchdowns",
  def_safeties: "defense_safeties",
  special_teams_tds: "defense_return_touchdowns",
});

const TEAM_SUMMED = Object.freeze({
  defense_blocks: ["def_punt_blocks", "def_pat_blocks", "def_fg_blocks"],
});

/**
 * Canonical keys the owned pipeline cannot currently supply, with the reason. Named rather
 * than silently missing, so a league scoring any of them lands on an honest `unsupported`
 * with the gap identified instead of a plausible number.
 */
const UNAVAILABLE = Object.freeze({
  defense_points_allowed: "A7B publishes team rows without an opponent score; derivable from the schedule's home/away scores, not yet wired.",
  defense_yards_allowed: "Not collected by A7B's current team row.",
  idp_solo_tackles: "Individual defensive player facts are not collected by A7B.",
  idp_assisted_tackles: "Individual defensive player facts are not collected by A7B.",
  idp_tackles_for_loss: "Individual defensive player facts are not collected by A7B.",
  idp_sacks: "Individual defensive player facts are not collected by A7B.",
  idp_interceptions: "Individual defensive player facts are not collected by A7B.",
  idp_passes_defended: "Individual defensive player facts are not collected by A7B.",
  idp_forced_fumbles: "Individual defensive player facts are not collected by A7B.",
  idp_fumble_recoveries: "Individual defensive player facts are not collected by A7B.",
  idp_defensive_touchdowns: "Individual defensive player facts are not collected by A7B.",
  idp_safeties: "Individual defensive player facts are not collected by A7B.",
});

/**
 * null/undefined/"" mean "not reported". `Number(null)` is 0 and 0 is finite, so a bare
 * `Number.isFinite` guard would turn every absent column into a real zero — the exact trap
 * this codebase has now been bitten by three times.
 */
function reported(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sumOrUnknown(row, columns) {
  let total = 0;
  for (const column of columns) {
    const value = reported(row?.[column]);
    if (value == null) return null;
    total += value;
  }
  return total;
}

/**
 * @param {object} row an A7B player fact row
 * @param {object|null} teamRow the matching A7B team row, for a DST
 * @returns {{facts: object, missing: string[], unavailable: string[]}}
 *   `facts` carries only genuinely reported values. `missing` names canonical keys A7B
 *   *can* supply that this row did not. `unavailable` names keys A7B cannot supply at all.
 */
function canonicalFactsFromFootballData(row = {}, teamRow = null) {
  const facts = {};
  const missing = [];

  for (const [column, canonical] of Object.entries(DIRECT)) {
    const value = reported(row[column]);
    if (value == null) missing.push(canonical);
    else facts[canonical] = value;
  }

  for (const [canonical, columns] of Object.entries(SUMMED)) {
    const value = sumOrUnknown(row, columns);
    if (value == null) missing.push(canonical);
    else facts[canonical] = value;
  }

  if (teamRow) {
    for (const [column, canonical] of Object.entries(TEAM_DIRECT)) {
      const value = reported(teamRow[column]);
      if (value == null) missing.push(canonical);
      else facts[canonical] = value;
    }
    for (const [canonical, columns] of Object.entries(TEAM_SUMMED)) {
      const value = sumOrUnknown(teamRow, columns);
      if (value == null) missing.push(canonical);
      else facts[canonical] = value;
    }
  }

  return {
    facts,
    missing: [...new Set(missing)].sort(),
    unavailable: Object.keys(UNAVAILABLE).sort(),
  };
}

/** Which canonical events the owned pipeline can and cannot supply. Derived, not asserted. */
function coverageSummary() {
  const supplied = new Set([
    ...Object.values(DIRECT),
    ...Object.keys(SUMMED),
    ...Object.values(TEAM_DIRECT),
    ...Object.keys(TEAM_SUMMED),
  ]);
  const all = [...EVENT_KEYS].sort();
  return {
    supplied: all.filter((key) => supplied.has(key)),
    unavailable: all.filter((key) => !supplied.has(key)),
    total: all.length,
  };
}

module.exports = {
  DIRECT,
  SUMMED,
  TEAM_DIRECT,
  TEAM_SUMMED,
  UNAVAILABLE,
  canonicalFactsFromFootballData,
  coverageSummary,
  reported,
};
