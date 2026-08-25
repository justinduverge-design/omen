"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const {
  assertLocalVaultRoot,
  readExactSnapshot,
} = require("./rawVault");

const ACCEPTANCE_SCHEMA = "omen-football-scoring-acceptance.v1";
const NORMALIZATION_VERSION = "omen-football-normalization.v1";
const OFFENSIVE_FACT_VERSION = "omen-offensive-facts.v1";
const KICKER_FACT_VERSION = "omen-kicker-facts.v1";
const DST_FACT_VERSION = "omen-dst-facts.v1";
const OFFENSIVE_RULESET_VERSION = "omen-fantasy-v1";
const SCORE_TOLERANCE = 1e-8;

const KICKER_RULESET = Object.freeze({
  version: "omen-kicker-v1",
  rules: Object.freeze({
    pat_made: 1,
    fg_made_0_19: 3,
    fg_made_20_29: 3,
    fg_made_30_39: 3,
    fg_made_40_49: 4,
    fg_made_50_59: 5,
    fg_made_60_plus: 6,
  }),
});

const DST_RULESET = Object.freeze({
  version: "omen-dst-v1",
  rules: Object.freeze({
    sack: 1,
    interception: 2,
    fumble_recovery: 2,
    touchdown: 6,
    safety: 2,
    blocked_kick: 2,
    points_allowed: Object.freeze([
      Object.freeze({ min: 0, max: 0, points: 10 }),
      Object.freeze({ min: 1, max: 6, points: 7 }),
      Object.freeze({ min: 7, max: 13, points: 4 }),
      Object.freeze({ min: 14, max: 20, points: 1 }),
      Object.freeze({ min: 21, max: 27, points: 0 }),
      Object.freeze({ min: 28, max: 34, points: -1 }),
      Object.freeze({ min: 35, max: null, points: -4 }),
    ]),
  }),
});

const PLAYER_REQUIRED_COLUMNS = Object.freeze([
  "player_id", "player_name", "position", "season", "week", "season_type", "game_id",
  "team", "opponent_team", "passing_yards", "passing_tds", "passing_interceptions",
  "sack_fumbles_lost", "passing_2pt_conversions", "rushing_yards", "rushing_tds",
  "rushing_fumbles_lost", "rushing_2pt_conversions", "receptions", "receiving_yards",
  "receiving_tds", "receiving_fumbles_lost", "receiving_2pt_conversions",
  "special_teams_tds", "fg_made", "fg_att", "fg_missed", "fg_blocked",
  "fg_made_0_19", "fg_made_20_29", "fg_made_30_39", "fg_made_40_49",
  "fg_made_50_59", "fg_made_60_", "pat_made", "pat_att", "pat_missed",
  "pat_blocked", "fantasy_points", "fantasy_points_ppr",
]);

const TEAM_REQUIRED_COLUMNS = Object.freeze([
  "season", "week", "team", "season_type", "game_id", "opponent_team", "def_sacks",
  "def_interceptions", "fumble_recovery_opp", "def_tds", "fumble_recovery_tds",
  "special_teams_tds", "def_safeties", "def_punt_blocks", "def_pat_blocks",
  "def_fg_blocks", "fg_made", "fg_att", "fg_missed", "fg_blocked", "fg_made_0_19",
  "fg_made_20_29", "fg_made_30_39", "fg_made_40_49", "fg_made_50_59",
  "fg_made_60_", "pat_made", "pat_att", "pat_missed", "pat_blocked",
]);

const SCHEDULE_REQUIRED_COLUMNS = Object.freeze([
  "game_id", "season", "game_type", "week", "gameday", "away_team", "away_score",
  "home_team", "home_score", "old_game_id", "gsis", "pfr", "pff", "espn",
]);

const NONNEGATIVE_PLAYER_FIELDS = Object.freeze([
  "passing_tds", "passing_interceptions", "sack_fumbles_lost", "passing_2pt_conversions",
  "carries", "rushing_tds", "rushing_fumbles_lost", "rushing_2pt_conversions",
  "receptions", "receiving_tds", "receiving_fumbles_lost", "receiving_2pt_conversions",
  "special_teams_tds", "fg_made", "fg_att", "fg_missed", "fg_blocked", "fg_made_0_19",
  "fg_made_20_29", "fg_made_30_39", "fg_made_40_49", "fg_made_50_59",
  "fg_made_60_", "pat_made", "pat_att", "pat_missed", "pat_blocked",
]);

const SCOREABLE_PLAYER_FIELDS = Object.freeze([
  "passing_yards", "passing_tds", "passing_interceptions", "sack_fumbles_lost",
  "passing_2pt_conversions", "rushing_yards", "rushing_tds", "rushing_fumbles_lost",
  "rushing_2pt_conversions", "receptions", "receiving_yards", "receiving_tds",
  "receiving_fumbles_lost", "receiving_2pt_conversions", "special_teams_tds", "fg_made",
  "fg_att", "fg_missed", "fg_blocked", "pat_made", "pat_att", "pat_missed", "pat_blocked",
  "fantasy_points", "fantasy_points_ppr",
]);

