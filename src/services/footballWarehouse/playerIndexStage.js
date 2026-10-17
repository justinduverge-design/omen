"use strict";

// The player index: football.football_player_ids maps every provider id to one Omen player. The identity
// ingest fills the GSIS rows; this stage fills the rest from data already in the warehouse, so the index
// grows with every rookie and keeps every retired player.
//
//   espn     <- football_players.source_row.espn_id (nflverse players, the same rows and receipt)
//   sleeper  <- Sleeper's public player list, matched through each record's GSIS id (receipt: player_index_runs)
//   yahoo    <- the same Sleeper records' yahoo_id (numeric Yahoo player id), matched the same way
//
// One transaction per provider: replace that provider's rows, skipping any id claimed by two players (an
// ambiguous id is left out, never guessed). The GSIS rows are never touched here.

const ESPN_SQL = `
  WITH src AS (
    SELECT p.player_id, btrim(p.source_row->>'espn_id') AS provider_id, p.ingest_event_id
      FROM football.football_players p
     WHERE coalesce(btrim(p.source_row->>'espn_id'), '') NOT IN ('', 'NA')
  ), unique_ids AS (
    SELECT provider_id FROM src GROUP BY provider_id HAVING count(*) = 1
  )
  INSERT INTO football.football_player_ids (provider, provider_id, player_id, match_method, ingest_event_id)
  SELECT 'espn', s.provider_id, s.player_id, 'source_crosswalk', s.ingest_event_id
    FROM src s JOIN unique_ids u USING (provider_id)
   WHERE s.provider_id ~ '^[0-9]{1,12}$'`;

const crypto = require("node:crypto");

const SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl";
const MAX_BYTES = 40 * 1024 * 1024;
// Sleeper lists a GSIS or ESPN id for well over 3,900 players (active and recent); fewer than 2,000 means a broken download.
const MIN_SLEEPER_ROWS = 2000;

/**
 * [{ sleeperId, gsisId, espnId, yahooId }] from Sleeper's player map. Sleeper lists a GSIS id for only about a
 * third of active players but an ESPN id for most, so a record matches on GSIS directly or, failing that, through
 * its ESPN id and the nflverse ESPN crosswalk already in football_player_ids. A record with neither is skipped.
 */
/** Name and birth date for the provider_bio match: a normalized full name plus an ISO date, or nothing. */
function bioOf(p) {
  const date = typeof p?.birth_date === "string" ? p.birth_date.trim() : "";
  const name = normalName(p?.full_name || `${p?.first_name || ""} ${p?.last_name || ""}`);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && name ? { name, birthDate: date } : {};
}

// Lowercase letters only, suffixes dropped: "D.K. Metcalf" and "DK Metcalf", "Marvin Harrison Jr." and
// "Marvin Harrison" compare equal. The birth date carries the identity; the name only has to agree. Same rule
// as the SQL side (players_bio), character for character, so both sides normalize identically.
function normalName(value) {
  return String(value || "").toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, "").replace(/[^a-z]/g, "");
}

function sleeperRows(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw Object.assign(new Error("sleeper players payload is not an object"), { code: "source_shape" });
  const rows = [];
  for (const [id, p] of Object.entries(payload)) {
    const gsisRaw = typeof p?.gsis_id === "string" ? p.gsis_id.trim() : "";
    const espnRaw = p?.espn_id == null ? "" : String(p.espn_id).trim();
    const gsis = /^[0-9A-Za-z-]{1,50}$/.test(gsisRaw) ? gsisRaw : null;
    const espn = /^[0-9]{1,12}$/.test(espnRaw) ? espnRaw : null;
    if (!/^[0-9]{1,12}$/.test(id) || (!gsis && !espn && !bioOf(p).birthDate)) continue;
    const yahoo = p?.yahoo_id == null ? null : String(p.yahoo_id).trim();
    rows.push({ sleeperId: id, gsisId: gsis, espnId: espn, ...bioOf(p), yahooId: /^[0-9]{1,12}$/.test(yahoo || "") ? yahoo : null });
  }
  return rows;
}

