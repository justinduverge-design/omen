"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { windowWeather, createWeatherObservedStage } = require("../src/services/footballWarehouse/weatherObservedStage");

const series = (start, n, f) => ({
  time: [...Array(n).keys()].map((i) => new Date(Date.parse(start) + i * 3600e3).toISOString().slice(0, 16)),
  temperature_2m: [...Array(n).keys()].map((i) => f(i).t),
  wind_speed_10m: [...Array(n).keys()].map((i) => f(i).w),
  wind_gusts_10m: [...Array(n).keys()].map((i) => f(i).g),
  precipitation: [...Array(n).keys()].map((i) => f(i).p),
});

test("game-window weather: means for temperature and wind, rain summed over the hours that end in the window", () => {
  const h = series("2025-12-14T17:00:00Z", 6, (i) => ({ t: 30 + i, w: 10 + i, g: 20 + i, p: i === 0 ? 9 : 0.1 }));
  const w = windowWeather(h, Date.parse("2025-12-14T18:00:00Z"));
  assert.deepEqual(w, { temperature_f: 32, wind_mph: 12, gust_mph: 24, precip_in: 0.3 });
  assert.equal(windowWeather(h, Date.parse("2025-12-14T21:00:00Z")), null, "a window past the series is not read");
});

test("domes are stored as not applicable without a request; outdoor venues are read once per venue-season", async () => {
  const requests = [];
  const inserted = [];
  const pool = {
    query: async (q) => {
      if (q.name === "weather-observed-pending-v1")
        return {
          rows: [
            {
              game_id: "a",
              season: 2025,
              week: 15,
              kickoff_at: "2025-12-14T18:00:00Z",
              roof: "outdoors",
              stadium_id: "BUF00",
            },
            {
              game_id: "b",
              season: 2025,
              week: 16,
              kickoff_at: "2025-12-21T18:00:00Z",
              roof: "outdoors",
              stadium_id: "BUF00",
            },
            {
              game_id: "c",
              season: 2025,
              week: 15,
              kickoff_at: "2025-12-14T18:00:00Z",
              roof: "dome",
              stadium_id: "DET00",
            },
            {
              game_id: "d",
              season: 2025,
              week: 15,
              kickoff_at: "2025-12-14T18:00:00Z",
              roof: "outdoors",
              stadium_id: "NOWHERE",
            },
          ],
        };
      inserted.push(...JSON.parse(q.values[0]));
      return { rowCount: JSON.parse(q.values[0]).length };
    },
  };
  const fetchImpl = async (url) => {
    requests.push(String(url));
    return {
      ok: true,
      status: 200,
      json: async () => ({ hourly: series("2025-12-14T00:00:00Z", 24 * 10, () => ({ t: 20, w: 15, g: 30, p: 0.05 })) }),
    };
  };
  const out = await createWeatherObservedStage({ pool, fetchImpl, pauseMs: 0 }).run();
  assert.equal(requests.length, 1, "one request for the venue-season");
  assert.equal(out.unknownVenue, 1);
  assert.equal(inserted.find((r) => r.game_id === "c").status, "not_applicable");
  assert.equal(inserted.find((r) => r.game_id === "a").precip_in, 0.15);
  assert.equal(inserted.find((r) => r.game_id === "b").status, "read");
});
