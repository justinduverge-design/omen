"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { getRecentUsage, usageStatement, summarize, _resetCache } = require("../src/services/playerUsage");
const { buildStartSitDetail } = require("../src/services/startSitDetail");

const HEADER = "player_id,player_display_name,position,season,week,season_type,team,attempts,carries,receptions,targets,target_share";
const CSV = [
  HEADER,
  "00-0032464,Kalif Raymond,WR,2026,1,REG,CHI,0,0,8,9,0.346153846153846",
  "00-0032464,Kalif Raymond,WR,2026,2,REG,CHI,0,0,5,5,0.166666666666667",
  "00-0032464,Kalif Raymond,WR,2026,3,REG,CHI,0,0,6,7,0.205882352941176",
  "00-0032464,Kalif Raymond,WR,2026,5,REG,CHI,0,0,9,12,0.4",
  "00-0040236,Kyle Monangai,RB,2026,1,REG,CHI,0,10,2,2,0.0769230769230769",
  "00-0040236,Kyle Monangai,RB,2026,2,REG,CHI,0,10,2,2,0.0666666666666667",
  "00-0040236,Kyle Monangai,RB,2026,3,REG,CHI,0,10,0,0,0",
].join("\n");

function fakeSupabase(rows, { error = null } = {}) {
  const calls = [];
  return {
    calls,
    from: (table) => ({
      select: () => ({
        eq: (_c, provider) => ({
          in: async (_c2, ids) => {
            calls.push({ table, provider, ids });
            if (error) return { data: null, error };
            return { data: rows.filter((r) => r.provider === provider && ids.includes(r.provider_player_id)), error: null };
          },
        }),
      }),
    }),
  };
}
const crosswalk = [
  { provider: "espn", provider_player_id: "2973405", players: { gsis_id: "00-0032464" } },
  { provider: "sleeper", provider_player_id: "12534", players: { gsis_id: "00-0040236" } },
];
const okFetch = async () => ({ ok: true, text: async () => CSV });

test("usage covers the last three games before the week asked about, never a later one", () => {
  const rows = CSV.split("\n").slice(1).map((l) => { const [player_id,, , , week,,, attempts, carries, receptions, targets, target_share] = l.split(","); return { player_id, week, attempts, carries, receptions, targets, target_share, team: "CHI" }; })
    .filter((r) => r.player_id === "00-0032464");
  const u = summarize(rows, 4);
  assert.deepEqual(u.weeks, [1, 2, 3]);
  assert.equal(u.targets_per_game, 7);
  assert.ok(Math.abs(u.target_share - 0.2396) < 0.001);
  assert.equal(summarize(rows, 1), null, "no games before week 1");
});

test("usage sentences say what happened, by position, in plain words", () => {
  assert.equal(usageStatement("Kalif Raymond", "WR", { games: 3, targets_per_game: 7, target_share: 0.2396 }),
    "Kalif Raymond: 7.0 targets a game over the last 3 games (24% of the team's targets).");
  assert.equal(usageStatement("Kyle Monangai", "RB", { games: 3, carries_per_game: 10, targets_per_game: 4 / 3 }),
    "Kyle Monangai: 10.0 carries and 1.3 targets a game over the last 3 games.");
  assert.equal(usageStatement("A QB", "QB", { games: 1, attempts_per_game: 31, carries_per_game: 4 }),
    "A QB: 31.0 pass attempts and 4.0 carries in the last game.");
  assert.equal(usageStatement("A Kicker", "K", { games: 3 }), null);
  assert.equal(usageStatement("Nobody", "WR", null), null);
});

test("roster players resolve through the crosswalk to nflverse rows (ESPN and Sleeper keys)", async () => {
  _resetCache();
  const supabase = fakeSupabase(crosswalk);
  const usage = await getRecentUsage({ supabase, playerKeys: ["espn:2973405", "sleeper:12534", "espn:999", "custom:1"], season: 2026, beforeWeek: 4, fetchImpl: okFetch });
  assert.equal(usage.get("espn:2973405").targets_per_game, 7);
  assert.equal(usage.get("sleeper:12534").carries_per_game, 10);
  assert.equal(usage.has("espn:999"), false, "an unmapped player has no usage");
  assert.deepEqual(supabase.calls.map((c) => c.provider).sort(), ["espn", "sleeper"]);
});

