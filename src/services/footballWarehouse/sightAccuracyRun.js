"use strict";

const { createMetricRunWriter } = require("./metricRunWriter");
const { gradeSight } = require("./sightAccuracy");

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
const VALUES_SQL = "SELECT entity_id, value, components FROM football.football_metric_values WHERE metric_run_id = $1 AND entity_type = 'player'";
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
              .map((r) => ({ entityId: r.entity_id, value: Number(r.value), components: r.components }));
            const actual = new Map((await client.query({ name: "sight-acc-actual-v1", text: ACTUAL_SQL, values: [season, week] })).rows.map((r) => [r.player_id, Number(r.ppr)]));
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
