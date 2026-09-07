"use strict";
/**
 * ESPN matchup-projection proof, run against the founder's OWN connected league, through the
 * app's own code path.
 *
 * WHY THIS EXISTS ALONGSIDE `espn-projection-proof.sh`:
 * The shell script asks the founder to paste cookies into their terminal. That is the right
 * shape for a stranger's machine and the wrong shape here — this repo already holds the
 * credentials, the app already knows how to read them, and asking a founder to hand-extract a
 * cookie to test his own product is work the tool should be doing. This script asks the same
 * four questions with **no credential handling by the operator**: `getAuthenticatedEspnCredentials`
 * fetches and decrypts them exactly as `espnOverview` does in production.
 *
 * IT PRINTS: field names, presence, types, counts, and the derived projection.
 * IT NEVER PRINTS: `espn_s2`, `SWID`, any cookie, any token, or any Supabase key.
 *
 * Read-only. Two GETs per league. No writes, no deploy, no state change.
 *
 *   node scripts/espn-projection-live-proof.js            # every connected ESPN league
 *   ESPN_WEEK=1 node scripts/espn-projection-live-proof.js
 */
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const espn = require("../src/adapters/espn");
const { getAuthenticatedEspnCredentials } = require("../src/services/espnAuth");

const WEEK = Number(process.env.ESPN_WEEK || 1);
const SEASON = Number(process.env.ESPN_SEASON || 2026);

/** Never returns a value — only its shape. Keeps a stray console.log from leaking a cookie. */
function shape(v) {
  if (v === null) return "null";
  if (v === undefined) return "ABSENT";
  if (Array.isArray(v)) return `list[${v.length}]`;
  if (typeof v === "object") return `object(${Object.keys(v).length} keys)`;
  return typeof v;
}

const NON_STARTER = new Set([20, 21, 22, 25]);

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase
    .from("platform_connections")
    .select("user_id, league_id, espn_team_id")
    .eq("platform", "espn");

  if (error) throw new Error(`connection lookup failed: ${error.message}`);
  if (!data || !data.length) {
    console.log("No ESPN connections on this project. Connect one in the app, then re-run.");
    return;
  }

  console.log(`Season ${SEASON}, week ${WEEK}. ${data.length} ESPN connection(s).\n`);

  for (const row of data) {
    console.log(`=== league ${row.league_id} (team ${row.espn_team_id ?? "unknown"}) ===`);
    let creds;
    try {
      creds = await getAuthenticatedEspnCredentials(row.user_id);
    } catch (e) {
      console.log(`  credentials unavailable: ${e.message}\n`);
      continue;
    }

    // Q1/Q2/Q3 — the raw payload, exactly the views fetchEspnMatchup now requests.
    let raw;
    try {
      raw = await espn.fetchEspnApi(row.league_id, creds.espn_s2, creds.swid,
        ["mMatchup", "mMatchupScore"], WEEK, { seasonId: SEASON });
    } catch (e) {
      console.log(`  ESPN read failed: ${e.message}\n`);
      continue;
    }

    const games = Array.isArray(raw?.schedule) ? raw.schedule : [];
    const target = String(row.espn_team_id ?? "");
    const game = games.find((g) => {
      const ids = [g?.home?.teamId, g?.away?.teamId].map((x) => String(x));
      return Number(g?.matchupPeriodId ?? g?.scoringPeriodId) === WEEK && ids.includes(target);
    }) || games.find((g) => Number(g?.matchupPeriodId ?? g?.scoringPeriodId) === WEEK);

    console.log(`  schedule                       -> ${shape(games)}`);
    if (!game) { console.log("  no game for this week\n"); continue; }

    const side = String(game?.home?.teamId) === target ? game.home : game.away;
    for (const f of ["totalProjectedPoints", "totalProjectedPointsLive", "totalPoints", "winProbability"]) {
      console.log(`  ${f.padEnd(30)} -> ${shape(side?.[f])}`);
    }
    for (const f of ["rosterForCurrentScoringPeriod", "rosterForMatchupPeriod"]) {
      const entries = side?.[f]?.entries;
      console.log(`  ${f.padEnd(30)} -> ${shape(side?.[f])}, entries=${shape(entries)}`);
    }

    // Q4 — do starters carry a statSourceId 1 row for this week?
    const entries = side?.rosterForCurrentScoringPeriod?.entries
      || side?.rosterForMatchupPeriod?.entries || [];
    const starters = entries.filter((e) => e?.lineupSlotId != null && !NON_STARTER.has(Number(e.lineupSlotId)));
    let withProj = 0;
    const splitIds = new Set();
    for (const e of starters) {
      const player = e?.playerPoolEntry?.player || e?.player || {};
      const rows = (player.stats || []).filter((r) => Number(r?.statSourceId) === 1 && Number(r?.scoringPeriodId) === WEEK);
      if (rows.length) { withProj += 1; rows.forEach((r) => splitIds.add(r.statSplitTypeId)); }
    }
    console.log(`  entries=${entries.length}  starters(ESPN table)=${starters.length}  with a week-${WEEK} projected row=${withProj}`);
    console.log(`  statSplitTypeIds on those rows  -> [${[...splitIds].join(", ")}]`);

    // The actual fix, end to end.
    const matchup = await espn.fetchEspnMatchup(row.league_id, creds.espn_s2, creds.swid,
      { seasonId: SEASON, week: WEEK, teamId: row.espn_team_id, standings: [] });
    console.log(`  --> matchup.status              = ${matchup.status}`);
    console.log(`  --> you.projected               = ${matchup.you?.projected ?? "null"}`);
    console.log(`  --> opponent.projected          = ${matchup.opponent?.projected ?? "null"}`);
    console.log("");
  }
  console.log("No credential, cookie, or key was printed above.");
}

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
