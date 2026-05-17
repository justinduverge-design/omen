"use strict";

const assert = require("node:assert/strict");
const { describe, it, after } = require("node:test");

const _originalOpenWeatherKey = process.env.OPENWEATHER_API_KEY;
const _originalFetch = global.fetch;

describe("weatherService.getVenueWeather", () => {
  after(() => {
    if (_originalOpenWeatherKey == null) delete process.env.OPENWEATHER_API_KEY;
    else process.env.OPENWEATHER_API_KEY = _originalOpenWeatherKey;

    if (_originalFetch) global.fetch = _originalFetch;
    else delete global.fetch;
  });

  it("returns null for dome games regardless of API key", async () => {
    const { getVenueWeather } = require("../src/services/weatherService");
    const result = await getVenueWeather({ lat: 33.95, lng: -118.34, is_dome: true });
    assert.equal(result, null);
  });

  it("returns null when OPENWEATHER_API_KEY is not set", async () => {
    delete process.env.OPENWEATHER_API_KEY;
    const { getVenueWeather } = require("../src/services/weatherService");
    const result = await getVenueWeather({ lat: 39.28, lng: -76.62, is_dome: false });
    assert.equal(result, null);
  });

  it("returns non-zero precip_chance when pop is set in forecast response", async () => {
    process.env.OPENWEATHER_API_KEY = "test-openweather-key";
    let requestedUrl = "";
    global.fetch = async (url) => {
      requestedUrl = String(url);
      return {
        ok: true,
        json: async () => ({
          list: [{
            main: { temp: 51.6 },
            wind: { speed: 11.4 },
            weather: [{ description: "light rain" }],
            pop: 0.62,
          }],
        }),
      };
    };

    const { getVenueWeather } = require("../src/services/weatherService");
    const result = await getVenueWeather({ lat: 40.44, lng: -80.02, is_dome: false });

    assert.equal(result.temp_f, 52);
    assert.equal(result.wind_mph, 11);
    assert.equal(result.conditions, "light rain");
    assert.equal(result.precip_chance, 62);
    assert.ok(requestedUrl.includes("/data/2.5/forecast"));
    assert.ok(requestedUrl.includes("&cnt=3"));
  });
});
