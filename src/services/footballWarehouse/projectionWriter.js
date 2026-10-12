"use strict";

const { runBoundedFailureReceipt, setLocalTransactionTimeouts, validateTransactionTimeouts } = require("./transactionTimeouts");

// Writer for football.player_weekly_projections (current row per source player-week), its append-only
// history football.player_weekly_projection_versions, and the per-fetch receipt football.projection_fetch_runs.
//
// One transaction per (source, season, week): advisory lock, receipt, upsert, new versions, counts.
// Idempotent: a re-fetch with identical content only advances fetched_at (the "still confirmed" mark that the
// read path's freshness check uses); changed content bumps the row's version and appends a history row.
// Rights: provider projections with permission pending. Rows keep source, company as delivered and the
// receipt's rights_basis; nothing here is exported or redistributed.

const DEFAULT_MIN_ROWS = 50;
// A fetch with fewer than this share of the previous successful fetch's rows is treated as partial and refused.
const MIN_SHARE_OF_PREVIOUS = 0.8;
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

class ProjectionWriteError extends Error {
  constructor(code, message, options) { super(message, options); this.name = "ProjectionWriteError"; this.code = code; }
}

function safeFailure(error) {
  const code = typeof error?.code === "string" && /^[A-Za-z0-9_]{1,64}$/.test(error.code) ? error.code : "projection_write_failed";
  const described = error instanceof ProjectionWriteError;
  return { code, summary: described ? String(error.message).slice(0, 200) : "projection write failed" };
}

const RECEIPT_SQL = `
  INSERT INTO football.projection_fetch_runs
    (run_id, source, season, week, rights_basis, source_url, source_ref, source_bytes, source_rows, state, fetched_at,
     rows_inserted, rows_changed, rows_unchanged, rows_unmatched)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'succeeded',$10,0,0,0,0)
  RETURNING id`;

const PREVIOUS_SQL = `
  SELECT (rows_inserted + rows_changed + rows_unchanged)::integer AS total
    FROM football.projection_fetch_runs
   WHERE source = $1 AND season = $2 AND week = $3 AND state = 'succeeded'
   ORDER BY id DESC LIMIT 1`;

const UPSERT_SQL = `
  INSERT INTO football.player_weekly_projections AS p
    (source, season, week, source_player_id, player_id, company, stat_line, content_hash, version,
     first_fetched_at, last_changed_at, fetched_at, fetch_run_id)
  SELECT $1::text, $2::integer, $3::integer, r.source_player_id, x.player_id, r.company, r.stat_line, r.content_hash, 1,
         $4::timestamptz, $4::timestamptz, $4::timestamptz, $5::bigint
    FROM jsonb_to_recordset($6::jsonb) AS r(source_player_id text, company text, stat_line jsonb, content_hash text)
    LEFT JOIN football.football_player_ids x ON x.provider = $1::text AND x.provider_id = r.source_player_id
  ON CONFLICT (source, season, week, source_player_id) DO UPDATE SET
    player_id = EXCLUDED.player_id,
    company = EXCLUDED.company,
    stat_line = EXCLUDED.stat_line,
    content_hash = EXCLUDED.content_hash,
    version = p.version + (CASE WHEN p.content_hash IS DISTINCT FROM EXCLUDED.content_hash THEN 1 ELSE 0 END),
    last_changed_at = CASE WHEN p.content_hash IS DISTINCT FROM EXCLUDED.content_hash THEN EXCLUDED.fetched_at ELSE p.last_changed_at END,
    fetched_at = EXCLUDED.fetched_at,
    fetch_run_id = EXCLUDED.fetch_run_id
  WHERE p.fetched_at <= EXCLUDED.fetched_at`;

