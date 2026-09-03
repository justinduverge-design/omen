"use strict";

/**
 * ESPN platform adapter.
 *
 * Normalizes ESPN roster data into the platform-agnostic roster shape used by
 * src/services/roster.js. Per-user roster/standings data is cookie/session
 * scoped, so caching is intentionally deferred for those. League-public,
 * immutable data (a completed week's matchup result) is cached - see
 * fetchEspnLastResult.
 *
 * Uses Node's built-in https module with browser-like headers instead of the
 * espn-fantasy-football-api library, which bundles its own axios and sends
 * User-Agent: axios/VERSION — rejected by ESPN's API.
 */

const https = require("https");
const { Redis } = require("@upstash/redis");
const config = require("../config");
const { logger } = require("../middleware/logging");
const { captureProviderError } = require("../middleware/providerErrors");

const LAST_RESULT_TTL_S = 21600; // 6h - a completed week's matchup result never changes
const redis = config.redisUrl
  ? new Redis({ url: config.redisUrl, token: config.redisToken })
  : null;

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

const LINEUP_SLOT_MAP = {
  0: "QB",
  2: "RB",
  4: "WR",
  6: "TE",
  16: "DEF",
  17: "K",
  20: "BN",
  21: "IR",
  23: "FLEX",
  24: "FLEX",
};

const POSITION_ID_MAP = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "DEF",
};

const INJURY_STATUS_MAP = {
  ACTIVE: null,
  QUESTIONABLE: "Q",
  DOUBTFUL: "D",
  OUT: "O",
  INJURED_RESERVE: "IR",
  SUSPENDED: "SUSP",
};

