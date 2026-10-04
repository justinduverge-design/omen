"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { runWeeklyStats, buildWeeklyRows, seasonsFor, URLS } = require("../src/omen_nflverse_weekly_stats_cron");

const STATS_HEADER = "player_id,player_display_name,season,week,season_type,passing_yards,passing_tds,passing_interceptions,carries,rushing_yards,rushing_tds,receptions,targets,receiving_yards,receiving_tds,fantasy_points_ppr";
const SNAPS_HEADER = "game_id,season,game_type,week,player,pfr_player_id,position,team,offense_snaps,offense_pct";

const quiet = { info() {}, warn() {}, error() {} };

function statsCsv(lines) { return [STATS_HEADER, ...lines].join("\n") + "\n"; }
function snapsCsv(lines) { return [SNAPS_HEADER, ...lines].join("\n") + "\n"; }

const players = new Map([["00-0001", "omen:player:gsis.00-0001"], ["00-0002", "omen:player:gsis.00-0002"], ["00-0003", "omen:player:gsis.00-0003"]]);

test("stat columns map by name; empty values are NULL, never 0", () => {
  const { rows, unmatched } = buildWeeklyRows({
    statRows: [{ player_id: "00-0001", season: "2026", week: "3", passing_yards: "", passing_tds: "", passing_interceptions: "",
                 carries: "2", rushing_yards: "11", rushing_tds: "0", receptions: "6", targets: "9", receiving_yards: "84",
                 receiving_tds: "1", fantasy_points_ppr: "21.5" }],
    snapRows: [], playerIdByGsis: players, gsisByPfr: new Map(),
  });
  assert.deepEqual(unmatched, []);
  assert.deepEqual(rows, [{
    player_id: "omen:player:gsis.00-0001", season: 2026, week: 3,
    pass_yards: null, pass_tds: null, interceptions: null, rush_yards: 11, rush_tds: 0, carries: 2,
    targets: 9, receptions: 6, rec_yards: 84, rec_tds: 1, snaps: null, snap_share: null, fantasy_points_ppr: 21.5,
  }]);
});

test("snaps join through pfr id to gsis; a snap-only player-week keeps the stat columns NULL", () => {
  const { rows } = buildWeeklyRows({
    statRows: [{ player_id: "00-0001", season: "2026", week: "1", targets: "5", fantasy_points_ppr: "9" }],
    snapRows: [
      { pfr_player_id: "AbcdEf00", season: "2026", week: "1", offense_snaps: "50", offense_pct: "0.77" },
      { pfr_player_id: "LineMa00", season: "2026", week: "1", offense_snaps: "65", offense_pct: "1" },
      { pfr_player_id: "Defend00", season: "2026", week: "1", offense_snaps: "0", offense_pct: "0" },
    ],
    playerIdByGsis: players,
    gsisByPfr: new Map([["AbcdEf00", "00-0001"], ["LineMa00", "00-0002"], ["Defend00", "00-0003"]]),
  });
  const byId = Object.fromEntries(rows.map((r) => [r.player_id, r]));
  assert.equal(byId["omen:player:gsis.00-0001"].snaps, 50);
  assert.equal(byId["omen:player:gsis.00-0001"].snap_share, 0.77);
  assert.equal(byId["omen:player:gsis.00-0001"].targets, 5);
  assert.equal(byId["omen:player:gsis.00-0002"].snaps, 65);
  assert.equal(byId["omen:player:gsis.00-0002"].targets, null);
  assert.equal(byId["omen:player:gsis.00-0003"], undefined, "no offensive snaps, nothing to store");
});

test("a player the crosswalk cannot resolve is skipped and counted, never matched by name", () => {
  const { rows, unmatched } = buildWeeklyRows({
    statRows: [
      { player_id: "00-9999", player_display_name: "Omen Player", season: "2026", week: "2", targets: "4" },
      { player_id: "", player_display_name: "No Id", season: "2026", week: "2" },
    ],
    snapRows: [{ pfr_player_id: "Unkn00", player: "Omen Player", season: "2026", week: "2", offense_snaps: "30", offense_pct: "0.5" }],
    playerIdByGsis: new Map([["00-0001", "omen:player:gsis.00-0001"]]),
    gsisByPfr: new Map(),
  });
  assert.deepEqual(rows, []);
  assert.deepEqual(unmatched.map((u) => [u.source, u.reason]), [
    ["stats", "gsis_id_not_in_crosswalk"], ["stats", "no_gsis_id"], ["snaps", "pfr_id_not_in_nflverse_players"],
  ]);
});

