"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const crypto = require("node:crypto");

const {
  ACCEPTANCE_SCHEMA,
  DST_RULESET,
  FootballDataAcceptanceError,
  KICKER_RULESET,
  OFFENSIVE_RULESET_VERSION,
  buildScoringAcceptance,
  parseCsvObjects,
} = require("../src/services/footballData/scoringAcceptance");
const {
  validateAcceptanceArtifact,
  validateAcceptanceDocument,
} = require("../src/services/footballData/acceptanceValidator");

const PLAYER_HEADERS = [
  "player_id", "player_name", "player_display_name", "position", "season", "week",
  "season_type", "game_id", "team", "opponent_team", "passing_yards", "passing_tds",
  "passing_interceptions", "sack_fumbles_lost", "passing_2pt_conversions", "carries",
  "rushing_yards", "rushing_tds", "rushing_fumbles_lost", "rushing_2pt_conversions",
  "receptions", "receiving_yards", "receiving_tds", "receiving_fumbles_lost",
  "receiving_2pt_conversions", "special_teams_tds", "fg_made", "fg_att", "fg_missed",
  "fg_blocked", "fg_made_0_19", "fg_made_20_29", "fg_made_30_39",
  "fg_made_40_49", "fg_made_50_59", "fg_made_60_", "pat_made", "pat_att",
  "pat_missed", "pat_blocked", "fantasy_points", "fantasy_points_ppr",
];

const TEAM_HEADERS = [
  "season", "week", "team", "season_type", "game_id", "opponent_team", "def_sacks",
  "def_interceptions", "fumble_recovery_opp", "def_tds", "fumble_recovery_tds",
  "special_teams_tds", "def_safeties", "def_punt_blocks", "def_pat_blocks",
  "def_fg_blocks", "fg_made", "fg_att", "fg_missed", "fg_blocked", "fg_made_0_19",
  "fg_made_20_29", "fg_made_30_39", "fg_made_40_49", "fg_made_50_59",
  "fg_made_60_", "pat_made", "pat_att", "pat_missed", "pat_blocked",
];

const SCHEDULE_HEADERS = [
  "game_id", "season", "game_type", "week", "gameday", "away_team", "away_score",
  "home_team", "home_score", "old_game_id", "gsis", "pfr", "pff", "espn",
];

const HASHES = Object.freeze({
  stats_player: "1".repeat(64),
  stats_team: "2".repeat(64),
  schedules: "3".repeat(64),
});

