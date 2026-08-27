"use strict";

/**
 * Which connected league is the user actually looking at.
 *
 * Before this existed, three surfaces answered that question three different
 * ways and none of them was the user's choice:
 *
 *   - src/services/omen.js  ordered sleeper -> espn -> yahoo
 *   - src/routes/league.js  ordered espn -> sleeper -> yahoo
 *   - src/routes/optimizer.js resolved yahoo only, by updated_at
 *
 * The visual-briefs §10.3 contract requires one selection to apply atomically
 * across Command Center, Omen, League, Waiver Watch and Ledger, so the rule has
 * to live in exactly one place. This is it.
 *
 * Persistence: an explicit cross-provider choice needs a `platform_connections`
 * column, and applying SQL is the gated founder sequence (facts-of-record #8).
 * `sql/2026-08-26_league_selection_review.sql` is authored review-only. Until it
 * is applied, `readSelectionColumn` reports the column absent and callers say
 * `provider_binding_only` rather than claiming a choice persisted that did not.
 */

// A deterministic tie-break, not a ranking. Matches the order already documented
// in src/services/omen.js:1395 so behavior is unchanged when nothing is selected.
const DEFAULT_PLATFORM_ORDER = Object.freeze(["sleeper", "espn", "yahoo"]);

const SELECTION_COLUMN = "is_selected";

/** PostgREST reports an unknown column rather than throwing a Postgres error. */
function isMissingColumnError(error) {
  if (!error) return false;
  if (error.code === "PGRST204" || error.code === "42703") return true;
  return /column .* does not exist|could not find the '.*' column/i.test(error.message || "");
}

function usableLeagueId(connection) {
  const leagueId = String(connection?.league_id || "").trim();
  return Boolean(leagueId) && leagueId !== connection?.platform;
}

function platformRank(platform, order) {
  const index = order.indexOf(platform);
  return index === -1 ? order.length : index;
}

/**
 * Order connections so the user's selection comes first, then the deterministic
 * tie-break. Callers keep trying each in turn — a selection must not let one
 * dead provider block a user who has a healthy league elsewhere.
 */
function orderBySelection(connections = [], { order = DEFAULT_PLATFORM_ORDER } = {}) {
  return [...connections].sort((a, b) => {
    const selected = Number(Boolean(b?.[SELECTION_COLUMN])) - Number(Boolean(a?.[SELECTION_COLUMN]));
    if (selected !== 0) return selected;
    return platformRank(a?.platform, order) - platformRank(b?.platform, order);
  });
}

/**
 * The single selected connection, or null. `isUsable` is injected so each caller
 * can apply its own usability predicate (Omen readiness, standings readiness)
 * without this module importing any of them.
 */
function resolveActiveConnection(connections = [], { isUsable = usableLeagueId, order = DEFAULT_PLATFORM_ORDER } = {}) {
  return orderBySelection(connections.filter(isUsable), { order })[0] || null;
}

/**
 * Read connection rows, including the selection column when the schema has it.
 * Returns `{ rows, selectionPersisted }` so the caller can report honestly
 * instead of silently degrading.
 */
async function readConnectionsWithSelection(supabase, userId, baseColumns) {
  const withSelection = `${baseColumns},${SELECTION_COLUMN}`;

  const attempt = await supabase
    .from("platform_connections")
    .select(withSelection)
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!attempt.error) {
    return { rows: attempt.data || [], selectionPersisted: true };
  }
  if (!isMissingColumnError(attempt.error)) {
    throw new Error(`platform_connections lookup failed: ${attempt.error.message}`);
  }

  const fallback = await supabase
    .from("platform_connections")
    .select(baseColumns)
    .eq("user_id", userId)
    .eq("is_active", true);

  if (fallback.error) {
    throw new Error(`platform_connections lookup failed: ${fallback.error.message}`);
  }
  return { rows: fallback.data || [], selectionPersisted: false };
}

module.exports = {
  DEFAULT_PLATFORM_ORDER,
  SELECTION_COLUMN,
  isMissingColumnError,
  orderBySelection,
  readConnectionsWithSelection,
  resolveActiveConnection,
  usableLeagueId,
};