const NONNEGATIVE_TEAM_FIELDS = Object.freeze([
  "def_sacks", "def_interceptions", "fumble_recovery_opp", "def_tds",
  "fumble_recovery_tds", "special_teams_tds", "def_safeties", "def_punt_blocks",
  "def_pat_blocks", "def_fg_blocks", "fg_made", "fg_att", "fg_missed", "fg_blocked",
  "fg_made_0_19", "fg_made_20_29", "fg_made_30_39", "fg_made_40_49",
  "fg_made_50_59", "fg_made_60_", "pat_made", "pat_att", "pat_missed", "pat_blocked",
]);

const FRANCHISE_BY_ABBREVIATION = Object.freeze({
  ARI: "ARI", ATL: "ATL", BAL: "BAL", BUF: "BUF", CAR: "CAR", CHI: "CHI",
  CIN: "CIN", CLE: "CLE", DAL: "DAL", DEN: "DEN", DET: "DET", GB: "GB",
  HOU: "HOU", IND: "IND", JAX: "JAX", JAC: "JAX", KC: "KC", LV: "LV",
  OAK: "LV", LAC: "LAC", SD: "LAC", SDG: "LAC", LA: "LAR", LAR: "LAR",
  STL: "LAR", MIA: "MIA", MIN: "MIN", NE: "NE", NO: "NO", NYG: "NYG",
  NYJ: "NYJ", PHI: "PHI", PIT: "PIT", SEA: "SEA", SF: "SF", TB: "TB",
  TEN: "TEN", WAS: "WAS", WSH: "WAS",
});

class FootballDataAcceptanceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "FootballDataAcceptanceError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new FootballDataAcceptanceError(code, message, details);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseCsvRows(value) {
  const text = Buffer.isBuffer(value) ? value.toString("utf8") : String(value ?? "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      if (field) fail("MALFORMED_CSV", "a quoted CSV field must begin at the field boundary");
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) fail("MALFORMED_CSV", "CSV contains an unterminated quoted field");
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((entry) => entry !== ""));
}

function parseCsvObjects(value, requiredColumns = []) {
  const rows = parseCsvRows(value);
  if (!rows.length) fail("EMPTY_DATASET", "CSV dataset is empty");
  const headers = rows[0].map((header, index) => (
    index === 0 ? header.replace(/^\uFEFF/, "").trim() : header.trim()
  ));
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) {
    fail("SCHEMA_DRIFT", "CSV header contains an empty or duplicate column");
  }
  const missing = requiredColumns.filter((column) => !headers.includes(column));
  if (missing.length) fail("SCHEMA_DRIFT", `CSV is missing required columns: ${missing.join(", ")}`);

  return rows.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      fail(
        "MALFORMED_CSV",
        `CSV row ${rowIndex + 2} has ${values.length} fields; expected ${headers.length}`,
      );
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function integer(value, field, { min = null, max = null, allowBlank = false } = {}) {
  if (allowBlank && String(value ?? "").trim() === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || (min !== null && number < min) || (max !== null && number > max)) {
    fail("IMPOSSIBLE_VALUE", `${field} must be an integer${min !== null ? ` >= ${min}` : ""}`);
  }
  return number;
}

function finite(value, field, { blankAsZero = true } = {}) {
  const raw = String(value ?? "").trim();
  if (!raw && !blankAsZero) fail("IMPOSSIBLE_VALUE", `${field} must be present and finite`);
  const number = raw ? Number(raw) : 0;
  if (!Number.isFinite(number)) fail("IMPOSSIBLE_VALUE", `${field} must be finite`);
  return number;
}

function assertNonnegative(row, fields, context) {
  for (const field of fields) {
    const value = finite(row[field], `${context}.${field}`);
    if (!Number.isInteger(value) || value < 0) {
      fail("IMPOSSIBLE_VALUE", `${context}.${field} must be a nonnegative integer`);
    }
  }
}

function canonicalTeam(abbreviation, season) {
  const alias = String(abbreviation || "").trim().toUpperCase();
  const franchise = FRANCHISE_BY_ABBREVIATION[alias];
  if (!franchise) fail("INVALID_TEAM_IDENTITY", `unknown nflverse team abbreviation: ${alias || "(missing)"}`);
  return { canonical_id: `nfl:${franchise}:${season}`, franchise, alias };
}

function playerIdentity(row, context) {
  const playerId = String(row.player_id || "").trim();
  if (!/^00-\d{7}$/.test(playerId)) {
    fail("INVALID_PLAYER_IDENTITY", `${context}.player_id is not a canonical GSIS id`);
  }
  return playerId;
}

function assertHashBundle(manifestHashes) {
  const required = ["schedules", "stats_player", "stats_team"];
  const bundle = {};
  for (const dataset of required) {
    const hash = String(manifestHashes?.[dataset] || "").toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(hash)) {
      fail("INVALID_MANIFEST_HASH", `${dataset} must name an exact SHA-256 manifest hash`);
    }
    bundle[dataset] = hash;
  }
  return bundle;
}

function normalizeWeeks(values) {
  const weeks = [...new Set((values || []).map((value) => Number(value)))].sort((a, b) => a - b);
  if (weeks.length < 4 || weeks.some((week) => !Number.isInteger(week) || week < 1 || week > 18)) {
    fail("INSUFFICIENT_REPLAY_SCOPE", "Phase 2 acceptance requires at least four distinct REG weeks");
  }
  return weeks;
}

