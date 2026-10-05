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
  WarehouseScheduleIngestError,
} = require("../../src/services/footballWarehouse/scheduleWriter");
const { adaptPlayerWeeklyCsv } = require("../../src/services/footballWarehouse/playerWeeklySource");
const { createPlayerWeeklyWriter } = require("../../src/services/footballWarehouse/playerWeeklyWriter");

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

async function seedPlayer(pool) {
  const event = await pool.query(`
    INSERT INTO football.warehouse_ingest_events
      (run_id,dataset,season,rights_basis,source_url,source_ref,source_bytes,source_rows,state,finished_at)
    VALUES ('schedule-chain-player','players',2026,'nflverse_open_data',
      'https://github.com/nflverse/fixture-player','sha256:${"a".repeat(64)}',1,1,
      'succeeded',clock_timestamp()) RETURNING id
  `);
  await pool.query(`
    INSERT INTO football.football_players
      (player_id,gsis_id,display_name,football_position,ingest_event_id)
    VALUES ('omen:player:fixture-qb','00-0000001','Doe, Jane','QB',$1)
  `, [event.rows[0].id]);
}

async function main() {
  const [socket, playerFixture] = process.argv.slice(2);
  if (!socket || !playerFixture) throw new Error("socket and player fixture are required");
  const pool = new Pool({ host: socket, user: "postgres", database: "postgres", max: 2 });
  try {
    const schedule = adaptSchedulesCsv({
      raw: scheduleCsv(), sourceUrl: SCHEDULES_SOURCE_URL,
      runId: "schedule-chain", season: 2026,
    });
    const teams = await createTeamWriter({ pool }).writeSnapshot({
      receipt: schedule.receipt, teamRows: schedule.teamRows,
    });
    assert.equal(teams.writtenTeams, 32);
    const games = await createScheduleWriter({ pool }).writeSeason({
      receipt: schedule.receipt, season: 2026, gameRows: schedule.gameRows,
    });
    assert.equal(games.writtenGames, 240);

    await seedPlayer(pool);
    const weekly = adaptPlayerWeeklyCsv({
      raw: fs.readFileSync(playerFixture), season: 2026,
      playerIdByGsis: new Map([["00-0000001", "omen:player:fixture-qb"]]),
      sourceUrl: PLAYER_SOURCE_URL, runId: "schedule-chain-weekly",
    });
    const written = await createPlayerWeeklyWriter({ pool, maxUnmatchedRatio: 0.5 }).writeSeason({
      season: 2026, receipt: weekly.receipt, rows: weekly.rows,
      unmatchedRows: weekly.unmatchedRows,
    });
    assert.equal(written.writtenRows, 1);

    const joined = await pool.query(`
      SELECT f.week,f.team_id,f.opponent_team_id,g.game_id
      FROM football.nfl_player_weekly_stats f
      JOIN football.nfl_games g ON g.season=f.season AND g.game_id=f.game_id
      WHERE f.player_id='omen:player:fixture-qb'
    `);
    assert.deepEqual(joined.rows, [{
      week: 1, team_id: "omen:team:buf", opponent_team_id: "omen:team:mia",
      game_id: "2026_01_BUF_MIA",
    }]);

    const correction = adaptSchedulesCsv({
      raw: Buffer.concat([scheduleCsv(), Buffer.from("\n")]), sourceUrl: SCHEDULES_SOURCE_URL,
      runId: "schedule-chain-correction", season: 2026,
    });
    await assert.rejects(
      createScheduleWriter({ pool }).writeSeason({
        receipt: correction.receipt, season: 2026, gameRows: correction.gameRows,
      }),
      (error) => error instanceof WarehouseScheduleIngestError &&
        error.code === "dependent_facts_exist",
    );
    const preserved = await pool.query(`SELECT
      (SELECT count(*)::integer FROM football.nfl_games WHERE season=2026) AS games,
      (SELECT count(*)::integer FROM football.nfl_player_weekly_stats WHERE season=2026) AS facts
    `);
    assert.deepEqual(preserved.rows[0], { games: 240, facts: 1 });
    console.log("VERIFIED schedules -> canonical teams/games -> player-week PostgreSQL 17 chain");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "schedule integration failed");
  process.exitCode = 1;
});
