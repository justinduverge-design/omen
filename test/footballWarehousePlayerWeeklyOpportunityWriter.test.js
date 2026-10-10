"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createPlayerWeeklyOpportunityWriter } = require("../src/services/footballWarehouse/playerWeeklyOpportunityWriter");

function fakePool(responder) {
  const statements = [];
  return { statements, async connect() {
    return { async query(q) { const text = typeof q === "string" ? q : q.text; statements.push(text); return responder(text); }, release() {} };
  } };
}

test("the writer validates its pool, season and tolerance before touching the database", async () => {
  assert.throws(() => createPlayerWeeklyOpportunityWriter({}), TypeError);
  assert.throws(() => createPlayerWeeklyOpportunityWriter({ pool: fakePool(() => ({ rows: [] })), maxOutlierRatio: 2 }), RangeError);
  const writer = createPlayerWeeklyOpportunityWriter({ pool: fakePool(() => ({ rows: [] })) });
  await assert.rejects(writer.writeSeason({ season: 1990 }), TypeError);
});

test("a season with no succeeded play-by-play receipt rolls back with a stable code and writes nothing", async () => {
  const pool = fakePool(() => ({ rows: [] }));
  await assert.rejects(createPlayerWeeklyOpportunityWriter({ pool }).writeSeason({ season: 2026 }), (error) => error.code === "play_by_play_receipt_missing");
  assert.equal(pool.statements.at(-1), "ROLLBACK");
  assert.ok(!pool.statements.some((text) => /INSERT INTO football\.nfl_player_weekly_opportunity|DELETE FROM/.test(text)));
});

test("a season with no weekly stat rows fails with stats_missing before the guard or any write", async () => {
  const pool = fakePool((text) => /FROM football\.warehouse_ingest_events/.test(text) ? { rows: [{ id: 7 }] }
    : /FROM football\.nfl_player_weekly_stats WHERE season/.test(text) ? { rows: [{ n: 0 }] } : { rows: [] });
  await assert.rejects(createPlayerWeeklyOpportunityWriter({ pool }).writeSeason({ season: 2026 }), (error) => error.code === "stats_missing");
  assert.equal(pool.statements[0], "BEGIN ISOLATION LEVEL REPEATABLE READ");
  assert.equal(pool.statements.at(-1), "ROLLBACK");
  assert.ok(!pool.statements.some((text) => /DELETE FROM/.test(text)));
});
