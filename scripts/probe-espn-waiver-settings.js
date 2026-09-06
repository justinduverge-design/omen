#!/usr/bin/env node
"use strict";

/**
 * ESPN waiver-settings probe — spec Phase 0 for ESPN.
 * league-aware-waiver-system-v1.
 *
 * The ESPN mapping in src/services/waiverSystem.js `fromEspn()` was VERIFIED
 * 2026-09-05 against three real leagues — see the spec's Phase 0 findings.
 * This script remains useful for re-confirming it against a new league, or
 * after ESPN changes its payload.
 *
 * Needs a real league session. It prints what ESPN actually returns and
 * whether the mapping holds.
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
    console.log("VERDICT: mapping did NOT hold for this league. ESPN stays §6.2-restricted here,");
    console.log("which is correct and safe — no wrong value can reach a user. The mapping was");
    console.log("verified against three leagues on 2026-09-05, so this is either a league in an");
    console.log("unusual configuration or a payload change. Use the raw dump above, then record");
    console.log("what you found in the spec's Phase 0 findings.");
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
