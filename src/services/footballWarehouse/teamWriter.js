"use strict";

const { SCHEDULES_SOURCE_URL } = require("./scheduleSource");

const DATASET = "teams";
const RIGHTS_BASIS = "nflverse_open_data";
const HASH = /^sha256:[0-9a-f]{64}$/;
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const TEAM_ID = /^omen:team:[a-z0-9]+$/;

class WarehouseTeamIngestError extends Error {
  constructor(code, message, options) { super(message, options); this.name = "WarehouseTeamIngestError"; this.code = code; }
}

function object(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}
function string(value, name, pattern, max = Infinity) {
  if (typeof value !== "string" || !pattern.test(value) || value.length > max) throw new TypeError(`${name} is invalid`);
  return value;
}
function integer(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw new TypeError(`${name} must be an integer from ${min} through ${max}`);
  return value;
}
function receipt(value) {
  object(value, "receipt");
  const metadata = object(value.metadata, "receipt.metadata");
  string(metadata.schema_fingerprint, "receipt.metadata.schema_fingerprint", HASH);
  if (!Array.isArray(metadata.source_columns) || !metadata.source_columns.length || metadata.source_columns.some((v) => typeof v !== "string" || !v)) {
    throw new TypeError("receipt.metadata.source_columns must be a nonempty string array");
  }
  integer(metadata.team_rows, "receipt.metadata.team_rows", 1, 64);
  string(value.sourceUrl, "receipt.sourceUrl", /^https:\/\/\S+$/);
  const parsed = new URL(value.sourceUrl);
  if (parsed.username || parsed.password || value.sourceUrl !== SCHEDULES_SOURCE_URL) {
    throw new TypeError("receipt.sourceUrl is not the allowlisted schedules asset");
  }
  return { runId: string(value.runId, "receipt.runId", RUN_ID), sourceUrl: value.sourceUrl,
    sourceRef: string(value.sourceRef, "receipt.sourceRef", HASH),
    sourceBytes: integer(value.sourceBytes, "receipt.sourceBytes", 0, Number.MAX_SAFE_INTEGER),
    sourceRows: integer(value.sourceRows, "receipt.sourceRows", 1, Number.MAX_SAFE_INTEGER),
    metadata: { ...metadata, source_columns: [...metadata.source_columns] } };
}
function team(row, index) {
  object(row, `teamRows[${index}]`);
  const first = row.firstSeason == null ? null : integer(row.firstSeason, `teamRows[${index}].firstSeason`, 1999, 2100);
  const last = row.lastSeason == null ? null : integer(row.lastSeason, `teamRows[${index}].lastSeason`, 1999, 2100);
  if (first != null && last != null && last < first) throw new TypeError(`teamRows[${index}] has an invalid season range`);
  return { team_id: string(row.teamId, `teamRows[${index}].teamId`, TEAM_ID),
    nflverse_abbr: string(row.nflverseAbbr, `teamRows[${index}].nflverseAbbr`, /^[A-Z0-9]{2,3}$/),
    display_name: string(row.displayName, `teamRows[${index}].displayName`, /^.+$/, 128), first_season: first, last_season: last };
}
function safe(error) {
  const code = typeof error?.code === "string" && /^[A-Za-z0-9_]{1,64}$/.test(error.code) ? error.code : "warehouse_team_ingest_failed";
  const message = error instanceof WarehouseTeamIngestError ? error.message : "team ingest failed";
  return { code, summary: String(message).replace(/(?:postgres(?:ql)?:\/\/|password=)[^\s]+/gi, "[redacted]").replace(/[\u0000-\u001f\u007f]+/g, " ").slice(0, 500) };
}
async function failed(client, r, error) {
  const failure = safe(error);
  try { await client.query({ name: "warehouse-team-failed-receipt-v1", text: `
    INSERT INTO football.warehouse_ingest_events
      (run_id,dataset,season,rights_basis,source_url,source_ref,source_bytes,source_rows,state,finished_at,error_code,error_summary,metadata)
    VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,'failed',clock_timestamp(),$8,$9,$10::jsonb)
    ON CONFLICT (run_id,dataset) WHERE season IS NULL DO UPDATE SET
      source_url=EXCLUDED.source_url,source_ref=EXCLUDED.source_ref,source_bytes=EXCLUDED.source_bytes,
      source_rows=EXCLUDED.source_rows,state='failed',finished_at=clock_timestamp(),error_code=EXCLUDED.error_code,
      error_summary=EXCLUDED.error_summary,metadata=EXCLUDED.metadata
    WHERE football.warehouse_ingest_events.state <> 'succeeded'
      AND football.warehouse_ingest_events.source_ref = EXCLUDED.source_ref`,
    values: [r.runId, DATASET, RIGHTS_BASIS, r.sourceUrl, r.sourceRef, r.sourceBytes, r.sourceRows,
      failure.code, failure.summary, JSON.stringify(r.metadata)] }); } catch {}
}