function fakeClient({ tableMissing = false } = {}) {
  const state = { events: [], rows: new Map(), ops: [] };
  let nextId = 100;
  const client = {
    state,
    from(table) {
      if (table === "nflverse_weekly_stats") {
        return {
          select: () => ({ limit: async () => (tableMissing ? { data: null, error: { code: "PGRST205" } } : { data: [], error: null }) }),
          upsert: async (batch, opts) => {
            assert.equal(opts.onConflict, "player_id,season,week");
            for (const r of batch) {
              assert.ok(state.events.some((e) => e.id === r.ingest_event_id), "the event exists before its rows");
              state.rows.set(`${r.player_id}|${r.season}|${r.week}`, r);
            }
            state.ops.push("upsert");
            return { error: null };
          },
        };
      }
      if (table === "players") {
        const q = { select: () => q, not: () => q, range: async () => ({ data: [...players].map(([gsis_id, id]) => ({ id, gsis_id })), error: null }) };
        return q;
      }
      if (table === "data_events") {
        return {
          insert: (row) => ({ select: () => ({ single: async () => {
            const event = { ...row, id: nextId++ };
            state.events.push(event);
            state.ops.push("event");
            return { data: { id: event.id }, error: null };
          } }) }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
  return client;
}

function fetchFor(files) {
  return async (url) => {
    if (!(url in files)) return new Response("missing", { status: 404 });
    return new Response(files[url]);
  };
}

const FILES = {
  [URLS.players]: "gsis_id,pfr_id,display_name\n00-0001,AbcdEf00,A\n00-0002,LineMa00,B\n",
  [URLS.stats(2026)]: statsCsv([
    "00-0001,A,2026,1,REG,,,,3,20,0,5,7,60,1,18.0",
    "00-0002,B,2026,1,REG,250,2,1,4,12,0,0,0,0,0,17.2",
  ]),
  [URLS.snaps(2026)]: snapsCsv(["g1,2026,REG,1,A,AbcdEf00,WR,CHI,50,0.8"]),
};

test("a run writes one data_events ingest first, then upserts every player-week naming it", async () => {
  const client = fakeClient();
  const result = await runWeeklyStats({ client, seasons: [2026], fetchImpl: fetchFor(FILES), log: quiet });
  assert.deepEqual(result, { written: 2, unmatched: 0, eventId: 100 });
  assert.deepEqual(client.state.ops, ["event", "upsert"]);
  const [event] = client.state.events;
  assert.equal(event.event, "ingest");
  assert.equal(event.subject, "nflverse_weekly_stats");
  assert.equal(event.provider, "nflverse");
  assert.equal(event.rights_basis, "nflverse_open_data");
  assert.match(event.source_ref, /^sha256:[0-9a-f]{64}$/);
  assert.equal(event.row_count, 2);
  assert.deepEqual(event.details.weeks, ["2026-1"]);
  assert.equal(client.state.rows.get("omen:player:gsis.00-0001|2026|1").snap_share, 0.8);
});

test("a re-run with the same data rewrites the same rows and only moves ingest_event_id", async () => {
  const client = fakeClient();
  await runWeeklyStats({ client, seasons: [2026], fetchImpl: fetchFor(FILES), log: quiet });
  const first = JSON.parse(JSON.stringify([...client.state.rows.values()]));
  await runWeeklyStats({ client, seasons: [2026], fetchImpl: fetchFor(FILES), log: quiet });
  const second = [...client.state.rows.values()];
  assert.equal(client.state.events[0].source_ref, client.state.events[1].source_ref);
  assert.deepEqual(second.map(({ ingest_event_id, ...r }) => r), first.map(({ ingest_event_id, ...r }) => r));
  assert.ok(second.every((r) => r.ingest_event_id === 101));
});

test("too many unmatched players refuses the run before anything is written", async () => {
  const client = fakeClient();
  const files = { ...FILES, [URLS.stats(2026)]: statsCsv([
    "00-0001,A,2026,1,REG,,,,3,20,0,5,7,60,1,18.0",
    "00-8888,X,2026,1,REG,,,,1,1,0,0,0,0,0,0.1",
  ]) };
  await assert.rejects(runWeeklyStats({ client, seasons: [2026], fetchImpl: fetchFor(files), log: quiet }), /refused: 1 of 3 rows unmatched/);
  assert.deepEqual(client.state.ops, []);
});

test("a missing required column fails before any write", async () => {
  const client = fakeClient();
  const files = { ...FILES, [URLS.stats(2026)]: "player_id,season,week\n00-0001,2026,1\n" };
  await assert.rejects(runWeeklyStats({ client, seasons: [2026], fetchImpl: fetchFor(files), log: quiet }));
  assert.deepEqual(client.state.ops, []);
});

test("before step 14 is applied the run writes nothing, not even a data_events row", async () => {
  const client = fakeClient({ tableMissing: true });
  const result = await runWeeklyStats({ client, seasons: [2026], fetchImpl: fetchFor(FILES), log: quiet });
  assert.deepEqual(result, { skipped: "table_absent" });
  assert.deepEqual(client.state.ops, []);
});

test("the season's first two weeks also re-read the previous season", () => {
  assert.deepEqual(seasonsFor({ season: 2026, week: 1 }), [2025, 2026]);
  assert.deepEqual(seasonsFor({ season: 2026, week: 5 }), [2026]);
});

test("the job runs Tuesday and Wednesday in the cron image", () => {
  const dockerfile = fs.readFileSync(path.join(__dirname, "..", "Dockerfile.cron"), "utf8");
  assert.match(dockerfile, /\* \* 2,3 node \/app\/src\/omen_nflverse_weekly_stats_cron\.js/);
});
