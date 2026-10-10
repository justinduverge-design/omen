"use strict";

const { createMetricRunWriter } = require("./metricRunWriter");
const {
  METRIC_NAME, FORMULA_VERSION, aggregateQbPlays, computeQbGrades, metricConstants,
} = require("./ratQbMetric");

// Scope: regular-season plays (nfl_games.game_type = 'REG') of one season,
// through `week` inclusive, or the whole regular season when week is null.
// Only rows with a nonnull epa that are QB dropbacks or QB rush attempts are
// read; the pure module decides what counts.
const PLAYS_SQL = `
  SELECT p.passer_player_id, p.rusher_player_id, p.epa, p.cpoe,
         p.source_row->>'qb_dropback' AS qb_dropback, p.source_row->>'qb_scramble' AS qb_scramble,
         p.source_row->>'qb_spike' AS qb_spike, p.source_row->>'qb_kneel' AS qb_kneel,
         p.source_row->>'sack' AS sack, p.source_row->>'pass_attempt' AS pass_attempt,
         p.source_row->>'rush_attempt' AS rush_attempt, p.source_row->>'interception' AS interception,
         p.source_row->>'fumble_lost' AS fumble_lost, p.source_row->>'fumbled_1_player_id' AS fumbled_gsis_id
    FROM football.nfl_plays p
    JOIN football.nfl_games g ON g.season = p.season AND g.game_id = p.game_id
   WHERE p.season = $1 AND g.game_type = 'REG' AND ($2::integer IS NULL OR p.week <= $2::integer)
     AND p.epa IS NOT NULL
     AND (p.source_row->>'qb_dropback' IN ('1', '1.0') OR p.source_row->>'rush_attempt' IN ('1', '1.0'))`;

const INPUTS_SQL = `
  SELECT p.ingest_event_id, count(*)::integer AS play_count
    FROM football.nfl_plays p
    JOIN football.nfl_games g ON g.season = p.season AND g.game_id = p.game_id
   WHERE p.season = $1 AND g.game_type = 'REG' AND ($2::integer IS NULL OR p.week <= $2::integer)
   GROUP BY p.ingest_event_id
   ORDER BY p.ingest_event_id`;

const QB_SQL = "SELECT player_id, gsis_id FROM football.football_players WHERE football_position = 'QB' AND gsis_id IS NOT NULL";

function playFromRow(row) {
  return {
    passerId: row.passer_player_id, rusherId: row.rusher_player_id, epa: row.epa, cpoe: row.cpoe,
    qbDropback: row.qb_dropback, qbScramble: row.qb_scramble, qbSpike: row.qb_spike, qbKneel: row.qb_kneel,
    sack: row.sack, passAttempt: row.pass_attempt, rushAttempt: row.rush_attempt,
    interception: row.interception, fumbleLost: row.fumble_lost, fumbledGsisId: row.fumbled_gsis_id,
  };
}

function createRatQbRunner({ pool, transactionTimeouts } = {}) {
  const writer = createMetricRunWriter({ pool, transactionTimeouts });
  return {
    // week null: season-to-date over the whole regular season in the warehouse.
    async run({ season, week = null }) {
      return writer.writeRun({
        metricName: METRIC_NAME,
        formulaVersion: FORMULA_VERSION,
        season,
        week,
        async resolveInputs(client) {
          const result = await client.query({ name: "rat-qb-inputs-v1", text: INPUTS_SQL, values: [season, week] });
          return {
            ingestEventIds: result.rows.map((row) => Number(row.ingest_event_id)),
            parameters: {
              ...metricConstants(),
              scope: { season_type: "REG", through_week: week },
              play_count: result.rows.reduce((sum, row) => sum + row.play_count, 0),
            },
          };
        },
        async computeValues(client) {
          const qbs = await client.query({ name: "rat-qb-players-v1", text: QB_SQL });
          const gsisById = new Map(qbs.rows.map((row) => [row.player_id, row.gsis_id]));
          const plays = await client.query({ name: "rat-qb-plays-v1", text: PLAYS_SQL, values: [season, week] });
          return computeQbGrades(aggregateQbPlays(plays.rows.map(playFromRow), gsisById));
        },
      });
    },
  };
}

module.exports = { createRatQbRunner };
