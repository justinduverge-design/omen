"use strict";

/**
 * Sleeper platform adapter.
 *
 * Produces the same normalized roster shape as src/services/roster.js so
 * downstream optimizer/VORP/MVP logic can stay platform-agnostic.
 */

const axios = require("axios");
const requestScope = require("../services/sleeperRequestScope");
const { Redis } = require("@upstash/redis");
const config = require("../config");
const { captureProviderError } = require("../middleware/providerErrors");
const injuryFreshness = require("../services/injuryFreshness");
const storedProjections = require("../services/footballWarehouse/storedProjections");

const BASE = "https://api.sleeper.app/v1";
const PROJECTIONS_BASE = "https://api.sleeper.app/projections/nfl";
const PLAYERS_CACHE_KEY = "ssff:sleeper:players";
const PLAYERS_AT_KEY = "ssff:sleeper:players:at";
// Tiered mode keeps data in Redis as a stale-while-revalidate store; freshness is judged by the
// as-of stamp, not key expiry. This TTL is only the "Sleeper down for a day" horizon.
const STORE_TTL_S = 86400;
const PLAYERS_TTL_S = 86400;
const PROJECTIONS_TTL_S = 3600;
const DRAFT_META_TTL_S = 2;
const DRAFT_PICKS_TTL_S = 2;
const SLEEPER_REQUEST_LIMIT = 900;
const SLEEPER_REQUEST_WINDOW_MS = 60_000;
const NFL_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];
const STARTER_SLOT_MAP = {
  SUPER_FLEX: "QB",
  REC_FLEX: "W/R",
  FLEX: "FLEX",
};

const redis = config.redisUrl ? new Redis({ url: config.redisUrl, token: config.redisToken }) : null;

function createWindowBudget({
  limit = SLEEPER_REQUEST_LIMIT,
  windowMs = SLEEPER_REQUEST_WINDOW_MS,
  now = () => Date.now(),
} = {}) {
  let windowStartedAt = now();
  let used = 0;

  return {
    take() {
      const current = now();
      if (current - windowStartedAt >= windowMs) {
        windowStartedAt = current;
        used = 0;
      }
      if (used >= limit) {
        const error = new Error("Sleeper request budget exhausted");
        error.status = 503;
        error.code = "sleeper_request_budget_exhausted";
        error.retryAfterMs = Math.max(1, windowMs - (current - windowStartedAt));
        throw error;
      }
      used += 1;
    },
  };
}

const sleeperRequestBudget = createWindowBudget();

function currentSeason() {
  return String(new Date().getFullYear());
}

/**
 * Sleeper URLs are public and carry no credentials, but they do carry
 * league and user ids in the path. Keep the shape, drop the query string.
 */
function safeSleeperPath(url) {
  try {
    return new URL(String(url)).pathname;
  } catch {
    return "<unparseable>";
  }
}

// Request-scoped memo (see services/sleeperRequestScope). Within a request scope, repeated
// GETs of the same URL+params collapse to one upstream call; outside one, getJson is unchanged.
const runWithSleeperRequestMemo = requestScope.run;
const sleeperRequestMemo = requestScope.middleware;

function memoKey(url, options) {
  let params = "";
  try {
    params = options.params ? JSON.stringify(options.params) : "";
  } catch {
    params = "?";
  }
  // timeout is part of the key: a caller asking for a longer timeout must not be handed
  // a request that was issued with a shorter one.
  return `${url}|${params}|${options.timeout || ""}`;
}

function getJson(url, options = {}) {
  const store = requestScope.currentStore();
  if (!store) return getJsonUncached(url, options);
  const key = memoKey(url, options);
  const hit = store.get(key);
  if (hit) return hit;
  const promise = getJsonUncached(url, options);
  store.set(key, promise);
  // A failed read must not poison later callers in the same request.
  promise.catch(() => {
    if (store.get(key) === promise) store.delete(key);
  });
  return promise;
}

async function getJsonUncached(url, options = {}) {
  sleeperRequestBudget.take();
  try {
    const res = await axios.get(url, {
      timeout: options.timeout || 10000,
      params: options.params,
    });
    return res.data;
  } catch (error) {
    // O8: report before the 429 is reshaped, so the tag carries the real
    // upstream status rather than the 503 we translate it into.
    captureProviderError({
      provider: "sleeper",
      operation: "api_get",
      error,
      context: {
        path: safeSleeperPath(url),
        http_status: error?.response?.status ?? null,
        code: error?.code ?? null,
      },
    });

    if (error?.response?.status === 429) {
      const retryAfterSeconds = Number(error.response.headers?.["retry-after"]);
      const rateError = new Error("Sleeper temporarily rate limited draft sync");
      rateError.status = 503;
      rateError.code = "sleeper_rate_limited";
      rateError.retryAfterMs =
        Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 30_000;
      throw rateError;
    }
    throw error;
  }
}

async function readCache(key) {
  if (!redis) return null;
  const cached = await redis.get(key).catch(() => null);
  if (!cached) return null;
  return typeof cached === "string" ? JSON.parse(cached) : cached;
}

/** Resolves true only when Redis accepted the write (false: no Redis, or the write failed). Never throws. */
async function writeCache(key, value, ttlSeconds) {
  if (!redis) return false;
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
    return true;
  } catch {
    return false;
  }
}

// In-flight promise map for single-flight dedupe of concurrent
// cache-miss requests against the same Sleeper draft endpoint.
// Keyed by cache key so each draft (and each endpoint within it) is
// independent. Promises are cleared after settle so the next caller
// repopulates cache or refetches as needed.
const inFlightDraftFetches = new Map();

async function singleFlight(key, fetcher) {
  const pending = inFlightDraftFetches.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      return await fetcher();
    } finally {
      inFlightDraftFetches.delete(key);
    }
  })();

  inFlightDraftFetches.set(key, promise);
  return promise;
}

function normalizeSlot(slot) {
  if (!slot) return null;
  return STARTER_SLOT_MAP[slot] || slot;
}

function fullName(player, playerId) {
  return player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim() || playerId || "Unknown";
}

function primaryPosition(player) {
  const position = normalizeSlot(player?.position);
  return position || "UNK";
}

