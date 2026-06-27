"use strict";

/**
 * Sleeper platform adapter.
 *
 * Produces the same normalized roster shape as src/services/roster.js so
 * downstream optimizer/VORP/MVP logic can stay platform-agnostic.
 */

const axios = require("axios");
const { Redis } = require("@upstash/redis");
const config = require("../config");

const BASE = "https://api.sleeper.app/v1";
const PROJECTIONS_BASE = "https://api.sleeper.app/projections/nfl";
const PLAYERS_CACHE_KEY = "ssff:sleeper:players";
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

const redis = config.redisUrl
  ? new Redis({ url: config.redisUrl, token: config.redisToken })
  : null;

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

async function getJson(url, options = {}) {
  sleeperRequestBudget.take();
  try {
    const res = await axios.get(url, {
      timeout: options.timeout || 10000,
      params: options.params,
    });
    return res.data;
  } catch (error) {
    if (error?.response?.status === 429) {
      const retryAfterSeconds = Number(error.response.headers?.["retry-after"]);
      const rateError = new Error("Sleeper temporarily rate limited draft sync");
      rateError.status = 503;
      rateError.code = "sleeper_rate_limited";
      rateError.retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : 30_000;
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

async function writeCache(key, value, ttlSeconds) {
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), { ex: ttlSeconds }).catch(() => {});
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
  return player?.full_name
    || `${player?.first_name || ""} ${player?.last_name || ""}`.trim()
    || playerId
    || "Unknown";
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

function projectionFor(projections, playerId) {
  const projection = projections?.[playerId];
  if (!projection) return null;
  const points = projection.pts_ppr;
  return Number.isFinite(Number(points)) ? Number(points) : null;
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

  const user = Array.isArray(users)
    ? users.find((leagueUser) => String(leagueUser.user_id) === String(userId))
    : null;
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
  return Math.round((whole + (decimal / 100)) * 100) / 100;
}

function sleeperTeamName(user, roster) {
  return user?.metadata?.team_name
    || user?.display_name
    || user?.username
    || `Team ${roster?.roster_id || ""}`.trim()
    || "Unknown";
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
    .sort((a, b) => (
      b.wins - a.wins
      || b.points_for - a.points_for
      || String(a.team_id || "").localeCompare(String(b.team_id || ""))
    ))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

async function fetchSleeperMatchups(leagueId, week) {
  const matchups = await getJson(`${BASE}/league/${encodeURIComponent(leagueId)}/matchups/${encodeURIComponent(week)}`);
  return Array.isArray(matchups) ? matchups : [];
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

  const opponent = rows.find((row) =>
    String(row?.matchup_id) === String(mine.matchup_id)
    && String(row?.roster_id) !== String(rosterId)
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

async function fetchSleeperPlayers() {
  const cached = await readCache(PLAYERS_CACHE_KEY);
  if (cached) return cached;

  const players = await getJson(`${BASE}/players/nfl`, { timeout: 30000 });
  const out = players && typeof players === "object" ? players : {};
  await writeCache(PLAYERS_CACHE_KEY, out, PLAYERS_TTL_S);
  return out;
}

async function fetchSleeperProjections(season, week) {
  const cacheKey = `ssff:sleeper:projections:${season}:${week}`;
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const projections = await getJson(`${PROJECTIONS_BASE}/${season}/${week}`, {
    params: {
      season_type: "regular",
      "position[]": NFL_POSITIONS,
    },
    timeout: 15000,
  });
  const out = projections && typeof projections === "object" ? projections : {};
  await writeCache(cacheKey, out, PROJECTIONS_TTL_S);
  return out;
}

async function buildNormalizedRoster(leagueId, username, week, opts = {}) {
  const user = await fetchSleeperUser(username);
  const [league, rosterInfo, players] = await Promise.all([
    fetchSleeperLeague(leagueId).catch(() => null),
    fetchSleeperRoster(leagueId, user.user_id),
    fetchSleeperPlayers(),
  ]);
  const season = opts.season || league?.season || currentSeason();
  const projections = await fetchSleeperProjections(season, week).catch(() => ({}));

  const roster = rosterInfo.roster || {};
  const starterIds = Array.isArray(roster.starters) ? roster.starters.map(String) : [];
  const reserveIds = new Set((Array.isArray(roster.reserve) ? roster.reserve : []).map(String));
  const allPlayerIds = Array.isArray(roster.players) ? roster.players.map(String) : [];
  const rosterPositions = Array.isArray(league?.roster_positions)
    ? league.roster_positions
    : [];

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
  fetchSleeperUser,
  fetchSleeperLeagues,
  fetchSleeperLeague,
  fetchSleeperRoster,
  fetchSleeperStandings,
  fetchSleeperMatchups,
  fetchSleeperLastResult,
  fetchSleeperPlayers,
  fetchSleeperProjections,
  fetchSleeperLeagueDrafts,
  fetchSleeperDraft,
  fetchSleeperDraftPicks,
  buildNormalizedRoster,
  lastResultFromMatchups,
};
