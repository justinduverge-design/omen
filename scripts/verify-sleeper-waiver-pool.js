"use strict";

/**
 * B2-D-S3 — live capability proof for the Sleeper waiver pool.
 *
 * Answers the one question the unit tests structurally cannot: does the pool
 * actually exclude players held by other teams in a real league?
 *
 * That check is *undecidable* in a `pre_draft` league. With nobody rostered,
 * a working subtraction and a broken one produce identical output — which is
 * exactly why the 2026-07-26 run could not close S3, and why the ESPN E0
 * spike hit the same wall independently on 2026-07-27. Run this again once a
 * league has drafted.
 *
 * Sleeper needs no credentials. Every call is a public GET, and a league id is
 * not a secret. Read-only: this never writes, claims, or drops anything.
 *
 *   node scripts/verify-sleeper-waiver-pool.js <leagueId> [leagueId...]
 *
 * Exit codes: 0 pass or undecidable, 1 leak detected, 2 usage/fetch error.
 */

const path = require("node:path");

// The adapter pulls config, which requires Supabase env vars at import time.
// This script never touches Supabase — placeholders keep the import happy
// without implying a real connection.
process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "verify-script-no-db-access";

const sleeper = require(path.join(__dirname, "..", "src", "adapters", "sleeper.js"));

const ROSTER_ARRAYS = ["players", "starters", "reserve", "taxi"];

async function rosteredPlayerIds(leagueId) {
  const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
  if (!res.ok) throw new Error(`rosters returned HTTP ${res.status}`);
  const rosters = await res.json();

  const held = new Set();
  for (const roster of rosters) {
    for (const key of ROSTER_ARRAYS) {
      for (const id of roster?.[key] || []) {
        // "0" is Sleeper's empty placeholder slot, not a player.
        if (id && id !== "0") held.add(String(id));
      }
    }
  }
  return { held, teams: rosters.length };
}

async function verify(leagueId) {
  const league = await sleeper.fetchSleeperLeague(leagueId);
  const { held, teams } = await rosteredPlayerIds(leagueId);

  const startedAt = Date.now();
  const pool = await sleeper.fetchSleeperAvailablePlayers(leagueId, 1, String(league.season));
  const elapsedMs = Date.now() - startedAt;

  const projected = pool.filter((p) => p.projected_points != null).length;
  const leaked = pool.filter((p) => held.has(String(p.player_id)));

  // Unknown projections must sort strictly last — a null is "unknown", not zero.
  const firstNull = pool.findIndex((p) => p.projected_points == null);
  const nullsLast = firstNull === -1 || pool.slice(firstNull).every((p) => p.projected_points == null);

  const decidable = held.size > 0;

  console.log(`\n=== league status: ${String(league.status).toUpperCase()} · ${teams} teams · season ${league.season} ===`);
  console.log(`  rostered league-wide  : ${held.size}`);
  console.log(`  pool size             : ${pool.length} (${elapsedMs}ms)`);
  console.log(`  with projections      : ${projected}`);
  console.log(`  nulls sorted last     : ${nullsLast ? "yes" : "NO — BUG"}`);
  console.log(`  top 3                 : ${pool.slice(0, 3).map((p) => `${p.name} ${p.projected_points}`).join(" | ")}`);

  if (!decidable) {
    console.log(`  SUBTRACTION           : UNDECIDABLE — nobody is rostered yet.`);
    console.log(`                          Returning every eligible player is the CORRECT`);
    console.log(`                          answer here, which is why this cannot close S3.`);
    console.log(`                          Re-run after the draft.`);
    return { ok: true, decidable: false };
  }

  if (leaked.length) {
    console.log(`  SUBTRACTION           : FAIL — ${leaked.length} rostered player(s) leaked into the pool`);
    leaked.slice(0, 10).forEach((p) => console.log(`      leaked: ${p.name} (${p.player_id})`));
    return { ok: false, decidable: true };
  }

  console.log(`  SUBTRACTION           : PASS — 0 of ${held.size} rostered players appear in the pool`);
  return { ok: true, decidable: true };
}

(async () => {
  const ids = process.argv.slice(2);
  if (!ids.length) {
    console.error("usage: node scripts/verify-sleeper-waiver-pool.js <leagueId> [leagueId...]");
    process.exit(2);
  }

  let failed = false;
  let anyDecidable = false;

  for (const id of ids) {
    try {
      const result = await verify(id);
      if (!result.ok) failed = true;
      if (result.decidable) anyDecidable = true;
    } catch (err) {
      console.error(`\nleague ${id}: ERROR — ${err.message}`);
      process.exit(2);
    }
  }

  console.log(
    anyDecidable
      ? `\n${failed ? "S3 NOT PROVEN — subtraction leaked." : "S3 PROVEN — roster subtraction verified against a drafted league."}`
      : `\nS3 still open: every league checked is undrafted.`
  );
  process.exit(failed ? 1 : 0);
})();