function eligiblePositions(player) {
  const positions = Array.isArray(player?.fantasy_positions)
    ? player.fantasy_positions.map(normalizeSlot).filter(Boolean)
    : [];

  if (positions.length) return [...new Set(positions)];

  const position = primaryPosition(player);
  return position === "UNK" ? [] : [position];
}

function imageUrl(playerId) {
  return playerId ? `https://sleepercdn.com/content/nfl/players/${playerId}.jpg` : null;
}

/**
 * Normalize a raw Sleeper projections payload into a `player_id -> pts_ppr` map.
 *
 * The live endpoint returns an ARRAY of records with points nested under
 * `stats` (verified 2026-07-26). Reading it as an object map keyed by player id
 * silently produced `null` for every player, because a string id indexes an
 * array by position rather than by key -- and for low-numbered veteran ids it
 * resolved to a *different* player's record. Normalizing once here keeps both
 * hazards in one place instead of at every call site.
 *
 * Object payloads are tolerated so a cached value written before this fix, or a
 * future shape change, degrades to a miss rather than a wrong-player match.
 */
function normalizeProjections(payload) {
  const out = {};

  const add = (record, fallbackId) => {
    if (!record || typeof record !== "object") return;
    const id = record.player_id != null ? String(record.player_id) : fallbackId;
    if (!id) return;
    const raw = record.stats?.pts_ppr ?? record.pts_ppr;
    const points = Number(raw);
    if (raw != null && Number.isFinite(points)) out[id] = points;
    // A row with a stats object but no points is Sleeper projecting the player not to play this week
    // (inactive, out, bye): an honest 0, not a missing read for another source to fill.
    else if (record.stats && typeof record.stats === "object") out[id] = 0;
  };

  if (Array.isArray(payload)) {
    for (const record of payload) add(record, null);
  } else if (payload && typeof payload === "object") {
    for (const [key, record] of Object.entries(payload)) {
      if (typeof record === "number") {
        if (Number.isFinite(record)) out[String(key)] = record;
        continue;
      }
      add(record, String(key));
    }
  }

  return out;
}

function projectionFor(projections, playerId) {
  const points = Number(projections?.[String(playerId)]);
  return Number.isFinite(points) ? points : null;
}

function normalizePlayer({ playerId, player, projection, selectedPosition, isStarter }) {
  const id = String(playerId);

  return {
    player_key: `sleeper:${id}`,
    player_id: id,
    name: fullName(player, id),
    position: primaryPosition(player),
    eligible_positions: eligiblePositions(player),
    selected_position: selectedPosition,
    team: player?.team || null,
    opponent: null,
    status: player?.injury_status || null,
    projected_points: projection,
    actual_points: null,
    image_url: imageUrl(id),
    is_starter: Boolean(isStarter),
    espn_id: player?.espn_id || null,
    yahoo_id: player?.yahoo_id || null,
    gsis_id: player?.gsis_id || null,
  };
}

async function fetchSleeperUser(username) {
  const user = await getJson(`${BASE}/user/${encodeURIComponent(username)}`);
  if (!user?.user_id) {
    const err = new Error("Sleeper user not found");
    err.status = 404;
    throw err;
  }
  return {
    user_id: user.user_id,
    display_name: user.display_name,
    username: user.username,
  };
}

async function fetchSleeperLeagues(userId, season) {
  const targetSeason = season || currentSeason();
  const leagues = await getJson(`${BASE}/user/${encodeURIComponent(userId)}/leagues/nfl/${targetSeason}`);
  return Array.isArray(leagues) ? leagues : [];
}

async function fetchSleeperLeague(leagueId) {
  return getJson(`${BASE}/league/${encodeURIComponent(leagueId)}`);
}

async function fetchSleeperRoster(leagueId, userId) {
  const [rosters, users] = await Promise.all([
    getJson(`${BASE}/league/${encodeURIComponent(leagueId)}/rosters`),
    getJson(`${BASE}/league/${encodeURIComponent(leagueId)}/users`),
  ]);

  const user = Array.isArray(users) ? users.find((leagueUser) => String(leagueUser.user_id) === String(userId)) : null;
  const roster = Array.isArray(rosters)
    ? rosters.find((leagueRoster) => String(leagueRoster.owner_id) === String(userId))
    : null;

  if (!user || !roster) {
    const err = new Error("Sleeper user is not in this league");
    err.status = 404;
    throw err;
  }

  return {
    rosters,
    users,
    roster,
    roster_id: roster.roster_id,
  };
}

function statWithDecimal(settings = {}, wholeKey, decimalKey) {
  const whole = Number(settings?.[wholeKey] || 0);
  const decimal = Number(settings?.[decimalKey] || 0);
  return Math.round((whole + decimal / 100) * 100) / 100;
}

function sleeperTeamName(user, roster) {
  return (
    user?.metadata?.team_name ||
    user?.display_name ||
    user?.username ||
    `Team ${roster?.roster_id || ""}`.trim() ||
    "Unknown"
  );
}

function sleeperLeagueTeamName(user, roster) {
  // Trade candidates must never surface a manager's Sleeper display name,
  // username, user id, or avatar. A user-provided team name is league-scoped;
  // otherwise the opaque roster id is the only identity we expose.
  return user?.metadata?.team_name || `Team ${roster?.roster_id || "Unknown"}`;
}

/**
 * One round (week) of a league's transactions: `GET /league/{id}/transactions/{round}` (G4).
 * Public and documented by Sleeper; returns the raw array. `round` is the week for in-season
 * rounds. Bounded by a short timeout and the shared Sleeper request budget (`getJson`).
 */
async function fetchSleeperTransactions(leagueId, round) {
  const week = Math.max(0, Math.min(Number.parseInt(round, 10) || 0, 30));
  const data = await getJson(`${BASE}/league/${encodeURIComponent(leagueId)}/transactions/${week}`, { timeout: 5000 });
  return Array.isArray(data) ? data : [];
}

/**
 * roster_id -> display name for a league, using the same league-scoped team name the rest of the
 * app exposes (never a manager's display name or username). The rosters and users reads are the
 * ones the standings read already makes, so inside one request they collapse via the request memo.
 */
