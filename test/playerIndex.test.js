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

test("the DynastyProcess crosswalk yields GSIS-keyed Yahoo and Sleeper ids, quoted fields included", () => {
  const { dynastyProcessRows } = require("../src/services/footballWarehouse/playerIndexStage");
  const csv = 'mfl_id,gsis_id,sleeper_id,yahoo_id,name\n1,00-0036554,7569,33477,"Collins, Nico"\n2,NA,1,2,x\n3,00-0000001,NA,NA,"no ids"\n';
  assert.deepEqual(dynastyProcessRows(csv), [{ gsisId: "00-0036554", yahooId: "33477", sleeperId: "7569" }]);
  assert.throws(() => dynastyProcessRows("a,b\n1,2\n"), /missing an id column/);
});
