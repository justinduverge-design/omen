"use strict";

/**
 * Open-Meteo game-weather client.
 *
 * Why this exists (decision 2026-09-30): the previous source, OpenWeather's 5-day forecast, had no
 * history, so a backtest could only use *observed* weather while a live pick uses a *forecast* —
 * a systematic bias. Open-Meteo can serve what a live pick would have seen, from one grid, no key.
 *
 * Four kinds of read. They are NOT interchangeable, and the kind is returned with every result:
 *
 *   forecast          api.open-meteo.com — the live forecast. Use for picks about a future game.
 *   observed          archive-api.open-meteo.com — what actually happened. Never a substitute for
 *                     a forecast in a backtest of a decision made before the game.
 *   forecast_at_lead  previous-runs-api.open-meteo.com — the forecast that was issued `leadDays`
 *                     days before, for the same hours. **This is the one to backtest a call
 *                     issued days before kickoff.** Coverage varies by variable and season; a
 *                     variable that was not archived at that lead comes back null, and the read
 *                     is then refused (`lead_time_unavailable`) rather than filled.
 *   short_lead_archive  historical-forecast-api.open-meteo.com — a seamless series stitched from
 *                     the *initial hours of each model run*. That is a short-lead forecast: it is
 *                     NOT what a call issued several days out saw, and using it for one leaks a
 *                     later, better forecast into the experiment. Available only by explicit
 *                     request (`archive: "short_lead"`), and labelled as such.
 *
 * Rules:
 *  - **Never default.** Any failure returns { status: "not_read", reason } — never 65°F, never 0 mph.
 *    (weatherService.js defaulted to 65°F and 0 mph on a missing field; that is a fabricated read.)
 *  - **Roof.** "dome" is weather-neutral. "retractable" is unknown until near kickoff, so the result
 *    carries `roof_open_probability: null` and consumers must weight, never assume either state.
 *  - **Game window.** Kickoff hour through kickoff + 3 hours, not "the next 3-hour block".
 *  - **Interval semantics.** Open-Meteo's hourly precipitation, precipitation probability and wind
 *    gusts describe the *preceding* hour; temperature and wind speed are instantaneous. For a game
 *    window [start, end) the instantaneous values come from the timestamps start..end-1h and the
 *    accumulated ones from the timestamps start+1h..end (the hours that lie inside the window).
 *  - **as_of** is the retrieval time and is set only for a live forecast. For every archived kind it
 *    is null: the archives expose no model-run time, so no timestamp is claimed.
 *  - Attribution is required (CC BY 4.0) and returned with every read.
 *
 * Terms: the free tier is for non-commercial use with a daily call limit. Omen is free; revisit if
 * that changes (Direction/decision_log.md, 2026-09-30). This module is called by the weekly data
 * job, not the request path, so volume stays far below the limit.
 */

const ENDPOINTS = Object.freeze({
  forecast: "https://api.open-meteo.com/v1/forecast",
  observed: "https://archive-api.open-meteo.com/v1/archive",
  forecast_at_lead: "https://previous-runs-api.open-meteo.com/v1/forecast",
  short_lead_archive: "https://historical-forecast-api.open-meteo.com/v1/forecast",
});

const ATTRIBUTION = "Weather data by Open-Meteo.com (CC BY 4.0)";
const GAME_WINDOW_HOURS = 3;
const DEFAULT_TIMEOUT_MS = 4000;
const MAX_FORECAST_DAYS_AHEAD = 16;
const MAX_LEAD_DAYS = 7;
const HOUR_MS = 3600000;

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

/**
 * Which kind of read a request should use. Pure, so it is testable without a network.
 * A past game is `observed` unless the caller asks for a specific forecast vintage.
 */
function chooseKind({ kickoffMs, nowMs, leadDays = null, archive = null }) {
  if (kickoffMs > nowMs) return "forecast";
  if (leadDays != null) return "forecast_at_lead";
  if (archive === "short_lead") return "short_lead_archive";
  return "observed";
}

/**
 * @param {object} args
 * @param {number} args.lat
 * @param {number} args.lon
 * @param {string} args.kickoffAt        ISO-8601 instant (UTC or with offset)
 * @param {"outdoors"|"dome"|"retractable"} [args.roofType="outdoors"]
 * @param {number} [args.leadDays]       backtest: the forecast issued this many days (1-7) before
 * @param {"short_lead"} [args.archive]  backtest: the short-lead archive, explicitly labelled
 * @param {Function} [args.fetchImpl]    injected in tests
 * @param {number}   [args.nowMs]        injected in tests
 * @param {number}   [args.timeoutMs]
 */