function csv(headers, rows) {
  const encode = (value) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => encode(row[header])).join(",")).join("\n")}\n`;
}

function playerRow({ playerId, name, week, gameId, team, opponent, kicker = false }) {
  return {
    player_id: playerId,
    player_name: name,
    player_display_name: name,
    position: kicker ? "K" : "WR",
    season: 2025,
    week,
    season_type: "REG",
    game_id: gameId,
    team,
    opponent_team: opponent,
    passing_yards: 0,
    passing_tds: 0,
    passing_interceptions: 0,
    sack_fumbles_lost: 0,
    passing_2pt_conversions: 0,
    carries: 0,
    rushing_yards: 0,
    rushing_tds: 0,
    rushing_fumbles_lost: 0,
    rushing_2pt_conversions: 0,
    receptions: kicker ? 0 : 4,
    receiving_yards: kicker ? 0 : 50,
    receiving_tds: 0,
    receiving_fumbles_lost: 0,
    receiving_2pt_conversions: 0,
    special_teams_tds: 0,
    fg_made: kicker ? 2 : 0,
    fg_att: kicker ? 2 : 0,
    fg_missed: 0,
    fg_blocked: 0,
    fg_made_0_19: 0,
    fg_made_20_29: kicker ? 1 : 0,
    fg_made_30_39: 0,
    fg_made_40_49: kicker ? 1 : 0,
    fg_made_50_59: 0,
    fg_made_60_: 0,
    pat_made: kicker ? 2 : 0,
    pat_att: kicker ? 2 : 0,
    pat_missed: 0,
    pat_blocked: 0,
    fantasy_points: kicker ? 0 : 5,
    fantasy_points_ppr: kicker ? 0 : 9,
  };
}

function teamRow({ week, gameId, team, opponent }) {
  return {
    season: 2025,
    week,
    team,
    season_type: "REG",
    game_id: gameId,
    opponent_team: opponent,
    def_sacks: 2,
    def_interceptions: 1,
    fumble_recovery_opp: 1,
    def_tds: 0,
    fumble_recovery_tds: 0,
    special_teams_tds: 0,
    def_safeties: 0,
    def_punt_blocks: 0,
    def_pat_blocks: 0,
    def_fg_blocks: 0,
    fg_made: 2,
    fg_att: 2,
    fg_missed: 0,
    fg_blocked: 0,
    fg_made_0_19: 0,
    fg_made_20_29: 1,
    fg_made_30_39: 0,
    fg_made_40_49: 1,
    fg_made_50_59: 0,
    fg_made_60_: 0,
    pat_made: 2,
    pat_att: 2,
    pat_missed: 0,
    pat_blocked: 0,
  };
}

function fixture(overrides = {}) {
  const games = [
    { week: 1, away: "ARI", home: "NO", awayScore: 17, homeScore: 13 },
    { week: 7, away: "DEN", home: "LAC", awayScore: 6, homeScore: 28 },
    { week: 14, away: "CHI", home: "GB", awayScore: 20, homeScore: 35 },
    { week: 17, away: "BUF", home: "NE", awayScore: 34, homeScore: 0 },
  ];
  const schedules = [];
  const players = [];
  const teams = [];
  games.forEach((game, gameIndex) => {
    const gameId = `2025_${String(game.week).padStart(2, "0")}_${game.away}_${game.home}`;
    schedules.push({
      game_id: gameId,
      season: 2025,
      game_type: "REG",
      week: game.week,
      gameday: `2025-${String(game.week + 8).padStart(2, "0")}-01`,
      away_team: game.away,
      away_score: game.awayScore,
      home_team: game.home,
      home_score: game.homeScore,
      old_game_id: `old-${game.week}`,
      gsis: `gsis-${game.week}`,
      pfr: `pfr-${game.week}`,
      pff: `pff-${game.week}`,
      espn: `espn-${game.week}`,
    });
    [[game.away, game.home], [game.home, game.away]].forEach(([team, opponent], side) => {
      const base = gameIndex * 4 + side * 2;
      players.push(playerRow({
        playerId: `00-${String(3000000 + base).padStart(7, "0")}`,
        name: gameIndex === 0 && side === 0 ? "Receiver, Jr." : `${team} Receiver`,
        week: game.week,
        gameId,
        team,
        opponent,
      }));
      players.push(playerRow({
        playerId: `00-${String(3000001 + base).padStart(7, "0")}`,
        name: `${team} Kicker`,
        week: game.week,
        gameId,
        team,
        opponent,
        kicker: true,
      }));
      teams.push(teamRow({ week: game.week, gameId, team, opponent }));
    });
  });

  const values = { schedules, players, teams, ...overrides };
  return {
    playerCsv: csv(PLAYER_HEADERS, values.players),
    teamCsv: csv(TEAM_HEADERS, values.teams),
    scheduleCsv: csv(SCHEDULE_HEADERS, values.schedules),
    season: 2025,
    weeks: [1, 7, 14, 17],
    manifestHashes: HASHES,
  };
}

test("CSV parsing preserves quoted aliases instead of shifting identity columns", () => {
  const rows = parseCsvObjects(csv(["player_id", "player_name"], [{
    player_id: "00-0030000",
    player_name: 'Receiver, "Junior"',
  }]));

  assert.deepEqual(rows, [{ player_id: "00-0030000", player_name: 'Receiver, "Junior"' }]);
});

test("four varied weeks produce canonical identities and versioned offensive, kicker, and DST facts", () => {
  const result = buildScoringAcceptance({
    ...fixture(),
    recommendedTargets: [
      { subject_type: "player", subject_id: "00-3000000" },
      { subject_type: "team_dst", subject_id: "nfl:ARI:2025" },
    ],
  });

  assert.equal(result.schema, ACCEPTANCE_SCHEMA);
  assert.equal(result.quality.status, "accepted");
  assert.deepEqual(result.scope.weeks, [1, 7, 14, 17]);
  assert.equal(result.normalized.games.length, 4);
  assert.equal(result.normalized.teams.length, 8);
  assert.equal(result.normalized.players.length, 16);
  assert.equal(result.normalized.player_aliases[0].alias, "Receiver, Jr.");
  assert.match(result.normalized.games[0].canonical_id, /^nfl:2025:2025_01_ARI_NO$/);
  assert.equal(result.facts.offensive.length, 16);
  assert.equal(result.facts.kicker.length, 8);
  assert.equal(result.facts.dst.length, 8);
  assert.equal(result.derived.offensive[0].ruleset_version, OFFENSIVE_RULESET_VERSION);
  assert.equal(result.derived.offensive[0].standard, 5);
  assert.equal(result.derived.offensive[0].half_ppr, 7);
  assert.equal(result.derived.offensive[0].ppr, 9);
  assert.equal(result.derived.kicker[0].ruleset_version, KICKER_RULESET.version);
  assert.equal(result.derived.kicker[0].standard, 9);
  assert.equal(result.derived.kicker[0].half_ppr, 9);
  assert.equal(result.derived.kicker[0].ppr, 9);
  assert.equal(result.derived.dst[0].ruleset_version, DST_RULESET.version);
  assert.equal(result.derived.dst[0].standard, 10);
  assert.equal(result.derived.dst[0].half_ppr, 10);
  assert.equal(result.derived.dst[0].ppr, 10);
  assert.equal(result.source_bundle_hash.length, 64);
  assert.equal(result.publication.authorized, false);
  assert.equal(result.publication.promoted, false);
  assert.equal(result.quality.reference.offensive_mismatches, 0);
  assert.equal(result.quality.reference.kicker_team_mismatches, 0);
});

test("a duplicate player-game fact fails closed", () => {
  const base = fixture();
  const rows = parseCsvObjects(base.playerCsv);
  assert.throws(
    () => buildScoringAcceptance(fixture({ players: [...rows, rows[0]] })),
    (error) => error instanceof FootballDataAcceptanceError && error.code === "DUPLICATE_FACT",
  );
});

test("malformed GSIS identities and unresolved targets fail closed", () => {
  const base = fixture();
  const players = parseCsvObjects(base.playerCsv);
  players[0].player_id = "Receiver Name";
  assert.throws(
    () => buildScoringAcceptance(fixture({ players })),
    (error) => error.code === "INVALID_PLAYER_IDENTITY",
  );

  assert.throws(
    () => buildScoringAcceptance({
      ...fixture(),
      recommendedTargets: [{ subject_type: "player", subject_id: "00-0099999" }],
    }),
    (error) => error.code === "UNRESOLVED_TARGET",
  );
});

test("anonymous source rows are excluded only when every scoring value is zero", () => {
  const base = fixture();
  const players = parseCsvObjects(base.playerCsv);
  const anonymous = Object.fromEntries(PLAYER_HEADERS.map((header) => [header, 0]));
  Object.assign(anonymous, {
    player_id: "",
    player_name: "",
    player_display_name: "",
    position: "",
    season: 2025,
    week: 1,
    season_type: "REG",
    game_id: "2025_01_ARI_NO",
    team: "ARI",
    opponent_team: "NO",
  });
  const accepted = buildScoringAcceptance(fixture({ players: [...players, anonymous] }));
  assert.equal(accepted.quality.row_cardinality.excluded_non_scoreable_rows, 1);

  anonymous.fantasy_points = 1;
  assert.throws(
    () => buildScoringAcceptance(fixture({ players: [...players, anonymous] })),
    (error) => error.code === "INVALID_PLAYER_IDENTITY",
  );
});

test("publisher scoring mismatches and impossible counters fail closed", () => {
  const base = fixture();
  const mismatched = parseCsvObjects(base.playerCsv);
  mismatched[0].fantasy_points_ppr = "99";
  assert.throws(
    () => buildScoringAcceptance(fixture({ players: mismatched })),
    (error) => error.code === "OFFENSIVE_REFERENCE_MISMATCH",
  );

  const impossible = parseCsvObjects(base.playerCsv);
  impossible[0].receptions = "-1";
  assert.throws(
    () => buildScoringAcceptance(fixture({ players: impossible })),
    (error) => error.code === "IMPOSSIBLE_VALUE",
  );
});

test("missing reciprocal team facts and kicker aggregate drift fail closed", () => {
  const base = fixture();
  const incompleteTeams = parseCsvObjects(base.teamCsv).slice(1);
  assert.throws(
    () => buildScoringAcceptance(fixture({ teams: incompleteTeams })),
    (error) => error.code === "INCOMPLETE_GAME_COVERAGE",
  );

  const kickerDrift = parseCsvObjects(base.teamCsv);
  kickerDrift[0].fg_made = "3";
  kickerDrift[0].fg_att = "3";
  kickerDrift[0].fg_made_0_19 = "1";
  assert.throws(
    () => buildScoringAcceptance(fixture({ teams: kickerDrift })),
    (error) => error.code === "KICKER_REFERENCE_MISMATCH",
  );
});

test("Phase 2 requires at least four distinct historical weeks and completed schedules", () => {
  assert.throws(
    () => buildScoringAcceptance({ ...fixture(), weeks: [1, 7, 14] }),
    (error) => error.code === "INSUFFICIENT_REPLAY_SCOPE",
  );

  const base = fixture();
  const schedules = parseCsvObjects(base.scheduleCsv);
  schedules[0].home_score = "";
  assert.throws(
    () => buildScoringAcceptance(fixture({ schedules })),
    (error) => error.code === "INCOMPLETE_SCHEDULE",
  );
});

test("manifest provenance must identify every exact source snapshot", () => {
  assert.throws(
    () => buildScoringAcceptance({
      ...fixture(),
      manifestHashes: { ...HASHES, stats_team: "latest" },
    }),
    (error) => error.code === "INVALID_MANIFEST_HASH",
  );
});

test("an independent validator recomputes every ruleset and binds the exact receipt", () => {
  const result = buildScoringAcceptance(fixture());
  const acceptanceBytes = Buffer.from(`${JSON.stringify(result, null, 2)}\n`);
  const receiptBytes = Buffer.from(JSON.stringify({
    schema: "omen-football-scoring-replay.v1",
    acceptance_sha256: crypto.createHash("sha256").update(acceptanceBytes).digest("hex"),
    source_bundle_hash: result.source_bundle_hash,
  }));
  const validation = validateAcceptanceArtifact({ acceptanceBytes, receiptBytes });

  assert.equal(validation.status, "validated");
  assert.equal(validation.offensive_mismatches, 0);
  assert.equal(validation.kicker_mismatches, 0);
  assert.equal(validation.dst_mismatches, 0);

  result.derived.kicker[0].standard += 1;
  assert.throws(
    () => validateAcceptanceDocument(result),
    (error) => error.code === "VALIDATION_KICKER_MISMATCH",
  );
});