function activeSeason() {
  const now = new Date();
  // ESPN seasons are named for the NFL year. New season data begins in August.
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

function normalizeSwid(swid) {
  return String(swid || "").replace(/[{}]/g, "").toLowerCase();
}

function slotFromId(slotId) {
  return LINEUP_SLOT_MAP[Number(slotId)] || "UNK";
}

function positionFrom(value) {
  if (typeof value === "string" && value) {
    if (value === "D/ST") return "DEF";
    return value;
  }
  return POSITION_ID_MAP[Number(value)] || "UNK";
}

function statusFrom(value) {
  if (value == null || value === "") return null;
  return Object.prototype.hasOwnProperty.call(INJURY_STATUS_MAP, value)
    ? INJURY_STATUS_MAP[value]
    : value;
}

function firstFinite(...values) {
  for (const value of values) {
    if (Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function finiteOrZero(...values) {
  return firstFinite(...values) ?? 0;
}

function possibleOwnerIds(team) {
  return [
    team?.ownerId,
    team?.primaryOwner,
    team?.owner?.id,
    team?.owner?.userId,
    team?.owner?.uuid,
    ...(Array.isArray(team?.owners) ? team.owners : []),
  ]
    .filter(Boolean)
    .map((value) => normalizeSwid(value));
}

function findUserTeam(teams, swid, opts = {}) {
  if (!Array.isArray(teams)) return null;
  const requestedTeamId = opts.teamId != null ? String(opts.teamId) : null;
  if (requestedTeamId) {
    return teams.find((team) => String(team?.id) === requestedTeamId || String(team?.teamId) === requestedTeamId) || null;
  }

  const targetSwid = normalizeSwid(swid);
  return teams.find((team) => possibleOwnerIds(team).includes(targetSwid)) || null;
}

function rosterEntries(team) {
  if (Array.isArray(team?.roster)) return team.roster;
  if (Array.isArray(team?.players)) return team.players;
  if (Array.isArray(team?.roster?.entries)) return team.roster.entries;
  return [];
}

function teamId(team) {
  const id = team?.id ?? team?.teamId ?? team?.team_id;
  return id == null ? null : String(id);
}

function teamName(team) {
  const combined = `${team?.location || ""} ${team?.nickname || ""}`.trim();
  return team?.name
    || team?.teamName
    || combined
    || team?.abbrev
    || team?.abbreviation
    || "Unknown";
}

function teamWins(team) {
  return finiteOrZero(
    team?.wins,
    team?.record?.overall?.wins,
    team?.record?.wins,
    team?.overallRecord?.wins
  );
}

function teamLosses(team) {
  return finiteOrZero(
    team?.losses,
    team?.record?.overall?.losses,
    team?.record?.losses,
    team?.overallRecord?.losses
  );
}

function teamPointsFor(team) {
  return finiteOrZero(
    team?.regularSeasonPointsFor,
    team?.pointsFor,
    team?.totalPointsScored,
    team?.totalPoints,
    team?.record?.overall?.pointsFor
  );
}

function teamPointsAgainst(team) {
  return finiteOrZero(
    team?.regularSeasonPointsAgainst,
    team?.pointsAgainst,
    team?.record?.overall?.pointsAgainst
  );
}

function rankingHint(team) {
  return firstFinite(team?.finalStandingsPosition, team?.playoffSeed, team?.rankCalculatedFinal);
}

function unwrapPlayer(entry) {
  return entry?.player || entry?.playerPoolEntry?.player || entry?.playerPoolEntry || entry || {};
}

function playerId(entry, player) {
  return String(
    player?.id
    || player?.playerId
    || player?.player_id
    || entry?.playerId
    || entry?.id
    || "unknown"
  );
}

function playerName(player, id) {
  return player?.fullName
    || player?.full_name
    || player?.name
    || `${player?.firstName || ""} ${player?.lastName || ""}`.trim()
    || id
    || "Unknown";
}

function eligiblePositions(player, primaryPosition) {
  const positions = Array.isArray(player?.eligiblePositions)
    ? player.eligiblePositions.map(positionFrom).filter(Boolean)
    : [];
  if (positions.length) return [...new Set(positions)];
  return primaryPosition === "UNK" ? [] : [primaryPosition];
}

function normalizePlayer(entry) {
  const player = unwrapPlayer(entry);
  const id = playerId(entry, player);
  const selectedPosition = slotFromId(entry?.lineupSlotId ?? entry?.lineupSlot ?? entry?.slotId);
  const primaryPosition = positionFrom(player?.defaultPosition || player?.defaultPositionId || player?.position);
  const isStarter = selectedPosition !== "BN" && selectedPosition !== "IR";

  return {
    player_key: `espn:${id}`,
    player_id: id,
    name: playerName(player, id),
    position: primaryPosition,
    eligible_positions: eligiblePositions(player, primaryPosition),
    selected_position: selectedPosition,
    team: player?.proTeamAbbreviation || player?.teamAbbrev || player?.team || null,
    opponent: null,
    status: statusFrom(player?.injuryStatus || player?.injury_status || player?.status),
    projected_points: firstFinite(
      entry?.projectedPoints,
      entry?.projected_points,
      player?.projectedPoints,
      player?.projected_points,
      player?.projectedRawStatsForScoringPeriod?.appliedTotal,
      player?.projectedStats?.appliedTotal
    ),
    actual_points: firstFinite(entry?.totalPoints, entry?.actualPoints, player?.totalPoints, player?.actual_points),
    image_url: player?.headshotUrl || player?.imageUrl || null,
    is_starter: isStarter,
    espn_id: id,
    yahoo_id: null,
    gsis_id: null,
  };
}

const ESPN_WAIVER_STATUSES = new Set(["FREEAGENT", "WAIVERS"]);

function projectedPointsForEspnPlayer(player, week) {
  const requestedWeek = Number(week);
  const stats = Array.isArray(player?.stats) ? player.stats : [];
  const projection = stats.find((stat) =>
    Number(stat?.statSourceId) === 1
    && (Number.isFinite(requestedWeek) ? Number(stat?.scoringPeriodId) === requestedWeek : true)
  );
  return firstFinite(projection?.appliedTotal);
}

/**
 * Normalize ESPN's player-pool entries into the optimizer's waiver shape.
 * This is deliberately pure: callers can validate the ownership and stat-source
 * rules with fixture data without reading a credential or calling ESPN.
 */
function waiverPoolFromEspnData(data, opts = {}) {
  const entries = Array.isArray(data?.players) ? data.players : [];
  const requestedWeek = opts.week ?? opts.scoringPeriodId;

  return entries.flatMap((entry) => {
    const poolEntry = entry?.playerPoolEntry || entry;
    const player = unwrapPlayer(entry);
    const availability = String(poolEntry?.status || player?.status || "").toUpperCase();
    const primaryPosition = positionFrom(player?.defaultPosition || player?.defaultPositionId || player?.position);
    if (Number(poolEntry?.onTeamId) !== 0 || !ESPN_WAIVER_STATUSES.has(availability) || primaryPosition === "UNK") return [];

    const id = playerId(poolEntry, player);
    return [{
      player_key: `espn:${id}`,
      player_id: id,
      name: playerName(player, id),
      position: primaryPosition,
      eligible_positions: eligiblePositions(player, primaryPosition),
      team: player?.proTeamAbbreviation || player?.teamAbbrev || player?.team || null,
      status: statusFrom(player?.injuryStatus || player?.injury_status),
      // ESPN marks projected stats with statSourceId 1. Actuals (0) are never
      // substituted, even when a projection is unavailable for this period.
      projected_points: projectedPointsForEspnPlayer(player, requestedWeek),
    }];
  });
}

function swidWithBraces(swid) {
  const s = String(swid || "").trim();
  if (s.startsWith("{")) return s;
  return `{${s}}`;
}

function makeEspnHeaders(espn_s2, swid, fantasyFilter) {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://fantasy.espn.com/",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": `espn_s2=${espn_s2}; SWID=${swidWithBraces(swid)}`,
    // Required by ESPN's reads API — omitting either causes fantasy.espn.com
    // to redirect instead of returning JSON, even with valid cookies. See
    // Direction/reviews/2026-07-07-espn-ios-cookie-sync-research.md.
    "x-fantasy-platform": "espn-fantasy-web",
    "x-fantasy-source": "kona",
    ...(fantasyFilter ? { "x-fantasy-filter": JSON.stringify(fantasyFilter) } : {}),
  };
}

/**
 * ESPN's failing request is the one carrying espn_s2 and SWID, so this
 * reporter takes only the hostname and the path *before* the query string,
 * and never touches the headers, the cookie jar, or the response body.
 * facts-of-record #6: ESPN cookie values are never logged, displayed, or
 * echoed — anywhere, ever. That includes error reports.
 */
function reportEspnFailure(operation, error, hostname, path, httpStatus) {
  captureProviderError({
    provider: "espn",
    operation,
    error,
    context: {
      hostname,
      path: String(path || "").split("?")[0],
      http_status: httpStatus ?? error?.status ?? null,
    },
  });
}

function doEspnRequest(hostname, path, espn_s2, swid, redirectsLeft, fantasyFilter) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path, method: "GET", headers: makeEspnHeaders(espn_s2, swid, fantasyFilter) },
      (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) && res.headers.location && redirectsLeft > 0) {
          res.resume();
          try {
            const loc = new URL(res.headers.location, `https://${hostname}`);
            doEspnRequest(loc.hostname, loc.pathname + loc.search, espn_s2, swid, redirectsLeft - 1, fantasyFilter)
              .then(resolve, reject);
          } catch {
            const err = new Error("ESPN API returned an invalid redirect");
            err.status = 502;
            reportEspnFailure("invalid_redirect", err, hostname, path, res.statusCode);
            reject(err);
          }
          return;
        }

        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          logger.info(`[espn] ${hostname}${path.split("?")[0]} -> HTTP ${res.statusCode}`);
          if (res.statusCode === 401 || res.statusCode === 403) {
            const err = new Error("ESPN rejected the request — cookies may be invalid or expired");
            err.status = 401;
            reportEspnFailure("auth_rejected", err, hostname, path, res.statusCode);
            return reject(err);
          }
          if (res.statusCode !== 200) {
            const err = new Error(`ESPN API returned HTTP ${res.statusCode}`);
            err.status = res.statusCode >= 500 ? 502 : res.statusCode;
            reportEspnFailure("http_error", err, hostname, path, res.statusCode);
            return reject(err);
          }
          try {
            resolve(JSON.parse(body));
          } catch {
            const err = new Error("ESPN API returned non-JSON response");
            err.status = 502;
            reportEspnFailure("malformed_response", err, hostname, path, res.statusCode);
            reject(err);
          }
        });
      }
    );
    req.on("error", (err) => {
      err.status = 502;
      reportEspnFailure("transport_error", err, hostname, path, null);
      reject(err);
    });
    req.end();
  });
}

