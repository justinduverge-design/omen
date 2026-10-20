"use strict";

// ESPN can authenticate a new session before its fan directory lists every league. Keep a
// short, bounded server-side watch after connect so newly listed leagues become followed
// memberships without asking the person to keep tapping "Check again".
const DEFAULT_DELAYS_MS = Object.freeze([30_000, 120_000, 300_000]);
const activeWatches = new Map();

function scheduleEspnLateLeagueSync({
  userId,
  season,
  fetchDirectory,
  syncMemberships,
  delays = DEFAULT_DELAYS_MS,
  schedule = setTimeout,
  log,
}) {
  if (!userId || typeof fetchDirectory !== "function" || typeof syncMemberships !== "function") return;

  const watch = Symbol("espn-late-league-watch");
  activeWatches.set(userId, watch);
  let stopped = false;
  for (const delay of delays) {
    const timer = schedule(async () => {
      if (stopped || activeWatches.get(userId) !== watch) return;
      try {
        const directory = (await fetchDirectory()) || {};
        if (activeWatches.get(userId) !== watch) return;
        const leagues = Array.isArray(directory.leagues) ? directory.leagues : [];
        if (leagues.length) {
          if (activeWatches.get(userId) !== watch) return;
          await syncMemberships({
            userId,
            platform: "espn",
            connectionId: null,
            season,
            leagues: leagues.map((league) => ({ ...league, team_id: null, team_name: null })),
            source: "connect",
          });
        }
        const expected = Number(directory.espn_nfl_league_count);
        if (Number.isInteger(expected) && expected >= 0 && leagues.length >= expected) {
          stopped = true;
          if (activeWatches.get(userId) === watch) activeWatches.delete(userId);
        }
      } catch (error) {
        log?.warn?.("ESPN late league sync failed", { http_status: Number(error?.status) || null });
      }
    }, delay);
    timer?.unref?.();
  }
}

module.exports = { DEFAULT_DELAYS_MS, scheduleEspnLateLeagueSync };
