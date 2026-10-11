"use strict";

const assert = require("node:assert/strict");
const { Pool } = require("pg");
const { createProjectionWriter } = require("../../src/services/footballWarehouse/projectionWriter");
const { createWarehouseProjectionRepository } = require("../../src/services/footballWarehouse/projectionRepository");
const { normalizeRecords } = require("../../src/services/footballWarehouse/sleeperProjectionSource");

const SEASON = 2026;
const WEEK = 6;
const hash = (character) => `sha256:${character.repeat(64)}`;

function payload({ rb1Rushing = 80, extra = 0 } = {}) {
  const records = [
    { player_id: "4034", week: WEEK, season: SEASON, company: "rotowire", stats: { pts_ppr: 18.2, rush_yd: rb1Rushing, rush_td: 0.6, rec: 3 } },
    { player_id: "9999", week: WEEK, season: SEASON, company: "rotowire", stats: { pts_ppr: 4.1, rec: 2, rec_yd: 21 } },
    { player_id: "BUF", week: WEEK, season: SEASON, company: "rotowire", stats: { pts_ppr: 7, sack: 2.5 } },
  ];
  for (let i = 0; i < 60 + extra; i += 1) {
    records.push({ player_id: `x${i}`, week: WEEK, season: SEASON, company: "rotowire", stats: { pts_ppr: i / 10, rec: 1 } });
  }
  return records;
}

function fetchedFrom(records, { sourceRef = hash("a") } = {}) {
  const normalized = normalizeRecords(records, { season: SEASON, week: WEEK });
  return {
    source: "sleeper", season: SEASON, week: WEEK, rightsBasis: "provider_projection_permission_pending",
    sourceUrl: "https://api.sleeper.app/projections/nfl/2026/6", sourceRef, sourceBytes: 1234, sourceRows: records.length, ...normalized,
  };
}

