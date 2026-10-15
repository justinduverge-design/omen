"use strict";

/**
 * Read-only PostgreSQL source for the backtest. Every statement is a SELECT against football.* and the session is
 * required to be read-only before anything is read. Nothing here writes, and nothing is cached on disk.
 *
 * Tables read: nfl_player_weekly_stats, nfl_player_weekly_opportunity, football_players (name only),
 * football_teams, nfl_games, and (optionally) player_weekly_projections. Snap counts are never selected.
 */

const SKILL_POSITIONS = ["QB", "RB", "WR", "TE"];
const EXPECTED_DATABASE = "omen_football";
const EXPECTED_LOGIN_ROLE = "omen_warehouse_read";
const SESSION_IDENTITY_SQL = `
  SELECT current_database() AS database_name,
         session_user AS role_name,
         current_setting('transaction_read_only') AS transaction_read_only`;

const PLAYER_WEEKS_SQL = `
  SELECT w.week, w.player_id, p.display_name, w.football_position AS position, t.nflverse_abbr AS team,
         w.fantasy_points_ppr, w.passing_attempts, w.carries, w.targets, w.receptions,
         w.passing_yards, w.rushing_yards, w.receiving_yards, w.stats,
         (o.player_id IS NOT NULL) AS has_opportunity, o.red_zone_carries, o.red_zone_targets
    FROM football.nfl_player_weekly_stats AS w
    JOIN football.football_players AS p ON p.player_id = w.player_id
    LEFT JOIN football.football_teams AS t ON t.team_id = w.team_id
    LEFT JOIN football.nfl_player_weekly_opportunity AS o
      ON o.season = w.season AND o.week = w.week AND o.season_type = w.season_type AND o.player_id = w.player_id
   WHERE w.season = $1 AND w.season_type = 'REG' AND w.football_position = ANY($2::text[])
   ORDER BY w.week, w.player_id`;

const GAMES_SQL = `
  SELECT g.week, g.game_id, th.nflverse_abbr AS home, ta.nflverse_abbr AS away, g.spread_line, g.total_line
    FROM football.nfl_games AS g
    JOIN football.football_teams AS th ON th.team_id = g.home_team_id
    JOIN football.football_teams AS ta ON ta.team_id = g.away_team_id
   WHERE g.season = $1 AND g.game_type = 'REG'`;

const SLEEPER_SQL = `
  SELECT week, player_id, stat_line
    FROM football.player_weekly_projections
   WHERE source = 'sleeper' AND season = $1 AND player_id IS NOT NULL`;

const n = (value) => (value == null || value === "" || !Number.isFinite(Number(value)) ? 0 : Number(value));

/** One stats row (typed columns plus the sparse nflverse jsonb) -> the stat line the projection works in. */
function statsFromRow(row) {
  const s = row.stats && typeof row.stats === "object" ? row.stats : {};
  return {
    attempts: n(row.passing_attempts ?? s.attempts),
    completions: n(s.completions),
    passing_yards: n(row.passing_yards ?? s.passing_yards),
    passing_tds: n(s.passing_tds),
    passing_interceptions: n(s.passing_interceptions ?? s.interceptions),
    carries: n(row.carries ?? s.carries),
    rushing_yards: n(row.rushing_yards ?? s.rushing_yards),
    rushing_tds: n(s.rushing_tds),
    targets: n(row.targets ?? s.targets),
    receptions: n(row.receptions ?? s.receptions),
    receiving_yards: n(row.receiving_yards ?? s.receiving_yards),
    receiving_tds: n(s.receiving_tds),
    fumbles_lost: n(s.sack_fumbles_lost) + n(s.rushing_fumbles_lost) + n(s.receiving_fumbles_lost),
  };
}

function playerWeekFromRow(row) {
  return {
    player_id: row.player_id,
    name: row.display_name,
    position: row.position,
    team: row.team,
    week: Number(row.week),
    stats: statsFromRow(row),
    opp: row.has_opportunity ? { red_zone_carries: n(row.red_zone_carries), red_zone_targets: n(row.red_zone_targets) } : null,
    reported_ppr: row.fantasy_points_ppr == null ? null : Number(row.fantasy_points_ppr),
  };
}

/**
 * @param {{ query: (text: string, values: any[]) => Promise<{rows: any[]}> }} client a read-only pg Pool or Client
 */
function createPgSource({ query, includeSleeper = false }) {
  if (typeof query !== "function") throw new TypeError("query must be a function");
  return {
    async assertReadOnly() {
      const result = await query(SESSION_IDENTITY_SQL, []);
      const row = result.rows?.[0] || {};
      if (row.transaction_read_only !== "on") {
        throw new Error("refusing to run: the session is not read-only (transaction_read_only is not on)");
      }
      if (row.database_name !== EXPECTED_DATABASE || row.role_name !== EXPECTED_LOGIN_ROLE) {
        throw new Error(`refusing to run: expected ${EXPECTED_LOGIN_ROLE} on ${EXPECTED_DATABASE}`);
      }
    },
    async loadSeason(season) {
      const [weeks, games] = await Promise.all([
        query(PLAYER_WEEKS_SQL, [season, SKILL_POSITIONS]),
        query(GAMES_SQL, [season]),
      ]);
      return {
        playerWeeks: weeks.rows.map(playerWeekFromRow),
        games: games.rows.map((g) => ({
          week: Number(g.week), game_id: g.game_id, home: g.home, away: g.away,
          spread_line: g.spread_line == null ? null : Number(g.spread_line),
          total_line: g.total_line == null ? null : Number(g.total_line),
        })),
      };
    },
    ...(includeSleeper ? {
      /** Stored Sleeper projections by "week|player_id", or null when the table is absent or empty for the season. */
      async loadSleeper(season) {
        let result;
        try { result = await query(SLEEPER_SQL, [season]); } catch { return null; }
        if (!result.rows.length) return null;
        return new Map(result.rows.map((r) => [`${Number(r.week)}|${r.player_id}`, r.stat_line]));
      },
    } : {}),
  };
}

module.exports = {
  EXPECTED_DATABASE, EXPECTED_LOGIN_ROLE, GAMES_SQL, PLAYER_WEEKS_SQL, SESSION_IDENTITY_SQL, SLEEPER_SQL,
  createPgSource, playerWeekFromRow, statsFromRow,
};