async function fetchSleeperTeamNames(leagueId) {
  const [rosters, users] = await Promise.all([
    getJson(`${BASE}/league/${encodeURIComponent(leagueId)}/rosters`),
    getJson(`${BASE}/league/${encodeURIComponent(leagueId)}/users`),
  ]);
  const leagueUsers = Array.isArray(users) ? users : [];
  const names = {};
  for (const roster of Array.isArray(rosters) ? rosters : []) {
    const user = leagueUsers.find((leagueUser) => String(leagueUser?.user_id) === String(roster?.owner_id));
    names[String(roster?.roster_id)] = sleeperLeagueTeamName(user, roster);
  }
  return names;
}

async function fetchSleeperStandings(leagueId, currentUserId = null) {
  const [rosters, users] = await Promise.all([
    getJson(`${BASE}/league/${encodeURIComponent(leagueId)}/rosters`),
    getJson(`${BASE}/league/${encodeURIComponent(leagueId)}/users`),
  ]);

  const leagueUsers = Array.isArray(users) ? users : [];
  const standings = (Array.isArray(rosters) ? rosters : []).map((roster) => {
    const ownerId = roster?.owner_id == null ? null : String(roster.owner_id);
    const user = leagueUsers.find((leagueUser) => String(leagueUser.user_id) === ownerId);
    const settings = roster?.settings || {};

    return {
      rank: 0,
      team_id: roster?.roster_id == null ? null : String(roster.roster_id),
      team_name: sleeperTeamName(user, roster),
      is_current_user: currentUserId != null && ownerId === String(currentUserId),
      wins: Number(settings.wins || 0),
      losses: Number(settings.losses || 0),
      points_for: statWithDecimal(settings, "fpts", "fpts_decimal"),
      points_against: statWithDecimal(settings, "fpts_against", "fpts_against_decimal"),
    };
  });

  return standings
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.points_for - a.points_for ||
        String(a.team_id || "").localeCompare(String(b.team_id || "")),
    )
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

const MATCHUPS_TTL_S = 21600; // 6h - a completed week's matchup result never changes

async function fetchSleeperMatchups(leagueId, week) {
  const cacheKey = `ssff:sleeper:matchups:${leagueId}:${week}`;
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const matchups = await getJson(`${BASE}/league/${encodeURIComponent(leagueId)}/matchups/${encodeURIComponent(week)}`);
  const out = Array.isArray(matchups) ? matchups : [];
  await writeCache(cacheKey, out, MATCHUPS_TTL_S);
  return out;
}

function normalizeLastResult({ result, gameId, kickoff = null } = {}) {
  return {
    lastResult: result === "W" || result === "L" ? result : null,
    lastGameId: gameId ? String(gameId) : null,
    lastGameKickoff: kickoff || null,
  };
}

function lastResultFromMatchups({ leagueId, week, rosterId, matchups }) {
  const rows = Array.isArray(matchups) ? matchups : [];
  const mine = rows.find((row) => String(row?.roster_id) === String(rosterId));
  if (!mine?.matchup_id) return normalizeLastResult();

  const opponent = rows.find(
    (row) => String(row?.matchup_id) === String(mine.matchup_id) && String(row?.roster_id) !== String(rosterId),
  );
  if (!opponent) return normalizeLastResult();

  const myPoints = Number(mine.points);
  const opponentPoints = Number(opponent.points);
  if (!Number.isFinite(myPoints) || !Number.isFinite(opponentPoints) || myPoints === opponentPoints) {
    return normalizeLastResult({
      gameId: `${leagueId}:${week}:${mine.matchup_id}`,
    });
  }

  return normalizeLastResult({
    result: myPoints > opponentPoints ? "W" : "L",
    gameId: `${leagueId}:${week}:${mine.matchup_id}`,
  });
}

/**
 * The matchup this week's rows describe, as `league-overview.v1` states it.
 *
 * `lastResultFromMatchups()` above reads exactly this data and reduces it to a single "W" or
 * "L" letter. The opponent's identity and both point totals were being read and discarded on
 * every call. This keeps them.
 *
 * Team names come from the standings rows the caller already fetched, so this adds no request.
 * Nothing here is inferred beyond `status`, whose derivation is documented on each branch.
 */
/**
 * A side's projected total, summed from its **starters**.
 *
 * Sleeper's matchup rows carry no projected total of their own — which is why `projected` was
 * hardwired to `null` here and why, on the Command Center, a Sleeper league showed an em dash
 * in the PROJ column while the Yahoo league beside it showed a number. Sleeper *does* publish
 * per-player projections, and this adapter has fetched and read them since M11 for the roster
 * and waiver paths (`fetchSleeperProjections`). The matchup path simply never asked.
 *
 * Starters only. `players` is the whole roster and summing it would project the bench as if it
 * played, which is not the number any fantasy site shows.
 *
 * `null`, never `0`, when **no** starter had a projection — that is "Sleeper had nothing to
 * say", and a zero there would state as fact that the team is projected to score nothing. A
 * starter Sleeper published no row for contributes 0 to a sum that has at least one real
 * number in it: for the current week that means an empty slot or a player Sleeper is not
 * projecting to play, which is what a 0 contribution means.
 *
 * Sleeper uses the string `"0"` for an unfilled starting slot; it is not a player id.
 */
function projectedFromStarters(row, projections) {
  const starters = Array.isArray(row?.starters) ? row.starters : [];
  let total = 0;
  let found = false;
  for (const id of starters) {
    if (id == null || String(id) === "0") continue;
    const points = projectionFor(projections, id);
    if (points == null) continue;
    total += points;
    found = true;
  }
  return found ? Math.round(total * 100) / 100 : null;
}

