"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const { Pool } = require("pg");
const { adaptPlayersCsv } = require("../../src/services/footballWarehouse/playerIdentitySource");
const { createPlayerIdentityWriter } = require("../../src/services/footballWarehouse/playerIdentityWriter");

const SOURCE_URL = "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv";
const ACTIVE_GSIS = "00-0032464";
const ACTIVE_PLAYER_ID = "omen:player:gsis.00-0032464";
const RETIRED_GSIS = "00-0000007";
const RETIRED_PLAYER_ID = "omen:player:gsis.00-0000007";

function sha256(raw) {
  return `sha256:${crypto.createHash("sha256").update(raw).digest("hex")}`;
}

function input(raw, runId) {
  return adaptPlayersCsv({ raw, sourceUrl: SOURCE_URL, runId });
}

async function snapshot(pool) {
  const result = await pool.query(`
    SELECT p.player_id, p.gsis_id, p.display_name, p.first_name, p.last_name,
           p.football_position, p.birth_date::text, p.source_row, i.provider, i.provider_id,
           i.match_method, e.run_id, e.source_ref, e.source_bytes, e.source_rows,
           e.metadata
    FROM football.football_players p
    JOIN football.football_player_ids i
      ON i.player_id = p.player_id AND i.provider = 'gsis'
    JOIN football.warehouse_ingest_events e ON e.id = p.ingest_event_id
    ORDER BY p.player_id
  `);
  return result.rows;
}

async function main() {
  const [socket, originalPath, correctedPath] = process.argv.slice(2);
  if (!socket || !originalPath || !correctedPath) {
    throw new Error("socket and both player fixture paths are required");
  }
  const originalRaw = fs.readFileSync(originalPath);
  const correctedRaw = fs.readFileSync(correctedPath);
  const pool = new Pool({ host: socket, user: "postgres", database: "postgres", max: 2 });

  try {
    const writer = createPlayerIdentityWriter({ pool, minPlayerRows: 1 });
    const original = input(originalRaw, "players-fixture-original");

    assert.equal(original.players.length, 2, "historical players are not filtered from identity authority");
    assert.equal(original.playerIds.length, 2, "each direct GSIS identity gets one source crosswalk");
    assert.equal(original.playerIdByGsis.get(ACTIVE_GSIS), ACTIVE_PLAYER_ID);
    assert.equal(original.playerIdByGsis.get(RETIRED_GSIS), RETIRED_PLAYER_ID);
    assert.equal(original.playerIdByGsis.has("Allen, Josh"), false, "names never become identity-map keys");
    assert.equal(original.playerIdByGsis.has("Retired, Rita"), false, "retired names never become identity-map keys");

    const first = await writer.writeSnapshot({
      receipt: original.receipt,
      players: original.players,
      playerIds: original.playerIds,
    });
    assert.equal(first.state, "succeeded");

    let stored = await snapshot(pool);
    assert.equal(stored.length, 2);
    const active = stored.find((row) => row.gsis_id === ACTIVE_GSIS);
    const retired = stored.find((row) => row.gsis_id === RETIRED_GSIS);
    assert.equal(active.player_id, ACTIVE_PLAYER_ID, "canonical identity retains the GSIS dot");
    assert.equal(retired.player_id, RETIRED_PLAYER_ID, "retired player remains in the full snapshot");
    assert.equal(active.provider, "gsis");
    assert.equal(active.provider_id, ACTIVE_GSIS);
    assert.equal(active.match_method, "source_crosswalk");
    assert.equal(active.source_row.display_name, "Allen, Josh");
    assert.equal(active.source_ref, sha256(originalRaw), "receipt hashes exact source bytes");
    assert.equal(Number(active.source_bytes), originalRaw.length);
    assert.equal(Number(active.source_rows), 2);
    assert.match(active.metadata.schema_fingerprint, /^sha256:[0-9a-f]{64}$/);
    assert.ok(active.metadata.source_columns.includes("gsis_id"));

    const unchanged = await writer.writeSnapshot({
      receipt: original.receipt,
      players: original.players,
      playerIds: original.playerIds,
    });
    assert.equal(unchanged.state, "unchanged");
    assert.equal(unchanged.ingestEventId, first.ingestEventId);

    const corrected = input(correctedRaw, "players-fixture-corrected");
    await pool.query(`
      CREATE FUNCTION pg_temp.reject_corrected_players() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.display_name = 'Allen, Joshua' THEN
          RAISE EXCEPTION 'intentional corrected identity failure';
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER reject_corrected_players
        BEFORE INSERT ON football.football_players
        FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_corrected_players()
    `);
    await assert.rejects(writer.writeSnapshot({
      receipt: corrected.receipt,
      players: corrected.players,
      playerIds: corrected.playerIds,
    }));
    stored = await snapshot(pool);
    assert.equal(stored.length, 2, "failed correction preserves the complete prior snapshot");
    assert.equal(stored.find((row) => row.gsis_id === ACTIVE_GSIS).display_name, "Allen, Josh");
    assert.equal(stored.every((row) => row.run_id === "players-fixture-original"), true);

    await pool.query("DROP TRIGGER reject_corrected_players ON football.football_players");
    const replaced = await writer.writeSnapshot({
      receipt: corrected.receipt,
      players: corrected.players,
      playerIds: corrected.playerIds,
    });
    assert.equal(replaced.state, "succeeded");
    stored = await snapshot(pool);
    assert.equal(stored.length, 2, "corrected source replaces the snapshot atomically");
    assert.equal(stored.find((row) => row.gsis_id === ACTIVE_GSIS).display_name, "Allen, Joshua");
    assert.equal(stored.find((row) => row.gsis_id === ACTIVE_GSIS).source_row.display_name, "Allen, Joshua");
    assert.equal(stored.every((row) => row.run_id === "players-fixture-corrected"), true);
    assert.equal(stored[0].source_ref, sha256(correctedRaw));

    const weeklyReceipt = await pool.query(`
      INSERT INTO football.warehouse_ingest_events
        (run_id, dataset, season, rights_basis, source_url, source_ref, source_bytes,
         source_rows, state, finished_at)
      VALUES
        ('identity-fixture-weekly', 'player_weekly_stats', 2026, 'nflverse_open_data',
         'https://github.com/nflverse/fixture-weekly', $1, 1, 1, 'succeeded', clock_timestamp())
      RETURNING id
    `, [sha256(Buffer.from("weekly"))]);
    const resolvedPlayerId = corrected.playerIdByGsis.get(ACTIVE_GSIS);
    assert.equal(resolvedPlayerId, ACTIVE_PLAYER_ID);
    await pool.query(`
      INSERT INTO football.nfl_player_weekly_stats
        (season, week, season_type, player_id, source_row, ingest_event_id)
      VALUES (2026, 1, 'REG', $1, '{"gsis_id":"00-0032464"}'::jsonb, $2)
    `, [resolvedPlayerId, weeklyReceipt.rows[0].id]);
    const fact = await pool.query(`
      SELECT player_id FROM football.nfl_player_weekly_stats
      WHERE season = 2026 AND week = 1 AND season_type = 'REG'
    `);
    assert.deepEqual(fact.rows, [{ player_id: ACTIVE_PLAYER_ID }],
      "adapter GSIS map supplies an identifier satisfying the weekly fact foreign key");

    console.log("VERIFIED player identity source -> writer -> PostgreSQL 17");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "player identity integration failed");
  process.exitCode = 1;
});
