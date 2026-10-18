"use strict";

/**
 * =================================================================
 * Roster normalization service
 * -----------------------------------------------------------------
 * Yahoo's roster JSON is array-positional and deeply nested. This
 * service flattens it into a clean shape the optimizer can reason
 * about without caring about which platform the data came from:
 *
 *   { week, slots: { starters: [...], bench: [...], ir: [...] } }
 *
 * Each player:
 *   {
 *     player_key, player_id, name, position, eligible_positions,
 *     selected_position, team, opponent, status, projected_points,
 *     actual_points, image_url, is_starter
 *   }
 *
 * Defensive parsing throughout - any partial Yahoo response yields
 * a usable (possibly thinner) roster instead of throwing.
 * =================================================================
 */

const { Redis }  = require("@upstash/redis");
const config     = require("../config");
const { logger } = require("../middleware/logging");
const YahooClient = require("./yahoo");
const {
  enrichYahooPlayers,
  isDisabled: isProjectionKillSwitchOn,
  isTransientMeta,
  stripYahooProjections,
} = require("./yahooProjections");

const redis = config.redisUrl
  ? new Redis({ url: config.redisUrl, token: config.redisToken })
  : null;

const ROSTER_TTL_S = 300; // 5 minutes - rosters change as users start/sit
const PROJECTION_RETRY_TTL_S = 20; // a roster whose projection build timed out is re-tried soon

/**
 * Bench positions in Yahoo: "BN" (bench), "IR" (injured reserve),
 * "IL" (injured list, older alias). Anything else is a starter slot.
 */
const BENCH_SLOTS = new Set(["BN"]);
const IR_SLOTS    = new Set(["IR", "IL", "IR+", "NA"]);

/**
 * Yahoo team[0] is an array of 1-key objects. Find a key.
 */
function pickField(arr, key) {
  if (!Array.isArray(arr)) return undefined;
  for (const entry of arr) {
    if (entry && typeof entry === "object" && key in entry) return entry[key];
  }
  return undefined;
}

function normalizePlayer(playerNode) {
  // playerNode is shaped like [ [ {player_key:...}, {name:{full:...}}, ... ], { selected_position: [...] } ]
  if (!Array.isArray(playerNode) || !playerNode[0]) return null;
  const meta = playerNode[0];

  const player_key       = pickField(meta, "player_key");
  const player_id        = pickField(meta, "player_id");
  const nameObj          = pickField(meta, "name") || {};
  const editorialTeamAbbr= pickField(meta, "editorial_team_abbr");
  const status           = pickField(meta, "status") || pickField(meta, "status_full") || null;
  const image_url        = pickField(meta, "image_url");
  // Yahoo marks a player whose game has started (or whose lineup is otherwise frozen) is_editable 0.
  const editable         = pickField(meta, "is_editable") ?? playerNode[1]?.is_editable;
  const eligibleArr      = pickField(meta, "eligible_positions") || [];
  const eligible_positions = eligibleArr
    .map(p => p?.position)
    .filter(Boolean);

  // selected_position is in playerNode[1]
  const selSlot = playerNode[1]?.selected_position;
  const selected_position = Array.isArray(selSlot)
    ? pickField(selSlot, "position")
    : selSlot?.position;

  // Primary position: first non-bench eligible slot, fallback to selected
  const primary_position = eligible_positions.find(p => !BENCH_SLOTS.has(p) && !IR_SLOTS.has(p))
                         || selected_position
                         || "UNK";

  return {
    player_key,
    player_id,
    name:               nameObj.full || `${nameObj.first || ""} ${nameObj.last || ""}`.trim() || "Unknown",
    position:           primary_position,
    eligible_positions,
    selected_position,
    team:               editorialTeamAbbr || null,
    opponent:           null,           // filled by matchup agent later
    status,
    projected_points:   null,           // filled by stats fetch later
    actual_points:      null,
    image_url,
    is_starter:         !BENCH_SLOTS.has(selected_position) && !IR_SLOTS.has(selected_position),
    ...(editable == null ? {} : { is_editable: String(editable) !== "0" }),
  };
}

/**
 * Convert Yahoo's deeply nested roster response into the clean shape.
 * Defensive — missing nodes degrade rather than throw.
 */
function normalizeYahooRoster(yahooResponse, week) {
  const teamNode = yahooResponse?.fantasy_content?.team;
  // teamNode[1].roster.0.players  -> {0: {...}, 1: {...}, count: N}
  const players  = teamNode?.[1]?.roster?.["0"]?.players || teamNode?.[1]?.roster?.players;
  if (!players) {
    logger.warn("Yahoo roster: no players node", { week });
    return { week, slots: { starters: [], bench: [], ir: [] } };
  }

  const out = { starters: [], bench: [], ir: [] };
  for (const k of Object.keys(players)) {
    if (k === "count") continue;
    const node = players[k]?.player;
    const norm = normalizePlayer(node);
    if (!norm) continue;
    if (IR_SLOTS.has(norm.selected_position))      out.ir.push(norm);
    else if (BENCH_SLOTS.has(norm.selected_position)) out.bench.push(norm);
    else out.starters.push(norm);
  }

  return { week, slots: out };
}

/**
 * High-level: given a userId + leagueKey, return normalized roster.
 * Caches in Redis for ROSTER_TTL_S seconds, keyed by user+league+week.
 *
 * Token plumbing (decrypt, refresh-if-expired) is the caller's job
 * - this service just takes an authenticated YahooClient instance.
 */
