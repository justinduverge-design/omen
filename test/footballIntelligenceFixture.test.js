"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { parseCsvObjects } = require("../src/services/footballData/scoringAcceptance");
const {
  DERIVATION_VERSION,
  FIXTURE_NAME,
  MANIFEST_NAME,
  OUTPUT_COLUMNS,
  compareOutputRows,
} = require("../scripts/build-football-intelligence-fixture");

const FIXTURE_ROOT = path.join(__dirname, "fixtures/football-intelligence");
const EXPECTED_FIXTURE_SHA256 = "855297819f3d252c50e90b08fdef721f6371b93fd648881825fcc4c44c582b63";
const EXPECTED_SOURCE_HASHES = Object.freeze({
  "ftn_charting_2024.csv": "6faae8118cc13ce62589210d553733128ed35e558671009b4a7a8fc5c674c2cb",
  "ftn_charting_2025.csv": "62a66416043ff08d43303bf5f3af5390e3fe0f29461a1fc6e295a15cac6ea994",
  "games.csv": "44ea79b765e734f75cc65ad6bf8d22f3ea70fdd9560af728421501fa758845fd",
  "pbp_participation_2024.csv": "b1f436a98b2a7759eb4ed1181e072a35c2666f9aeb356a49c943d28d6be6b0b9",
  "pbp_participation_2025.csv": "59069adfee7b0f464befba8a5e8be331e523633cc6a7ab403d37bcbcdfbe66ac",
});

function loadFixture() {
  const bytes = fs.readFileSync(path.join(FIXTURE_ROOT, FIXTURE_NAME));
  const manifest = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, MANIFEST_NAME), "utf8"));
  return { bytes, manifest, rows: parseCsvObjects(bytes, OUTPUT_COLUMNS) };
}

test("source-derived football intelligence fixture is pinned to exact bytes and schema", () => {
  const { bytes, manifest, rows } = loadFixture();
  const actualHash = crypto.createHash("sha256").update(bytes).digest("hex");

  assert.equal(manifest.schema, "football-intelligence-source-fixture-manifest.v1");
  assert.equal(manifest.derivation_version, DERIVATION_VERSION);
  assert.equal(manifest.fixture, FIXTURE_NAME);
  assert.deepEqual(manifest.schema_columns, OUTPUT_COLUMNS);
  assert.equal(manifest.output.rows, 4217);
  assert.equal(manifest.output.columns, 24);
  assert.equal(manifest.output.bytes, bytes.length);
  assert.equal(manifest.output.sha256, EXPECTED_FIXTURE_SHA256);
  assert.equal(actualHash, EXPECTED_FIXTURE_SHA256);
  assert.equal(rows.length, 4217);
  assert.equal(bytes.includes(Buffer.from("\r")), false, "fixture must use LF line endings only");
  assert.equal(bytes.at(-1), 10, "fixture must end with one LF-terminated record");
});

test("fixture retains only the three reviewed regular-season cohorts in deterministic order", () => {
  const { manifest, rows } = loadFixture();
  const cohortCounts = rows.reduce((counts, row) => {
    const key = `${row.possession_team}_${row.season}_REG`;
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

  assert.deepEqual(cohortCounts, {
    CHI_2024_REG: 1401,
    DET_2024_REG: 1394,
    CHI_2025_REG: 1422,
  });
  assert.deepEqual(manifest.reconciliation.cohort_rows, {
    DET_2024_REG: 1394,
    CHI_2024_REG: 1401,
    CHI_2025_REG: 1422,
  });
  for (let index = 1; index < rows.length; index += 1) {
    assert.ok(compareOutputRows(rows[index - 1], rows[index]) <= 0, `row ${index + 1} is out of order`);
  }
  assert.equal(new Set(rows.map((row) => `${row.nflverse_game_id}:${row.nflverse_play_id}`)).size, rows.length);
});

test("manifest preserves source hashes, unmatched counts, and FTN attribution", () => {
  const { manifest } = loadFixture();
  assert.equal(manifest.licence, "CC-BY-SA-4.0");
  assert.equal(manifest.attribution, "FTN Data via nflverse");
  assert.equal(manifest.modified, true);

  const sourceHashes = Object.fromEntries(manifest.source_artifacts.map((artifact) => [artifact.filename, artifact.sha256]));
  assert.deepEqual(sourceHashes, EXPECTED_SOURCE_HASHES);
  assert.deepEqual(manifest.reconciliation.years, [
    {
      season: 2024,
      ftn_rows: 48031,
      participation_rows: 45919,
      ftn_rows_without_participation: 2126,
      target_joined_all_games: 2880,
      target_postseason_rows_excluded: 85,
      target_joined_rows_without_schedule: 0,
      target_regular_season_participation_rows_without_ftn: 1,
    },
    {
      season: 2025,
      ftn_rows: 47316,
      participation_rows: 45184,
      ftn_rows_without_participation: 2140,
      target_joined_all_games: 1602,
      target_postseason_rows_excluded: 180,
      target_joined_rows_without_schedule: 0,
      target_regular_season_participation_rows_without_ftn: 0,
    },
  ]);
  for (const artifact of manifest.source_artifacts.filter((item) => item.source_family !== "schedules")) {
    assert.equal(artifact.licence, "CC-BY-SA-4.0");
    assert.equal(artifact.attribution, "FTN Data via nflverse");
  }
});
