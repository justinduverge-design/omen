#!/usr/bin/env node
"use strict";

/**
 * Yahoo waiver-settings probe — spec Phase 0 for Yahoo.
 * league-aware-waiver-system-v1.
 *
 * Confirms or refutes the PROVISIONAL Yahoo mapping in
 * src/services/waiverSystem.js `fromYahoo()`, which fails closed because
 * `/league/{key}/settings` has never been read.
 *
 * Yahoo's entitlement is LIVE (facts-of-record #11, granted 2026-08-28), so
 * this is runnable — it just needs to run somewhere that holds the stored
 * token. Same shape as the 2026-08-28 access probe: read-only, through the
 * normal getAuthenticatedYahooClient() path, from inside the production
 * omen_api container.
 *
 *   node scripts/probe-yahoo-waiver-settings.js <userId> [leagueKey]
 *
 * Omit leagueKey to probe every bound league. Nothing is written.
 *
 * TWO UNKNOWNS, and the script reports on both:
 *   1. which fields carry the waiver system
 *   2. which of Yahoo's two serialisations this endpoint uses (flat object, or
 *      array of single-key objects) — see the note atop src/services/yahoo.js
 */

const [userId, leagueKeyArg] = process.argv.slice(2);

// Argv is checked BEFORE the requires below: yahooAuth pulls the shared config,
// which exits hard on missing SUPABASE_* env. Without this, running the script
// anywhere but the container prints a config error instead of its usage.
if (!userId || userId === "--help" || userId === "-h") {
  console.error("usage: node scripts/probe-yahoo-waiver-settings.js <userId> [leagueKey]");
  console.error("");
  console.error("Reads the stored Yahoo token, so it must run where SUPABASE_URL and");
  console.error("SUPABASE_SERVICE_KEY are set — i.e. inside the omen_api container.");
  process.exit(2);
}

const { getAuthenticatedYahooClient } = require("../src/services/yahooAuth");
const { fromYahoo } = require("../src/services/waiverSystem");

function describeShape(raw) {
  if (raw == null) return "null/absent";
  if (Array.isArray(raw)) return `ARRAY of ${raw.length} (Yahoo's array-of-single-key-objects form)`;
  if (typeof raw === "object") return `FLAT OBJECT with ${Object.keys(raw).length} keys`;
  return typeof raw;
}

function waiverish(obj) {
  if (!obj || typeof obj !== "object") return {};
  const flat = Array.isArray(obj) ? Object.assign({}, ...obj.filter((x) => x && typeof x === "object")) : obj;
  const hits = {};
  for (const [k, v] of Object.entries(flat)) {
    if (/waiver|faab|acquisition|budget|bid/i.test(k)) hits[k] = v;
  }
  return hits;
}

(async () => {
  const { client } = await getAuthenticatedYahooClient(userId);

  let leagueKeys = [];
  if (leagueKeyArg) {
    leagueKeys = [leagueKeyArg];
  } else {
    const leagues = await client.getUserLeagues();
    leagueKeys = (leagues || []).map((l) => l.league_id || l.league_key).filter(Boolean);
    console.log(`\nBound leagues: ${leagueKeys.length ? leagueKeys.join(", ") : "(none)"}\n`);
  }

  if (!leagueKeys.length) {
    console.log("No leagues to probe. Bind one via GET /api/yahoo/leagues + POST /api/yahoo/league.\n");
    return;
  }

  for (const key of leagueKeys) {
    console.log(`=== ${key} ===`);
    let raw;
    try {
      raw = await client.getLeagueSettings(key);
    } catch (e) {
      console.log(`  settings call FAILED: ${e?.message || e}\n`);
      continue;
    }

    console.log(`  top-level shape         : ${describeShape(raw)}`);
    const first = Array.isArray(raw) ? raw[0] : raw;
    console.log(`  league[0] shape         : ${describeShape(first)}`);

    const nested = Array.isArray(raw)
      ? raw.find((x) => x && typeof x === "object" && "settings" in x)?.settings
      : first?.settings;
    console.log(`  .settings shape         : ${describeShape(nested)}`);

    const container = Array.isArray(nested) ? nested[0] : nested;
    const hits = waiverish(container ?? first);
    console.log("  waiver-ish fields found :");
    if (!Object.keys(hits).length) {
      console.log("    NONE — dump the raw payload and find the container by hand.");
    } else {
      for (const [k, v] of Object.entries(hits)) {
        console.log(`    ${k.padEnd(28)} ${JSON.stringify(v)}`);
      }
    }

    let team = null;
    try {
      const teamKey = await client.getMyTeamKey(key);
      const td = await client.get(`/team/${teamKey}`);
      team = td?.fantasy_content?.team?.[0] ?? null;
      console.log(`  team[0] shape           : ${describeShape(team)}`);
      const th = waiverish(team);
      console.log("  team waiver-ish fields  :", Object.keys(th).length ? JSON.stringify(th) : "NONE");
    } catch (e) {
      console.log(`  team read failed        : ${e?.message || e}`);
    }

    const model = fromYahoo({ settings: first, team });
    console.log(`  MAPPING RESULT          : ${model.system}` + (model.reason ? ` (${model.reason})` : ""));
    if (model.system === "not_determined") {
      console.log("  VERDICT: did NOT hold. Yahoo stays §6.2-restricted, which is correct and safe.");
      console.log("           Correct fromYahoo() from the fields above — do NOT widen it to a guess,");
      console.log("           and do not hand-build a fixture from what the parser expects.");
    } else {
      console.log(`  VERDICT: HELD — reads as ${model.system}. Confirm against Yahoo's own league`);
      console.log("           settings screen, then record the field names in the spec's Phase 0.");
    }
    console.log("");
  }
})().catch((e) => {
  console.error("\nprobe failed:", e?.message || e);
  console.error("A 401/403 here would mean the entitlement or token regressed — re-check");
  console.error("GET /api/yahoo/access-probe before assuming a mapping problem.\n");
  process.exit(1);
});
