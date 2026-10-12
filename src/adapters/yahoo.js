"use strict";

/**
 * Yahoo platform adapter.
 *
 * Produces the same normalized roster shape as Sleeper and ESPN while keeping
 * Yahoo OAuth/token plumbing in src/services/yahooAuth.js.
 */

const { Redis } = require("@upstash/redis");
const config = require("../config");
const YahooClient = require("../services/yahoo");
const { normalizeYahooRoster } = require("../services/roster");
const { enrichYahooPlayers } = require("../services/yahooProjections");
const { logger } = require("../middleware/logging");

const ROSTER_TTL_S = 300;

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

function cacheKeyFor(leagueKey, teamKey, effectiveWeek, opts = {}) {
  if (opts.cacheKey) return opts.cacheKey;
  const scope = opts.cacheScope || teamKey;
  return `ssff:roster:yahoo:${scope}:${leagueKey}:${effectiveWeek || "current"}`;
}

function rosterWeek(effectiveWeek) {
  const n = Number(effectiveWeek);
  return Number.isFinite(n) ? n : effectiveWeek;
}

function withYahooIds(player) {
  const playerId = player.player_id == null ? "" : String(player.player_id);

  return {
    ...player,
    player_key: `yahoo:${playerId}`,
    player_id: playerId,
    yahoo_id: playerId,
    espn_id: null,
    gsis_id: null,
    // TODO: Yahoo per-player projected stats require a separate stats sub-resource.
    projected_points: null,
  };
}

function normalizeSlots(slots) {
  return {
    starters: (slots?.starters || []).map(withYahooIds),
    bench: (slots?.bench || []).map(withYahooIds),
    ir: (slots?.ir || []).map(withYahooIds),
  };
}

function normalizeLastResult({ result, gameId, kickoff = null } = {}) {
  return {
    lastResult: result === "W" || result === "L" ? result : null,
    lastGameId: gameId ? String(gameId) : null,
    lastGameKickoff: kickoff || null,
  };
}

function objectValues(value) {
  if (!value || typeof value !== "object") return [];
  return Object.values(value).filter((entry) => entry && typeof entry === "object");
}

function yahooTeamKey(team) {
  if (team?.team_key) return team.team_key;
  const info = Array.isArray(team?.team) ? team.team[0] : team;
  if (Array.isArray(info)) {
    return info.find((entry) => entry?.team_key)?.team_key || null;
  }
  return info?.team_key || null;
}

function yahooTeamPoints(team) {
  if (Number.isFinite(Number(team?.team_points?.total))) return Number(team.team_points.total);
  if (Number.isFinite(Number(team?.points))) return Number(team.points);
  const details = Array.isArray(team?.team) ? team.team : [];
  for (const detail of details) {
    const points = detail?.team_points?.total ?? detail?.team_points?.points;
    if (Number.isFinite(Number(points))) return Number(points);
  }
  return null;
}

function teamsFromYahooMatchup(matchup) {
  if (Array.isArray(matchup?.teams)) return matchup.teams;
  const teams = matchup?.teams?.team ? matchup.teams.team : matchup?.teams;
  if (Array.isArray(teams)) return teams;
  return objectValues(teams).map((entry) => entry.team || entry).filter(Boolean);
}

function yahooMatchupsFromScoreboard(scoreboard) {
  const raw = scoreboard?.fantasy_content?.league?.[1]?.scoreboard?.[0]?.matchups
    || scoreboard?.scoreboard?.matchups
    || scoreboard?.matchups;
  return objectValues(raw).map((entry) => entry.matchup || entry).filter(Boolean);
}