function rowInScope(row, season, weeks, seasonTypeField) {
  return Number(row.season) === season
    && String(row[seasonTypeField]) === "REG"
    && weeks.includes(Number(row.week));
}

function scheduleScore(row, field, context) {
  const raw = String(row[field] ?? "").trim();
  if (!raw) fail("INCOMPLETE_SCHEDULE", `${context}.${field} is missing`);
  return integer(raw, `${context}.${field}`, { min: 0 });
}

function buildGameRegistry(rows, season, weeks) {
  const selected = rows.filter((row) => rowInScope(row, season, weeks, "game_type"));
  const games = [];
  const byId = new Map();
  const aliases = new Map();
  for (const row of selected) {
    const context = `schedule ${row.game_id || "(missing)"}`;
    const gameId = String(row.game_id || "").trim();
    if (!new RegExp(`^${season}_(?:0[1-9]|1[0-8])_[A-Z0-9]+_[A-Z0-9]+$`).test(gameId)) {
      fail("INVALID_GAME_IDENTITY", `${context}.game_id is malformed`);
    }
    if (byId.has(gameId)) fail("DUPLICATE_FACT", `schedule contains duplicate game_id ${gameId}`);
    const week = integer(row.week, `${context}.week`, { min: 1, max: 18 });
    const away = canonicalTeam(row.away_team, season);
    const home = canonicalTeam(row.home_team, season);
    if (away.canonical_id === home.canonical_id) fail("INVALID_GAME_IDENTITY", `${gameId} has the same team twice`);
    const awayScore = scheduleScore(row, "away_score", context);
    const homeScore = scheduleScore(row, "home_score", context);
    const gameday = String(row.gameday || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(gameday)) {
      fail("INVALID_GAME_IDENTITY", `${context}.gameday must be YYYY-MM-DD`);
    }
    const canonicalId = `nfl:${season}:${gameId}`;
    const gameAliases = [];
    for (const field of ["old_game_id", "gsis", "pfr", "pff", "espn"]) {
      const alias = String(row[field] || "").trim();
      if (!alias) continue;
      const aliasKey = `${field}:${alias}`;
      if (aliases.has(aliasKey) && aliases.get(aliasKey) !== canonicalId) {
        fail("AMBIGUOUS_GAME_ALIAS", `${aliasKey} resolves to more than one game`);
      }
      aliases.set(aliasKey, canonicalId);
      gameAliases.push({ source_field: field, alias, canonical_id: canonicalId });
    }
    const game = {
      canonical_id: canonicalId,
      season,
      season_type: "REG",
      week,
      game_id: gameId,
      gameday,
      away_team_id: away.canonical_id,
      home_team_id: home.canonical_id,
      away_score: awayScore,
      home_score: homeScore,
      aliases: gameAliases,
    };
    games.push(game);
    byId.set(gameId, game);
  }
  for (const week of weeks) {
    if (!games.some((game) => game.week === week)) {
      fail("INCOMPLETE_SCHEDULE", `schedule has no completed REG games for week ${week}`);
    }
  }
  return { games: games.sort((a, b) => a.week - b.week || a.game_id.localeCompare(b.game_id)), byId };
}

function validateRowScope(row, context, season, weeks, gameRegistry) {
  if (!rowInScope(row, season, weeks, "season_type")) return false;
  const game = gameRegistry.get(String(row.game_id || ""));
  if (!game || game.week !== Number(row.week)) {
    fail("SCHEDULE_MISMATCH", `${context} does not resolve to the selected schedule snapshot`);
  }
  return true;
}

function offensiveFacts(row, playerId, team, context) {
  assertNonnegative(row, NONNEGATIVE_PLAYER_FIELDS, context);
  return {
    fact_version: OFFENSIVE_FACT_VERSION,
    subject_id: playerId,
    team_id: team.canonical_id,
    passing_yards: finite(row.passing_yards, `${context}.passing_yards`),
    passing_touchdowns: finite(row.passing_tds, `${context}.passing_tds`),
    passing_interceptions: finite(row.passing_interceptions, `${context}.passing_interceptions`),
    passing_two_point_conversions: finite(row.passing_2pt_conversions, `${context}.passing_2pt_conversions`),
    rushing_yards: finite(row.rushing_yards, `${context}.rushing_yards`),
    rushing_touchdowns: finite(row.rushing_tds, `${context}.rushing_tds`),
    rushing_two_point_conversions: finite(row.rushing_2pt_conversions, `${context}.rushing_2pt_conversions`),
    receptions: finite(row.receptions, `${context}.receptions`),
    receiving_yards: finite(row.receiving_yards, `${context}.receiving_yards`),
    receiving_touchdowns: finite(row.receiving_tds, `${context}.receiving_tds`),
    receiving_two_point_conversions: finite(row.receiving_2pt_conversions, `${context}.receiving_2pt_conversions`),
    special_teams_touchdowns: finite(row.special_teams_tds, `${context}.special_teams_tds`),
    lost_fumbles: finite(row.sack_fumbles_lost, `${context}.sack_fumbles_lost`)
      + finite(row.rushing_fumbles_lost, `${context}.rushing_fumbles_lost`)
      + finite(row.receiving_fumbles_lost, `${context}.receiving_fumbles_lost`),
  };
}

