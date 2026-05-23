"use strict";

/**
 * Matchup Service
 * Fetches opponent DvP (Defense vs. Position) data from nflverse-data GitHub releases.
 * License: MIT. No API key required. Falls back gracefully if unavailable.
 *
 * Returns DvP context for a player's position against a specific opponent team,
 * or null if data is unavailable (offseason, fetch failure, missing player).
 */

const NFLVERSE_BASE_URL =
  "https://github.com/nflverse/nflverse-data/releases/download/player_stats";

const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// In-process cache: parsed CSV rows, keyed by "season-week".
const _cache = new Map();

function _logger() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return { warn() {} };
  }
  return require("../middleware/logging").logger;
}

function _cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.value;
}

function _cacheSet(key, value) {
  _cache.set(key, { value, ts: Date.now() });
}

function _nflverseUrlForSeason(season) {
  return `${NFLVERSE_BASE_URL}/player_stats_${season}.csv`;
}

async function _fetchRows(cacheKey, season) {
  const cached = _cacheGet(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(_nflverseUrlForSeason(season), { signal: controller.signal });
    if (!res.ok) {
      _logger().warn("matchupService: nflverse-data returned non-OK", { status: res.status });
      return null;
    }

    const text = await res.text();
    const rows = _parseCsv(text);
    _cacheSet(cacheKey, rows);
    return rows;
  } catch (err) {
    _logger().warn("matchupService: fetch failed", { message: err?.message });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function _parseCsv(csvText) {
  const lines = String(csvText || "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim());
  const required = ["season", "week", "position", "opponent_team"];
  for (const column of required) {
    if (!headers.includes(column)) {
      throw new Error(`missing required column: ${column}`);
    }
  }
  if (!headers.includes("fantasy_points") && !headers.includes("fantasy_points_ppr")) {
    throw new Error("missing required column: fantasy_points or fantasy_points_ppr");
  }

  return lines.slice(1).map(line => {
    const values = line.split(",");
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] == null ? "" : values[idx].trim();
    });
    return row;
  });
}

function _normalizePosition(position) {
  const normalized = String(position || "").toUpperCase().replace("D/ST", "DEF").replace("DST", "DEF");
  if (normalized === "PK") return "K";
  return normalized;
}

function _labelFor(position, avgPointsAllowed) {
  const thresholds = {
    QB: { favorable: 22, tough: 16 },
    RB: { favorable: 18, tough: 12 },
    WR: { favorable: 16, tough: 10 },
    TE: { favorable: 10, tough: 6 },
  };
  const threshold = thresholds[position];
  if (!threshold) return "neutral";
  if (avgPointsAllowed > threshold.favorable) return "favorable";
  if (avgPointsAllowed < threshold.tough) return "tough";
  return "neutral";
}

/**
 * getDvpContext({ position, opponentTeam, season, week })
 *
 * Returns:
 * {
 *   opponent_team: string,
 *   position: string,
 *   avg_points_allowed: number,
 *   sample_weeks: number,
 *   dvp_label: "favorable" | "neutral" | "tough"
 * }
 * or null if data unavailable.
 */
async function getDvpContext({ position, opponentTeam, season, week }) {
  try {
    const pos = _normalizePosition(position);
    if (pos === "K" || pos === "DEF") return null;
    if (!["QB", "RB", "WR", "TE"].includes(pos)) return null;

    const opponent = String(opponentTeam || "").toUpperCase();
    const seasonInt = Number.parseInt(season, 10);
    const weekInt = Number.parseInt(week, 10);
    if (!opponent || !Number.isInteger(seasonInt) || !Number.isInteger(weekInt)) return null;

    const cacheKey = `${seasonInt}-${weekInt}`;
    const rows = await _fetchRows(cacheKey, seasonInt);
    if (!rows) return null;

    const matching = rows
      .filter(row => Number.parseInt(row.season, 10) === seasonInt)
      .filter(row => Number.parseInt(row.week, 10) < weekInt)
      .filter(row => _normalizePosition(row.position) === pos)
      .filter(row => String(row.opponent_team || "").toUpperCase() === opponent)
      .map(row => Number.parseFloat(row.fantasy_points_ppr || row.fantasy_points))
      .filter(points => Number.isFinite(points));

    if (matching.length < 3) return null;

    const avg = matching.reduce((sum, points) => sum + points, 0) / matching.length;
    const avgPointsAllowed = Math.round(avg * 10) / 10;

    return {
      opponent_team:       opponent,
      position:            pos,
      avg_points_allowed:  avgPointsAllowed,
      sample_weeks:        matching.length,
      dvp_label:           _labelFor(pos, avgPointsAllowed),
    };
  } catch (err) {
    _logger().warn("matchupService: DvP calculation failed", { message: err?.message });
    return null;
  }
}

module.exports = { getDvpContext };