function lastResultFromYahooScoreboard({ leagueKey, week, teamKey, scoreboard }) {
  for (const matchup of yahooMatchupsFromScoreboard(scoreboard)) {
    const teams = teamsFromYahooMatchup(matchup);
    const mine = teams.find((team) => yahooTeamKey(team) === teamKey);
    if (!mine) continue;

    const opponent = teams.find((team) => yahooTeamKey(team) !== teamKey);
    const gameId = matchup?.matchup_id || matchup?.week || `${leagueKey}:${week}:${teamKey}`;
    if (!opponent) return normalizeLastResult({ gameId });

    const winnerTeamKey = matchup?.winner_team_key || null;
    if (winnerTeamKey) {
      return normalizeLastResult({
        result: winnerTeamKey === teamKey ? "W" : "L",
        gameId,
      });
    }

    const myPoints = yahooTeamPoints(mine);
    const opponentPoints = yahooTeamPoints(opponent);
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

const LAST_RESULT_TTL_S = 21600; // 6h - a completed week's matchup result never changes

async function fetchYahooLastResult({ client, leagueKey, teamKey, week, season } = {}) {
  void season;
  if (!client || !leagueKey || !teamKey || !week) return normalizeLastResult();

  const cacheKey = `ssff:yahoo:lastresult:${teamKey}:${week}`;
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const scoreboard = typeof client.getLeagueScoreboard === "function"
    ? await client.getLeagueScoreboard(leagueKey, week)
    : await client.get(`/league/${leagueKey}/scoreboard;week=${week}`);
  const result = lastResultFromYahooScoreboard({ leagueKey, week, teamKey, scoreboard });
  await writeCache(cacheKey, result, LAST_RESULT_TTL_S);
  return result;
}

async function buildNormalizedRoster(leagueKey, accessToken, week, opts = {}) {
  const client = new YahooClient(accessToken);
  const teamKey = await client.getMyTeamKey(leagueKey);
  if (!teamKey) {
    throw Object.assign(new Error("No Yahoo team found in this league"), { status: 404 });
  }

  const effectiveWeek = week || await client.getCurrentWeek(leagueKey);
  const cacheKey = cacheKeyFor(leagueKey, teamKey, effectiveWeek, opts);
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const raw = await client.getRoster(teamKey, effectiveWeek);
  const teamProjected = await client.getProjectedStats(teamKey, effectiveWeek).catch(() => null);
  void teamProjected;

  const normalized = normalizeYahooRoster(raw, effectiveWeek);
  const roster = {
    week: rosterWeek(effectiveWeek),
    league_key: String(leagueKey),
    team_key: String(teamKey),
    slots: normalizeSlots(normalized.slots),
    source: "yahoo",
  };

  await writeCache(cacheKey, roster, ROSTER_TTL_S);
  return roster;
}

/**
 * Every team's roster for a week.
 *
 * `getRoster(teamKey, week)` already takes an arbitrary team key — `buildNormalizedRoster`
 * above just never called it with anyone else's. `getLeagueStandings` already lists every
 * team key in the league. This composes the two: same authenticated client, same calls,
 * called once per team instead of once for the caller's own.
 *
 * Used by Trade's opponent-roster read (`GET /api/trade/roster`). No new Yahoo surface, no
 * new auth — the standings and per-team roster reads already run in production today.
 */
// G5: league lineup slots (one settings call, cached for an hour) and G8: a per-team time budget.
const ROSTER_POSITIONS_TTL_S = 3600;
const ROSTER_POSITIONS_BUDGET_MS = 2000;
const TEAM_ROSTER_BUDGET_MS = 6000;

function timeBoxed(promise, ms, onTimeout) {
  let timer;
  const budget = new Promise((resolve) => {
    timer = setTimeout(() => resolve(onTimeout), ms);
    timer.unref?.();
  });
  return Promise.race([promise, budget]).finally(() => clearTimeout(timer));
}

/** Why a per-team read failed, as a code that carries no provider body or user data. */
function teamReadFailureReason(error) {
  const status = Number(error?.status);
  if (error?.message === "yahoo_token_expired" || status === 401) return "reauth_required";
  if (status === 429 || status === 999) return "rate_limited";
  if (status === 403) return "forbidden";
  return "provider_error";
}

/**
 * The league's starting slots from Yahoo's settings (G5), or `null`.
 *
 * Cached for an hour (a league's lineup does not change mid-season) and bounded: a slow or failing
 * settings call yields `null` and the caller keeps its existing fallback. The `roster_positions`
 * node is documented by Yahoo but has not been exercised against a live league; a payload that
 * does not match yields `null`, never a guessed lineup.
 */
async function readLeagueRosterPositions(client, leagueKey) {
  if (typeof client.getRosterPositions !== "function") return null;
  const cacheKey = `ssff:yahoo:rosterpos:${leagueKey}`;
  const cached = await readCache(cacheKey).catch(() => null);
  if (Array.isArray(cached) && cached.length) return cached;
  const positions = await timeBoxed(
    Promise.resolve().then(() => client.getRosterPositions(leagueKey)).catch(() => null),
    ROSTER_POSITIONS_BUDGET_MS,
    null
  );
  if (Array.isArray(positions) && positions.length) {
    await writeCache(cacheKey, positions, ROSTER_POSITIONS_TTL_S);
    return positions;
  }
  return null;
}

/**
 * Every team's roster for a week.
 *
 * `getRoster(teamKey, week)` already takes an arbitrary team key — `buildNormalizedRoster`
 * above just never called it with anyone else's. `getLeagueStandings` already lists every
 * team key in the league. This composes the two: same authenticated client, same calls,
 * called once per team instead of once for the caller's own.
 *
 * A team whose roster read failed or timed out is returned with `read_failed: true` and a reason
 * code (G8). Before, it came back as a team with no players, which every consumer then read as an
 * empty roster. `players` stays `[]` for such a team, so existing consumers still skip it as
 * unreadable; the flag is what lets a screen say "could not read this team".
 *
 * Used by Trade's opponent-roster read (`GET /api/trade/roster`). No new auth.
 */
async function fetchYahooLeagueRosters(leagueKey, accessToken, week) {
  const client = new YahooClient(accessToken);
  const effectiveWeek = week || await client.getCurrentWeek(leagueKey);
  const [standings, rosterPositions] = await Promise.all([
    client.getLeagueStandings(leagueKey),
    readLeagueRosterPositions(client, leagueKey),
  ]);

  const teams = await Promise.all(standings.map(async (team) => {
    if (!team?.team_id) {
      return { team_id: null, team_name: team?.team_name || null, players: [], read_failed: true, read_failed_reason: "no_team_key" };
    }
    try {
      const raw = await timeBoxed(
        client.getRoster(team.team_id, effectiveWeek),
        TEAM_ROSTER_BUDGET_MS,
        Promise.reject(Object.assign(new Error("team roster read timed out"), { code: "team_roster_timeout" }))
      );
      const normalized = normalizeYahooRoster(raw, effectiveWeek);
      const players = [
        ...(normalized.slots.starters || []),
        ...(normalized.slots.bench || []),
        ...(normalized.slots.ir || []),
      ].map(withYahooIds);
      return { team_id: team.team_id, team_name: team.team_name || null, players };
    } catch (error) {
      const reason = error?.code === "team_roster_timeout" ? "timed_out" : teamReadFailureReason(error);
      return {
        team_id: team.team_id,
        team_name: team.team_name || null,
        players: [],
        read_failed: true,
        read_failed_reason: reason,
      };
    }
  }));

  const failed = teams.filter((team) => team.read_failed);
  if (failed.length) {
    // Counts and reason codes only: no team names, no player names, no provider bodies.
    logger.warn("Yahoo league roster read was partial", {
      teams_total: teams.length,
      teams_failed: failed.length,
      reasons: [...new Set(failed.map((team) => team.read_failed_reason))].join(","),
    });
  }

  // Yahoo carries no projection; fill every team's players from Sleeper's public stat lines scored
  // with this league's rules (yahooProjections.js). Best effort and bounded.
  const projectionMeta = await enrichYahooPlayers(
    teams.flatMap((team) => team.players),
    { client, leagueKey, week: effectiveWeek }
  );

  return {
    week: rosterWeek(effectiveWeek),
    league_status: null,
    roster_positions: rosterPositions || [],
    roster_positions_source: rosterPositions ? "provider_settings" : null,
    teams,
    projection_meta: projectionMeta,
  };
}

module.exports = {
  buildNormalizedRoster,
  fetchYahooLastResult,
  fetchYahooLeagueRosters,
  lastResultFromYahooScoreboard,
};
