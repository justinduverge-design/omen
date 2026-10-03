"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { joinFtnToOffense, mapLeagueRowsToFacts, buildLeagueDna, leagueRanks } = require("../src/services/footballIntelligence/leagueSchemeDna");
const { parseCsv } = require("../src/services/csvRows");

const SHA = `sha256:${"0".repeat(64)}`;

function ftnRow(game, play, week, flags = {}) {
  return {
    nflverse_game_id: game, nflverse_play_id: String(play), season: "2025", week: String(week),
    qb_location: "S", n_offense_backfield: "1", n_defense_box: "6", is_no_huddle: "FALSE", is_motion: "FALSE",
    is_play_action: "FALSE", is_screen_pass: "FALSE", is_rpo: "FALSE", is_qb_out_of_pocket: "FALSE",
    n_blitzers: "0", n_pass_rushers: "4", ...flags,
  };
}

/** `plays` plays a game for `team` over `games` weeks; `share` of them use motion. */
function season(team, { games = 5, plays = 40, motionShare = 0.5, paShare = 0.1, offset = 0 } = {}) {
  const ftn = [];
  const pbp = [];
  for (let week = 1; week <= games; week += 1) {
    const game = `2025_${String(week).padStart(2, "0")}_${team}_OPP${offset}`;
    for (let play = 1; play <= plays; play += 1) {
      ftn.push(ftnRow(game, play, week, {
        is_motion: play <= plays * motionShare ? "TRUE" : "FALSE",
        is_play_action: play <= plays * paShare ? "TRUE" : "FALSE",
      }));
      pbp.push({ game_id: game, play_id: String(play), posteam: team, season_type: "REG" });
    }
  }
  return { ftn, pbp };
}

test("FTN plays join to the offense that ran them; postseason and unmatched plays stay out", () => {
  const { rows, unmatched } = joinFtnToOffense({
    ftnRows: [ftnRow("g1", 1, 1), ftnRow("g1", 2, 1), ftnRow("g1", 3, 1)],
    pbpRows: [
      { game_id: "g1", play_id: "1", posteam: "CHI", season_type: "REG" },
      { game_id: "g1", play_id: "2.0", posteam: "DET", season_type: "REG" },
      { game_id: "g1", play_id: "3", posteam: "CHI", season_type: "POST" },
    ],
  });
  assert.deepEqual(rows.map((r) => r.possession_team), ["CHI", "DET"]);
  assert.equal(unmatched, 1);
});

test("plays without a quarterback location are not offense snaps, and odd values are skipped", () => {
  const facts = mapLeagueRowsToFacts([
    { ...ftnRow("g", 1, 1, { is_motion: "TRUE" }), possession_team: "CHI" },
    { ...ftnRow("g", 2, 1), qb_location: "", possession_team: "CHI" },
    { ...ftnRow("g", 3, 1, { is_rpo: "maybe" }), possession_team: "CHI" },
  ], { artifactSha256: SHA });
  const plays = new Set(facts.map((f) => f.play_id));
  assert.deepEqual([...plays].sort(), ["1", "3"]);
  assert.equal(facts.find((f) => f.play_id === "1" && f.metric === "offense_motion").value, true);
  assert.equal(facts.some((f) => f.play_id === "3" && f.metric === "rpo"), false);
  assert.equal(facts.find((f) => f.metric === "no_huddle").source.source_family, "play_by_play");
  assert.ok(facts.every((f) => f.subject_id === "CHI" && f.source.artifact_sha256 === SHA));
});

test("every team gets its own Scheme DNA, and the league ranks each rate", () => {
  const chi = season("CHI", { motionShare: 0.75, paShare: 0.2 });
  const det = season("DET", { motionShare: 0.5, paShare: 0.1, offset: 1 });
  const gb = season("GB", { motionShare: 0.25, paShare: 0.15, offset: 2 });
  const { rows } = joinFtnToOffense({ ftnRows: [...chi.ftn, ...det.ftn, ...gb.ftn], pbpRows: [...chi.pbp, ...det.pbp, ...gb.pbp] });
  const dna = buildLeagueDna({ facts: mapLeagueRowsToFacts(rows, { artifactSha256: SHA }), season: 2025 });
  assert.deepEqual(Object.keys(dna), ["CHI", "DET", "GB"]);
  assert.ok(Object.values(dna).every((d) => d.status === "available"));
  const ranks = leagueRanks(dna);
  assert.equal(ranks.motion_rate.rank.CHI, 1);
  assert.equal(ranks.motion_rate.rank.GB, 3);
  assert.equal(ranks.play_action_rate.rank.CHI, 1);
  assert.equal(ranks.play_action_rate.rank.DET, 3);
  assert.ok(Math.abs(ranks.motion_rate.value.CHI - 0.75) < 1e-9);
  assert.ok(Math.abs(ranks.motion_rate.average - 0.5) < 1e-9);
  assert.equal(ranks.motion_rate.teams, 3);
});

test("a team with too little evidence is marked insufficient and left out of the ranks", () => {
  const chi = season("CHI", { games: 5 });
  const new1 = season("NYG", { games: 3, offset: 3 });  // the evidence policy needs 4 games
  const { rows } = joinFtnToOffense({ ftnRows: [...chi.ftn, ...new1.ftn], pbpRows: [...chi.pbp, ...new1.pbp] });
  const dna = buildLeagueDna({ facts: mapLeagueRowsToFacts(rows, { artifactSha256: SHA }), season: 2025 });
  assert.equal(dna.NYG.status, "insufficient_data");
  assert.equal(dna.CHI.status, "available");
  const ranks = leagueRanks(dna);
  assert.equal(ranks.motion_rate.teams, 1);
  assert.equal(ranks.motion_rate.rank.NYG, undefined);
});

test("CSV reading can keep only the columns asked for", () => {
  const rows = parseCsv("game_id,play_id,posteam,desc,epa\ng1,1,CHI,\"pass, short\",0.3\n", { columns: ["game_id", "play_id", "posteam"] });
  assert.deepEqual(rows, [{ game_id: "g1", play_id: "1", posteam: "CHI" }]);
});
