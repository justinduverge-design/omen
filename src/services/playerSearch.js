"use strict";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 10;
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const VALID_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);
const POSITION_ALIASES = new Map([
  ["DST", "DEF"],
  ["D/ST", "DEF"],
  ["D", "DEF"],
  ["PK", "K"],
]);

const sourceCaches = new WeakMap();

function toTrimmedString(value) {
  return String(value == null ? "" : value).trim();
}

function foldText(value) {
  return toTrimmedString(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizePosition(value) {
  const raw = toTrimmedString(value).toUpperCase();
  if (!raw) return null;

  const alias = POSITION_ALIASES.get(raw);
  const normalized = alias || raw;
  return VALID_POSITIONS.has(normalized) ? normalized : null;
}

function normalizeLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function normalizePlayerSearchQuery(query = {}) {
  const rawPosition = query.position == null ? "" : query.position;
  const position = rawPosition === "" ? null : normalizePosition(rawPosition);
  if (rawPosition !== "" && !position) {
    return {
      error: "position must be one of QB, RB, WR, TE, K, DEF",
      code: "player_search_invalid_position",
    };
  }

  return {
    q: toTrimmedString(query.q ?? query.query ?? query.name).slice(0, 64),
    position,
    limit: normalizeLimit(query.limit),
  };
}

function sourceEntries(source) {
  if (Array.isArray(source)) {
    return source.map((player, index) => [
      player?.player_id || player?.playerId || player?.id || String(index),
      player,
    ]);
  }

  if (source && typeof source === "object") {
    return Object.entries(source);
  }

  return [];
}

function playerName(player = {}, fallbackId = "") {
  const firstLast = `${player.first_name || ""} ${player.last_name || ""}`.trim();
  return (
    player.full_name
    || player.search_full_name
    || player.name
    || firstLast
    || fallbackId
  );
}

function playerPosition(player = {}) {
  const primary = normalizePosition(player.position);
  if (primary) return primary;

  const eligible = Array.isArray(player.fantasy_positions)
    ? player.fantasy_positions
    : [];
  for (const position of eligible) {
    const normalized = normalizePosition(position);
    if (normalized) return normalized;
  }

  return null;
}

function finiteOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sourceScopedId(playerId, player = {}) {
  const raw = toTrimmedString(player.player_key || player.id || player.player_id || playerId);
  if (!raw) return null;
  return raw.includes(":") ? raw : `sleeper:${raw}`;
}

function normalizeSourcePlayer(playerId, player = {}) {
  if (!player || typeof player !== "object") return null;
  if (player.active === false) return null;

  const id = sourceScopedId(playerId, player);
  const name = toTrimmedString(playerName(player, playerId));
  const position = playerPosition(player);
  if (!id || !name || !position) return null;

  return {
    id,
    name,
    position,
    team: toTrimmedString(player.team || player.team_abbr || "FA").toUpperCase(),
    projected_points: finiteOrNull(
      player.projected_points
      ?? player.projectedPoints
      ?? player.pts_ppr
    ),
    _search_name: foldText(name),
    _search_rank: finiteOrNull(player.search_rank) ?? Number.MAX_SAFE_INTEGER,
  };
}

function rankMatch(player, foldedQuery) {
  if (!foldedQuery) return null;

  const compactName = player._search_name.replace(/\s+/g, "");
  const compactQuery = foldedQuery.replace(/\s+/g, "");
  if (player._search_name === foldedQuery) return 0;
  if (player._search_name.startsWith(foldedQuery)) return 1;
  if (compactName === compactQuery) return 1;
  if (compactName.startsWith(compactQuery)) return 1;

  const tokens = player._search_name.split(" ").filter(Boolean);
  if (tokens.some((token) => token.startsWith(foldedQuery))) return 2;
  if (player._search_name.includes(foldedQuery)) return 3;
  if (compactName.includes(compactQuery)) return 3;

  return null;
}

function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    position: player.position,
    team: player.team,
    projected_points: player.projected_points,
  };
}

function searchPlayerSource(source, query = {}) {
  const normalized = query.error ? query : normalizePlayerSearchQuery(query);
  if (normalized.error) return normalized;

  const foldedQuery = foldText(normalized.q);
  if (!foldedQuery) return [];

  return sourceEntries(source)
    .map(([playerId, player]) => normalizeSourcePlayer(playerId, player))
    .filter(Boolean)
    .filter((player) => !normalized.position || player.position === normalized.position)
    .map((player) => ({ player, matchRank: rankMatch(player, foldedQuery) }))
    .filter((entry) => entry.matchRank != null)
    .sort((a, b) => (
      a.matchRank - b.matchRank
      || a.player._search_rank - b.player._search_rank
      || a.player.name.localeCompare(b.player.name)
      || a.player.id.localeCompare(b.player.id)
    ))
    .slice(0, normalized.limit)
    .map((entry) => publicPlayer(entry.player));
}

async function getCachedSource(fetchPlayers, cacheTtlMs = DEFAULT_CACHE_TTL_MS) {
  if (typeof fetchPlayers !== "function") {
    throw new Error("fetchPlayers function required");
  }

  const now = Date.now();
  const cached = sourceCaches.get(fetchPlayers);
  if (cached?.source && now - cached.fetchedAt < cacheTtlMs) {
    return cached.source;
  }
  if (cached?.promise) return cached.promise;

  const promise = Promise.resolve(fetchPlayers())
    .then((source) => {
      sourceCaches.set(fetchPlayers, {
        source,
        fetchedAt: Date.now(),
        promise: null,
      });
      return source;
    })
    .catch((err) => {
      if (cached?.source) return cached.source;
      sourceCaches.delete(fetchPlayers);
      throw err;
    });

  sourceCaches.set(fetchPlayers, {
    source: cached?.source || null,
    fetchedAt: cached?.fetchedAt || 0,
    promise,
  });

  return promise;
}

async function searchNflPlayers(query = {}, options = {}) {
  const normalized = query.error ? query : normalizePlayerSearchQuery(query);
  if (normalized.error) return normalized;

  const source = await getCachedSource(
    options.fetchPlayers,
    options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS
  );
  return searchPlayerSource(source, normalized);
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  VALID_POSITIONS,
  foldText,
  normalizePlayerSearchQuery,
  normalizePosition,
  searchNflPlayers,
  searchPlayerSource,
};
