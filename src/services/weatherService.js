"use strict";

/**
 * Weather Service
 * Fetches current conditions from OpenWeatherMap for a venue's coordinates.
 * Requires OPENWEATHER_API_KEY env var. Falls back gracefully if not set.
 *
 * Free tier: 1000 calls/day. Cache aggressively (6-hour TTL).
 * Dome games are weather-neutral; returns null for dome venues.
 */

const OWM_BASE = "https://api.openweathermap.org/data/2.5/forecast";
const FETCH_TIMEOUT_MS = 5000;

// In-process cache keyed by "lat,lng".
const _cache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

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

/**
 * Get weather for a venue location.
 * lat/lng: number coordinates
 * is_dome: boolean - dome games return null (weather irrelevant)
 *
 * Returns:
 * { temp_f, wind_mph, conditions, precip_chance }
 * or null if API unavailable or dome game.
 */
async function getVenueWeather({ lat, lng, is_dome }) {
  if (is_dome) return null;

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    _logger().warn("weatherService: OPENWEATHER_API_KEY not set - using stub data");
    return null;
  }

  if (lat == null || lng == null) return null;

  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = _cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${OWM_BASE}?lat=${lat}&lon=${lng}&appid=${apiKey}&units=imperial&cnt=3`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      _logger().warn("weatherService: OpenWeatherMap returned non-OK", { status: res.status });
      return null;
    }
    const data = await res.json();
    // TODO(season-hardening): list[0] is the nearest 3-hour interval, not game-time.
    // When in-season, find the list entry whose dt is closest to gameInfo.kickoff_utc
    // for game-accurate precipitation and temperature context.
    const forecast = data?.list?.[0] || {};

    const result = {
      temp_f:        Math.round(forecast?.main?.temp || 65),
      wind_mph:      Math.round(forecast?.wind?.speed || 0),
      conditions:    forecast?.weather?.[0]?.description || "Unknown",
      precip_chance: Math.round((forecast?.pop || 0) * 100),
    };

    _cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    _logger().warn("weatherService: fetch failed", { message: err?.message });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { getVenueWeather };