function createTeamWriter({ pool, expectedTeamRows = 32 } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("pool.connect must be a function");
  integer(expectedTeamRows, "expectedTeamRows", 1, 64);
  return { async writeSnapshot({ receipt: rawReceipt, teamRows }) {
    const r = receipt(rawReceipt);
    if (!Array.isArray(teamRows) || teamRows.length !== expectedTeamRows) throw new RangeError(`teamRows must contain exactly ${expectedTeamRows} rows`);
    if (r.metadata.team_rows !== teamRows.length || r.sourceRows < teamRows.length) throw new RangeError("team receipt counts do not match admitted rows");
    const rows = teamRows.map(team);
    const ids = new Set(), abbrs = new Set();
    for (const row of rows) {
      if (ids.has(row.team_id) || abbrs.has(row.nflverse_abbr)) throw new TypeError("teamRows contain duplicate identities");
      ids.add(row.team_id); abbrs.add(row.nflverse_abbr);
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query({ name: "warehouse-team-lock-v1", text: "SELECT pg_advisory_xact_lock(hashtextextended($1,0))", values: [DATASET] });
      const existing = await client.query({ name: "warehouse-team-existing-v1", text: `SELECT id FROM football.warehouse_ingest_events WHERE dataset=$1 AND season IS NULL AND source_ref=$2 AND state='succeeded' ORDER BY finished_at DESC LIMIT 1`, values: [DATASET, r.sourceRef] });
      if (existing.rows.length) { await client.query("COMMIT"); return { state: "unchanged", ingestEventId: existing.rows[0].id, writtenTeams: rows.length }; }
      const run = await client.query({ name: "warehouse-team-run-v1", text: `SELECT id,state,source_ref FROM football.warehouse_ingest_events WHERE run_id=$1 AND dataset=$2 AND season IS NULL ORDER BY id DESC LIMIT 1`, values: [r.runId, DATASET] });
      if (run.rows[0]?.state === "succeeded" || (run.rows[0] && run.rows[0].source_ref !== r.sourceRef)) throw new WarehouseTeamIngestError("run_id_conflict", "run id already belongs to another team ingest");
      const metadata = r.metadata;
      const started = run.rows.length ? await client.query({ name: "warehouse-team-restart-receipt-v1", text: `UPDATE football.warehouse_ingest_events SET source_url=$2,source_ref=$3,source_bytes=$4,source_rows=NULL,state='started',started_at=clock_timestamp(),finished_at=NULL,error_code=NULL,error_summary=NULL,metadata=$5::jsonb WHERE id=$1 AND state='failed' RETURNING id`, values: [run.rows[0].id,r.sourceUrl,r.sourceRef,r.sourceBytes,JSON.stringify(metadata)] }) :
        await client.query({ name: "warehouse-team-start-receipt-v1", text: `INSERT INTO football.warehouse_ingest_events (run_id,dataset,season,rights_basis,source_url,source_ref,source_bytes,state,metadata) VALUES ($1,$2,NULL,$3,$4,$5,$6,'started',$7::jsonb) RETURNING id`, values: [r.runId,DATASET,RIGHTS_BASIS,r.sourceUrl,r.sourceRef,r.sourceBytes,JSON.stringify(metadata)] });
      if (!started.rows.length) throw new WarehouseTeamIngestError("run_id_conflict", "team receipt could not be started");
      const id = started.rows[0].id;
      await client.query({ name: "warehouse-team-create-stage-v1", text: `CREATE TEMP TABLE stage_football_teams (team_id text PRIMARY KEY,nflverse_abbr text UNIQUE NOT NULL,display_name text NOT NULL,first_season integer,last_season integer) ON COMMIT DROP` });
      await client.query({ name: "warehouse-team-stage-v1", text: `INSERT INTO stage_football_teams SELECT * FROM jsonb_to_recordset($1::jsonb) AS r(team_id text,nflverse_abbr text,display_name text,first_season integer,last_season integer)`, values: [JSON.stringify(rows)] });
      const count = await client.query({ name: "warehouse-team-stage-count-v1", text: "SELECT count(*)::integer AS row_count FROM stage_football_teams" });
      if (count.rows[0]?.row_count !== rows.length) throw new WarehouseTeamIngestError("stage_count_mismatch", "staged team count did not match admitted rows");
      await client.query({ name: "warehouse-team-promote-v1", text: `INSERT INTO football.football_teams (team_id,nflverse_abbr,display_name,first_season,last_season,ingest_event_id) SELECT team_id,nflverse_abbr,display_name,first_season,last_season,$1 FROM stage_football_teams ON CONFLICT (team_id) DO UPDATE SET nflverse_abbr=EXCLUDED.nflverse_abbr,display_name=EXCLUDED.display_name,first_season=CASE WHEN football.football_teams.first_season IS NULL THEN EXCLUDED.first_season WHEN EXCLUDED.first_season IS NULL THEN football.football_teams.first_season ELSE LEAST(football.football_teams.first_season,EXCLUDED.first_season) END,last_season=CASE WHEN football.football_teams.last_season IS NULL THEN EXCLUDED.last_season WHEN EXCLUDED.last_season IS NULL THEN football.football_teams.last_season ELSE GREATEST(football.football_teams.last_season,EXCLUDED.last_season) END,ingest_event_id=EXCLUDED.ingest_event_id`, values: [id] });
      const done = await client.query({ name: "warehouse-team-succeed-receipt-v1", text: "UPDATE football.warehouse_ingest_events SET state='succeeded',source_rows=$2,finished_at=clock_timestamp() WHERE id=$1 AND state='started'", values: [id, r.sourceRows] });
      if (done.rowCount !== 1) throw new WarehouseTeamIngestError("receipt_update_failed", "team receipt did not reach succeeded state");
      await client.query("COMMIT");
      return { state: "succeeded", ingestEventId: id, writtenTeams: rows.length };
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      await failed(client, r, error);
      const failure = safe(error); throw new WarehouseTeamIngestError(failure.code, failure.summary, { cause: error });
    } finally { client.release(); }
  } };
}

module.exports = { createTeamWriter, WarehouseTeamIngestError, DATASET };
