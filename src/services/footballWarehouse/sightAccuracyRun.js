"use strict";

const { createMetricRunWriter } = require("./metricRunWriter");
const { gradeSight } = require("./sightAccuracy");
const { weeklyLines } = require("./kdefMetric");

const METRIC_NAME = "omen_sight_accuracy";

const SIGHT_RUN_SQL = `
  SELECT r.id, r.week FROM football.football_metric_runs r
   WHERE r.metric_name = 'omen_sight' AND r.formula_version = $1 AND r.season = $2 AND r.state = 'succeeded'
     AND r.week IS NOT NULL ORDER BY r.week`;
const GRADED_SQL = `
  SELECT week FROM football.football_metric_runs
   WHERE metric_name = 'omen_sight_accuracy' AND formula_version = $1 AND season = $2 AND state = 'succeeded'`;
const WEEK_ROWS_SQL = `
  SELECT count(*)::integer AS n FROM football.nfl_player_weekly_stats WHERE season = $1 AND week = $2 AND season_type = 'REG'`;
// Kickers and defenses are graded on Omen's own standard fantasy scoring of the graded week (kdefMetric.js).
const KDEF_WEEK_PLAYS_SQL = `
  SELECT p.week, p.game_id, p.posteam_id, p.defteam_id, p.epa, p.play_type,
         p.source_row->>'kicker_player_id' AS kicker_gsis, p.source_row->>'field_goal_attempt' AS fga,
         p.source_row->>'field_goal_result' AS fg_result, p.source_row->>'kick_distance' AS kick_distance,
         p.source_row->>'extra_point_attempt' AS xpa, p.source_row->>'extra_point_result' AS xp_result,
         p.source_row->>'sack' AS sack, p.source_row->>'interception' AS interception,
         p.source_row->>'fumble_lost' AS fumble_lost, p.source_row->>'fumble_recovery_1_team' AS fr_team,
         p.source_row->>'touchdown' AS touchdown, p.source_row->>'td_team' AS td_team, p.source_row->>'safety' AS safety,
         p.source_row->>'qb_dropback' AS qb_dropback
    FROM football.nfl_plays p JOIN football.nfl_games g ON g.season = p.season AND g.game_id = p.game_id
   WHERE p.season = $1 AND g.game_type = 'REG' AND p.week = $2`;
const KDEF_GAMES_SQL = "SELECT week, home_team_id, away_team_id, home_score, away_score FROM football.nfl_games WHERE season = $1 AND game_type = 'REG' AND week = $2";
const KICKERS_SQL = "SELECT player_id, gsis_id FROM football.football_players WHERE football_position = 'K' AND gsis_id IS NOT NULL";

const VALUES_SQL = "SELECT entity_type, entity_id, value, components FROM football.football_metric_values WHERE metric_run_id = $1 AND entity_type IN ('player', 'team')";
const ACTUAL_SQL = `
  SELECT player_id, fantasy_points_ppr::float8 AS ppr FROM football.nfl_player_weekly_stats
   WHERE season = $1 AND week = $2 AND season_type = 'REG' AND fantasy_points_ppr IS NOT NULL`;
const PROVIDER_SQL = `
  SELECT player_id, (stat_line->>'pts_ppr')::float8 AS ppr FROM football.player_weekly_projections
   WHERE season = $1 AND week = $2 AND player_id IS NOT NULL AND stat_line ? 'pts_ppr'`;
const INPUTS_SQL = "SELECT DISTINCT ingest_event_id FROM football.nfl_player_weekly_stats WHERE season = $1 AND week = $2 AND season_type = 'REG' ORDER BY 1";

const MIN_WEEK_ROWS = 100;