test("any failure gives no usage at all, never a guess", async () => {
  _resetCache();
  const warnings = [];
  const log = { warn: (m, d) => warnings.push([m, d]) };
  const down = async () => ({ ok: false, status: 503, text: async () => "" });
  assert.equal((await getRecentUsage({ supabase: fakeSupabase(crosswalk), playerKeys: ["espn:2973405"], season: 2026, beforeWeek: 4, fetchImpl: down, log })).size, 0);
  _resetCache();
  assert.equal((await getRecentUsage({ supabase: fakeSupabase([], { error: { code: "42P01" } }), playerKeys: ["espn:2973405"], season: 2026, beforeWeek: 4, fetchImpl: okFetch, log })).size, 0);
  assert.equal(warnings.filter(([m]) => m === "player usage unavailable").length, 2);
  assert.equal((await getRecentUsage({ supabase: null, playerKeys: ["espn:1"], season: 2026, beforeWeek: 4 })).size, 0);
});

function roster() {
  const p = (key, name, pos, proj, extra = {}) => ({ player_key: key, name, position: pos, team: "CHI", projected_points: proj, eligible_positions: [pos, "FLEX"], status: "", ...extra });
  return {
    week: 4,
    slots: {
      starters: [p("sleeper:12534", "Kyle Monangai", "RB", 8.14, { selected_position: "FLEX" })],
      bench: [p("espn:2973405", "Kalif Raymond", "WR", 9.72, { selected_position: "BN" })],
    },
  };
}

