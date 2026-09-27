"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createLocalArtifactRegistry } = require("../src/services/footballIntelligence");
const { buildBenJohnsonVerticalProof } = require("../src/services/footballIntelligence/benJohnsonProof");

const fixtureRoot = path.join(__dirname, "fixtures", "football-intelligence");
const csv = require("node:fs").readFileSync(path.join(fixtureRoot, "ben-johnson-primary-reg-2024-2025.csv"), "utf8");
const manifest = JSON.parse(require("node:fs").readFileSync(path.join(fixtureRoot, "ben-johnson-primary-reg-2024-2025.manifest.json"), "utf8"));

async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "omen-fi-derived-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return createLocalArtifactRegistry({ root, clock: () => new Date("2026-09-26T18:00:00.000Z") });
}

async function registerSources(registry) {
  const ids = [];
  for (const [index, source] of manifest.source_artifacts.entries()) {
    const family = source.source_family === "games" ? "schedules" : source.source_family;
    const ftn = family === "ftn_charting";
    const participation = family === "pbp_participation";
    const result = await registry.registerSourceArtifact({
      artifact_type: "raw_source",
      intended_use: ftn ? "historical_calibration" : participation ? "historical_replay" : "historical_replay",
      bytes: Buffer.from(`source-${index}-${source.sha256}`),
      media_type: "text/csv",
      source: {
        family,
        owner: ftn ? "FTN Data via nflverse" : "nflverse",
        release: source.filename,
        source_url: source.url,
        upstream_updated_at_utc: "2026-02-10T18:54:08.000Z",
        rights: {
          license: ftn || participation ? "CC BY-SA 4.0" : "CC BY 4.0",
          license_url: "https://github.com/nflverse/nflverse-data",
          attribution: source.attribution || "Data via nflverse.",
        },
      },
      schema_fingerprint: `sha256:${String(index + 1).repeat(64).slice(0, 64)}`,
      row_count: 1,
      coverage: { games: 1 },
    });
    ids.push(result.artifact_id);
  }
  return ids;
}

test("persists and replays an independently validated read model from exact source artifacts", async (t) => {
  const registry = await setup(t);
  const sourceArtifactIds = await registerSources(registry);
  const readModel = buildBenJohnsonVerticalProof({ csv, manifest }).readModel;
  const result = await registry.registerReadModel({
    readModel,
    source_artifact_ids: sourceArtifactIds,
    effective_window: { from: { season: 2024, week: 1 }, through: { season: 2025, week: 18 } },
  });
  const replay = await registry.replayReadModel(result.receipt_id);
  assert.deepEqual(replay.read_model, readModel);
  assert.equal(replay.receipt.validation.status, "validated");
  assert.equal(replay.receipt.publication.state, "candidate");
  assert.equal(replay.receipt.publication.authorized, false);
  assert.deepEqual(replay.receipt.source_artifact_ids, [...sourceArtifactIds].sort());
});

test("read-model persistence is idempotent and corrections supersede without mutation", async (t) => {
  const registry = await setup(t);
  const sourceArtifactIds = await registerSources(registry);
  const readModel = buildBenJohnsonVerticalProof({ csv, manifest }).readModel;
  const first = await registry.registerReadModel({ readModel, source_artifact_ids: sourceArtifactIds, effective_window: { from: { season: 2024, week: 1 }, through: { season: 2025, week: 18 } } });
  const again = await registry.registerReadModel({ readModel, source_artifact_ids: [...sourceArtifactIds].reverse(), effective_window: { from: { season: 2024, week: 1 }, through: { season: 2025, week: 18 } } });
  assert.equal(again.artifact_id, first.artifact_id);
  assert.equal(again.receipt_id, first.receipt_id);
  assert.deepEqual(again.created, { artifact: false, receipt: false });

  const corrected = structuredClone(readModel);
  corrected.provenance.push({ source_family: "correction_note", artifact_sha256: sourceArtifactIds[0] });
  const { hashCanonical } = require("../src/services/footballIntelligence");
  corrected.input_hash = hashCanonical({
    scheme_dna: corrected.scheme_dna.map((item) => item.output_hash).sort(),
    system_signals: corrected.system_signals.map((item) => item.output_hash).sort(),
    coaching_tree_edges: corrected.coaching_tree.edges.map((item) => item.edge_hash).sort(),
    provenance: [...corrected.provenance].sort((a, b) => hashCanonical(a).localeCompare(hashCanonical(b))),
  });
  const body = { ...corrected };
  delete body.output_hash;
  corrected.output_hash = hashCanonical(body);
  const next = await registry.registerReadModel({
    readModel: corrected,
    source_artifact_ids: sourceArtifactIds,
    effective_window: { from: { season: 2024, week: 1 }, through: { season: 2025, week: 18 } },
    supersedes_artifact_id: first.artifact_id,
    correction_reason: "source correction candidate",
  });
  assert.notEqual(next.artifact_id, first.artifact_id);
  const replay = await registry.replayReadModel(next.receipt_id);
  assert.equal(replay.receipt.supersession.supersedes_artifact_id, first.artifact_id);
  assert.deepEqual((await registry.replayReadModel(first.receipt_id)).read_model, readModel);
});

test("rejects invalid read models, missing sources, and ungrounded supersession", async (t) => {
  const registry = await setup(t);
  const readModel = buildBenJohnsonVerticalProof({ csv, manifest }).readModel;
  const invalid = structuredClone(readModel);
  invalid.system_signals[0].evidence = [];
  await assert.rejects(
    registry.registerReadModel({ readModel: invalid, source_artifact_ids: [], effective_window: { from: { season: 2024, week: 1 }, through: { season: 2025, week: 18 } } }),
    (error) => error.code === "SIGNAL_EVIDENCE_MISSING",
  );
  await assert.rejects(
    registry.registerReadModel({ readModel, source_artifact_ids: [`sha256:${"f".repeat(64)}`], effective_window: { from: { season: 2024, week: 1 }, through: { season: 2025, week: 18 } } }),
    (error) => error.code === "SOURCE_ARTIFACT_NOT_FOUND",
  );
});
