"use strict";

/**
 * ESPN platform adapter.
 *
 * Normalizes ESPN roster data into the platform-agnostic roster shape used by
 * src/services/roster.js. Per-user roster/standings data is cookie/session
 * scoped, so caching is intentionally deferred for those. League-public,
 * immutable data (a completed week's matchup result) is cached - see
 * fetchEspnLastMatchupResult.
 *
 * Uses Node's built-in https module with browser-like headers instead of the
 * espn-fantasy-football-api library, which bundles its own axios and sends
 * User-Agent: axios/VERSION — rejected by ESPN's API.
 */

const https = require("https");
const { Redis } = require("@upstash/redis");
const config = require("../config");
const { logger } = require("../middleware/logging");

// Matchup *results* for a completed week are league-public and immutable -
// safe to cache by league/week/team, unlike roster data above which is
// cookie/session scoped per the file header.
const MATCHUP_TTL_S = 21600; // 6h
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

function swidWithBraces(swid) {
  const s = String(swid || "").trim();
  if (s.startsWith("{")) return s;
  return `{${s}}`;
}

function makeEspnHeaders(espn_s2, swid) {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://fantasy.espn.com/",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": `espn_s2=${espn_s2}; SWID=${swidWithBraces(swid)}`,
  };
}

function doEspnRequest(hostname, path, espn_s2, swid, redirectsLeft) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path, method: "GET", headers: makeEspnHeaders(espn_s2, swid) },
      (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) && res.headers.location && redirectsLeft > 0) {
          res.resume();
          try {
            const loc = new URL(res.headers.location, `https://${hostname}`);
            doEspnRequest(loc.hostname, loc.pathname + loc.search, espn_s2, swid, redirectsLeft - 1)
              .then(resolve, reject);
          } catch {
            const err = new Error("ESPN API returned an invalid redirect");
            err.status = 502;
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
            return reject(err);
          }
          if (res.statusCode !== 200) {
            const err = new Error(`ESPN API returned HTTP ${res.statusCode}`);
            err.status = res.statusCode >= 500 ? 502 : res.statusCode;
            return reject(err);
          }
          try {
            resolve(JSON.parse(body));
          } catch {
            const err = new Error("ESPN API returned non-JSON response");
            err.status = 502;
            reject(err);
          }
        });
      }
    );
    req.on("error", (err) => {
      err.status = 502;
      reject(err);
    });
    req.end();
  });
}

function fetchEspnApi(leagueId, espn_s2, swid, views, scoringPeriodId) {
  const season = activeSeason();
  const viewParams = (Array.isArray(views) ? views : [views]).map((v) => `view=${v}`).join("&");
  const periodParam = scoringPeriodId != null ? `&scoringPeriodId=${scoringPeriodId}` : "";
  const path = `/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?${viewParams}${periodParam}`;
  return doEspnRequest("fantasy.espn.com", path, espn_s2, swid, 3);
}

async function buildLeagueStandings(leagueId, espn_s2, swid, opts = {}) {
  const scoringPeriodId = Number(opts.week || opts.scoringPeriodId || 1);
  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mTeam", "mSettings"], scoringPeriodId);
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

async function verifyLeagueAccess(leagueId, espn_s2, swid, espnTeamId) {
  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mTeam"]);
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

async function buildNormalizedRoster(leagueId, espn_s2, swid, week, opts = {}) {
  const scoringPeriodId = Number(week);
  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mTeam", "mRoster"], scoringPeriodId);
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

/**
 * Win/loss/tie for the user's team in a given scoring period, via ESPN's
 * mScoreboard view. Returns null when no matchup is found for that team
 * and week (bye week, team not found, or the period hasn't posted).
 * Cached by league/week/team (the result itself, not the credentials used
 * to fetch it) since a completed week's outcome never changes. Only
 * cached when opts.teamId is known - never key a cache entry off the
 * SWID cookie, which would persist an ESPN credential in plaintext.
 */
async function fetchEspnLastMatchupResult(leagueId, espn_s2, swid, week, opts = {}) {
  const scoringPeriodId = Number(week);
  const cacheKey = opts.teamId != null
    ? `ssff:espn:matchup:${leagueId}:${Number(week)}:${opts.teamId}`
    : null;
  const cached = cacheKey ? await readCache(cacheKey) : null;
  if (cached) return cached;

  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mScoreboard", "mTeam"], scoringPeriodId);
  const teams = data?.teams || [];
  const team = findUserTeam(teams, swid, opts);
  if (!team) return null;
  const myTeamId = teamId(team);

  const schedule = Array.isArray(data?.schedule) ? data.schedule : [];
  const matchup = schedule.find((m) =>
    Number(m?.matchupPeriodId) === scoringPeriodId
    && (teamId(m?.home) === myTeamId || teamId(m?.away) === myTeamId)
  );
  if (!matchup) return null;

  const isHome = teamId(matchup.home) === myTeamId;
  const myScore = Number(isHome ? matchup.home?.totalPoints : matchup.away?.totalPoints);
  const oppScore = Number(isHome ? matchup.away?.totalPoints : matchup.home?.totalPoints);
  if (!Number.isFinite(myScore) || !Number.isFinite(oppScore)) return null;

  let result;
  if (matchup.winner === "TIE") result = "T";
  else if (myScore > oppScore) result = "W";
  else if (myScore < oppScore) result = "L";
  else result = "T";

  const out = {
    result,
    matchup_id: matchup.id != null ? String(matchup.id) : `${leagueId}:${scoringPeriodId}:${myTeamId}`,
  };
  if (cacheKey) await writeCache(cacheKey, out, MATCHUP_TTL_S);
  return out;
}

module.exports = {
  buildLeagueStandings,
  buildNormalizedRoster,
  verifyLeagueAccess,
  fetchEspnLastMatchupResult,
};
