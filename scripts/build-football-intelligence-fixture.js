#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const DERIVATION_VERSION = "football-intelligence-fixture-derivation.v1";
const SNAPSHOT_WITNESSED_AT = "2026-09-24T23:23:51Z";
const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, "../test/fixtures/football-intelligence");
const FIXTURE_NAME = "ben-johnson-primary-reg-2024-2025.csv";
const MANIFEST_NAME = "ben-johnson-primary-reg-2024-2025.manifest.json";

const OUTPUT_COLUMNS = Object.freeze([
  "season",
  "week",
  "nflverse_game_id",
  "nflverse_play_id",
  "possession_team",
  "offense_formation",
  "offense_personnel",
  "defenders_in_box",
  "defense_personnel",
  "number_of_pass_rushers",
  "starting_hash",
  "qb_location",
  "n_offense_backfield",
  "n_defense_box",
  "is_no_huddle",
  "is_motion",
  "is_play_action",
  "is_screen_pass",
  "is_rpo",
  "is_trick_play",
  "is_qb_out_of_pocket",
  "is_qb_sneak",
  "n_blitzers",
  "n_pass_rushers",
]);

const FTN_REQUIRED_COLUMNS = Object.freeze([
  "nflverse_game_id", "season", "week", "nflverse_play_id", "starting_hash",
  "qb_location", "n_offense_backfield", "n_defense_box", "is_no_huddle",
  "is_motion", "is_play_action", "is_screen_pass", "is_rpo", "is_trick_play",
  "is_qb_out_of_pocket", "is_qb_sneak", "n_blitzers", "n_pass_rushers",
]);
const PARTICIPATION_REQUIRED_COLUMNS = Object.freeze([
  "nflverse_game_id", "play_id", "possession_team", "offense_formation",
  "offense_personnel", "defenders_in_box", "defense_personnel",
  "number_of_pass_rushers",
]);
const SCHEDULE_REQUIRED_COLUMNS = Object.freeze([
  "game_id", "season", "game_type", "week", "away_team", "home_team",
  "away_coach", "home_coach",
]);

const SOURCES = Object.freeze([
  source({
    filename: "ftn_charting_2024.csv",
    family: "ftn_charting",
    season: 2024,
    bytes: 8254908,
    rows: 48031,
    sha256: "6faae8118cc13ce62589210d553733128ed35e558671009b4a7a8fc5c674c2cb",
    assetUpdatedAt: "2025-09-01T01:29:37Z",
  }),
  source({
    filename: "ftn_charting_2025.csv",
    family: "ftn_charting",
    season: 2025,
    bytes: 8128926,
    rows: 47316,
    sha256: "62a66416043ff08d43303bf5f3af5390e3fe0f29461a1fc6e295a15cac6ea994",
    assetUpdatedAt: "2026-09-23T03:14:31Z",
  }),
  source({
    filename: "pbp_participation_2024.csv",
    family: "pbp_participation",
    season: 2024,
    bytes: 49688308,
    rows: 45919,
    sha256: "b1f436a98b2a7759eb4ed1181e072a35c2666f9aeb356a49c943d28d6be6b0b9",
    assetUpdatedAt: "2025-09-04T10:24:49Z",
  }),
  source({
    filename: "pbp_participation_2025.csv",
    family: "pbp_participation",
    season: 2025,
    bytes: 49094943,
    rows: 45184,
    sha256: "59069adfee7b0f464befba8a5e8be331e523633cc6a7ab403d37bcbcdfbe66ac",
    assetUpdatedAt: "2026-02-10T18:54:08Z",
  }),
  source({
    filename: "games.csv",
    family: "schedules",
    season: null,
    bytes: 2180809,
    rows: 7548,
    sha256: "44ea79b765e734f75cc65ad6bf8d22f3ea70fdd9560af728421501fa758845fd",
    assetUpdatedAt: "2026-09-24T23:16:22Z",
  }),
]);

