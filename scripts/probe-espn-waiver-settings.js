#!/usr/bin/env node
"use strict";

/**
 * ESPN waiver-settings probe — spec Phase 0 for ESPN.
 * league-aware-waiver-system-v1.
 *
 * Confirms or refutes the PROVISIONAL ESPN mapping in
 * src/services/waiverSystem.js `fromEspn()`, which currently fails closed
 * because nothing in this repo records ESPN's waiver settings shape.
 *
 * Needs a real league session. Run it yourself; it prints what ESPN actually
 * returns and whether the mapping holds.
 *
 *   node scripts/probe-espn-waiver-settings.js <leagueId> <espn_s2> <swid>
 *
 * The credentials are read from argv and used for one read-only GET. Nothing
 * is written, stored, or logged — but they will be in your shell history, so
 * prefer a leading space or a subshell if that matters to you.
 */

// This probe makes one read-only ESPN call and touches no database. The shared
// config module demands these at import time, so satisfy it without implying a
// real backend is involved.
process.env.SUPABASE_URL ||= "https://probe.invalid";
process.env.SUPABASE_SERVICE_KEY ||= "probe-not-used";

const espn = require("../src/adapters/espn");
const { fromEspn } = require("../src/services/waiverSystem");

const [leagueId, espnS2, swid] = process.argv.slice(2);

if (!leagueId || !espnS2 || !swid) {
  console.error("usage: node scripts/probe-espn-waiver-settings.js <leagueId> <espn_s2> <swid>");
  process.exit(2);
}

function show(label, value) {
  console.log(`  ${label.padEnd(42)} ${JSON.stringify(value)}`);
}

(async () => {
  const data = await espn.fetchEspnApi(leagueId, espnS2, swid, ["mTeam", "mSettings"], null);

  const settings = data?.settings || null;
  console.log(`\nLeague: ${settings?.name ?? "(name unreadable)"}  [${leagueId}]\n`);

  console.log("RAW settings keys:");
  console.log("  " + Object.keys(settings || {}).join(", ") + "\n");

  const acq = settings?.acquisitionSettings;
  console.log("settings.acquisitionSettings:");
  if (!acq) {
    console.log("  ABSENT — the provisional mapping's assumed container does not exist.");
    console.log("  Look through the RAW settings keys above for the waiver container and");
    console.log("  correct fromEspn() to match. Do not widen it to a guess.\n");
  } else {
    for (const k of Object.keys(acq).sort()) show(k, acq[k]);
    console.log("");
  }

  const teams = Array.isArray(data?.teams) ? data.teams : [];
  console.log(`teams: ${teams.length}. Waiver-relevant fields on the first three:`);
  for (const t of teams.slice(0, 3)) {
    console.log(`  team ${t.id}:`);
    show("waiverRank", t.waiverRank);
    show("transactionCounter.acquisitionBudgetSpent", t?.transactionCounter?.acquisitionBudgetSpent);
  }
  console.log("");

  const model = fromEspn({ settings, team: teams[0] || null });
  console.log("PROVISIONAL MAPPING RESULT:");
  console.log("  " + JSON.stringify(model, null, 2).split("\n").join("\n  "));
  console.log("");

  if (model.system === "not_determined") {
    console.log("VERDICT: mapping did NOT hold. ESPN stays §6.2-restricted, which is correct");
    console.log("and safe — no wrong value can reach a user. Use the raw dump above to fix");
    console.log("fromEspn(), then re-run this probe. Record the result in the spec's Phase 0.");
  } else {
    console.log(`VERDICT: mapping HELD — this league reads as ${model.system}.`);
    console.log("Confirm against ESPN's own league settings screen before trusting it, then");
    console.log("record the confirmed field names in the spec's Phase 0 findings.");
  }
  console.log("");
})().catch((e) => {
  console.error("\nprobe failed:", e?.message || e);
  console.error("A 401/403 means the session is stale — reconnect ESPN and retry.\n");
  process.exit(1);
});
