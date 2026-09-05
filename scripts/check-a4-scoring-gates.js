#!/usr/bin/env node
"use strict";

/**
 * A4 — mechanically check whether Tuesday scoring may be enabled.
 *
 * The founder asked whether enabling can be automated for the season opener. This is the
 * honest form of that: **automate the check, not the decision.**
 *
 * A date-triggered flip would turn scoring on whether or not the evidence existed. The
 * evidence gate is not "is it September" — it is "did a real recommendation actually land
 * with correct scoring metadata". Those came apart three separate times this week, most
 * recently when a clamped week number was read as proof the season had started nine days
 * early. So this script verifies reality and refuses to assert anything it cannot observe.
 *
 * Usage:
 *   node scripts/check-a4-scoring-gates.js            # report only (default, safe)
 *   node scripts/check-a4-scoring-gates.js --json     # machine-readable, for alerting
 *   node scripts/check-a4-scoring-gates.js --enable   # flip the flag ONLY if every gate passes
 *
 * Exit codes: 0 all gates pass · 1 one or more fail · 2 could not check.
 *
 * `--enable` prints the exact command rather than mutating deploy config itself. Editing
 * `.env.production` and recreating a container is a production change, and this script
 * refusing to do it silently is deliberate.
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("node:fs");
const path = require("node:path");
const { getCurrentNflWeekContext, isOffSeason } = require("../src/services/nflSchedule");

const REPO_ROOT = path.join(__dirname, "..");
const JSON_MODE = process.argv.includes("--json");
const ENABLE_MODE = process.argv.includes("--enable");

/** A gate that cannot be observed is a FAIL, never a pass-by-default. */
function gate(id, description, status, detail) {
  return { id, description, status, detail };
}

function evidenceFileExists(relativePath) {
  return fs.existsSync(path.join(REPO_ROOT, relativePath));
}

/**
 * Test-only clock override, so the season gate can be exercised on BOTH sides of
 * kickoff without waiting for the calendar.
 *
 * Deliberately self-announcing: whenever it is set, the override is stamped into
 * `season_started`'s own detail string and into the JSON output. This checker's whole
 * job is to gate enabling production scoring, so a faked clock must never be able to
 * produce a clean-looking record — anything generated under an override says so, in the
 * same line a reader would quote as evidence.
 *
 * An unparseable value is a hard error rather than a silent fall back to the real clock:
 * a typo that quietly re-reads `new Date()` is exactly how a test starts passing for the
 * wrong reason.
 */
function resolveNow() {
  const raw = process.env.OMEN_GATES_NOW;
  if (!raw) return { now: new Date(), override: null };
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`OMEN_GATES_NOW is not a valid date: ${JSON.stringify(raw)}`);
  }
  return { now: parsed, override: raw };
}