// fantasy.espn.com's own /apis/v3/... path redirects instead of serving
// data — confirmed live, 2026-07-07, even with a real valid session and the
// correct league id (fetch() returned type: "opaqueredirect"). ESPN's own
// frontend calls this dedicated reads subdomain instead. See
// Direction/reviews/2026-07-07-espn-ios-cookie-sync-research.md.
const ESPN_READS_HOSTNAME = "lm-api-reads.fantasy.espn.com";
const ESPN_WAIVER_PAGE_SIZE = 500;
const ESPN_WAIVER_MAX_PAGES = 20;

function fetchEspnApi(leagueId, espn_s2, swid, views, scoringPeriodId, opts = {}) {
  const season = opts.seasonId || activeSeason();
  const viewParams = (Array.isArray(views) ? views : [views]).map((v) => `view=${v}`).join("&");
  const periodParam = scoringPeriodId != null ? `&scoringPeriodId=${scoringPeriodId}` : "";
  const path = `/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?${viewParams}${periodParam}`;
  return doEspnRequest(ESPN_READS_HOSTNAME, path, espn_s2, swid, 3, opts.fantasyFilter);
}

function espnWaiverFilter(offset) {
  return {
    players: {
      filterStatus: { value: ["FREEAGENT", "WAIVERS"] },
      filterSlotIds: { value: [0, 2, 4, 6, 16, 17] },
      limit: ESPN_WAIVER_PAGE_SIZE,
      offset,
      sortPercOwned: { sortAsc: false, sortPriority: 1 },
    },
  };
}