async function fetchAndNormalizeRoster(yahoo, leagueKey, week, cacheKey) {
  if (cacheKey && redis) {
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      if (isProjectionKillSwitchOn() && parsed?.slots) {
        // The kill switch must work now, not when this entry expires.
        stripYahooProjections([...(parsed.slots.starters || []), ...(parsed.slots.bench || []), ...(parsed.slots.ir || [])]);
        parsed.projection_meta = { available: false, source: "sleeper_public_projections", scoring_basis: null, players_total: 0, players_with_projection: 0, reason: "disabled" };
      }
      return { ...parsed, source: "cache" };
    }
  }

  const teamKey = await yahoo.getMyTeamKey(leagueKey);
  if (!teamKey) {
    throw Object.assign(new Error("No Yahoo team found in this league"), { status: 404 });
  }

  const effectiveWeek = week || (await yahoo.getCurrentWeek(leagueKey));
  const raw           = await yahoo.getRoster(teamKey, effectiveWeek);
  const normalized    = normalizeYahooRoster(raw, effectiveWeek);
  normalized.team_key  = teamKey;
  normalized.league_key = leagueKey;
  // Yahoo carries no projection of its own; fill it from Sleeper's public stat lines scored with this
  // league's rules (yahooProjections.js). Best effort and bounded: it never fails the roster read.
  normalized.projection_meta = await enrichYahooPlayers(
    [...normalized.slots.starters, ...normalized.slots.bench, ...normalized.slots.ir],
    { client: yahoo, leagueKey, week: effectiveWeek }
  );

  if (cacheKey && redis) {
    // A pass that timed out or hit a provider error says nothing lasting about this league, so it is
    // kept only briefly instead of pinning the user on "cannot rank" for the whole roster TTL.
    const ttl = isTransientMeta(normalized.projection_meta) ? PROJECTION_RETRY_TTL_S : ROSTER_TTL_S;
    await redis.set(cacheKey, JSON.stringify(normalized), { ex: ttl }).catch(() => {});
  }
  return { ...normalized, source: "yahoo" };
}

/**
 * Convert Yahoo's available-players response into the flat shape
 * the optimizer's findWaiverMoves expects. Same normalizer logic
 * as a roster player, just without the starter/bench slot info.
 */
function normalizeYahooWaivers(yahooResponse) {
  const players = yahooResponse?.fantasy_content?.league?.[1]?.players;
  if (!players) return [];

  const out = [];
  for (const k of Object.keys(players)) {
    if (k === "count") continue;
    const node = players[k]?.player;
    // node is an array - meta is at [0]
    const meta = Array.isArray(node) ? node[0] : null;
    if (!meta) continue;

    const name              = pickField(meta, "name") || {};
    const eligibleArr       = pickField(meta, "eligible_positions") || [];
    const eligible_positions = eligibleArr.map(p => p?.position).filter(Boolean);
    const primary_position  = eligible_positions.find(p => !BENCH_SLOTS.has(p) && !IR_SLOTS.has(p))
                            || eligible_positions[0]
                            || "UNK";

    out.push({
      player_key:        pickField(meta, "player_key"),
      player_id:         pickField(meta, "player_id"),
      name:              name.full || `${name.first || ""} ${name.last || ""}`.trim() || "Unknown",
      position:          primary_position,
      eligible_positions,
      team:              pickField(meta, "editorial_team_abbr") || null,
      status:            pickField(meta, "status") || null,
      // Yahoo doesn't include projections in the basic players;status=A response.
      // Filled by stats sub-resource later (see TODO).
      projected_points:  null,
    });
  }
  return out;
}

/**
 * `percent_owned` off a Yahoo player node (G6). Yahoo nests it as an element of the player array,
 * `{ percent_owned: [ {coverage_type, coverage_value}, { value: "34" } ] }`. Returns a number 0-100
 * or null; an absent or non-numeric value is "not read", never 0.
 */
function yahooPercentOwned(node) {
  const elements = Array.isArray(node) ? node : [];
  for (const element of elements) {
    if (!element || typeof element !== "object" || !("percent_owned" in element)) continue;
    const raw = element.percent_owned;
    const parts = Array.isArray(raw) ? raw : [raw];
    for (const part of parts) {
      const value = part && typeof part === "object" ? part.value : part;
      if (value === null || value === undefined || value === "") continue;
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
    }
  }
  return null;
}

/**
 * Flatten `getAvailablePlayerPool()` into the pool shape `normalizeYahooWaivers` returns, with each
 * player tagged `availability` ("free_agent" | "waivers") and `percent_owned` (number | null). A
 * player seen in both statuses keeps the more restrictive one (waivers).
 */
function normalizeYahooPool(pool) {
  const byKey = new Map();
  for (const page of Array.isArray(pool?.pages) ? pool.pages : []) {
    const nodes = page?.raw?.fantasy_content?.league?.[1]?.players;
    const normalized = normalizeYahooWaivers(page?.raw);
    const percentByKey = new Map();
    if (nodes && typeof nodes === "object") {
      for (const k of Object.keys(nodes)) {
        if (k === "count") continue;
        const node = nodes[k]?.player;
        const meta = Array.isArray(node) ? node[0] : null;
        const key = meta ? pickField(meta, "player_key") : null;
        if (key) percentByKey.set(key, yahooPercentOwned(node));
      }
    }
    for (const player of normalized) {
      const entry = {
        ...player,
        availability: page.availability,
        percent_owned: percentByKey.has(player.player_key) ? percentByKey.get(player.player_key) : null,
      };
      const existing = byKey.get(player.player_key);
      if (!existing || (existing.availability === "free_agent" && entry.availability === "waivers")) {
        byKey.set(player.player_key, entry);
      }
    }
  }
  return [...byKey.values()];
}

module.exports = {
  normalizeYahooRoster,
  normalizeYahooWaivers,
  normalizeYahooPool,
  yahooPercentOwned,
  fetchAndNormalizeRoster,
  BENCH_SLOTS,
  IR_SLOTS,
};
