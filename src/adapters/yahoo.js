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
};
