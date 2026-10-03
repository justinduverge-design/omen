"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { buildCrosswalk, normalizeName, playerIdFor } = require("../src/services/playerCrosswalk");
const { writeCrosswalk, runCrosswalk } = require("../src/omen_player_crosswalk_cron");
const { parseCsv } = require("../src/services/csvRows");

const root = path.join(__dirname, "..");

function nv(gsis, name, birth, extra = {}) {
  const [first, ...rest] = name.split(" ");
  return { gsis_id: gsis, display_name: name, first_name: first, last_name: rest.join(" "), football_name: first,
           birth_date: birth, position: "WR", espn_id: "", latest_team: "CHI", status: "ACT", last_season: "2026", ...extra };
}
function sl(name, birth, extra = {}) {
  return { full_name: name, birth_date: birth, position: "WR", active: true, team: "CHI", ...extra };
}
const byKey = (rows, provider, id) => rows.find((r) => r.provider === provider && r.provider_player_id === id);

test("names normalize across accents, suffixes and punctuation", () => {
  assert.equal(normalizeName("Kenneth Walker III"), normalizeName("Kenneth Walker"));
  assert.equal(normalizeName("D'Andre Swift"), "dandreswift");
  assert.equal(normalizeName("Amon-Ra St. Brown"), "amonrastbrown");
  assert.equal(normalizeName("José Ramírez Jr."), "joseramirez");
});

test("ESPN ids come from nflverse; Sleeper matches on name + birth date; Yahoo rides on a matched Sleeper record", () => {
  const r = buildCrosswalk({
    nflversePlayers: [nv("00-0032464", "Kalif Raymond", "1994-08-08", { espn_id: "2973405" })],
    sleeperPlayers: { 4321: sl("Kalif Raymond", "1994-08-08", { yahoo_id: "29726" }) },
    minLastSeason: 2024,
  });
  const id = playerIdFor("00-0032464");
  assert.equal(id, "omen:player:gsis.00-0032464");
  assert.deepEqual(r.players.map((p) => p.id), [id]);
  assert.equal(byKey(r.providerIds, "nflverse", "00-0032464").player_id, id);
  assert.equal(byKey(r.providerIds, "espn", "2973405").match_method, "provider_supplied");
  assert.equal(byKey(r.providerIds, "sleeper", "4321").match_method, "name_birth_date");
  assert.equal(byKey(r.providerIds, "yahoo", "29726").player_id, id);
  assert.equal(r.unresolved.length, 0);
});

test("two NFL players with one name are told apart by birth date, never by name alone", () => {
  const r = buildCrosswalk({
    nflversePlayers: [nv("00-0034857", "Josh Allen", "1996-05-21", { position: "QB" }), nv("00-0035000", "Josh Allen", "1997-07-13", { position: "LB" })],
    sleeperPlayers: { 4984: sl("Josh Allen", "1996-05-21", { position: "QB" }) },
    minLastSeason: 2024,
  });
  assert.equal(byKey(r.providerIds, "sleeper", "4984").player_id, playerIdFor("00-0034857"));
});

test("anything uncertain is unresolved with a reason, never guessed", () => {
  const r = buildCrosswalk({
    nflversePlayers: [
      nv("00-1", "Same Name", "2000-01-01"), nv("00-2", "Same Name", "2000-01-01"),
      nv("00-3", "Real Match", "1999-02-02"), nv("00-4", "Other Guy", "1998-03-03"),
    ],
    sleeperPlayers: {
      10: sl("Same Name", "2000-01-01"),                         // two candidates
      11: sl("Real Match", "1999-02-02", { gsis_id: "00-4" }),  // Sleeper's own id disagrees
      12: sl("Nobody Known", "2001-01-01"),                     // no candidate, rostered
      13: sl("Nobody Free", "2001-01-01", { team: null }),      // no candidate, free agent: not recorded
      14: sl("Lineman", "2001-01-01", { position: "OL" }),      // not a fantasy position
    },
    minLastSeason: 2024,
  });
  assert.equal(byKey(r.unresolved, "sleeper", "10").reason, "ambiguous");
  assert.deepEqual(byKey(r.unresolved, "sleeper", "10").candidates, [playerIdFor("00-1"), playerIdFor("00-2")]);
  assert.equal(byKey(r.unresolved, "sleeper", "11").reason, "conflict");
  assert.equal(byKey(r.unresolved, "sleeper", "12").reason, "no_match");
  assert.equal(byKey(r.unresolved, "sleeper", "13"), undefined);
  assert.equal(byKey(r.unresolved, "sleeper", "14"), undefined);
  for (const id of ["10", "11", "12"]) assert.equal(byKey(r.providerIds, "sleeper", id), undefined);
});

