"use strict";

const assert = require("node:assert/strict");
const { Pool } = require("pg");
const { createPlayerWeeklyWriter, WarehouseIngestError } = require("../../src/services/footballWarehouse/playerWeeklyWriter");

async function main() {
  const socket = process.argv[2];
  if (!socket) throw new Error("PostgreSQL socket path is required");
  const pool = new Pool({ host: socket, user: "postgres", database: "postgres", max: 2 });
  try {
    const seed = await pool.query(`
      INSERT INTO football.warehouse_ingest_events
        (run_id, dataset, season, rights_basis, source_url, source_ref, source_bytes,
         source_rows, state, finished_at)
      VALUES
        ('writer-integration-prerequisites', 'players', 2026, 'nflverse_open_data',
         'https://github.com/nflverse/integration-prerequisites',
         'sha256:${"a".repeat(64)}', 128, 3, 'succeeded', clock_timestamp())
      RETURNING id
    `);
    const receiptId = seed.rows[0].id;
    await pool.query(`
      INSERT INTO football.football_teams
        (team_id, nflverse_abbr, display_name, first_season, ingest_event_id)
      VALUES
        ('omen:team:buf', 'BUF', 'Buffalo', 1999, $1),
        ('omen:team:mia', 'MIA', 'Miami', 1999, $1)
    `, [receiptId]);
    await pool.query(`
      INSERT INTO football.football_players
        (player_id, gsis_id, display_name, football_position, ingest_event_id)
      VALUES
        ('omen:player:fixture-qb', '00-0000001', 'Fixture Quarterback', 'QB', $1)
    `, [receiptId]);
    await pool.query(`
      INSERT INTO football.nfl_games
        (season, game_id, week, game_type, away_team_id, home_team_id, ingest_event_id)
      VALUES
        (2026, '2026_01_BUF_MIA', 1, 'REG', 'omen:team:buf', 'omen:team:mia', $1)
    `, [receiptId]);

    const writer = createPlayerWeeklyWriter({ pool });
    const input = {
      season: 2026,
      receipt: {
        runId: "writer-integration-success",
        sourceUrl: "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2026.csv",
        sourceRef: `sha256:${"b".repeat(64)}`,
        sourceBytes: 256,
        sourceRows: 1,
        metadata: {
          schema_fingerprint: `sha256:${"d".repeat(64)}`,
          source_columns: ["player_id", "season", "week"],
        },
      },
      unmatchedRows: 0,
      rows: [{
        season: 2026, week: 1, seasonType: "REG",
        playerId: "omen:player:fixture-qb", teamId: "omen:team:buf",
        opponentTeamId: "omen:team:mia", gameId: "2026_01_BUF_MIA",
        footballPosition: "QB", fantasyPointsPpr: 22.5, passingYards: 275,
        rushingYards: 20, receivingYards: 0, targets: 0, receptions: 0,
        carries: 4, passingAttempts: 31, targetShare: 0,
        stats: { passing_yards: 275, attempts: 31 }, opportunity: {},
        sourceRow: { player_id: "00-0000001", player_display_name: "Fixture Quarterback", week: 1 },
      }],
    };

    const written = await writer.writeSeason(input);
    assert.equal(written.state, "succeeded");
    assert.equal(written.writtenRows, 1);
    const stored = await pool.query(`
      SELECT facts.passing_attempts, facts.source_row, receipts.state, receipts.source_ref
      FROM football.nfl_player_weekly_stats facts
      JOIN football.warehouse_ingest_events receipts ON receipts.id = facts.ingest_event_id
      WHERE facts.season = 2026 AND facts.player_id = 'omen:player:fixture-qb'
    `);
    assert.equal(stored.rowCount, 1);
    assert.equal(Number(stored.rows[0].passing_attempts), 31);
    assert.equal(stored.rows[0].source_row.player_display_name, "Fixture Quarterback");
    assert.equal(stored.rows[0].state, "succeeded");

    const unchanged = await writer.writeSeason(input);
    assert.equal(unchanged.state, "unchanged");
    assert.equal(unchanged.ingestEventId, written.ingestEventId);

    await assert.rejects(writer.writeSeason({
      ...input,
      receipt: { ...input.receipt, runId: "writer-integration-failed", sourceRef: `sha256:${"c".repeat(64)}` },
      rows: [{ ...input.rows[0], playerId: "omen:player:unknown" }],
    }), (error) => error instanceof WarehouseIngestError && error.code === "stage_reference_invalid");

    const aftermath = await pool.query(`
      SELECT
        (SELECT count(*)::integer FROM football.nfl_player_weekly_stats WHERE season = 2026) AS facts,
        (SELECT count(*)::integer FROM football.warehouse_ingest_events
          WHERE run_id = 'writer-integration-failed' AND state = 'failed') AS failures
    `);
    assert.deepEqual(aftermath.rows[0], { facts: 1, failures: 1 });
    console.log("VERIFIED Node player-weekly warehouse writer");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "writer integration failed");
  process.exitCode = 1;
});
