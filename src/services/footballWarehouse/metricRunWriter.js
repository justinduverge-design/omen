"use strict";

const { runBoundedFailureReceipt, setLocalTransactionTimeouts, validateTransactionTimeouts } = require("./transactionTimeouts");

// Generic writer for Omen-computed metric runs (football.football_metric_runs,
// _run_inputs, _values). One run row per (metric_name, formula_version, season,
// week); week null means season-to-date. The unique constraint does not
// protect null weeks (null != null), so exclusivity comes from an advisory
// lock plus a lookup that treats null weeks as equal.
//
// The caller supplies two functions, both given the transaction client:
//   resolveInputs(client) -> { ingestEventIds: number[], parameters: object }
//   computeValues(client) -> { values: [{entityType, entityId, value, components}], summary: object }
// An identical rerun (same input ingest events and same base parameters as the
// existing succeeded run) returns "unchanged" without recomputing.

const METRIC_NAME = /^omen_[a-z0-9_]+$/;
const FORMULA_VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const ENTITY_TYPES = new Set(["player", "team", "game", "play"]);
const MAX_VALUES = 50_000;

class MetricRunError extends Error {
  constructor(code, message, options) { super(message, options); this.name = "MetricRunError"; this.code = code; }
}

function safeFailure(error) {
  return {
    code: typeof error?.code === "string" && /^[A-Za-z0-9_]{1,64}$/.test(error.code) ? error.code : "metric_run_failed",
    summary: error instanceof MetricRunError ? error.message.slice(0, 200) : "metric run failed",
  };
}

function validateValues(values) {
  if (!Array.isArray(values) || values.length > MAX_VALUES) throw new MetricRunError("values_invalid", "values must be a bounded array");
  const seen = new Set();
  return values.map((entry, index) => {
    if (!entry || !ENTITY_TYPES.has(entry.entityType)) throw new MetricRunError("values_invalid", `values[${index}].entityType is invalid`);
    if (typeof entry.entityId !== "string" || entry.entityId.length < 1 || entry.entityId.length > 160) throw new MetricRunError("values_invalid", `values[${index}].entityId is invalid`);
    if (typeof entry.value !== "number" || !Number.isFinite(entry.value)) throw new MetricRunError("values_invalid", `values[${index}].value is invalid`);
    if (!entry.components || typeof entry.components !== "object" || Array.isArray(entry.components)) throw new MetricRunError("values_invalid", `values[${index}].components is invalid`);
    const key = `${entry.entityType}\u0000${entry.entityId}`;
    if (seen.has(key)) throw new MetricRunError("values_invalid", "duplicate entity in values");
    seen.add(key);
    return { entity_type: entry.entityType, entity_id: entry.entityId, value: entry.value, components: entry.components };
  });
}

function validateInputs(inputs) {
  if (!inputs || !Array.isArray(inputs.ingestEventIds) || !inputs.ingestEventIds.length) {
    throw new MetricRunError("no_inputs", "metric run has no input ingest events");
  }
  const ids = [...new Set(inputs.ingestEventIds)];
  if (ids.some((id) => !Number.isSafeInteger(id) || id < 1)) throw new MetricRunError("inputs_invalid", "ingest event ids are invalid");
  ids.sort((a, b) => a - b);
  const parameters = inputs.parameters ?? {};
  if (typeof parameters !== "object" || Array.isArray(parameters) || "summary" in parameters) {
    throw new MetricRunError("inputs_invalid", "parameters must be an object without a summary key");
  }
  return { ids, parameters };
}

function lockKey(metricName, formulaVersion, season, week) {
  return `metric_run:${metricName}:${formulaVersion}:${season}:${week == null ? "season" : week}`;
}

