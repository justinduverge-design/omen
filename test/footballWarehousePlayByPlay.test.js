"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");
const { acquirePlayByPlaySource, sourceUrlForSeason } = require("../src/services/footballWarehouse/playByPlayAcquisition");
const { adaptPlayByPlayCsvGzip } = require("../src/services/footballWarehouse/playByPlaySource");
const { createPlayByPlayWriter, PlayByPlayIngestError } = require("../src/services/footballWarehouse/playByPlayWriter");

const HEADERS = "season,week,game_id,play_id,posteam,defteam,passer_player_id,rusher_player_id,receiver_player_id,play_type,desc,epa,wpa,cpoe,air_epa,yac_epa,success,extra\n";
const CSV = `${HEADERS}2026,1,2026_01_BUF_NYJ,42,BUF,NYJ,00-1,,,pass,\"Complete, right\",0.4,0.02,3.1,0.2,0.1,1,kept\n`;
const RAW = zlib.gzipSync(CSV);
const HASH = `sha256:${"a".repeat(64)}`;

test("acquires only the exact bounded season gzip asset", async () => {
  const calls = [];
  const result = await acquirePlayByPlaySource({ season: 2026, fetchImpl: async (...args) => {
    calls.push(args);
    return { status: 200, headers: new Headers({ "content-type": "application/gzip", "content-length": String(RAW.length) }), body: new ReadableStream({ start(c) { c.enqueue(RAW); c.close(); } }) };
  } });
  assert.deepEqual(result.raw, RAW);
  assert.equal(calls[0][0], sourceUrlForSeason(2026));
  await assert.rejects(acquirePlayByPlaySource({ season: 2026, sourceUrl: `${sourceUrlForSeason(2026)}?x=1`, fetchImpl: async () => assert.fail() }), /allowlisted/);
});

test("strict adapter preserves the complete source row and typed play metrics", () => {
  const result = adaptPlayByPlayCsvGzip({ raw: RAW, season: 2026, sourceUrl: sourceUrlForSeason(2026), runId: "pbp-2026-a", playerIdByGsis: new Map([["00-1", "omen:player:gsis.00-1"]]) });
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.rows[0], {
    season: 2026, week: 1, gameId: "2026_01_BUF_NYJ", playId: 42,
    posteamId: "omen:team:buf", defteamId: "omen:team:nyj",
    passerPlayerId: "omen:player:gsis.00-1", rusherPlayerId: null, receiverPlayerId: null,
    playType: "pass", descText: "Complete, right", epa: 0.4, wpa: 0.02, cpoe: 3.1,
    airEpa: 0.2, yacEpa: 0.1, success: true,
    sourceRow: { season: "2026", week: "1", game_id: "2026_01_BUF_NYJ", play_id: "42", posteam: "BUF", defteam: "NYJ", passer_player_id: "00-1", rusher_player_id: "", receiver_player_id: "", play_type: "pass", desc: "Complete, right", epa: "0.4", wpa: "0.02", cpoe: "3.1", air_epa: "0.2", yac_epa: "0.1", success: "1", extra: "kept" },
  });
  assert.match(result.receipt.sourceRef, /^sha256:[0-9a-f]{64}$/);
});

test("adapter skips and records unmatched participant identities without guessing", () => {
  const unmatched = adaptPlayByPlayCsvGzip({ raw: RAW, season: 2026, sourceUrl: sourceUrlForSeason(2026), runId: "pbp-2026-a", playerIdByGsis: new Map() });
  assert.equal(unmatched.rows.length, 0);
  assert.equal(unmatched.unmatchedRows, 1);
  assert.deepEqual(unmatched.unmatched[0].providerIds, ["00-1"]);
});

test("adapter fails closed for duplicate plays", () => {
  const duplicate = zlib.gzipSync(`${HEADERS}${CSV.slice(HEADERS.length)}${CSV.slice(HEADERS.length)}`);
  assert.throws(() => adaptPlayByPlayCsvGzip({ raw: duplicate, season: 2026, sourceUrl: sourceUrlForSeason(2026), runId: "pbp-2026-a", playerIdByGsis: new Map([["00-1", "omen:player:gsis.00-1"]]) }), /duplicate play/);
});

