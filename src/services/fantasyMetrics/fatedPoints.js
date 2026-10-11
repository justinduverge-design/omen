"use strict";

/**
 * Fated Points (registry FND-01..FND-04): what a player's targets and carries are usually worth, from
 * how and where they happened, against what he actually scored.
 *
 * Spec: Blueprints/specs/football-data/omen-fantasy-metrics-v1.md §3. Registry:
 * Blueprints/specs/football-data/omen-stat-registry-v1.md. Beta slice for the 2026-10-13 beta.
 *
 * Source: nflverse play-by-play (CC BY 4.0, attribution "nflverse"). Targets use nflverse's own
 * completion probability (`cp`) and expected yards after catch (`xyac_mean_yardage`). TDs, rushing
 * yards and fumbles use the versioned lookup tables in xfp-tables-v1.json, built from earlier seasons
 * only by scripts/build-xfp-tables.js.
 *
 * Descriptive, not predictive: these numbers say what a player's usage was worth, not what he will
 * score. Pure functions; I/O lives in fantasyMetricsData.js.
 */

const FORMULA_VERSION = "xfp-v1";

// Columns read from play-by-play. Every one is confirmed in the 2026 file.
const PBP_COLUMNS = Object.freeze([
  "season", "week", "season_type", "game_id", "play_id", "posteam", "play_type",
  "two_point_attempt", "qb_kneel", "qb_spike", "qb_scramble",
  "receiver_player_id", "rusher_player_id", "td_player_id", "fumbled_1_player_id",
  "yardline_100", "down", "ydstogo", "goal_to_go", "air_yards", "cp", "xyac_mean_yardage",
  "complete_pass", "touchdown", "fumble_lost", "receiving_yards", "rushing_yards",
]);

const MIN_BUCKET_PLAYS = 200;