async function main() {
  const socket = process.argv[2];
  if (!socket) throw new Error("socket directory argument is required");
  const pool = new Pool({ host: socket, user: "postgres", database: "postgres" });
  try {
    // Prerequisites: one warehouse player mapped to Sleeper id 4034 through the crosswalk.
    const event = await pool.query(`INSERT INTO football.warehouse_ingest_events
      (run_id, dataset, season, rights_basis, source_url, source_ref, source_bytes, source_rows, state, finished_at)
      VALUES ('proj-prereq', 'player_ids', $1, 'nflverse_open_data', 'https://example.test/ids', $2, 1, 1, 'succeeded', clock_timestamp()) RETURNING id`,
    [SEASON, hash("b")]);
    const eventId = event.rows[0].id;
    await pool.query(`INSERT INTO football.football_players (player_id, gsis_id, display_name, football_position, ingest_event_id)
      VALUES ('omen:player:fixture-rb', '00-0000010', 'Fixture Back', 'RB', $1)`, [eventId]);
    await pool.query(`INSERT INTO football.football_player_ids (provider, provider_id, player_id, match_method, ingest_event_id)
      VALUES ('sleeper', '4034', 'omen:player:fixture-rb', 'source_crosswalk', $1)`, [eventId]);

    let tick = 0;
    const clock = () => new Date(Date.UTC(2026, 9, 11, 6, 0, tick++));
    const writer = createProjectionWriter({ pool, now: clock });
    const run = (n, records, opts) => writer.writeWeek({ runId: `proj-run-${n}`, fetched: fetchedFrom(records, opts) });

    // First write: everything inserted; the crosswalk maps one player, the rest are unmatched but kept.
    const first = await run(1, payload());
    assert.equal(first.state, "succeeded");
    assert.equal(first.inserted, 63);
    assert.equal(first.changed, 0);
    assert.equal(first.unmatched, 62);
    const current = await pool.query("SELECT * FROM football.player_weekly_projections WHERE source_player_id='4034'");
    assert.equal(current.rows[0].player_id, "omen:player:fixture-rb");
    assert.equal(current.rows[0].company, "rotowire");
    assert.deepEqual(current.rows[0].stat_line, { pts_ppr: 18.2, rush_yd: 80, rush_td: 0.6, rec: 3 });
    assert.equal(current.rows[0].version, 1);

    // Identical re-fetch: idempotent. No new version rows, last_changed_at is kept, fetched_at advances.
    const again = await run(2, payload());
    assert.equal(again.state, "unchanged");
    assert.deepEqual([again.inserted, again.changed, again.unchanged], [0, 0, 63]);
    const counts = await pool.query(`SELECT (SELECT count(*)::integer FROM football.player_weekly_projections) AS current,
      (SELECT count(*)::integer FROM football.player_weekly_projection_versions) AS versions`);
    assert.deepEqual(counts.rows[0], { current: 63, versions: 63 });
    const confirmed = await pool.query("SELECT fetched_at, last_changed_at, first_fetched_at FROM football.player_weekly_projections WHERE source_player_id='4034'");
    assert.ok(confirmed.rows[0].fetched_at > confirmed.rows[0].last_changed_at);
    assert.equal(confirmed.rows[0].last_changed_at.getTime(), confirmed.rows[0].first_fetched_at.getTime());

    // A changed stat line bumps the version and appends history; the other 62 rows are untouched.
    const changed = await run(3, payload({ rb1Rushing: 95 }));
    assert.equal(changed.state, "succeeded");
    assert.deepEqual([changed.inserted, changed.changed, changed.unchanged], [0, 1, 62]);
    const history = await pool.query("SELECT version, stat_line->>'rush_yd' AS rush_yd FROM football.player_weekly_projection_versions WHERE source_player_id='4034' ORDER BY version");
    assert.deepEqual(history.rows, [{ version: 1, rush_yd: "80" }, { version: 2, rush_yd: "95" }]);
    assert.equal((await pool.query("SELECT version FROM football.player_weekly_projections WHERE source_player_id='4034'")).rows[0].version, 2);

    // Reverting to the earlier content is a new version, never a rewrite of version 1.
    await run(4, payload({ rb1Rushing: 80 }));
    assert.equal((await pool.query("SELECT count(*)::integer n FROM football.player_weekly_projection_versions WHERE source_player_id='4034'")).rows[0].n, 3);

    // A player the source stops delivering is not returned by the read path (older fetched_at), history keeps it.
    const dropped = payload();
    dropped.pop();
    await run(5, dropped);
    const read = await createWarehouseProjectionRepository({ query: (request) => pool.query(request) }).readWeek({ source: "sleeper", season: SEASON, week: WEEK });
    assert.equal(read.rows.length, 62);
    assert.ok(!read.rows.some((row) => row.source_player_id === "x59"));
    assert.equal((await pool.query("SELECT count(*)::integer n FROM football.player_weekly_projection_versions WHERE source_player_id='x59'")).rows[0].n, 1);

    // Receipts: one per fetch, with provenance and counts.
    const receipts = await pool.query("SELECT run_id, state, rights_basis, source_ref, rows_inserted, rows_changed FROM football.projection_fetch_runs ORDER BY id");
    assert.equal(receipts.rows.length, 5);
    assert.ok(receipts.rows.every((row) => row.state === "succeeded" && row.rights_basis === "provider_projection_permission_pending"));

    // A too-small source is refused, rolled back, and leaves a failed receipt.
    await assert.rejects(run(6, payload().slice(0, 5)), (error) => error.code === "source_too_small");
    const failed = await pool.query("SELECT state, error_code FROM football.projection_fetch_runs WHERE run_id='proj-run-6'");
    assert.deepEqual(failed.rows, [{ state: "failed", error_code: "source_too_small" }]);
    assert.equal((await pool.query("SELECT count(*)::integer n FROM football.player_weekly_projections")).rows[0].n, 63);

    // Late crosswalk: when the mapping appears, player_id fills in without a new content version.
    await pool.query(`INSERT INTO football.football_players (player_id, gsis_id, display_name, football_position, ingest_event_id)
      VALUES ('omen:player:fixture-wr', '00-0000011', 'Fixture Receiver', 'WR', $1)`, [eventId]);
    await pool.query(`INSERT INTO football.football_player_ids (provider, provider_id, player_id, match_method, ingest_event_id)
      VALUES ('sleeper', '9999', 'omen:player:fixture-wr', 'source_crosswalk', $1)`, [eventId]);
    await run(7, payload());
    const late = await pool.query("SELECT player_id, version FROM football.player_weekly_projections WHERE source_player_id='9999'");
    assert.deepEqual(late.rows, [{ player_id: "omen:player:fixture-wr", version: 1 }]);

    // Append-only history: a trigger refuses update, delete and truncate, even for the owner.
    await assert.rejects(pool.query("UPDATE football.player_weekly_projection_versions SET company='x'"), /append-only/);
    await assert.rejects(pool.query("DELETE FROM football.player_weekly_projection_versions"), /append-only/);
    await assert.rejects(pool.query("TRUNCATE football.player_weekly_projection_versions"), /append-only/);

    // Capability roles: the writer cannot update or delete history, the reader cannot write anything.
    const privileges = await pool.query(`SELECT
      has_table_privilege('omen_warehouse_writer', 'football.player_weekly_projection_versions', 'insert') AS writer_insert,
      has_table_privilege('omen_warehouse_writer', 'football.player_weekly_projection_versions', 'update') AS writer_update,
      has_table_privilege('omen_warehouse_writer', 'football.player_weekly_projection_versions', 'delete') AS writer_delete,
      has_table_privilege('omen_warehouse_writer', 'football.player_weekly_projections', 'update') AS writer_current_update,
      has_table_privilege('omen_warehouse_reader', 'football.player_weekly_projections', 'select') AS reader_select,
      has_table_privilege('omen_warehouse_reader', 'football.player_weekly_projections', 'insert') AS reader_insert,
      has_table_privilege('omen_warehouse_backup', 'football.projection_fetch_runs', 'select') AS backup_select`);
    assert.deepEqual(privileges.rows[0], {
      writer_insert: true, writer_update: false, writer_delete: false, writer_current_update: true,
      reader_select: true, reader_insert: false, backup_select: true,
    });
    console.log("VERIFIED PostgreSQL 17 weekly projections writer");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : "weekly projections integration failed");
  process.exitCode = 1;
});
