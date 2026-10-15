#!/usr/bin/env node
"use strict";

/**
 * Read-only, sanitized probe of one account's connected leagues (Sleeper, ESPN, Yahoo).
 *
 *   node scripts/probe-provider-leagues.js <account-email | user-id-prefix>
 *
 * Writes nothing of its own. One caveat: it uses the app's normal auth path, which refreshes and stores a
 * Yahoo token that is near expiry (exactly as a normal app request would).
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment (see .env).
 * Goes through the same adapters Trade uses. Writes nothing. Prints ONLY counts, field presence,
 * HTTP-ish status words and league-config slot counts. Never prints credentials, tokens, cookies,
 * league ids, team names or player names; league ids appear as an index (league_1...).
 */

const [email] = process.argv.slice(2);
if (!email || email === "--help") {
  console.error("usage: node scripts/probe-provider-leagues.js <account-email>");
  process.exit(2);
}

const { createClient } = require("@supabase/supabase-js");
const config = require("../src/config");
const { getAuthenticatedEspnCredentials } = require("../src/services/espnAuth");
const { getAuthenticatedYahooClient } = require("../src/services/yahooAuth");
const espn = require("../src/adapters/espn");
const yahoo = require("../src/adapters/yahoo");
const sleeper = require("../src/adapters/sleeper");
const waiverSystem = require("../src/services/waiverSystem");
const { projectYahooPool } = require("../src/services/yahooProjections");
const rosterSvc = require("../src/services/roster");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const labels = new Map();
const tag = (id) => { if (!labels.has(id)) labels.set(id, `league_${labels.size + 1}`); return labels.get(id); };
const safeErr = (e) => String(e?.status || e?.code || e?.name || "error").slice(0, 40);

function shape(teams) {
  const sizes = teams.map((t) => (t.players || []).length);
  const players = teams.flatMap((t) => t.players || []);
  const count = (fn) => players.filter(fn).length;
  return {
    teams: teams.length,
    unreadable_teams: teams.filter((t) => t.read_status === "unreadable").length,
    empty_teams: teams.filter((t) => !(t.players || []).length).length,
    roster_size_min_max: sizes.length ? [Math.min(...sizes), Math.max(...sizes)] : null,
    players: players.length,
    with_projection: count((p) => Number.isFinite(Number(p.projected_points)) && p.projected_points != null),
    with_position: count((p) => p.position && p.position !== "UNK"),
    with_eligible_positions: count((p) => Array.isArray(p.eligible_positions) && p.eligible_positions.length > 0),
    with_injury_status: count((p) => p.status && p.status !== "ACTIVE"),
    trade_locked: count((p) => p.trade_locked === true),
    lineup_locked: count((p) => p.lineup_locked === true),
    roster_locked: count((p) => p.roster_locked === true),
  };
}

