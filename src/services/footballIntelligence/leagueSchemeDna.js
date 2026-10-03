"use strict";

/**
 * League-wide Scheme DNA: every offense, every season, from the same engine the Ben Johnson proof
 * runs on three cohorts (benJohnsonProof.js). Generalized here to all 32 teams.
 *
 * Input rows are FTN charting plays joined to the offense that ran them. FTN has no possession
 * team, so the join comes from nflverse play-by-play (`posteam`), which nflverse updates during
 * the season; the 2024-2025 participation files the proof used have no 2026 edition.
 *
 * Observed tendencies only (rates of motion, play-action, RPO, ...). Nothing here claims who called
 * a play or why a tendency moved.
 */

const { CONTRACTS, MODELS } = require("./contracts");
const { buildFeatureWindow } = require("./featureWindows");
const { computeSchemeDna } = require("./schemeDna");
const { METRICS } = require("./benJohnsonProof");

const QB_LOCATIONS = { U: "under_center", S: "shotgun", P: "pistol" };

/** FTN rows + play-by-play rows -> FTN rows carrying the offense, regular season only. */
function joinFtnToOffense({ ftnRows, pbpRows }) {
  const offense = new Map();
  for (const p of pbpRows) {
    if (p.season_type !== "REG" || !p.posteam) continue;
    offense.set(`${p.game_id}:${Number(p.play_id)}`, p.posteam);
  }
  const joined = [];
  let unmatched = 0;
  for (const f of ftnRows) {
    const team = offense.get(`${f.nflverse_game_id}:${Number(f.nflverse_play_id)}`);
    if (!team) { unmatched += 1; continue; }
    joined.push({ ...f, possession_team: team });
  }
  return { rows: joined, unmatched };
}

function parseValue(value, kind) {
  if (kind === "boolean") return value === "TRUE" ? true : value === "FALSE" ? false : undefined;
  if (kind === "qb_location") return QB_LOCATIONS[value];
  return /^-?\d+$/.test(String(value)) ? String(Number(value)) : undefined;
}

/** The proof's fact mapping, for any team. Plays with no valid QB location are not offense snaps. */
function mapLeagueRowsToFacts(rows, { artifactSha256 }) {
  const facts = [];
  for (const row of rows) {
    if (!QB_LOCATIONS[row.qb_location]) continue;
    const season = Number(row.season);
    const week = Number(row.week);
    for (const [column, metric, kind] of METRICS) {
      if (row[column] === "" || row[column] == null) continue;
      const value = parseValue(row[column], kind);
      if (value === undefined) continue;
      const sourceFamily = metric === "no_huddle" ? "play_by_play" : "ftn_charting";
      facts.push({
        contract_version: CONTRACTS.observedFact,
        fact_key: `${row.nflverse_game_id}:${row.nflverse_play_id}:${row.possession_team}:${metric}`,
        game_id: row.nflverse_game_id, play_id: String(row.nflverse_play_id), team_id: row.possession_team,
        subject_type: "team", subject_id: row.possession_team, season, week, metric, value,
        availability: "observed",
        source: {
          artifact_sha256: artifactSha256,
          row_key: `${row.nflverse_game_id}:${row.nflverse_play_id}`,
          source_family: sourceFamily,
          intended_use: sourceFamily === "play_by_play" ? "historical_replay" : "historical_calibration",
        },
        normalization_version: MODELS.normalization,
      });
    }
  }
  return facts;
}

/** Scheme DNA for every offense in `facts` for one season, through `throughWeek`. */
function buildLeagueDna({ facts, season, throughWeek = 22 }) {
  const teams = [...new Set(facts.filter((f) => f.season === season).map((f) => f.team_id))].sort();
  const byTeam = {};
  for (const team of teams) {
    const window = buildFeatureWindow({
      facts, subject: { type: "team", id: team },
      from: { season, week: 1 }, through: { season, week: throughWeek },
      windowId: `${team}-${season}`,
    });
    byTeam[team] = computeSchemeDna(window);
  }
  return byTeam;
}

/** For each scalar rate: the league average and each team's rank (1 = highest). */
function leagueRanks(dnaByTeam) {
  const rates = {};
  for (const [team, dna] of Object.entries(dnaByTeam)) {
    if (dna.status !== "available") continue;
    for (const [key, feature] of Object.entries(dna.features || {})) {
      if (feature?.kind !== "rate" || !Number.isFinite(feature.value)) continue;
      (rates[key] ||= []).push({ team, value: feature.value });
    }
  }
  const out = {};
  for (const [key, list] of Object.entries(rates)) {
    list.sort((a, b) => b.value - a.value || a.team.localeCompare(b.team));
    const average = list.reduce((s, x) => s + x.value, 0) / list.length;
    out[key] = { average, teams: list.length, rank: Object.fromEntries(list.map((x, i) => [x.team, i + 1])),
                 value: Object.fromEntries(list.map((x) => [x.team, x.value])) };
  }
  return out;
}

module.exports = { joinFtnToOffense, mapLeagueRowsToFacts, buildLeagueDna, leagueRanks };
