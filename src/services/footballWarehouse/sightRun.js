"use strict";

const { createMetricRunWriter } = require("./metricRunWriter");
const { aggregateSkillPlays } = require("./ratSkillMetric");
const { computeSight, weightsFor, phaseOf } = require("./sightV1");
const { weeklyLines, computeKdefSight } = require("./kdefMetric");
const { buildContext, buildRoleContext } = require("./sightContext");

// Every Sight version is computed every day, so versions are graded side by side; SIGHT_VERSION only
// chooses which one the API serves.
const VERSIONS = Object.freeze(["v1", "v2"]);

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

const STATS_SQL = `
  SELECT week, player_id, team_id, opponent_team_id, football_position, fantasy_points_ppr FROM football.nfl_player_weekly_stats
   WHERE season = $1 AND season_type = 'REG' AND week <= $2`;
// Games with weather: recorded weather for played games, otherwise the latest stored forecast (a dome
// forecast is "not applicable", read as a dome).
const GAMES_SQL = `
  SELECT g.week, g.home_team_id, g.away_team_id, g.home_score, g.away_score, g.spread_line, g.total_line,
         CASE WHEN f.status = 'not_applicable' THEN 'dome' ELSE g.roof END AS roof,
         coalesce(g.wind_mph, f.wind_mph) AS wind_mph, coalesce(g.temperature_f, f.temperature_f) AS temperature_f
    FROM football.nfl_games g
    LEFT JOIN LATERAL (SELECT status, wind_mph, temperature_f FROM football.game_weather_forecasts w
                        WHERE w.game_id = g.game_id ORDER BY w.fetched_at DESC LIMIT 1) f ON true
   WHERE g.season = $1 AND g.game_type = 'REG'`;

// Bump when Sight's computation changes without its inputs or weights changing, so every week recomputes.
const SIGHT_CODE_REVISION = "2026-10-17.v2-weather-flex";

// Kicking and defensive plays for K and DEF Sight (v2).
const KDEF_PLAYS_SQL = `
  SELECT p.week, p.game_id, p.posteam_id, p.defteam_id, p.epa, p.play_type,
         p.source_row->>'kicker_player_id' AS kicker_gsis, p.source_row->>'field_goal_attempt' AS fga,
         p.source_row->>'field_goal_result' AS fg_result, p.source_row->>'kick_distance' AS kick_distance,
         p.source_row->>'extra_point_attempt' AS xpa, p.source_row->>'extra_point_result' AS xp_result,
         p.source_row->>'sack' AS sack, p.source_row->>'interception' AS interception,
         p.source_row->>'fumble_lost' AS fumble_lost, p.source_row->>'fumble_recovery_1_team' AS fr_team,
         p.source_row->>'touchdown' AS touchdown, p.source_row->>'td_team' AS td_team, p.source_row->>'safety' AS safety,
         p.source_row->>'qb_dropback' AS qb_dropback
    FROM football.nfl_plays p JOIN football.nfl_games g ON g.season = p.season AND g.game_id = p.game_id
   WHERE p.season = $1 AND g.game_type = 'REG' AND p.week <= $2`;
const ROSTER_STATUS_SQL = "SELECT player_id, roster_status FROM football.nfl_weekly_rosters WHERE season = $1 AND week = $2";
const KICKERS_SQL = "SELECT player_id, gsis_id FROM football.football_players WHERE football_position = 'K' AND gsis_id IS NOT NULL";

const kdefPlay = (r) => ({ week: r.week, gameId: r.game_id, posteamId: r.posteam_id, defteamId: r.defteam_id, epa: r.epa, playType: r.play_type,
  kickerGsis: r.kicker_gsis, fieldGoalAttempt: r.fga, fieldGoalResult: r.fg_result, kickDistance: r.kick_distance,
  extraPointAttempt: r.xpa, extraPointResult: r.xp_result, sack: r.sack, interception: r.interception, fumbleLost: r.fumble_lost,
  fumbleRecoveryTeam: r.fr_team, touchdown: r.touchdown, tdTeam: r.td_team, safety: r.safety, qbDropback: r.qb_dropback });

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

const FLEX_POSITIONS = new Set(["RB", "WR", "TE"]);

/**
 * The flex view: Sight's number is expected fantasy points, one scale for every position, so RB, WR and TE are
 * graded together (0-100) for flex decisions. Mutates and returns the values.
 */
function withFlexGrade(values) {
  const flex = values.filter((v) => FLEX_POSITIONS.has(v.components?.position));
  if (flex.length < 8) return values;
  const pts = flex.map((v) => v.value);
  const m = pts.reduce((a, b) => a + b, 0) / pts.length;
  const sd = Math.sqrt(pts.reduce((a, b) => a + (b - m) ** 2, 0) / pts.length);
  for (const v of flex) v.components.flex_grade = Math.round(Math.min(100, Math.max(0, 50 + 10 * (sd > 1e-9 ? (v.value - m) / sd : 0))) * 10000) / 10000;
  return values;
}

