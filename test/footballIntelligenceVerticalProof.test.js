"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  buildBenJohnsonVerticalProof,
  buildBenJohnsonVerticalProofFromRows,
} = require("../src/services/footballIntelligence");

const fixtureRoot = path.join(__dirname, "fixtures/football-intelligence");
const csvPath = path.join(fixtureRoot, "ben-johnson-primary-reg-2024-2025.csv");
const manifestPath = path.join(fixtureRoot, "ben-johnson-primary-reg-2024-2025.manifest.json");

function load() {
  return {
    csv: fs.readFileSync(csvPath, "utf8"),
    manifest: JSON.parse(fs.readFileSync(manifestPath, "utf8")),
  };
}

test("Ben Johnson proof runs observed fixture through DNA, signal, and Coaching Tree", () => {
  const proof = buildBenJohnsonVerticalProof(load());
  assert.equal(proof.rows.length, 4217);
  assert.equal(proof.dnaByWindow["DET-2024"].sample.eligible_plays, 1123);
  assert.equal(proof.dnaByWindow["CHI-2024"].sample.eligible_plays, 1119);
  assert.equal(proof.dnaByWindow["CHI-2025"].sample.eligible_plays, 1140);
  assert.equal(proof.beforeSimilarity.model_version, "scheme-dna-similarity.v1");
  assert.equal(proof.movedTowardBaseline, true);
  assert.ok(proof.afterSimilarity.score > proof.beforeSimilarity.score);
  assert.equal(proof.signal.subject.id, "CHI");
  assert.equal(proof.signal.state, "established");
  assert.equal(proof.coachingTree.edges.filter((edge) => edge.edge_type === "confirmed_assignment").length, 2);
  assert.equal(proof.coachingTree.edges.filter((edge) => edge.edge_type === "inferred_system_influence").length, 1);
  assert.equal(proof.readModel.provenance.some((item) => item.source_family === "official_coach_biography"), true);
});

test("Ben Johnson proof is byte-stable when source rows are shuffled", () => {
  const input = load();
  const original = buildBenJohnsonVerticalProof(input);
  const rows = original.rows.slice();
  for (let index = rows.length - 1; index > 0; index -= 1) {
    const swap = (index * 37) % (index + 1);
    [rows[index], rows[swap]] = [rows[swap], rows[index]];
  }
  const shuffled = buildBenJohnsonVerticalProofFromRows(rows, input.manifest);
  assert.deepEqual(shuffled.readModel, original.readModel);
  assert.deepEqual(shuffled.signal, original.signal);
  for (const key of Object.keys(original.dnaByWindow)) {
    assert.deepEqual(shuffled.dnaByWindow[key], original.dnaByWindow[key]);
  }
});

test("Ben Johnson proof validates its compact read model independently", () => {
  const { validateArtifact } = require("../src/services/footballIntelligence");
  const proof = buildBenJohnsonVerticalProof(load());
  assert.equal(validateArtifact(proof.readModel).status, "validated");
});

test("Ben Johnson proof refuses a self-resigned fixture snapshot", () => {
  const input = load();
  const alteredCsv = input.csv.replace("FALSE,TRUE,FALSE", "TRUE,TRUE,FALSE");
  const alteredManifest = structuredClone(input.manifest);
  const crypto = require("node:crypto");
  alteredManifest.output.sha256 = crypto.createHash("sha256").update(alteredCsv).digest("hex");
  assert.throws(() => buildBenJohnsonVerticalProof({ csv: alteredCsv, manifest: alteredManifest }), /reviewed pinned snapshot/);
});