function createMetricRunWriter({ pool, transactionTimeouts } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("pool.connect must be a function");
  const timeouts = validateTransactionTimeouts(transactionTimeouts);

  return {
    async writeRun({ metricName, formulaVersion, season, week = null, resolveInputs, computeValues }) {
      if (typeof metricName !== "string" || !METRIC_NAME.test(metricName)) throw new TypeError("metricName is invalid");
      if (typeof formulaVersion !== "string" || !FORMULA_VERSION.test(formulaVersion)) throw new TypeError("formulaVersion is invalid");
      if (!Number.isInteger(season) || season < 1999 || season > 2100) throw new TypeError("season is invalid");
      if (week !== null && (!Number.isInteger(week) || week < 1 || week > 23)) throw new TypeError("week is invalid");
      if (typeof resolveInputs !== "function" || typeof computeValues !== "function") throw new TypeError("resolveInputs and computeValues must be functions");

      const key = lockKey(metricName, formulaVersion, season, week);
      const client = await pool.connect();
      let began = false;
      try {
        await client.query("BEGIN"); began = true;
        await setLocalTransactionTimeouts(client, timeouts);
        await client.query({ name: "warehouse-metric-run-lock-v1", text: "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", values: [key] });

        const { ids, parameters } = validateInputs(await resolveInputs(client));
        const baseJson = JSON.stringify(parameters);

        const existing = await client.query({
          name: "warehouse-metric-run-existing-v1",
          text: `SELECT id, state,
                        (parameters - 'summary') = $5::jsonb AS same_parameters,
                        COALESCE((SELECT array_agg(i.ingest_event_id ORDER BY i.ingest_event_id)
                                  FROM football.football_metric_run_inputs i WHERE i.metric_run_id = r.id), '{}') AS input_ids
                   FROM football.football_metric_runs r
                  WHERE metric_name = $1 AND formula_version = $2 AND season = $3 AND week IS NOT DISTINCT FROM $4
                  FOR UPDATE`,
          values: [metricName, formulaVersion, season, week, baseJson],
        });
        const prior = existing.rows[0];
        if (prior && prior.state === "succeeded" && prior.same_parameters
            && prior.input_ids.length === ids.length && prior.input_ids.every((id, i) => Number(id) === ids[i])) {
          await client.query("COMMIT");
          return { state: "unchanged", metricRunId: Number(prior.id) };
        }

        let runId;
        if (prior) {
          runId = prior.id;
          await client.query({ name: "warehouse-metric-run-restart-v1", text: "UPDATE football.football_metric_runs SET state='running', started_at=clock_timestamp(), finished_at=NULL, error_code=NULL, error_summary=NULL, parameters=$2::jsonb WHERE id=$1", values: [runId, baseJson] });
          await client.query({ name: "warehouse-metric-run-clear-values-v1", text: "DELETE FROM football.football_metric_values WHERE metric_run_id=$1", values: [runId] });
          await client.query({ name: "warehouse-metric-run-clear-inputs-v1", text: "DELETE FROM football.football_metric_run_inputs WHERE metric_run_id=$1", values: [runId] });
        } else {
          const inserted = await client.query({ name: "warehouse-metric-run-start-v1", text: "INSERT INTO football.football_metric_runs (metric_name, formula_version, season, week, state, parameters) VALUES ($1,$2,$3,$4,'running',$5::jsonb) RETURNING id", values: [metricName, formulaVersion, season, week, baseJson] });
          runId = inserted.rows[0].id;
        }

        await client.query({ name: "warehouse-metric-run-inputs-v1", text: "INSERT INTO football.football_metric_run_inputs (metric_run_id, ingest_event_id) SELECT $1, unnest($2::bigint[])", values: [runId, ids] });

        const computed = await computeValues(client);
        const rows = validateValues(computed?.values);
        const summary = computed?.summary ?? {};
        if (typeof summary !== "object" || Array.isArray(summary)) throw new MetricRunError("values_invalid", "summary must be an object");
        if (rows.length) {
          await client.query({ name: "warehouse-metric-run-values-v1", text: "INSERT INTO football.football_metric_values (metric_run_id, entity_type, entity_id, value, components) SELECT $1, r.entity_type, r.entity_id, r.value, r.components FROM jsonb_to_recordset($2::jsonb) AS r(entity_type text, entity_id text, value double precision, components jsonb)", values: [runId, JSON.stringify(rows)] });
        }
        await client.query({ name: "warehouse-metric-run-succeed-v1", text: "UPDATE football.football_metric_runs SET state='succeeded', finished_at=clock_timestamp(), parameters=$2::jsonb WHERE id=$1 AND state='running'", values: [runId, JSON.stringify({ ...parameters, summary })] });
        await client.query("COMMIT");
        return { state: "succeeded", metricRunId: Number(runId), valueCount: rows.length, summary };
      } catch (error) {
        if (began) try { await client.query("ROLLBACK"); } catch {}
        const safe = safeFailure(error);
        // A failure never overwrites a previously succeeded run: its values are still valid.
        await runBoundedFailureReceipt(client, async () => {
          await client.query({ name: "warehouse-metric-run-failure-lock-v1", text: "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", values: [key] });
          const updated = await client.query({ name: "warehouse-metric-run-failure-update-v1", text: "UPDATE football.football_metric_runs SET state='failed', finished_at=clock_timestamp(), error_code=$5, error_summary=$6 WHERE metric_name=$1 AND formula_version=$2 AND season=$3 AND week IS NOT DISTINCT FROM $4 AND state<>'succeeded'", values: [metricName, formulaVersion, season, week, safe.code, safe.summary] });
          if (!updated.rowCount) {
            await client.query({ name: "warehouse-metric-run-failure-insert-v1", text: "INSERT INTO football.football_metric_runs (metric_name, formula_version, season, week, state, finished_at, error_code, error_summary) SELECT $1::text,$2::text,$3::integer,$4::integer,'failed',clock_timestamp(),$5::text,$6::text WHERE NOT EXISTS (SELECT 1 FROM football.football_metric_runs WHERE metric_name=$1 AND formula_version=$2 AND season=$3 AND week IS NOT DISTINCT FROM $4)", values: [metricName, formulaVersion, season, week, safe.code, safe.summary] });
          }
        });
        throw new MetricRunError(safe.code, safe.summary, { cause: error });
      } finally {
        client.release();
      }
    },
  };
}

module.exports = { createMetricRunWriter, MetricRunError };