function matchupFromMatchups({
  leagueId,
  week,
  rosterId,
  matchups,
  standings = [],
  isPastWeek = false,
  projections = null,
}) {
  const rows = Array.isArray(matchups) ? matchups : [];
  const mine = rows.find((row) => String(row?.roster_id) === String(rosterId));
  if (!mine?.matchup_id) return { status: "no_matchup", you: null, opponent: null };

  const opponent = rows.find(
    (row) => String(row?.matchup_id) === String(mine.matchup_id) && String(row?.roster_id) !== String(rosterId),
  );
  // A matchup id with no second side is a bye, not a provider failure.
  if (!opponent) return { status: "no_matchup", you: null, opponent: null };

  const side = (row) => {
    const teamId = row?.roster_id == null ? null : String(row.roster_id);
    const standingsRow = standings.find((team) => String(team?.team_id) === teamId) || null;
    const points = Number(row?.points);
    return {
      team_id: teamId,
      team_name: standingsRow?.team_name || null,
      record:
        standingsRow && standingsRow.wins != null && standingsRow.losses != null
          ? `${standingsRow.wins}-${standingsRow.losses}`
          : null,
      points: Number.isFinite(points) ? points : null,
      // Summed from this side's starters. Null when the caller passed no projections or none
      // of the starters had one — never a guess, and never a zero standing in for silence.
      projected: projectedFromStarters(row, projections),
    };
  };

  const you = side(mine);
  const them = side(opponent);

  // Sleeper has no explicit game-state field, so status is derived. Both branches are
  // checkable against the payload rather than against the calendar alone:
  //   - no points scored on either side  -> nobody has played, so pregame
  //   - the requested week is behind the current week -> the week is closed, so final
  // Anything else is in progress. A week that is over but scored 0-0 reads as pregame,
  // which is the safer wrong answer: it claims nothing about who won.
  const noPointsYet = (you.points ?? 0) === 0 && (them.points ?? 0) === 0;
  const status = noPointsYet ? "pregame" : isPastWeek ? "final" : "live";

  return {
    status,
    you,
    opponent: them,
    game_id: `${leagueId}:${week}:${mine.matchup_id}`,
  };
}

async function fetchSleeperLastResult({ leagueId, userId, week, season } = {}) {
  void season;
  if (!leagueId || !userId || !week) return normalizeLastResult();
  const [rosterInfo, matchups] = await Promise.all([
    fetchSleeperRoster(leagueId, userId),
    fetchSleeperMatchups(leagueId, week),
  ]);
  return lastResultFromMatchups({
    leagueId,
    week,
    rosterId: rosterInfo.roster_id,
    matchups,
  });
}

// The players map is global (not per user) and several MB; parse it once per process
// per TTL and single-flight concurrent loads, ahead of the Redis read.
const PLAYERS_MEMO_TTL_MS = 20 * 60 * 1000;
const playersMemo = { value: null, at: 0, promise: null };

function resetSleeperPlayersMemo() {
  playersMemo.value = null;
  playersMemo.at = 0;
  playersMemo.promise = null;
  tieredPlayers.overlay = null;
  tieredPlayers.refreshing = null;
  tieredPlayers.nextRefreshAt = 0;
  tieredPlayers.failures = 0;
  tieredPlayers.cold = null;
  tieredPlayers.coldFailure = null;
  tieredPlayers.tier = null;
  projectionsMemo.clear();
}

async function loadSleeperPlayers() {
  const cached = await readCache(PLAYERS_CACHE_KEY);
  if (cached) return cached;

  const players = await getJson(`${BASE}/players/nfl`, { timeout: 30000 });
  const out = players && typeof players === "object" ? players : {};
  await writeCache(PLAYERS_CACHE_KEY, out, PLAYERS_TTL_S);
  return out;
}

const PLAYERS_REFRESH_BACKOFF_MS = 60 * 1000;

async function fetchSleeperPlayersLegacy() {
  const now = Date.now();
  if (playersMemo.value && now - playersMemo.at < PLAYERS_MEMO_TTL_MS) return playersMemo.value;

  let promise = playersMemo.promise;
  if (!promise) {
    promise = loadSleeperPlayers()
      .then((value) => {
        playersMemo.value = value;
        playersMemo.at = Date.now();
        return value;
      })
      .catch((err) => {
        // A failed refresh with a stale map in hand backs off ~60s, so an outage does not make
        // every request wait out the 30s players timeout.
        if (playersMemo.value) playersMemo.at = Date.now() - PLAYERS_MEMO_TTL_MS + PLAYERS_REFRESH_BACKOFF_MS;
        throw err;
      })
      .finally(() => {
        if (playersMemo.promise === promise) playersMemo.promise = null;
      });
    playersMemo.promise = promise;
  }
  try {
    return await promise;
  } catch (err) {
    // Every caller (leader or joiner) serves the stale map rather than failing.
    if (playersMemo.value) return playersMemo.value;
    throw err;
  }
}

// ---- tiered freshness (injury designations) -------------------------------------------------
// Serve the cached players map immediately; when it is older than the current tier's TTL, refresh in
// the background (single-flight). A failed refresh keeps the old map and backs off. No request waits
// on a refresh except the very first load in a cold process with an empty Redis.
const REFRESH_BACKOFF_BASE_MS = 60 * 1000;
const REFRESH_BACKOFF_MAX_MS = 10 * 60 * 1000;
// With nothing cached, a failed first load is remembered briefly so each request does not retry a 30 s fetch.
const COLD_FAILURE_TTL_MS = 30 * 1000;
const tieredPlayers = {
  coldFailure: null,
  overlay: null,
  refreshing: null,
  nextRefreshAt: 0,
  failures: 0,
  cold: null,
  tier: null,
};

function currentFreshnessPolicy(nowMs = Date.now()) {
  let offSeason = null;
  try {
    offSeason = require("../services/nflSchedule").isOffSeason(new Date(nowMs));
  } catch {
    offSeason = null; // schedule unavailable: the policy falls back to a month rule
  }
  return injuryFreshness.freshnessPolicy(new Date(nowMs), { offSeason });
}

const PLAYERS_MIN_COUNT = 1000; // the real file has ~11k entries
const PLAYERS_MAX_SHRINK = 0.5;

/** Is a freshly fetched players map plausible next to the one we hold? Counts only, no content. */
function playersMapVerdict(previous, next) {
  const received = next ? Object.keys(next).length : 0;
  const prev = previous ? Object.keys(previous).length : 0;
  if (received === 0) return { ok: false, reason: "empty", previous: prev, received };
  if (prev >= PLAYERS_MIN_COUNT && received < PLAYERS_MIN_COUNT)
    return { ok: false, reason: "under_floor", previous: prev, received };
  if (prev > 0 && received < prev * (1 - PLAYERS_MAX_SHRINK))
    return { ok: false, reason: "shrunk", previous: prev, received };
  return { ok: true, previous: prev, received };
}