test("Sleeper's gsis id is used when name + birth date finds nothing", () => {
  const r = buildCrosswalk({
    nflversePlayers: [nv("00-7", "Robert Smith", "1999-09-09")],
    sleeperPlayers: { 20: sl("Bobby Smith", "1999-09-09", { gsis_id: "00-7" }) },
    minLastSeason: 2024,
  });
  assert.equal(byKey(r.providerIds, "sleeper", "20").match_method, "provider_supplied");
});

test("two provider ids landing on one player, or one id on two players, are both refused", () => {
  const r = buildCrosswalk({
    nflversePlayers: [nv("00-8", "Twin Ids", "1990-01-01", { espn_id: "55" }), nv("00-9", "Shared Espn", "1991-01-01", { espn_id: "55" })],
    sleeperPlayers: { 30: sl("Twin Ids", "1990-01-01"), 31: sl("Twin Ids", "1990-01-01", { yahoo_id: "y" }) },
    minLastSeason: 2024,
  });
  assert.equal(byKey(r.providerIds, "espn", "55"), undefined, "one ESPN id on two players");
  assert.equal(byKey(r.providerIds, "sleeper", "30"), undefined, "two Sleeper ids on one player");
  assert.equal(byKey(r.providerIds, "sleeper", "31"), undefined);
  assert.equal(byKey(r.unresolved, "espn", "55").reason, "conflict");
  assert.equal(byKey(r.unresolved, "sleeper", "30").reason, "conflict");
  assert.equal(byKey(r.providerIds, "yahoo", "y"), undefined, "a Yahoo id from a refused Sleeper record is refused too");
});

test("long-retired players are left out unless a roster provider points at them", () => {
  const r = buildCrosswalk({
    nflversePlayers: [nv("00-10", "Old Timer", "1980-01-01", { last_season: "2012" }), nv("00-11", "Old Mapped", "1981-01-01", { last_season: "2015" })],
    sleeperPlayers: { 40: sl("Old Mapped", "1981-01-01") },
    minLastSeason: 2024,
  });
  assert.deepEqual(r.players.map((p) => p.id), [playerIdFor("00-11")]);
  assert.ok(r.providerIds.every((m) => m.player_id === playerIdFor("00-11")), "no mapping to a player left out");
});

test("CSV rows keep quoted commas and doubled quotes", () => {
  const rows = parseCsv('gsis_id,display_name,headshot\n00-1,"Smith, Jr.","a ""b"" c"\n', { required: ["gsis_id"] });
  assert.deepEqual(rows, [{ gsis_id: "00-1", display_name: "Smith, Jr.", headshot: 'a "b" c' }]);
  assert.throws(() => parseCsv("a,b\n1,2", { required: ["gsis_id"] }), /missing required column: gsis_id/);
});

function fakeDb(state) {
  const ops = [];
  const table = (name) => {
    const q = { filters: [] };
    const api = {
      select: () => ({ range: async (from, to) => ({ data: (state[name] || []).slice(from, to + 1), error: null }) }),
      upsert: async (rows, opts) => { ops.push({ op: "upsert", name, rows, opts }); return { error: null }; },
      insert: async (rows) => { ops.push({ op: "insert", name, rows: [].concat(rows) }); return { error: null }; },
      delete: () => {
        const where = {};
        const chain = {
          eq: (col, val) => {
            where[col] = val;
            if (Object.keys(where).length < 2) return chain;
            ops.push({ op: "delete", name, where });
            return Promise.resolve({ error: null });
          },
        };
        return chain;
      },
    };
    return api;
  };
  return { ops, from: table };
}

