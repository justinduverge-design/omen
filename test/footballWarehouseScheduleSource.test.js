"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { TEAMS } = require("../src/services/footballIntelligence/nflTeams");
const {
  adaptSchedulesCsv,
  SCHEDULES_SOURCE_URL,
  REQUIRED_COLUMNS,
} = require("../src/services/footballWarehouse/scheduleSource");

const teams = Object.keys(TEAMS);

function csvField(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function row(overrides = {}) {
  return {
    game_id: "2026_01_ARI_ATL", season: "2026", game_type: "REG", week: "1",
    gameday: "2026-09-10", gametime: "20:20", away_team: "ARI", away_score: "20",
    home_team: "ATL", home_score: "21", overtime: "0", stadium: "Example Field",
    location: "Home", roof: "outdoors", surface: "grass", temp: "70", wind: "5",
    away_rest: "7", home_rest: "7", div_game: "false", spread_line: "-2.5",
    total_line: "44.5", away_moneyline: "110", home_moneyline: "-130",
    away_coach: "Away Coach", home_coach: "Home Coach", ...overrides,
  };
}

function validRows() {
  const rows = [];
  for (let week = 1; week <= 15; week += 1) {
    for (let index = 0; index < teams.length; index += 2) {
      const away = teams[index];
      const home = teams[index + 1];
      rows.push(row({
        game_id: `2026_${String(week).padStart(2, "0")}_${away}_${home}`,
        week: String(week), away_team: away, home_team: home,
      }));
    }
  }
  rows.push(row({
    game_id: "1999_01_OAK_SDG", season: "1999", away_team: "OAK", home_team: "SDG",
    gameday: "1999-09-12", gametime: "13:00",
  }));
  rows.push(row({
    game_id: "2001_01_STL_JAC", season: "2001", away_team: "STL", home_team: "JAC",
    gameday: "2001-09-09", gametime: "13:00",
  }));
  rows.push(row({
    game_id: "2002_01_WSH_DAL", season: "2002", away_team: "WSH", home_team: "DAL",
    gameday: "2002-09-08", gametime: "13:00",
  }));
  rows.push(row({
    game_id: "2026_00_BUF_MIA", game_type: "PRE", week: "1", away_team: "BUF", home_team: "MIA",
    gameday: "2026-08-15", gametime: "19:00", away_score: "", home_score: "",
  }));
  return rows;
}

function encode(rows = validRows(), headers = REQUIRED_COLUMNS) {
  return Buffer.from([
    headers.join(","),
    ...rows.map((item) => headers.map((header) => csvField(item[header])).join(",")),
  ].join("\r\n"));
}

function adapt(raw = encode()) {
  return adaptSchedulesCsv({
    raw,
    sourceUrl: SCHEDULES_SOURCE_URL,
    runId: "schedule-test-2026",
    season: 2026,
  });
}

test("adapts an exact global schedule with 32 canonical teams and explicit preseason exclusion", () => {
  const raw = encode();
  const result = adapt(raw);
  assert.equal(result.teamRows.length, 32);
  assert.equal(result.gameRows.length, 240);
  assert.equal(result.excludedRows.length, 1);
  assert.equal(result.receipt.sourceRows, 244);
  assert.equal(result.receipt.sourceBytes, raw.length);
  assert.equal(result.receipt.sourceRef, `sha256:${crypto.createHash("sha256").update(raw).digest("hex")}`);
  assert.deepEqual(result.receipt.metadata, {
    schema_fingerprint: `sha256:${crypto.createHash("sha256")
      .update(Buffer.from(JSON.stringify([...REQUIRED_COLUMNS]))).digest("hex")}`,
    source_columns: [...REQUIRED_COLUMNS], selected_rows: 240, preseason_rows: 1, team_rows: 32,
  });
  assert.equal(result.gameRows[0].kickoffAt, null);
  assert.equal(result.gameRows[0].sourceRow.gametime, "20:20");
  assert.equal(result.gameRows[0].divisionGame, false);
  assert.equal(result.gameRows[0].overtime, false);
});

test("normalizes historical franchise aliases while preserving observations and season ranges", () => {
  const result = adapt();
  const alias = (value) => result.observedAliases.find((item) => item.alias === value);
  assert.deepEqual(alias("OAK"), {
    alias: "OAK", canonicalAbbreviation: "LV", teamId: "omen:team:lv",
    firstSeason: 1999, lastSeason: 1999,
  });
  assert.equal(alias("SDG").teamId, "omen:team:lac");
  assert.equal(alias("STL").teamId, "omen:team:la");
  assert.equal(alias("JAC").teamId, "omen:team:jax");
  assert.equal(alias("WSH").teamId, "omen:team:was");
  assert.equal(result.teamRows.find((item) => item.nflverseAbbr === "LV").firstSeason, 1999);
  assert.equal(result.teamRows.find((item) => item.nflverseAbbr === "LAC").firstSeason, 1999);
});

test("preserves RFC 4180 fields, null scores, and typed optional values", () => {
  const rows = validRows();
  rows[0] = row({ ...rows[0], stadium: "Field, \"North\"\nLevel", away_score: "", home_score: "",
    overtime: "NA", temp: "NA", wind: "", away_moneyline: "-105" });
  const result = adapt(encode(rows));
  const game = result.gameRows.find((item) => item.gameId === rows[0].game_id);
  assert.equal(game.stadium, "Field, \"North\"\nLevel");
  assert.equal(game.sourceRow.stadium, "Field, \"North\"\nLevel");
  assert.equal(game.awayScore, null);
  assert.equal(game.homeScore, null);
  assert.equal(game.overtime, null);
  assert.equal(game.temperatureF, null);
  assert.equal(game.awayMoneyline, -105);
});

test("fails closed on wrong URL, missing columns, invalid UTF-8, and malformed CSV", () => {
  assert.throws(() => adaptSchedulesCsv({ raw: encode(), sourceUrl: `${SCHEDULES_SOURCE_URL}?x=1`, runId: "x", season: 2026 }), /allowlisted/);
  assert.throws(() => adapt(encode(validRows(), REQUIRED_COLUMNS.filter((field) => field !== "game_id"))), /missing required column: game_id/);
  assert.throws(() => adapt(Buffer.from([0xff, 0xfe])), /valid UTF-8/);
  assert.throws(() => adapt(Buffer.from(`${REQUIRED_COLUMNS.join(",")}\n"unterminated`)), /unterminated/);
});

test("rejects unknown teams, duplicate games, malformed identifiers, and invalid booleans", () => {
  const cases = [
    [{ away_team: "XYZ" }, /known NFL team/],
    [{ game_id: "bad" }, /game_id is malformed/],
    [{ game_id: "2026_01_BUF_MIA" }, /game_id teams do not match/],
    [{ game_id: "2026_02_ARI_ATL" }, /game_id week does not match/],
    [{ overtime: "sometimes" }, /overtime is not boolean/],
    [{ div_game: "2" }, /div_game is not boolean/],
  ];
  for (const [change, error] of cases) {
    const rows = validRows(); rows[0] = row({ ...rows[0], ...change });
    assert.throws(() => adapt(encode(rows)), error);
  }
  const rows = validRows();
  rows[1] = {
    ...rows[1], game_id: rows[0].game_id, week: rows[0].week,
    away_team: rows[0].away_team, home_team: rows[0].home_team,
  };
  assert.throws(() => adapt(encode(rows)), /duplicate selected-season game_id/);
});

test("rejects partial scores and malformed numeric, date, and time fields", () => {
  const cases = [
    [{ away_score: "10", home_score: "" }, /partial scores/],
    [{ away_score: "ten", home_score: "10" }, /away_score is not numeric/],
    [{ week: "1.5" }, /week is invalid/],
    [{ gameday: "2026-02-30" }, /valid date/],
    [{ gametime: "8:00 PM" }, /not HH:MM/],
    [{ wind: "fast" }, /wind is not numeric/],
  ];
  for (const [change, error] of cases) {
    const rows = validRows(); rows[0] = row({ ...rows[0], ...change });
    assert.throws(() => adapt(encode(rows)), error);
  }
});

test("rejects empty or truncated selected seasons and incomplete global team coverage", () => {
  assert.throws(() => adapt(encode(validRows().filter((item) => item.season !== "2026"))), /empty or truncated/);
  assert.throws(() => adapt(encode(validRows().slice(0, 10))), /empty or truncated/);
  const withoutHouston = validRows().filter((item) => item.away_team !== "HOU" && item.home_team !== "HOU");
  assert.throws(() => adapt(encode(withoutHouston)), /empty or truncated|all 32 canonical teams/);
});
