"use strict";

/**
 * One football-intelligence signal per NFL team (FI-LEAGUE step 3): what this offense does, ranked
 * against the league, from the team's Scheme DNA (leagueSchemeDna.js). Payloads follow
 * `football-intelligence-signal.v1`, the contract the Omen call and the iOS app already read.
 *
 * Honesty rules:
 *   - The current season is used once at least MIN_RANKED_TEAMS offenses have its Scheme DNA (the evidence
 *     policy needs 4 games and 120 plays each), and then for every team at once; until then last season is
 *     used, and the payload says so (`basis_season`, freshness `previous_season`).
 *   - Tendencies are observed rates. Nothing claims who called a play or why a rate moved
 *     (`association_only: true`).
 *   - A head-coach change is stated as a fact from the schedule. A first-time head coach gets no
 *     comparison, and a comparison with the coach's previous team needs the current season's evidence.
 */

const { compareSchemeDna } = require("./schemeDna");
const { teamIdFor, teamName, coachIdFor } = require("./nflTeams");

const CONTRACT_VERSION = "football-intelligence-signal.v1";
const SIGNAL_TYPE = "team_system_identity";
// A league rank means little until most teams have the season's evidence: switch every team to the current
// season together, once at least this many offenses qualify, so ranks always span the league.
const MIN_RANKED_TEAMS = 24;
const RATE_LABELS = Object.freeze({
  play_action_rate: "play-action",
  motion_rate: "pre-snap motion",
  rpo_rate: "RPOs",
  screen_rate: "screens",
  no_huddle_rate: "no-huddle",
  qb_out_of_pocket_rate: "quarterback plays outside the pocket",
});

function ordinal(n) {
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
  return `${n}${suffix}`;
}
const pct = (x) => `${(Math.round(x * 1000) / 10).toFixed(1)}%`;

/** Head coach per team per season: the coach of the team's latest regular-season game that season. */
function headCoaches(games) {
  const out = {};
  for (const g of games) {
    if (g.game_type && g.game_type !== "REG") continue;
    const season = Number(g.season);
    const week = Number(g.week);
    for (const side of ["home", "away"]) {
      const team = g[`${side}_team`];
      const coach = g[`${side}_coach`];
      if (!team || !coach) continue;
      const key = `${season}|${team}`;
      if (!out[key] || week >= out[key].week) out[key] = { coach, week };
    }
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.coach]));
}

/** The teams' most distinctive rates: furthest from the middle of the league, at most two. */
function distinctive(team, ranks) {
  const items = [];
  for (const [feature, r] of Object.entries(ranks)) {
    if (!RATE_LABELS[feature] || r.rank[team] === undefined) continue;
    const middle = (r.teams + 1) / 2;
    items.push({ feature, rank: r.rank[team], teams: r.teams, value: r.value[team], average: r.average,
                 spread: Math.abs(r.rank[team] - middle) });
  }
  return items.sort((a, b) => b.spread - a.spread || a.feature.localeCompare(b.feature)).slice(0, 2);
}

function summaryFor(team, basisSeason, picks) {
  const parts = picks.map((p) => `${RATE_LABELS[p.feature]} on ${pct(p.value)} of plays (${ordinal(p.rank)} of ${p.teams})`);
  return `${teamName(team)}'s offense${basisSeason ? ` in ${basisSeason}` : ""}: ${parts.join("; ")}.`;
}

/**
 * @param {object} input
 * @param {number} input.season the current season
 * @param {object} input.dnaBySeason {season: {team: schemeDna}}
 * @param {object} input.ranksBySeason {season: leagueRanks()}
 * @param {Array<object>} input.games nflverse games.csv rows
 * @param {object} input.publication {artifact_id, artifact_version, published_at_utc, source_artifacts}
 * @param {string|null} input.latestObservationAtUtc
 */