/**
 * Fetch and normalize ESPN's currently available player pool. This remains an
 * adapter boundary: it is not wired into an Omen route or recommendation flow.
 */
async function fetchEspnWaiverPool(leagueId, espn_s2, swid, week, opts = {}) {
  const scoringPeriodId = Number(week);
  if (!Number.isFinite(scoringPeriodId) || scoringPeriodId < 1) {
    const err = new Error("ESPN waiver pool requires a valid scoring period");
    err.status = 400;
    throw err;
  }

  const pool = [];
  for (let page = 0; page < ESPN_WAIVER_MAX_PAGES; page += 1) {
    const offset = page * ESPN_WAIVER_PAGE_SIZE;
    const data = await fetchEspnApi(
      leagueId,
      espn_s2,
      swid,
      ["kona_player_info"],
      scoringPeriodId,
      { ...opts, fantasyFilter: espnWaiverFilter(offset) }
    );
    const entries = Array.isArray(data?.players) ? data.players : [];
    pool.push(...waiverPoolFromEspnData(data, { week: scoringPeriodId }));
    if (entries.length < ESPN_WAIVER_PAGE_SIZE) return pool;
  }

  const err = new Error("ESPN waiver pool pagination exceeded the safe page limit");
  err.status = 502;
  throw err;
}

// The *FromEspnData functions below are pure: they normalize an already-fetched
// ESPN API response and never touch the network or a credential. They exist so
// a future ingestion path (e.g. a client that fetched ESPN's API itself, inside
// an authenticated browser/webview context) can reuse the exact same parsing
// logic as the live server-side fetch, without duplicating it.

