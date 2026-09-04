"use strict";

/**
 * Which leagues a user follows, across every provider.
 *
 * `platform_connections` answers "is this provider connected, and with what
 * credentials". It cannot answer "and which of its leagues does the user care
 * about", because it holds one row per (user_id, platform) with a single
 * `league_id`. That single id is the ACTIVE league within a provider and stays
 * exactly that. This module owns the set.
 *
 * Persistence is gated. `sql/2026-09-03_multi_league_follows_review.sql` is
 * authored review-only (facts-of-record #8), so until it is applied
 * `readFollows` reports `followsPersisted: false` and callers degrade to
 * "follow everything the provider discovered". That degradation is honest and is
 * what the app already did — it is not a silent fallback to a fixture. Every
 * route that can write a follow reports the same flag, so no surface can claim a
 * selection stuck when it did not.
 */

const PLATFORMS = Object.freeze(["espn", "yahoo", "sleeper"]);

/**
 * PostgREST reports an unknown table as PGRST205; Postgres itself as 42P01.
 * Mirrors `activeSelection.isMissingColumnError`, one level up the schema.
 */
function isMissingTableError(error) {
  if (!error) return false;
  if (error.code === "PGRST205" || error.code === "42P01") return true;
  return /relation .* does not exist|could not find the table/i.test(error.message || "");
}

const FOLLOW_COLUMNS = "platform,league_id,team_id,league_name,team_name,season,sort_order";

/**
 * Every league this user follows. Returns `{ follows, followsPersisted }` so the
 * caller reports honestly rather than degrading in silence.
 */
async function readFollows(supabase, userId) {
  const attempt = await supabase
    .from("league_follows")
    .select(FOLLOW_COLUMNS)
    .eq("user_id", userId);

  if (!attempt.error) {
    return { follows: attempt.data || [], followsPersisted: true };
  }
  if (isMissingTableError(attempt.error)) {
    return { follows: [], followsPersisted: false };
  }
  throw new Error(`league_follows lookup failed: ${attempt.error.message}`);
}

/**
 * Replace this user's followed leagues for ONE platform. Scoped per platform on
 * purpose: a multiselect on the ESPN picker must not silently drop the Sleeper
 * leagues the user chose in a different session.
 *
 * The caller is responsible for having verified with the provider that every
 * league genuinely belongs to the account. This function trusts its input, in
 * the same way `persistSelection` does, and for the same reason: verification
 * needs a provider client this module deliberately does not import.
 *
 * Returns `true` when the set persisted, `false` when the table is absent.
 */
async function replaceFollows(supabase, userId, platform, entries) {
  const rows = (entries || []).map((entry, index) => ({
    user_id: userId,
    platform,
    league_id: String(entry.league_id),
    team_id: entry.team_id == null ? null : String(entry.team_id),
    league_name: entry.league_name || null,
    team_name: entry.team_name || null,
    season: Number.isFinite(Number(entry.season)) ? Number(entry.season) : null,
    sort_order: entry.sort_order == null ? index : Number(entry.sort_order),
    updated_at: new Date().toISOString(),
  }));

  const cleared = await supabase
    .from("league_follows")
    .delete()
    .eq("user_id", userId)
    .eq("platform", platform);

  if (cleared.error) {
    if (isMissingTableError(cleared.error)) return false;
    throw new Error(`league_follows clear failed: ${cleared.error.message}`);
  }

  if (!rows.length) return true;

  const inserted = await supabase
    .from("league_follows")
    .upsert(rows, { onConflict: "user_id,platform,league_id" });

  if (inserted.error) {
    if (isMissingTableError(inserted.error)) return false;
    throw new Error(`league_follows upsert failed: ${inserted.error.message}`);
  }
  return true;
}

/**
 * The founder's carousel order, stated once so iOS, Android and the API cannot
 * drift: **providers with more followed leagues come first; ties break
 * alphabetically.** Three ESPN, one Sleeper, one Yahoo puts ESPN first, then
 * Sleeper before Yahoo. Three ESPN and three Yahoo puts ESPN first on the
 * alphabet, not on which connected first.
 *
 * Deliberately NOT the old fixed `sleeper, espn, yahoo` tie-break. That order was
 * a deterministic stand-in for a user choice nobody had made yet; this one is
 * derived from the user's own leagues, so it needs no such excuse. Providers with
 * zero leagues keep a stable alphabetical tail rather than disappearing — the
 * chip row still has to render them.
 */
function orderPlatformsByFollowCount(groups) {
  return [...(groups || [])].sort((a, b) => {
    const byCount = (b?.leagues?.length || 0) - (a?.leagues?.length || 0);
    if (byCount !== 0) return byCount;
    return String(a?.platform || "").localeCompare(String(b?.platform || ""));
  });
}

/**
 * The flat, ordered league list the Command Center carousel swipes through when
 * the "All" chip is on. Provider order comes from `orderPlatformsByFollowCount`;
 * within a provider the group's own order is preserved, because `leagues.js`
 * already sorted it alphabetically by league then team.
 */
function carouselOrder(groups) {
  return orderPlatformsByFollowCount(groups).flatMap((group) =>
    (group.leagues || []).map((league) => ({ ...league, platform: group.platform }))
  );
}

module.exports = {
  PLATFORMS,
  isMissingTableError,
  readFollows,
  replaceFollows,
  orderPlatformsByFollowCount,
  carouselOrder,
};