test("the start/sit call carries a verified usage line for each player, and none without data", () => {
  const usage = new Map([
    ["espn:2973405", { games: 3, targets_per_game: 7, target_share: 0.2396, carries_per_game: 0 }],
    ["sleeper:12534", { games: 3, carries_per_game: 10, targets_per_game: 4 / 3, target_share: 0.05 }],
  ]);
  const withUsage = buildStartSitDetail({ roster: roster(), platform: "espn", leagueId: "1", week: 4, season: 2026, scoringFormat: "1 point per reception", usage });
  assert.equal(withUsage.recommendation.start.name, "Kalif Raymond");
  const lines = withUsage.evidence.filter((e) => e.category === "recent_usage");
  assert.equal(lines.length, 2);
  assert.ok(lines.every((e) => e.kind === "verified"));
  assert.match(lines.map((e) => e.statement).join(" "), /Kalif Raymond: 7\.0 targets a game over the last 3 games \(24% of the team's targets\)/);
  const without = buildStartSitDetail({ roster: roster(), platform: "espn", leagueId: "1", week: 4, season: 2026, scoringFormat: "1 point per reception" });
  assert.equal(without.evidence.filter((e) => e.category === "recent_usage").length, 0);
});

// --- Snap share and trend (FI-LEAGUE step 8) ---------------------------------------------------

const SNAPS = [
  "game_id,pfr_game_id,season,game_type,week,player,pfr_player_id,position,team,opponent,offense_snaps,offense_pct,defense_snaps,defense_pct,st_snaps,st_pct",
  "2026_01_CHI_CAR,x,2026,REG,1,Kalif Raymond,RaymKa00,WR,CHI,CAR,45,0.6,0,0,4,0.11",
  "2026_02_MIN_CHI,x,2026,REG,2,Kalif Raymond,RaymKa00,WR,CHI,MIN,46,0.62,0,0,6,0.29",
  "2026_03_PHI_CHI,x,2026,REG,3,Kalif Raymond,RaymKa00,WR,CHI,PHI,54,0.75,0,0,4,0.21",
  "2026_05_CHI_X,x,2026,REG,5,Kalif Raymond,RaymKa00,WR,CHI,X,60,0.8,0,0,4,0.21",
  "2026_01_CHI_CAR,x,2026,REG,1,Kyle Monangai,MonaKy00,RB,CHI,CAR,30,0.4,0,0,4,0.11",
].join("\n");
const PLAYERS = [
  "gsis_id,display_name,pfr_id,espn_id",
  "00-0032464,Kalif Raymond,RaymKa00,2973405",
  "00-0040236,Kyle Monangai,MonaKy00,",
].join("\n");
function routedFetch({ snapsOk = true } = {}) {
  const urls = [];
  const impl = async (url) => {
    urls.push(url);
    if (url.includes("snap_counts")) return snapsOk ? { ok: true, text: async () => SNAPS } : { ok: false, status: 404, text: async () => "" };
    if (url.includes("/players/players.csv")) return { ok: true, text: async () => PLAYERS };
    return { ok: true, text: async () => CSV };
  };
  impl.urls = urls;
  return impl;
}

test("snap share joins nflverse snap counts through the players.csv pfr id", async () => {
  _resetCache();
  const fetchImpl = routedFetch();
  const usage = await getRecentUsage({ supabase: fakeSupabase(crosswalk), playerKeys: ["espn:2973405", "sleeper:12534"], season: 2026, beforeWeek: 6, fetchImpl });
  const kalif = usage.get("espn:2973405");
  assert.deepEqual(kalif.weeks, [2, 3, 5]);
  assert.ok(Math.abs(kalif.snap_share - (0.62 + 0.75 + 0.8) / 3) < 1e-9);
  assert.equal(kalif.prior, null, "one earlier game is not enough for a trend");
  assert.equal(usage.get("sleeper:12534").snap_share, null, "snap rows missing for some games: no snap share");
  assert.ok(fetchImpl.urls.some((u) => u.endsWith("snap_counts_2026.csv")));
});

test("a snap-count outage keeps the target line and drops only the snap share", async () => {
  _resetCache();
  const warnings = [];
  const usage = await getRecentUsage({ supabase: fakeSupabase(crosswalk), playerKeys: ["espn:2973405"], season: 2026, beforeWeek: 4, fetchImpl: routedFetch({ snapsOk: false }), log: { warn: (m) => warnings.push(m) } });
  assert.equal(usage.get("espn:2973405").targets_per_game, 7);
  assert.equal(usage.get("espn:2973405").snap_share, null);
  assert.equal(warnings.length, 1);
});

test("trend compares the last three games with the earlier games of the season", () => {
  const rows = (weeks) => weeks.map(([week, targets]) => ({ week: String(week), targets: String(targets), carries: "0", attempts: "0", receptions: "0", target_share: "0.2", team: "CHI" }));
  const u = summarize(rows([[1, 4], [2, 4], [3, 8], [4, 9], [5, 10]]), 6);
  assert.deepEqual(u.weeks, [3, 4, 5]);
  assert.equal(u.prior.games, 2);
  assert.equal(u.prior.targets_per_game, 4);
  assert.equal(summarize(rows([[1, 4], [2, 4], [3, 8]]), 4).prior, null, "no earlier games: no trend");
  assert.equal(summarize(rows([[1, 4], [2, 4], [3, 8], [4, 9]]), 5).prior, null, "one earlier game: no trend");
  const snaps = [1, 2, 3, 4, 5].map((week) => ({ week: String(week), offense_pct: week <= 2 ? (week === 1 ? "0.4" : "0.5") : "0.7" }));
  const withSnaps = summarize(rows([[1, 4], [2, 4], [3, 4], [4, 4], [5, 4]]), 6, snaps);
  assert.ok(Math.abs(withSnaps.snap_share - 0.7) < 1e-9);
  assert.ok(Math.abs(withSnaps.prior.snap_share - 0.45) < 1e-9);
});

test("usage sentences add snap share and a meaningful trend, and nothing when the change is small", () => {
  const base = { games: 3, targets_per_game: 9.3, target_share: 0.26, carries_per_game: 0 };
  const head = "Kalif Raymond: 9.3 targets a game over the last 3 games (26% of the team's targets), on the field for 72% of the offense's snaps.";
  assert.equal(usageStatement("Kalif Raymond", "WR", { ...base, snap_share: 0.7233, prior: { games: 2, targets_per_game: 4, carries_per_game: 0, snap_share: 0.6 } }),
    `${head} Up from 4.0 targets a game over the first 2 games.`);
  assert.equal(usageStatement("Kalif Raymond", "WR", { ...base, snap_share: 0.72, prior: { games: 2, targets_per_game: 8.5, carries_per_game: 0, snap_share: 0.45 } }),
    `${head} Snap share up from 45% over the first 2 games.`);
  assert.equal(usageStatement("Kalif Raymond", "WR", { ...base, snap_share: 0.72, prior: { games: 2, targets_per_game: 8.5, carries_per_game: 0, snap_share: 0.68 } }), head);
  assert.equal(usageStatement("Kyle Monangai", "RB", { games: 3, carries_per_game: 8, targets_per_game: 1, snap_share: null, prior: { games: 4, carries_per_game: 15, targets_per_game: 1, snap_share: null } }),
    "Kyle Monangai: 8.0 carries and 1.0 targets a game over the last 3 games. Down from 15.0 carries a game over the first 4 games.");
  assert.equal(usageStatement("Kyle Monangai", "RB", { games: 2, carries_per_game: 8, targets_per_game: 1, prior: null }),
    "Kyle Monangai: 8.0 carries and 1.0 targets a game over the last 2 games.");
});
