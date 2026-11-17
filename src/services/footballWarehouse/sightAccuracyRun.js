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
  SELECT week, parameters FROM football.football_metric_runs
   WHERE metric_name = 'omen_sight_accuracy' AND formula_version = $1 AND season = $2 AND state = 'succeeded'`;
const WEEK_ROWS_SQL = `
  SELECT count(*)::integer AS n FROM football.nfl_player_weekly_stats WHERE season = $1 AND week = $2 AND season_type = 'REG'`;
const PROVIDER_POS_SQL = `
  SELECT p.football_position, count(*)::integer AS n
    FROM football.player_weekly_projections pr
    JOIN football.football_players p ON p.player_id = pr.player_id
   WHERE pr.season = $1 AND pr.week = $2 AND pr.player_id IS NOT NULL AND pr.stat_line ? 'pts_ppr'
   GROUP BY p.football_position`;
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
const KDEF_GAMES_SQL =
  "SELECT week, home_team_id, away_team_id, home_score, away_score FROM football.nfl_games WHERE season = $1 AND game_type = 'REG' AND week = $2";
const KICKERS_SQL =
  "SELECT player_id, gsis_id FROM football.football_players WHERE football_position = 'K' AND gsis_id IS NOT NULL";

const VALUES_SQL =
  "SELECT entity_type, entity_id, value, components FROM football.football_metric_values WHERE metric_run_id = $1 AND entity_type IN ('player', 'team')";
const ACTUAL_SQL = `
  SELECT player_id, fantasy_points_ppr::float8 AS ppr FROM football.nfl_player_weekly_stats
   WHERE season = $1 AND week = $2 AND season_type = 'REG' AND fantasy_points_ppr IS NOT NULL`;
const PROVIDER_SQL = `
  SELECT player_id, (stat_line->>'pts_ppr')::float8 AS ppr FROM football.player_weekly_projections
   WHERE season = $1 AND week = $2 AND player_id IS NOT NULL AND stat_line ? 'pts_ppr'`;
const INPUTS_SQL =
  "SELECT DISTINCT ingest_event_id FROM football.nfl_player_weekly_stats WHERE season = $1 AND week = $2 AND season_type = 'REG' ORDER BY 1";

const MIN_WEEK_ROWS = 100;

function hasAnyComparison(summary) {
  const positions = summary?.positions;
  if (!positions || typeof positions !== "object") return false;
  return Object.values(positions).some((pos) => {
    const p = pos?.provider;
    if (!p) return false;
    return p.corr != null || p.mae != null || (Number.isFinite(p.n) && p.n >= 3);
  });
}

function hasZeroProviderMatches(summary) {
  const positions = summary?.positions;
  if (!positions || typeof positions !== "object") return false;
  const list = Object.values(positions);
  if (list.length === 0) return false;
  return list.every((pos) => (pos?.provider?.n ?? 0) === 0);
}

function createSightAccuracyRunner({ pool, transactionTimeouts, version = "v1" } = {}) {
  const writer = createMetricRunWriter({ pool, transactionTimeouts });
  return {
    /** Grade every Sight week whose following week now has stat lines and is not graded yet. */
    async run({ season }) {
      const runs = (await pool.query({ name: "sight-acc-runs-v1", text: SIGHT_RUN_SQL, values: [version, season] }))
        .rows;
      const gradedRows = (
        await pool.query({ name: "sight-acc-graded-v1", text: GRADED_SQL, values: [version, season] })
      ).rows;
      const graded = new Map(
        gradedRows.map((r) => {
          const params = typeof r.parameters === "string" ? JSON.parse(r.parameters) : r.parameters;
          return [r.week, { ...r, parameters: params }];
        }),
      );
      const regradedWeeks = new Set();
      const results = [];
      for (const run of runs) {
        const week = run.week + 1;
        if (week > 18) continue;
        const prior = graded.get(week);
        let isRegrade = false;
        if (prior) {
          const summary = prior.parameters?.summary;
          if (hasAnyComparison(summary)) continue;
          if (!hasZeroProviderMatches(summary)) continue;
          if (prior.parameters?.regrade || regradedWeeks.has(week)) continue;
          let hasStoredProjections = false;
          try {
            const counts = await pool.query({
              name: "sight-acc-provider-pos-v1",
              text: PROVIDER_POS_SQL,
              values: [season, week],
            });
            hasStoredProjections = (counts.rows || []).some((r) => Number(r.n) >= 3);
          } catch {
            hasStoredProjections = false;
          }
          if (!hasStoredProjections) continue;
          isRegrade = true;
          regradedWeeks.add(week);
        }
        const rows =
          (await pool.query({ name: "sight-acc-week-rows-v1", text: WEEK_ROWS_SQL, values: [season, week] })).rows[0]
            ?.n ?? 0;
        if (rows < MIN_WEEK_ROWS) continue;
        results.push(
          await writer.writeRun({
            metricName: METRIC_NAME,
            formulaVersion: version,
            season,
            week,
            async resolveInputs(client) {
              const inputs = await client.query({
                name: "sight-acc-inputs-v1",
                text: INPUTS_SQL,
                values: [season, week],
              });
              const parameters = { metric: "SIGHT_ACCURACY", version, sight_run_id: Number(run.id), graded_week: week };
              if (isRegrade) parameters.regrade = true;
              return {
                ingestEventIds: inputs.rows.map((r) => Number(r.ingest_event_id)),
                parameters,
              };
            },
            async computeValues(client) {
              const sight = (
                await client.query({ name: "sight-acc-values-v1", text: VALUES_SQL, values: [run.id] })
              ).rows.map((r) => ({
                entityType: r.entity_type,
                entityId: r.entity_id,
                value: Number(r.value),
                components: r.components,
              }));
              const actual = new Map(
                (
                  await client.query({ name: "sight-acc-actual-v1", text: ACTUAL_SQL, values: [season, week] })
                ).rows.map((r) => [r.player_id, Number(r.ppr)]),
              );
              if (version === "v2") {
                const kickers = new Map(
                  (await client.query({ name: "sight-acc-kickers-v1", text: KICKERS_SQL })).rows.map((r) => [
                    r.gsis_id,
                    r.player_id,
                  ]),
                );
                const plays = (
                  await client.query({
                    name: "sight-acc-kdef-plays-v1",
                    text: KDEF_WEEK_PLAYS_SQL,
                    values: [season, week],
                  })
                ).rows.map((r) => ({
                  week: r.week,
                  gameId: r.game_id,
                  posteamId: r.posteam_id,
                  defteamId: r.defteam_id,
                  epa: r.epa,
                  playType: r.play_type,
                  kickerGsis: r.kicker_gsis,
                  fieldGoalAttempt: r.fga,
                  fieldGoalResult: r.fg_result,
                  kickDistance: r.kick_distance,
                  extraPointAttempt: r.xpa,
                  extraPointResult: r.xp_result,
                  sack: r.sack,
                  interception: r.interception,
                  fumbleLost: r.fumble_lost,
                  fumbleRecoveryTeam: r.fr_team,
                  touchdown: r.touchdown,
                  tdTeam: r.td_team,
                  safety: r.safety,
                  qbDropback: r.qb_dropback,
                }));
                const games = (
                  await client.query({ name: "sight-acc-kdef-games-v1", text: KDEF_GAMES_SQL, values: [season, week] })
                ).rows.map((g) => ({
                  week: g.week,
                  homeTeamId: g.home_team_id,
                  awayTeamId: g.away_team_id,
                  homeScore: g.home_score,
                  awayScore: g.away_score,
                }));
                const lines = weeklyLines(plays, games, kickers);
                for (const [id, weeks] of lines.kickers) {
                  const l = weeks.get(week);
                  if (l) actual.set(id, l.fp);
                }
                for (const [team, weeks] of lines.defenses) {
                  const l = weeks.get(week);
                  if (l && l.pointsAllowed != null) actual.set(team, l.fp);
                }
              }
              let provider = new Map();
              try {
                provider = new Map(
                  (
                    await client.query({ name: "sight-acc-provider-v1", text: PROVIDER_SQL, values: [season, week] })
                  ).rows.map((r) => [r.player_id, Number(r.ppr)]),
                );
              } catch {
                /* provider projections not stored: graded against the other yardsticks only */
              }
              return gradeSight(sight, actual, provider);
            },
          }),
        );
      }
      const succeeded = results.filter((r) => r.state === "succeeded");
      return { state: succeeded.length ? "succeeded" : "unchanged", graded_weeks: succeeded.length };
    },
  };
}

module.exports = { createSightAccuracyRunner, METRIC_NAME };
