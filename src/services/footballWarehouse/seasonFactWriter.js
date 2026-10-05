"use strict";
const { runBoundedFailureReceipt, setLocalTransactionTimeouts, validateTransactionTimeouts } = require("./transactionTimeouts");

function safeFailure(dataset, error) {
  return {
    code: typeof error?.code === "string" && /^[A-Za-z0-9_]{1,64}$/.test(error.code)
      ? error.code : "warehouse_ingest_failed",
    summary: `${dataset} ingest failed`,
  };
}

async function recordFailure(client, { dataset, season, receipt, unmatchedRows, error }) {
  const safe = safeFailure(dataset, error);
  await runBoundedFailureReceipt(client, () => client.query({
    name: `warehouse-${dataset}-failed-receipt-v1`,
    text: `INSERT INTO football.warehouse_ingest_events
      (run_id,dataset,season,rights_basis,source_url,source_ref,source_bytes,source_rows,state,
       finished_at,error_code,error_summary,metadata)
      VALUES ($1,$2,$3,'nflverse_open_data',$4,$5,$6,$7,'failed',clock_timestamp(),$8,$9,$10::jsonb)
      ON CONFLICT (run_id,dataset,season) DO UPDATE SET
        source_url=EXCLUDED.source_url,source_bytes=EXCLUDED.source_bytes,
        source_rows=EXCLUDED.source_rows,state='failed',finished_at=clock_timestamp(),
        error_code=EXCLUDED.error_code,error_summary=EXCLUDED.error_summary,metadata=EXCLUDED.metadata
      WHERE football.warehouse_ingest_events.state <> 'succeeded'
        AND football.warehouse_ingest_events.source_ref = EXCLUDED.source_ref`,
    values: [receipt.runId,dataset,season,receipt.sourceUrl,receipt.sourceRef,receipt.sourceBytes,
      receipt.sourceRows,safe.code,safe.summary,
      JSON.stringify({ ...(receipt.metadata || {}), unmatched_rows: unmatchedRows })],
  }));
}

function createSeasonFactWriter({ pool, dataset, table, sourceUrlForSeason, validateRow, columns, stageTypes, transactionTimeouts } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("pool.connect must be a function");
  if (!/^[a-z_]+$/.test(dataset) || !/^[a-z_]+$/.test(table)) throw new TypeError("writer identity is invalid");
  const timeouts = validateTransactionTimeouts(transactionTimeouts);
  return { async writeSeason({ receipt, season, rows, unmatchedRows = 0 }) {
    if (!Number.isInteger(season) || season < 1999 || season > 2100) throw new TypeError("season is invalid");
    if (!receipt || receipt.sourceUrl !== sourceUrlForSeason(season) || !/^sha256:[0-9a-f]{64}$/.test(receipt.sourceRef || "")) throw new TypeError("receipt source identity is invalid");
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(receipt.runId || "") || !Number.isInteger(receipt.sourceBytes) || receipt.sourceBytes < 1 || !Number.isInteger(receipt.sourceRows) || receipt.sourceRows < 1) throw new TypeError("receipt counts or run id are invalid");
    if (!Number.isInteger(unmatchedRows) || unmatchedRows < 0 || receipt.sourceRows !== rows.length + unmatchedRows) throw new RangeError("receipt sourceRows must equal written plus unmatched rows");
    if (!Array.isArray(rows) || !rows.length || rows.length > 250000) throw new RangeError("rows must be a bounded nonempty array");
    const admitted = rows.map((row, index) => validateRow(row, index, season));
    const client = await pool.connect(); let began = false;
    try {
      await client.query("BEGIN"); began = true; await setLocalTransactionTimeouts(client, timeouts);
      await client.query({ name: `warehouse-${dataset}-lock-v1`, text: "SELECT pg_advisory_xact_lock(hashtext($1),$2)", values: [dataset, season] });
      const existing = await client.query({ name: `warehouse-${dataset}-existing-v1`, text: "SELECT id FROM football.warehouse_ingest_events WHERE dataset=$1 AND season=$2 AND source_ref=$3 AND state='succeeded' ORDER BY finished_at DESC LIMIT 1", values: [dataset, season, receipt.sourceRef] });
      if (existing.rows.length) { await client.query("COMMIT"); return { state: "unchanged", ingestEventId: existing.rows[0].id, sourceRows: receipt.sourceRows, writtenRows: admitted.length }; }
      const started = await client.query({ name: `warehouse-${dataset}-start-v1`, text: "INSERT INTO football.warehouse_ingest_events (run_id,dataset,season,rights_basis,source_url,source_ref,source_bytes,state,metadata) VALUES ($1,$2,$3,'nflverse_open_data',$4,$5,$6,'started',$7::jsonb) ON CONFLICT (run_id,dataset,season) DO UPDATE SET source_url=EXCLUDED.source_url,source_bytes=EXCLUDED.source_bytes,source_rows=NULL,metadata=EXCLUDED.metadata,state='started',started_at=clock_timestamp(),finished_at=NULL,error_code=NULL,error_summary=NULL WHERE football.warehouse_ingest_events.state='failed' AND football.warehouse_ingest_events.source_ref=EXCLUDED.source_ref RETURNING id", values: [receipt.runId,dataset,season,receipt.sourceUrl,receipt.sourceRef,receipt.sourceBytes,JSON.stringify({ ...(receipt.metadata || {}), unmatched_rows: unmatchedRows })] });
      if (!started.rows.length) throw Object.assign(new Error("run id conflict"), { code: "run_id_conflict" }); const id = started.rows[0].id;
      const stage = `stage_${table}`;
      await client.query({ name: `warehouse-${dataset}-create-stage-v1`, text: `CREATE TEMP TABLE ${stage} (LIKE football.${table} INCLUDING DEFAULTS) ON COMMIT DROP` });
      await client.query({ name: `warehouse-${dataset}-stage-v1`, text: `INSERT INTO ${stage} (${columns.join(",")},ingest_event_id) SELECT ${columns.join(",")},$2 FROM jsonb_to_recordset($1::jsonb) AS r(${stageTypes})`, values: [JSON.stringify(admitted),id] });
      const checks = await client.query({ name: `warehouse-${dataset}-check-v1`, text: `SELECT count(*)::integer row_count FROM ${stage}` }); if (checks.rows[0]?.row_count !== admitted.length) throw Object.assign(new Error("stage count mismatch"), { code: "stage_count_mismatch" });
      await client.query({ name: `warehouse-${dataset}-delete-v1`, text: `DELETE FROM football.${table} WHERE season=$1`, values: [season] });
      await client.query({ name: `warehouse-${dataset}-promote-v1`, text: `INSERT INTO football.${table} (${columns.join(",")},ingest_event_id) SELECT ${columns.join(",")},ingest_event_id FROM ${stage}` });
      await client.query({ name: `warehouse-${dataset}-succeed-v1`, text: "UPDATE football.warehouse_ingest_events SET state='succeeded',source_rows=$2,finished_at=clock_timestamp() WHERE id=$1 AND state='started'", values: [id,receipt.sourceRows] });
      await client.query("COMMIT"); return { state: "succeeded", ingestEventId: id, sourceRows: receipt.sourceRows, writtenRows: admitted.length, unmatchedRows };
    } catch (error) {
      if (began) try { await client.query("ROLLBACK"); } catch {}
      try { await recordFailure(client, { dataset, season, receipt, unmatchedRows, error }); } catch {}
      const detail = safeFailure(dataset, error); const safe = new Error(detail.summary); safe.code = detail.code; throw safe;
    }
    finally { client.release(); }
  }};
}
module.exports = { createSeasonFactWriter };
