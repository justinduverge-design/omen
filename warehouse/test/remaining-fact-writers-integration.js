"use strict";

const assert = require("node:assert/strict");
const { Pool } = require("pg");
const { createTeamWeeklyWriter } = require("../../src/services/footballWarehouse/teamWeeklyWriter");
const { createWeeklyRosterWriter } = require("../../src/services/footballWarehouse/weeklyRosterWriter");
const { createPlayByPlayWriter, PlayByPlayIngestError } = require("../../src/services/footballWarehouse/playByPlayWriter");
const { sourceUrlForSeason: teamWeeklyUrl } = require("../../src/services/footballWarehouse/teamWeeklySource");
const { sourceUrlForSeason: rosterUrl } = require("../../src/services/footballWarehouse/weeklyRosterSource");
const { sourceUrlForSeason: playUrl } = require("../../src/services/footballWarehouse/playByPlayAcquisition");

const SEASON = 2026;
const hash = (character) => `sha256:${character.repeat(64)}`;

function receipt(runId, sourceUrl, sourceRef, sourceRows = 1) {
  return {
    runId,
    sourceUrl,
    sourceRef,
    sourceBytes: 256,
    sourceRows,
    metadata: {
      schema_fingerprint: hash("f"),
      source_columns: ["season", "week", "game_id"],
    },
  };
}

async function seedDependencies(pool) {
  const seeded = await pool.query(`
    INSERT INTO football.warehouse_ingest_events
      (run_id, dataset, season, rights_basis, source_url, source_ref, source_bytes,
       source_rows, state, finished_at)
    VALUES
      ('remaining-writers-prerequisites', 'players', $1, 'nflverse_open_data',
       'https://github.com/nflverse/integration-prerequisites', $2, 128, 4,
       'succeeded', clock_timestamp())
    RETURNING id
  `, [SEASON, hash("a")]);
  const ingestEventId = seeded.rows[0].id;
  await pool.query(`
    INSERT INTO football.football_teams
      (team_id, nflverse_abbr, display_name, first_season, ingest_event_id)
    VALUES
      ('omen:team:buf', 'BUF', 'Buffalo', 1999, $1),
      ('omen:team:mia', 'MIA', 'Miami', 1999, $1)
  `, [ingestEventId]);
  await pool.query(`
    INSERT INTO football.football_players
      (player_id, gsis_id, display_name, football_position, ingest_event_id)
    VALUES
      ('omen:player:fixture-qb', '00-0000001', 'Fixture Quarterback', 'QB', $1),
      ('omen:player:fixture-wr', '00-0000002', 'Fixture Receiver', 'WR', $1)
  `, [ingestEventId]);
  await pool.query(`
    INSERT INTO football.nfl_games
      (season, game_id, week, game_type, away_team_id, home_team_id,
       away_score, home_score, ingest_event_id)
    VALUES
      ($1, '2026_01_BUF_MIA', 1, 'REG', 'omen:team:buf', 'omen:team:mia', 24, 27, $2)
  `, [SEASON, ingestEventId]);
}

async function verifyTeamWeekly(pool) {
  const writer = createTeamWeeklyWriter({ pool });
  const initial = {
    season: SEASON,
    receipt: receipt("team-week-initial", teamWeeklyUrl(SEASON), hash("b")),
    unmatchedRows: 0,
    rows: [{
      season: SEASON, week: 1, seasonType: "REG", teamId: "omen:team:buf",
      opponentTeamId: "omen:team:mia", gameId: "2026_01_BUF_MIA",
      pointsFor: 24, pointsAgainst: 27, stats: { passing_yards: 275 },
      sourceRow: { team: "BUF", passing_yards: "275" },
    }],
  };
  const written = await writer.writeSeason(initial);
  assert.equal(written.state, "succeeded");
  assert.equal((await writer.writeSeason(initial)).state, "unchanged");

  const corrected = await writer.writeSeason({
    ...initial,
    receipt: receipt("team-week-corrected", teamWeeklyUrl(SEASON), hash("c")),
    rows: [{ ...initial.rows[0], stats: { passing_yards: 281 }, sourceRow: { team: "BUF", passing_yards: "281" } }],
  });
  assert.equal(corrected.state, "succeeded");
  const stored = await pool.query("SELECT points_for, stats, ingest_event_id FROM football.nfl_team_weekly_stats WHERE season=$1", [SEASON]);
  assert.equal(stored.rowCount, 1);
  assert.equal(stored.rows[0].points_for, 24);
  assert.equal(stored.rows[0].stats.passing_yards, 281);
  assert.equal(String(stored.rows[0].ingest_event_id), String(corrected.ingestEventId));

  await assert.rejects(writer.writeSeason({
    ...initial,
    receipt: receipt("team-week-wrong-type", teamWeeklyUrl(SEASON), hash("9")),
    rows: [{ ...initial.rows[0], seasonType: "POST" }],
  }), (error) => error?.code === "stage_integrity_mismatch");

  await assert.rejects(writer.writeSeason({
    ...initial,
    receipt: receipt("team-week-failed", teamWeeklyUrl(SEASON), hash("d")),
    rows: [{ ...initial.rows[0], teamId: "omen:team:missing" }],
  }), (error) => error?.code === "stage_integrity_mismatch");
  const aftermath = await pool.query(`SELECT
    (SELECT count(*)::integer FROM football.nfl_team_weekly_stats WHERE season=$1) facts,
    (SELECT count(*)::integer FROM football.warehouse_ingest_events
      WHERE run_id='team-week-failed' AND state='failed' AND error_code='stage_integrity_mismatch') failures`, [SEASON]);
  assert.deepEqual(aftermath.rows[0], { facts: 1, failures: 1 });
}

