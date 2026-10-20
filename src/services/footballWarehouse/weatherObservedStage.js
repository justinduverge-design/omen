"use strict";

// Observed weather for played games, backfilled from the Open-Meteo historical archive (CC BY 4.0).
// One archive request covers one venue for one season (hourly series over the season's dates), so the
// 1999-onward backfill is about a thousand requests; each run takes up to MAX_REQUESTS_PER_RUN and the rest
// follow on later runs. Domes and closed roofs are stored as not applicable. Reported, never fatal.

const STADIUMS = require("../../data/stadiums.json").stadiums;

const ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";
const MAX_REQUESTS_PER_RUN = 400;
const PAUSE_MS = 400;
const WINDOW_HOURS = 3;
const HOUR = 3600 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const day = (ms) => new Date(ms).toISOString().slice(0, 10);
const round1 = (v) => Math.round(v * 10) / 10;

/** Weather in the game window from an hourly archive series; null when any hour is missing. */
function windowWeather(hourly, kickoffMs) {
  const index = new Map(hourly.time.map((t, i) => [Date.parse(`${t}:00Z`), i]));
  const start = Math.floor(kickoffMs / HOUR) * HOUR;
  const temps = [];
  const winds = [];
  const gusts = [];
  let precip = 0;
  for (let k = 0; k < WINDOW_HOURS; k += 1) {
    const i = index.get(start + k * HOUR);
    const j = index.get(start + (k + 1) * HOUR); // precipitation and gusts are stamped at the end of their hour
    if (i == null || j == null) return null;
    const t = hourly.temperature_2m[i];
    const w = hourly.wind_speed_10m[i];
    const p = hourly.precipitation[j];
    const g = hourly.wind_gusts_10m[j];
    if (t == null || w == null || p == null) return null;
    temps.push(t);
    winds.push(w);
    if (g != null) gusts.push(g);
    precip += p;
  }
  return {
    temperature_f: round1(temps.reduce((a, b) => a + b, 0) / temps.length),
    wind_mph: round1(winds.reduce((a, b) => a + b, 0) / winds.length),
    gust_mph: gusts.length ? round1(Math.max(...gusts)) : null,
    precip_in: Math.round(precip * 100) / 100,
  };
}

function createWeatherObservedStage({
  pool,
  fetchImpl = globalThis.fetch,
  pauseMs = PAUSE_MS,
  maxRequests = MAX_REQUESTS_PER_RUN,
}) {
  return {
    async run() {
      const pending = await pool.query({
        name: "weather-observed-pending-v1",
        text: `
        SELECT g.game_id, g.season, g.week, g.kickoff_at, g.roof, g.source_row->>'stadium_id' AS stadium_id
          FROM football.nfl_games g
          LEFT JOIN football.game_weather_observed o ON o.game_id = g.game_id
         WHERE o.game_id IS NULL AND g.home_score IS NOT NULL AND g.kickoff_at IS NOT NULL
         ORDER BY g.season DESC, g.kickoff_at`,
      });
      // One request per (venue, season); domes and closed roofs need none.
      const groups = new Map();
      const rows = [];
      let unknownVenue = 0;
      for (const g of pending.rows) {
        const venue = STADIUMS[g.stadium_id];
        const roofed = g.roof === "dome" || g.roof === "closed" || (!g.roof && venue?.roof_type === "dome");
        if (roofed) {
          rows.push({
            game_id: g.game_id,
            season: g.season,
            week: g.week,
            kickoff_at: g.kickoff_at,
            status: "not_applicable",
            roof_type: g.roof === "closed" ? "closed" : "dome",
          });
          continue;
        }
        if (!venue) {
          unknownVenue += 1;
          continue;
        }
        const key = `${g.stadium_id}|${g.season}`;
        if (!groups.has(key)) groups.set(key, { venue, games: [] });
        groups.get(key).games.push(g);
      }
      let requests = 0;
      let failed = 0;
      for (const { venue, games } of groups.values()) {
        if (requests >= maxRequests) break;
        const kicks = games.map((g) => new Date(g.kickoff_at).getTime());
        const url = new URL(ARCHIVE);
        for (const [k, v] of Object.entries({
          latitude: venue.lat,
          longitude: venue.lon,
          start_date: day(Math.min(...kicks)),
          end_date: day(Math.max(...kicks) + 6 * HOUR),
          hourly: "temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation",
          temperature_unit: "fahrenheit",
          wind_speed_unit: "mph",
          precipitation_unit: "inch",
          timezone: "UTC",
        }))
          url.searchParams.set(k, String(v));
        requests += 1;
        try {
          const res = await fetchImpl(url, { signal: AbortSignal.timeout(30_000) });
          if (res.status === 429) break; // rate limited: stop, resume next run
          if (!res.ok) {
            failed += 1;
            continue;
          }
          const body = await res.json();
          for (const g of games) {
            const w = body?.hourly?.time ? windowWeather(body.hourly, new Date(g.kickoff_at).getTime()) : null;
            if (w)
              rows.push({
                game_id: g.game_id,
                season: g.season,
                week: g.week,
                kickoff_at: g.kickoff_at,
                status: "read",
                roof_type: g.roof === "open" ? "open" : venue.roof_type,
                ...w,
              });
          }
        } catch {
          failed += 1;
        }
        if (pauseMs) await sleep(pauseMs);
      }
      if (!rows.length) return { state: "unchanged", pending: pending.rows.length, requests, failed, unknownVenue };
      const inserted = await pool.query({
        name: "weather-observed-insert-v1",
        text: `
        INSERT INTO football.game_weather_observed (game_id, season, week, kickoff_at, status, roof_type, temperature_f, wind_mph, gust_mph, precip_in, source)
        SELECT r.game_id, r.season, r.week, r.kickoff_at, r.status, r.roof_type, r.temperature_f, r.wind_mph, r.gust_mph, r.precip_in, 'open-meteo-archive'
          FROM jsonb_to_recordset($1::jsonb) AS r(game_id text, season integer, week integer, kickoff_at timestamptz, status text, roof_type text,
               temperature_f numeric, wind_mph numeric, gust_mph numeric, precip_in numeric)
        ON CONFLICT (game_id) DO NOTHING`,
        values: [JSON.stringify(rows)],
      });
      return {
        state: "succeeded",
        stored: inserted.rowCount,
        pending: pending.rows.length,
        requests,
        failed,
        unknownVenue,
      };
    },
  };
}

module.exports = { createWeatherObservedStage, windowWeather };
