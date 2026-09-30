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

// A synthetic day of hourly data: every hour 60°F, 5 mph, and `rain` maps a UTC hour stamp to inches.
function syntheticDay(rain = {}, { prefix = "", gust = {} } = {}) {
  const time = [];
  const series = { temperature_2m: [], wind_speed_10m: [], wind_gusts_10m: [], precipitation: [] };
  for (let hour = 0; hour < 24; hour += 1) {
    time.push(`2025-10-12T${String(hour).padStart(2, "0")}:00`);
    series.temperature_2m.push(60);
    series.wind_speed_10m.push(5);
    series.wind_gusts_10m.push(gust[hour] ?? 8);
    series.precipitation.push(rain[hour] ?? 0);
  }
  const hourly = { time };
  for (const [k, v] of Object.entries(series)) hourly[`${k}${prefix}`] = v;
  return { hourly };
}

test("chooseKind: future is a forecast; a past game is observed unless a vintage is asked for", () => {
  const now = Date.parse("2026-10-01T00:00:00Z");
  assert.equal(chooseKind({ kickoffMs: now + 1e6, nowMs: now }), "forecast");
  assert.equal(chooseKind({ kickoffMs: now - 1e6, nowMs: now }), "observed");
  assert.equal(chooseKind({ kickoffMs: now - 1e6, nowMs: now, leadDays: 3 }), "forecast_at_lead");
  assert.equal(chooseKind({ kickoffMs: now - 1e6, nowMs: now, archive: "short_lead" }), "short_lead_archive");
  // A future game is always the live forecast, whatever vintage is requested.
  assert.equal(chooseKind({ kickoffMs: now + 1e6, nowMs: now, leadDays: 3 }), "forecast");
});

test("observed: averages the three-hour game window, claims no forecast time", async () => {
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
  assert.equal(out.as_of, null, "an archived read must not carry a timestamp that looks like a forecast time");
  assert.equal(out.attribution, ATTRIBUTION);
  assert.equal(out.roof_open_probability, 1);
});

test("forecast at lead: a call issued three days out reads the previous-runs API, labelled with its lead", async () => {
  let requested;
  const out = await getGameWeather({
    ...GNB, leadDays: 3, nowMs: NOW_AFTER,
    fetchImpl: async (url) => { requested = url; return respond(fx("openmeteo-previousruns-day3-gnb-2025-10-12.json"))(); },
  });
  assert.equal(out.status, "read");
  assert.equal(out.kind, "forecast_at_lead");
  assert.equal(out.lead_days, 3);
  assert.match(requested, /^https:\/\/previous-runs-api\.open-meteo\.com\/v1\/forecast/);
  assert.match(requested, /temperature_2m_previous_day3/);
  assert.equal(out.precip_probability_pct, null, "the previous-runs API has no precipitation probability");
  assert.equal(out.as_of, null);
});

test("forecast at lead: an un-archived vintage is refused, never filled from another vintage", async () => {
  const gap = fx("openmeteo-previousruns-day3-gnb-2025-10-12.json");
  gap.hourly.wind_speed_10m_previous_day3 = gap.hourly.wind_speed_10m_previous_day3.map(() => null);
  let calls = 0;
  const out = await getGameWeather({
    ...GNB, leadDays: 3, nowMs: NOW_AFTER, fetchImpl: async () => { calls += 1; return respond(gap)(); },
  });
  assert.equal(out.status, "not_read");
  assert.equal(out.reason, "lead_time_unavailable");
  assert.equal(out.lead_days, 3);
  assert.equal(calls, 1, "must not silently fall back to a different endpoint");
});

test("short-lead archive is available only when asked for, and says what it is", async () => {
  const out = await getGameWeather({
    ...GNB, archive: "short_lead", nowMs: NOW_AFTER, fetchImpl: respond(fx("openmeteo-shortleadarchive-gnb-2025-10-12.json")),
  });
  assert.equal(out.status, "read");
  assert.equal(out.kind, "short_lead_archive");
  assert.equal(out.as_of, null);
});

test("rejects a lead outside 1-7 days and a request for two vintages at once", async () => {
  const base = { ...GNB, nowMs: NOW_AFTER, fetchImpl: respond({}) };
  assert.equal((await getGameWeather({ ...base, leadDays: 0 })).reason, "invalid_lead_days");
  assert.equal((await getGameWeather({ ...base, leadDays: 8 })).reason, "invalid_lead_days");
  assert.equal((await getGameWeather({ ...base, leadDays: 2.5 })).reason, "invalid_lead_days");
  assert.equal((await getGameWeather({ ...base, leadDays: 3, archive: "short_lead" })).reason, "conflicting_vintage_request");
});

test("precipitation is a preceding-hour accumulation: rain before kickoff is excluded, rain in the last game hour is included", async () => {
  // Stamp 18 = rain that fell 17:00-18:00 (BEFORE the 18:00 kickoff). Stamp 21 = rain 20:00-21:00 (inside).
  const before = await getGameWeather({
    ...GNB, nowMs: NOW_AFTER, fetchImpl: respond(syntheticDay({ 18: 0.5 })),
  });
  assert.equal(before.precip_in, 0, "the hour ending at kickoff is pregame rain");
  const last = await getGameWeather({
    ...GNB, nowMs: NOW_AFTER, fetchImpl: respond(syntheticDay({ 21: 0.4 })),
  });
  assert.equal(last.precip_in, 0.4, "the hour ending at kickoff+3h is inside the window");
  const inside = await getGameWeather({
    ...GNB, nowMs: NOW_AFTER, fetchImpl: respond(syntheticDay({ 19: 0.1, 20: 0.2, 21: 0.3 })),
  });
  assert.equal(inside.precip_in, 0.6);
});

test("gusts are a preceding-hour maximum: the pregame gust is excluded", async () => {
  const out = await getGameWeather({
    ...GNB, nowMs: NOW_AFTER, fetchImpl: respond(syntheticDay({}, { gust: { 18: 40, 19: 12, 20: 15, 21: 20 } })),
  });
  assert.equal(out.gust_mph, 20, "the 40 mph gust belongs to the hour before kickoff");
});

test("instantaneous temperature and wind come from the hours that begin inside the window", async () => {
  const day = syntheticDay();
  day.hourly.temperature_2m[17] = -50; // hour before kickoff: must not count
  day.hourly.temperature_2m[21] = 200; // hour after the window: must not count
  const out = await getGameWeather({ ...GNB, nowMs: NOW_AFTER, fetchImpl: respond(day) });
  assert.equal(out.temp_f, 60);
});

test("forecast: a future kickoff uses the live forecast endpoint and stamps the retrieval time", async () => {
  let requested;
  const nowMs = Date.parse("2026-09-30T00:00:00Z");
  const out = await getGameWeather({
    lat: 44.5013, lon: -88.0622, kickoffAt: "2026-10-04T17:00:00Z", nowMs,
    fetchImpl: async (url) => { requested = url; return respond(fx("openmeteo-forecast-gnb-2026-10-04.json"))(); },
  });
  assert.equal(out.status, "read");
  assert.equal(out.kind, "forecast");
  assert.match(requested, /^https:\/\/api\.open-meteo\.com\/v1\/forecast/);
  assert.match(requested, /temperature_unit=fahrenheit/);
  assert.match(requested, /timezone=UTC/);
  assert.equal(out.as_of, new Date(nowMs).toISOString());
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