function backoffMs(failures) {
  return Math.min(REFRESH_BACKOFF_MAX_MS, REFRESH_BACKOFF_BASE_MS * 2 ** Math.max(0, failures - 1));
}

function installPlayers(value, asOfMs) {
  const overlay = injuryFreshness.buildInjuryOverlay(value);
  if (tieredPlayers.overlay) {
    const { changes, counts } = injuryFreshness.diffInjuryOverlay(tieredPlayers.overlay, overlay);
    if (changes.length) {
      // PII-free: counts only. Per-user response caches are keyed by user, not by player, so there is
      // no safe targeted invalidation; the short response-cache TTL bounds how long a call built on
      // the old designation can be served.
      console.log(JSON.stringify({ event: "sleeper_injury_designation_changes", tier: tieredPlayers.tier, ...counts }));
    }
  }
  tieredPlayers.overlay = overlay;
  playersMemo.value = value;
  playersMemo.at = asOfMs;
}

function startPlayersRefresh(policy) {
  if (tieredPlayers.refreshing) return tieredPlayers.refreshing;
  const run = (async () => {
    try {
      // Another instance may have refreshed already: adopt its copy instead of refetching ~5 MB.
      const sharedAt = Number(await readCache(PLAYERS_AT_KEY));
      if (Number.isFinite(sharedAt) && sharedAt > playersMemo.at && Date.now() - sharedAt < policy.players_ttl_ms) {
        const shared = await readCache(PLAYERS_CACHE_KEY);
        if (shared) {
          installPlayers(shared, sharedAt);
          tieredPlayers.failures = 0;
          return;
        }
      }
      const players = await getJson(`${BASE}/players/nfl`, { timeout: 30000 });
      const out = players && typeof players === "object" ? players : {};
      const verdict = playersMapVerdict(playersMemo.value, out);
      if (!verdict.ok) {
        // Keep the old map: an empty or truncated file would otherwise turn every Out player healthy.
        console.log(
          JSON.stringify({
            event: "sleeper_players_refresh_rejected",
            reason: verdict.reason,
            previous: verdict.previous,
            received: verdict.received,
          }),
        );
        throw new Error("sleeper players refresh rejected");
      }
      const asOf = Date.now();
      installPlayers(out, asOf);
      tieredPlayers.failures = 0;
      // The stamp is written only if the data write succeeded; otherwise another instance would adopt
      // an old blob under a fresh stamp.
      if (await writeCache(PLAYERS_CACHE_KEY, out, STORE_TTL_S)) await writeCache(PLAYERS_AT_KEY, asOf, STORE_TTL_S);
    } catch {
      tieredPlayers.failures += 1;
      tieredPlayers.nextRefreshAt = Date.now() + backoffMs(tieredPlayers.failures);
    }
  })().finally(() => {
    tieredPlayers.refreshing = null;
  });
  tieredPlayers.refreshing = run;
  return run;
}

async function loadPlayersCold() {
  const [cached, at] = await Promise.all([readCache(PLAYERS_CACHE_KEY), readCache(PLAYERS_AT_KEY)]);
  if (cached) {
    installPlayers(cached, Number.isFinite(Number(at)) ? Number(at) : 0);
    return;
  }
  const players = await getJson(`${BASE}/players/nfl`, { timeout: 30000 });
  const out = players && typeof players === "object" ? players : {};
  const verdict = playersMapVerdict(null, out);
  if (!verdict.ok) {
    console.log(
      JSON.stringify({
        event: "sleeper_players_refresh_rejected",
        reason: verdict.reason,
        previous: 0,
        received: verdict.received,
      }),
    );
    throw new Error("sleeper players load rejected");
  }
  const asOf = Date.now();
  installPlayers(out, asOf);
  if (await writeCache(PLAYERS_CACHE_KEY, out, STORE_TTL_S)) await writeCache(PLAYERS_AT_KEY, asOf, STORE_TTL_S);
}

async function fetchSleeperPlayersTiered() {
  if (!playersMemo.value) {
    const failed = tieredPlayers.coldFailure;
    if (failed && Date.now() - failed.at < COLD_FAILURE_TTL_MS) throw failed.error;
    if (!tieredPlayers.cold) {
      const cold = loadPlayersCold()
        .then(() => {
          tieredPlayers.coldFailure = null;
        })
        .catch((error) => {
          tieredPlayers.coldFailure = { at: Date.now(), error };
          throw error;
        })
        .finally(() => {
          if (tieredPlayers.cold === cold) tieredPlayers.cold = null;
        });
      tieredPlayers.cold = cold;
    }
    await tieredPlayers.cold;
  }
  const now = Date.now();
  const policy = currentFreshnessPolicy(now);
  tieredPlayers.tier = policy.tier;
  if (now - playersMemo.at >= policy.players_ttl_ms && now >= tieredPlayers.nextRefreshAt) {
    startPlayersRefresh(policy); // not awaited: the caller gets the cached map now
  }
  return playersMemo.value;
}

async function fetchSleeperPlayers() {
  return injuryFreshness.tiersDisabled() ? fetchSleeperPlayersLegacy() : fetchSleeperPlayersTiered();
}

/** When the data behind recent calls was fetched (ISO), for "injury report as of HH:MM". */
function getSleeperDataFreshness() {
  let projectionsAt = 0;
  for (const entry of projectionsMemo.values()) projectionsAt = Math.max(projectionsAt, entry.at);
  const iso = (ms) => (ms > 0 ? new Date(ms).toISOString() : null);
  // Stale: the last refresh attempt failed, or the data is older than twice its tier TTL.
  const now = Date.now();
  const policy = currentFreshnessPolicy(now);
  let stale = tieredPlayers.failures > 0 || (playersMemo.at > 0 && now - playersMemo.at > 2 * policy.players_ttl_ms);
  for (const entry of projectionsMemo.values()) {
    if (entry.failures > 0 || (entry.at > 0 && now - entry.at > 2 * policy.projections_ttl_ms)) stale = true;
  }
  return { players_as_of: iso(playersMemo.at), projections_as_of: iso(projectionsAt), tier: tieredPlayers.tier, stale };
}

