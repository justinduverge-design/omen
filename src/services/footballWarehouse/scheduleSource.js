"use strict";

const crypto = require("node:crypto");
const {
  TEAMS,
  canonicalAbbreviation,
  teamIdFor,
  teamName,
} = require("../footballIntelligence/nflTeams");
const { parseStrictCsv, MAX_SOURCE_BYTES } = require("./playerWeeklySource");

const SCHEDULES_SOURCE_URL =
  "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv";
const REQUIRED_COLUMNS = Object.freeze([
  "game_id", "season", "game_type", "week", "gameday", "gametime",
  "away_team", "away_score", "home_team", "home_score", "overtime",
  "stadium", "location", "roof", "surface", "temp", "wind",
  "away_rest", "home_rest", "div_game", "spread_line", "total_line",
  "away_moneyline", "home_moneyline", "away_coach", "home_coach",
]);
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const GAME_TYPES = new Set(["PRE", "REG", "WC", "DIV", "CON", "SB"]);
const ADMITTED_GAME_TYPES = new Set(["REG", "WC", "DIV", "CON", "SB"]);
// Every admitted season is a complete published schedule, including future games.
// Even the 28-team 1999 season clears 250 games; 240 leaves bounded room for
// historical source quirks without admitting a partial contemporary season.
const MIN_SELECTED_GAMES = 240;
const MIN_SELECTED_TEAMS = 28;
const LOCAL_ALIASES = Object.freeze({ SDG: "LAC" });

function textOrNull(value) {
  const text = String(value ?? "").trim();
  return !text || text.toUpperCase() === "NA" ? null : text;
}

function finiteOrNull(value, label) {
  const text = textOrNull(value);
  if (text == null) return null;
  const number = Number(text);
  if (!Number.isFinite(number)) throw new TypeError(`${label} is not numeric`);
  return number;
}

function integerOrNull(value, label, min, max) {
  const number = finiteOrNull(value, label);
  if (number == null) return null;
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new TypeError(`${label} is invalid`);
  }
  return number;
}

function requiredInteger(value, label, min, max) {
  const number = integerOrNull(value, label, min, max);
  if (number == null) throw new TypeError(`${label} is empty`);
  return number;
}

function booleanOrNull(value, label) {
  const text = textOrNull(value);
  if (text == null) return null;
  if (["1", "true", "t", "yes"].includes(text.toLowerCase())) return true;
  if (["0", "false", "f", "no"].includes(text.toLowerCase())) return false;
  throw new TypeError(`${label} is not boolean`);
}

function validateSourceUrl(value) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new TypeError("sourceUrl is invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new TypeError("sourceUrl is invalid");
  }
  if (value !== SCHEDULES_SOURCE_URL) {
    throw new TypeError("sourceUrl is not the allowlisted schedules asset");
  }
}

