"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { promisify } = require("node:util");
const { execFile } = require("node:child_process");
const test = require("node:test");

const execFileAsync = promisify(execFile);

const {
  ArtifactRegistryError,
  SOURCE_ADMISSIONS,
  createLocalArtifactRegistry,
} = require("../src/services/footballIntelligence");

const SOURCE = Object.freeze({
  family: "play_by_play",
  owner: "nflverse",
  release: "play_by_play_2025.parquet",
  source_url: "https://github.com/nflverse/nflverse-data/releases",
  upstream_updated_at_utc: "2026-09-26T10:00:00.000Z",
  rights: {
    license: "CC BY 4.0",
    license_url: "https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md",
    attribution: "Data sourced from nflverse under CC BY 4.0.",
  },
});

async function temporaryRegistry(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "omen-fi-registry-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return createLocalArtifactRegistry({
    root,
    clock: () => new Date("2026-09-26T12:00:00.000Z"),
  });
}

test("source catalog preserves ordinary PBP, FTN enrichment, and historical participation roles", () => {
  assert.deepEqual(SOURCE_ADMISSIONS.play_by_play.allowed_uses, ["current_denominator", "historical_replay"]);
  assert.deepEqual(SOURCE_ADMISSIONS.ftn_charting.allowed_uses, ["tactical_enrichment", "historical_calibration"]);
  assert.deepEqual(SOURCE_ADMISSIONS.pbp_participation.allowed_uses, ["historical_calibration", "historical_replay"]);
  assert.equal(SOURCE_ADMISSIONS.pbp_participation.allowed_uses.includes("current_denominator"), false);
});

test("registers immutable bytes, a source receipt, and a rebuildable index", async (t) => {
  const registry = await temporaryRegistry(t);
  const bytes = Buffer.from("game_id,play_id\n2025_01_SEA_SF,1\n");

  const result = await registry.registerSourceArtifact({
    artifact_type: "raw_source",
    intended_use: "current_denominator",
    bytes,
    media_type: "text/csv",
    source: SOURCE,
    schema_fingerprint: `sha256:${"b".repeat(64)}`,
    row_count: 1,
    observed_event_time: {
      from: "2025-09-07T17:00:00.000Z",
      through: "2025-09-07T17:00:10.000Z",
    },
    coverage: { games: 1, eligible_plays: 1, charted_plays: null },
  });

  assert.match(result.artifact_id, /^sha256:[a-f0-9]{64}$/);
  assert.match(result.receipt_id, /^receipt:[a-f0-9]{64}$/);
  assert.equal(result.created.artifact, true);
  assert.equal(result.created.receipt, true);

  const replay = await registry.readArtifact(result.artifact_id);
  assert.deepEqual(replay, bytes);
  const receipt = await registry.getReceipt(result.receipt_id);
  assert.equal(receipt.artifact.sha256, result.artifact_id);
  assert.equal(receipt.source.family, "play_by_play");
  assert.equal(receipt.publication.authorized, false);

  const index = await registry.rebuildIndex();
  assert.equal(index.schema, "football-intelligence-artifact-index.v1");
  assert.equal(index.artifacts.length, 1);
  assert.equal(index.receipts.length, 1);
  assert.equal(index.sources.play_by_play.receipt_count, 1);
  assert.equal(index.sources.play_by_play.latest_receipt_id, result.receipt_id);
});

test("identical capture reuses bytes and receipt without mutation", async (t) => {
  const registry = await temporaryRegistry(t);
  const input = {
    artifact_type: "raw_source",
    intended_use: "current_denominator",
    bytes: Buffer.from("same bytes"),
    media_type: "application/octet-stream",
    source: SOURCE,
    schema_fingerprint: `sha256:${"c".repeat(64)}`,
    row_count: 1,
    coverage: { games: 1, eligible_plays: 1, charted_plays: null },
  };

  const first = await registry.registerSourceArtifact(input);
  const second = await registry.registerSourceArtifact(input);
  assert.equal(second.artifact_id, first.artifact_id);
  assert.equal(second.receipt_id, first.receipt_id);
  assert.deepEqual(second.created, { artifact: false, receipt: false });
});

test("a correction is a new artifact linked to an existing predecessor", async (t) => {
  const registry = await temporaryRegistry(t);
  const common = {
    artifact_type: "raw_source",
    intended_use: "current_denominator",
    media_type: "text/csv",
    source: SOURCE,
    schema_fingerprint: `sha256:${"d".repeat(64)}`,
    row_count: 1,
    coverage: { games: 1, eligible_plays: 1, charted_plays: null },
  };
  const original = await registry.registerSourceArtifact({ ...common, bytes: Buffer.from("old") });
  const corrected = await registry.registerSourceArtifact({
    ...common,
    bytes: Buffer.from("corrected"),
    supersedes_artifact_id: original.artifact_id,
    correction_reason: "upstream correction",
  });

  assert.notEqual(corrected.artifact_id, original.artifact_id);
  const receipt = await registry.getReceipt(corrected.receipt_id);
  assert.equal(receipt.supersession.supersedes_artifact_id, original.artifact_id);
  assert.equal(receipt.supersession.reason, "upstream correction");
});

