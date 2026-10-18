"use strict";

const { getGameWeather } = require("../weather/openMeteo");
const STADIUMS = require("../../data/stadiums.json").stadiums;

const HORIZON_DAYS = 10;

/**
 * Forecast weather for every game kicking off in the next ten days, appended to game_weather_forecasts.
 * Domes are stored as not applicable. A game whose stadium is unknown, or whose forecast cannot be read in
 * full, is skipped (Sight treats missing weather as neutral). Reported, never fatal to the ingest.
 */
function createWeatherForecastStage({ pool, fetchImpl = globalThis.fetch, now = () => new Date() }) {
  return {
    async run({ season }) {
      const at = now();
      const games = await pool.query({
        name: "weather-upcoming-games-v1",
        text: `
        SELECT game_id, season, week, kickoff_at, source_row->>'stadium_id' AS stadium_id, roof
          FROM football.nfl_games
         WHERE season = $1 AND kickoff_at > $2 AND kickoff_at <= $2 + make_interval(days => $3) AND home_score IS NULL`,
        values: [season, at.toISOString(), HORIZON_DAYS],
      });
      const rows = [];
      let skipped = 0;
      for (const g of games.rows) {
        const venue = STADIUMS[g.stadium_id];
        const roofType = venue?.roof_type || (g.roof === "dome" || g.roof === "closed" ? "dome" : null);
        if (!venue && roofType !== "dome") {
          skipped += 1;
          continue;
        }
        const weather = await getGameWeather({
          lat: venue?.lat,
          lon: venue?.lon,
          kickoffAt: new Date(g.kickoff_at).toISOString(),
          roofType: roofType || "outdoors",
          fetchImpl,
          nowMs: at.getTime(),
        });
        if (weather.status === "not_applicable") {
          rows.push({
            game_id: g.game_id,
            season: g.season,
            week: g.week,
            kickoff_at: g.kickoff_at,
            status: "not_applicable",
            roof_type: "dome",
          });
        } else if (weather.status === "read") {
          rows.push({
            game_id: g.game_id,
            season: g.season,
            week: g.week,
            kickoff_at: g.kickoff_at,
            status: "read",
            roof_type: weather.roof_type,
            temperature_f: weather.temp_f,
            wind_mph: weather.wind_mph,
            gust_mph: weather.gust_mph,
            precip_in: weather.precip_in,
            precip_probability_pct: weather.precip_probability_pct,
          });
        } else skipped += 1;
      }
      if (!rows.length) return { state: "unchanged", games: games.rows.length, skipped };
      const inserted = await pool.query({
        name: "weather-insert-v1",
        text: `
        INSERT INTO football.game_weather_forecasts (game_id, season, week, kickoff_at, fetched_at, status, roof_type, temperature_f, wind_mph, gust_mph, precip_in, precip_probability_pct, source)
        SELECT r.game_id, r.season, r.week, r.kickoff_at, $2, r.status, r.roof_type, r.temperature_f, r.wind_mph, r.gust_mph, r.precip_in, r.precip_probability_pct, 'open-meteo'
          FROM jsonb_to_recordset($1::jsonb) AS r(game_id text, season integer, week integer, kickoff_at timestamptz, status text, roof_type text,
                temperature_f numeric, wind_mph numeric, gust_mph numeric, precip_in numeric, precip_probability_pct integer)
        ON CONFLICT DO NOTHING`,
        values: [JSON.stringify(rows), at.toISOString()],
      });
      return { state: "succeeded", games: games.rows.length, stored: inserted.rowCount, skipped };
    },
  };
}

module.exports = { createWeatherForecastStage };