const PRIMARY_COHORTS = Object.freeze([
  Object.freeze({ season: 2024, possession_team: "DET", game_type: "REG", expected_rows: 1394 }),
  Object.freeze({ season: 2024, possession_team: "CHI", game_type: "REG", expected_rows: 1401 }),
  Object.freeze({ season: 2025, possession_team: "CHI", game_type: "REG", expected_rows: 1422 }),
]);

function source({ filename, family, season, bytes, rows, sha256, assetUpdatedAt }) {
  const release = family === "schedules" ? "schedules" : family;
  return Object.freeze({
    filename,
    source_family: family,
    source_season: season,
    url: `https://github.com/nflverse/nflverse-data/releases/download/${release}/${filename}`,
    bytes,
    rows,
    sha256,
    asset_updated_at: assetUpdatedAt,
    licence: family === "schedules" ? "CC-BY-4.0" : "CC-BY-SA-4.0",
    attribution: family === "schedules" ? "nflverse" : "FTN Data via nflverse",
  });
}

async function buildFixture({ sourceDir, outputDir = DEFAULT_OUTPUT_DIR } = {}) {
  let temporarySourceDir = null;
  if (!sourceDir) {
    temporarySourceDir = await fs.mkdtemp(path.join(os.tmpdir(), "omen-football-intelligence-"));
    sourceDir = temporarySourceDir;
    await downloadSources(sourceDir);
  }

  try {
    const verified = new Map();
    for (const spec of SOURCES) verified.set(spec.filename, await verifySourceFile(sourceDir, spec));

    const scheduleRows = await parseCsvProjected(
      verified.get("games.csv").path,
      SCHEDULE_REQUIRED_COLUMNS,
      SCHEDULE_REQUIRED_COLUMNS,
      sourceByName("games.csv"),
    );
    const schedulesByGame = uniqueIndex(scheduleRows, (row) => row.game_id, "schedule game_id");
    const outputRows = [];
    const yearlyReceipts = [];

    for (const season of [2024, 2025]) {
      const participationSpec = sourceByName(`pbp_participation_${season}.csv`);
      const ftnSpec = sourceByName(`ftn_charting_${season}.csv`);
      const participationRows = await parseCsvProjected(
        verified.get(participationSpec.filename).path,
        PARTICIPATION_REQUIRED_COLUMNS,
        PARTICIPATION_REQUIRED_COLUMNS,
        participationSpec,
      );
      const ftnRows = await parseCsvProjected(
        verified.get(ftnSpec.filename).path,
        FTN_REQUIRED_COLUMNS,
        FTN_REQUIRED_COLUMNS,
        ftnSpec,
      );
      const participationByPlay = uniqueIndex(
        participationRows,
        (row) => playKey(row.nflverse_game_id, row.play_id),
        `${season} participation game/play`,
      );
      const ftnKeys = new Set(ftnRows.map((row) => playKey(row.nflverse_game_id, row.nflverse_play_id)));
      const selectedCohorts = PRIMARY_COHORTS.filter((cohort) => cohort.season === season);
      const selectedTeams = new Set(selectedCohorts.map((cohort) => cohort.possession_team));
      let ftnWithoutParticipation = 0;
      let targetJoinedAllGames = 0;
      let targetPostseasonExcluded = 0;
      let targetJoinedWithoutSchedule = 0;

      for (const ftn of ftnRows) {
        const participation = participationByPlay.get(playKey(ftn.nflverse_game_id, ftn.nflverse_play_id));
        if (!participation) {
          ftnWithoutParticipation += 1;
          continue;
        }
        if (!selectedTeams.has(participation.possession_team)) continue;
        const cohort = selectedCohorts.find((candidate) => candidate.possession_team === participation.possession_team);
        if (!cohort) continue;
        targetJoinedAllGames += 1;
        const schedule = schedulesByGame.get(ftn.nflverse_game_id);
        if (!schedule) {
          targetJoinedWithoutSchedule += 1;
          continue;
        }
        if (schedule.game_type !== cohort.game_type) {
          targetPostseasonExcluded += 1;
          continue;
        }
        assertJoinConsistency({ ftn, participation, schedule, cohort });
        outputRows.push(projectRow(ftn, participation));
      }

      let targetParticipationWithoutFtn = 0;
      for (const participation of participationRows) {
        if (!selectedTeams.has(participation.possession_team)) continue;
        const schedule = schedulesByGame.get(participation.nflverse_game_id);
        if (!schedule) continue;
        if (schedule.game_type !== "REG") continue;
        if (!ftnKeys.has(playKey(participation.nflverse_game_id, participation.play_id))) {
          targetParticipationWithoutFtn += 1;
        }
      }

      yearlyReceipts.push({
        season,
        ftn_rows: ftnRows.length,
        participation_rows: participationRows.length,
        ftn_rows_without_participation: ftnWithoutParticipation,
        target_joined_all_games: targetJoinedAllGames,
        target_postseason_rows_excluded: targetPostseasonExcluded,
        target_joined_rows_without_schedule: targetJoinedWithoutSchedule,
        target_regular_season_participation_rows_without_ftn: targetParticipationWithoutFtn,
      });
    }

    outputRows.sort(compareOutputRows);
    assertOutput(outputRows);
    const fixtureBytes = Buffer.from(serializeCsv(outputRows), "utf8");
    const fixtureSha256 = sha256(fixtureBytes);
    const cohortCounts = Object.fromEntries(PRIMARY_COHORTS.map((cohort) => [
      cohortKey(cohort),
      outputRows.filter((row) => row.season === String(cohort.season) && row.possession_team === cohort.possession_team).length,
    ]));
    const manifest = {
      schema: "football-intelligence-source-fixture-manifest.v1",
      fixture: FIXTURE_NAME,
      derivation_version: DERIVATION_VERSION,
      snapshot_witnessed_at: SNAPSHOT_WITNESSED_AT,
      modified: true,
      licence: "CC-BY-SA-4.0",
      attribution: "FTN Data via nflverse",
      scope: {
        game_type: "REG",
        cohorts: PRIMARY_COHORTS,
        join: [
          "ftn_charting.nflverse_game_id = pbp_participation.nflverse_game_id",
          "ftn_charting.nflverse_play_id = pbp_participation.play_id",
          "ftn_charting.nflverse_game_id = schedules.game_id",
        ],
        sort: ["season", "possession_team", "week", "nflverse_game_id", "numeric nflverse_play_id"],
      },
      schema_columns: OUTPUT_COLUMNS,
      source_artifacts: SOURCES,
      reconciliation: {
        schedule_rows: scheduleRows.length,
        years: yearlyReceipts,
        cohort_rows: cohortCounts,
      },
      output: {
        rows: outputRows.length,
        columns: OUTPUT_COLUMNS.length,
        bytes: fixtureBytes.length,
        sha256: fixtureSha256,
        line_endings: "LF",
      },
      limitations: [
        "This fixture contains observed source fields, not a named scheme label or causal conclusion.",
        "Schedules provide head coaches only and cannot establish Detroit's 2024 offensive-coordinator assignment.",
        "The source release URLs are mutable; exact SHA-256 and byte-length pins intentionally fail on upstream drift.",
        "Public redistribution or relicensing of this adapted fixture requires a separate CC-BY-SA review.",
      ],
    };
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, FIXTURE_NAME), fixtureBytes);
    await fs.writeFile(path.join(outputDir, MANIFEST_NAME), manifestBytes);
    return {
      fixturePath: path.join(outputDir, FIXTURE_NAME),
      manifestPath: path.join(outputDir, MANIFEST_NAME),
      rows: outputRows.length,
      columns: OUTPUT_COLUMNS.length,
      sha256: fixtureSha256,
    };
  } finally {
    if (temporarySourceDir) await fs.rm(temporarySourceDir, { recursive: true, force: true });
  }
}