function scoreOffense(facts) {
  const standard = facts.passing_yards / 25
    + 4 * facts.passing_touchdowns
    - 2 * facts.passing_interceptions
    + (facts.rushing_yards + facts.receiving_yards) / 10
    + 6 * (facts.rushing_touchdowns + facts.receiving_touchdowns + facts.special_teams_touchdowns)
    + 2 * (facts.passing_two_point_conversions
      + facts.rushing_two_point_conversions
      + facts.receiving_two_point_conversions)
    - 2 * facts.lost_fumbles;
  return {
    standard,
    half_ppr: standard + 0.5 * facts.receptions,
    ppr: standard + facts.receptions,
  };
}

function kickerFacts(row, playerId, team, context) {
  const facts = {
    fact_version: KICKER_FACT_VERSION,
    subject_id: playerId,
    team_id: team.canonical_id,
    fg_made: finite(row.fg_made, `${context}.fg_made`),
    fg_att: finite(row.fg_att, `${context}.fg_att`),
    fg_missed: finite(row.fg_missed, `${context}.fg_missed`),
    fg_blocked: finite(row.fg_blocked, `${context}.fg_blocked`),
    fg_made_0_19: finite(row.fg_made_0_19, `${context}.fg_made_0_19`),
    fg_made_20_29: finite(row.fg_made_20_29, `${context}.fg_made_20_29`),
    fg_made_30_39: finite(row.fg_made_30_39, `${context}.fg_made_30_39`),
    fg_made_40_49: finite(row.fg_made_40_49, `${context}.fg_made_40_49`),
    fg_made_50_59: finite(row.fg_made_50_59, `${context}.fg_made_50_59`),
    fg_made_60_plus: finite(row.fg_made_60_, `${context}.fg_made_60_`),
    pat_made: finite(row.pat_made, `${context}.pat_made`),
    pat_att: finite(row.pat_att, `${context}.pat_att`),
    pat_missed: finite(row.pat_missed, `${context}.pat_missed`),
    pat_blocked: finite(row.pat_blocked, `${context}.pat_blocked`),
  };
  const bucketMade = facts.fg_made_0_19 + facts.fg_made_20_29 + facts.fg_made_30_39
    + facts.fg_made_40_49 + facts.fg_made_50_59 + facts.fg_made_60_plus;
  if (bucketMade !== facts.fg_made
      || facts.fg_att !== facts.fg_made + facts.fg_missed + facts.fg_blocked
      || facts.pat_att !== facts.pat_made + facts.pat_missed + facts.pat_blocked) {
    fail("INCOMPLETE_KICKER_FACT", `${context} kicking attempts do not reconcile to outcomes/buckets`);
  }
  return facts;
}

function scoreKicker(facts) {
  const rules = KICKER_RULESET.rules;
  return facts.pat_made * rules.pat_made
    + facts.fg_made_0_19 * rules.fg_made_0_19
    + facts.fg_made_20_29 * rules.fg_made_20_29
    + facts.fg_made_30_39 * rules.fg_made_30_39
    + facts.fg_made_40_49 * rules.fg_made_40_49
    + facts.fg_made_50_59 * rules.fg_made_50_59
    + facts.fg_made_60_plus * rules.fg_made_60_plus;
}

function pointsAllowedScore(pointsAllowed) {
  const tier = DST_RULESET.rules.points_allowed.find(
    (candidate) => pointsAllowed >= candidate.min
      && (candidate.max === null || pointsAllowed <= candidate.max),
  );
  if (!tier) fail("IMPOSSIBLE_VALUE", `no DST points-allowed tier covers ${pointsAllowed}`);
  return tier.points;
}

function scoreDst(facts) {
  const rules = DST_RULESET.rules;
  return facts.sacks * rules.sack
    + facts.interceptions * rules.interception
    + facts.fumble_recoveries * rules.fumble_recovery
    + facts.touchdowns * rules.touchdown
    + facts.safeties * rules.safety
    + facts.blocked_kicks * rules.blocked_kick
    + pointsAllowedScore(facts.points_allowed);
}

function kickingAggregateTemplate() {
  return {
    fg_made: 0, fg_att: 0, fg_missed: 0, fg_blocked: 0, fg_made_0_19: 0,
    fg_made_20_29: 0, fg_made_30_39: 0, fg_made_40_49: 0, fg_made_50_59: 0,
    fg_made_60_plus: 0, pat_made: 0, pat_att: 0, pat_missed: 0, pat_blocked: 0,
  };
}

const KICKING_FIELDS = Object.freeze(Object.keys(kickingAggregateTemplate()));

function addKickingFacts(target, facts) {
  for (const field of KICKING_FIELDS) target[field] += facts[field];
}

function finalizeAliases(aliasMap) {
  return [...aliasMap.values()]
    .sort((a, b) => a.canonical_id.localeCompare(b.canonical_id) || a.alias.localeCompare(b.alias));
}

