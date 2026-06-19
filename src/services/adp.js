"use strict";

const FFC_ATTRIBUTION = "Fantasy Football Calculator";
const FFC_ATTRIBUTION_URL = "https://fantasyfootballcalculator.com";
const YAHOO_ATTRIBUTION = "Yahoo ADP";
const MFL_ATTRIBUTION = "MyFantasyLeague";

const FFC_TTL_SECONDS = 23 * 60 * 60;
const YAHOO_TTL_SECONDS = 6 * 60 * 60;
const MFL_TTL_SECONDS = 24 * 60 * 60;
const YAHOO_GAME_KEY_TTL_SECONDS = 180 * 24 * 60 * 60;
const YAHOO_PLAYER_PAGE_SIZE = 25;
const YAHOO_PHASE_ONE_LIMIT = 200;

const VALID_FORMATS = new Set(["ppr", "half-ppr", "standard"]);
const ADP_SOURCE_KEYS = ["ffc", "yahoo", "mfl"];
const DEFAULT_ADP_SOURCE_WEIGHTS = Object.freeze({
  ffc: 1,
  yahoo: 1,
  mfl: 1,
});
const ADP_SOURCE_WEIGHT_CONFIG_PATH = "default_scoring_rules.adp_source_weights";

function nowIso() {
  return new Date().toISOString();
}

function normalizeFormat(value) {
  const raw = String(value || "half-ppr").trim().toLowerCase();
  const normalized = raw === "half_ppr" ? "half-ppr" : raw;
  return VALID_FORMATS.has(normalized) ? normalized : null;
}

function parseTeams(value) {
  if (value == null || value === "") return 12;
  const teams = parseInt(value, 10);
  return Number.isInteger(teams) && teams > 0 && teams <= 20 ? teams : null;
}

function normalizeAdpQuery(query = {}) {
  return {
    format: normalizeFormat(query.format),
    teams: parseTeams(query.teams),
  };
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function toFiniteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value, places = 4) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalizePlayerIdentity(name, position) {
  const normalizedName = String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  const normalizedPosition = String(position || "UNKNOWN").trim().toUpperCase();
  return normalizedName ? `${normalizedName}:${normalizedPosition}` : null;
}

function resolveAdpSourceWeights(scoringConfig = {}) {
  const configured = scoringConfig?.default_scoring_rules?.adp_source_weights;
  const rawWeights = { ...DEFAULT_ADP_SOURCE_WEIGHTS };

  if (configured && typeof configured === "object" && !Array.isArray(configured)) {
    for (const source of ADP_SOURCE_KEYS) {
      const weight = toFiniteNumber(configured[source]);
      if (weight != null && weight >= 0) rawWeights[source] = weight;
    }
  }

  let total = ADP_SOURCE_KEYS.reduce((sum, source) => sum + rawWeights[source], 0);
  const usedDefaults = total <= 0;
  if (usedDefaults) {
    Object.assign(rawWeights, DEFAULT_ADP_SOURCE_WEIGHTS);
    total = ADP_SOURCE_KEYS.length;
  }

  return {
    config_path: ADP_SOURCE_WEIGHT_CONFIG_PATH,
    defaults_applied: !configured || usedDefaults,
    weights: Object.fromEntries(
      ADP_SOURCE_KEYS.map((source) => [source, round(rawWeights[source] / total)])
    ),
  };
}

function normalizeWeightedPlayer(player) {
  const name = String(player?.name || player?.player_name || "").trim();
  const position = String(player?.position || "UNKNOWN").trim().toUpperCase();
  const adp = toFiniteNumber(player?.adp ?? player?.overall_adp ?? player?.average_pick);
  const identity = normalizePlayerIdentity(name, position);
  if (!identity || adp == null || adp <= 0) return null;

  return {
    identity,
    name,
    position,
    team: String(player?.team || player?.team_abbr || "").trim().toUpperCase() || null,
    adp,
  };
}