function createSightRunner({ pool, transactionTimeouts } = {}) {
  const writer = createMetricRunWriter({ pool, transactionTimeouts });
  return {
    /**
     * Sight for every played week of the season (or one `week`). One run per (season, week); a week whose
     * inputs did not change is left as it is, so the daily run only computes what is new.
     */
    async run({ season, week = null }) {
      if (week != null) return runWeek(season, week, "v1");
      const latest = await pool.query({ name: "sight-latest-week-v1", text: LATEST_WEEK_SQL, values: [season] });
      const last = latest.rows[0]?.week ?? null;
      if (!Number.isInteger(last) || last < 1) return { state: "skipped", reason: "no_regular_season_plays" };
      let valueCount = 0;
      let state = "unchanged";
      for (let w = 1; w <= Math.min(last, 18); w += 1) for (const version of VERSIONS) {
        const r = await runWeek(season, w, version);
        if (r.state === "succeeded") state = "succeeded";
        if (w === last && version === "v1") valueCount = r.valueCount ?? 0;
      }
      return { state, valueCount, throughWeek: last };
    },
  };

  async function runWeek(season, through, version) {
      return writer.writeRun({
        metricName: METRIC_NAME,
        formulaVersion: version,
        season,
        week: through,
        async resolveInputs(client) {
          const inputs = await client.query({ name: "sight-inputs-v1", text: INPUTS_SQL, values: [season, through] });
          return {
            ingestEventIds: inputs.rows.map((row) => Number(row.ingest_event_id)),
            parameters: { metric: "SIGHT", version, weights_sha256: WEIGHTS_SHA, code_revision: SIGHT_CODE_REVISION, scope: { season_type: "REG", through_week: through } },
          };
        },
        async computeValues(client) {
          const players = await client.query({ name: "sight-players-v1", text: PLAYERS_SQL });
          const positions = new Map(players.rows.map((r) => [r.player_id, { position: r.football_position === "FB" ? "RB" : r.football_position, gsis: r.gsis_id }]));
          const plays = await client.query({ name: "sight-plays-v1", text: PLAYS_SQL, values: [season, through] });
          const ppg = await client.query({ name: "sight-ppg-v1", text: PPG_SQL, values: [season, through] });
          let context = null;
          let role = null;
          const allPlays = plays.rows.map(play);
          if (version === "v2") {
            const stats = await client.query({ name: "sight-stats-v1", text: STATS_SQL, values: [season, through] });
            const games = await client.query({ name: "sight-games-v1", text: GAMES_SQL, values: [season] });
            const built = buildContext(stats.rows, games.rows);
            context = (id, position) => built.contextFor(id, position, through);
            const statuses = await client.query({ name: "sight-roster-status-v1", text: ROSTER_STATUS_SQL, values: [season, through + 1] });
            const teamWeeks = new Map();
            for (const r of stats.rows) { if (!r.team_id) continue; if (!teamWeeks.has(r.player_id)) teamWeeks.set(r.player_id, []); teamWeeks.get(r.player_id).push([r.week, r.team_id]); }
            role = buildRoleContext({
              seasonAgg: aggregateSkillPlays(allPlays, positions),
              recentAgg: aggregateSkillPlays(plays.rows.filter((r) => r.week >= through - 2).map(play), positions),
              positions,
              statusNext: new Map(statuses.rows.map((r) => [r.player_id, r.roster_status])),
              teamOf: (id) => (teamWeeks.get(id) || []).sort((a, b) => b[0] - a[0])[0]?.[1] || null,
            });
          }
          const skill = computeSight({
            season,
            week: through,
            aggregates: aggregateSkillPlays(allPlays, positions),
            positions,
            ppgToDate: new Map(ppg.rows.map((r) => [r.player_id, Number(r.ppg)])),
            context,
            role,
            version,
          });
          if (version !== "v2") return skill;
          const kickers = new Map((await client.query({ name: "sight-kickers-v1", text: KICKERS_SQL })).rows.map((r) => [r.gsis_id, r.player_id]));
          const kdefPlays = (await client.query({ name: "sight-kdef-plays-v1", text: KDEF_PLAYS_SQL, values: [season, through] })).rows.map(kdefPlay);
          const gameRows = (await client.query({ name: "sight-games-v1", text: GAMES_SQL, values: [season] })).rows;
          const scored = gameRows.filter((g) => g.week <= through).map((g) => ({ week: g.week, homeTeamId: g.home_team_id, awayTeamId: g.away_team_id, homeScore: g.home_score, awayScore: g.away_score }));
          const lines = weeklyLines(kdefPlays, scored, kickers);
          const kickerTeam = new Map();
          for (const p of kdefPlays) { const id = p.kickerGsis ? kickers.get(p.kickerGsis) : null; if (id && p.posteamId) kickerTeam.set(`${id}|${p.week}`, p.posteamId); }
          const kickerTeamByWeek = (id, week) => { for (let w = week; w >= 1; w -= 1) { const t = kickerTeam.get(`${id}|${w}`); if (t) return t; } return null; };
          const kdef = computeKdefSight({ season, week: through, lines, gameRows, kickerTeamByWeek, weightsFor, phase: phaseOf(through) });
          const values = withFlexGrade([...skill.values, ...kdef.values]);
          return { values, summary: { ...skill.summary, positions: { ...skill.summary.positions, ...kdef.summary } } };
        },
      });
  }
}

module.exports = { createSightRunner, METRIC_NAME, withFlexGrade };