const VERSIONS_SQL = `
  INSERT INTO football.player_weekly_projection_versions
    (source, season, week, source_player_id, version, player_id, company, stat_line, content_hash, fetched_at, fetch_run_id)
  SELECT source, season, week, source_player_id, version, player_id, company, stat_line, content_hash, fetched_at, fetch_run_id
    FROM football.player_weekly_projections
   WHERE source = $1 AND season = $2 AND week = $3 AND fetch_run_id = $4 AND last_changed_at = $5::timestamptz
  ON CONFLICT DO NOTHING`;

const COUNTS_SQL = `
  SELECT (count(*) FILTER (WHERE last_changed_at = $5::timestamptz AND version = 1))::integer AS inserted,
         (count(*) FILTER (WHERE last_changed_at = $5::timestamptz AND version > 1))::integer AS changed,
         (count(*) FILTER (WHERE last_changed_at <> $5::timestamptz))::integer AS unchanged,
         (count(*) FILTER (WHERE player_id IS NULL))::integer AS unmatched
    FROM football.player_weekly_projections
   WHERE source = $1 AND season = $2 AND week = $3 AND fetch_run_id = $4`;

function validateFetch(fetched, minRows) {
  if (!fetched || typeof fetched !== "object") throw new TypeError("fetched projection is required");
  if (fetched.source !== "sleeper") throw new TypeError("source is not supported");
  if (!Number.isInteger(fetched.season) || fetched.season < 1999 || fetched.season > 2100) throw new TypeError("season is invalid");
  if (!Number.isInteger(fetched.week) || fetched.week < 1 || fetched.week > 23) throw new TypeError("week is invalid");
  if (!Array.isArray(fetched.records)) throw new TypeError("records must be an array");
  if (fetched.records.length < minRows) {
    throw new ProjectionWriteError("source_too_small", `projection source returned ${fetched.records.length} usable rows (minimum ${minRows})`);
  }
  for (const record of fetched.records) {
    if (typeof record?.sourcePlayerId !== "string" || !record.sourcePlayerId || !record.statLine || typeof record.statLine !== "object"
        || !/^sha256:[0-9a-f]{64}$/.test(record.contentHash)) throw new TypeError("record is invalid");
  }
}

