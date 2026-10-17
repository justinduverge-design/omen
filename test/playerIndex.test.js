"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { sleeperRows } = require("../src/services/footballWarehouse/playerIndexStage");

test("Sleeper records index through their GSIS or ESPN id; neither means no index entry, never a name guess", () => {
  const rows = sleeperRows({
    "4046": { gsis_id: "00-0033873", yahoo_id: 30123, full_name: "Patrick Mahomes" },
    "9999": { full_name: "No Gsis" },
    "DEF": { gsis_id: "x" },
    "1234": { gsis_id: " 00-0012345 ", yahoo_id: "abc" },
    "5555": { espn_id: 4241478, yahoo_id: "33000", full_name: "Espn Only" },
  });
  assert.deepEqual(rows, [
    { sleeperId: "1234", gsisId: "00-0012345", espnId: null, yahooId: null },
    { sleeperId: "4046", gsisId: "00-0033873", espnId: null, yahooId: "30123" },
    { sleeperId: "5555", gsisId: null, espnId: "4241478", yahooId: "33000" },
  ]);
});

test("a non-object payload is refused", () => {
  assert.throws(() => sleeperRows([]), /not an object/);
});

test("a record with neither id still indexes by name and birth date, with suffixes and punctuation ignored", () => {
  const { normalName } = require("../src/services/footballWarehouse/playerIndexStage");
  assert.equal(normalName("Marvin Harrison Jr."), normalName("Marvin Harrison"));
  assert.equal(normalName("D.K. Metcalf"), normalName("DK Metcalf"));
  const rows = sleeperRows({ "7569": { full_name: "Nico Collins", birth_date: "1999-03-19", yahoo_id: 34000 }, "1": { full_name: "No Date" } });
  assert.deepEqual(rows, [{ sleeperId: "7569", gsisId: null, espnId: null, name: "nicocollins", birthDate: "1999-03-19", yahooId: "34000" }]);
});
