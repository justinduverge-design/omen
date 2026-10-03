"use strict";

/**
 * The order followed leagues render in, across every provider.
 *
 * Which leagues a user follows is stored in `league_memberships` (redo step 03) and owned by
 * `src/services/leagueMemberships.js`. This module keeps only the ordering rules, so iOS,
 * Android and the API cannot drift on them.
 */

const PLATFORMS = Object.freeze(["espn", "yahoo", "sleeper"]);

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
  orderPlatformsByFollowCount,
  carouselOrder,
};