function writerInput() {
  const adapted = adaptPlayByPlayCsvGzip({ raw: RAW, season: 2026, sourceUrl: sourceUrlForSeason(2026), runId: "pbp-2026-a", playerIdByGsis: new Map([["00-1", "omen:player:gsis.00-1"]]) });
  return { season: 2026, ...adapted };
}
function fakePool({ failAt } = {}) {
  const calls = [];
  const client = { async query(query) {
    calls.push(query); const name = typeof query === "string" ? query : query.name;
    if (name === failAt) { const e = new Error("postgres://secret@private"); e.code = "23505"; throw e; }
    if (name === "warehouse-play-by-play-existing-v1") return { rows: [] };
    if (name === "warehouse-play-by-play-start-v1") return { rows: [{ id: 9 }] };
    if (name === "warehouse-play-by-play-stage-check-v1") return { rows: [{ row_count: 1, invalid_count: 0 }] };
    return { rows: [] };
  }, release() {} };
  return { calls, pool: { async connect() { return client; } } };
}

test("writer atomically replaces one season and succeeds its source-bound receipt", async () => {
  const db = fakePool();
  const result = await createPlayByPlayWriter({ pool: db.pool }).writeSeason(writerInput());
  assert.deepEqual(result, { state: "succeeded", ingestEventId: 9, writtenRows: 1 });
  const names = db.calls.map((q) => typeof q === "string" ? q : q.name);
  assert.deepEqual(names.slice(-4), ["warehouse-play-by-play-delete-v1", "warehouse-play-by-play-promote-v1", "warehouse-play-by-play-succeed-v1", "COMMIT"]);
  assert.ok(names.indexOf("warehouse-local-transaction-timeouts-v1") < names.indexOf("warehouse-play-by-play-lock-v1"));
});

test("writer rolls back and emits only a sanitized bounded failure receipt", async () => {
  const db = fakePool({ failAt: "warehouse-play-by-play-promote-v1" });
  await assert.rejects(createPlayByPlayWriter({ pool: db.pool }).writeSeason(writerInput()), (error) => {
    assert.ok(error instanceof PlayByPlayIngestError); assert.equal(error.code, "23505");
    assert.equal(error.message, "play-by-play ingest failed"); assert.doesNotMatch(error.message, /secret|private/); return true;
  });
  const names = db.calls.map((q) => typeof q === "string" ? q : q.name);
  assert.ok(names.indexOf("ROLLBACK") < names.indexOf("warehouse-play-by-play-failed-v1"));
});

test("writer validates source identity and row counts before connecting", async () => {
  let connects = 0;
  const writer = createPlayByPlayWriter({ pool: { async connect() { connects += 1; } } });
  const input = writerInput();
  await assert.rejects(writer.writeSeason({ ...input, receipt: { ...input.receipt, sourceRef: HASH, sourceRows: 2 } }), /sourceRows/);
  await assert.rejects(writer.writeSeason({ ...input, receipt: { ...input.receipt, sourceUrl: "https://example.com/pbp.gz" } }), /allowlisted/);
  assert.equal(connects, 0);
});

test("a large season is staged in bounded batches, never one giant statement", async () => {
  const input = writerInput();
  const template = input.rows[0];
  const count = 2_500;
  const rows = Array.from({ length: count }, (_, i) => ({ ...template, playId: i + 1 }));
  const calls = [];
  const client = { async query(query) {
    calls.push(query); const name = typeof query === "string" ? query : query.name;
    if (name === "warehouse-play-by-play-existing-v1") return { rows: [] };
    if (name === "warehouse-play-by-play-start-v1") return { rows: [{ id: 9 }] };
    if (name === "warehouse-play-by-play-stage-check-v1") return { rows: [{ row_count: count, invalid_count: 0 }] };
    return { rows: [] };
  }, release() {} };
  const result = await createPlayByPlayWriter({ pool: { async connect() { return client; } } }).writeSeason({
    ...input, rows, receipt: { ...input.receipt, sourceRows: count },
  });
  assert.equal(result.writtenRows, count);
  const stage = calls.filter((q) => q.name === "warehouse-play-by-play-stage-v1");
  assert.deepEqual(stage.map((q) => JSON.parse(q.values[0]).length), [1000, 1000, 500]);
});
