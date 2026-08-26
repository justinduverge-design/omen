#!/usr/bin/env node
"use strict";

// This is a controlled rehearsal fixture, never an upstream nflverse assertion.
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { captureSnapshot } = require("../src/services/footballData/rawVault");
const { runScoringAcceptance } = require("../src/services/footballData/scoringAcceptance");
const { buildCorrectionCandidate } = require("../src/services/footballData/stagingShadow");

const FIXTURE_SCHEMA = "omen-football-controlled-correction-rehearsal.v1";
const FIXTURE_LABEL = "controlled_fixture_not_upstream";
const WORK_ROOT = "/work";
const INPUT_ROOT = "/fixture-input";
const PREVIOUS_ACCEPTANCE = "/previous/acceptance.json";

function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }

function parseCsvRows(value) {
  const text = Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
  const rows = [];
  let row = []; let field = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') {
      if (field) throw new Error("fixture CSV quote is not at a field boundary");
      quoted = true;
    } else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (quoted) throw new Error("fixture CSV contains an unterminated quote");
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows.filter((candidate) => candidate.some((entry) => entry !== ""));
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function mutateOneAcceptedPlayer(bytes) {
  const rows = parseCsvRows(bytes);
  const headers = rows.shift();
  if (!headers) throw new Error("fixture player CSV is empty");
  const index = Object.fromEntries(headers.map((name, position) => [name.replace(/^\uFEFF/, ""), position]));
  for (const column of ["season", "season_type", "week", "player_id", "passing_yards", "fantasy_points", "fantasy_points_ppr"]) {
    if (!Number.isInteger(index[column])) throw new Error(`fixture player CSV lacks ${column}`);
  }
  const target = rows.find((row) => (
    row[index.season] === "2025"
      && row[index.season_type] === "REG"
      && ["1", "7", "14", "17"].includes(row[index.week])
      && String(row[index.player_id] || "").trim()
      && Number(row[index.passing_yards]) > 0
  ));
  if (!target) throw new Error("fixture could not find an accepted passing row");
  target[index.passing_yards] = String(Number(target[index.passing_yards]) + 25);
  target[index.fantasy_points] = String(Number(target[index.fantasy_points]) + 1);
  target[index.fantasy_points_ppr] = String(Number(target[index.fantasy_points_ppr]) + 1);
  return {
    bytes: Buffer.from([headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n"),
    mutation: { type: "passing_yards_plus_25", season: 2025, week: Number(target[index.week]) },
  };
}

async function readCapturedBytes(batchId) {
  if (!/^[0-9TZ-]+[a-f0-9]{16}$/.test(batchId)) throw new Error("controlled fixture requires an exact capture batch id");
  const batch = JSON.parse(await fs.readFile(path.join(INPUT_ROOT, "batches", `${batchId}.json`), "utf8"));
  const result = {};
  for (const dataset of ["stats_player", "stats_team", "schedules"]) {
    const item = batch.datasets?.[dataset];
    if (!item?.raw_sha256 || !/^[a-f0-9]{64}$/.test(item.raw_sha256)) throw new Error(`captured batch lacks ${dataset} raw hash`);
    result[dataset] = await fs.readFile(path.join(INPUT_ROOT, "vault", "raw", "nflverse-data", dataset, "2025", `${item.raw_sha256}.csv`));
  }
  return result;
}

function fixtureResponse(bytes) {
  return { ok: true, status: 200, headers: { "content-type": "text/csv", "content-length": String(bytes.length) }, arrayBuffer: async () => bytes };
}

async function runControlledCorrection({ batchId }) {
  const original = await readCapturedBytes(batchId);
  const mutation = mutateOneAcceptedPlayer(original.stats_player);
  const bytes = { ...original, stats_player: mutation.bytes };
  const vaultRoot = path.join(WORK_ROOT, "vault");
  const manifests = {};
  for (const dataset of ["stats_player", "stats_team", "schedules"]) {
    const captured = await captureSnapshot({
      dataset, season: 2025, root: vaultRoot,
      fetchImpl: async () => fixtureResponse(bytes[dataset]),
      userAgent: "OmenFootballDataControlledCorrection/1.0",
    });
    manifests[dataset] = captured.manifestPath;
  }
  const accepted = await runScoringAcceptance({
    root: vaultRoot, playerManifestPath: manifests.stats_player, teamManifestPath: manifests.stats_team,
    scheduleManifestPath: manifests.schedules, season: 2025, weeks: ["1", "7", "14", "17"],
    outputRoot: path.join(WORK_ROOT, "acceptance"),
  });
  const [currentBytes, previousBytes] = await Promise.all([fs.readFile(accepted.acceptancePath), fs.readFile(PREVIOUS_ACCEPTANCE)]);
  const correction = buildCorrectionCandidate({
    currentAcceptance: JSON.parse(currentBytes), currentHash: sha256(currentBytes),
    previousAcceptance: JSON.parse(previousBytes), previousHash: sha256(previousBytes),
  });
  if (correction.status !== "correction_candidate" || !correction.supersedes || !correction.changed_subjects.length) {
    throw new Error("controlled fixture did not produce a nonzero-subject correction candidate");
  }
  const receipt = {
    schema: FIXTURE_SCHEMA, mode: FIXTURE_LABEL, executed_at_utc: new Date().toISOString(),
    source_batch_id: batchId, fixture_mutation: mutation.mutation, correction,
    database_writes_attempted: 0, database_writes_completed: 0,
    publication_authorized: false, production_scoring_authorized: false, promoted: false,
  };
  const receiptPath = path.join(WORK_ROOT, "controlled-correction-rehearsal.json");
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
  return { receipt, receiptPath };
}

async function main(argv = process.argv.slice(2)) {
  const [command, batchId] = argv;
  if (command !== "run" || !batchId || argv.length !== 2) throw new Error("Usage: football-data-controlled-correction.js run <exact-batch-id>");
  const { receipt, receiptPath } = await runControlledCorrection({ batchId });
  process.stdout.write(`${JSON.stringify({ schema: receipt.schema, mode: receipt.mode, status: receipt.correction.status, supersedes: receipt.correction.supersedes, changed_subject_count: receipt.correction.changed_subjects.length, database_writes_attempted: 0, database_writes_completed: 0, publication_authorized: false, production_scoring_authorized: false, receipt_path: receiptPath })}\n`);
}

if (require.main === module) main().catch((error) => { process.stderr.write(`controlled-correction ${error.message}\n`); process.exitCode = 1; });

module.exports = { FIXTURE_LABEL, FIXTURE_SCHEMA, mutateOneAcceptedPlayer, parseCsvRows, runControlledCorrection };
