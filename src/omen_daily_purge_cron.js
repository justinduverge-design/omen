"use strict";

/**
 * Omen daily purge worker (database redo, plan A3).
 *
 * Runs the redo's 30-day retention purges through the server key:
 *   - beta_reports_purge_expired()  step 09: beta reports past their retention date
 *   - retired_rows_purge_due()      step 08: retired Ledger rows past their 30-day hold
 *
 * Each run logs one line per purge with its count. A purge whose function does not exist yet
 * (its redo step is not applied) is skipped quietly, so this job can ship before steps 08 and 09.
 * Any other failure is logged, reported to error tracking, and fails the run after the remaining
 * purges have been tried.
 */

const { initSentry, flushSentry } = require("./middleware/sentry");

const PURGES = Object.freeze(["beta_reports_purge_expired", "retired_rows_purge_due"]);
// PostgREST reports an unknown function as PGRST202; Postgres itself as 42883.
const MISSING_FUNCTION_CODES = new Set(["PGRST202", "42883"]);

const defaultLog = {
  info: (...args) => console.log(`[${new Date().toISOString()}] [omen-purge]`, ...args),
  error: (...args) => console.error(`[${new Date().toISOString()}] [omen-purge] ERROR`, ...args),
};

async function runPurges({ client, log = defaultLog }) {
  const result = {};
  const failed = [];
  for (const name of PURGES) {
    const { data, error } = await client.rpc(name);
    if (error && MISSING_FUNCTION_CODES.has(error.code)) {
      result[name] = "skipped";
      log.info(`${name} skipped: function not present (its redo step is not applied)`);
    } else if (error) {
      failed.push(name);
      log.error(`${name} failed: ${error.code || "unknown"}`);
    } else {
      result[name] = Number(data) || 0;
      log.info(`${name} purged ${result[name]}`);
    }
  }
  if (failed.length) throw new Error(`purge failed: ${failed.join(", ")}`);
  return result;
}

if (require.main === module) {
  initSentry({ component: "cron-purge" });
  const Sentry = require("@sentry/node");
  const { createClient } = require("@supabase/supabase-js");
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].filter((key) => !process.env[key]);
  (async () => {
    if (missing.length) throw new Error(`missing env: ${missing.join(", ")}`);
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
    await runPurges({ client });
  })().then(
    async () => {
      await flushSentry();
      process.exit(0);
    },
    async (err) => {
      defaultLog.error(err.message);
      Sentry.captureException(err);
      await flushSentry();
      process.exit(1);
    }
  );
}

module.exports = { runPurges, PURGES };