async function verifyWeeklyRoster(pool) {
  const writer = createWeeklyRosterWriter({ pool });
  const initial = {
    season: SEASON,
    receipt: receipt("roster-initial", rosterUrl(SEASON), hash("1")),
    unmatchedRows: 0,
    rows: [{
      season: SEASON, week: 1, teamId: "omen:team:buf", playerId: "omen:player:fixture-qb",
      gameType: "REG", footballPosition: "QB", depthPosition: "QB1", jerseyNumber: 17,
      rosterStatus: "ACT", statusDetail: "Active", sourceRow: { gsis_id: "00-0000001", jersey_number: "17" },
    }],
  };
  const written = await writer.writeSeason(initial);
  assert.equal(written.state, "succeeded");
  assert.equal((await writer.writeSeason(initial)).state, "unchanged");

  const corrected = await writer.writeSeason({
    ...initial,
    receipt: receipt("roster-corrected", rosterUrl(SEASON), hash("2")),
    rows: [{ ...initial.rows[0], jerseyNumber: 7, depthPosition: "QB2", sourceRow: { gsis_id: "00-0000001", jersey_number: "7" } }],
  });
  assert.equal(corrected.state, "succeeded");
  const stored = await pool.query("SELECT jersey_number, depth_position, ingest_event_id FROM football.nfl_weekly_rosters WHERE season=$1", [SEASON]);
  assert.equal(stored.rowCount, 1);
  assert.equal(stored.rows[0].jersey_number, 7);
  assert.equal(stored.rows[0].depth_position, "QB2");
  assert.equal(String(stored.rows[0].ingest_event_id), String(corrected.ingestEventId));

  await assert.rejects(writer.writeSeason({
    ...initial,
    receipt: receipt("roster-failed", rosterUrl(SEASON), hash("3")),
    rows: [{ ...initial.rows[0], playerId: "omen:player:missing" }],
  }), (error) => error?.code === "23503");
  const aftermath = await pool.query(`SELECT
    (SELECT count(*)::integer FROM football.nfl_weekly_rosters WHERE season=$1) facts,
    (SELECT count(*)::integer FROM football.warehouse_ingest_events
      WHERE run_id='roster-failed' AND state='failed' AND error_code='23503') failures`, [SEASON]);
  assert.deepEqual(aftermath.rows[0], { facts: 1, failures: 1 });
}

async function verifyPlayByPlay(pool) {
  const writer = createPlayByPlayWriter({ pool });
  const initial = {
    season: SEASON,
    receipt: receipt("plays-initial", playUrl(SEASON), hash("4")),
    unmatchedRows: 0,
    rows: [{
      season: SEASON, gameId: "2026_01_BUF_MIA", playId: 10, week: 1,
      posteamId: "omen:team:buf", defteamId: "omen:team:mia",
      passerPlayerId: "omen:player:fixture-qb", rusherPlayerId: null,
      receiverPlayerId: "omen:player:fixture-wr", playType: "pass", descText: "Fixture completion",
      epa: 0.42, wpa: 0.03, cpoe: 4.5, airEpa: 0.21, yacEpa: 0.21, success: true,
      sourceRow: { game_id: "2026_01_BUF_MIA", play_id: "10", epa: "0.42" },
    }],
  };
  const written = await writer.writeSeason(initial);
  assert.equal(written.state, "succeeded");
  assert.equal((await writer.writeSeason(initial)).state, "unchanged");

  const corrected = await writer.writeSeason({
    ...initial,
    receipt: receipt("plays-corrected", playUrl(SEASON), hash("5")),
    rows: [{ ...initial.rows[0], epa: 0.51, descText: "Corrected completion", sourceRow: { game_id: "2026_01_BUF_MIA", play_id: "10", epa: "0.51" } }],
  });
  assert.equal(corrected.state, "succeeded");
  const stored = await pool.query("SELECT epa, desc_text, source_row, ingest_event_id FROM football.nfl_plays WHERE season=$1", [SEASON]);
  assert.equal(stored.rowCount, 1);
  assert.equal(stored.rows[0].epa, 0.51);
  assert.equal(stored.rows[0].desc_text, "Corrected completion");
  assert.equal(stored.rows[0].source_row.epa, "0.51");
  assert.equal(String(stored.rows[0].ingest_event_id), String(corrected.ingestEventId));

  await assert.rejects(writer.writeSeason({
    ...initial,
    receipt: receipt("plays-failed", playUrl(SEASON), hash("6")),
    rows: [{ ...initial.rows[0], gameId: "2026_01_BUF_NOWHERE" }],
  }), (error) => error instanceof PlayByPlayIngestError && error.code === "stage_reference_invalid");
  const aftermath = await pool.query(`SELECT
    (SELECT count(*)::integer FROM football.nfl_plays WHERE season=$1) facts,
    (SELECT count(*)::integer FROM football.warehouse_ingest_events
      WHERE run_id='plays-failed' AND state='failed' AND error_code='stage_reference_invalid') failures`, [SEASON]);
  assert.deepEqual(aftermath.rows[0], { facts: 1, failures: 1 });
}

async function main() {
  const socket = process.argv[2];
  if (!socket) throw new Error("PostgreSQL socket path is required");
  const pool = new Pool({ host: socket, user: "postgres", database: "postgres", max: 2 });
  try {
    await seedDependencies(pool);
    await verifyTeamWeekly(pool);
    await verifyWeeklyRoster(pool);
    await verifyPlayByPlay(pool);
    const dangling = await pool.query("SELECT count(*)::integer count FROM football.warehouse_ingest_events WHERE state='started'");
    assert.equal(dangling.rows[0].count, 0);
    console.log("VERIFIED PostgreSQL 17 team-week, weekly-roster, and play-by-play writers");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "remaining fact writer integration failed");
  process.exitCode = 1;
});