function buildWeightedAdpBoard(sources = {}, scoringConfig = {}) {
  const weighting = resolveAdpSourceWeights(scoringConfig);
  const playersByIdentity = new Map();

  for (const source of ADP_SOURCE_KEYS) {
    const sourcePlayers = Array.isArray(sources?.[source]?.players)
      ? sources[source].players
      : [];
    const seenForSource = new Set();

    for (const rawPlayer of sourcePlayers) {
      const player = normalizeWeightedPlayer(rawPlayer);
      if (!player || seenForSource.has(player.identity)) continue;
      seenForSource.add(player.identity);

      const aggregate = playersByIdentity.get(player.identity) || {
        name: player.name,
        position: player.position,
        team: player.team,
        source_adp: {},
      };
      aggregate.team ||= player.team;
      aggregate.source_adp[source] = player.adp;
      playersByIdentity.set(player.identity, aggregate);
    }
  }

  const weightedPlayers = [];
  for (const player of playersByIdentity.values()) {
    const availableSources = ADP_SOURCE_KEYS.filter(
      (source) => player.source_adp[source] != null && weighting.weights[source] > 0
    );
    const availableWeight = availableSources.reduce(
      (sum, source) => sum + weighting.weights[source],
      0
    );
    if (!availableSources.length || availableWeight <= 0) continue;

    const contributions = {};
    let score = 0;
    for (const source of availableSources) {
      const effectiveWeight = weighting.weights[source] / availableWeight;
      const contribution = player.source_adp[source] * effectiveWeight;
      score += contribution;
      contributions[source] = {
        adp: player.source_adp[source],
        weight: round(effectiveWeight),
        contribution: round(contribution),
      };
    }

    weightedPlayers.push({
      name: player.name,
      position: player.position,
      team: player.team,
      score: round(score, 2),
      score_basis: "weighted_average_adp",
      lower_is_better: true,
      source_count: availableSources.length,
      sources: contributions,
    });
  }

  weightedPlayers.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
  return {
    weighting,
    players: weightedPlayers.map((player, index) => ({
      rank: index + 1,
      ...player,
    })),
  };
}

function findFirstValue(node, key) {
  if (!node || typeof node !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(node, key)) return node[key];
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findFirstValue(item, key);
      if (found != null) return found;
    }
    return null;
  }
  for (const value of Object.values(node)) {
    const found = findFirstValue(value, key);
    if (found != null) return found;
  }
  return null;
}

