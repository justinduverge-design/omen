"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { getGameWeather, chooseKind, ATTRIBUTION } = require("../src/services/weather/openMeteo");
const stadiums = require("../src/data/stadiums.json").stadiums;
const { NFL_STADIUMS } = require("../src/data/nflStadiums");

const fx = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8"));
const respond = (body, status = 200) => async () => ({ ok: status < 400, status, json: async () => body });

// Lambeau Field, 2025-10-12, 1:00 PM CT kickoff = 18:00 UTC. Fixtures are recorded from the live API.
const GNB = { lat: 44.5013, lon: -88.0622, kickoffAt: "2025-10-12T18:00:00Z" };
const NOW_AFTER = Date.parse("2025-10-13T00:00:00Z");

test("chooseKind: future kickoff reads the forecast, past reads observed, backtest reads the historical forecast", () => {
  const now = Date.parse("2026-10-01T00:00:00Z");
  assert.equal(chooseKind({ kickoffMs: now + 1e6, nowMs: now }), "forecast");
  assert.equal(chooseKind({ kickoffMs: now - 1e6, nowMs: now }), "observed");
  assert.equal(chooseKind({ kickoffMs: now - 1e6, nowMs: now, asOfForecast: true }), "historical_forecast");
});

test("observed: averages the three-hour game window from the recorded archive response", async () => {
  const out = await getGameWeather({
    ...GNB, nowMs: NOW_AFTER, fetchImpl: respond(fx("openmeteo-archive-gnb-2025-10-12.json")),
  });
  assert.equal(out.status, "read");
  assert.equal(out.kind, "observed");
  assert.equal(out.window.hours, 3);
  assert.equal(out.window.start, "2025-10-12T18:00:00.000Z");
  assert.equal(out.window.end, "2025-10-12T21:00:00.000Z");
  assert.ok(out.temp_f > 30 && out.temp_f < 90, `temp ${out.temp_f}`);
  assert.ok(out.wind_mph >= 0 && out.wind_mph < 60);
  assert.equal(out.precip_probability_pct, null, "observed weather has no precipitation probability");
  assert.equal(out.attribution, ATTRIBUTION);
  assert.equal(out.roof_open_probability, 1);
});

test("historical forecast: returns what the forecast said, and says so", async () => {
  const out = await getGameWeather({
    ...GNB, asOfForecast: true, nowMs: NOW_AFTER, fetchImpl: respond(fx("openmeteo-histforecast-gnb-2025-10-12.json")),
  });
  assert.equal(out.status, "read");
  assert.equal(out.kind, "historical_forecast");
  assert.notEqual(out.precip_probability_pct, undefined);
});

test("forecast: a future kickoff uses the forecast endpoint", async () => {
  let requested;
  const out = await getGameWeather({
    lat: 44.5013, lon: -88.0622, kickoffAt: "2026-10-04T17:00:00Z", nowMs: Date.parse("2026-09-30T00:00:00Z"),
    fetchImpl: async (url) => { requested = url; return respond(fx("openmeteo-forecast-gnb-2026-10-04.json"))(); },
  });
  assert.equal(out.status, "read");
  assert.equal(out.kind, "forecast");
  assert.match(requested, /^https:\/\/api\.open-meteo\.com\/v1\/forecast/);
  assert.match(requested, /temperature_unit=fahrenheit/);
  assert.match(requested, /timezone=UTC/);
});

test("dome is weather-neutral and never touches the network", async () => {
  let called = false;
  const out = await getGameWeather({
    ...GNB, roofType: "dome", nowMs: NOW_AFTER, fetchImpl: async () => { called = true; },
  });
  assert.equal(out.status, "not_applicable");
  assert.equal(called, false);
});

test("retractable roof: weather is read but the roof state is unknown, not assumed", async () => {
  const out = await getGameWeather({
    ...GNB, roofType: "retractable", nowMs: NOW_AFTER, fetchImpl: respond(fx("openmeteo-archive-gnb-2025-10-12.json")),
  });
  assert.equal(out.status, "read");
  assert.equal(out.roof_open_probability, null);
});