function createProjectionWriter({ pool, transactionTimeouts, minRows = DEFAULT_MIN_ROWS, now = () => new Date() } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("pool.connect must be a function");
  if (!Number.isInteger(minRows) || minRows < 0) throw new RangeError("minRows is invalid");
  const timeouts = validateTransactionTimeouts(transactionTimeouts);

  /** Best-effort failed-fetch receipt (own bounded transaction). Never throws. */
  async function recordFailure({ runId, source = "sleeper", season, week, sourceUrl, fetchedAt = now(), code, summary, client = null }) {
    let own = null;
    try {
      own = client || await pool.connect();
      await runBoundedFailureReceipt(own, async () => {
        await own.query({
          name: "warehouse-projection-failure-v1",
          text: `INSERT INTO football.projection_fetch_runs
                   (run_id, source, season, week, rights_basis, source_url, state, fetched_at, error_code, error_summary)
                 VALUES ($1,$2,$3,$4,'provider_projection_permission_pending',$5,'failed',$6,$7,$8)
                 ON CONFLICT (run_id, source, season, week) DO NOTHING`,
          values: [runId, source, season, week, sourceUrl, fetchedAt.toISOString(), String(code).slice(0, 64), String(summary).slice(0, 500)],
        });
      });
    } catch { /* a missing failure receipt must never mask the real error */ } finally {
      if (!client && own) try { own.release(); } catch { /* ignore */ }
    }
  }

  return {
    recordFailure,
    /**
     * @param {{ runId: string, fetchedAt?: Date, fetched: object }} input `fetched` is a sleeperProjectionSource result.
     */
    async writeWeek({ runId, fetchedAt = now(), fetched }) {
      if (typeof runId !== "string" || !RUN_ID.test(runId)) throw new TypeError("runId is invalid");
      if (!(fetchedAt instanceof Date) || Number.isNaN(fetchedAt.getTime())) throw new TypeError("fetchedAt is invalid");
      try { validateFetch(fetched, minRows); } catch (error) {
        // A source that is reachable but empty or truncated is an operational failure worth a receipt.
        if (error instanceof ProjectionWriteError) {
          await recordFailure({ runId, source: fetched.source, season: fetched.season, week: fetched.week, sourceUrl: fetched.sourceUrl, fetchedAt, code: error.code, summary: error.message });
        }
        throw error;
      }
      const { source, season, week } = fetched;
      const at = fetchedAt.toISOString();
      const lockKey = `weekly_projections:${source}:${season}:${week}`;
      const rows = fetched.records.map((r) => ({
        source_player_id: r.sourcePlayerId, company: r.company ?? null, stat_line: r.statLine, content_hash: r.contentHash,
      }));

      const client = await pool.connect();
      let began = false;
      let broken = null; // a failed ROLLBACK means the connection is untrustworthy: destroy it, do not pool it
      try {
        await client.query("BEGIN"); began = true;
        await setLocalTransactionTimeouts(client, timeouts);
        await client.query({ name: "warehouse-projection-lock-v1", text: "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", values: [lockKey] });
        const previous = await client.query({ name: "warehouse-projection-previous-v1", text: PREVIOUS_SQL, values: [source, season, week] });
        const previousTotal = previous.rows[0]?.total;
        if (previousTotal > 0 && rows.length < MIN_SHARE_OF_PREVIOUS * previousTotal) {
          throw new ProjectionWriteError("source_partial", `projection source returned ${rows.length} rows against ${previousTotal} on the previous fetch`);
        }
        const receipt = await client.query({
          name: "warehouse-projection-receipt-v1", text: RECEIPT_SQL,
          values: [runId, source, season, week, fetched.rightsBasis, fetched.sourceUrl, fetched.sourceRef, fetched.sourceBytes, fetched.sourceRows, at],
        });
        const fetchRunId = receipt.rows[0].id;
        await client.query({ name: "warehouse-projection-upsert-v1", text: UPSERT_SQL, values: [source, season, week, at, fetchRunId, JSON.stringify(rows)] });
        await client.query({ name: "warehouse-projection-versions-v1", text: VERSIONS_SQL, values: [source, season, week, fetchRunId, at] });
        const counts = (await client.query({ name: "warehouse-projection-counts-v1", text: COUNTS_SQL, values: [source, season, week, fetchRunId, at] })).rows[0];
        await client.query({
          name: "warehouse-projection-receipt-counts-v1",
          text: "UPDATE football.projection_fetch_runs SET rows_inserted=$2, rows_changed=$3, rows_unchanged=$4, rows_unmatched=$5 WHERE id=$1",
          values: [fetchRunId, counts.inserted, counts.changed, counts.unchanged, counts.unmatched],
        });
        await client.query("COMMIT");
        return {
          state: counts.inserted + counts.changed === 0 ? "unchanged" : "succeeded",
          fetchRunId: Number(fetchRunId), season, week, fetchedAt: at, sourceRows: fetched.sourceRows,
          inserted: counts.inserted, changed: counts.changed, unchanged: counts.unchanged, unmatched: counts.unmatched,
        };
      } catch (error) {
        if (began) try { await client.query("ROLLBACK"); } catch (rollbackError) { broken = rollbackError; }
        const safe = safeFailure(error);
        await recordFailure({ runId, source, season, week, sourceUrl: fetched.sourceUrl, fetchedAt, code: safe.code, summary: safe.summary, client: broken ? null : client });
        throw new ProjectionWriteError(safe.code, safe.summary, { cause: error });
      } finally {
        client.release(broken || undefined);
      }
    },
  };
}

module.exports = { createProjectionWriter, ProjectionWriteError, DEFAULT_MIN_ROWS, MIN_SHARE_OF_PREVIOUS };
