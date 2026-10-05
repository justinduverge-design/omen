"use strict";

const { runBoundedFailureReceipt, setLocalTransactionTimeouts, validateTransactionTimeouts } = require("./transactionTimeouts");
const { sourceUrlForSeason } = require("./playByPlayAcquisition");

const DATASET = "play_by_play";
const RIGHTS_BASIS = "nflverse_open_data";
const HASH = /^sha256:[0-9a-f]{64}$/;
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const TEAM_ID = /^omen:team:[a-z0-9]+$/;
const PLAYER_ID = /^omen:player:[a-z0-9:._-]+$/;
const MAX_ROWS = 100_000;

class PlayByPlayIngestError extends Error {
  constructor(code, message, options) { super(message, options); this.name = "PlayByPlayIngestError"; this.code = code; }
}
function integer(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw new TypeError(`${name} is invalid`);
  return value;
}
function string(value, name, pattern, nullable = false) {
  if (nullable && value == null) return null;
  if (typeof value !== "string" || !pattern.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}
function number(value, name) {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${name} is invalid`);
  return value;
}
function object(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}
function validateReceipt(receipt, season) {
  object(receipt, "receipt");
  if (receipt.sourceUrl !== sourceUrlForSeason(season)) throw new TypeError("receipt.sourceUrl is not the allowlisted season asset");
  const metadata = object(receipt.metadata, "receipt.metadata");
  if (!Array.isArray(metadata.source_columns) || !metadata.source_columns.length) throw new TypeError("receipt.metadata.source_columns is invalid");
  return {
    runId: string(receipt.runId, "receipt.runId", RUN_ID), sourceUrl: receipt.sourceUrl,
    sourceRef: string(receipt.sourceRef, "receipt.sourceRef", HASH),
    sourceBytes: integer(receipt.sourceBytes, "receipt.sourceBytes", 1, Number.MAX_SAFE_INTEGER),
    sourceRows: integer(receipt.sourceRows, "receipt.sourceRows", 1, MAX_ROWS),
    metadata: { schema_fingerprint: string(metadata.schema_fingerprint, "schema_fingerprint", HASH), source_columns: [...metadata.source_columns] },
  };
}
function validateRow(row, index, season) {
  object(row, `rows[${index}]`);
  if (row.season !== season) throw new TypeError(`rows[${index}].season does not match season`);
  if (row.success != null && typeof row.success !== "boolean") throw new TypeError(`rows[${index}].success is invalid`);
  return {
    season, game_id: string(row.gameId, `rows[${index}].gameId`, /^.{1,64}$/),
    play_id: integer(row.playId, `rows[${index}].playId`, 0, Number.MAX_SAFE_INTEGER),
    week: integer(row.week, `rows[${index}].week`, 1, 23),
    posteam_id: string(row.posteamId, `rows[${index}].posteamId`, TEAM_ID, true),
    defteam_id: string(row.defteamId, `rows[${index}].defteamId`, TEAM_ID, true),
    passer_player_id: string(row.passerPlayerId, `rows[${index}].passerPlayerId`, PLAYER_ID, true),
    rusher_player_id: string(row.rusherPlayerId, `rows[${index}].rusherPlayerId`, PLAYER_ID, true),
    receiver_player_id: string(row.receiverPlayerId, `rows[${index}].receiverPlayerId`, PLAYER_ID, true),
    play_type: string(row.playType, `rows[${index}].playType`, /^.{1,64}$/, true),
    desc_text: string(row.descText, `rows[${index}].descText`, /^[\s\S]{1,4000}$/, true),
    epa: number(row.epa, "epa"), wpa: number(row.wpa, "wpa"), cpoe: number(row.cpoe, "cpoe"),
    air_epa: number(row.airEpa, "airEpa"), yac_epa: number(row.yacEpa, "yacEpa"), success: row.success,
    source_row: object(row.sourceRow, `rows[${index}].sourceRow`),
  };
}
function safeError(error) {
  return { code: typeof error?.code === "string" && /^[A-Za-z0-9_]{1,64}$/.test(error.code) ? error.code : "warehouse_ingest_failed", summary: error instanceof PlayByPlayIngestError ? error.message : "play-by-play ingest failed" };
}

function createPlayByPlayWriter({ pool, transactionTimeouts } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("pool.connect must be a function");
  const timeouts = validateTransactionTimeouts(transactionTimeouts);
  return { async writeSeason({ season, receipt: rawReceipt, rows, unmatchedRows = 0 }) {
    integer(season, "season", 1999, 2100);
    const receipt = validateReceipt(rawReceipt, season);
    if (!Array.isArray(rows) || !rows.length || rows.length > MAX_ROWS) throw new RangeError("rows count is invalid");
    if (!Number.isInteger(unmatchedRows) || unmatchedRows < 0 || rows.length + unmatchedRows !== receipt.sourceRows) throw new RangeError("receipt.sourceRows must equal rows plus unmatchedRows");
    const values = rows.map((row, index) => validateRow(row, index, season));
    const keys = new Set(values.map((row) => `${row.game_id}\u0000${row.play_id}`));
    if (keys.size !== values.length) throw new TypeError("rows contain a duplicate play key");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await setLocalTransactionTimeouts(client, timeouts);
      await client.query({ name: "warehouse-play-by-play-lock-v1", text: "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", values: [`${DATASET}:${season}`] });
      const existing = await client.query({ name: "warehouse-play-by-play-existing-v1", text: "SELECT id FROM football.warehouse_ingest_events WHERE dataset=$1 AND season=$2 AND source_ref=$3 AND state='succeeded' LIMIT 1", values: [DATASET, season, receipt.sourceRef] });
      if (existing.rows.length) { await client.query("COMMIT"); return { state: "unchanged", ingestEventId: existing.rows[0].id, writtenRows: rows.length }; }
      const started = await client.query({ name: "warehouse-play-by-play-start-v1", text: `INSERT INTO football.warehouse_ingest_events (run_id,dataset,season,rights_basis,source_url,source_ref,source_bytes,state,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,'started',$8::jsonb) ON CONFLICT (run_id,dataset,season) DO UPDATE SET source_ref=EXCLUDED.source_ref,source_bytes=EXCLUDED.source_bytes,state='started',finished_at=NULL,error_code=NULL,error_summary=NULL,metadata=EXCLUDED.metadata WHERE football.warehouse_ingest_events.state='failed' AND football.warehouse_ingest_events.source_ref=EXCLUDED.source_ref RETURNING id`, values: [receipt.runId, DATASET, season, RIGHTS_BASIS, receipt.sourceUrl, receipt.sourceRef, receipt.sourceBytes, JSON.stringify(receipt.metadata)] });
      if (!started.rows.length) throw new PlayByPlayIngestError("run_id_conflict", "run id already belongs to another ingest");
      const ingestEventId = started.rows[0].id;
      await client.query({ name: "warehouse-play-by-play-stage-table-v1", text: "CREATE TEMP TABLE stage_nfl_plays (LIKE football.nfl_plays INCLUDING DEFAULTS) ON COMMIT DROP" });
      await client.query({ name: "warehouse-play-by-play-stage-v1", text: `INSERT INTO stage_nfl_plays (season,game_id,play_id,week,posteam_id,defteam_id,passer_player_id,rusher_player_id,receiver_player_id,play_type,desc_text,epa,wpa,cpoe,air_epa,yac_epa,success,source_row,ingest_event_id) SELECT r.season,r.game_id,r.play_id,r.week,r.posteam_id,r.defteam_id,r.passer_player_id,r.rusher_player_id,r.receiver_player_id,r.play_type,r.desc_text,r.epa,r.wpa,r.cpoe,r.air_epa,r.yac_epa,r.success,r.source_row,$2 FROM jsonb_to_recordset($1::jsonb) AS r(season integer,game_id text,play_id bigint,week integer,posteam_id text,defteam_id text,passer_player_id text,rusher_player_id text,receiver_player_id text,play_type text,desc_text text,epa double precision,wpa double precision,cpoe double precision,air_epa double precision,yac_epa double precision,success boolean,source_row jsonb)`, values: [JSON.stringify(values), ingestEventId] });
      const checked = await client.query({ name: "warehouse-play-by-play-stage-check-v1", text: `SELECT count(*)::integer AS row_count, count(*) FILTER (WHERE g.game_id IS NULL OR (s.posteam_id IS NOT NULL AND pt.team_id IS NULL) OR (s.defteam_id IS NOT NULL AND dt.team_id IS NULL) OR (s.passer_player_id IS NOT NULL AND pp.player_id IS NULL) OR (s.rusher_player_id IS NOT NULL AND rp.player_id IS NULL) OR (s.receiver_player_id IS NOT NULL AND rc.player_id IS NULL))::integer AS invalid_count FROM stage_nfl_plays s LEFT JOIN football.nfl_games g ON g.season=s.season AND g.game_id=s.game_id LEFT JOIN football.football_teams pt ON pt.team_id=s.posteam_id LEFT JOIN football.football_teams dt ON dt.team_id=s.defteam_id LEFT JOIN football.football_players pp ON pp.player_id=s.passer_player_id LEFT JOIN football.football_players rp ON rp.player_id=s.rusher_player_id LEFT JOIN football.football_players rc ON rc.player_id=s.receiver_player_id` });
      if (checked.rows[0]?.row_count !== values.length || checked.rows[0]?.invalid_count !== 0) throw new PlayByPlayIngestError("stage_reference_invalid", "staged plays failed count or reference validation");
      await client.query({ name: "warehouse-play-by-play-delete-v1", text: "DELETE FROM football.nfl_plays WHERE season=$1", values: [season] });
      await client.query({ name: "warehouse-play-by-play-promote-v1", text: "INSERT INTO football.nfl_plays SELECT * FROM stage_nfl_plays" });
      await client.query({ name: "warehouse-play-by-play-succeed-v1", text: "UPDATE football.warehouse_ingest_events SET state='succeeded',source_rows=$2,finished_at=clock_timestamp() WHERE id=$1 AND state='started'", values: [ingestEventId, receipt.sourceRows] });
      await client.query("COMMIT");
      return { state: "succeeded", ingestEventId, writtenRows: rows.length };
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      const safe = safeError(error);
      await runBoundedFailureReceipt(client, () => client.query({ name: "warehouse-play-by-play-failed-v1", text: `INSERT INTO football.warehouse_ingest_events (run_id,dataset,season,rights_basis,source_url,source_ref,source_bytes,source_rows,state,finished_at,error_code,error_summary,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'failed',clock_timestamp(),$9,$10,$11::jsonb) ON CONFLICT (run_id,dataset,season) DO UPDATE SET state='failed',finished_at=clock_timestamp(),error_code=EXCLUDED.error_code,error_summary=EXCLUDED.error_summary,metadata=EXCLUDED.metadata WHERE football.warehouse_ingest_events.state<>'succeeded' AND football.warehouse_ingest_events.source_ref=EXCLUDED.source_ref`, values: [receipt.runId, DATASET, season, RIGHTS_BASIS, receipt.sourceUrl, receipt.sourceRef, receipt.sourceBytes, receipt.sourceRows, safe.code, safe.summary, JSON.stringify(receipt.metadata)] }));
      throw new PlayByPlayIngestError(safe.code, safe.summary, { cause: error });
    } finally { client.release(); }
  } };
}

module.exports = { createPlayByPlayWriter, PlayByPlayIngestError, DATASET, MAX_ROWS };
