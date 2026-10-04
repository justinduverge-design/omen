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

function fakeClient({ tableMissing = false, step15 = false } = {}) {
  const state = { events: [], rows: new Map(), ops: [], tables: {} };
  let nextId = 100;
  const client = {
    state,
    from(table) {
      if (table === "nflverse_weekly_stats") {
        return {
          select: (cols) => ({ limit: async () => {
            if (tableMissing) return { data: null, error: { code: "PGRST205" } };
            if (cols === "stats" && !step15) return { data: null, error: { code: "42703" } };
            return { data: [], error: null };
          } }),
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
      if (["nflverse_games", "nflverse_team_weekly_stats", "nflverse_weekly_rosters"].includes(table)) {
        return {
          upsert: async (batch, opts) => {
            state.tables[table] = state.tables[table] || new Map();
            for (const r of batch) state.tables[table].set(opts.onConflict.split(",").map((k) => r[k]).join("|"), r);
            state.ops.push(`upsert:${table}`);
            return { error: null };
          },
        };
      }
      if (table === "players") {
        const q = { select: () => q, not: () => q, range: async () => ({ data: [...players].map(([gsis_id, id]) => ({ id, gsis_id })), error: null }) };
        return q;
      }
      if (table === "data_events") {
        let subject = null;
        const last = () => [...state.events].reverse().find((e) => e.subject === subject) || null;
        const q = { select: () => q, eq: (_c, v) => { subject = v; return q; }, order: () => q, limit: () => q,
                    maybeSingle: async () => ({ data: last() ? { source_ref: last().source_ref } : null, error: null }) };
        return {
          select: q.select,
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

test("a forced re-run with the same data rewrites the same rows and only moves ingest_event_id", async () => {
  const client = fakeClient();
  await runWeeklyStats({ client, seasons: [2026], fetchImpl: fetchFor(FILES), log: quiet });
  const first = JSON.parse(JSON.stringify([...client.state.rows.values()]));
  await runWeeklyStats({ client, seasons: [2026], fetchImpl: fetchFor(FILES), log: quiet, force: true });
  const second = [...client.state.rows.values()];
  assert.equal(client.state.events[0].source_ref, client.state.events[1].source_ref);
  assert.deepEqual(second.map(({ ingest_event_id, ...r }) => r), first.map(({ ingest_event_id, ...r }) => r));
  assert.ok(second.every((r) => r.ingest_event_id === 101));
});

test("a source unchanged since the last ingest writes nothing; a changed one writes", async () => {
  const client = fakeClient();
  await runWeeklyStats({ client, seasons: [2026], fetchImpl: fetchFor(FILES), log: quiet });
  const again = await runWeeklyStats({ client, seasons: [2026], fetchImpl: fetchFor(FILES), log: quiet });
  assert.deepEqual(again, { skipped: "source_unchanged" });
  assert.equal(client.state.events.length, 1);
  const changed = { ...FILES, [URLS.snaps(2026)]: snapsCsv(["g1,2026,REG,1,A,AbcdEf00,WR,CHI,51,0.81"]) };
  const third = await runWeeklyStats({ client, seasons: [2026], fetchImpl: fetchFor(changed), log: quiet });
  assert.equal(third.written, 2);
  assert.equal(client.state.rows.get("omen:player:gsis.00-0001|2026|1").snaps, 51);
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

test("the job runs every day in the cron image", () => {
  const dockerfile = fs.readFileSync(path.join(__dirname, "..", "Dockerfile.cron"), "utf8");
  assert.match(dockerfile, /"0 5 \* \* \* node \/app\/src\/omen_nflverse_weekly_stats_cron\.js/);
});

// ---- step 15: the full record ----------------------------------------------------------------

const zlib = require("node:zlib");
const { runNflverseIngest, parseSeasons } = require("../src/omen_nflverse_weekly_stats_cron");
const { sparseStats, buildOpportunity } = require("../src/services/nflverseFacts");

const FULL_STATS_HEADER = "player_id,player_display_name,position,season,week,season_type,game_id,team,opponent_team,passing_yards,passing_tds,passing_interceptions,carries,rushing_yards,rushing_tds,receptions,targets,receiving_yards,receiving_tds,fantasy_points_ppr,receiving_air_yards,receiving_epa,fg_made_50_59,fg_made_list,special_teams_tds";
const PBP_HEADER = "game_id,season,season_type,week,play_type,yardline_100,air_yards,two_point_attempt,receiver_player_id,rusher_player_id,posteam";
const GAMES_HEADER = "game_id,season,game_type,week,gameday,gametime,away_team,away_score,home_team,home_score,location,overtime,away_rest,home_rest,spread_line,total_line,away_moneyline,home_moneyline,div_game,roof,surface,temp,wind,away_coach,home_coach,stadium";
const TEAM_HEADER = "season,week,team,season_type,game_id,opponent_team,passing_yards,def_sacks,def_interceptions";
const ROSTER_HEADER = "season,team,position,depth_chart_position,jersey_number,status,full_name,gsis_id,week,game_type,status_description_abbr";

const FULL_FILES = {
  [URLS.players]: "gsis_id,pfr_id\n00-0001,AbcdEf00\n",
  [URLS.stats(2026)]: [FULL_STATS_HEADER,
    "00-0001,A,WR,2026,1,REG,2026_01_CHI_DET,CHI,DET,,,,0,0,0,5,7,60,1,18.0,95,4.25,0,,0",
    "00-0002,B,K,2026,1,REG,2026_01_CHI_DET,DET,CHI,,,,,,,,,,,9,,,1,52,0"].join("\n") + "\n",
  [URLS.snaps(2026)]: snapsCsv(["g1,2026,REG,1,A,AbcdEf00,WR,CHI,50,0.8"]),
  [URLS.pbp(2026)]: zlib.gzipSync([PBP_HEADER,
    "2026_01_CHI_DET,2026,REG,1,pass,15,16,0,00-0001,,CHI",
    "2026_01_CHI_DET,2026,REG,1,pass,60,25,0,00-0001,,CHI",
    "2026_01_CHI_DET,2026,REG,1,pass,2,2,1,00-0001,,CHI",
    "2026_01_CHI_DET,2026,REG,1,no_play,5,,0,00-0001,,CHI"].join("\n") + "\n"),
  [URLS.games]: [GAMES_HEADER,
    "2026_01_CHI_DET,2026,REG,1,2026-09-13,13:00,CHI,24,DET,27,Home,0,7,7,3.5,47.5,140,-165,1,dome,fieldturf,NA,NA,Ben Johnson,Dan Campbell,Ford Field",
    "2026_05_CHI_GB,2026,REG,5,2026-10-11,13:00,CHI,NA,GB,NA,Home,NA,7,7,-1.5,44,NA,NA,1,outdoors,grass,NA,NA,Ben Johnson,Matt LaFleur,Lambeau Field",
    "2025_01_CHI_GB,2025,REG,1,2025-09-08,20:15,CHI,20,GB,27,Home,0,7,7,3,46,NA,NA,1,outdoors,grass,70,5,Ben Johnson,Matt LaFleur,Lambeau Field"].join("\n") + "\n",
  [URLS.teamStats(2026)]: [TEAM_HEADER, "2026,1,CHI,REG,2026_01_CHI_DET,DET,240,2,0", "2026,1,DET,REG,2026_01_CHI_DET,CHI,280,3,1"].join("\n") + "\n",
  [URLS.rosters(2026)]: [ROSTER_HEADER, "2026,CHI,WR,WR,10,ACT,A,00-0001,1,REG,A01", "2026,DET,K,K,3,ACT,B,00-0002,1,REG,A01"].join("\n") + "\n",
};

test("the full stat line is stored sparse: every numeric non-zero stat by name, text and zeros left out", () => {
  assert.deepEqual(sparseStats({ player_id: "00-1", team: "CHI", passing_yards: "0", receiving_epa: "4.25", fg_made_list: "52", fg_made_50_59: "1", x: "NA" }),
    { receiving_epa: 4.25, fg_made_50_59: 1 });
});

test("opportunity counts red-zone, end-zone and deep targets; two-point tries and wiped-out plays do not count", () => {
  const o = buildOpportunity([
    { season: "2026", week: "1", play_type: "pass", yardline_100: "15", air_yards: "16", two_point_attempt: "0", receiver_player_id: "00-0001" },
    { season: "2026", week: "1", play_type: "pass", yardline_100: "60", air_yards: "25", two_point_attempt: "0", receiver_player_id: "00-0001" },
    { season: "2026", week: "1", play_type: "pass", yardline_100: "2", air_yards: "2", two_point_attempt: "1", receiver_player_id: "00-0001" },
    { season: "2026", week: "1", play_type: "run", yardline_100: "4", two_point_attempt: "0", rusher_player_id: "00-0002" },
    { season: "2026", week: "1", play_type: "no_play", yardline_100: "5", two_point_attempt: "0", receiver_player_id: "00-0001" },
  ]);
  assert.deepEqual(o.get("00-0001|2026|1"), { rz_targets: 1, ez_targets: 1, deep_targets: 1 });
  assert.deepEqual(o.get("00-0002|2026|1"), { rz_carries: 1, i10_carries: 1, gl_carries: 1 });
});

test("with step 15 applied a run stores the full record: player lines, team weeks with scores, games with lines, rosters", async () => {
  const client = fakeClient({ step15: true });
  const result = await runNflverseIngest({ client, seasons: [2026], fetchImpl: fetchFor(FULL_FILES), log: quiet });
  assert.equal(result.player_weeks.written, 2);
  const wr = client.state.rows.get("omen:player:gsis.00-0001|2026|1");
  assert.equal(wr.team, "omen:team:chi");
  assert.equal(wr.opponent, "omen:team:det");
  assert.equal(wr.season_type, "REG");
  assert.deepEqual(wr.stats, { receptions: 5, targets: 7, receiving_yards: 60, receiving_tds: 1, fantasy_points_ppr: 18, receiving_air_yards: 95, receiving_epa: 4.25 });
  assert.deepEqual(wr.opportunity, { rz_targets: 1, ez_targets: 1, deep_targets: 1 });
  assert.equal(client.state.rows.get("omen:player:gsis.00-0002|2026|1").stats.fg_made_50_59, 1, "kickers by distance");

  const games = client.state.tables.nflverse_games;
  assert.equal(games.size, 2, "only the season asked for, played and scheduled");
  const played = games.get("2026_01_CHI_DET");
  assert.deepEqual([played.away_score, played.home_score, played.spread_line, played.total_line, played.roof, played.overtime], [24, 27, 3.5, 47.5, "dome", false]);
  assert.equal(games.get("2026_05_CHI_GB").home_score, null, "a scheduled game has no score");

  const chi = client.state.tables.nflverse_team_weekly_stats.get("omen:team:chi|2026|1");
  assert.deepEqual([chi.points_for, chi.points_against, chi.stats.def_sacks], [24, 27, 2]);
  assert.equal(client.state.tables.nflverse_weekly_rosters.size, 2);

  const subjects = client.state.events.map((e) => e.subject).sort();
  assert.deepEqual(subjects, ["nflverse_games", "nflverse_team_weekly_stats", "nflverse_weekly_rosters", "nflverse_weekly_stats"]);
  const again = await runNflverseIngest({ client, seasons: [2026], fetchImpl: fetchFor(FULL_FILES), log: quiet });
  assert.ok(Object.values(again).every((r) => r.skipped === "source_unchanged"), "each table skips on its own unchanged sources");
});

test("before step 15 the run stays in step-14 mode and touches no step-15 table", async () => {
  const client = fakeClient();
  await runNflverseIngest({ client, seasons: [2026], fetchImpl: fetchFor(FILES), log: quiet });
  assert.deepEqual(client.state.ops, ["event", "upsert"]);
  assert.equal(client.state.rows.get("omen:player:gsis.00-0001|2026|1").stats, undefined);
});

test("history backfill seasons parse as ranges and lists", () => {
  assert.deepEqual(parseSeasons("2016-2018,2025"), [2016, 2017, 2018, 2025]);
  assert.throws(() => parseSeasons("x"));
});

test("history stops at 2021 and old rosters are not stored (free-plan storage budget)", async () => {
  const client = fakeClient({ step15: true });
  await assert.rejects(runNflverseIngest({ client, seasons: [2019], fetchImpl: fetchFor(FULL_FILES), log: quiet }), /before 2021 are not stored/);
  await runNflverseIngest({ client, seasons: [2026], fetchImpl: fetchFor(FULL_FILES), log: quiet, rosterFromSeason: 2027 });
  assert.equal(client.state.tables.nflverse_weekly_rosters, undefined);
  assert.ok(client.state.tables.nflverse_games.size > 0);
});