function num(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (text === "" || text === "NA") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

const flag = (value) => String(value || "").trim() === "1";

function yardlineBucket(y) {
  if (y <= 2) return "1-2";
  if (y <= 5) return "3-5";
  if (y <= 10) return "6-10";
  if (y <= 20) return "11-20";
  if (y <= 40) return "21-40";
  if (y <= 60) return "41-60";
  if (y <= 80) return "61-80";
  return "81-99";
}

function airBucket(air) {
  if (air == null) return "na";
  if (air <= 0) return "le0";
  if (air <= 9) return "1-9";
  if (air <= 19) return "10-19";
  return "20+";
}

function togoBucket(t) {
  if (t == null) return "na";
  if (t <= 2) return "1-2";
  if (t <= 6) return "3-6";
  if (t <= 10) return "7-10";
  return "11+";
}

/**
 * The lookup keys for a play, finest first. The table lookup uses the finest key whose bucket was
 * trained on at least MIN_BUCKET_PLAYS plays.
 */
function targetKeys(p) {
  const y = yardlineBucket(p.yardline);
  return [`t|${y}|${airBucket(p.air)}`, `t|${y}`, "t"];
}

function carryKeys(p) {
  const kind = p.scramble ? "s" : "r";
  const y = yardlineBucket(p.yardline);
  return [
    `${kind}|${y}|${p.down || "na"}|${togoBucket(p.togo)}|${p.goalToGo ? "g" : "n"}`,
    `${kind}|${y}|${p.goalToGo ? "g" : "n"}`,
    `${kind}|${y}`,
    kind,
  ];
}

/**
 * One compact play, or null when the play is not a counted target or carry: regular and post season
 * only; two-point tries, kneels, spikes and no-plays excluded (Codex Batch C uses the same exclusions
 * for the opportunity table).
 */
function compactPlay(row) {
  if (row.season_type !== "REG" && row.season_type !== "POST") return null;
  if (flag(row.two_point_attempt) || flag(row.qb_kneel) || flag(row.qb_spike)) return null;
  const yardline = num(row.yardline_100);
  if (yardline == null) return null;
  let type = null;
  let player = null;
  if (row.play_type === "pass" && row.receiver_player_id) { type = "target"; player = row.receiver_player_id; }
  else if (row.play_type === "run" && row.rusher_player_id) { type = "carry"; player = row.rusher_player_id; }
  if (!type) return null;
  const td = flag(row.touchdown) && row.td_player_id === player;
  const fumbleLost = flag(row.fumble_lost) && row.fumbled_1_player_id === player;
  return {
    season: num(row.season),
    week: num(row.week),
    seasonType: row.season_type,
    team: row.posteam || null,
    type,
    player,
    yardline,
    down: num(row.down),
    togo: num(row.ydstogo),
    goalToGo: flag(row.goal_to_go),
    scramble: flag(row.qb_scramble),
    air: num(row.air_yards),
    cp: num(row.cp),
    xyac: num(row.xyac_mean_yardage),
    complete: flag(row.complete_pass),
    yards: type === "target" ? (num(row.receiving_yards) || 0) : (num(row.rushing_yards) || 0),
    td,
    fumbleLost,
  };
}

function lookup(table, keys, field) {
  for (const key of keys) {
    const bucket = table.buckets[key];
    if (bucket && bucket.n >= MIN_BUCKET_PLAYS && Number.isFinite(bucket[field])) return bucket[field];
  }
  return null;
}

/**
 * Expected and actual facts for one play, in scoring-contract event keys
 * (src/services/scoringContract.js EVENT_KEYS).
 */
function playFacts(p, tables) {
  if (p.type === "target") {
    const keys = targetKeys(p);
    const useModel = p.cp != null && p.air != null && p.xyac != null;
    const expRec = useModel ? p.cp : lookup(tables, keys, "catch");
    const expYards = useModel ? p.cp * (p.air + p.xyac) : lookup(tables, keys, "yards");
    const expTd = lookup(tables, keys, "td");
    const expFumble = (lookup(tables, keys, "fumble_per_catch") || 0) * (expRec || 0);
    return {
      fallback: !useModel,
      expected: {
        receiving_receptions: expRec || 0,
        receiving_yards: expYards || 0,
        receiving_touchdowns: expTd || 0,
        fumbles_lost: expFumble,
      },
      actual: {
        receiving_receptions: p.complete ? 1 : 0,
        receiving_yards: p.yards,
        receiving_touchdowns: p.td ? 1 : 0,
        fumbles_lost: p.fumbleLost ? 1 : 0,
      },
    };
  }
  const keys = carryKeys(p);
  return {
    fallback: false,
    expected: {
      rushing_yards: lookup(tables, keys, "yards") || 0,
      rushing_touchdowns: lookup(tables, keys, "td") || 0,
      fumbles_lost: lookup(tables, keys, "fumble") || 0,
    },
    actual: {
      rushing_yards: p.yards,
      rushing_touchdowns: p.td ? 1 : 0,
      fumbles_lost: p.fumbleLost ? 1 : 0,
    },
  };
}

function addInto(target, source) {
  for (const [key, value] of Object.entries(source)) target[key] = (target[key] || 0) + value;
}

/**
 * Player-week rollups: `${gsis}|${week}` -> { player, week, team, targets, carries, expected, actual,
 * fallbackPlays, opportunity }. Regular season only (fantasy weeks).
 */
function rollupPlayerWeeks(plays, tables) {
  const out = new Map();
  for (const p of plays) {
    if (p.seasonType !== "REG") continue;
    const key = `${p.player}|${p.week}`;
    if (!out.has(key)) {
      out.set(key, {
        player: p.player, week: p.week, team: p.team, targets: 0, carries: 0,
        expected: {}, actual: {}, fallbackPlays: 0,
        opportunity: { rz_targets: 0, i10_targets: 0, ez_targets: 0, deep_targets: 0, rz_carries: 0, i10_carries: 0, gl_carries: 0 },
      });
    }
    const row = out.get(key);
    const facts = playFacts(p, tables);
    addInto(row.expected, facts.expected);
    addInto(row.actual, facts.actual);
    if (facts.fallback) row.fallbackPlays += 1;
    // Opportunity rules match nflverseFacts.buildOpportunity (and Codex Batch C).
    if (p.type === "target") {
      row.targets += 1;
      if (p.yardline <= 20) row.opportunity.rz_targets += 1;
      if (p.yardline <= 10) row.opportunity.i10_targets += 1;
      if (p.air != null && p.air >= p.yardline) row.opportunity.ez_targets += 1;
      if (p.air != null && p.air >= 20) row.opportunity.deep_targets += 1;
    } else {
      row.carries += 1;
      if (p.yardline <= 20) row.opportunity.rz_carries += 1;
      if (p.yardline <= 10) row.opportunity.i10_carries += 1;
      if (p.yardline <= 5) row.opportunity.gl_carries += 1;
    }
  }
  return out;
}

/**
 * Points for a fact line in a simple format: `rec` points per reception, 0.1 per yard, 6 per TD,
 * −2 per fumble lost. This is the reference scoring used until league scoring contracts reach the
 * start/sit route; the format label always travels with the number.
 */
function formatPoints(facts, rec = 1) {
  const f = (key) => facts[key] || 0;
  return rec * f("receiving_receptions")
    + 0.1 * (f("receiving_yards") + f("rushing_yards"))
    + 6 * (f("receiving_touchdowns") + f("rushing_touchdowns"))
    - 2 * f("fumbles_lost");
}

/**
 * Points per reception from the start/sit route's scoring-format label. An unknown label (ESPN and
 * Yahoo today) returns `verified: false`, and callers then show no points at all: PPR is never
 * presented as the league's own scoring (the A6 lesson in routes/startSitDetail.js).
 */
function formatFromLabel(label) {
  const text = String(label || "").toLowerCase();
  if (text.includes("standard")) return { rec: 0, label: "standard", verified: true };
  if (text.includes("0.5")) return { rec: 0.5, label: "half-PPR", verified: true };
  if (text.includes("1 point per reception") || text === "ppr") return { rec: 1, label: "PPR", verified: true };
  return { rec: 1, label: "PPR", verified: false };
}

module.exports = {
  FORMULA_VERSION,
  PBP_COLUMNS,
  MIN_BUCKET_PLAYS,
  num,
  yardlineBucket,
  airBucket,
  togoBucket,
  targetKeys,
  carryKeys,
  compactPlay,
  playFacts,
  rollupPlayerWeeks,
  formatPoints,
  formatFromLabel,
};