async function findUserId() {
  const needle = String(email).toLowerCase();
  const isIdPrefix = !needle.includes("@");
  for (let page = 1; page < 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error("auth lookup failed");
    const hit = (data?.users || []).find((u) => (isIdPrefix ? String(u.id).startsWith(needle) : String(u.email || "").toLowerCase() === needle));
    if (hit) return hit.id;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  throw new Error("no matching account");
}

async function main() {
  const userId = await findUserId();
  const { data: rows, error } = await supabase
    .from("platform_connections")
    .select("platform, league_id, is_active")
    .eq("user_id", userId);
  if (error) throw new Error("connection lookup failed");
  console.log(JSON.stringify({ connections: (rows || []).map((r) => ({ platform: r.platform, league: tag(r.league_id), active: !!r.is_active, has_league: !!r.league_id })) }));

  const week = Number(process.env.PROBE_WEEK || 0) || undefined;
  for (const row of rows || []) {
    const out = { platform: row.platform, league: tag(row.league_id) };
    try {
      if (!row.league_id) { out.result = "no_league_bound"; }
      else if (row.platform === "sleeper") {
        const r = await sleeper.fetchSleeperLeagueRosters(row.league_id, week || 1, String(new Date().getFullYear()));
        out.result = "ok"; out.league_status = r?.league_status || null;
        out.roster_positions = Array.isArray(r?.roster_positions) ? r.roster_positions.length : 0;
        out.shape = shape(r?.teams || []);
      } else if (row.platform === "espn") {
        const c = await getAuthenticatedEspnCredentials(userId);
        const r = await espn.fetchEspnLeagueRosters(row.league_id, c.espn_s2, c.swid, { week });
        out.result = "ok"; out.roster_positions = Array.isArray(r?.roster_positions) ? r.roster_positions.length : 0;
        out.shape = shape(r?.teams || []);
        try {
          const s = await espn.fetchEspnApi(row.league_id, c.espn_s2, c.swid, ["mSettings"], week);
          const counts = s?.settings?.rosterSettings?.lineupSlotCounts;
          out.settings_lineup_slot_counts = counts && typeof counts === "object" ? counts : null;
        } catch (e) { out.settings_error = safeErr(e); }
        try {
          const data = await espn.fetchEspnApi(row.league_id, c.espn_s2, c.swid, ["mTeam", "mSettings"], null);
          const model = waiverSystem.fromEspn({ settings: data?.settings, team: null });
          out.waiver_system = { system: model.system, reason: model.reason, has_acquisition_settings: !!data?.settings?.acquisitionSettings };
        } catch (e) { out.waiver_system_error = safeErr(e); }
        try {
          const pool = await espn.fetchEspnWaiverPool(row.league_id, c.espn_s2, c.swid, week || 6);
          const list = Array.isArray(pool) ? pool : (pool?.players || []);
          out.waiver_pool = { players: list.length, with_projection: list.filter((p) => p.projected_points != null).length };
        } catch (e) { out.waiver_pool_error = safeErr(e); }
      } else if (row.platform === "yahoo") {
        const { accessToken, client } = await getAuthenticatedYahooClient(userId);
        const r = await yahoo.fetchYahooLeagueRosters(row.league_id, accessToken, week);
        out.result = "ok"; out.roster_positions = Array.isArray(r?.roster_positions) ? r.roster_positions.length : 0;
        out.shape = shape(r?.teams || []);
        try {
          const raw = await client.getAvailablePlayers(row.league_id, { count: 50, sort: "AR" });
          const { pool, projectionMeta } = await projectYahooPool(client, row.league_id, r.week, rosterSvc.normalizeYahooWaivers(raw));
          out.waiver_pool = { players: pool.length, with_projection: pool.filter((p) => p.projected_points != null).length, meta_reason: projectionMeta?.reason ?? null };
        } catch (e) { out.waiver_pool_error = safeErr(e); }
        try {
          const rawSettings = await client.getLeagueSettings(row.league_id);
          const model = waiverSystem.fromYahoo({ settings: rawSettings, team: null });
          out.waiver_system = { system: model.system, reason: model.reason };
        } catch (e) { out.waiver_system_error = safeErr(e); }
        out.projection_meta = r?.projection_meta ?? null;
        const nul = (r?.teams || []).flatMap((t) => t.players || []).filter((p) => p.projected_points == null);
        out.unprojected_by_position = nul.reduce((a, p) => ({ ...a, [p.position]: (a[p.position] || 0) + 1 }), {});
        out.unprojected_have_gsis_or_sleeper = nul.filter((p) => p.gsis_id || p.sleeper_id).length;
        out.unreadable_team_ids_count = (r?.unreadable_team_ids || []).length;
        try {
          const league = await client.getLeagueSettings(row.league_id, { report: false });
          const flat = JSON.stringify(league || {});
          out.settings_has_roster_positions = /roster_positions/.test(flat);
          const m = flat.match(/"roster_positions":\[(.*?)\]\}?,?"/);
          out.settings_roster_positions_present = !!m;
        } catch (e) { out.settings_error = safeErr(e); }
      } else { out.result = "unsupported"; }
    } catch (e) {
      out.result = "failed"; out.error = safeErr(e);
    }
    console.log(JSON.stringify(out));
  }
}

main().catch((e) => { console.error("probe failed:", String(e?.message || e).replace(/eyJ[\w.-]+/g, "[redacted]").slice(0, 120)); process.exit(1); });
