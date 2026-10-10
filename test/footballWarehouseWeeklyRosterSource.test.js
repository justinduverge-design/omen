"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { adaptWeeklyRosterCsv, REQUIRED_COLUMNS, sourceUrlForSeason } = require("../src/services/footballWarehouse/weeklyRosterSource");

const HEADERS = [...REQUIRED_COLUMNS, "position", "status", "game_type", "jersey_number"];
const line = (v) => HEADERS.map((h) => v[h] ?? "").join(",");
const base = { season: "2008", week: "8", team: "SL", gsis_id: "00-0001", position: "CB", status: "ACT", game_type: "REG", jersey_number: "31" };
const raw = (rows) => Buffer.from(`${HEADERS.join(",")}\n${rows.map(line).join("\n")}\n`, "utf8");
const args = (buffer) => ({
  raw: buffer, season: 2008, sourceUrl: sourceUrlForSeason(2008), runId: "roster-2008-a",
  playerIdByGsis: new Map([["00-0001", "omen:player:gsis.00-0001"], ["00-0002", "omen:player:gsis.00-0002"]]),
});

test("historic franchise codes resolve and a repeated player-week keeps the last row, reporting the rest", () => {
  const result = adaptWeeklyRosterCsv(args(raw([
    { ...base, status: "TRD" },
    { ...base, status: "ACT" },
    { ...base, gsis_id: "00-0002", team: "ARZ" },
  ])));
  assert.equal(result.rows.length, 2);
  const kept = result.rows.find((r) => r.playerId === "omen:player:gsis.00-0001");
  assert.equal(kept.rosterStatus, "ACT");
  assert.equal(kept.teamId, "omen:team:la");
  assert.equal(result.rows.find((r) => r.playerId === "omen:player:gsis.00-0002").teamId, "omen:team:ari");
  assert.equal(result.unmatchedRows, 1);
  assert.equal(result.unmatched[0].reason, "superseded_duplicate");
  assert.equal(result.receipt.sourceRows, 3);
  assert.equal(result.receipt.sourceRows, result.rows.length + result.unmatchedRows);
  assert.equal(result.receipt.metadata.duplicate_policy, "last_row_wins");
  assert.equal(result.receipt.metadata.superseded_duplicate_rows, 1);
});

test("an unknown team code is still a hard error", () => {
  assert.throws(() => adaptWeeklyRosterCsv(args(raw([{ ...base, team: "XXX" }]))), /team is invalid/);
});

test("an unreadable jersey number becomes null and is counted instead of failing the season", () => {
  const result = adaptWeeklyRosterCsv(args(raw([{ ...base, jersey_number: "69B" }, { ...base, gsis_id: "00-0002", jersey_number: "12" }])));
  assert.equal(result.rows.find((r) => r.playerId === "omen:player:gsis.00-0001").jerseyNumber, null);
  assert.equal(result.rows.find((r) => r.playerId === "omen:player:gsis.00-0002").jerseyNumber, 12);
  assert.equal(result.receipt.metadata.invalid_jersey_numbers, 1);
});