function collectValues(node, key, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Object.prototype.hasOwnProperty.call(node, key)) out.push(node[key]);
  const values = Array.isArray(node) ? node : Object.values(node);
  for (const value of values) collectValues(value, key, out);
  return out;
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function chunk(values, size) {
  const chunks = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

async function readJsonResponse(res, sourceName) {
  if ("ok" in res && !res.ok) {
    throw new Error(`${sourceName} ADP fetch failed: ${res.status}`);
  }
  return res.json();
}

async function fetchFFC(format, teams, year, fetchImpl = fetch) {
  const url = `https://fantasyfootballcalculator.com/api/v1/adp/${format}?teams=${teams}&year=${year}`;
  const res = await fetchImpl(url);
  const data = await readJsonResponse(res, "FFC");
  return (data.players || []).map((p) => ({
    name: p.name,
    position: p.position,
    team: p.team,
    adp: p.adp,
    player_id: `ffc_${p.player_id}`,
  }));
}

function parseYahooName(player) {
  const name = player?.name;
  if (typeof name === "string") return name;
  return name?.full || name?.display_name || name?.first_last || null;
}

function parseYahooPlayer(player) {
  const key = player?.player_key || findFirstValue(player, "player_key");
  const draft = player?.draft_analysis || findFirstValue(player, "draft_analysis") || {};
  const adp = toFiniteNumber(
    draft.average_pick
      ?? draft.avg_pick
      ?? draft.average_draft_position
      ?? draft.adp
  );

  if (!key || adp == null) return null;

  return {
    name: parseYahooName(player) || "Unknown Yahoo Player",
    position: player?.display_position || findFirstValue(player, "display_position") || null,
    team: player?.editorial_team_abbr || findFirstValue(player, "editorial_team_abbr") || null,
    adp,
    player_id: `yahoo_${key}`,
  };
}

function shouldMergeYahooFragments(node) {
  if (!Array.isArray(node) || !node.length) return false;
  const objects = node.filter((item) => item && typeof item === "object" && !Array.isArray(item));
  if (objects.length !== node.length) return false;
  const hasPlayerFields = objects.some((item) =>
    item.player_key || item.draft_analysis || item.name || item.display_position
  );
  const hasFullPlayerObjects = objects.some((item) =>
    item.player_key && (item.draft_analysis || item.name || item.display_position)
  );
  return hasPlayerFields && !hasFullPlayerObjects;
}

function collectYahooPlayers(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (node.player_key || node.draft_analysis || node.name || node.display_position) {
    const parsed = parseYahooPlayer(node);
    if (parsed) out.push(parsed);
  }

  if (shouldMergeYahooFragments(node)) {
    const merged = {};
    for (const item of node) {
      if (item && typeof item === "object" && !Array.isArray(item)) Object.assign(merged, item);
    }
    const parsed = parseYahooPlayer(merged);
    if (parsed) out.push(parsed);
  }

  const values = Array.isArray(node) ? node : Object.values(node);
  for (const value of values) collectYahooPlayers(value, out);
  return out;
}

function extractYahooGameKey(data) {
  const gameKey = findFirstValue(data, "game_key");
  if (!gameKey) throw new Error("Yahoo game_key not found");
  return String(gameKey);
}

function extractYahooPlayerKeys(data) {
  return unique(collectValues(data, "player_key"));
}

async function fetchYahooGameKey(yahooClient, year, cache = null) {
  const cacheKey = `adp:yahoo:game_key:${year}`;
  if (cache) {
    const cached = await readCache(cache, cacheKey);
    if (cached) return String(cached);
  }

  const data = yahooClient.getGameKeyForSeason
    ? await yahooClient.getGameKeyForSeason(year)
    : await yahooClient.get(`/games;game_codes=nfl;seasons=${year}`);
  const gameKey = extractYahooGameKey(data);

  if (cache) {
    await writeCache(cache, cacheKey, gameKey, YAHOO_GAME_KEY_TTL_SECONDS);
  }
  return gameKey;
}

async function fetchYahooPlayerKeys(yahooClient, limit = YAHOO_PHASE_ONE_LIMIT) {
  const keys = [];
  for (let start = 0; start < limit; start += YAHOO_PLAYER_PAGE_SIZE) {
    const data = yahooClient.getNFLPlayerPage
      ? await yahooClient.getNFLPlayerPage({ count: YAHOO_PLAYER_PAGE_SIZE, start })
      : await yahooClient.get(`/games;game_codes=nfl/players?count=${YAHOO_PLAYER_PAGE_SIZE}&start=${start}`);
    const pageKeys = extractYahooPlayerKeys(data);
    if (!pageKeys.length) break;
    keys.push(...pageKeys);
  }
  return unique(keys).slice(0, limit);
}

async function fetchYahooDraftAnalysisBatch(yahooClient, playerKeys) {
  if (playerKeys.length > YAHOO_PLAYER_PAGE_SIZE) {
    throw new Error("Yahoo draft_analysis batch cannot exceed 25 player_keys");
  }

  const data = yahooClient.getDraftAnalysis
    ? await yahooClient.getDraftAnalysis(playerKeys)
    : await yahooClient.get(`/players;player_keys=${playerKeys.join(",")}/draft_analysis`);
  return collectYahooPlayers(data);
}

async function fetchYahoo(yahooClient, year, options = {}) {
  if (!yahooClient) return [];

  await fetchYahooGameKey(yahooClient, year, options.cache || null);
  const limit = options.limit || YAHOO_PHASE_ONE_LIMIT;
  const playerKeys = await fetchYahooPlayerKeys(yahooClient, limit);
  const batches = chunk(playerKeys, YAHOO_PLAYER_PAGE_SIZE);
  const players = [];

  for (const batch of batches) {
    players.push(...await fetchYahooDraftAnalysisBatch(yahooClient, batch));
  }

  const byId = new Map();
  for (const player of players) {
    if (!byId.has(player.player_id)) byId.set(player.player_id, player);
  }
  return [...byId.values()];
}

function extractMflRows(data, key) {
  return toArray(data?.[key]?.player || data?.player || data?.players?.player);
}

function mflPlayerId(row) {
  return String(row?.id || row?.player_id || row?.playerId || "");
}

function mflAdp(row) {
  return toFiniteNumber(
    row?.averagePick
      ?? row?.avgPick
      ?? row?.average_pick
      ?? row?.adp
      ?? row?.rank
  );
}

async function fetchMFL(teams, year, fetchImpl = fetch) {
  const fcount = parseInt(teams, 10);
  const adpUrl = `https://api.myfantasyleague.com/${year}/export?TYPE=adp&FCOUNT=${fcount}&PERIOD=ADP&JSON=1`;
  const playersUrl = `https://api.myfantasyleague.com/${year}/export?TYPE=players&DETAILS=1&JSON=1`;

  const [adpRes, playersRes] = await Promise.all([
    fetchImpl(adpUrl),
    fetchImpl(playersUrl),
  ]);
  const [adpData, playersData] = await Promise.all([
    readJsonResponse(adpRes, "MFL ADP"),
    readJsonResponse(playersRes, "MFL players"),
  ]);

  const detailsById = new Map();
  for (const row of extractMflRows(playersData, "players")) {
    const id = mflPlayerId(row);
    if (id) detailsById.set(id, row);
  }

  return extractMflRows(adpData, "adp")
    .map((row) => {
      const id = mflPlayerId(row);
      const details = detailsById.get(id) || {};
      const adp = mflAdp(row);
      if (!id || adp == null) return null;
      return {
        name: details.name || row.name || "Unknown MFL Player",
        position: details.position || row.position || null,
        team: details.team || row.team || null,
        adp,
        player_id: `mfl_${id}`,
      };
    })
    .filter(Boolean);
}

async function readCache(redis, key) {
  const cached = await redis.get(key);
  if (!cached) return null;
  return typeof cached === "string" ? JSON.parse(cached) : cached;
}

async function writeCache(redis, key, value, ttlSeconds) {
  await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
}

async function cachedSource(redis, key, ttlSeconds, fetchPlayers, sourceMeta = {}) {
  const cached = await readCache(redis, key);
  if (cached) return cached;

  const source = {
    fetched_at: nowIso(),
    ...sourceMeta,
    players: await fetchPlayers(),
  };
  await writeCache(redis, key, source, ttlSeconds);
  return source;
}

async function yahooSource(redis, year, yahooClient) {
  const cacheKey = `adp:yahoo:${year}`;
  const cached = await readCache(redis, cacheKey);
  if (cached) return cached;

  const source = {
    fetched_at: nowIso(),
    attribution: YAHOO_ATTRIBUTION,
    players: yahooClient ? await fetchYahoo(yahooClient, year, { cache: redis }) : [],
  };

  if (yahooClient) {
    await writeCache(redis, cacheKey, source, YAHOO_TTL_SECONDS);
  }
  return source;
}

async function buildLiveAdpResponse({
  redis,
  format,
  teams,
  year,
  fetchImpl = fetch,
  yahooClient = null,
  scoringConfig = {},
}) {
  if (!redis) throw new Error("Redis unavailable for live ADP ingestion");

  const [ffc, yahoo, mfl] = await Promise.all([
    cachedSource(
      redis,
      `adp:ffc:${format}:${teams}:${year}`,
      FFC_TTL_SECONDS,
      () => fetchFFC(format, teams, year, fetchImpl),
      {
        attribution: FFC_ATTRIBUTION,
        attribution_url: FFC_ATTRIBUTION_URL,
      }
    ),
    yahooSource(redis, year, yahooClient),
    cachedSource(
      redis,
      `adp:mfl:${teams}:${year}`,
      MFL_TTL_SECONDS,
      () => fetchMFL(teams, year, fetchImpl),
      { attribution: MFL_ATTRIBUTION }
    ),
  ]);

  const weighted = buildWeightedAdpBoard({ ffc, yahoo, mfl }, scoringConfig);
  return {
    is_mock: false,
    format,
    teams,
    sources: { ffc, yahoo, mfl },
    weighting: weighted.weighting,
    weighted_players: weighted.players,
  };
}

const MOCK_ADP_PLAYERS = [
  { name: "Sample RB1", position: "RB", team: "EXA", adp: 8.2 },
  { name: "Mock WR Starter", position: "WR", team: "SAM", adp: 14.6 },
  { name: "Example TE Value", position: "TE", team: "COR", adp: 29.4 },
  { name: "Sample Flex Upside", position: "WR", team: "OMN", adp: 45.1 },
  { name: "Sample WR2", position: "WR", team: "RAV", adp: 58.7 },
];

function mockPlayers(source) {
  const prefix = source.toLowerCase();
  return MOCK_ADP_PLAYERS.map((player, index) => ({
    ...player,
    player_id: `${prefix}_mock_${index + 1}`,
  }));
}

function buildMockAdpResponse({ format, teams, scoringConfig = {} }) {
  const fetchedAt = nowIso();
  const sources = {
    ffc: {
      fetched_at: fetchedAt,
      attribution: FFC_ATTRIBUTION,
      attribution_url: FFC_ATTRIBUTION_URL,
      players: mockPlayers("FFC"),
    },
    yahoo: {
      fetched_at: fetchedAt,
      attribution: YAHOO_ATTRIBUTION,
      players: mockPlayers("Yahoo"),
    },
    mfl: {
      fetched_at: fetchedAt,
      attribution: MFL_ATTRIBUTION,
      players: mockPlayers("MFL"),
    },
  };
  const weighted = buildWeightedAdpBoard(sources, scoringConfig);

  return {
    is_mock: true,
    format,
    teams,
    note: "Mock ADP data - live ADP ingestion requires production Redis and source availability.",
    sources,
    weighting: weighted.weighting,
    weighted_players: weighted.players,
  };
}

module.exports = {
  ADP_SOURCE_WEIGHT_CONFIG_PATH,
  DEFAULT_ADP_SOURCE_WEIGHTS,
  FFC_ATTRIBUTION,
  FFC_ATTRIBUTION_URL,
  FFC_TTL_SECONDS,
  YAHOO_TTL_SECONDS,
  MFL_TTL_SECONDS,
  YAHOO_GAME_KEY_TTL_SECONDS,
  YAHOO_PLAYER_PAGE_SIZE,
  YAHOO_PHASE_ONE_LIMIT,
  buildLiveAdpResponse,
  buildMockAdpResponse,
  buildWeightedAdpBoard,
  fetchFFC,
  fetchMFL,
  fetchYahoo,
  fetchYahooDraftAnalysisBatch,
  fetchYahooGameKey,
  fetchYahooPlayerKeys,
  normalizeAdpQuery,
  normalizeFormat,
  parseTeams,
  resolveAdpSourceWeights,
};