// Ranking and draft fields ride along in Sleeper's projection `stats`; they are not stats and
// no league scores them, so they are not kept in the stat-line cache.
const NON_STAT_PROJECTION_KEY = /^(adp_|pos_adp|rank_|pos_rank|gp$|gs$|gms_active$)/;

/**
 * `player_id -> projected stat line` from the same payload as `normalizeProjections`.
 *
 * The projection explainer (`services/projectionBreakdown.js`) multiplies this line by the
 * league's `scoring_settings` to show where the projected points come from. Only non-zero
 * numeric stats are kept (a zero contributes nothing to any league's score), which keeps the
 * cached map small enough for one Redis value.
 */
function normalizeProjectionStatLines(payload) {
  const out = {};
  const records = Array.isArray(payload) ? payload : [];
  for (const record of records) {
    if (!record || record.player_id == null || !record.stats || typeof record.stats !== "object") continue;
    const line = {};
    for (const [key, value] of Object.entries(record.stats)) {
      if (NON_STAT_PROJECTION_KEY.test(key)) continue;
      const number = Number(value);
      if (value == null || !Number.isFinite(number) || number === 0) continue;
      line[key] = number;
    }
    if (Object.keys(line).some((key) => !key.startsWith("pts_"))) out[String(record.player_id)] = line;
  }
  return out;
}

const projectionsCacheKey = (season, week) => `ssff:sleeper:projections:${season}:${week}`;
const projectionStatLinesCacheKey = (season, week) => `ssff:sleeper:projection-stat-lines:${season}:${week}`;

/**
 * One fetch of the week's projections, written to both the points and stat-line caches.
 * Single-flight: a cold cache or a slow Sleeper must cost one request, not one per caller.
 */
function fetchAndCacheSleeperProjections(season, week) {
  return singleFlight(`projections:${season}:${week}`, () => fetchAndCacheSleeperProjectionsOnce(season, week));
}

async function fetchAndCacheSleeperProjectionsOnce(season, week) {
  const projections = await getJson(`${PROJECTIONS_BASE}/${season}/${week}`, {
    params: {
      season_type: "regular",
      "position[]": NFL_POSITIONS,
    },
    timeout: 15000,
  });
  const points = normalizeProjections(projections);
  const statLines = normalizeProjectionStatLines(projections);
  const tiered = !injuryFreshness.tiersDisabled();
  const asOf = Date.now();
  const ttl = tiered ? STORE_TTL_S : PROJECTIONS_TTL_S;
  if (tiered) rememberProjections(season, week, { points, statLines, at: asOf });
  const written = await Promise.all([
    writeCache(projectionsCacheKey(season, week), points, ttl),
    writeCache(projectionStatLinesCacheKey(season, week), statLines, ttl),
  ]);
  // Stamp strictly AFTER the data, and only if both writes landed: another instance that sees the new
  // stamp must find the new blob, never an old one.
  if (tiered && written.every(Boolean)) await writeCache(projectionsAtKey(season, week), asOf, ttl);
  return { points, statLines };
}

/**
 * The warehouse's stored copy of the week's projections (football.player_weekly_projections), when the
 * store read is switched on and the stored week is fresh and complete; otherwise null and the caller makes
 * the live fetch. Never throws. Deliberately NOT written to the 1 h Redis cache: the reader memoises it for minutes instead.
 */
async function loadStoredSleeperProjections(season, week) {
  try {
    const stored = await storedProjections
      .getStoredProjectionReader()
      .readSleeperWeek({ season: Number(season), week: Number(week) });
    if (!stored) return null;
    const payload = stored.rows.map((row) => ({ player_id: row.source_player_id, stats: row.stat_line }));
    const points = normalizeProjections(payload);
    const statLines = normalizeProjectionStatLines(payload);
    return { points, statLines };
  } catch {
    return null;
  }
}

// A failed stat-line fetch is remembered briefly so an outage is not retried by every request.
const STAT_LINE_FAILURE_TTL_MS = 30 * 1000;
const statLineFailures = new Map();

function resetSleeperStatLineFailures() {
  statLineFailures.clear();
}

// ---- tiered freshness (projections) ----------------------------------------------------------
// Same stale-while-revalidate shape as the players map. The projections file is one payload for
// every player, so one tier TTL covers it; `hurtPlayers: false` lets a caller that knows it only
// holds healthy players accept the longer healthy TTL. Default is the strict (hurt-safe) TTL.
const projectionsAtKey = (season, week) => `ssff:sleeper:projections-at:${season}:${week}`;
const projectionsMemo = new Map();
const PROJECTIONS_MEMO_MAX = 4;

function rememberProjections(season, week, data) {
  const key = `${season}:${week}`;
  // Mutate in place: an in-flight refresh holds a reference to this entry.
  const entry = projectionsMemo.get(key) || { refreshing: null, nextRefreshAt: 0, failures: 0 };
  projectionsMemo.delete(key);
  Object.assign(entry, data);
  projectionsMemo.set(key, entry);
  while (projectionsMemo.size > PROJECTIONS_MEMO_MAX) projectionsMemo.delete(projectionsMemo.keys().next().value);
}

function maybeRefreshProjections(season, week, entry, ttlMs) {
  const now = Date.now();
  if (now - entry.at < ttlMs || entry.refreshing || now < entry.nextRefreshAt) return;
  entry.refreshing = fetchAndCacheSleeperProjections(season, week)
    .then(() => {
      entry.failures = 0;
      entry.nextRefreshAt = 0;
    })
    .catch(() => {
      entry.failures += 1;
      entry.nextRefreshAt = Date.now() + backoffMs(entry.failures);
    })
    .finally(() => {
      entry.refreshing = null;
    });
}

