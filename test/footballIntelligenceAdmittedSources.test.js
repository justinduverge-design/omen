"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createLocalArtifactRegistry } = require("../src/services/footballIntelligence/artifactRegistry");
const { ingestScheduleReceipt } = require("../src/services/footballIntelligence/schedules");
const { ingestParticipationReceipt } = require("../src/services/footballIntelligence/participation");
const { ingestFtnChartingReceipt } = require("../src/services/footballIntelligence/ftnCharting");

const RIGHTS = Object.freeze({
  schedules: { owner: "nflverse", license: "CC BY 4.0" },
  pbp_participation: { owner: "nflverse", license: "CC BY-SA 4.0" },
  ftn_charting: { owner: "FTN Data via nflverse", license: "CC BY-SA 4.0" },
});

async function setup(t, { family, intendedUse, columns, rows, coverage = { games: 1 } }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `omen-fi-${family}-`));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const registry = createLocalArtifactRegistry({ root, clock: () => new Date("2026-09-26T12:00:00Z") });
  const bytes = Buffer.from(`exact ${family} bytes\n`);
  const rights = RIGHTS[family];
  const registered = await registry.registerSourceArtifact({
    artifact_type: "raw_source",
    intended_use: intendedUse,
    bytes,
    media_type: "text/csv",
    source: {
      family,
      owner: rights.owner,
      release: `${family}_fixture.csv`,
      source_url: "https://github.com/nflverse/nflverse-data/releases",
      upstream_updated_at_utc: "2026-09-26T10:00:00Z",
      rights: {
        license: rights.license,
        license_url: "https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md",
        attribution: `${rights.owner} fixture attribution`,
      },
    },
    schema_fingerprint: `sha256:${"5".repeat(64)}`,
    row_count: rows.length,
    coverage,
  });
  const calls = [];
  const tabularReader = { async readRows(request) { calls.push(request); return { columns, rows }; } };
  return { bytes, calls, registered, registry, tabularReader };
}

test("schedule receipt produces deterministic game context without promoting coach aliases", async (t) => {
  const columns = ["game_id", "season", "week", "game_type", "gameday", "away_team", "home_team", "away_coach", "home_coach"];
  const rows = [
    { game_id: "2025_02_CHI_DET", season: "2025", week: "2", game_type: "REG", gameday: "2025-09-14", away_team: "CHI", home_team: "DET", away_coach: "unknown", home_coach: "Dan Campbell" },
    { game_id: "2025_01_GB_CHI", season: "2025", week: "1", game_type: "REG", gameday: "2025-09-07", away_team: "GB", home_team: "CHI", away_coach: "Matt LaFleur", home_coach: "" },
  ];
  const source = await setup(t, { family: "schedules", intendedUse: "identity_context", columns, rows });
  const result = await ingestScheduleReceipt({ registry: source.registry, receiptId: source.registered.receipt_id, tabularReader: source.tabularReader });
  assert.deepEqual(result.facts.map((fact) => fact.game_id), ["2025_01_GB_CHI", "2025_02_CHI_DET"]);
  assert.deepEqual(result.facts[0].coaches.home, { state: "not_reported", value: null });
  assert.deepEqual(result.facts[1].coaches.away, { state: "unknown", value: null });
  assert.deepEqual(result.facts[1].coaches.home, { state: "observed", value: "Dan Campbell" });
  assert.equal(result.facts[1].coaches.home.coach_id, undefined);
  assert.deepEqual(source.calls[0].bytes, source.bytes);
});

test("historical participation preserves missingness and rejects duplicates", async (t) => {
  const columns = ["nflverse_game_id", "play_id", "possession_team", "offense_formation", "offense_personnel", "defenders_in_box", "defense_personnel"];
  const rows = [
    { nflverse_game_id: "2024_01_DET_LA", play_id: "12", possession_team: "DET", offense_formation: "SHOTGUN", offense_personnel: "11", defenders_in_box: "not_reported", defense_personnel: "conflicted" },
  ];
  const source = await setup(t, { family: "pbp_participation", intendedUse: "historical_calibration", columns, rows });
  const result = await ingestParticipationReceipt({ registry: source.registry, receiptId: source.registered.receipt_id, tabularReader: source.tabularReader });
  assert.equal(result.role, "historical_calibration_only");
  assert.deepEqual(result.facts[0].observations.defenders_in_box, { state: "not_reported", value: null });
  assert.deepEqual(result.facts[0].observations.defense_personnel, { state: "conflicted", value: null });
  assert.equal(result.facts[0].provenance.source_family, "pbp_participation");

  const duplicate = await setup(t, { family: "pbp_participation", intendedUse: "historical_replay", columns, rows: [rows[0], rows[0]] });
  await assert.rejects(
    ingestParticipationReceipt({ registry: duplicate.registry, receiptId: duplicate.registered.receipt_id, tabularReader: duplicate.tabularReader }),
    (error) => error.code === "DUPLICATE_PARTICIPATION_FACT",
  );
});

