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

module.exports = {
  buildNormalizedRoster,
  fetchYahooLastResult,
  lastResultFromYahooScoreboard,
};