async function getGameWeather({
  lat,
  lon,
  kickoffAt,
  roofType = "outdoors",
  leadDays = null,
  archive = null,
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
  if (leadDays != null && (!Number.isInteger(leadDays) || leadDays < 1 || leadDays > MAX_LEAD_DAYS)) {
    return notRead("invalid_lead_days");
  }
  if (leadDays != null && archive != null) return notRead("conflicting_vintage_request");

  const kind = chooseKind({ kickoffMs, nowMs, leadDays, archive });
  if (kind === "forecast" && kickoffMs - nowMs > MAX_FORECAST_DAYS_AHEAD * 86400000) {
    return notRead("beyond_forecast_horizon", { kind });
  }
  if (typeof fetchImpl !== "function") return notRead("no_fetch", { kind });

  const startMs = Math.floor(kickoffMs / HOUR_MS) * HOUR_MS;
  const endMs = startMs + GAME_WINDOW_HOURS * HOUR_MS;

  // Variable names differ by kind: the previous-runs API suffixes each with `_previous_dayN`, and
  // does not offer precipitation probability at all.
  const base = ["temperature_2m", "wind_speed_10m", "wind_gusts_10m", "precipitation"];
  const suffix = kind === "forecast_at_lead" ? `_previous_day${leadDays}` : "";
  const hourly = base.map((v) => `${v}${suffix}`);
  if (kind === "forecast" || kind === "short_lead_archive") hourly.push("precipitation_probability");

  const url = new URL(ENDPOINTS[kind]);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("hourly", hourly.join(","));
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("start_date", utcDate(startMs));
  // The accumulated variables' last hour is stamped `end`, which can fall on the next UTC day.
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

  // Index the series by UTC instant. `timezone=UTC` makes the strings naive UTC; append Z rather
  // than trusting the host zone.
  const at = new Map();
  h.time.forEach((t, i) => at.set(Date.parse(`${t}:00Z`), i));
  const val = (name, ms) => {
    const i = at.get(ms);
    return i == null ? null : finite(h[`${name}${suffix}`] && h[`${name}${suffix}`][i]);
  };

  // Instantaneous variables: the hours that begin inside the window.
  const instantaneous = [];
  // Accumulated variables (preceding-hour): the hours that END inside the window, stamped
  // start+1h .. end.
  const accumulated = [];
  for (let k = 0; k < GAME_WINDOW_HOURS; k += 1) {
    instantaneous.push({ temp: val("temperature_2m", startMs + k * HOUR_MS), wind: val("wind_speed_10m", startMs + k * HOUR_MS) });
    const t = startMs + (k + 1) * HOUR_MS;
    accumulated.push({
      precip: val("precipitation", t),
      gust: val("wind_gusts_10m", t),
      prob: kind === "forecast" || kind === "short_lead_archive" ? val("precipitation_probability", t) : null,
    });
  }

  // A partial window is a partial read: refuse rather than average two hours and call it three.
  const okInst = instantaneous.filter((r) => r.temp != null && r.wind != null);
  const okAcc = accumulated.filter((r) => r.precip != null);
  if (okInst.length < GAME_WINDOW_HOURS || okAcc.length < GAME_WINDOW_HOURS) {
    // For a specific lead, missing means "that vintage was not archived for this variable", which
    // is a different fact from a network gap and must not be papered over with another vintage.
    return notRead(kind === "forecast_at_lead" ? "lead_time_unavailable" : "incomplete_window", {
      kind,
      ...(kind === "forecast_at_lead" ? { lead_days: leadDays } : {}),
      hours_found: Math.min(okInst.length, okAcc.length),
    });
  }

  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const gusts = accumulated.map((r) => r.gust).filter((v) => v != null);
  const probs = accumulated.map((r) => r.prob).filter((v) => v != null);
  const round1 = (v) => Math.round(v * 10) / 10;

  return {
    status: "read",
    kind,
    ...(kind === "forecast_at_lead" ? { lead_days: leadDays } : {}),
    source: "open-meteo",
    attribution: ATTRIBUTION,
    roof_type: roofType,
    // Retractable: state unknown in advance. Null, not 0 and not 1 — consumers must weight.
    roof_open_probability: roofType === "retractable" ? null : 1,
    window: { start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString(), hours: GAME_WINDOW_HOURS },
    temp_f: round1(mean(okInst.map((r) => r.temp))),
    wind_mph: round1(mean(okInst.map((r) => r.wind))),
    gust_mph: gusts.length ? round1(Math.max(...gusts)) : null,
    precip_in: Math.round(okAcc.reduce((a, r) => a + r.precip, 0) * 100) / 100,
    precip_probability_pct: probs.length ? Math.round(Math.max(...probs)) : null,
    // Retrieval time, and only for a live forecast. Archived kinds expose no model-run time, so no
    // timestamp is claimed for them.
    as_of: kind === "forecast" ? new Date(nowMs).toISOString() : null,
  };
}

module.exports = { getGameWeather, chooseKind, ENDPOINTS, ATTRIBUTION, GAME_WINDOW_HOURS, MAX_LEAD_DAYS };
