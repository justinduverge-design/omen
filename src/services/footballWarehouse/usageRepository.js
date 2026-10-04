"use strict";

const DEFAULT_TIMEOUT_MS = 2_000;
const GSIS_ID = /^[0-9A-Za-z-]{1,50}$/;

function integer(value, name, { min, max }) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new TypeError(`${name} must be an integer from ${min} through ${max}`);
  }
  return value;
}

function publicGsisIds(values) {
  if (!Array.isArray(values)) throw new TypeError("gsisIds must be an array");
  const ids = [...new Set(values)];
  if (ids.length > 500) throw new RangeError("gsisIds exceeds the 500-player query limit");
  for (const id of ids) {
    if (typeof id !== "string" || !GSIS_ID.test(id)) {
      throw new TypeError("gsisIds may contain only public NFL GSIS identifiers");
    }
  }
  return ids;
}

function finiteOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integerOrZero(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : 0;
}

function mapRow(row) {
  return {
    week: integerOrZero(row.week),
    season_type: row.season_type,
    team: row.team,
    targets: integerOrZero(row.targets),
    receptions: integerOrZero(row.receptions),
    carries: integerOrZero(row.carries),
    attempts: integerOrZero(row.attempts),
    target_share: finiteOrNull(row.target_share),
    snaps: row.snaps == null ? null : integerOrZero(row.snaps),
    snap_share: finiteOrNull(row.snap_share),
  };
}

/**
 * Read public football facts only. Provider keys, Omen user ids, league ids and roster context are
 * deliberately outside this contract; those remain in Supabase and are resolved to GSIS first.
 */
function createWarehouseUsageRepository({ query, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  if (typeof query !== "function") throw new TypeError("query must be a function");
  integer(timeoutMs, "timeoutMs", { min: 100, max: 30_000 });

  return {
    async readPlayerWeeks({ gsisIds, season, beforeWeek }) {
      const ids = publicGsisIds(gsisIds);
      integer(season, "season", { min: 1999, max: 2100 });
      integer(beforeWeek, "beforeWeek", { min: 1, max: 23 });
      if (!ids.length) return new Map();

      const result = await query({
        name: "warehouse-player-usage-v1",
        text: `
          SELECT players.gsis_id, facts.week, facts.season_type,
                 teams.nflverse_abbr AS team,
                 facts.targets, facts.receptions, facts.carries,
                 facts.passing_attempts AS attempts,
                 facts.target_share, opportunity.snaps, opportunity.snap_share
          FROM football.nfl_player_weekly_stats AS facts
          JOIN football.football_players AS players ON players.player_id = facts.player_id
          LEFT JOIN football.football_teams AS teams ON teams.team_id = facts.team_id
          LEFT JOIN football.nfl_player_weekly_opportunity AS opportunity
            ON opportunity.season = facts.season
           AND opportunity.week = facts.week
           AND opportunity.season_type = facts.season_type
           AND opportunity.player_id = facts.player_id
          WHERE players.gsis_id = ANY($1::text[])
            AND facts.season = $2
            AND facts.week < $3
            AND facts.season_type = 'REG'
          ORDER BY players.gsis_id, facts.week
        `,
        values: [ids, season, beforeWeek],
        query_timeout: timeoutMs,
      });

      const out = new Map(ids.map((id) => [id, []]));
      for (const row of result?.rows || []) {
        if (!out.has(row.gsis_id)) continue;
        out.get(row.gsis_id).push(mapRow(row));
      }
      return out;
    },
  };
}

module.exports = { createWarehouseUsageRepository, DEFAULT_TIMEOUT_MS };