test("writing replaces moved mappings, inserts only new ones, clears what now resolves, and records the run", async () => {
  const P1 = playerIdFor("00-1"); const P2 = playerIdFor("00-2");
  const db = fakeDb({
    player_provider_ids: [
      { provider: "sleeper", provider_player_id: "1", player_id: P1 },  // unchanged
      { provider: "sleeper", provider_player_id: "2", player_id: P1 },  // moved to P2
      { provider: "sleeper", provider_player_id: "3", player_id: P2 },  // no longer produced
    ],
    player_identity_unresolved: [{ provider: "sleeper", provider_player_id: "9" }, { provider: "sleeper", provider_player_id: "8" }],
  });
  const lines = [];
  const summary = await writeCrosswalk({
    client: db,
    crosswalk: {
      players: [{ id: P1 }, { id: P2 }],
      providerIds: [
        { provider: "sleeper", provider_player_id: "1", player_id: P1, match_method: "name_birth_date" },
        { provider: "sleeper", provider_player_id: "2", player_id: P2, match_method: "name_birth_date" },
        { provider: "sleeper", provider_player_id: "9", player_id: P2, match_method: "name_birth_date" },
      ],
      unresolved: [{ provider: "sleeper", provider_player_id: "8", reason: "no_match", full_name: "X", candidates: [] }],
    },
    sourceRefValue: "sha256:" + "a".repeat(64),
    now: "2026-10-03T00:00:00Z",
    log: { info: (m) => lines.push(m), error: () => {} },
  });
  const deletes = db.ops.filter((o) => o.op === "delete");
  assert.deepEqual(deletes.filter((o) => o.name === "player_provider_ids").map((o) => o.where.provider_player_id).sort(), ["2", "3"]);
  const inserted = db.ops.filter((o) => o.op === "insert" && o.name === "player_provider_ids").flatMap((o) => o.rows);
  assert.deepEqual(inserted.map((r) => r.provider_player_id).sort(), ["2", "9"]);
  assert.deepEqual(deletes.filter((o) => o.name === "player_identity_unresolved").map((o) => o.where.provider_player_id), ["9"]);
  const event = db.ops.find((o) => o.name === "data_events").rows[0];
  assert.equal(event.event, "ingest");
  assert.equal(event.subject, "players");
  assert.match(event.source_ref, /^sha256:[0-9a-f]{64}$/);
  assert.equal(summary.stale_removed, 2);
  assert.equal(summary.inserted, 2);
  // the mapping deletes must happen before the inserts, or the one-id-per-player-per-provider key would refuse them
  const firstInsert = db.ops.findIndex((o) => o.op === "insert" && o.name === "player_provider_ids");
  const lastDelete = db.ops.map((o) => o.op === "delete" && o.name === "player_provider_ids").lastIndexOf(true);
  assert.ok(lastDelete < firstInsert);
});

test("a truncated source refuses to write anything", async () => {
  const db = fakeDb({});
  const fetchImpl = async (url) => ({ ok: true, text: async () => url.includes("sleeper") ? "{}" : "gsis_id,display_name,position,birth_date,espn_id\n00-1,A B,WR,2000-01-01,\n" });
  await assert.rejects(runCrosswalk({ client: db, fetchImpl, log: { info() {}, error() {} } }), /crosswalk refused/);
  assert.equal(db.ops.length, 0);
});

test("the crosswalk job is scheduled daily in the cron image", () => {
  const dockerfile = fs.readFileSync(path.join(root, "Dockerfile.cron"), "utf8");
  assert.match(dockerfile, /node \/app\/src\/omen_player_crosswalk_cron\.js/);
});
