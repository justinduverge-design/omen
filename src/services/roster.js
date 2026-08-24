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

const redis = config.redisUrl
  ? new Redis({ url: config.redisUrl, token: config.redisToken })
  : null;

const ROSTER_TTL_S = 300; // 5 minutes - rosters change as users start/sit

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
      if (!parsed.scoring_format && typeof yahoo.getLeagueScoringFormat === "function") {
        parsed.scoring_format = await yahoo.getLeagueScoringFormat(leagueKey);
      }
      return { ...parsed, source: "cache" };
    }
  }

  const [scoringFormat, teamKey] = await Promise.all([
    typeof yahoo.getLeagueScoringFormat === "function"
      ? yahoo.getLeagueScoringFormat(leagueKey)
      : Promise.resolve(null),
    yahoo.getMyTeamKey(leagueKey),
  ]);
  if (!teamKey) {
    throw Object.assign(new Error("No Yahoo team found in this league"), { status: 404 });
  }

  const effectiveWeek = week || (await yahoo.getCurrentWeek(leagueKey));
  const raw           = await yahoo.getRoster(teamKey, effectiveWeek);
  const normalized    = normalizeYahooRoster(raw, effectiveWeek);
  normalized.team_key  = teamKey;
  normalized.league_key = leagueKey;
  normalized.scoring_format = scoringFormat;

  if (cacheKey && redis) {
    await redis.set(cacheKey, JSON.stringify(normalized), { ex: ROSTER_TTL_S }).catch(() => {});
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

module.exports = {
  normalizeYahooRoster,
  normalizeYahooWaivers,
  fetchAndNormalizeRoster,
  BENCH_SLOTS,
  IR_SLOTS,
};
