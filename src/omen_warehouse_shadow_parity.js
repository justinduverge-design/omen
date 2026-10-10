#!/usr/bin/env node
"use strict";

// Read-only parity check between the Supabase/nflverse usage reader (what the app serves) and the
// football warehouse reader, for the same players, without needing a phone request. Run it inside the
// production API container, which already has the Supabase env and the warehouse reader secret:
//
//   docker exec omen_api node scripts/warehouse-shadow-parity.js --season 2026 --week 6 --sample 25
//   docker exec omen_api node scripts/warehouse-shadow-parity.js --season 2026 --week 6 --player-keys sleeper:4046,sleeper:6794
//
// Safe by construction: Supabase is wrapped so only SELECTs on the public crosswalk tables can run, the
// warehouse side uses the omen_warehouse_read role (verified read-only by the reader runtime), and it
// creates no credentials. Output is ONE JSON object holding counts, difference kinds, up to 10 sample
// differences (public football fields only) and latency percentiles. It never prints secrets, provider
// keys, user ids or raw error text. Exit code is nonzero if any query errored.

const { compareUsageBundles, equalValue, WEEK_FIELDS, SUMMARY_FIELDS } = require("./services/footballWarehouse/usageComparison");

const MAX_SAMPLE = 200;
const MAX_DIFFS = 10;
const POOL_ROWS = 1000;
const PROVIDERS = ["espn", "sleeper", "yahoo"];
const READ_TABLES = new Set(["player_provider_ids", "players"]);
const WRITE_METHODS = ["insert", "update", "upsert", "delete"];

function parseArgs(argv) {
  const out = { season: null, week: null, playerKeys: null, sample: null, provider: "sleeper" };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (value == null) throw new TypeError(`${flag} needs a value`);
    if (flag === "--season") out.season = Number(value);
    else if (flag === "--week") out.week = Number(value);
    else if (flag === "--player-keys") out.playerKeys = [...new Set(value.split(",").map((k) => k.trim()).filter(Boolean))];
    else if (flag === "--sample") out.sample = Number(value);
    else if (flag === "--provider") out.provider = value;
    else throw new TypeError(`unknown flag ${flag}`);
  }
  if (!Number.isInteger(out.season) || out.season < 1999 || out.season > 2100) throw new TypeError("--season must be a year");
  if (!Number.isInteger(out.week) || out.week < 1 || out.week > 23) throw new TypeError("--week must be 1-23");
  if ((out.playerKeys == null) === (out.sample == null)) throw new TypeError("pass exactly one of --player-keys or --sample");
  if (out.playerKeys && (!out.playerKeys.length || out.playerKeys.length > MAX_SAMPLE)) {
    throw new TypeError(`--player-keys must list 1-${MAX_SAMPLE} keys`);
  }
  if (out.sample != null && (!Number.isInteger(out.sample) || out.sample < 1 || out.sample > MAX_SAMPLE)) {
    throw new TypeError(`--sample must be 1-${MAX_SAMPLE}`);
  }
  if (!PROVIDERS.includes(out.provider)) throw new TypeError("--provider must be espn, sleeper or yahoo");
  return out;
}

