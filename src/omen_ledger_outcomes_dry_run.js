#!/usr/bin/env node
"use strict";

// Read-only dry run of Ledger scoring for one finished week, computed from the football warehouse.
// It shows what Tuesday scoring WOULD record. It writes nothing, does not need scoring enabled, never
// touches OMEN_CRON_SCORING_ENABLED, and never calls the GitHub CSV path. Run inside the API container,
// which has the Supabase env and the warehouse reader secret (FOOTBALL_DATA_MODE must be shadow|warehouse):
//
//   docker exec omen_api node src/omen_ledger_outcomes_dry_run.js --season 2026 --week 5
//
// Output is ONE JSON object: counts and one preview row per call (opaque decision id, proposed state,
// result, provenance, summary). No user, league, provider id or secret is printed.

const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");
const { footballDataMode, createFailSafeWarehouseReadRuntime } = require("./services/footballWarehouse/readRuntime");
const { previewLedgerOutcomes } = require("./omen_tuesday_cron");

const WRITE_METHODS = ["insert", "update", "upsert", "delete"];

function parseArgs(argv) {
  const out = { season: null, week: null };
  for (let i = 0; i < argv.length; i += 2) {
    const value = argv[i + 1];
    if (value == null) throw new TypeError(`${argv[i]} needs a value`);
    if (argv[i] === "--season") out.season = Number(value);
    else if (argv[i] === "--week") out.week = Number(value);
    else throw new TypeError(`unknown flag ${argv[i]}`);
  }
  if (!Number.isInteger(out.season) || out.season < 1999 || out.season > 2100) throw new TypeError("--season must be a year");
  if (!Number.isInteger(out.week) || out.week < 1 || out.week > 18) throw new TypeError("--week must be 1-18");
  return out;
}

/** Only SELECT chains can run; any write method throws before it reaches Supabase. */
function readOnlySupabase(client) {
  return {
    from(table) {
      return new Proxy(client.from(table), {
        get(target, prop) {
          if (WRITE_METHODS.includes(prop)) throw new Error("write not allowed in a Ledger dry run");
          const value = target[prop];
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    },
    rpc() { throw new Error("rpc not allowed in a Ledger dry run"); },
  };
}

async function main({ argv = process.argv.slice(2), env = process.env } = {}) {
  const { season, week } = parseArgs(argv);
  if (footballDataMode(env) === "supabase") throw new Error("FOOTBALL_DATA_MODE must be shadow or warehouse");
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required");

  const runtime = createFailSafeWarehouseReadRuntime({ env, Pool });
  try {
    if (!runtime.outcomeRepository) throw new Error("warehouse reader is unavailable");
    const supabase = readOnlySupabase(createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }));
    const report = await previewLedgerOutcomes(supabase, { season, week, repository: runtime.outcomeRepository });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await runtime.close();
  }
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((error) => {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  });
}

module.exports = { parseArgs, readOnlySupabase, main };