const SLEEPER_INSERT_SQL = `
  WITH recs AS (
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS r(provider_id text, gsis_id text, espn_id text, name text, birth_date text)
  ), by_gsis AS (
    SELECT r.provider_id, p.player_id, 'provider_gsis' AS method FROM recs r JOIN football.football_players p ON p.gsis_id = r.gsis_id
  ), by_espn AS (
    SELECT r.provider_id, e.player_id, 'source_crosswalk' AS method FROM recs r
      JOIN football.football_player_ids e ON e.provider = 'espn' AND e.provider_id = r.espn_id
     WHERE NOT EXISTS (SELECT 1 FROM by_gsis g WHERE g.provider_id = r.provider_id)
       -- A GSIS match wins: never let an ESPN-bridged record knock out a player GSIS already placed.
       AND NOT EXISTS (SELECT 1 FROM by_gsis g WHERE g.player_id = e.player_id)
  ), players_bio AS (
    SELECT p.player_id, p.gsis_id, p.birth_date::text AS birth_date,
           regexp_replace(regexp_replace(lower(p.display_name), '\\m(jr|sr|ii|iii|iv|v)\\M\\.?', '', 'g'), '[^a-z]', '', 'g') AS name
      FROM football.football_players p WHERE p.birth_date IS NOT NULL
  ), unique_bio AS (SELECT name, birth_date FROM players_bio GROUP BY 1, 2 HAVING count(*) = 1
  ), by_bio AS (
    SELECT r.provider_id, b.player_id, 'provider_bio' AS method FROM recs r
      JOIN players_bio b ON b.name = r.name AND b.birth_date = r.birth_date
      JOIN unique_bio u ON u.name = b.name AND u.birth_date = b.birth_date
     -- Two different GSIS ids on the two sides mean two different people, whatever the name and date say.
     WHERE (r.gsis_id IS NULL OR b.gsis_id IS NULL OR r.gsis_id = b.gsis_id)
       AND NOT EXISTS (SELECT 1 FROM by_gsis g WHERE g.provider_id = r.provider_id OR g.player_id = b.player_id)
       AND NOT EXISTS (SELECT 1 FROM by_espn e WHERE e.provider_id = r.provider_id OR e.player_id = b.player_id)
  ), src AS (SELECT * FROM by_gsis UNION ALL SELECT * FROM by_espn UNION ALL SELECT * FROM by_bio
  ), unique_ids AS (SELECT provider_id FROM src GROUP BY provider_id HAVING count(*) = 1),
     unique_players AS (SELECT player_id FROM src GROUP BY player_id HAVING count(*) = 1)
  INSERT INTO football.football_player_ids (provider, provider_id, player_id, match_method, index_run_id)
  SELECT $2::text, s.provider_id, s.player_id, s.method, $3::bigint
    FROM src s JOIN unique_ids USING (provider_id) JOIN unique_players USING (player_id)`;

async function fetchSleeperPlayers(fetchImpl) {
  const response = await fetchImpl(SLEEPER_PLAYERS_URL, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw Object.assign(new Error("sleeper players fetch failed"), { code: `source_http_${response.status}` });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_BYTES) throw Object.assign(new Error("sleeper players too large"), { code: "source_too_large" });
  return { buffer, payload: JSON.parse(buffer.toString("utf8")) };
}

function createPlayerIndexStage({ pool, fetchImpl = globalThis.fetch, now = () => new Date() }) {
  return {
    async run() {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL lock_timeout = '5s'");
        await client.query({ name: "player-index-espn-delete-v1", text: "DELETE FROM football.football_player_ids WHERE provider = 'espn'" });
        const inserted = await client.query({ name: "player-index-espn-insert-v1", text: ESPN_SQL });
        await client.query("COMMIT");
        const sleeper = await indexSleeper();
        return { state: "succeeded", espn: inserted.rowCount, ...sleeper };
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch { /* the original error matters */ }
        throw error;
      } finally {
        client.release();
      }
    },
  };

  // Sleeper and Yahoo ids, from Sleeper's player list. A failed or thin fetch leaves the existing rows alone.
  async function indexSleeper() {
    let fetched;
    try {
      fetched = await fetchSleeperPlayers(fetchImpl);
    } catch (error) {
      return { sleeper: { state: "failed", code: error.code || "source_failed" } };
    }
    const rows = sleeperRows(fetched.payload);
    if (rows.length < MIN_SLEEPER_ROWS) return { sleeper: { state: "failed", code: "source_partial", rows: rows.length } };
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '5s'");
      const receipt = await client.query({ name: "player-index-run-v1", text: `
        INSERT INTO football.player_index_runs (source, rights_basis, source_url, source_ref, source_rows, fetched_at)
        VALUES ('sleeper_players', 'sleeper_public_api', $1, $2, $3, $4) RETURNING id`,
        values: [SLEEPER_PLAYERS_URL, `sha256:${crypto.createHash("sha256").update(fetched.buffer).digest("hex")}`, rows.length, now().toISOString()] });
      const runId = receipt.rows[0].id;
      await client.query({ name: "player-index-provider-delete-v1", text: "DELETE FROM football.football_player_ids WHERE provider IN ('sleeper', 'yahoo') AND index_run_id IS NOT NULL" });
      const sleeper = await client.query({ name: "player-index-sleeper-insert-v3", text: SLEEPER_INSERT_SQL,
        values: [JSON.stringify(rows.map((r) => ({ provider_id: r.sleeperId, gsis_id: r.gsisId, espn_id: r.espnId, name: r.name || null, birth_date: r.birthDate || null }))), "sleeper", runId] });
      const yahoo = await client.query({ name: "player-index-yahoo-insert-v3", text: SLEEPER_INSERT_SQL,
        values: [JSON.stringify(rows.filter((r) => r.yahooId).map((r) => ({ provider_id: r.yahooId, gsis_id: r.gsisId, espn_id: r.espnId, name: r.name || null, birth_date: r.birthDate || null }))), "yahoo", runId] });
      await client.query("COMMIT");
      return { sleeper: { state: "succeeded", rows: rows.length, sleeper: sleeper.rowCount, yahoo: yahoo.rowCount, runId: Number(runId) } };
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* keep the original error */ }
      return { sleeper: { state: "failed", code: error.code || "write_failed" } };
    } finally {
      client.release();
    }
  }
}

module.exports = { normalName, createPlayerIndexStage, ESPN_SQL, SLEEPER_INSERT_SQL, sleeperRows };
