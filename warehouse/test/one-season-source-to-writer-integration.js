"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const { Pool } = require("pg");
const { adaptPlayerWeeklyCsv } = require("../../src/services/footballWarehouse/playerWeeklySource");
const { createPlayerWeeklyWriter, WarehouseIngestError } = require("../../src/services/footballWarehouse/playerWeeklyWriter");

const SOURCE_URL = "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2026.csv";

function sourceRef(raw) {
  return `sha256:${crypto.createHash("sha256").update(raw).digest("hex")}`;
}

function writeInput(raw, runId, log) {
  const playerIdByGsis = new Map([["00-0000001", "omen:player:fixture-qb"]]);
  const adapted = adaptPlayerWeeklyCsv({
    raw,
    season: 2026,
    playerIdByGsis,
    sourceUrl: SOURCE_URL,
    runId,
  });
  for (const unmatched of adapted.unmatched) log.warn("unmatched GSIS skipped", unmatched);
  return {
    season: 2026,
    receipt: adapted.receipt,
    rows: adapted.rows,
    unmatchedRows: adapted.unmatchedRows,
  };
}

async function seedReferences(pool) {
  const receipt = await pool.query(`
    INSERT INTO football.warehouse_ingest_events
      (run_id, dataset, season, rights_basis, source_url, source_ref, source_bytes,
       source_rows, state, finished_at)
    VALUES
      ('one-season-prerequisites', 'players', 2026, 'nflverse_open_data',
       'https://github.com/nflverse/fixture-prerequisites',
       'sha256:${"a".repeat(64)}', 128, 1, 'succeeded', clock_timestamp())
    RETURNING id
  `);
  const receiptId = receipt.rows[0].id;
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
    VALUES ('omen:player:fixture-qb', '00-0000001', 'Doe, Jane', 'QB', $1)
  `, [receiptId]);
  await pool.query(`
    INSERT INTO football.nfl_games
      (season, game_id, week, game_type, away_team_id, home_team_id, ingest_event_id)
    VALUES (2026, '2026_01_BUF_MIA', 1, 'REG', 'omen:team:buf', 'omen:team:mia', $1)
  `, [receiptId]);
}

async function readFact(pool) {
  const result = await pool.query(`
    SELECT facts.passing_yards, facts.rushing_yards, facts.fantasy_points_ppr,
           facts.source_row, facts.stats, receipts.run_id, receipts.source_ref,
           receipts.source_bytes, receipts.source_rows, receipts.metadata
    FROM football.nfl_player_weekly_stats facts
    JOIN football.warehouse_ingest_events receipts ON receipts.id = facts.ingest_event_id
    WHERE facts.season = 2026 AND facts.week = 1
      AND facts.player_id = 'omen:player:fixture-qb'
  `);
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function main() {
  const [socket, originalPath, correctedPath] = process.argv.slice(2);
  if (!socket || !originalPath || !correctedPath) throw new Error("socket and fixture paths are required");
  const originalRaw = fs.readFileSync(originalPath);
  const correctedRaw = fs.readFileSync(correctedPath);
  const warnings = [];
  const log = { warn: (...args) => warnings.push(args) };
  const pool = new Pool({ host: socket, user: "postgres", database: "postgres", max: 2 });

  try {
    await seedReferences(pool);
    // This deliberately tiny fixture contains one matched and one unmatched row. Production uses
    // the writer's fail-closed 5% default; the fixture raises only its local proof threshold.
    const writer = createPlayerWeeklyWriter({ pool, maxUnmatchedRatio: 0.5 });
    const original = writeInput(originalRaw, "one-season-original", log);
    assert.equal(original.rows.length, 1, "only the matched GSIS row is admitted");
    assert.equal(original.unmatchedRows, 1);
    assert.equal(warnings.length, 1, "unmatched GSIS is logged once");
    assert.equal(warnings[0][1].providerId, "00-9999999");
    assert.equal(warnings[0][1].reason, "gsis_id_not_in_crosswalk");

    const first = await writer.writeSeason(original);
    assert.equal(first.state, "succeeded");
    let stored = await readFact(pool);
    assert.equal(stored.passing_yards, null, "blank numeric remains NULL");
    assert.equal(stored.rushing_yards, null, "NA numeric remains NULL");
    assert.equal(stored.source_row.player_display_name, "Doe, Jane", "quoted comma survives parsing and JSON storage");
    assert.equal(stored.source_ref, sourceRef(originalRaw), "receipt hash covers exact fixture bytes");
    assert.equal(Number(stored.source_bytes), originalRaw.length, "receipt records exact fixture byte length");
    assert.equal(Number(stored.source_rows), 2);
    assert.equal(Number(stored.metadata.unmatched_rows), 1);
    assert.match(stored.metadata.schema_fingerprint, /^sha256:[0-9a-f]{64}$/);
    assert.ok(stored.metadata.source_columns.includes("player_id"));

    const unchanged = await writer.writeSeason(original);
    assert.deepEqual(unchanged, {
      state: "unchanged",
      ingestEventId: first.ingestEventId,
      sourceRows: 2,
      writtenRows: 1,
    });

    const corrected = writeInput(correctedRaw, "one-season-corrected", log);
    await pool.query(`
      CREATE FUNCTION pg_temp.reject_corrected_fixture() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.passing_yards = 310 THEN RAISE EXCEPTION 'intentional corrected-source failure'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER reject_corrected_fixture
        BEFORE INSERT ON football.nfl_player_weekly_stats
        FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_corrected_fixture()
    `);
    await assert.rejects(
      writer.writeSeason(corrected),
      (error) => error instanceof WarehouseIngestError,
    );
    stored = await readFact(pool);
    assert.equal(stored.run_id, "one-season-original", "failed correction rolls back season replacement");
    assert.equal(stored.passing_yards, null);

    await pool.query("DROP TRIGGER reject_corrected_fixture ON football.nfl_player_weekly_stats");
    const replaced = await writer.writeSeason(corrected);
    assert.equal(replaced.state, "succeeded");
    stored = await readFact(pool);
    assert.equal(stored.run_id, "one-season-corrected");
    assert.equal(Number(stored.passing_yards), 310);
    assert.equal(Number(stored.fantasy_points_ppr), 27.4);
    assert.equal(stored.source_ref, sourceRef(correctedRaw));
    assert.equal(Number(stored.source_bytes), correctedRaw.length);
    assert.equal(stored.source_row.player_display_name, "Doe, Jane");
    assert.equal(stored.stats.passing_yards, 310);

    const counts = await pool.query(`
      SELECT
        (SELECT count(*)::integer FROM football.nfl_player_weekly_stats WHERE season = 2026) facts,
        (SELECT count(*)::integer FROM football.warehouse_ingest_events
          WHERE run_id = 'one-season-corrected' AND state = 'succeeded') corrected_receipts
    `);
    assert.deepEqual(counts.rows[0], { facts: 1, corrected_receipts: 1 });
    console.log("VERIFIED one-season source adapter -> Node writer -> PostgreSQL 17");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "one-season integration failed");
  process.exitCode = 1;
});
