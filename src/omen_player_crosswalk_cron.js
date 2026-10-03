"use strict";

/**
 * Omen player crosswalk worker (plan A, item A1).
 *
 * Daily: downloads nflverse players.csv and Sleeper's public player list, builds the crosswalk
 * (src/services/playerCrosswalk.js) and writes it to the redo step 04 tables:
 *   players                     upserted by id; never deleted (other tables may point at them)
 *   player_provider_ids         replaced: rows no longer produced, or now pointing elsewhere, are
 *                               removed first, then the new set is upserted
 *   player_identity_unresolved  upserted (last_seen_at refreshed); rows that now resolve are removed
 * and records the run as one `data_events` ingest.
 *
 * Re-runnable: a failed run leaves the previous mapping or a partly refreshed one, and the next run
 * completes it. Nothing here touches a user's rows.
 */

const { initSentry, flushSentry } = require("./middleware/sentry");
const { buildCrosswalk, sourceRef } = require("./services/playerCrosswalk");
const { parseCsv } = require("./services/csvRows");

const NFLVERSE_PLAYERS_URL = "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv";
const SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl";
const BATCH = 500;
const FETCH_TIMEOUT_MS = 60_000;

const defaultLog = {
  info: (...args) => console.log(`[${new Date().toISOString()}] [omen-crosswalk]`, ...args),
  error: (...args) => console.error(`[${new Date().toISOString()}] [omen-crosswalk] ERROR`, ...args),
};

async function fetchText(url, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function must({ error }, what) {
  if (error) throw new Error(`${what} failed: ${error.code || error.message || "unknown"}`);
}

async function selectAll(client, table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select(columns).range(from, from + 999);
    must({ error }, `${table} read`);
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

async function inBatches(rows, fn) {
  for (let i = 0; i < rows.length; i += BATCH) await fn(rows.slice(i, i + BATCH));
}

async function writeCrosswalk({ client, crosswalk, sourceRefValue, now = new Date().toISOString(), log = defaultLog }) {
  const { players, providerIds, unresolved } = crosswalk;

  await inBatches(players.map((p) => ({ ...p, updated_at: now })), async (batch) => {
    must(await client.from("players").upsert(batch, { onConflict: "id" }), "players upsert");
  });

  const wanted = new Map(providerIds.map((m) => [`${m.provider}|${m.provider_player_id}`, m.player_id]));
  const existing = await selectAll(client, "player_provider_ids", "provider,provider_player_id,player_id");
  const stale = existing.filter((r) => wanted.get(`${r.provider}|${r.provider_player_id}`) !== r.player_id);
  for (const r of stale) {
    must(await client.from("player_provider_ids").delete()
      .eq("provider", r.provider).eq("provider_player_id", r.provider_player_id), "stale mapping delete");
  }
  const known = new Set(existing.map((r) => `${r.provider}|${r.provider_player_id}|${r.player_id}`));
  const fresh = providerIds.filter((m) => !known.has(`${m.provider}|${m.provider_player_id}|${m.player_id}`));
  await inBatches(fresh.map((m) => ({ ...m, matched_at: now })), async (batch) => {
    must(await client.from("player_provider_ids").insert(batch), "mapping insert");
  });

  const resolvedNow = await selectAll(client, "player_identity_unresolved", "provider,provider_player_id");
  for (const r of resolvedNow.filter((u) => wanted.has(`${u.provider}|${u.provider_player_id}`))) {
    must(await client.from("player_identity_unresolved").delete()
      .eq("provider", r.provider).eq("provider_player_id", r.provider_player_id), "resolved delete");
  }
  await inBatches(unresolved.map((u) => ({ ...u, last_seen_at: now, resolved_at: null })), async (batch) => {
    must(await client.from("player_identity_unresolved").upsert(batch, { onConflict: "provider,provider_player_id" }), "unresolved upsert");
  });

  must(await client.from("data_events").insert({
    event: "ingest", subject: "players", provider: "nflverse",
    rights_basis: "nflverse_players_cc_by_4_0;sleeper_public_api",
    job: "omen_player_crosswalk_cron v1", source_ref: sourceRefValue,
    row_count: players.length + providerIds.length,
    details: { players: players.length, provider_ids: providerIds.length, unresolved: unresolved.length,
               stale_removed: stale.length, inserted: fresh.length },
  }), "data_events ingest");

  const summary = { players: players.length, provider_ids: providerIds.length, unresolved: unresolved.length,
                    stale_removed: stale.length, inserted: fresh.length };
  log.info(`crosswalk written ${JSON.stringify(summary)}`);
  return summary;
}

async function runCrosswalk({ client, fetchImpl = fetch, minLastSeason = new Date().getUTCFullYear() - 2, log = defaultLog }) {
  const [playersCsv, sleeperJson] = await Promise.all([
    fetchText(NFLVERSE_PLAYERS_URL, fetchImpl),
    fetchText(SLEEPER_PLAYERS_URL, fetchImpl),
  ]);
  const nflversePlayers = parseCsv(playersCsv, { required: ["gsis_id", "display_name", "position", "birth_date", "espn_id"] });
  const sleeperPlayers = JSON.parse(sleeperJson);
  const crosswalk = buildCrosswalk({ nflversePlayers, sleeperPlayers, minLastSeason });
  if (crosswalk.players.length < 1000) {
    throw new Error(`crosswalk refused: only ${crosswalk.players.length} players built; source likely truncated`);
  }
  return writeCrosswalk({ client, crosswalk, sourceRefValue: sourceRef(playersCsv, sleeperJson), log });
}

if (require.main === module) {
  initSentry({ component: "cron-crosswalk" });
  const Sentry = require("@sentry/node");
  const { createClient } = require("@supabase/supabase-js");
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].filter((key) => !process.env[key]);
  (async () => {
    if (missing.length) throw new Error(`missing env: ${missing.join(", ")}`);
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
    await runCrosswalk({ client });
  })().then(
    async () => { await flushSentry(); process.exit(0); },
    async (err) => {
      defaultLog.error(err.message);
      Sentry.captureException(err);
      await flushSentry();
      process.exit(1);
    }
  );
}

module.exports = { runCrosswalk, writeCrosswalk, NFLVERSE_PLAYERS_URL, SLEEPER_PLAYERS_URL };
