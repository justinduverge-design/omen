"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { SIGHT_DRIVER_LABELS, sightDriverLabel } = require("../src/services/footballWarehouse/sightRepository");

// The walk on the founder's phone (2026-10-22) showed "Production Ppg" and "Epa Per Target" under "What moved the call".
test("Sight drivers carry plain-English labels and never a model key", () => {
  assert.equal(sightDriverLabel("epa_per_target"), "Value per target");
  assert.equal(sightDriverLabel("production_ppg"), "Points per game");
  assert.equal(sightDriverLabel("not_a_real_input"), null);
  for (const label of Object.values(SIGHT_DRIVER_LABELS)) assert.doesNotMatch(label, /_/);
});

test("every input a Sight metric weighs has a label", () => {
  const dir = path.join(__dirname, "../src/services/footballWarehouse");
  const keys = new Set();
  for (const file of ["sightV1.js", "kdefMetric.js", "ratSkillMetric.js"]) {
    const source = fs.readFileSync(path.join(dir, file), "utf8");
    for (const match of source.matchAll(/features\.([a-z_]+) =/g)) keys.add(match[1]);
    for (const match of source.matchAll(/key: "([a-z_]+)"/g)) keys.add(match[1]);
  }
  const missing = [...keys].filter((key) => !SIGHT_DRIVER_LABELS[key]);
  assert.deepEqual(missing, []);
});

test("a sentence that ends on a name like Brian Thomas Jr. ends with one full stop", () => {
  const { endSentence } = require("../src/utils/sentence");
  assert.equal(endSentence("Start Mike Evans over KC Concepcion Jr.."), "Start Mike Evans over KC Concepcion Jr.");
  assert.equal(endSentence("Start Mike Evans over Brian Thomas."), "Start Mike Evans over Brian Thomas.");
});
