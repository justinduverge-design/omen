"use strict";

const assert = require("node:assert/strict");
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
const {
  adaptPlayersCsv,
  PLAYERS_SOURCE_URL,
} = require("../../src/services/footballWarehouse/playerIdentitySource");
const { createPlayerIdentityWriter } = require("../../src/services/footballWarehouse/playerIdentityWriter");

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
  const [socket] = process.argv.slice(2);
  if (!socket) throw new Error("socket is required");
  const pool = new Pool({ host: socket, user: "postgres", database: "postgres", max: 2 });
  try {
    const raw = scheduleCsv();
    const adapt = (buffer, runId) => adaptSchedulesCsv({ raw: buffer, sourceUrl: SCHEDULES_SOURCE_URL, runId, season: 2026 });
    const base = adapt(raw, "schedule-a");
    await createTeamWriter({ pool }).writeSnapshot({ receipt: { ...base.receipt, runId: "teams-a" }, teamRows: base.teamRows });
    await createScheduleWriter({ pool }).writeSeason({ receipt: base.receipt, season: 2026, gameRows: base.gameRows });

    // One player and one dependent fact (a weekly roster row) so the schedule is "depended on".
    const players = adaptPlayersCsv({
      raw: Buffer.from(["gsis_id,display_name,first_name,last_name,position,birth_date", '00-0000001,"Doe, Jane",Jane,Doe,QB,1990-01-01'].join("\n")),
      sourceUrl: PLAYERS_SOURCE_URL, runId: "players-a",
    });
    await createPlayerIdentityWriter({ pool, minPlayerRows: 1 }).writeSnapshot({ receipt: players.receipt, players: players.players, playerIds: players.playerIds });
    await pool.query(`INSERT INTO football.nfl_weekly_rosters (season,week,team_id,player_id,ingest_event_id)
      SELECT 2026,1,'omen:team:buf','omen:player:gsis.00-0000001',max(id) FROM football.warehouse_ingest_events`);

    // Another season's game exists (the production backfill state).
    await pool.query(`INSERT INTO football.nfl_games (season,game_id,week,game_type,away_team_id,home_team_id,ingest_event_id)
      SELECT 2025,'2025_01_BUF_MIA',week,game_type,away_team_id,home_team_id,ingest_event_id
      FROM football.nfl_games WHERE season=2026 AND game_id='2026_01_BUF_MIA'`);

    // 1) A nonstructural source change (different bytes, same games) with dependent facts must still be accepted,
    //    and the other season's game must not count as a game that disappeared.
    const changed = adapt(Buffer.concat([raw, Buffer.from("\n")]), "schedule-b");
    const refreshed = await createScheduleWriter({ pool }).writeSeason({ receipt: changed.receipt, season: 2026, gameRows: changed.gameRows });
    assert.equal(refreshed.state, "succeeded");
    const other = await pool.query("SELECT count(*)::integer AS n FROM football.nfl_games WHERE season=2025");
    assert.equal(other.rows[0].n, 1);

    // 2) A real structural change (a game disappears from the source) must still fail closed.
    //    Swapping home and away for one game keeps the season complete but changes its identity.
    const lines = raw.toString("utf8").split("\n");
    const header = lines[0].split(",");
    const [idCol, awayCol, homeCol] = ["game_id", "away_team", "home_team"].map((name) => header.indexOf(name));
    const swapped = lines.map((line) => {
      const cells = line.split(",");
      if (cells[idCol] !== "2026_01_BUF_MIA") return line;
      cells[idCol] = "2026_01_MIA_BUF";
      [cells[awayCol], cells[homeCol]] = [cells[homeCol], cells[awayCol]];
      return cells.join(",");
    });
    const moved = Buffer.from(swapped.join("\n"));
    const structural = adapt(moved, "schedule-c");
    await assert.rejects(
      createScheduleWriter({ pool }).writeSeason({ receipt: structural.receipt, season: 2026, gameRows: structural.gameRows }),
      (error) => error.code === "dependent_facts_exist",
    );
    console.log("VERIFIED schedule structural diff compares only the season being written (and still fails closed on a real change)");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? `${error.code || ""} ${error.message}` : "schedule structural-diff integration failed");
  process.exitCode = 1;
});
