"use strict";

/**
 * The last week of a league's fantasy season, playoffs included, from each provider's own settings, so a
 * waiver judgement can weigh every week the team still plays (founder, 2026-10-23). null when unread;
 * the engine then keeps its default horizon.
 */

function week(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 18 ? n : null;
}

/** Sleeper: playoff_week_start plus one week per round; round type 1 makes the final two weeks, 2 every round. */
function fromSleeper(league) {
  const settings = league?.settings || {};
  const start = week(settings.playoff_week_start);
  const teams = Number(settings.playoff_teams);
  if (!start || !(teams >= 2)) return null;
  const rounds = Math.ceil(Math.log2(teams));
  const type = Number(settings.playoff_round_type);
  const length = type === 2 ? rounds * 2 : type === 1 ? rounds + 1 : rounds;
  return week(start + length - 1);
}

/** ESPN: the last scoring period of the last matchup period (mSettings scheduleSettings.matchupPeriods). */
function fromEspn(settings) {
  const periods = Object.values(settings?.scheduleSettings?.matchupPeriods || {})
    .flat()
    .map(Number)
    .filter(Number.isInteger);
  return periods.length ? week(Math.max(...periods)) : null;
}

/** Yahoo: the league's end_week, which counts the playoffs. */
function fromYahoo(rawSettings) {
  const league = rawSettings?.fantasy_content?.league ?? rawSettings;
  return week(Array.isArray(league) ? league[0]?.end_week : league?.end_week);
}

module.exports = { fromSleeper, fromEspn, fromYahoo };
