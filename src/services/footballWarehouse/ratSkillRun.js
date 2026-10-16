"use strict";

const { createMetricRunWriter } = require("./metricRunWriter");
const { FORMULA_VERSION, SPECS, aggregateSkillPlays, computeSkillGrades, metricConstants } = require("./ratSkillMetric");

// Regular-season pass and rush plays of one season, through `week` (or the whole season when null).
const PLAYS_SQL = `
  SELECT p.game_id, p.posteam_id, p.receiver_player_id, p.rusher_player_id, p.passer_player_id, p.epa, p.yac_epa, p.success, p.cpoe,
         p.source_row->>'qb_dropback' AS qb_dropback, p.source_row->>'interception' AS interception,
         p.source_row->>'pass_attempt' AS pass_attempt, p.source_row->>'rush_attempt' AS rush_attempt,
         p.source_row->>'sack' AS sack, p.source_row->>'qb_scramble' AS qb_scramble,
         p.source_row->>'two_point_attempt' AS two_point, p.source_row->>'complete_pass' AS complete_pass,
         p.source_row->>'cp' AS cp, p.source_row->>'yards_gained' AS yards_gained, p.source_row->>'air_yards' AS air_yards,
         p.source_row->>'yardline_100' AS yardline_100, p.source_row->>'fumble_lost' AS fumble_lost,
         p.source_row->>'fumbled_1_player_id' AS fumbled_gsis_id
    FROM football.nfl_plays p
    JOIN football.nfl_games g ON g.season = p.season AND g.game_id = p.game_id
   WHERE p.season = $1 AND g.game_type = 'REG' AND ($2::integer IS NULL OR p.week <= $2::integer)
     AND p.epa IS NOT NULL
     AND (p.source_row->>'pass_attempt' IN ('1', '1.0') OR p.source_row->>'rush_attempt' IN ('1', '1.0') OR p.source_row->>'qb_dropback' IN ('1', '1.0'))`;

const INPUTS_SQL = `
  SELECT p.ingest_event_id, count(*)::integer AS play_count
    FROM football.nfl_plays p
    JOIN football.nfl_games g ON g.season = p.season AND g.game_id = p.game_id
   WHERE p.season = $1 AND g.game_type = 'REG' AND ($2::integer IS NULL OR p.week <= $2::integer)
   GROUP BY p.ingest_event_id ORDER BY p.ingest_event_id`;

const PLAYERS_SQL = "SELECT player_id, gsis_id, football_position FROM football.football_players WHERE football_position IN ('QB', 'RB', 'FB', 'WR', 'TE')";

const IDENTITY_SQL = `
  SELECT (SELECT md5(COALESCE(string_agg(player_id || ':' || coalesce(gsis_id, '') || ':' || football_position, ',' ORDER BY player_id), ''))
            FROM football.football_players WHERE football_position IN ('QB', 'RB', 'FB', 'WR', 'TE')) AS players_hash,
         (SELECT md5(COALESCE(string_agg(game_id || ':' || game_type, ',' ORDER BY game_id), ''))
            FROM football.nfl_games WHERE season = $1) AS games_hash`;

const play = (r) => ({
  gameId: r.game_id, posteamId: r.posteam_id, receiverId: r.receiver_player_id, rusherId: r.rusher_player_id,
  epa: r.epa, yacEpa: r.yac_epa, success: r.success, passAttempt: r.pass_attempt, rushAttempt: r.rush_attempt,
  sack: r.sack, qbScramble: r.qb_scramble, twoPoint: r.two_point, completePass: r.complete_pass, cp: r.cp,
  yardsGained: r.yards_gained, airYards: r.air_yards, yardline100: r.yardline_100, fumbleLost: r.fumble_lost,
  fumbledGsisId: r.fumbled_gsis_id, passerId: r.passer_player_id, qbDropback: r.qb_dropback, interception: r.interception,
  cpoe: r.cpoe,
});

function createRatSkillRunner({ pool, transactionTimeouts } = {}) {
  const writer = createMetricRunWriter({ pool, transactionTimeouts });
  return {
    /** One metric run per position (RB, WR, TE). Returns { RB: result, WR: result, TE: result }. */
    async run({ season, week = null }) {
      const results = {};
      for (const position of Object.keys(SPECS)) {
        results[position] = await writer.writeRun({
          metricName: SPECS[position].metricName,
          formulaVersion: FORMULA_VERSION,
          season,
          week,
          async resolveInputs(client) {
            const inputs = await client.query({ name: "rat-skill-inputs-v1", text: INPUTS_SQL, values: [season, week] });
            const identity = await client.query({ name: "rat-skill-identity-v1", text: IDENTITY_SQL, values: [season] });
            return {
              ingestEventIds: inputs.rows.map((row) => Number(row.ingest_event_id)),
              parameters: {
                ...metricConstants(position),
                players_hash: identity.rows[0].players_hash,
                game_types_hash: identity.rows[0].games_hash,
                scope: { season_type: "REG", through_week: week },
                play_count: inputs.rows.reduce((sum, row) => sum + row.play_count, 0),
              },
            };
          },
          async computeValues(client) {
            const players = await client.query({ name: "rat-skill-players-v1", text: PLAYERS_SQL });
            const positions = new Map(players.rows.map((r) => [r.player_id, { position: r.football_position === "FB" ? "RB" : r.football_position, gsis: r.gsis_id }]));
            const plays = await client.query({ name: "rat-skill-plays-v1", text: PLAYS_SQL, values: [season, week] });
            return computeSkillGrades(position, aggregateSkillPlays(plays.rows.map(play), positions), positions);
          },
        });
      }
      return results;
    },
  };
}

module.exports = { createRatSkillRunner };