test("FTN charting exposes measured coverage gate and never coerces missing observations", async (t) => {
  const columns = ["nflverse_game_id", "nflverse_play_id", "possession_team", "is_motion", "is_play_action", "is_screen_pass", "is_rpo", "is_qb_out_of_pocket", "qb_location", "n_offense_backfield", "n_defense_box", "n_blitzers", "n_pass_rushers"];
  const rows = [{ nflverse_game_id: "2025_01_DET_GB", nflverse_play_id: "8", possession_team: "DET", is_motion: "", is_play_action: "1", is_screen_pass: "0", is_rpo: "unknown", is_qb_out_of_pocket: "0", qb_location: "SHOTGUN", n_offense_backfield: "1", n_defense_box: "6", n_blitzers: "not_covered", n_pass_rushers: "4" }];
  const source = await setup(t, { family: "ftn_charting", intendedUse: "tactical_enrichment", columns, rows, coverage: { games: 1, eligible_plays: 10, charted_plays: 6 } });
  const result = await ingestFtnChartingReceipt({ registry: source.registry, receiptId: source.registered.receipt_id, tabularReader: source.tabularReader });
  assert.deepEqual(result.coverage_gate, { threshold: 0.7, eligible_plays: 10, charted_plays: 6, ratio: 0.6, state: "insufficient_coverage", eligible_for_enrichment: false });
  assert.deepEqual(result.facts[0].observations.motion, { state: "not_covered", value: null });
  assert.deepEqual(result.facts[0].observations.play_action, { state: "observed", value: true });
  assert.deepEqual(result.facts[0].observations.rpo, { state: "unknown", value: null });
  assert.deepEqual(result.facts[0].observations.blitzers, { state: "not_covered", value: null });
});

test("all admitted source normalizers fail closed on role, schema, and row-count drift", async (t) => {
  const scheduleColumns = ["game_id", "season", "week", "game_type", "gameday", "away_team", "home_team", "away_coach", "home_coach"];
  const row = { game_id: "2025_01_GB_CHI", season: "2025", week: "1", game_type: "REG", gameday: "2025-09-07", away_team: "GB", home_team: "CHI", away_coach: "A", home_coach: "B" };
  const wrongRole = await setup(t, { family: "pbp_participation", intendedUse: "historical_replay", columns: scheduleColumns, rows: [row] });
  await assert.rejects(
    ingestScheduleReceipt({ registry: wrongRole.registry, receiptId: wrongRole.registered.receipt_id, tabularReader: wrongRole.tabularReader }),
    (error) => error.code === "SCHEDULE_RECEIPT_REQUIRED",
  );
  assert.equal(wrongRole.calls.length, 0);

  const schema = await setup(t, { family: "schedules", intendedUse: "identity_context", columns: scheduleColumns, rows: [row] });
  schema.tabularReader.readRows = async () => ({ columns: scheduleColumns.filter((column) => column !== "game_id"), rows: [row] });
  await assert.rejects(
    ingestScheduleReceipt({ registry: schema.registry, receiptId: schema.registered.receipt_id, tabularReader: schema.tabularReader }),
    (error) => error.code === "TABULAR_SCHEMA_MISMATCH",
  );

  const drift = await setup(t, { family: "schedules", intendedUse: "identity_context", columns: scheduleColumns, rows: [row] });
  drift.tabularReader.readRows = async () => ({ columns: scheduleColumns, rows: [] });
  await assert.rejects(
    ingestScheduleReceipt({ registry: drift.registry, receiptId: drift.registered.receipt_id, tabularReader: drift.tabularReader }),
    (error) => error.code === "TABULAR_ROW_COUNT_MISMATCH",
  );
});

test("participation and FTN facts are deterministic and FTN duplicate identities fail closed", async (t) => {
  const participationColumns = ["nflverse_game_id", "play_id", "possession_team", "offense_formation", "offense_personnel", "defenders_in_box", "defense_personnel"];
  const participationRows = [
    { nflverse_game_id: "g2", play_id: "2", possession_team: "DET", offense_formation: "I_FORM", offense_personnel: "21", defenders_in_box: "8", defense_personnel: "BASE" },
    { nflverse_game_id: "g1", play_id: "10", possession_team: "GB", offense_formation: "SHOTGUN", offense_personnel: "11", defenders_in_box: "6", defense_personnel: "NICKEL" },
  ];
  const one = await setup(t, { family: "pbp_participation", intendedUse: "historical_calibration", columns: participationColumns, rows: participationRows });
  const two = await setup(t, { family: "pbp_participation", intendedUse: "historical_calibration", columns: participationColumns, rows: [...participationRows].reverse() });
  const first = await ingestParticipationReceipt({ registry: one.registry, receiptId: one.registered.receipt_id, tabularReader: one.tabularReader });
  const second = await ingestParticipationReceipt({ registry: two.registry, receiptId: two.registered.receipt_id, tabularReader: two.tabularReader });
  assert.deepEqual(first.facts.map(({ provenance, ...fact }) => fact), second.facts.map(({ provenance, ...fact }) => fact));

  const ftnColumns = ["nflverse_game_id", "nflverse_play_id", "possession_team", "is_motion", "is_play_action", "is_screen_pass", "is_rpo", "is_qb_out_of_pocket", "qb_location", "n_offense_backfield", "n_defense_box", "n_blitzers", "n_pass_rushers"];
  const ftnRow = { nflverse_game_id: "g1", nflverse_play_id: "1", possession_team: "DET", is_motion: "0", is_play_action: "0", is_screen_pass: "0", is_rpo: "0", is_qb_out_of_pocket: "0", qb_location: "UNDER_CENTER", n_offense_backfield: "1", n_defense_box: "6", n_blitzers: "5", n_pass_rushers: "4" };
  const duplicate = await setup(t, { family: "ftn_charting", intendedUse: "tactical_enrichment", columns: ftnColumns, rows: [ftnRow, ftnRow], coverage: { eligible_plays: 2, charted_plays: 2 } });
  await assert.rejects(
    ingestFtnChartingReceipt({ registry: duplicate.registry, receiptId: duplicate.registered.receipt_id, tabularReader: duplicate.tabularReader }),
    (error) => error.code === "DUPLICATE_FTN_CHARTING_FACT",
  );
});
