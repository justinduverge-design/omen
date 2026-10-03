"use strict";

/**
 * T4 saved trades on the `saved_trades` table (redo step 12,
 * `sql/2026-10-01-redo/12_saved_trades.up.sql`), replacing #519's one-Redis-blob-per-user store.
 *
 * One row per saved trade, so every change is one statement on one row:
 *   - save is an insert that ignores a duplicate (the table's unique key), so two quick saves can
 *     never drop each other and a repeat save never touches the first save's reasoning;
 *   - "sent" and "outcome" are conditional updates (`state = 'saved'` / `state = 'sent'`), so the
 *     database, not a read-modify-write here, decides whether the transition applies.
 *
 * The server writes with the service role (RLS lets the owner read only). Every query is scoped by
 * `user_id`, because the service role bypasses RLS.
 *
 * Account erasure needs nothing here: rows cascade from `users`, which both `account_erase()` and
 * today's table-by-table deletion remove. The data export reads this table (src/routes/userPrivacy.js).
 */

const { createClient } = require("@supabase/supabase-js");

const TABLE = "saved_trades";
const UNIQUE_KEY = "user_id,provider,provider_league_id,season,week,candidate_id";
const COLUMNS = [
  "provider", "provider_league_id", "season", "week", "provider_team_id", "candidate_id", "trade",
  "reasoning", "state", "outcome", "outcome_provenance", "saved_at", "sent_at", "outcome_at",
].join(",");

function storageError(error) {
  const wrapped = new Error(`saved_trades: ${error?.message || "storage error"}`);
  wrapped.code = "trade_saved_queue_storage_unavailable";
  wrapped.dbCode = error?.code || null;
  return wrapped;
}

function must({ data, error }) {
  if (error) throw storageError(error);
  return data;
}

function createSupabaseSavedTradesStore({ client } = {}) {
  let resolved = client || null;
  // Lazy, so building the trade router (at require time) never needs Supabase config.
  const db = () => {
    if (!resolved) {
      const config = require("../config");
      resolved = createClient(config.supabaseUrl, config.supabaseServiceKey, { auth: { persistSession: false } });
    }
    return resolved;
  };

  async function get(userId, candidateId) {
    const rows = must(await db().from(TABLE).select(COLUMNS)
      .eq("user_id", userId).eq("candidate_id", candidateId).limit(1));
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  return {
    kind: "supabase",

    /** Inserts the row unless this user already saved this candidate in this scope. */
    async insertIfAbsent(row) {
      const rows = must(await db().from(TABLE)
        .upsert(row, { onConflict: UNIQUE_KEY, ignoreDuplicates: true })
        .select("candidate_id"));
      return { inserted: Array.isArray(rows) && rows.length > 0 };
    },

    async list(userId) {
      return must(await db().from(TABLE).select(COLUMNS)
        .eq("user_id", userId).order("saved_at", { ascending: true })) || [];
    },

    get,

    /** saved -> sent once. An already-sent row is returned unchanged (idempotent). */
    async markSent(userId, candidateId, sentAt) {
      const rows = must(await db().from(TABLE).update({ state: "sent", sent_at: sentAt })
        .eq("user_id", userId).eq("candidate_id", candidateId).eq("state", "saved")
        .select(COLUMNS));
      if (Array.isArray(rows) && rows.length) return rows[0];
      return get(userId, candidateId);
    },

    /** Self-reported outcome, only on a sent row. Returns { status: ok | not_found | not_sent, row }. */
    async setOutcome(userId, candidateId, outcome, reportedAt) {
      const rows = must(await db().from(TABLE)
        .update({ outcome, outcome_provenance: "self_reported", outcome_at: reportedAt })
        .eq("user_id", userId).eq("candidate_id", candidateId).eq("state", "sent")
        .select(COLUMNS));
      if (Array.isArray(rows) && rows.length) return { status: "ok", row: rows[0] };
      const existing = await get(userId, candidateId);
      return { status: existing ? "not_sent" : "not_found", row: existing };
    },

    /** Unsave. Returns true when a row was deleted. */
    async remove(userId, candidateId) {
      const rows = must(await db().from(TABLE).delete()
        .eq("user_id", userId).eq("candidate_id", candidateId)
        .select("candidate_id"));
      return Array.isArray(rows) && rows.length > 0;
    },
  };
}

module.exports = {
  TABLE,
  UNIQUE_KEY,
  createSupabaseSavedTradesStore,
};