async function checkGates() {
  const gates = [];
  const { now, override: nowOverride } = resolveNow();
  const context = getCurrentNflWeekContext(now);

  // --- Gate A: the season has actually started -------------------------------
  // Read from is_off_season, never from the clamped week. That clamp is exactly what
  // produced a false "the floor is cleared" record on 2026-08-27.
  gates.push(gate(
    "season_started",
    "The NFL regular season has actually opened",
    context.is_off_season ? "FAIL" : "PASS",
    `season=${context.season} raw_week=${context.raw_week} is_off_season=${context.is_off_season}`
      + (nowOverride ? ` now_override=${nowOverride}` : "")
      + (context.is_off_season ? " — grading before kickoff would score games that have not happened" : "")
  ));

  // --- Gate B: O2 rollback drill evidence exists ------------------------------
  const drill = "Direction/reviews/2026-08-27-o2-rollback-drill.md";
  // Distinguish "the drill did not happen" from "this process cannot see the repo".
  // Running inside the production container there is no checkout, and reporting FAIL there
  // would assert something false — the same shape of error as reading a clamped week as a
  // real one. Absent repo is UNKNOWN, which still blocks, but blocks honestly.
  const hasRepo = fs.existsSync(path.join(REPO_ROOT, "Direction"));
  gates.push(gate(
    "o2_rollback_drill",
    "O2 rollback drill executed, with a named owner",
    !hasRepo ? "UNKNOWN" : (evidenceFileExists(drill) ? "PASS" : "FAIL"),
    !hasRepo
      ? "no repo checkout visible from here — run this from the repo to check drill evidence"
      : evidenceFileExists(drill)
        ? `${drill}; owner standing per facts-of-record #15`
        : `missing ${drill}`
  ));

  // --- Gates C/D: a real post-kickoff row with real scoring metadata ----------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    gates.push(gate("production_row", "A real recommendation carries full scoring metadata", "UNKNOWN",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set — run inside the omen_api container"));
    return { gates, context };
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("moves")
    .select("id,created_at,season,week_num,scoring,scoring_contract_required,scoring_coverage_state,scoring_contract_version,scoring_contract_hash,provider_rule_snapshot_hash")
    .eq("season", context.season)
    .eq("scoring_contract_required", true)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    gates.push(gate("production_row", "A real recommendation carries full scoring metadata", "UNKNOWN",
      `moves lookup failed: ${error.message}`));
    return { gates, context };
  }

  const rows = data || [];
  gates.push(gate(
    "production_row",
    "At least one real recommendation exists for this season with the contract marker",
    rows.length ? "PASS" : "FAIL",
    rows.length
      ? `${rows.length} row(s); newest ${rows[0].created_at}`
      : "no post-repair row yet — open the app once after kickoff to generate one"
  ));

  // A row is not enough. Its metadata has to be real, or scoring would grade against
  // nothing and call it league-exact.
  const complete = rows.filter((r) =>
    r.scoring_contract_version && r.scoring_contract_hash && r.provider_rule_snapshot_hash
    && r.scoring_coverage_state && r.scoring_coverage_state !== "pending");

  gates.push(gate(
    "row_metadata_usable",
    "That recommendation's scoring metadata is complete and not merely pending",
    complete.length ? "PASS" : "FAIL",
    complete.length
      ? `coverage_state=${complete[0].scoring_coverage_state} version=${complete[0].scoring_contract_version}`
      : rows.length
        ? `newest row coverage_state=${rows[0].scoring_coverage_state || "null"} — rules were not captured, so a grade would not be league-exact`
        : "no row to inspect"
  ));

  // --- Gate E: the flag is currently off --------------------------------------
  const flag = String(process.env.OMEN_CRON_SCORING_ENABLED || "").toLowerCase();
  gates.push(gate(
    "flag_currently_off",
    "Tuesday scoring is currently disabled (nothing to do if already on)",
    flag === "true" ? "ALREADY_ON" : "PASS",
    `OMEN_CRON_SCORING_ENABLED=${flag || "unset"}`
  ));

  return { gates, context };
}

(async () => {
  let result;
  try {
    result = await checkGates();
  } catch (error) {
    if (JSON_MODE) console.log(JSON.stringify({ ok: false, error: error.message }));
    else console.error(`could not check: ${error.message}`);
    process.exit(2);
  }

  const { gates, context } = result;
  const failed = gates.filter((g) => g.status === "FAIL");
  const unknown = gates.filter((g) => g.status === "UNKNOWN");
  const ready = failed.length === 0 && unknown.length === 0;

  if (JSON_MODE) {
    console.log(JSON.stringify({ ok: ready, context, gates }, null, 2));
  } else {
    console.log("A4 — Tuesday scoring enablement gates\n");
    for (const g of gates) {
      const mark = { PASS: "PASS  ", FAIL: "FAIL  ", UNKNOWN: "UNKNOWN", ALREADY_ON: "ON    " }[g.status];
      console.log(`  [${mark}] ${g.description}`);
      console.log(`           ${g.detail}`);
    }
    console.log("");
    if (ready) {
      console.log("ALL GATES PASS. Tuesday scoring may be enabled.");
      console.log("");
      console.log("  On KVM1, as a deliberate production change:");
      console.log("    sudo sed -i 's/^OMEN_CRON_SCORING_ENABLED=false/OMEN_CRON_SCORING_ENABLED=true/' \\");
      console.log("      /opt/omen/deploy/hostinger/.env.production");
      console.log("    cd /opt/omen/deploy/hostinger && sudo docker compose \\");
      console.log("      -f docker-compose.prod.yml --project-name omen up -d --no-build cron");
    } else {
      console.log(`NOT READY — ${failed.length} failing, ${unknown.length} unknown. Do not enable scoring.`);
    }
  }

  // --enable deliberately does not mutate anything. It reports and exits; the operator runs
  // the printed command. A script that edits production env and recreates a container on a
  // timer is precisely the unattended production change the safety gates exist to prevent.
  if (ENABLE_MODE && !JSON_MODE) {
    console.log("");
    console.log(ready
      ? "--enable: gates pass. Run the command above; this script will not edit production env itself."
      : "--enable: refused. Gates are not green.");
  }

  process.exit(ready ? 0 : 1);
})();