async function loadProjectionsTiered(season, week, { hurtPlayers = true } = {}) {
  const key = `${season}:${week}`;
  let entry = projectionsMemo.get(key);
  if (!entry) {
    const [points, statLines, at] = await Promise.all([
      readCache(projectionsCacheKey(season, week)),
      readCache(projectionStatLinesCacheKey(season, week)),
      readCache(projectionsAtKey(season, week)),
    ]);
    const haveStatLines = statLines && typeof statLines === "object" && !Array.isArray(statLines);
    if (points && haveStatLines) {
      // Normalized on read too: entries cached before an earlier fix hold the raw array.
      rememberProjections(season, week, { points: normalizeProjections(points), statLines, at: Number(at) || 0 });
    } else {
      // First load: nothing cached to serve. The warehouse copy (when on) comes first and is not
      // remembered here; otherwise the live fetch (single-flight inside) sits behind the failure memo.
      const stored = await loadStoredSleeperProjections(season, week);
      if (stored) return stored;
      await fetchLiveProjectionsRemembering(season, week);
    }
    entry = projectionsMemo.get(key);
  }
  const policy = currentFreshnessPolicy();
  maybeRefreshProjections(
    season,
    week,
    entry,
    hurtPlayers ? policy.projections_ttl_ms : policy.healthy_projections_ttl_ms,
  );
  return entry;
}

/**
 * Kill-switch path: a tiered-written entry carries an as-of stamp and a 24 h key TTL. Honour the stamp so
 * legacy mode never serves projections older than its own 1 h TTL. Entries with no stamp are legacy-written.
 */
async function legacyProjectionsExpired(season, week) {
  const stamp = Number(await readCache(projectionsAtKey(season, week)));
  return Number.isFinite(stamp) && stamp > 0 && Date.now() - stamp > PROJECTIONS_TTL_S * 1000;
}

async function fetchSleeperProjections(season, week, opts = {}) {
  if (!injuryFreshness.tiersDisabled()) return (await loadProjectionsTiered(season, week, opts)).points;
  const cached = (await legacyProjectionsExpired(season, week))
    ? null
    : await readCache(projectionsCacheKey(season, week));
  // Normalized on read too: entries cached before this fix hold the raw array.
  if (cached) return normalizeProjections(cached);
  const stored = await loadStoredSleeperProjections(season, week);
  if (stored) return stored.points;
  return (await fetchAndCacheSleeperProjections(season, week)).points;
}

/** A live fetch behind the short failure memo: an outage is not retried by every request. */
async function fetchLiveProjectionsRemembering(season, week) {
  const key = `${season}:${week}`;
  const failedAt = statLineFailures.get(key);
  if (failedAt && Date.now() - failedAt < STAT_LINE_FAILURE_TTL_MS) {
    throw Object.assign(new Error("Sleeper projections recently unavailable"), {
      code: "sleeper_projections_recently_failed",
    });
  }
  try {
    const result = await fetchAndCacheSleeperProjections(season, week);
    statLineFailures.delete(key);
    return result;
  } catch (error) {
    statLineFailures.set(key, Date.now());
    throw error;
  }
}

async function fetchSleeperProjectionStatLines(season, week, opts = {}) {
  if (!injuryFreshness.tiersDisabled()) return (await loadProjectionsTiered(season, week, opts)).statLines;
  const cached = (await legacyProjectionsExpired(season, week))
    ? null
    : await readCache(projectionStatLinesCacheKey(season, week));
  if (cached && typeof cached === "object" && !Array.isArray(cached)) return cached;
  const stored = await loadStoredSleeperProjections(season, week);
  if (stored) return stored.statLines;
  return (await fetchLiveProjectionsRemembering(season, week)).statLines;
}

/**
 * Available (waiver) player pool for one Sleeper league.
 *
 * Sleeper exposes no free-agent endpoint, so the pool is derived: every active
 * skill-position player minus every player rostered by ANY team in the league.
 *
 * The subtraction is the correctness risk. Missing one roster silently offers an
 * owned player as available, and the caller presents that as live advice — so a
 * roster row without a usable `players` array is treated as unknown-but-owned
 * rather than empty. Erring toward a smaller pool loses an opportunity; erring
 * the other way produces a recommendation the user cannot act on.
 *
 * Returns the same normalized player shape as buildNormalizedRoster, ranked by
 * projected points. Players with no projection sort last and keep
 * `projected_points: null` — never 0, which would read as a real projection of
 * zero rather than absent data.
 */
async function fetchSleeperAvailablePlayers(leagueId, week, season) {
  const targetSeason = season || currentSeason();
  const [rosters, players, projections] = await Promise.all([
    getJson(`${BASE}/league/${encodeURIComponent(leagueId)}/rosters`),
    fetchSleeperPlayers(),
    fetchSleeperProjections(targetSeason, week).catch(() => ({})),
  ]);

  const rostered = new Set();
  for (const roster of Array.isArray(rosters) ? rosters : []) {
    for (const key of ["players", "starters", "reserve", "taxi"]) {
      const ids = roster?.[key];
      if (!Array.isArray(ids)) continue;
      for (const id of ids) {
        if (id != null) rostered.add(String(id));
      }
    }
  }

  const eligible = new Set(NFL_POSITIONS);
  const pool = [];

  for (const [playerId, player] of Object.entries(players || {})) {
    const id = String(playerId);
    if (rostered.has(id)) continue;
    if (player?.active !== true) continue;
    // Filter on fantasy eligibility, not primary position. Sleeper lists
    // fullbacks as position "FB" with fantasy_positions ["RB"] — they are
    // rosterable at RB, and 74 active players (4 of them projected) would be
    // wrongly withheld from the pool by a primary-position check.
    if (!eligiblePositions(player).some((pos) => eligible.has(pos))) continue;

    pool.push(
      normalizePlayer({
        playerId: id,
        player,
        projection: projectionFor(projections, id),
        selectedPosition: null,
        isStarter: false,
      }),
    );
  }

  pool.sort((a, b) => {
    const left = a.projected_points;
    const right = b.projected_points;
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return right - left;
  });

  return pool;
}

