"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const { Pool } = require("pg");
const { TEAMS } = require("../../src/services/footballIntelligence/nflTeams");
const {
  adaptSchedulesCsv,
  REQUIRED_COLUMNS,
  SCHEDULES_SOURCE_URL,
} = require("../../src/services/footballWarehouse/scheduleSource");
const { createTeamWriter } = require("../../src/services/footballWarehouse/teamWriter");
const {
  createScheduleWriter,
} = require("../../src/services/footballWarehouse/scheduleWriter");
const { adaptPlayerWeeklyCsv } = require("../../src/services/footballWarehouse/playerWeeklySource");
const { createPlayerWeeklyWriter } = require("../../src/services/footballWarehouse/playerWeeklyWriter");
const {
  adaptPlayersCsv,
  PLAYERS_SOURCE_URL,
} = require("../../src/services/footballWarehouse/playerIdentitySource");
const { createPlayerIdentityWriter } = require("../../src/services/footballWarehouse/playerIdentityWriter");
const { createCurrentSeasonIngest } = require("../../src/services/footballWarehouse/currentSeasonIngest");

const PLAYER_SOURCE_URL =
  "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2026.csv";

function scheduleCsv() {
  const teams = Object.keys(TEAMS);
  const ordered = ["BUF", "MIA", ...teams.filter((team) => team !== "BUF" && team !== "MIA")];
  const rows = [];
  for (let week = 1; week <= 15; week += 1) {
    for (let index = 0; index < ordered.length; index += 2) {
      const away = ordered[index];
      const home = ordered[index + 1];
      const values = {
        game_id: `2026_${String(week).padStart(2, "0")}_${away}_${home}`,
        season: "2026", game_type: "REG", week: String(week), gameday: `2026-09-${9 + week}`,
        gametime: "13:00", away_team: away, away_score: "20", home_team: home,
        home_score: "17", overtime: "0", stadium: "Fixture Field", location: "Home",
        roof: "outdoors", surface: "grass", temp: "70", wind: "5", away_rest: "7",
        home_rest: "7", div_game: "false", spread_line: "-2.5", total_line: "44.5",
        away_moneyline: "110", home_moneyline: "-130", away_coach: "Away Coach",
        home_coach: "Home Coach",
      };
      rows.push(REQUIRED_COLUMNS.map((column) => values[column] ?? "").join(","));
    }
  }
  return Buffer.from([REQUIRED_COLUMNS.join(","), ...rows].join("\n"));
}

async function main() {
  const [socket, playerFixture] = process.argv.slice(2);
  if (!socket || !playerFixture) throw new Error("socket and player fixture are required");
  const pool = new Pool({ host: socket, user: "postgres", database: "postgres", max: 2 });
  try {
    const scheduleRaw = scheduleCsv();
    const playersRaw = Buffer.from([
      "gsis_id,display_name,first_name,last_name,position,birth_date",
      '00-0000001,"Doe, Jane",Jane,Doe,QB,1990-01-01',
    ].join("\n"));
    const weeklyRaw = fs.readFileSync(playerFixture);
    const runner = createCurrentSeasonIngest({
      acquireSchedules: async () => ({ raw: scheduleRaw, sourceUrl: SCHEDULES_SOURCE_URL }),
      adaptSchedules: adaptSchedulesCsv,
      acquirePlayers: async () => ({ raw: playersRaw, sourceUrl: PLAYERS_SOURCE_URL }),
      adaptPlayers: adaptPlayersCsv,
      acquirePlayerWeekly: async () => ({ raw: weeklyRaw, sourceUrl: PLAYER_SOURCE_URL }),
      adaptPlayerWeekly: adaptPlayerWeeklyCsv,
      teamWriter: createTeamWriter({ pool }),
      scheduleWriter: createScheduleWriter({ pool }),
      playerWriter: createPlayerIdentityWriter({ pool, minPlayerRows: 1 }),
      playerWeeklyWriter: createPlayerWeeklyWriter({ pool, maxUnmatchedRatio: 0.5 }),
    });
    const first = await runner.run({ season: 2026 });
    assert.equal(first.stages.teams.writtenTeams, 32);
    assert.equal(first.stages.schedules.writtenGames, 240);
    assert.equal(first.stages.players.writtenPlayers, 1);
    assert.equal(first.stages.playerWeekly.writtenRows, 1);
    assert.equal(first.unmatchedRows, 1);

    const joined = await pool.query(`
      SELECT f.week,f.team_id,f.opponent_team_id,g.game_id
      FROM football.nfl_player_weekly_stats f
      JOIN football.nfl_games g ON g.season=f.season AND g.game_id=f.game_id
      WHERE f.player_id='omen:player:gsis.00-0000001'
    `);
    assert.deepEqual(joined.rows, [{
      week: 1, team_id: "omen:team:buf", opponent_team_id: "omen:team:mia",
      game_id: "2026_01_BUF_MIA",
    }]);

    const retry = await runner.run({ season: 2026 });
    assert.deepEqual(Object.values(retry.stages).map((stage) => stage.state),
      ["unchanged", "unchanged", "unchanged", "unchanged"]);

    const correction = adaptSchedulesCsv({
      raw: Buffer.concat([scheduleCsv(), Buffer.from("\n")]), sourceUrl: SCHEDULES_SOURCE_URL,
      runId: "schedule-chain-correction", season: 2026,
    });
    const refreshed = await createScheduleWriter({ pool }).writeSeason({
      receipt: correction.receipt, season: 2026, gameRows: correction.gameRows,
    });
    assert.equal(refreshed.state, "succeeded");
    const preserved = await pool.query(`SELECT
      (SELECT count(*)::integer FROM football.nfl_games WHERE season=2026) AS games,
      (SELECT count(*)::integer FROM football.nfl_player_weekly_stats WHERE season=2026) AS facts
    `);
    assert.deepEqual(preserved.rows[0], { games: 240, facts: 1 });
    const terminal = await pool.query(`SELECT
      count(*) FILTER (WHERE state='started')::integer AS started,
      count(*) FILTER (WHERE state='succeeded')::integer AS succeeded
      FROM football.warehouse_ingest_events`);
    assert.deepEqual(terminal.rows[0], { started: 0, succeeded: 5 });
    console.log("VERIFIED current-season runner -> canonical teams/games/players/player-week PostgreSQL 17 chain");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "schedule integration failed");
  process.exitCode = 1;
});
