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

const MATCH_TYPE_FUZZY = "fuzzy";
const MAX_FUZZY_SUGGESTIONS = 3;

const sourceCaches = new WeakMap();

/**
 * Normalized, folded, match-ready players — built **once per source object** and
 * reused for every subsequent query against it.
 *
 * Before this, every request re-derived the whole index: `Object.entries()` over
 * ~11.4k Sleeper players, then `normalizeSourcePlayer()` on each, each of which
 * runs `foldText()` — an NFKD Unicode normalization plus two regex passes. That
 * is ~11.4k Unicode normalizations and ~34k allocations **per keystroke**,
 * measured at 3.9ms of pure single-threaded CPU per search.
 *
 * Node serves this on one thread, so that cost was the real reason the route
 * carried a 30/min budget. Hoisting it here is what makes a generous limit
 * honest rather than optimistic — see `Blueprints/api-routes.md`.
 *
 * Keyed by the source object itself, so it lives exactly as long as the cached
 * player blob does and is rebuilt for free when that blob is refreshed.
 */
const indexCaches = new WeakMap();

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

/**
 * Unchanged ranking, reading precomputed `_compact_name` / `_tokens` instead of
 * recomputing them per player per query. Same inputs, same ranks, same order.
 */
function rankMatch(player, foldedQuery, compactQuery) {
  if (!foldedQuery) return null;

  const compactName = player._compact_name;
  if (player._search_name === foldedQuery) return 0;
  if (player._search_name.startsWith(foldedQuery)) return 1;
  if (compactName === compactQuery) return 1;
  if (compactName.startsWith(compactQuery)) return 1;

  const tokens = player._tokens;
  for (const token of tokens) {
    if (token.startsWith(foldedQuery)) return 2;
  }
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

function publicMatchedPlayer(player, matchType) {
  return {
    ...publicPlayer(player),
    match_type: matchType,
  };
}

/**
 * Damerau-Levenshtein distance for short, folded player-name tokens.
 *
 * Transposition matters here: mobile typos are commonly two adjacent letters
 * swapped. The matrix is bounded by the 64-character query cap, so keeping the
 * implementation local is cheaper and safer than adding a dependency.
 */
function editDistance(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  const rows = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) rows[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost
      );
      if (
        i > 1 && j > 1
        && a[i - 1] === b[j - 2]
        && a[i - 2] === b[j - 1]
      ) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

function fuzzyNameScore(player, foldedQuery) {
  const queryTokens = foldedQuery.split(" ").filter(Boolean);
  const playerTokens = player._tokens;
  if (!queryTokens.length || queryTokens.length !== playerTokens.length) return null;

  // Cheap candidate rejection before allocating an edit-distance matrix. On
  // the ~11.4k-player source this removes virtually every unrelated name and
  // keeps the fuzzy fallback inside the generous search budget.
  const lastNameAnchored = queryTokens.at(-1) === playerTokens.at(-1);
  for (let i = 0; i < queryTokens.length; i += 1) {
    if (queryTokens[i][0] !== playerTokens[i][0]) return null;
    const isLast = i === queryTokens.length - 1;
    if (!(lastNameAnchored && !isLast) && Math.abs(queryTokens[i].length - playerTokens[i].length) > 2) {
      return null;
    }
  }

  let total = 0;
  for (let i = 0; i < queryTokens.length; i += 1) {
    const queryToken = queryTokens[i];
    const playerToken = playerTokens[i];
    const distance = editDistance(queryToken, playerToken);
    const maxLength = Math.max(queryToken.length, playerToken.length, 1);
    const ratio = distance / maxLength;

    // A last name must be very close. First names may be colloquial
    // shortenings ("Ted" -> "Tetairoa"), but only when the last name is an
    // exact anchor and the initial agrees. This produces a suggestion, never
    // an automatic identity resolution.
    const isLast = i === queryTokens.length - 1;
    const shortFirstName = !isLast
      && lastNameAnchored
      && queryToken.length >= 2
      && queryToken[0] === playerToken[0];
    const allowed = isLast
      ? (distance <= 2 && ratio <= 0.34)
      : ((distance <= 2 && ratio <= 0.4) || shortFirstName);
    if (!allowed) return null;
    total += ratio;
  }
  return total / queryTokens.length;
}

function fuzzyMatches(index, foldedQuery, { position = null, limit = MAX_FUZZY_SUGGESTIONS } = {}) {
  const matches = [];
  for (const player of index) {
    if (position && player.position !== position) continue;
    const score = fuzzyNameScore(player, foldedQuery);
    if (score == null) continue;
    matches.push({ player, score });
  }
  return matches
    .sort((a, b) => (
      a.score - b.score
      || a.player._search_rank - b.player._search_rank
      || a.player.name.localeCompare(b.player.name)
      || a.player.id.localeCompare(b.player.id)
    ))
    .slice(0, limit)
    .map(({ player }) => publicMatchedPlayer(player, MATCH_TYPE_FUZZY));
}

/** The per-source work, done once. See `indexCaches`. */
function buildSearchIndex(source) {
  const out = [];
  for (const [playerId, player] of sourceEntries(source)) {
    const normalized = normalizeSourcePlayer(playerId, player);
    if (!normalized) continue;
    normalized._compact_name = normalized._search_name.replace(/\s+/g, "");
    normalized._tokens = normalized._search_name.split(" ").filter(Boolean);
    out.push(normalized);
  }
  return out;
}

function searchIndexFor(source) {
  // Primitives and null cannot key a WeakMap, and `sourceEntries` already
  // returns [] for them — build directly rather than failing.
  if (!source || (typeof source !== "object")) return buildSearchIndex(source);

  const cached = indexCaches.get(source);
  if (cached) return cached;

  const built = buildSearchIndex(source);
  indexCaches.set(source, built);
  return built;
}

function searchPlayerSource(source, query = {}) {
  const normalized = query.error ? query : normalizePlayerSearchQuery(query);
  if (normalized.error) return normalized;

  const foldedQuery = foldText(normalized.q);
  if (!foldedQuery) return [];

  const compactQuery = foldedQuery.replace(/\s+/g, "");
  const matches = [];
  for (const player of searchIndexFor(source)) {
    if (normalized.position && player.position !== normalized.position) continue;
    const matchRank = rankMatch(player, foldedQuery, compactQuery);
    if (matchRank == null) continue;
    matches.push({ player, matchRank });
  }

  const exact = matches
    .sort((a, b) => (
      a.matchRank - b.matchRank
      || a.player._search_rank - b.player._search_rank
      || a.player.name.localeCompare(b.player.name)
      || a.player.id.localeCompare(b.player.id)
    ))
    .slice(0, normalized.limit)
    .map((entry) => publicPlayer(entry.player));

  if (exact.length) return exact;
  return fuzzyMatches(searchIndexFor(source), foldedQuery, {
    position: normalized.position,
    limit: Math.min(normalized.limit, MAX_FUZZY_SUGGESTIONS),
  });
}

/**
 * Resolve trade inputs against the same canonical index search uses.
 *
 * Identity is deliberately strict: provider-scoped id, or an exact folded
 * name narrowed by optional position/team. Fuzzy matches are returned only as
 * suggestions. They are never silently promoted to identity and therefore
 * can never reach scoring or an LLM paragraph under the wrong name.
 */
function resolvePlayerInputs(source, players = []) {
  const index = searchIndexFor(source);
  const byId = new Map(index.map((player) => [player.id, player]));

  return players.map((input) => {
    const playerKey = toTrimmedString(input?.player_key || input?.id);
    if (playerKey) {
      const found = byId.get(playerKey);
      if (found) return { status: "resolved", player: publicPlayer(found) };
      return { status: "unresolved", input, suggestions: [] };
    }

    const foldedName = foldText(input?.name);
    const requestedPosition = normalizePosition(input?.position);
    const requestedTeam = toTrimmedString(input?.team).toUpperCase();
    let exact = index.filter((player) => player._search_name === foldedName);
    if (requestedPosition) exact = exact.filter((player) => player.position === requestedPosition);
    if (requestedTeam && requestedTeam !== "FA") {
      exact = exact.filter((player) => player.team === requestedTeam);
    }

    if (exact.length === 1) {
      return { status: "resolved", player: publicPlayer(exact[0]) };
    }

    const suggestions = fuzzyMatches(index, foldedName, {
      position: requestedPosition,
      limit: MAX_FUZZY_SUGGESTIONS,
    });
    return {
      status: exact.length > 1 ? "ambiguous" : "unresolved",
      input,
      suggestions: exact.length > 1
        ? exact.slice(0, MAX_FUZZY_SUGGESTIONS).map((player) => publicPlayer(player))
        : suggestions,
    };
  });
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

async function resolveNflPlayerInputs(players = [], options = {}) {
  const source = await getCachedSource(
    options.fetchPlayers,
    options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS
  );
  return resolvePlayerInputs(source, players);
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  VALID_POSITIONS,
  foldText,
  normalizePlayerSearchQuery,
  normalizePosition,
  resolveNflPlayerInputs,
  resolvePlayerInputs,
  searchNflPlayers,
  searchPlayerSource,
};