function buildScoringAcceptance({
  playerCsv,
  teamCsv,
  scheduleCsv,
  season,
  weeks,
  manifestHashes,
  recommendedTargets = [],
} = {}) {
  const selectedSeason = integer(season, "season", { min: 1999, max: 2100 });
  const selectedWeeks = normalizeWeeks(weeks);
  const hashes = assertHashBundle(manifestHashes);
  const bundleEntries = Object.entries(hashes).sort(([left], [right]) => left.localeCompare(right));
  const sourceBundleHash = sha256(Buffer.from(JSON.stringify(bundleEntries)));
  const playerRows = parseCsvObjects(playerCsv, PLAYER_REQUIRED_COLUMNS);
  const teamRows = parseCsvObjects(teamCsv, TEAM_REQUIRED_COLUMNS);
  const scheduleRows = parseCsvObjects(scheduleCsv, SCHEDULE_REQUIRED_COLUMNS);
  const { games, byId: gameRegistry } = buildGameRegistry(scheduleRows, selectedSeason, selectedWeeks);

  const playerKeys = new Set();
  const playerCountByGame = new Map();
  const playerCountByTeamGame = new Map();
  const players = new Map();
  const playerAliases = new Map();
  const teams = new Map();
  const teamAliases = new Map();
  const offensive = [];
  const kicker = [];
  const derivedOffensive = [];
  const derivedKicker = [];
  const playerKickingByTeamGame = new Map();
  let maxOffensiveDelta = 0;
  let excludedNonScoreableRows = 0;

  function recordTeam(team, game) {
    if (!teams.has(team.canonical_id)) {
      teams.set(team.canonical_id, {
        canonical_id: team.canonical_id,
        franchise: team.franchise,
        season: selectedSeason,
      });
    }
    const aliasKey = `${team.canonical_id}|${team.alias}`;
    const existingAlias = teamAliases.get(aliasKey);
    if (existingAlias) {
      existingAlias.valid_from_week = Math.min(existingAlias.valid_from_week, game.week);
      existingAlias.valid_to_week = Math.max(existingAlias.valid_to_week, game.week);
      existingAlias.valid_from_date = existingAlias.valid_from_date < game.gameday
        ? existingAlias.valid_from_date : game.gameday;
      existingAlias.valid_to_date = existingAlias.valid_to_date > game.gameday
        ? existingAlias.valid_to_date : game.gameday;
    } else {
      teamAliases.set(aliasKey, {
        canonical_id: team.canonical_id,
        alias: team.alias,
        source: "nflverse-data",
        valid_from_season: selectedSeason,
        valid_from_week: game.week,
        valid_from_date: game.gameday,
        valid_to_season: selectedSeason,
        valid_to_week: game.week,
        valid_to_date: game.gameday,
        confidence: 1,
        review_state: "accepted",
      });
    }
  }

  for (const [rowIndex, row] of playerRows.entries()) {
    const context = `stats_player row ${rowIndex + 2}`;
    if (!validateRowScope(row, context, selectedSeason, selectedWeeks, gameRegistry)) continue;
    const game = gameRegistry.get(row.game_id);
    if (!String(row.player_id || "").trim()) {
      const hasScoreableValue = SCOREABLE_PLAYER_FIELDS.some(
        (field) => finite(row[field], `${context}.${field}`) !== 0,
      );
      if (hasScoreableValue) {
        fail("INVALID_PLAYER_IDENTITY", `${context} has scoreable facts without a canonical GSIS id`);
      }
      excludedNonScoreableRows += 1;
      continue;
    }
    const playerId = playerIdentity(row, context);
    const team = canonicalTeam(row.team, selectedSeason);
    const opponent = canonicalTeam(row.opponent_team, selectedSeason);
    if (![game.away_team_id, game.home_team_id].includes(team.canonical_id)
        || ![game.away_team_id, game.home_team_id].includes(opponent.canonical_id)
        || team.canonical_id === opponent.canonical_id) {
      fail("SCHEDULE_MISMATCH", `${context} team/opponent do not match ${game.game_id}`);
    }
    const factKey = `${game.game_id}|${playerId}`;
    if (playerKeys.has(factKey)) fail("DUPLICATE_FACT", `duplicate player-game fact ${factKey}`);
    playerKeys.add(factKey);
    playerCountByGame.set(game.game_id, (playerCountByGame.get(game.game_id) || 0) + 1);
    const playerTeamGameKey = `${game.game_id}|${team.canonical_id}`;
    playerCountByTeamGame.set(
      playerTeamGameKey,
      (playerCountByTeamGame.get(playerTeamGameKey) || 0) + 1,
    );
    recordTeam(team, game);
    recordTeam(opponent, game);

    const name = String(row.player_display_name || row.player_name || "").trim();
    if (!name) fail("INVALID_PLAYER_IDENTITY", `${context} has no player name alias`);
    const player = players.get(playerId) || {
      canonical_id: playerId,
      identity_type: "GSIS",
      positions: new Set(),
    };
    if (row.position) player.positions.add(String(row.position));
    players.set(playerId, player);
    const aliasKey = `${playerId}|${name}`;
    const existingAlias = playerAliases.get(aliasKey);
    if (existingAlias) {
      existingAlias.valid_from_week = Math.min(existingAlias.valid_from_week, game.week);
      existingAlias.valid_to_week = Math.max(existingAlias.valid_to_week, game.week);
    } else {
      playerAliases.set(aliasKey, {
        canonical_id: playerId,
        alias: name,
        source: "nflverse-data",
        valid_from_season: selectedSeason,
        valid_from_week: game.week,
        valid_to_season: selectedSeason,
        valid_to_week: game.week,
        confidence: 1,
        review_state: "accepted",
      });
    }

    const base = {
      season: selectedSeason,
      season_type: "REG",
      week: game.week,
      game_id: game.game_id,
      canonical_game_id: game.canonical_id,
      raw_manifest_hash: sourceBundleHash,
    };
    const offenseFacts = { ...base, ...offensiveFacts(row, playerId, team, context) };
    const scores = scoreOffense(offenseFacts);
    const publisherStandard = finite(row.fantasy_points, `${context}.fantasy_points`, { blankAsZero: false });
    const publisherPpr = finite(row.fantasy_points_ppr, `${context}.fantasy_points_ppr`, { blankAsZero: false });
    const standardDelta = Math.abs(scores.standard - publisherStandard);
    const pprDelta = Math.abs(scores.ppr - publisherPpr);
    maxOffensiveDelta = Math.max(maxOffensiveDelta, standardDelta, pprDelta);
    if (standardDelta > SCORE_TOLERANCE || pprDelta > SCORE_TOLERANCE) {
      fail("OFFENSIVE_REFERENCE_MISMATCH", `${factKey} differs from nflverse reference`, {
        standard_delta: standardDelta,
        ppr_delta: pprDelta,
      });
    }
    if (Math.abs((scores.half_ppr - scores.standard) - 0.5 * offenseFacts.receptions) > SCORE_TOLERANCE
        || Math.abs((scores.ppr - scores.standard) - offenseFacts.receptions) > SCORE_TOLERANCE
        || (offenseFacts.receptions > 0
          && !(scores.standard < scores.half_ppr && scores.half_ppr < scores.ppr))) {
      fail("SCORING_IDENTITY_MISMATCH", `${factKey} violates Standard/Half/PPR identities`);
    }
    offensive.push(offenseFacts);
    derivedOffensive.push({
      ...base,
      subject_type: "offensive_player",
      subject_id: playerId,
      ruleset_version: OFFENSIVE_RULESET_VERSION,
      ...scores,
      publisher_reference: { standard: publisherStandard, ppr: publisherPpr },
    });

    const observedKicker = kickerFacts(row, playerId, team, context);
    const hasKickingActivity = KICKING_FIELDS.some((field) => observedKicker[field] !== 0);
    if (String(row.position).toUpperCase() === "K" || hasKickingActivity) {
      const kickerRow = { ...base, ...observedKicker };
      const kickerScore = scoreKicker(kickerRow);
      kicker.push(kickerRow);
      derivedKicker.push({
        ...base,
        subject_type: "kicker",
        subject_id: playerId,
        ruleset_version: KICKER_RULESET.version,
        standard: kickerScore,
        half_ppr: kickerScore,
        ppr: kickerScore,
      });
    }
    const teamGameKey = `${game.game_id}|${team.canonical_id}`;
    const aggregate = playerKickingByTeamGame.get(teamGameKey) || kickingAggregateTemplate();
    addKickingFacts(aggregate, observedKicker);
    playerKickingByTeamGame.set(teamGameKey, aggregate);
  }

  const expectedGames = new Set(games.map((game) => game.game_id));
  for (const gameId of expectedGames) {
    const playerCount = playerCountByGame.get(gameId) || 0;
    if (playerCount < 1 || playerCount > 200) {
      fail(
        "ROW_CARDINALITY_DRIFT",
        `${gameId} has ${playerCount} player facts; evidenced band is 1 through 200 per completed game`,
      );
    }
  }
  for (const game of games) {
    for (const teamId of [game.away_team_id, game.home_team_id]) {
      const count = playerCountByTeamGame.get(`${game.game_id}|${teamId}`) || 0;
      if (count < 1 || count > 100) {
        fail(
          "ROW_CARDINALITY_DRIFT",
          `${game.game_id}|${teamId} has ${count} player facts; evidenced band is 1 through 100 per team-game`,
        );
      }
    }
  }

  const teamKeys = new Set();
  const dst = [];
  const derivedDst = [];
  for (const [rowIndex, row] of teamRows.entries()) {
    const context = `stats_team row ${rowIndex + 2}`;
    if (!validateRowScope(row, context, selectedSeason, selectedWeeks, gameRegistry)) continue;
    assertNonnegative(row, NONNEGATIVE_TEAM_FIELDS, context);
    const game = gameRegistry.get(row.game_id);
    const team = canonicalTeam(row.team, selectedSeason);
    const opponent = canonicalTeam(row.opponent_team, selectedSeason);
    if (![game.away_team_id, game.home_team_id].includes(team.canonical_id)
        || ![game.away_team_id, game.home_team_id].includes(opponent.canonical_id)
        || team.canonical_id === opponent.canonical_id) {
      fail("SCHEDULE_MISMATCH", `${context} team/opponent do not match ${game.game_id}`);
    }
    recordTeam(team, game);
    recordTeam(opponent, game);
    const factKey = `${game.game_id}|${team.canonical_id}`;
    if (teamKeys.has(factKey)) fail("DUPLICATE_FACT", `duplicate team-game fact ${factKey}`);
    teamKeys.add(factKey);
    const pointsAllowed = team.canonical_id === game.away_team_id ? game.home_score : game.away_score;
    const base = {
      season: selectedSeason,
      season_type: "REG",
      week: game.week,
      game_id: game.game_id,
      canonical_game_id: game.canonical_id,
      raw_manifest_hash: sourceBundleHash,
    };
    const facts = {
      ...base,
      fact_version: DST_FACT_VERSION,
      subject_id: team.canonical_id,
      opponent_team_id: opponent.canonical_id,
      sacks: finite(row.def_sacks, `${context}.def_sacks`),
      interceptions: finite(row.def_interceptions, `${context}.def_interceptions`),
      fumble_recoveries: finite(row.fumble_recovery_opp, `${context}.fumble_recovery_opp`),
      touchdowns: finite(row.def_tds, `${context}.def_tds`)
        + finite(row.fumble_recovery_tds, `${context}.fumble_recovery_tds`)
        + finite(row.special_teams_tds, `${context}.special_teams_tds`),
      safeties: finite(row.def_safeties, `${context}.def_safeties`),
      blocked_kicks: finite(row.def_punt_blocks, `${context}.def_punt_blocks`)
        + finite(row.def_pat_blocks, `${context}.def_pat_blocks`)
        + finite(row.def_fg_blocks, `${context}.def_fg_blocks`),
      points_allowed: pointsAllowed,
    };
    dst.push(facts);
    const dstScore = scoreDst(facts);
    derivedDst.push({
      ...base,
      subject_type: "team_dst",
      subject_id: team.canonical_id,
      ruleset_version: DST_RULESET.version,
      standard: dstScore,
      half_ppr: dstScore,
      ppr: dstScore,
    });

    const teamKicking = kickerFacts(row, team.canonical_id, team, context);
    const playerKicking = playerKickingByTeamGame.get(factKey) || kickingAggregateTemplate();
    const mismatchFields = KICKING_FIELDS.filter((field) => teamKicking[field] !== playerKicking[field]);
    if (mismatchFields.length) {
      fail("KICKER_REFERENCE_MISMATCH", `${factKey} player kicking facts differ from team reference`, {
        fields: mismatchFields,
      });
    }
  }

  for (const game of games) {
    const expected = new Set([game.away_team_id, game.home_team_id]);
    const observed = [...teamKeys]
      .filter((key) => key.startsWith(`${game.game_id}|`))
      .map((key) => key.slice(game.game_id.length + 1));
    if (observed.length !== 2 || observed.some((teamId) => !expected.has(teamId))) {
      fail("INCOMPLETE_GAME_COVERAGE", `${game.game_id} requires exactly two reciprocal team facts`);
    }
  }

  const canonicalPlayers = [...players.values()]
    .map((player) => ({ ...player, positions: [...player.positions].sort() }))
    .sort((a, b) => a.canonical_id.localeCompare(b.canonical_id));
  const canonicalTeams = [...teams.values()].sort((a, b) => a.canonical_id.localeCompare(b.canonical_id));
  const playerIdSet = new Set(canonicalPlayers.map((player) => player.canonical_id));
  const teamIdSet = new Set(canonicalTeams.map((team) => team.canonical_id));
  for (const target of recommendedTargets) {
    const targetType = String(target?.subject_type || "");
    const targetId = String(target?.subject_id || "");
    const resolved = targetType === "player" ? playerIdSet.has(targetId)
      : targetType === "team_dst" ? teamIdSet.has(targetId)
        : false;
    if (!resolved) fail("UNRESOLVED_TARGET", `${targetType || "unknown"}:${targetId || "(missing)"} did not resolve exactly once`);
  }
  const playerCounts = [...playerCountByGame.values()];
  const playerTeamCounts = [...playerCountByTeamGame.values()];
  const derivedKeys = new Set();
  for (const derived of [...derivedOffensive, ...derivedKicker, ...derivedDst]) {
    const derivedKey = [
      derived.season,
      derived.season_type,
      derived.week,
      derived.subject_type,
      derived.subject_id,
      derived.ruleset_version,
      derived.raw_manifest_hash,
    ].join("|");
    if (derivedKeys.has(derivedKey)) {
      fail("DUPLICATE_DERIVED_RESULT", `derived result key repeats: ${derivedKey}`);
    }
    derivedKeys.add(derivedKey);
  }

  return {
    schema: ACCEPTANCE_SCHEMA,
    normalization_version: NORMALIZATION_VERSION,
    source_manifests: hashes,
    source_bundle_hash: sourceBundleHash,
    scope: { season: selectedSeason, season_type: "REG", weeks: selectedWeeks },
    rulesets: {
      offensive: { version: OFFENSIVE_RULESET_VERSION },
      kicker: KICKER_RULESET,
      dst: DST_RULESET,
    },
    normalized: {
      games,
      players: canonicalPlayers,
      teams: canonicalTeams,
      player_aliases: finalizeAliases(playerAliases),
      team_aliases: finalizeAliases(teamAliases),
    },
    facts: { offensive, kicker, dst },
    derived: { offensive: derivedOffensive, kicker: derivedKicker, dst: derivedDst },
    quality: {
      status: "accepted",
      tolerance: SCORE_TOLERANCE,
      completed_games: games.length,
      row_cardinality: {
        offensive: offensive.length,
        kicker: kicker.length,
        dst: dst.length,
        excluded_non_scoreable_rows: excludedNonScoreableRows,
        player_rows_per_game_band: { min: 1, max: 200 },
        player_rows_per_team_game_band: { min: 1, max: 100 },
        observed_player_rows_per_game: {
          min: Math.min(...playerCounts),
          max: Math.max(...playerCounts),
        },
        observed_player_rows_per_team_game: {
          min: Math.min(...playerTeamCounts),
          max: Math.max(...playerTeamCounts),
        },
      },
      reference: {
        offensive_mismatches: 0,
        offensive_max_delta: maxOffensiveDelta,
        kicker_team_mismatches: 0,
      },
      duplicate_facts: 0,
      unresolved_targets: 0,
      impossible_values: 0,
      checks: [
        "exact_manifest_provenance",
        "completed_schedule_coverage",
        "canonical_identity_coverage",
        "player_game_uniqueness",
        "team_game_reciprocity",
        "player_row_cardinality_band",
        "derived_result_key_uniqueness",
        "offensive_scoring_identity",
        "offensive_publisher_reference",
        "kicker_component_reconciliation",
        "kicker_team_reference",
        "dst_schedule_points_allowed",
      ],
    },
    publication: {
      authorized: false,
      promoted: false,
      reason: "Phase 2 acceptance evidence only; publication requires a later founder-approved phase.",
    },
  };
}

