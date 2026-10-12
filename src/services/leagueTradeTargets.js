"use strict";

/**
 * League overview "Trade targets" (G3): where your roster and another team's roster fit together.
 *
 * Built from the league-roster bundle Trade already reads and caches (`tradeFindCache`, 15 minutes,
 * keyed per user), using the existing need-profile math (`buildTeamNeedProfile`): a position is a
 * `hole` when a team rosters fewer startable bodies than the league starts there, and a `surplus`
 * when it rosters more. An opening is a team that is deep where you are thin, and the reverse.
 *
 * ## Hot path
 *
 * The overview request never makes a roster call of its own. It reads the cached bundle (bounded,
 * best effort). On a miss it answers `pending` immediately and starts ONE background read that
 * fills the cache for the next request: deduplicated per user/league/week and held off for a
 * cool-down after any attempt, so a slow or failing provider is not hammered by overview polling.
 * Kill switch: `LEAGUE_TRADE_TARGETS_DISABLED=1` (no reads, no section).
 *
 * ## What it is not
 *
 * Roster depth only: no projections, no value judgment, no "this trade wins". That is what lets
 * Yahoo (which has no per-player projections) be shown, and it is labelled `basis: "roster_depth"`
 * so nobody reads it as a trade verdict. The league's starting slots must come from the provider;
 * when they are unknown the section says so rather than borrowing a lineup.
 */

const { buildTeamNeedProfile } = require("./tradeFind");
const { bundleCacheKey } = require("./leagueRosterBundle");

const MAX_ITEMS = 5;
const TRADE_POSITIONS = Object.freeze(["QB", "RB", "WR", "TE"]);
const CACHE_READ_BUDGET_MS = 300;
const MEMO_TTL_MS = 15 * 60 * 1000;
const MEMO_MAX = 100;
const WARM_COOLDOWN_MS = 3 * 60 * 1000;

const memo = new Map(); // key -> { bundle, expiresAt }
const warming = new Map(); // key -> { startedAt, inFlight }

function unavailable(reason, extra = {}) {
  return {
    status: "unavailable",
    reason,
    basis: "roster_depth",
    source: "league_rosters",
    snapshot_at: null,
    openings_count: 0,
    teams_unreadable: 0,
    items: [],
    ...extra,
  };
}

function readable(team) {
  return Array.isArray(team?.players) && team.players.length > 0 && !team.read_failed;
}

function plural(n, one, many) {
  return n === 1 ? one : many;
}

function describe(position, have, required) {
  return `${have} ${position} rostered for ${required} start${required === 1 ? "" : "s"}`;
}

/** Pure: roster bundle -> section. */
function buildTradeTargets({ ownTeamId, teams, rosterPositions, snapshotAt = null, leagueId = null, platform = null } = {}) {
  const all = Array.isArray(teams) ? teams : [];
  if (!Array.isArray(rosterPositions) || !rosterPositions.length) {
    return unavailable("lineup_slots_unknown", { snapshot_at: snapshotAt });
  }

  let own = all.find((team) => String(team?.team_id) === String(ownTeamId));
  if (!own && platform === "yahoo" && leagueId) {
    const key = `${leagueId}.t.${ownTeamId}`;
    own = all.find((team) => String(team?.team_id) === key);
  }
  if (!own) return unavailable("own_team_not_found", { snapshot_at: snapshotAt });
  if (!readable(own)) return unavailable("own_roster_unreadable", { snapshot_at: snapshotAt });

  const ownNeeds = buildTeamNeedProfile({ team: own, rosterPositions }).needs;
  const others = all.filter((team) => team !== own);
  const unreadable = others.filter((team) => !readable(team));
  const items = [];

  for (const other of others.filter(readable)) {
    const theirNeeds = buildTeamNeedProfile({ team: other, rosterPositions }).needs;
    const youGet = [];
    const youGive = [];
    for (const position of TRADE_POSITIONS) {
      const mine = ownNeeds[position];
      const theirs = theirNeeds[position];
      if (!mine || !theirs) continue;
      if (mine.status === "hole" && theirs.status === "surplus") {
        youGet.push({ position, you_have: mine.have, you_need: mine.required, they_have: theirs.have });
      }
      if (theirs.status === "hole" && mine.status === "surplus") {
        youGive.push({ position, they_have: theirs.have, they_need: theirs.required, you_have: mine.have });
      }
    }
    if (!youGet.length && !youGive.length) continue;

    const kind = youGet.length && youGive.length ? "mutual" : "one_way";
    const parts = [];
    if (youGet.length) {
      parts.push(`You are thin at ${youGet.map((g) => g.position).join("/")} (${youGet.map((g) => describe(g.position, g.you_have, g.you_need)).join(", ")}); they have ${youGet.map((g) => g.they_have).join("/")}.`);
    }
    if (youGive.length) {
      parts.push(`They are thin at ${youGive.map((g) => g.position).join("/")}; you have ${youGive.map((g) => g.you_have).join("/")}.`);
    }
    items.push({
      team_id: String(other.team_id),
      team_name: other.team_name || null,
      kind,
      you_could_get: youGet,
      you_could_give: youGive,
      summary: parts.join(" "),
    });
  }

  items.sort((a, b) => (
    (b.kind === "mutual") - (a.kind === "mutual")
    || (b.you_could_get.length + b.you_could_give.length) - (a.you_could_get.length + a.you_could_give.length)
    || String(a.team_id).localeCompare(String(b.team_id))
  ));

  const limitations = [];
  if (unreadable.length) {
    limitations.push(`Omen could not read ${unreadable.length} ${plural(unreadable.length, "team's roster", "teams' rosters")}, so ${plural(unreadable.length, "it is", "they are")} not compared.`);
  }
  return {
    status: items.length ? "available" : "empty",
    reason: null,
    basis: "roster_depth",
    source: "league_rosters",
    snapshot_at: snapshotAt,
    openings_count: items.length,
    teams_unreadable: unreadable.length,
    items: items.slice(0, MAX_ITEMS),
    ...(limitations.length ? { limitations } : {}),
  };
}