async function fetchSleeperLeagueRosters(leagueId, week, season) {
  const leaguePromise = fetchSleeperLeague(leagueId);
  // Projections only need the league's season when the caller did not pass one.
  const projectionsPromise = (
    season
      ? fetchSleeperProjections(season, week)
      : leaguePromise.then((league) => fetchSleeperProjections(league?.season || currentSeason(), week))
  ).catch(() => ({}));
  const [league, rosters, users, players, projections] = await Promise.all([
    leaguePromise,
    getJson(`${BASE}/league/${encodeURIComponent(leagueId)}/rosters`),
    getJson(`${BASE}/league/${encodeURIComponent(leagueId)}/users`),
    fetchSleeperPlayers(),
    projectionsPromise,
  ]);
  const leagueUsers = Array.isArray(users) ? users : [];
  const rosterPositions = Array.isArray(league?.roster_positions) ? league.roster_positions : [];

  return {
    league_status: league?.status || null,
    roster_positions: rosterPositions,
    teams: (Array.isArray(rosters) ? rosters : []).map((roster) => {
      const user = leagueUsers.find((leagueUser) => String(leagueUser?.user_id) === String(roster?.owner_id));
      const starterIds = new Set((Array.isArray(roster?.starters) ? roster.starters : []).filter(Boolean).map(String));
      const reserveIds = new Set((Array.isArray(roster?.reserve) ? roster.reserve : []).filter(Boolean).map(String));
      const taxiIds = new Set((Array.isArray(roster?.taxi) ? roster.taxi : []).filter(Boolean).map(String));
      const ids = new Set();
      for (const key of ["players", "starters", "reserve", "taxi"]) {
        for (const id of Array.isArray(roster?.[key]) ? roster[key] : []) {
          if (id != null) ids.add(String(id));
        }
      }
      return {
        roster_id: String(roster?.roster_id || ""),
        team_name: sleeperLeagueTeamName(user, roster),
        players: [...ids].map((playerId) =>
          normalizePlayer({
            playerId,
            player: players?.[playerId] || {},
            projection: projectionFor(projections, playerId),
            selectedPosition: reserveIds.has(playerId)
              ? "IR"
              : taxiIds.has(playerId)
                ? "TAXI"
                : starterIds.has(playerId)
                  ? "STARTER"
                  : "BN",
            isStarter: starterIds.has(playerId) && !reserveIds.has(playerId),
          }),
        ),
      };
    }),
  };
}

async function buildNormalizedRoster(leagueId, username, week, opts = {}) {
  const user = await fetchSleeperUser(username);
  const leaguePromise = fetchSleeperLeague(leagueId).catch(() => null);
  const projectionsPromise = (
    opts.season
      ? fetchSleeperProjections(opts.season, week)
      : leaguePromise.then((league) => fetchSleeperProjections(league?.season || currentSeason(), week))
  ).catch(() => ({}));
  const [league, rosterInfo, players, projections] = await Promise.all([
    leaguePromise,
    fetchSleeperRoster(leagueId, user.user_id),
    fetchSleeperPlayers(),
    projectionsPromise,
  ]);

  const roster = rosterInfo.roster || {};
  const starterIds = Array.isArray(roster.starters) ? roster.starters.map(String) : [];
  const reserveIds = new Set((Array.isArray(roster.reserve) ? roster.reserve : []).map(String));
  const allPlayerIds = Array.isArray(roster.players) ? roster.players.map(String) : [];
  const rosterPositions = Array.isArray(league?.roster_positions) ? league.roster_positions : [];

  const slots = { starters: [], bench: [], ir: [] };

  for (const playerId of allPlayerIds) {
    const player = players?.[playerId] || {};
    const starterIndex = starterIds.indexOf(playerId);
    const isStarter = starterIndex !== -1;
    const isIr = reserveIds.has(playerId);
    const selectedPosition = isIr
      ? "IR"
      : isStarter
        ? normalizeSlot(rosterPositions[starterIndex]) || primaryPosition(player)
        : "BN";
    const normalized = normalizePlayer({
      playerId,
      player,
      projection: projectionFor(projections, playerId),
      selectedPosition,
      isStarter,
    });

    if (isIr) slots.ir.push(normalized);
    else if (isStarter) slots.starters.push(normalized);
    else slots.bench.push(normalized);
  }

  return {
    week: Number(week),
    league_key: String(leagueId),
    team_key: String(rosterInfo.roster_id),
    slots,
    source: "sleeper",
  };
}

async function fetchSleeperLeagueDrafts(leagueId) {
  const drafts = await getJson(`${BASE}/league/${encodeURIComponent(leagueId)}/drafts`);
  return Array.isArray(drafts) ? drafts : [];
}

async function fetchSleeperDraft(draftId) {
  const cacheKey = `ssff:sleeper:draft:meta:${draftId}`;
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  return singleFlight(cacheKey, async () => {
    const fresh = await readCache(cacheKey);
    if (fresh) return fresh;

    const draft = await getJson(`${BASE}/draft/${encodeURIComponent(draftId)}`);
    if (!draft || typeof draft !== "object") {
      const err = new Error("Sleeper draft not found");
      err.status = 404;
      throw err;
    }
    await writeCache(cacheKey, draft, DRAFT_META_TTL_S);
    return draft;
  });
}

async function fetchSleeperDraftPicks(draftId) {
  const cacheKey = `ssff:sleeper:draft:picks:${draftId}`;
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  return singleFlight(cacheKey, async () => {
    const fresh = await readCache(cacheKey);
    if (fresh) return fresh;

    const picks = await getJson(`${BASE}/draft/${encodeURIComponent(draftId)}/picks`);
    const out = Array.isArray(picks) ? picks : [];
    await writeCache(cacheKey, out, DRAFT_PICKS_TTL_S);
    return out;
  });
}

module.exports = {
  createWindowBudget,
  sleeperRequestMemo,
  runWithSleeperRequestMemo,
  resetSleeperPlayersMemo,
  getSleeperDataFreshness,
  fetchSleeperUser,
  fetchSleeperLeagues,
  fetchSleeperLeague,
  fetchSleeperRoster,
  fetchSleeperStandings,
  fetchSleeperTransactions,
  fetchSleeperTeamNames,
  fetchSleeperMatchups,
  fetchSleeperLastResult,
  fetchSleeperPlayers,
  fetchSleeperProjections,
  fetchSleeperProjectionStatLines,
  resetSleeperStatLineFailures,
  normalizeProjectionStatLines,
  normalizeProjections,
  fetchSleeperAvailablePlayers,
  fetchSleeperLeagueRosters,
  fetchSleeperLeagueDrafts,
  fetchSleeperDraft,
  fetchSleeperDraftPicks,
  buildNormalizedRoster,
  lastResultFromMatchups,
  matchupFromMatchups,
};