function parseObjects(raw) {
  if (!Buffer.isBuffer(raw)) throw new TypeError("raw must be a Buffer");
  if (!raw.length) throw new TypeError("CSV source is empty");
  if (raw.length > MAX_SOURCE_BYTES) {
    throw new RangeError(`CSV source exceeds ${MAX_SOURCE_BYTES} bytes`);
  }
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(raw); } catch {
    throw new TypeError("CSV source is not valid UTF-8");
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const records = parseStrictCsv(text);
  if (records.length < 2) throw new TypeError("CSV source has no data rows");
  const headers = records[0].map((header) => header.trim());
  if (headers.some((header) => !header)) throw new TypeError("CSV contains an empty header");
  if (new Set(headers).size !== headers.length) throw new TypeError("CSV contains duplicate headers");
  for (const column of REQUIRED_COLUMNS) {
    if (!headers.includes(column)) throw new TypeError(`CSV missing required column: ${column}`);
  }
  const rows = records.slice(1).map((values, index) => {
    if (values.length !== headers.length) {
      throw new TypeError(`CSV row ${index + 2} has ${values.length} fields; expected ${headers.length}`);
    }
    if (values.every((value) => value === "")) throw new TypeError(`CSV row ${index + 2} is empty`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
  return { headers, rows };
}

function canonicalTeam(value, label) {
  const alias = textOrNull(value)?.toUpperCase();
  if (!alias) throw new TypeError(`${label} is empty`);
  const canonical = LOCAL_ALIASES[alias] || canonicalAbbreviation(alias);
  if (!canonical || !teamIdFor(canonical)) throw new TypeError(`${label} is not a known NFL team`);
  return { alias, canonical, teamId: teamIdFor(canonical) };
}

function isoDate(value, label) {
  const text = textOrNull(value);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new TypeError(`${label} is not an ISO date`);
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== text) {
    throw new TypeError(`${label} is not a valid date`);
  }
  return text;
}

function validateGameTime(value, label) {
  const text = textOrNull(value);
  if (text != null && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text)) {
    throw new TypeError(`${label} is not HH:MM`);
  }
  return text;
}

function adaptSchedulesCsv({ raw, sourceUrl, runId, season }) {
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    throw new TypeError("season must be an integer from 1999 through 2100");
  }
  if (typeof runId !== "string" || !RUN_ID.test(runId)) throw new TypeError("runId is invalid");
  validateSourceUrl(sourceUrl);
  const parsed = parseObjects(raw);
  const observations = new Map();
  const aliases = new Map();
  const selected = [];
  const excludedRows = [];
  const gameIds = new Set();

  for (let index = 0; index < parsed.rows.length; index += 1) {
    const sourceRow = parsed.rows[index];
    const label = `CSV row ${index + 2}`;
    const rowSeason = requiredInteger(sourceRow.season, `${label} season`, 1999, 2100);
    const type = String(sourceRow.game_type ?? "").trim().toUpperCase();
    if (!GAME_TYPES.has(type)) throw new TypeError(`${label} game_type is invalid`);
    const away = canonicalTeam(sourceRow.away_team, `${label} away_team`);
    const home = canonicalTeam(sourceRow.home_team, `${label} home_team`);
    if (away.teamId === home.teamId) throw new TypeError(`${label} has the same home and away team`);

    for (const team of [away, home]) {
      const current = observations.get(team.canonical) || { min: rowSeason, max: rowSeason };
      current.min = Math.min(current.min, rowSeason);
      current.max = Math.max(current.max, rowSeason);
      observations.set(team.canonical, current);
      const key = `${team.canonical}\0${team.alias}`;
      const observed = aliases.get(key) || {
        alias: team.alias,
        canonicalAbbreviation: team.canonical,
        teamId: team.teamId,
        firstSeason: rowSeason,
        lastSeason: rowSeason,
      };
      observed.firstSeason = Math.min(observed.firstSeason, rowSeason);
      observed.lastSeason = Math.max(observed.lastSeason, rowSeason);
      aliases.set(key, observed);
    }

    if (rowSeason !== season) continue;
    if (type === "PRE") {
      excludedRows.push({ reason: "preseason", gameId: textOrNull(sourceRow.game_id), sourceRow });
      continue;
    }
    if (!ADMITTED_GAME_TYPES.has(type)) throw new TypeError(`${label} game_type is not admitted`);

    const gameId = textOrNull(sourceRow.game_id);
    const gameIdMatch = gameId?.match(
      new RegExp(`^${season}_((?:0[1-9]|[12][0-9]))_([A-Z0-9]{2,3})_([A-Z0-9]{2,3})$`),
    );
    if (!gameIdMatch) {
      throw new TypeError(`${label} game_id is malformed`);
    }
    const idAway = canonicalTeam(gameIdMatch[2], `${label} game_id away team`);
    const idHome = canonicalTeam(gameIdMatch[3], `${label} game_id home team`);
    if (idAway.teamId !== away.teamId || idHome.teamId !== home.teamId) {
      throw new TypeError(`${label} game_id teams do not match away_team/home_team`);
    }
    if (gameIds.has(gameId)) throw new TypeError("CSV contains a duplicate selected-season game_id");
    gameIds.add(gameId);
    const week = requiredInteger(sourceRow.week, `${label} week`, 1, 23);
    if (Number(gameIdMatch[1]) !== week) throw new TypeError(`${label} game_id week does not match week`);
    const awayScore = integerOrNull(sourceRow.away_score, `${label} away_score`, 0, 255);
    const homeScore = integerOrNull(sourceRow.home_score, `${label} home_score`, 0, 255);
    if ((awayScore == null) !== (homeScore == null)) throw new TypeError(`${label} has partial scores`);
    isoDate(sourceRow.gameday, `${label} gameday`);
    validateGameTime(sourceRow.gametime, `${label} gametime`);

    selected.push({
      season: rowSeason,
      gameId,
      week,
      gameType: type,
      kickoffAt: null,
      awayTeamId: away.teamId,
      homeTeamId: home.teamId,
      awayScore,
      homeScore,
      overtime: booleanOrNull(sourceRow.overtime, `${label} overtime`),
      stadium: textOrNull(sourceRow.stadium),
      location: textOrNull(sourceRow.location),
      roof: textOrNull(sourceRow.roof),
      surface: textOrNull(sourceRow.surface),
      temperatureF: integerOrNull(sourceRow.temp, `${label} temp`, -99, 150),
      windMph: integerOrNull(sourceRow.wind, `${label} wind`, 0, 255),
      awayRestDays: integerOrNull(sourceRow.away_rest, `${label} away_rest`, 0, 255),
      homeRestDays: integerOrNull(sourceRow.home_rest, `${label} home_rest`, 0, 255),
      divisionGame: booleanOrNull(sourceRow.div_game, `${label} div_game`),
      spreadLine: finiteOrNull(sourceRow.spread_line, `${label} spread_line`),
      totalLine: finiteOrNull(sourceRow.total_line, `${label} total_line`),
      awayMoneyline: integerOrNull(sourceRow.away_moneyline, `${label} away_moneyline`, -100000, 100000),
      homeMoneyline: integerOrNull(sourceRow.home_moneyline, `${label} home_moneyline`, -100000, 100000),
      awayCoach: textOrNull(sourceRow.away_coach),
      homeCoach: textOrNull(sourceRow.home_coach),
      sourceRow,
    });
  }

  const selectedTeams = new Set(selected.flatMap((row) => [row.awayTeamId, row.homeTeamId]));
  if (selected.length < MIN_SELECTED_GAMES || selectedTeams.size < MIN_SELECTED_TEAMS) {
    throw new TypeError(`selected season is empty or truncated: ${selected.length} games, ${selectedTeams.size} teams`);
  }
  if (observations.size !== Object.keys(TEAMS).length) {
    throw new TypeError(`global schedules do not cover all 32 canonical teams: found ${observations.size}`);
  }

  const teamRows = Object.keys(TEAMS).sort().map((abbr) => ({
    teamId: teamIdFor(abbr),
    nflverseAbbr: abbr,
    displayName: teamName(abbr),
    firstSeason: observations.get(abbr).min,
    lastSeason: observations.get(abbr).max,
  }));
  const sourceRef = `sha256:${crypto.createHash("sha256").update(raw).digest("hex")}`;
  const schemaFingerprint = `sha256:${crypto.createHash("sha256")
    .update(Buffer.from(JSON.stringify(parsed.headers))).digest("hex")}`;
  return {
    receipt: {
      runId,
      sourceUrl,
      sourceRef,
      sourceBytes: raw.length,
      sourceRows: parsed.rows.length,
      metadata: {
        schema_fingerprint: schemaFingerprint,
        source_columns: parsed.headers,
        selected_rows: selected.length,
        preseason_rows: excludedRows.length,
        team_rows: teamRows.length,
      },
    },
    teamRows,
    gameRows: selected.sort((a, b) => a.week - b.week || a.gameId.localeCompare(b.gameId)),
    excludedRows,
    observedAliases: [...aliases.values()].sort((a, b) =>
      a.teamId.localeCompare(b.teamId) || a.alias.localeCompare(b.alias)),
  };
}

module.exports = {
  adaptSchedulesCsv,
  SCHEDULES_SOURCE_URL,
  REQUIRED_COLUMNS,
  MIN_SELECTED_GAMES,
  MIN_SELECTED_TEAMS,
};