async function downloadSources(sourceDir) {
  await fs.mkdir(sourceDir, { recursive: true });
  for (const spec of SOURCES) {
    const response = await fetch(spec.url, { redirect: "follow", signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`source download failed (${response.status}): ${spec.url}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(path.join(sourceDir, spec.filename), bytes, { flag: "wx" });
  }
}

async function verifySourceFile(sourceDir, spec) {
  const sourcePath = path.join(sourceDir, spec.filename);
  const stat = await fs.stat(sourcePath);
  const hash = crypto.createHash("sha256");
  const stream = require("node:fs").createReadStream(sourcePath);
  for await (const chunk of stream) hash.update(chunk);
  const actualSha256 = hash.digest("hex");
  if (stat.size !== spec.bytes) {
    throw new Error(`${spec.filename} byte length drift: expected ${spec.bytes}, received ${stat.size}`);
  }
  if (actualSha256 !== spec.sha256) {
    throw new Error(`${spec.filename} SHA-256 drift: expected ${spec.sha256}, received ${actualSha256}`);
  }
  return { path: sourcePath, sha256: actualSha256 };
}

async function parseCsvProjected(sourcePath, requiredColumns, projectedColumns, spec) {
  const rows = [];
  let headers = null;
  let projection = null;
  let row = [];
  let field = "";
  let quoted = false;
  let pendingQuote = false;
  let physicalRow = 1;

  function finishRow() {
    row.push(field.replace(/\r$/, ""));
    field = "";
    if (!row.some((entry) => entry !== "")) {
      row = [];
      return;
    }
    if (!headers) {
      headers = row.map((header, index) => (index === 0 ? header.replace(/^\uFEFF/, "").trim() : header.trim()));
      if (headers.some((header) => !header) || new Set(headers).size !== headers.length) {
        throw new Error(`${spec.filename} header contains an empty or duplicate column`);
      }
      const missing = requiredColumns.filter((column) => !headers.includes(column));
      if (missing.length) throw new Error(`${spec.filename} is missing required columns: ${missing.join(", ")}`);
      projection = projectedColumns.map((column) => ({ column, index: headers.indexOf(column) }));
    } else {
      if (row.length !== headers.length) {
        throw new Error(`${spec.filename} CSV row ${physicalRow} has ${row.length} fields; expected ${headers.length}`);
      }
      rows.push(Object.fromEntries(projection.map(({ column, index }) => [column, row[index]])));
    }
    row = [];
  }

  const stream = require("node:fs").createReadStream(sourcePath, { encoding: "utf8" });
  for await (const chunk of stream) {
    for (let index = 0; index < chunk.length; index += 1) {
      let char = chunk[index];
      if (pendingQuote) {
        pendingQuote = false;
        if (char === '"') {
          field += '"';
          continue;
        }
        quoted = false;
      }
      if (quoted) {
        if (char === '"') {
          if (index + 1 < chunk.length) {
            if (chunk[index + 1] === '"') {
              field += '"';
              index += 1;
            } else {
              quoted = false;
            }
          } else {
            pendingQuote = true;
          }
        } else {
          field += char;
        }
      } else if (char === '"') {
        if (field) throw new Error(`${spec.filename} quoted field must begin at a field boundary on row ${physicalRow}`);
        quoted = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        finishRow();
        physicalRow += 1;
      } else {
        field += char;
      }
    }
  }
  if (pendingQuote) {
    pendingQuote = false;
    quoted = false;
  }
  if (quoted) throw new Error(`${spec.filename} contains an unterminated quoted field`);
  if (field || row.length) finishRow();
  if (!headers) throw new Error(`${spec.filename} is empty`);
  if (rows.length !== spec.rows) {
    throw new Error(`${spec.filename} row-count drift: expected ${spec.rows}, received ${rows.length}`);
  }
  return rows;
}

function uniqueIndex(rows, keyFor, label) {
  const index = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    if (!key) throw new Error(`${label} contains an empty key`);
    if (index.has(key)) throw new Error(`${label} contains duplicate key ${key}`);
    index.set(key, row);
  }
  return index;
}

function assertJoinConsistency({ ftn, participation, schedule, cohort }) {
  if (ftn.season !== String(cohort.season) || schedule.season !== String(cohort.season)) {
    throw new Error(`season mismatch for ${ftn.nflverse_game_id}:${ftn.nflverse_play_id}`);
  }
  if (ftn.week !== schedule.week) {
    throw new Error(`week mismatch for ${ftn.nflverse_game_id}:${ftn.nflverse_play_id}`);
  }
  if (![schedule.away_team, schedule.home_team].includes(participation.possession_team)) {
    throw new Error(`possession team is not scheduled for ${ftn.nflverse_game_id}:${ftn.nflverse_play_id}`);
  }
}

function projectRow(ftn, participation) {
  const combined = {
    ...ftn,
    possession_team: participation.possession_team,
    offense_formation: participation.offense_formation,
    offense_personnel: participation.offense_personnel,
    defenders_in_box: participation.defenders_in_box,
    defense_personnel: participation.defense_personnel,
    number_of_pass_rushers: participation.number_of_pass_rushers,
  };
  return Object.fromEntries(OUTPUT_COLUMNS.map((column) => [column, combined[column]]));
}

function assertOutput(rows) {
  if (OUTPUT_COLUMNS.length !== 24) throw new Error(`fixture schema must contain 24 columns, received ${OUTPUT_COLUMNS.length}`);
  if (rows.length !== 4217) throw new Error(`fixture must contain 4,217 rows, received ${rows.length}`);
  const rowKeys = new Set();
  for (const row of rows) {
    const key = playKey(row.nflverse_game_id, row.nflverse_play_id);
    if (rowKeys.has(key)) throw new Error(`fixture contains duplicate play ${key}`);
    rowKeys.add(key);
    if (row.season === "2024" && !["DET", "CHI"].includes(row.possession_team)) throw new Error(`unexpected 2024 cohort ${row.possession_team}`);
    if (row.season === "2025" && row.possession_team !== "CHI") throw new Error(`unexpected 2025 cohort ${row.possession_team}`);
  }
  for (const cohort of PRIMARY_COHORTS) {
    const actual = rows.filter((row) => row.season === String(cohort.season) && row.possession_team === cohort.possession_team).length;
    if (actual !== cohort.expected_rows) throw new Error(`${cohortKey(cohort)} expected ${cohort.expected_rows} rows, received ${actual}`);
  }
}

function compareOutputRows(left, right) {
  return Number(left.season) - Number(right.season)
    || compareText(left.possession_team, right.possession_team)
    || Number(left.week) - Number(right.week)
    || compareText(left.nflverse_game_id, right.nflverse_game_id)
    || Number(left.nflverse_play_id) - Number(right.nflverse_play_id);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function serializeCsv(rows) {
  return `${OUTPUT_COLUMNS.join(",")}\n${rows.map((row) => OUTPUT_COLUMNS.map((column) => csvCell(row[column])).join(",")).join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!["--source-dir", "--output-dir"].includes(argument)) throw new Error(`unknown argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a path`);
    result[argument === "--source-dir" ? "sourceDir" : "outputDir"] = path.resolve(value);
    index += 1;
  }
  return result;
}

function sourceByName(filename) {
  const match = SOURCES.find((sourceArtifact) => sourceArtifact.filename === filename);
  if (!match) throw new Error(`unknown source: ${filename}`);
  return match;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function playKey(gameId, playId) {
  return `${gameId}:${playId}`;
}

function cohortKey(cohort) {
  return `${cohort.possession_team}_${cohort.season}_${cohort.game_type}`;
}

if (require.main === module) {
  buildFixture(parseArgs(process.argv.slice(2))).then((result) => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }).catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  DERIVATION_VERSION,
  FIXTURE_NAME,
  MANIFEST_NAME,
  OUTPUT_COLUMNS,
  PRIMARY_COHORTS,
  SOURCES,
  buildFixture,
  compareOutputRows,
};
