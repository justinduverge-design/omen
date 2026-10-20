"use strict";

// RAT-QB-S (QB), RAT-RB, RAT-WR and RAT-TE v0: Sight's position ratings for skill players, from play-by-play.
// Pure math only (no database, no clock); grading is sightGrade.gradeCohort, the RAT-QB method.
// Spec: Blueprints/specs/football-data/omen-sight-v0.md. v0 is UNFITTED and not opponent-adjusted:
// weights and shrinkage constants are documented judgment values, to be graded and then fitted.
//
// Each rating mixes ROLE (how much of the offense runs through him) with EFFICIENCY (what he does
// with it). Role is what fantasy points follow; efficiency is the eye test that says whether the role
// is earned or about to change.

const { gradeCohort } = require("./sightGrade");

const FORMULA_VERSION = "v0";
const MIN_COHORT = 8;

const flag = (v) => v === true || (v != null && v !== "" && v !== false && Number(v) === 1);
const num = (v) => {
  if (v == null || v === "" || v === "NA") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function empty() {
  return {
    games: new Set(),
    teamPassAttempts: 0,
    teamRushAttempts: 0,
    targets: 0,
    targetEpa: 0,
    receptions: 0,
    cpoeTargets: 0,
    cpoeSum: 0,
    yacEpaSum: 0,
    airYardsTargets: 0,
    airYardsSum: 0,
    explosiveCatches: 0,
    redZoneTargets: 0,
    carries: 0,
    rushEpa: 0,
    rushSuccess: 0,
    explosiveRuns: 0,
    fumblesLost: 0,
    teamDropbacks: 0,
    teamPlays: 0,
    dropbacks: 0,
    dropbackEpa: 0,
    passCpoeN: 0,
    passCpoeSum: 0,
    sacks: 0,
    interceptions: 0,
    qbFumblesLost: 0,
  };
}

/**
 * plays: [{ gameId, posteamId, receiverId, rusherId, epa, yacEpa, success, passAttempt, rushAttempt, sack,
 *           qbScramble, twoPoint, completePass, cp, yardsGained, airYards, yardline100, fumbleLost, fumbledGsisId,
 *           passerId, qbDropback, interception, cpoe }]
 * players: Map(omen player id -> { position: "QB"|"RB"|"WR"|"TE", gsis })
 */
function aggregateSkillPlays(plays, players) {
  const team = new Map(); // `${gameId}|${team}` -> { pass, rush }
  const teamOf = (play) => {
    const key = `${play.gameId}|${play.posteamId}`;
    if (!team.has(key)) team.set(key, { pass: 0, rush: 0, dropbacks: 0 });
    return team.get(key);
  };
  const byPlayer = new Map();
  const playerGames = new Map(); // id -> Set(`${gameId}|${team}`)
  const get = (id, key) => {
    if (!byPlayer.has(id)) {
      byPlayer.set(id, empty());
      playerGames.set(id, new Set());
    }
    playerGames.get(id).add(key);
    return byPlayer.get(id);
  };

  for (const play of plays) {
    if (flag(play.twoPoint)) continue;
    const epa = num(play.epa);
    if (epa == null) continue;
    const key = `${play.gameId}|${play.posteamId}`;
    // Quarterback dropbacks: passes, sacks and scrambles. Counted for the team, and for the passer when he is
    // a rated QB (a scramble's QB is the rusher).
    if (flag(play.qbDropback)) {
      teamOf(play).dropbacks += 1;
      const qbId = play.passerId || (flag(play.qbScramble) ? play.rusherId : null);
      if (qbId && players.get(qbId)?.position === "QB") {
        const a = get(qbId, key);
        a.dropbacks += 1;
        a.dropbackEpa += epa;
        if (flag(play.sack)) a.sacks += 1;
        if (flag(play.interception)) a.interceptions += 1;
        const cpoe = num(play.cpoe);
        if (flag(play.passAttempt) && cpoe != null) {
          a.passCpoeN += 1;
          a.passCpoeSum += cpoe;
        }
        const gsis = players.get(qbId).gsis;
        if (flag(play.fumbleLost) && gsis && play.fumbledGsisId === gsis) a.qbFumblesLost += 1;
      }
    }
    if (flag(play.passAttempt) && !flag(play.sack)) {
      teamOf(play).pass += 1;
      if (play.receiverId && players.has(play.receiverId)) {
        const a = get(play.receiverId, key);
        a.targets += 1;
        a.targetEpa += epa;
        const cp = num(play.cp);
        const complete = flag(play.completePass);
        if (cp != null) {
          a.cpoeTargets += 1;
          a.cpoeSum += (complete ? 1 : 0) - cp;
        }
        const air = num(play.airYards);
        if (air != null) {
          a.airYardsTargets += 1;
          a.airYardsSum += air;
        }
        if (num(play.yardline100) != null && num(play.yardline100) <= 20) a.redZoneTargets += 1;
        if (complete) {
          a.receptions += 1;
          a.yacEpaSum += num(play.yacEpa) ?? 0;
          if ((num(play.yardsGained) ?? 0) >= 20) a.explosiveCatches += 1;
        }
      }
    } else if (flag(play.rushAttempt) && !flag(play.qbScramble)) {
      teamOf(play).rush += 1;
      if (play.rusherId && players.has(play.rusherId)) {
        const a = get(play.rusherId, key);
        a.carries += 1;
        a.rushEpa += epa;
        if (flag(play.success)) a.rushSuccess += 1;
        if ((num(play.yardsGained) ?? 0) >= 10) a.explosiveRuns += 1;
        const gsis = players.get(play.rusherId).gsis;
        if (flag(play.fumbleLost) && gsis && play.fumbledGsisId === gsis) a.fumblesLost += 1;
      }
    }
  }
  // Role denominators: the team's plays in the games this player appeared in.
  for (const [id, a] of byPlayer) {
    for (const key of playerGames.get(id)) {
      const t = team.get(key) || { pass: 0, rush: 0, dropbacks: 0 };
      a.teamPassAttempts += t.pass;
      a.teamRushAttempts += t.rush;
      a.teamDropbacks += t.dropbacks;
      a.teamPlays += t.dropbacks + t.rush;
      a.games.add(key);
    }
  }
  return byPlayer;
}

const rate = (sum, n) => ({ raw: n > 0 ? sum / n : null, n, sum });

const RECEIVING = (a) => ({
  target_share: rate(a.targets, a.teamPassAttempts),
  epa_per_target: rate(a.targetEpa, a.targets),
  catch_over_expected: rate(a.cpoeSum, a.cpoeTargets),
  yac_epa_per_reception: rate(a.yacEpaSum, a.receptions),
  air_yards_per_target: rate(a.airYardsSum, a.airYardsTargets),
  explosive_catch_rate: rate(a.explosiveCatches, a.targets),
  red_zone_target_rate: rate(a.redZoneTargets, a.targets),
});

const describe = (a) => ({
  games: a.games.size,
  dropbacks: a.dropbacks,
  targets: a.targets,
  receptions: a.receptions,
  carries: a.carries,
  red_zone_targets: a.redZoneTargets,
  fumbles_lost: a.fumblesLost,
});

// shrinkK: pseudo-observations pulling toward the cohort mean (targets, carries or team plays).
const SPECS = Object.freeze({
  QB: {
    metricName: "omen_qb_sight_grade",
    registryId: "RAT-QB-S",
    position: "QB",
    qualifies: (a) => a.dropbacks >= 100,
    components: [
      { key: "dropback_share", sign: 1, weight: 0.15, shrinkK: 200 },
      { key: "pass_rate", sign: 1, weight: 0.1, shrinkK: 300 },
      { key: "designed_rush_share", sign: 1, weight: 0.15, shrinkK: 200 },
      { key: "epa_per_dropback", sign: 1, weight: 0.2, shrinkK: 150 },
      { key: "cpoe", sign: 1, weight: 0.1, shrinkK: 250 },
      { key: "sack_avoidance_rate", sign: 1, weight: 0.05, shrinkK: 300 },
      { key: "turnover_rate", sign: -1, weight: 0.1, shrinkK: 500 },
      { key: "rush_epa_per_carry", sign: 1, weight: 0.15, shrinkK: 60 },
    ],
    raw: (a) => ({
      dropback_share: rate(a.dropbacks, a.teamDropbacks),
      pass_rate: rate(a.teamDropbacks, a.teamPlays),
      designed_rush_share: rate(a.carries, a.teamRushAttempts),
      epa_per_dropback: rate(a.dropbackEpa, a.dropbacks),
      cpoe: rate(a.passCpoeSum, a.passCpoeN),
      sack_avoidance_rate: rate(a.dropbacks - a.sacks, a.dropbacks),
      turnover_rate: rate(a.interceptions + a.qbFumblesLost, a.dropbacks),
      rush_epa_per_carry: rate(a.rushEpa, a.carries),
    }),
  },
  RB: {
    metricName: "omen_rb_grade",
    registryId: "RAT-RB",
    position: "RB",
    qualifies: (a) => a.carries >= 40,
    components: [
      { key: "carry_share", sign: 1, weight: 0.25, shrinkK: 120 },
      { key: "rush_epa_per_carry", sign: 1, weight: 0.2, shrinkK: 80 },
      { key: "rush_success_rate", sign: 1, weight: 0.15, shrinkK: 80 },
      { key: "explosive_run_rate", sign: 1, weight: 0.1, shrinkK: 80 },
      { key: "target_share", sign: 1, weight: 0.15, shrinkK: 150 },
      { key: "epa_per_target", sign: 1, weight: 0.1, shrinkK: 30 },
      { key: "fumble_rate", sign: -1, weight: 0.05, shrinkK: 200 },
    ],
    raw: (a) => ({
      carry_share: rate(a.carries, a.teamRushAttempts),
      rush_epa_per_carry: rate(a.rushEpa, a.carries),
      rush_success_rate: rate(a.rushSuccess, a.carries),
      explosive_run_rate: rate(a.explosiveRuns, a.carries),
      target_share: rate(a.targets, a.teamPassAttempts),
      epa_per_target: rate(a.targetEpa, a.targets),
      fumble_rate: rate(a.fumblesLost, a.carries + a.receptions),
    }),
  },
  WR: {
    metricName: "omen_wr_grade",
    registryId: "RAT-WR",
    position: "WR",
    qualifies: (a) => a.targets >= 25,
    components: [
      { key: "target_share", sign: 1, weight: 0.25, shrinkK: 150 },
      { key: "epa_per_target", sign: 1, weight: 0.2, shrinkK: 40 },
      { key: "catch_over_expected", sign: 1, weight: 0.15, shrinkK: 60 },
      { key: "air_yards_per_target", sign: 1, weight: 0.1, shrinkK: 40 },
      { key: "yac_epa_per_reception", sign: 1, weight: 0.1, shrinkK: 30 },
      { key: "explosive_catch_rate", sign: 1, weight: 0.1, shrinkK: 60 },
      { key: "red_zone_target_rate", sign: 1, weight: 0.1, shrinkK: 60 },
    ],
    raw: RECEIVING,
  },
  TE: {
    metricName: "omen_te_grade",
    registryId: "RAT-TE",
    position: "TE",
    qualifies: (a) => a.targets >= 20,
    components: [
      { key: "target_share", sign: 1, weight: 0.3, shrinkK: 150 },
      { key: "epa_per_target", sign: 1, weight: 0.2, shrinkK: 40 },
      { key: "catch_over_expected", sign: 1, weight: 0.15, shrinkK: 60 },
      { key: "red_zone_target_rate", sign: 1, weight: 0.15, shrinkK: 60 },
      { key: "yac_epa_per_reception", sign: 1, weight: 0.1, shrinkK: 30 },
      { key: "air_yards_per_target", sign: 1, weight: 0.1, shrinkK: 40 },
    ],
    raw: RECEIVING,
  },
});

function computeSkillGrades(position, byPlayer, playerPositions) {
  const spec = SPECS[position];
  const scoped = new Map([...byPlayer].filter(([id]) => playerPositions.get(id)?.position === position));
  return gradeCohort(scoped, { ...spec, formulaVersion: FORMULA_VERSION, minCohort: MIN_COHORT, describe });
}

function metricConstants(position) {
  const spec = SPECS[position];
  return {
    registry_id: spec.registryId,
    fitted: false,
    opponent_adjusted: false,
    min_qualified_cohort: MIN_COHORT,
    components: spec.components.map(({ key, sign, weight, shrinkK }) => ({ key, sign, weight, shrink_k: shrinkK })),
  };
}

module.exports = { FORMULA_VERSION, SPECS, aggregateSkillPlays, computeSkillGrades, metricConstants };