function memoRead(key, now) {
  const hit = memo.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= now) { memo.delete(key); return null; }
  return hit.bundle;
}

function memoWrite(key, bundle, now) {
  memo.delete(key);
  memo.set(key, { bundle, expiresAt: now + MEMO_TTL_MS });
  while (memo.size > MEMO_MAX) memo.delete(memo.keys().next().value);
}

function withBudget(promise, ms) {
  let timer;
  const budget = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
    timer.unref?.();
  });
  return Promise.race([promise, budget]).finally(() => clearTimeout(timer));
}

/**
 * Reads the cached bundle or starts a background fill. `deps`:
 *   tradeFindCache  { read, write }          the same store Trade uses
 *   readBundle()    -> roster result         one provider read; only ever called off the hot path
 *   now()           -> ms, env, logger
 */
function resolveTradeTargets({ userId, connection, context, ownTeamId, deps }) {
  const env = deps.env || process.env;
  if (String(env.LEAGUE_TRADE_TARGETS_DISABLED || "") === "1") return Promise.resolve(null);
  const now = (deps.now || Date.now)();
  const week = Number(context.week);
  const key = bundleCacheKey({ userId, platform: connection.platform, leagueId: String(connection.league_id), week });

  const finish = (bundle) => buildTradeTargets({
    ownTeamId,
    teams: bundle.teams,
    rosterPositions: bundle.roster_positions,
    snapshotAt: bundle.generated_at || null,
    leagueId: String(connection.league_id),
    platform: connection.platform,
  });

  return (async () => {
    let bundle = memoRead(key, now);
    if (!bundle && deps.tradeFindCache) {
      try {
        bundle = await withBudget(Promise.resolve(deps.tradeFindCache.read(key)).catch(() => null), CACHE_READ_BUDGET_MS);
      } catch { bundle = null; }
      if (bundle && !Array.isArray(bundle.teams)) bundle = null;
      if (bundle) memoWrite(key, bundle, now);
    }
    if (bundle) return finish(bundle);

    // Miss: fill the cache in the background, once, and answer honestly for now.
    const state = warming.get(key);
    const coolingDown = state && (state.inFlight || now - state.startedAt < WARM_COOLDOWN_MS);
    if (!coolingDown && typeof deps.readBundle === "function") {
      const entry = { startedAt: now, inFlight: true };
      warming.set(key, entry);
      while (warming.size > MEMO_MAX) warming.delete(warming.keys().next().value);
      Promise.resolve()
        .then(() => deps.readBundle())
        .then(async (result) => {
          if (!result || result.status !== "ok") return;
          const filled = {
            generated_at: new Date((deps.now || Date.now)()).toISOString(),
            week: result.week || week,
            roster_positions: result.roster_positions,
            roster_positions_source: result.roster_positions_source ?? null,
            teams: result.teams,
          };
          memoWrite(key, filled, (deps.now || Date.now)());
          try { await deps.tradeFindCache?.write(key, filled); } catch { /* the memo still serves this process */ }
        })
        .catch((error) => {
          // Reason only: no league, user or team identifiers in the log line.
          deps.logger?.warn?.("League trade-targets roster fill failed", { platform: connection.platform, status: error?.status ?? null });
        })
        .finally(() => { entry.inFlight = false; });
    }
    return {
      ...unavailable("rosters_loading"),
      status: "pending",
    };
  })();
}

function resetTradeTargetsState() {
  memo.clear();
  warming.clear();
}

module.exports = {
  MAX_ITEMS,
  buildTradeTargets,
  resetTradeTargetsState,
  resolveTradeTargets,
};
