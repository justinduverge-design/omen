#!/usr/bin/env node
// Validates src/data/stadiums.json against Open-Meteo: for each venue, the timezone the API
// derives from the coordinates must match the timezone we recorded, and the elevation must be
// plausible. A wrong latitude or longitude puts a stadium in the wrong timezone or in the sea, so
// this catches a bad coordinate without a human looking at a map.  Needs network.  Exit 1 on failure.
import { readFileSync } from "node:fs";

const { stadiums } = JSON.parse(readFileSync(new URL("../src/data/stadiums.json", import.meta.url), "utf8"));
const failures = [];
let checked = 0;

// Zones the API may report under a different but equivalent name.
const ALIASES = new Map([["America/Indianapolis", "America/Indiana/Indianapolis"]]);
const canon = (tz) => ALIASES.get(tz) || tz;

for (const [id, s] of Object.entries(stadiums)) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}&current=temperature_2m&timezone=auto`;
  let body;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    body = await res.json();
  } catch (err) {
    failures.push(`${id} ${s.name}: request failed (${err.message})`);
    continue;
  }
  checked += 1;
  if (canon(body.timezone) !== canon(s.tz)) failures.push(`${id} ${s.name}: recorded ${s.tz}, API says ${body.timezone}`);
  if (!(body.elevation > -50 && body.elevation < 3000)) failures.push(`${id} ${s.name}: implausible elevation ${body.elevation}`);
  console.log(`${id.padEnd(6)} ${s.name.padEnd(34)} ${String(body.timezone).padEnd(30)} ${String(Math.round(body.elevation)).padStart(5)} m  ${s.roof_type}`);
  await new Promise((r) => setTimeout(r, 120));
}

console.log(`\nchecked ${checked} of ${Object.keys(stadiums).length}`);
if (failures.length) {
  console.error("\nFAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("all stadiums consistent with Open-Meteo");
