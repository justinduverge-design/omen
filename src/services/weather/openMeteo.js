"use strict";

/**
 * Open-Meteo game-weather client.
 *
 * Why this exists (decision 2026-09-30): the previous source, OpenWeather's 5-day forecast, had no
 * history, so a backtest could only use *observed* weather while a live pick uses a *forecast* —
 * a systematic bias. Open-Meteo serves all three, from one grid, with no key:
 *
 *   forecast             api.open-meteo.com                       — what a live pick sees
 *   observed             archive-api.open-meteo.com               — what actually happened
 *   historical_forecast  historical-forecast-api.open-meteo.com   — what the forecast SAID before the
 *                                                                  game (unbiased backtest input)
 *
 * Rules:
 *  - **Never default.** Any failure returns { status: "not_read", reason } — never 65°F, never 0 mph.
 *    (weatherService.js defaulted to 65°F and 0 mph on a missing field; that is a fabricated read.)
 *  - **Roof.** "dome" is weather-neutral. "retractable" is unknown until near kickoff, so the result
 *    carries `roof_open_probability: null` and consumers must weight, never assume either state.
 *  - **Game window.** Kickoff hour through kickoff + 3 hours, not "the next 3-hour block".
 *  - Attribution is required (CC BY 4.0) and returned with every read.
 *
 * Terms: the free tier is for non-commercial use with a daily call limit. Omen is free; revisit if
 * that changes (Direction/decision_log.md, 2026-09-30). This module is called by the weekly data
 * job, not the request path, so volume stays far below the limit.
 */

const ENDPOINTS = Object.freeze({
  forecast: "https://api.open-meteo.com/v1/forecast",
  observed: "https://archive-api.open-meteo.com/v1/archive",
  historical_forecast: "https://historical-forecast-api.open-meteo.com/v1/forecast",
});

const ATTRIBUTION = "Weather data by Open-Meteo.com (CC BY 4.0)";
const GAME_WINDOW_HOURS = 3;
const DEFAULT_TIMEOUT_MS = 4000;
// Open-Meteo's live forecast reaches 16 days ahead.
const MAX_FORECAST_DAYS_AHEAD = 16;

function notRead(reason, extra = {}) {
  return { status: "not_read", reason, source: "open-meteo", ...extra };
}

// null, undefined and "" must stay null: Number(null) is 0, which would read a missing hour as 0°F.
function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function utcDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Which of the three data kinds a request should use. Pure, so it is testable without a network. */
function chooseKind({ kickoffMs, nowMs, asOfForecast = false }) {
  if (asOfForecast) return "historical_forecast";
  return kickoffMs > nowMs ? "forecast" : "observed";
}

/**
 * Reads the game-window weather.
 *
 * @param {object} args
 * @param {number} args.lat
 * @param {number} args.lon
 * @param {string} args.kickoffAt        ISO-8601 instant (UTC or with offset)
 * @param {"outdoors"|"dome"|"retractable"} [args.roofType="outdoors"]
 * @param {boolean} [args.asOfForecast]  true → what the forecast said before the game (backtests)
 * @param {Function} [args.fetchImpl]    injected in tests
 * @param {number}   [args.nowMs]        injected in tests
 * @param {number}   [args.timeoutMs]
 */
async function getGameWeather({
  lat,
  lon,
  kickoffAt,
  roofType = "outdoors",
  asOfForecast = false,
  fetchImpl = globalThis.fetch,
  nowMs = Date.now(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (roofType === "dome") {
    return { status: "not_applicable", reason: "dome", source: "open-meteo", roof_type: "dome" };
  }

  const latitude = finite(lat);
  const longitude = finite(lon);
  if (latitude == null || longitude == null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return notRead("invalid_coordinates");
  }
  const kickoffMs = Date.parse(kickoffAt);
  if (!Number.isFinite(kickoffMs)) return notRead("invalid_kickoff");

  const kind = chooseKind({ kickoffMs, nowMs, asOfForecast });
  if (kind === "forecast" && kickoffMs - nowMs > MAX_FORECAST_DAYS_AHEAD * 86400000) {
    return notRead("beyond_forecast_horizon", { kind });
  }
  if (typeof fetchImpl !== "function") return notRead("no_fetch", { kind });

  const startMs = Math.floor(kickoffMs / 3600000) * 3600000;
  const endMs = startMs + GAME_WINDOW_HOURS * 3600000;
  const hourly = ["temperature_2m", "wind_speed_10m", "wind_gusts_10m", "precipitation"];
  // Observed data has no precipitation probability; asking for it there is an error.
  if (kind !== "observed") hourly.push("precipitation_probability");

  const url = new URL(ENDPOINTS[kind]);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("hourly", hourly.join(","));
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("start_date", utcDate(startMs));
  url.searchParams.set("end_date", utcDate(endMs));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let body;
  try {
    const res = await fetchImpl(url.toString(), { signal: controller.signal });
    if (!res.ok) return notRead(`http_${res.status}`, { kind });
    body = await res.json();
  } catch (err) {
    return notRead(err && err.name === "AbortError" ? "timeout" : "network", { kind });
  } finally {
    clearTimeout(timer);
  }

  const h = body && body.hourly;
  if (!h || !Array.isArray(h.time)) return notRead("no_data", { kind });

  const rows = [];
  for (let i = 0; i < h.time.length; i += 1) {
    // `timezone=UTC` makes these naive strings UTC; append Z rather than trusting the host zone.
    const t = Date.parse(`${h.time[i]}:00Z`);
    if (t >= startMs && t < endMs) {
      rows.push({
        temp: finite(h.temperature_2m && h.temperature_2m[i]),
        wind: finite(h.wind_speed_10m && h.wind_speed_10m[i]),
        gust: finite(h.wind_gusts_10m && h.wind_gusts_10m[i]),
        precip: finite(h.precipitation && h.precipitation[i]),
        prob: finite(h.precipitation_probability && h.precipitation_probability[i]),
      });
    }
  }
  // A partial window is a partial read: refuse rather than average two hours and call it three.
  const complete = rows.filter((r) => r.temp != null && r.wind != null && r.precip != null);
  if (complete.length < GAME_WINDOW_HOURS) return notRead("incomplete_window", { kind, hours_found: complete.length });

  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const gusts = complete.map((r) => r.gust).filter((v) => v != null);
  const probs = complete.map((r) => r.prob).filter((v) => v != null);
  const round1 = (v) => Math.round(v * 10) / 10;

  return {
    status: "read",
    kind,
    source: "open-meteo",
    attribution: ATTRIBUTION,
    roof_type: roofType,
    // Retractable: state unknown in advance. Null, not 0 and not 1 — consumers must weight.
    roof_open_probability: roofType === "retractable" ? null : 1,
    window: { start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString(), hours: complete.length },
    temp_f: round1(mean(complete.map((r) => r.temp))),
    wind_mph: round1(mean(complete.map((r) => r.wind))),
    gust_mph: gusts.length ? round1(Math.max(...gusts)) : null,
    precip_in: Math.round(complete.reduce((a, r) => a + r.precip, 0) * 100) / 100,
    precip_probability_pct: probs.length ? Math.round(Math.max(...probs)) : null,
    // When the read was made, not when the game is. For historical_forecast the model run time is
    // not exposed by the API, so callers must not present it as a specific pre-game time.
    as_of: new Date(nowMs).toISOString(),
  };
}

module.exports = { getGameWeather, chooseKind, ENDPOINTS, ATTRIBUTION, GAME_WINDOW_HOURS };