test("fails closed on unsafe roots, missing rights, and unknown supersession", async (t) => {
  assert.throws(
    () => createLocalArtifactRegistry({ root: "/var/lib/omen-football-intelligence" }),
    (error) => error instanceof ArtifactRegistryError && error.code === "PRODUCTION_ROOT_REFUSED",
  );

  const registry = await temporaryRegistry(t);
  await assert.rejects(
    registry.registerSourceArtifact({
      artifact_type: "raw_source",
      intended_use: "current_denominator",
      bytes: Buffer.from("x"),
      media_type: "text/plain",
      source: { ...SOURCE, rights: { license: "CC BY 4.0" } },
      schema_fingerprint: `sha256:${"e".repeat(64)}`,
      row_count: 1,
      coverage: { games: 1, eligible_plays: 1, charted_plays: null },
    }),
    (error) => error.code === "INVALID_SOURCE_RECEIPT",
  );
  await assert.rejects(
    registry.registerSourceArtifact({
      artifact_type: "raw_source",
      intended_use: "current_denominator",
      bytes: Buffer.from("x"),
      media_type: "text/plain",
      source: SOURCE,
      schema_fingerprint: `sha256:${"e".repeat(64)}`,
      row_count: 1,
      coverage: { games: 1, eligible_plays: 1, charted_plays: null },
      supersedes_artifact_id: `sha256:${"f".repeat(64)}`,
      correction_reason: "missing parent",
    }),
    (error) => error.code === "SUPERSEDED_ARTIFACT_NOT_FOUND",
  );
});

test("detects object tampering before replay", async (t) => {
  const registry = await temporaryRegistry(t);
  const result = await registry.registerSourceArtifact({
    artifact_type: "raw_source",
    intended_use: "current_denominator",
    bytes: Buffer.from("trusted"),
    media_type: "text/plain",
    source: SOURCE,
    schema_fingerprint: `sha256:${"1".repeat(64)}`,
    row_count: 1,
    coverage: { games: 1, eligible_plays: 1, charted_plays: null },
  });
  await fs.writeFile(result.paths.artifact, "tampered");
  await assert.rejects(
    registry.readArtifact(result.artifact_id),
    (error) => error.code === "ARTIFACT_HASH_MISMATCH",
  );
});

test("verified receipt replay binds immutable receipt metadata to exact object bytes", async (t) => {
  const registry = await temporaryRegistry(t);
  const bytes = Buffer.from("game_id,play_id\n2025_01_SEA_SF,1\n");
  const result = await registry.registerSourceArtifact({
    artifact_type: "raw_source",
    intended_use: "current_denominator",
    bytes,
    media_type: "text/csv",
    source: SOURCE,
    schema_fingerprint: `sha256:${"3".repeat(64)}`,
    row_count: 1,
    coverage: { games: 1, eligible_plays: 1, charted_plays: null },
  });

  const replay = await registry.replayReceipt(result.receipt_id);
  assert.equal(replay.receipt.receipt_id, result.receipt_id);
  assert.equal(replay.receipt.artifact.sha256, result.artifact_id);
  assert.deepEqual(replay.bytes, bytes);
});

test("local CLI registers, indexes, and verifies without a storage vendor", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "omen-fi-cli-root-"));
  const inputs = await fs.mkdtemp(path.join(os.tmpdir(), "omen-fi-cli-input-"));
  t.after(() => Promise.all([
    fs.rm(root, { recursive: true, force: true }),
    fs.rm(inputs, { recursive: true, force: true }),
  ]));
  const artifact = path.join(inputs, "pbp.csv");
  const metadata = path.join(inputs, "metadata.json");
  await fs.writeFile(artifact, "game_id,play_id\n2025_01_SEA_SF,1\n");
  await fs.writeFile(metadata, JSON.stringify({
    artifact_type: "raw_source",
    intended_use: "current_denominator",
    media_type: "text/csv",
    source: SOURCE,
    schema_fingerprint: `sha256:${"2".repeat(64)}`,
    row_count: 1,
    coverage: { games: 1, eligible_plays: 1, charted_plays: null },
  }));
  const script = path.resolve(__dirname, "../scripts/football-intelligence-artifacts.js");
  const registered = JSON.parse((await execFileAsync(process.execPath, [
    script, "register", "--root", root, "--file", artifact, "--metadata", metadata,
  ])).stdout);
  const index = JSON.parse((await execFileAsync(process.execPath, [script, "index", "--root", root])).stdout);
  const verified = JSON.parse((await execFileAsync(process.execPath, [
    script, "verify", "--root", root, "--artifact", registered.artifact_id,
  ])).stdout);
  const replayed = JSON.parse((await execFileAsync(process.execPath, [
    script, "replay", "--root", root, "--receipt", registered.receipt_id,
  ])).stdout);
  assert.equal(index.artifacts.length, 1);
  assert.deepEqual(verified, {
    artifact_id: registered.artifact_id,
    byte_length: 33,
    verified: true,
  });
  assert.deepEqual(replayed, {
    receipt_id: registered.receipt_id,
    artifact_id: registered.artifact_id,
    byte_length: 33,
    verified: true,
  });
});