function buildTeamSignals({ season, dnaBySeason, ranksBySeason, games, publication, latestObservationAtUtc = null }) {
  const coaches = headCoaches(games);
  const currentSeasonReady = Object.values(ranksBySeason[season] || {}).some((r) => r.teams >= MIN_RANKED_TEAMS);
  const signals = [];
  const teams = new Set([...Object.keys(dnaBySeason[season] || {}), ...Object.keys(dnaBySeason[season - 1] || {})]);
  for (const team of [...teams].sort()) {
    const teamId = teamIdFor(team);
    const coach = coaches[`${season}|${team}`] || coaches[`${season - 1}|${team}`];
    const coachId = coachIdFor(coach);
    if (!teamId || !coachId) continue;
    const current = dnaBySeason[season]?.[team];
    const usingCurrent = currentSeasonReady && current?.status === "available";
    const basisSeason = usingCurrent ? season : season - 1;
    const dna = usingCurrent ? current : dnaBySeason[season - 1]?.[team];
    const ranks = ranksBySeason[basisSeason] || {};
    const picks = dna?.status === "available" ? distinctive(team, ranks) : [];

    const limitations = [
      "Rates are observed tendencies from charted plays; they do not establish who called the plays or why.",
    ];
    if (!usingCurrent) {
      limitations.push(currentSeasonReady
        ? `${season} has too few charted games for ${teamName(team)} yet (Omen needs 4), so this uses ${season - 1}.`
        : `Too few ${season} games are charted across the league yet for a fair ranking, so this uses ${season - 1}.`);
    }
    const previousCoach = coaches[`${season - 1}|${team}`];
    let coachChange = null;
    if (previousCoach && coach && previousCoach !== coach) {
      coachChange = { from: previousCoach, to: coach };
      limitations.push(`${coach} is in a first season as ${teamName(team)}'s head coach (${previousCoach} was last season), so ${season - 1} tendencies may not carry over.`);
      const previousTeam = Object.entries(coaches).find(([k, c]) => c === coach && k.startsWith(`${season - 1}|`))?.[0]?.split("|")[1];
      const before = previousTeam ? dnaBySeason[season - 1]?.[previousTeam] : null;
      if (previousTeam && before?.status === "available" && usingCurrent) {
        const similarity = compareSchemeDna(before, current);
        if (similarity.status === "available") coachChange.similarity_to_previous_team = { team: teamIdFor(previousTeam), score: similarity.score };
      }
    }

    const status = picks.length ? "available" : "insufficient_coverage";
    const reasonCode = status === "available" ? null : "insufficient_evidence";
    signals.push({
      contract_version: CONTRACT_VERSION,
      signal_type: SIGNAL_TYPE,
      status,
      reason_code: reasonCode,
      as_of_utc: latestObservationAtUtc,
      subject: { team_id: teamId, coach_id: coachId, season, team_abbreviation: team },
      summary: picks.length ? summaryFor(team, basisSeason, picks) : null,
      basis_season: basisSeason,
      tendencies: picks.map((p) => ({ feature: p.feature, label: RATE_LABELS[p.feature], value: p.value, rank: p.rank,
                                      teams: p.teams, league_average: p.average })),
      head_coach: { name: coach, change: coachChange },
      interpretation: {
        direction: "neutral",
        association_only: true,
        what_could_change_this: ["A new play-caller, a quarterback change or injuries can shift these tendencies."],
      },
      evidence: {
        source_artifacts: publication.source_artifacts,
        games: dna?.sample?.games ?? 0,
        plays: dna?.sample?.eligible_plays ?? 0,
        charted_plays: dna?.sample?.eligible_plays ?? 0,
        coverage_ratio: dna?.coverage?.ratio ?? null,
      },
      quality: { state: "accepted", limitations },
      freshness: {
        state: usingCurrent ? "current" : "previous_season",
        latest_observation_at_utc: latestObservationAtUtc,
      },
      publication: {
        artifact_id: publication.artifact_id,
        artifact_version: publication.artifact_version,
        published_at_utc: publication.published_at_utc,
      },
    });
  }
  return signals;
}

module.exports = { MIN_RANKED_TEAMS, buildTeamSignals, headCoaches, distinctive, summaryFor, ordinal, SIGNAL_TYPE, CONTRACT_VERSION, RATE_LABELS };
