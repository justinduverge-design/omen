"use strict";

// ESPN can authenticate a new session before its fan directory lists every league. Keep a
// short, bounded server-side watch after connect so newly listed leagues become followed
// memberships without asking the person to keep tapping "Check again".
const DEFAULT_DELAYS_MS = Object.freeze([30_000, 120_000, 300_000]);

function scheduleEspnLateLeagueSync({
  userId,
  connectionId,
  season,
  fetchDirectory,
  syncMemberships,
  delays = DEFAULT_DELAYS_MS,
  schedule = setTimeout,
  log,
}) {
  if (!userId || typeof fetchDirectory !== "function" || typeof syncMemberships !== "function") return;

  let stopped = false;
  for (const delay of delays) {
    const timer = schedule(async () => {
      if (stopped) return;
      try {
        const directory = (await fetchDirectory()) || {};
        const leagues = Array.isArray(directory.leagues) ? directory.leagues : [];
        if (leagues.length) {
          await syncMemberships({
            userId,
            platform: "espn",
            connectionId,
            season,
            leagues: leagues.map((league) => ({ ...league, team_id: null, team_name: null })),
            source: "connect",
          });
        }
        const expected = Number(directory.espn_nfl_league_count);
        if (Number.isInteger(expected) && expected >= 0 && leagues.length >= expected) stopped = true;
      } catch (error) {
        log?.warn?.("ESPN late league sync failed", { http_status: Number(error?.status) || null });
      }
    }, delay);
    timer?.unref?.();
  }
}

module.exports = { DEFAULT_DELAYS_MS, scheduleEspnLateLeagueSync };