function standingsFromEspnData(data, swid, opts = {}) {
  const teams = data?.teams || [];
  const currentTeam = findUserTeam(teams, swid, opts);
  const currentTeamId = teamId(currentTeam);

  return (Array.isArray(teams) ? teams : [])
    .map((team) => ({
      rank: rankingHint(team),
      team_id: teamId(team),
      team_name: teamName(team),
      is_current_user: currentTeamId != null && teamId(team) === currentTeamId,
      wins: teamWins(team),
      losses: teamLosses(team),
      points_for: teamPointsFor(team),
      points_against: teamPointsAgainst(team),
    }))
    .sort((a, b) => (
      (a.rank || Number.MAX_SAFE_INTEGER) - (b.rank || Number.MAX_SAFE_INTEGER)
      || b.wins - a.wins
      || b.points_for - a.points_for
      || String(a.team_id || "").localeCompare(String(b.team_id || ""))
    ))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

async function buildLeagueStandings(leagueId, espn_s2, swid, opts = {}) {
  const scoringPeriodId = Number(opts.week || opts.scoringPeriodId || 1);
  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mTeam", "mSettings"], scoringPeriodId, opts);
  return standingsFromEspnData(data, swid, opts);
}

/**
 * The league's own name, which `mSettings` already carries.
 *
 * This call has always requested `mSettings`, and the name has always been in the response —
 * it was simply never read. `espnStandings()`/`espnOverview()` therefore built every envelope
 * without a `league_name`, so `league-overview.v1` reported `null` for **every ESPN user**,
 * while Sleeper and Yahoo both supplied it. On Android that null surfaced as the literal word
 * "null" under the team name on the Command Center; on iOS and web it left the league unnamed.
 *
 * Exported separately rather than folded into `buildLeagueStandings`'s return so the existing
 * array contract — and its `.length`/`.map` call sites — stay exactly as they are.
 */
function leagueNameFromEspnData(data) {
  const name = data?.settings?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

/** One fetch, both answers. Used by the routes that build an envelope carrying a league name. */
async function buildLeagueContext(leagueId, espn_s2, swid, opts = {}) {
  const scoringPeriodId = Number(opts.week || opts.scoringPeriodId || 1);
  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mTeam", "mSettings"], scoringPeriodId, opts);
  return {
    league_name: leagueNameFromEspnData(data),
    standings: standingsFromEspnData(data, swid, opts),
  };
}

function teamFromEspnData(data, swid, espnTeamId) {
  const teams = data?.teams || [];
  const opts = espnTeamId != null ? { teamId: espnTeamId } : {};
  const team = findUserTeam(teams, swid, opts);
  if (!team) {
    const err = new Error("ESPN team not found in this league");
    err.status = 404;
    throw err;
  }
  return { team_id: teamId(team), team_name: teamName(team) };
}

async function verifyLeagueAccess(leagueId, espn_s2, swid, espnTeamId) {
  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mTeam"]);
  return teamFromEspnData(data, swid, espnTeamId);
}

function rosterFromEspnData(data, leagueId, swid, week, opts = {}) {
  const scoringPeriodId = Number(week);
  const teams = data?.teams || [];
  const team = findUserTeam(teams, swid, opts);
  if (!team) {
    const err = new Error("ESPN team not found in this league");
    err.status = 404;
    throw err;
  }

  const slots = { starters: [], bench: [], ir: [] };
  for (const entry of rosterEntries(team)) {
    const normalized = normalizePlayer(entry);
    if (normalized.selected_position === "IR") slots.ir.push(normalized);
    else if (normalized.selected_position === "BN") slots.bench.push(normalized);
    else slots.starters.push(normalized);
  }

  return {
    week: scoringPeriodId,
    league_key: String(leagueId),
    team_key: String(team.id || team.teamId || ""),
    slots,
    source: "espn",
  };
}

async function buildNormalizedRoster(leagueId, espn_s2, swid, week, opts = {}) {
  const scoringPeriodId = Number(week);
  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mTeam", "mRoster"], scoringPeriodId, opts);
  return rosterFromEspnData(data, leagueId, swid, week, opts);
}

function normalizeLastResult({ result, gameId, kickoff = null } = {}) {
  return {
    lastResult: result === "W" || result === "L" ? result : null,
    lastGameId: gameId ? String(gameId) : null,
    lastGameKickoff: kickoff || null,
  };
}

function espnMatchupTeamId(side) {
  const source = side?.team || side;
  const id = source?.teamId ?? source?.id ?? source?.team_id;
  return id == null ? null : String(id);
}

function espnMatchupPoints(side) {
  const value = side?.totalPoints
    ?? side?.points
    ?? side?.team?.totalPoints
    ?? side?.team?.points;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function lastResultFromEspnSchedule({ leagueId, week, teamId: requestedTeamId, schedule }) {
  const games = Array.isArray(schedule) ? schedule : [];
  const targetTeamId = requestedTeamId == null ? null : String(requestedTeamId);

  for (const game of games) {
    const scoringPeriod = Number(game?.matchupPeriodId ?? game?.scoringPeriodId);
    if (Number.isFinite(Number(week)) && Number.isFinite(scoringPeriod) && scoringPeriod !== Number(week)) {
      continue;
    }

    const home = game?.home || null;
    const away = game?.away || null;
    const homeId = espnMatchupTeamId(home);
    const awayId = espnMatchupTeamId(away);
    if (!homeId || !awayId) continue;

    const mine = targetTeamId
      ? (homeId === targetTeamId ? home : awayId === targetTeamId ? away : null)
      : null;
    if (!mine) continue;

    const opponent = mine === home ? away : home;
    const gameId = game?.id || `${leagueId}:${week}:${homeId}:${awayId}`;
    const winner = game?.winner;
    if (winner === "HOME" || winner === "AWAY") {
      const userWon = (winner === "HOME" && mine === home) || (winner === "AWAY" && mine === away);
      return normalizeLastResult({ result: userWon ? "W" : "L", gameId });
    }

    const myPoints = espnMatchupPoints(mine);
    const opponentPoints = espnMatchupPoints(opponent);
    if (myPoints == null || opponentPoints == null || myPoints === opponentPoints) {
      return normalizeLastResult({ gameId });
    }

    return normalizeLastResult({
      result: myPoints > opponentPoints ? "W" : "L",
      gameId,
    });
  }

  return normalizeLastResult();
}


/**
 * The matchup this week's schedule describes, as `league-overview.v1` states it.
 *
 * `lastResultFromEspnSchedule()` above already resolves `mine`, `opponent`, both point totals,
 * and ESPN's own `winner` field — then returns a single "W"/"L" letter and drops the rest.
 * This keeps them.
 *
 * Team names come from the standings rows the caller already fetched, so this adds no request.
 */
function matchupFromEspnSchedule({ leagueId, week, teamId: requestedTeamId, schedule, standings = [] }) {
  const games = Array.isArray(schedule) ? schedule : [];
  const targetTeamId = requestedTeamId == null ? null : String(requestedTeamId);
  if (!targetTeamId) {
    // Without a team id we cannot tell which side is the caller's. That is a missing input,
    // not a provider failure, and it must not be reported as "no matchup".
    return { status: "unavailable", you: null, opponent: null, unavailable_reason: "team_unknown" };
  }

  for (const game of games) {
    const scoringPeriod = Number(game?.matchupPeriodId ?? game?.scoringPeriodId);
    if (Number.isFinite(Number(week)) && Number.isFinite(scoringPeriod) && scoringPeriod !== Number(week)) {
      continue;
    }

    const home = game?.home || null;
    const away = game?.away || null;
    const homeId = espnMatchupTeamId(home);
    const awayId = espnMatchupTeamId(away);
    if (!homeId || !awayId) continue;

    const mine = homeId === targetTeamId ? home : awayId === targetTeamId ? away : null;
    if (!mine) continue;
    const opponent = mine === home ? away : home;

    const side = (entry) => {
      const id = espnMatchupTeamId(entry);
      const standingsRow = standings.find((team) => String(team?.team_id) === String(id)) || null;
      return {
        team_id: id,
        team_name: standingsRow?.team_name || null,
        record: standingsRow && standingsRow.wins != null && standingsRow.losses != null
          ? `${standingsRow.wins}-${standingsRow.losses}`
          : null,
        points: espnMatchupPoints(entry),
        // ESPN can carry projections in other views; this one does not. Null, never a guess.
        projected: null,
      };
    };

    // ESPN states the winner explicitly, so `final` here is read, not inferred.
    const winner = game?.winner;
    const decided = winner === "HOME" || winner === "AWAY";
    const you = side(mine);
    const them = side(opponent);
    const noPointsYet = (you.points ?? 0) === 0 && (them.points ?? 0) === 0;

    return {
      status: decided ? "final" : noPointsYet ? "pregame" : "live",
      you,
      opponent: them,
      game_id: game?.id ? String(game.id) : `${leagueId}:${week}:${homeId}:${awayId}`,
    };
  }

  // The schedule was readable and contains no game for this team this week — a bye.
  return { status: "no_matchup", you: null, opponent: null };
}

async function fetchEspnLastResult(leagueId, espn_s2, swid, opts = {}) {
  const scoringPeriodId = Number(opts.week || opts.scoringPeriodId || 1);

  // Only cache when teamId is known - never key a cache entry off the SWID
  // cookie, which would persist an ESPN credential in plaintext. Without a
  // teamId, lastResultFromEspnSchedule can't resolve a result anyway.
  const cacheKey = opts.teamId != null
    ? `ssff:espn:lastresult:${leagueId}:${scoringPeriodId}:${opts.teamId}`
    : null;
  const cached = cacheKey ? await readCache(cacheKey) : null;
  if (cached) return cached;

  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mMatchup"], scoringPeriodId, opts);
  const result = lastResultFromEspnSchedule({
    leagueId,
    week: scoringPeriodId,
    teamId: opts.teamId,
    schedule: data?.schedule,
  });
  if (cacheKey) await writeCache(cacheKey, result, LAST_RESULT_TTL_S);
  return result;
}


/**
 * One `mMatchup` read, kept whole. Deliberately NOT cached: `fetchEspnLastResult` caches a
 * completed week's W/L letter for six hours, which is safe because that never changes. A live
 * matchup's points change every few minutes, so serving them from that cache would show stale
 * scores during the games this section exists to cover.
 */
async function fetchEspnMatchup(leagueId, espn_s2, swid, opts = {}) {
  const scoringPeriodId = Number(opts.week || opts.scoringPeriodId || 1);
  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mMatchup"], scoringPeriodId, opts);
  return matchupFromEspnSchedule({
    leagueId,
    week: scoringPeriodId,
    teamId: opts.teamId,
    schedule: data?.schedule,
    standings: opts.standings || [],
  });
}


const ESPN_FAN_HOSTNAME = "fan.api.espn.com";
/** ESPN game ids. 1 is football — the fan payload also carries basketball, baseball, hockey. */
const ESPN_FOOTBALL_GAME_ID = 1;

/**
 * ESPN's fan payload can carry a **negative** `groupId`, and its own web client normalizes with
 * `t.groupId = Math.abs(t.groupId)` — visible verbatim in ESPN's production bundle
 * (`cdn1.espn.net/kona/.../static/commons/main-*.js`, 2026-09-03). Without this a league id
 * arrives as "-13338821" and every downstream call fails with no useful reason.
 */
function normalizeFanGroupId(rawId) {
  if (rawId == null) return "";
  const asNumber = Number(rawId);
  if (Number.isFinite(asNumber)) return String(Math.abs(asNumber));
  const text = String(rawId).trim();
  return text.startsWith("-") ? text.slice(1) : text;
}

/**
 * Normalize ESPN's fan-preferences payload into the leagues a user actually plays in.
 *
 * Pure on purpose: the shape is undocumented, so this is the half that gets fixture tests.
 *
 * **Field shape verified against ESPN's own production bundle (2026-09-03)**, which contains
 * `e.metaData.entry.groups && e.metaData.entry.groups[0]`, `groupId`, `groupName`,
 * `metaData.entry.gameId` and `seasonId`. `entryId` and `entry.name` are *not* confirmed there
 * and are read defensively — a missing team id is legal, since the connect route accepts an
 * absent `espn_team_id`.
 *
 * **There is deliberately no `typeId` filter.** An earlier cut required `typeId === 9` for
 * "fantasy team"; that number was assumed, appears nowhere in ESPN's client, and would have
 * emptied every user's league list if wrong. The structural test — an entry with a resolvable
 * group id, for the football game — is what actually identifies a fantasy team, so that is the
 * only test applied.
 *
 * SECURITY: this touches only the response body. No credential reaches it and none is returned.
 */
function fanLeaguesFromPreferences(data, opts = {}) {
  const preferences = Array.isArray(data?.preferences) ? data.preferences : [];
  const wantedSeason = opts.season == null ? null : Number(opts.season);

  const leagues = [];
  const seen = new Set();

  for (const preference of preferences) {
    const entry = preference?.metaData?.entry;
    if (!entry) continue;

    // Football only when ESPN says which game it is. The fan payload spans every fantasy sport
    // the account plays, so without this a basketball team is offered as a football league.
    // Absent rather than mismatched is not treated as a rejection: `gameId` is confirmed present
    // in ESPN's own code, but a missing field should not silently empty the user's league list.
    const gameId = entry?.gameId;
    if (gameId != null && Number(gameId) !== ESPN_FOOTBALL_GAME_ID) continue;

    const group = Array.isArray(entry?.groups) ? entry.groups[0] : null;
    const leagueId = normalizeFanGroupId(group?.groupId ?? group?.id ?? entry?.leagueId);
    if (!leagueId) continue;

    const season = Number(entry?.seasonId ?? entry?.season);
    if (wantedSeason != null && Number.isFinite(season) && season !== wantedSeason) continue;

    if (seen.has(leagueId)) continue;
    seen.add(leagueId);

    leagues.push({
      league_id: leagueId,
      league_name: group?.groupName || group?.name || null,
      season: Number.isFinite(season) ? season : null,
      team_id: entry?.entryId == null ? null : String(entry.entryId),
      team_name: entry?.name || entry?.teamName || null,
    });
  }

  return leagues;
}

/**
 * Ask ESPN which football leagues this session belongs to.
 *
 * This is the endpoint ESPN's own site uses to render "My Teams", and it is the only way to
 * discover a user's leagues — `lm-api-reads` can only answer about a league you already name.
 * Its existence was verified against a dummy id, which answers `{"message":"fan not found"}`
 * rather than 404-ing the route.
 *
 * SECURITY: credentials travel in the request headers built by `makeEspnHeaders` and appear in
 * no log, no error, and no return value. `reportEspnFailure` already strips the query string.
 */
async function fetchEspnFanLeagues(espn_s2, swid, opts = {}) {
  const fanId = encodeURIComponent(swidWithBraces(swid));
  const path = `/apis/v2/fans/${fanId}?featureFlags=challengeEntries&showAirings=false&source=ESPN.COM&lang=en`;
  const data = await doEspnRequest(ESPN_FAN_HOSTNAME, path, espn_s2, swid, 3, null);
  return fanLeaguesFromPreferences(data, opts);
}

module.exports = {
  buildLeagueStandings,
  buildLeagueContext,
  leagueNameFromEspnData,
  buildNormalizedRoster,
  fetchEspnWaiverPool,
  fetchEspnLastResult,
  fetchEspnMatchup,
  verifyLeagueAccess,
  lastResultFromEspnSchedule,
  matchupFromEspnSchedule,
  standingsFromEspnData,
  teamFromEspnData,
  rosterFromEspnData,
  waiverPoolFromEspnData,
  fanLeaguesFromPreferences,
  fetchEspnFanLeagues,
};