function artifactTime(iso) {
  return iso.replace(/[-:.]/g, "");
}

async function writeAcceptanceArtifact({ result, outputRoot, now = () => new Date() } = {}) {
  const selectedRoot = assertLocalVaultRoot(outputRoot);
  await fs.mkdir(selectedRoot, { recursive: true });
  const realRoot = await fs.realpath(selectedRoot);
  assertLocalVaultRoot(realRoot);
  const generatedAt = now().toISOString();
  const runId = `${artifactTime(generatedAt)}-${result.source_bundle_hash.slice(0, 16)}`;
  const runRoot = path.join(realRoot, runId);
  try {
    await fs.mkdir(runRoot);
  } catch (error) {
    if (error.code === "EEXIST") fail("ACCEPTANCE_RUN_EXISTS", `acceptance run already exists: ${runId}`);
    throw error;
  }
  const acceptanceBytes = Buffer.from(`${JSON.stringify(result, null, 2)}\n`);
  const acceptanceHash = sha256(acceptanceBytes);
  const acceptancePath = path.join(runRoot, "acceptance.json");
  const receiptPath = path.join(runRoot, "receipt.json");
  const receipt = {
    schema: "omen-football-scoring-replay.v1",
    replay_id: runId,
    generated_at_utc: generatedAt,
    acceptance_sha256: acceptanceHash,
    source_bundle_hash: result.source_bundle_hash,
    scope: result.scope,
    quality: result.quality,
    publication: result.publication,
  };
  await fs.writeFile(acceptancePath, acceptanceBytes, { flag: "wx" });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
  return { acceptancePath, receipt, receiptPath, runRoot };
}