test("never fabricates a value: HTTP error, timeout, empty body and partial window are all not_read", async () => {
  const base = { ...GNB, nowMs: NOW_AFTER };
  assert.deepEqual((await getGameWeather({ ...base, fetchImpl: respond({}, 500) })).reason, "http_500");
  assert.equal((await getGameWeather({ ...base, fetchImpl: respond({}) })).reason, "no_data");
  assert.equal((await getGameWeather({
    ...base, fetchImpl: async () => { const e = new Error("x"); e.name = "AbortError"; throw e; },
  })).reason, "timeout");
  assert.equal((await getGameWeather({
    ...base, fetchImpl: async () => { throw new Error("dns"); },
  })).reason, "network");

  const partial = fx("openmeteo-archive-gnb-2025-10-12.json");
  partial.hourly.temperature_2m = partial.hourly.temperature_2m.map((v, i) => (i === 19 ? null : v));
  const out = await getGameWeather({ ...base, fetchImpl: respond(partial) });
  assert.equal(out.status, "not_read");
  assert.equal(out.reason, "incomplete_window");
  for (const forbidden of ["temp_f", "wind_mph", "precip_in"]) {
    assert.equal(out[forbidden], undefined, `${forbidden} must be absent on a failed read`);
  }
});

test("rejects bad input instead of guessing", async () => {
  assert.equal((await getGameWeather({ lat: "x", lon: 1, kickoffAt: GNB.kickoffAt })).reason, "invalid_coordinates");
  assert.equal((await getGameWeather({ lat: 95, lon: 1, kickoffAt: GNB.kickoffAt })).reason, "invalid_coordinates");
  assert.equal((await getGameWeather({ lat: 1, lon: 1, kickoffAt: "not a date" })).reason, "invalid_kickoff");
  const far = await getGameWeather({
    lat: 1, lon: 1, kickoffAt: "2027-01-01T00:00:00Z", nowMs: Date.parse("2026-09-30T00:00:00Z"), fetchImpl: respond({}),
  });
  assert.equal(far.reason, "beyond_forecast_horizon");
});

test("stadium table: every venue has valid coordinates, a timezone and a known roof type", () => {
  const roofs = new Set(["outdoors", "dome", "retractable"]);
  for (const [id, s] of Object.entries(stadiums)) {
    assert.ok(Math.abs(s.lat) <= 90 && Math.abs(s.lon) <= 180, `${id} coordinates`);
    assert.ok(s.tz && s.tz.includes("/"), `${id} timezone`);
    assert.ok(roofs.has(s.roof_type), `${id} roof_type ${s.roof_type}`);
  }
});

test("stadium table agrees with the existing team-keyed table on every US home venue (drift guard)", () => {
  const byName = new Map(Object.values(stadiums).map((s) => [s.name, s]));
  let compared = 0;
  for (const [team, old] of Object.entries(NFL_STADIUMS)) {
    const match = [...byName.values()].find((s) => Math.abs(s.lat - old.lat) < 0.02 && Math.abs(s.lon - old.lng) < 0.02);
    assert.ok(match, `${team} (${old.name}) has no matching venue in stadiums.json within 0.02 degrees`);
    compared += 1;
  }
  assert.ok(compared >= 30, `compared ${compared}`);
});

test("stadium table corrects the old is_dome flag: retractable venues are not treated as domes", () => {
  for (const [team, old] of Object.entries(NFL_STADIUMS)) {
    if (!old.is_dome) continue;
    const venue = Object.values(stadiums).find((s) => Math.abs(s.lat - old.lat) < 0.02 && Math.abs(s.lon - old.lng) < 0.02);
    assert.notEqual(venue.roof_type, "outdoors", `${team} is a roofed venue`);
  }
  for (const id of ["ATL97", "DAL00", "HOU00", "IND00", "PHO00"]) {
    assert.equal(stadiums[id].roof_type, "retractable", id);
  }
});
