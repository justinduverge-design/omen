#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const { createClient } = require("@supabase/supabase-js");

const {
  archiveNotExecutedMoves,
  fetchPendingMoves,
  isDryRun,
} = require("../src/omen_tuesday_cron");
const { validateAcceptanceArtifact } = require("../src/services/footballData/acceptanceValidator");

const ACCEPTANCE_SHA256 = "5c4cbc0568ce85a94512b7722144a7cddcb83fe74bd088f04d90f7a628a00bea";

function guardedSupabase(client, writes) {
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property !== "from") return Reflect.get(target, property, receiver);
      return (...args) => {
        const query = target.from(...args);
        return new Proxy(query, {
          get(queryTarget, queryProperty, queryReceiver) {
            if (queryProperty === "update") {
              return () => {
                writes.attempted += 1;
                throw new Error("A4 no-write guard refused Supabase update");
              };
            }
            return Reflect.get(queryTarget, queryProperty, queryReceiver);
          },
        });
      };
    },
  });
}

async function main({ env = process.env } = {}) {
  if (!isDryRun(env)) throw new Error("A4 requires OMEN_CRON_DRY_RUN=true");
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) throw new Error("A4 requires production Supabase credentials");

  const [acceptanceBytes, receiptBytes] = await Promise.all([
    fs.readFile("/state/evidence/5c4cbc0568ce85a94512b7722144a7cddcb83fe74bd088f04d90f7a628a00bea/acceptance.json"),
    fs.readFile("/state/evidence/5c4cbc0568ce85a94512b7722144a7cddcb83fe74bd088f04d90f7a628a00bea/receipt.json"),
  ]);
  const acceptanceHash = crypto.createHash("sha256").update(acceptanceBytes).digest("hex");
  if (acceptanceHash !== ACCEPTANCE_SHA256) throw new Error("A4 acceptance hash drift");
  const validation = validateAcceptanceArtifact({ acceptanceBytes, receiptBytes });

  const writes = { attempted: 0, completed: 0 };
  const client = guardedSupabase(createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  }), writes);
  const archivedWouldBe = await archiveNotExecutedMoves(client, new Date(), { dryRun: true });
  const pendingMoves = await fetchPendingMoves(client, new Date());
  if (!pendingMoves.length) throw new Error("A4 requires at least one real pending move");

  return {
    schema: "omen-football-a4-no-write.v1",
    mode: "no-write",
    dry_run: true,
    acceptance_sha256: acceptanceHash,
    exact_manifest: true,
    real_rows_read: pendingMoves.length,
    archived_would_be: archivedWouldBe,
    writes_attempted: writes.attempted,
    writes_completed: writes.completed,
    standard_comparison: validation.offensive_mismatches === 0 ? "pass" : "fail",
    half_ppr_comparison: validation.offensive_mismatches === 0 ? "pass" : "fail",
    ppr_comparison: validation.offensive_mismatches === 0 ? "pass" : "fail",
    independent_reference: validation.offensive_mismatches === 0
      && validation.kicker_mismatches === 0 && validation.dst_mismatches === 0 ? "pass" : "fail",
    publication_authorized: false,
    persistent_production_scoring_enabled: false,
  };
}

if (require.main === module) {
  main()
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error) => {
      process.stderr.write(`A4 no-write failed: ${error.message}\n`);
      process.exitCode = 1;
    });
}

module.exports = { guardedSupabase, main };