function createSightAccuracyRunner({ pool, transactionTimeouts, version = "v1" } = {}) {
  const writer = createMetricRunWriter({ pool, transactionTimeouts });
  return {
    /** Grade every Sight week whose following week now has stat lines and is not graded yet. */
    async run({ season }) {
      const runs = (await pool.query({ name: "sight-acc-runs-v1", text: SIGHT_RUN_SQL, values: [version, season] })).rows;
      const graded = new Set((await pool.query({ name: "sight-acc-graded-v1", text: GRADED_SQL, values: [version, season] })).rows.map((r) => r.week));
      const results = [];
      for (const run of runs) {
        const week = run.week + 1;
        if (graded.has(week) || week > 18) continue;
        const rows = (await pool.query({ name: "sight-acc-week-rows-v1", text: WEEK_ROWS_SQL, values: [season, week] })).rows[0]?.n ?? 0;
        if (rows < MIN_WEEK_ROWS) continue;
        results.push(await writer.writeRun({
          metricName: METRIC_NAME, formulaVersion: version, season, week,
          async resolveInputs(client) {
            const inputs = await client.query({ name: "sight-acc-inputs-v1", text: INPUTS_SQL, values: [season, week] });
            return { ingestEventIds: inputs.rows.map((r) => Number(r.ingest_event_id)), parameters: { metric: "SIGHT_ACCURACY", version, sight_run_id: Number(run.id), graded_week: week } };
          },
          async computeValues(client) {
            const sight = (await client.query({ name: "sight-acc-values-v1", text: VALUES_SQL, values: [run.id] })).rows
              .map((r) => ({ entityType: r.entity_type, entityId: r.entity_id, value: Number(r.value), components: r.components }));
            const actual = new Map((await client.query({ name: "sight-acc-actual-v1", text: ACTUAL_SQL, values: [season, week] })).rows.map((r) => [r.player_id, Number(r.ppr)]));
            if (version === "v2") {
              const kickers = new Map((await client.query({ name: "sight-acc-kickers-v1", text: KICKERS_SQL })).rows.map((r) => [r.gsis_id, r.player_id]));
              const plays = (await client.query({ name: "sight-acc-kdef-plays-v1", text: KDEF_WEEK_PLAYS_SQL, values: [season, week] })).rows.map((r) => ({
                week: r.week, gameId: r.game_id, posteamId: r.posteam_id, defteamId: r.defteam_id, epa: r.epa, playType: r.play_type,
                kickerGsis: r.kicker_gsis, fieldGoalAttempt: r.fga, fieldGoalResult: r.fg_result, kickDistance: r.kick_distance,
                extraPointAttempt: r.xpa, extraPointResult: r.xp_result, sack: r.sack, interception: r.interception, fumbleLost: r.fumble_lost,
                fumbleRecoveryTeam: r.fr_team, touchdown: r.touchdown, tdTeam: r.td_team, safety: r.safety, qbDropback: r.qb_dropback }));
              const games = (await client.query({ name: "sight-acc-kdef-games-v1", text: KDEF_GAMES_SQL, values: [season, week] })).rows
                .map((g) => ({ week: g.week, homeTeamId: g.home_team_id, awayTeamId: g.away_team_id, homeScore: g.home_score, awayScore: g.away_score }));
              const lines = weeklyLines(plays, games, kickers);
              for (const [id, weeks] of lines.kickers) { const l = weeks.get(week); if (l) actual.set(id, l.fp); }
              for (const [team, weeks] of lines.defenses) { const l = weeks.get(week); if (l && l.pointsAllowed != null) actual.set(team, l.fp); }
            }
            let provider = new Map();
            try {
              provider = new Map((await client.query({ name: "sight-acc-provider-v1", text: PROVIDER_SQL, values: [season, week] })).rows.map((r) => [r.player_id, Number(r.ppr)]));
            } catch { /* provider projections not stored: graded against the other yardsticks only */ }
            return gradeSight(sight, actual, provider);
          },
        }));
      }
      return { state: results.length ? "succeeded" : "unchanged", graded_weeks: results.length };
    },
  };
}

module.exports = { createSightAccuracyRunner, METRIC_NAME };