/** Only SELECT chains on the public crosswalk tables are reachable; anything else throws. */
function readOnlySupabase(client) {
  return {
    from(table) {
      if (!READ_TABLES.has(table)) throw new Error("table not allowed in read-only parity run");
      return new Proxy(client.from(table), {
        get(target, prop) {
          if (WRITE_METHODS.includes(prop)) throw new Error("write not allowed in read-only parity run");
          const value = target[prop];
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    },
    rpc() { throw new Error("rpc not allowed in read-only parity run"); },
  };
}

function safeCode(error) {
  const code = error?.code;
  return typeof code === "string" && /^[A-Za-z0-9_]{1,40}$/.test(code) ? code : "error";
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const value = sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
  return Math.round(value * 10) / 10;
}

const latency = (values) => ({ calls: values.length, p50_ms: percentile(values, 50), p95_ms: percentile(values, 95) });

function shuffled(values, rng) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function samplePlayerKeys({ supabase, provider, count, rng }) {
  const { data, error } = await supabase
    .from("player_provider_ids")
    .select("provider_player_id, players!inner(gsis_id)")
    .eq("provider", provider)
    .limit(POOL_ROWS);
  if (error) throw Object.assign(new Error("sample read failed"), { code: "sample_read_failed" });
  const byGsis = new Map();
  for (const row of data || []) {
    const gsis = row.players?.gsis_id;
    if (gsis && row.provider_player_id && !byGsis.has(gsis)) byGsis.set(gsis, `${provider}:${row.provider_player_id}`);
  }
  return shuffled([...byGsis.values()], rng).slice(0, count);
}

const single = (bundle, key) => ({
  usage: new Map(bundle.usage.has(key) ? [[key, bundle.usage.get(key)]] : []),
  weekly: new Map(bundle.weekly.has(key) ? [[key, bundle.weekly.get(key)]] : []),
});

const present = (bundle, key) => bundle.usage.has(key) || bundle.weekly.has(key);

const difference = (kind, gsisId, week, stat, legacy, warehouse) => ({
  kind, gsis_id: gsisId, week, stat, legacy: legacy ?? null, warehouse: warehouse ?? null,
});

/** Field-level detail for sample output; the counts come from compareUsageBundles itself. */
function fieldDifferences(legacy, warehouse, key, gsisId) {
  const out = [];
  const left = legacy.usage.get(key);
  const right = warehouse.usage.get(key);
  if (left && right) {
    for (const field of SUMMARY_FIELDS) {
      if (!equalValue(left[field], right[field])) out.push(difference("summary_field_mismatch", gsisId, null, field, left[field], right[field]));
    }
  }
  const byWeek = (rows) => new Map((rows || []).map((row) => [Number(row.week), row]));
  const lw = byWeek(legacy.weekly.get(key));
  const rw = byWeek(warehouse.weekly.get(key));
  for (const week of [...new Set([...lw.keys(), ...rw.keys()])].sort((a, b) => a - b)) {
    if (!lw.has(week)) out.push(difference("missing_legacy_week", gsisId, week, null, null, null));
    else if (!rw.has(week)) out.push(difference("missing_warehouse_week", gsisId, week, null, null, null));
    else {
      for (const field of WEEK_FIELDS) {
        if (!equalValue(lw.get(week)[field], rw.get(week)[field])) {
          out.push(difference("week_field_mismatch", gsisId, week, field, lw.get(week)[field], rw.get(week)[field]));
        }
      }
    }
  }
  return out;
}

async function timed(operation, sink) {
  const started = process.hrtime.bigint();
  try {
    return await operation();
  } finally {
    sink.push(Number(process.hrtime.bigint() - started) / 1e6);
  }
}

async function runParity({ args, supabase, readLegacy, readWarehouse, resolveGsis, rng = Math.random }) {
  const errors = { sample: 0, crosswalk: 0, legacy: 0, legacy_degraded: 0, warehouse: 0 };
  const errorCodes = new Set();
  const record = (bucket, error) => { errors[bucket] += 1; errorCodes.add(`${bucket}:${safeCode(error)}`); };

  let keys = args.playerKeys;
  if (!keys) {
    try { keys = await samplePlayerKeys({ supabase, provider: args.provider, count: args.sample, rng }); }
    catch (error) { record("sample", error); keys = []; }
  }

  let gsisByKey = new Map();
  try { gsisByKey = await resolveGsis(supabase, keys); } catch (error) { record("crosswalk", error); }

  const counts = {
    players_requested: keys.length, matched: 0, differing: 0,
    missing_on_legacy_only: 0, missing_on_warehouse_only: 0, absent_on_both: 0,
  };
  const kinds = {
    missing_legacy_player: 0, missing_warehouse_player: 0, missing_legacy_weeks: 0,
    missing_warehouse_weeks: 0, mismatched_fields: 0,
  };
  const samples = [];
  const legacyMs = [];
  const warehouseMs = [];
  // getUsageBundle swallows its own failures and returns empty maps; it reports them via log.warn.
  let degraded = 0;
  const log = { warn() { degraded += 1; }, error() { degraded += 1; }, info() {} };

  for (const key of keys) {
    const input = { supabase, playerKeys: [key], season: args.season, beforeWeek: args.week, log };
    const degradedBefore = degraded;
    let legacy = null;
    let warehouse = null;
    try { legacy = await timed(() => readLegacy(input), legacyMs); } catch (error) { record("legacy", error); }
    if (degraded > degradedBefore) record("legacy_degraded", { code: "legacy_reader_degraded" });
    try { warehouse = await timed(() => readWarehouse(input), warehouseMs); } catch (error) { record("warehouse", error); }
    if (!legacy || !warehouse || degraded > degradedBefore) continue; // an errored side is not a data difference

    const inLegacy = present(legacy, key);
    const inWarehouse = present(warehouse, key);
    if (!inLegacy && !inWarehouse) { counts.absent_on_both += 1; continue; }
    const legacyOne = single(legacy, key);
    const warehouseOne = single(warehouse, key);
    const result = compareUsageBundles(legacyOne, warehouseOne);
    kinds.missing_legacy_player += result.missing_legacy_players;
    kinds.missing_warehouse_player += result.missing_warehouse_players;
    kinds.missing_legacy_weeks += result.missing_legacy_weeks;
    kinds.missing_warehouse_weeks += result.missing_warehouse_weeks;
    kinds.mismatched_fields += result.mismatched_fields;
    if (result.outcome === "match") { counts.matched += 1; continue; }
    if (!inLegacy) counts.missing_on_legacy_only += 1;
    else if (!inWarehouse) counts.missing_on_warehouse_only += 1;
    else counts.differing += 1;

    const gsisId = gsisByKey.get(key);
    if (gsisId && samples.length < MAX_DIFFS) {
      const details = (inLegacy && inWarehouse)
        ? fieldDifferences(legacyOne, warehouseOne, key, gsisId)
        : [difference(inLegacy ? "missing_warehouse_player" : "missing_legacy_player", gsisId, null, null, null, null)];
      for (const detail of details) if (samples.length < MAX_DIFFS) samples.push(detail);
    }
  }

  return {
    report: "warehouse-shadow-parity",
    ok: !Object.values(errors).some((n) => n > 0),
    season: args.season,
    before_week: args.week,
    ...counts,
    difference_kinds: kinds,
    sample_differences: samples,
    latency: { legacy: latency(legacyMs), warehouse: latency(warehouseMs) },
    errors: { ...errors, codes: [...errorCodes].sort() },
  };
}

async function main({ argv = process.argv.slice(2), env = process.env, stdout = process.stdout } = {}) {
  const output = (record) => stdout.write(`${JSON.stringify(record)}\n`);
  let runtime;
  try {
    const args = parseArgs(argv);
    const { createClient } = require("@supabase/supabase-js");
    const { Pool } = require("pg");
    const config = require("./config");
    const { getUsageBundle, resolveGsis } = require("./services/playerUsage");
    const { getWarehouseUsageBundle } = require("./services/footballWarehouse/warehouseUsageBundle");
    const { createWarehouseReadRuntime } = require("./services/footballWarehouse/readRuntime");

    // Fail closed: a missing or wrong warehouse credential is an error here, never a silent skip.
    runtime = createWarehouseReadRuntime({ env: { ...env, FOOTBALL_DATA_MODE: "warehouse" }, Pool });
    const supabase = readOnlySupabase(createClient(config.supabaseUrl, config.supabaseServiceKey));
    const result = await runParity({
      args, supabase, resolveGsis,
      readLegacy: (input) => getUsageBundle(input),
      readWarehouse: (input) => getWarehouseUsageBundle({ ...input, repository: runtime.repository }),
    });
    output(result);
    return result.ok ? 0 : 1;
  } catch (error) {
    const config = error instanceof TypeError || error instanceof RangeError;
    output({ report: "warehouse-shadow-parity", ok: false, state: "failed", code: config ? "invalid_input_or_config" : safeCode(error) });
    return 1;
  } finally {
    try { await runtime?.close(); } catch {}
  }
}

if (require.main === module) {
  main().then((code) => { process.exitCode = code; });
}

module.exports = { main, parseArgs, runParity, readOnlySupabase, percentile };
