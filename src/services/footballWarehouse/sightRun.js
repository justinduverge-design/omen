"use strict";

const { createMetricRunWriter } = require("./metricRunWriter");
const { aggregateSkillPlays } = require("./ratSkillMetric");
const { VERSION, computeSight } = require("./sightV1");

const METRIC_NAME = "omen_sight";

// A change to the fitted weights must recompute every week, so their fingerprint is part of each run's inputs.
const WEIGHTS_SHA = require("node:crypto").createHash("sha256")
  .update(require("node:fs").readFileSync(require.resolve("./sight-weights.v1.json"))).digest("hex");

// The same play selection RAT-RB/WR/TE use, plus the week so the run can stop at the through-week.
const PLAYS_SQL = `
  SELECT p.week, p.game_id, p.posteam_id, p.receiver_player_id, p.rusher_player_id, p.passer_player_id, p.epa, p.yac_epa, p.success, p.cpoe,
         p.source_row->>'qb_dropback' AS qb_dropback, p.source_row->>'interception' AS interception,
         p.source_row->>'pass_attempt' AS pass_attempt, p.source_row->>'rush_attempt' AS rush_attempt,
         p.source_row->>'sack' AS sack, p.source_row->>'qb_scramble' AS qb_scramble,
         p.source_row->>'two_point_attempt' AS two_point, p.source_row->>'complete_pass' AS complete_pass,
         p.source_row->>'cp' AS cp, p.source_row->>'yards_gained' AS yards_gained, p.source_row->>'air_yards' AS air_yards,
         p.source_row->>'yardline_100' AS yardline_100, p.source_row->>'fumble_lost' AS fumble_lost,
         p.source_row->>'fumbled_1_player_id' AS fumbled_gsis_id
    FROM football.nfl_plays p
    JOIN football.nfl_games g ON g.season = p.season AND g.game_id = p.game_id
   WHERE p.season = $1 AND g.game_type = 'REG' AND p.week <= $2 AND p.epa IS NOT NULL
     AND (p.source_row->>'pass_attempt' IN ('1', '1.0') OR p.source_row->>'rush_attempt' IN ('1', '1.0') OR p.source_row->>'qb_dropback' IN ('1', '1.0'))`;

const LATEST_WEEK_SQL = `
  SELECT max(p.week)::integer AS week FROM football.nfl_plays p
    JOIN football.nfl_games g ON g.season = p.season AND g.game_id = p.game_id
   WHERE p.season = $1 AND g.game_type = 'REG'`;

const INPUTS_SQL = `
  SELECT p.ingest_event_id FROM football.nfl_plays p
    JOIN football.nfl_games g ON g.season = p.season AND g.game_id = p.game_id
   WHERE p.season = $1 AND g.game_type = 'REG' AND p.week <= $2
   GROUP BY p.ingest_event_id ORDER BY p.ingest_event_id`;

const PPG_SQL = `
  SELECT player_id, avg(fantasy_points_ppr)::float8 AS ppg FROM football.nfl_player_weekly_stats
   WHERE season = $1 AND season_type = 'REG' AND week <= $2 GROUP BY player_id`;

const PLAYERS_SQL = "SELECT player_id, gsis_id, football_position FROM football.football_players WHERE football_position IN ('QB', 'RB', 'FB', 'WR', 'TE')";

const play = (r) => ({
  gameId: r.game_id, posteamId: r.posteam_id, receiverId: r.receiver_player_id, rusherId: r.rusher_player_id,
  epa: r.epa, yacEpa: r.yac_epa, success: r.success, passAttempt: r.pass_attempt, rushAttempt: r.rush_attempt,
  sack: r.sack, qbScramble: r.qb_scramble, twoPoint: r.two_point, completePass: r.complete_pass, cp: r.cp,
  yardsGained: r.yards_gained, airYards: r.air_yards, yardline100: r.yardline_100, fumbleLost: r.fumble_lost,
  fumbledGsisId: r.fumbled_gsis_id, passerId: r.passer_player_id, qbDropback: r.qb_dropback, interception: r.interception,
  cpoe: r.cpoe,
});

function createSightRunner({ pool, transactionTimeouts } = {}) {
  const writer = createMetricRunWriter({ pool, transactionTimeouts });
  return {
    /**
     * Sight for every played week of the season (or one `week`). One run per (season, week); a week whose
     * inputs did not change is left as it is, so the daily run only computes what is new.
     */
    async run({ season, week = null }) {
      if (week != null) return runWeek(season, week);
      const latest = await pool.query({ name: "sight-latest-week-v1", text: LATEST_WEEK_SQL, values: [season] });
      const last = latest.rows[0]?.week ?? null;
      if (!Number.isInteger(last) || last < 1) return { state: "skipped", reason: "no_regular_season_plays" };
      let valueCount = 0;
      let state = "unchanged";
      for (let w = 1; w <= Math.min(last, 18); w += 1) {
        const r = await runWeek(season, w);
        if (r.state === "succeeded") state = "succeeded";
        if (w === last) valueCount = r.valueCount ?? 0;
      }
      return { state, valueCount, throughWeek: last };
    },
  };

  async function runWeek(season, through) {
      return writer.writeRun({
        metricName: METRIC_NAME,
        formulaVersion: VERSION,
        season,
        week: through,
        async resolveInputs(client) {
          const inputs = await client.query({ name: "sight-inputs-v1", text: INPUTS_SQL, values: [season, through] });
          return {
            ingestEventIds: inputs.rows.map((row) => Number(row.ingest_event_id)),
            parameters: { metric: "SIGHT", version: VERSION, weights_sha256: WEIGHTS_SHA, scope: { season_type: "REG", through_week: through } },
          };
        },
        async computeValues(client) {
          const players = await client.query({ name: "sight-players-v1", text: PLAYERS_SQL });
          const positions = new Map(players.rows.map((r) => [r.player_id, { position: r.football_position === "FB" ? "RB" : r.football_position, gsis: r.gsis_id }]));
          const plays = await client.query({ name: "sight-plays-v1", text: PLAYS_SQL, values: [season, through] });
          const ppg = await client.query({ name: "sight-ppg-v1", text: PPG_SQL, values: [season, through] });
          return computeSight({
            season,
            week: through,
            aggregates: aggregateSkillPlays(plays.rows.map(play), positions),
            positions,
            ppgToDate: new Map(ppg.rows.map((r) => [r.player_id, Number(r.ppg)])),
          });
        },
      });
  }
}

module.exports = { createSightRunner, METRIC_NAME };