async function runScoringAcceptance({
  root,
  playerManifestPath,
  teamManifestPath,
  scheduleManifestPath,
  outputRoot,
  season,
  weeks,
  recommendedTargets = [],
  now,
} = {}) {
  const [player, team, schedules] = await Promise.all([
    readExactSnapshot({ root, manifestPath: playerManifestPath, expectedDataset: "stats_player" }),
    readExactSnapshot({ root, manifestPath: teamManifestPath, expectedDataset: "stats_team" }),
    readExactSnapshot({ root, manifestPath: scheduleManifestPath, expectedDataset: "schedules" }),
  ]);
  const result = buildScoringAcceptance({
    playerCsv: player.rawBytes,
    teamCsv: team.rawBytes,
    scheduleCsv: schedules.rawBytes,
    season,
    weeks,
    manifestHashes: {
      stats_player: player.manifestHash,
      stats_team: team.manifestHash,
      schedules: schedules.manifestHash,
    },
    recommendedTargets,
  });
  return writeAcceptanceArtifact({ result, outputRoot, now });
}

module.exports = {
  ACCEPTANCE_SCHEMA,
  DST_FACT_VERSION,
  DST_RULESET,
  FootballDataAcceptanceError,
  KICKER_FACT_VERSION,
  KICKER_RULESET,
  NORMALIZATION_VERSION,
  OFFENSIVE_FACT_VERSION,
  OFFENSIVE_RULESET_VERSION,
  SCORE_TOLERANCE,
  buildScoringAcceptance,
  parseCsvObjects,
  runScoringAcceptance,
  scoreDst,
  scoreKicker,
  scoreOffense,
  writeAcceptanceArtifact,
};
