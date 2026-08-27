"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const { render, OUTPUT } = require("../scripts/generate-scoring-coverage-matrix");
const { EVENT_KEYS } = require("../src/services/scoringContract");
const { RETAIN_RULE_BODY } = require("../src/services/scoringSnapshotResolver");

test("the committed coverage matrix matches what the code actually supports", () => {
  // The point of generating this file rather than writing it by hand. A stale
  // "not deployed" list cost this repo twelve weeks and a stale defect
  // description nearly produced a well-tested no-op. A hand-written matrix would
  // be wrong the first time someone adds a Sleeper key, and nothing would say so.
  const committed = fs.readFileSync(OUTPUT, "utf8");
  assert.equal(
    committed,
    render(),
    "Blueprints/specs/a6-scoring-coverage-matrix.md is stale — run: node scripts/generate-scoring-coverage-matrix.js --write"
  );
});

test("the drift guard is real — a matrix that disagrees with the code is caught", () => {
  // Prove the guard rather than trusting it. If the committed file drifts by so
  // much as one row, the equality check above must fail. A guard nobody has seen
  // fail is a guard nobody knows works — this repo has shipped two of those.
  const committed = fs.readFileSync(OUTPUT, "utf8");

  const drifted = committed.replace("✅ 32/37 canonical events", "✅ 37/37 canonical events");
  assert.notEqual(drifted, committed, "the fixture must actually change something");
  assert.notEqual(drifted, render(), "an overstated coverage claim must not match the generator");

  const rowRemoved = committed.replace(/^\| `fumbles_lost` \|.*$/m, "");
  assert.notEqual(rowRemoved, render(), "a dropped event row must not match the generator");

  // And the real file still matches, so the two assertions above are not passing
  // for some unrelated reason.
  assert.equal(committed, render());
});

test("the matrix reports retention as withheld while every provider's rights are pending", () => {
  const committed = fs.readFileSync(OUTPUT, "utf8");

  for (const [provider, retained] of Object.entries(RETAIN_RULE_BODY)) {
    assert.equal(retained, false, `${provider} retention must stay off until its rights path is evidenced`);
  }
  // Three provider rows, all withheld. If someone flips a flag, this line forces
  // the document to be regenerated rather than quietly disagreeing with the code.
  assert.equal((committed.match(/⛔ withheld/g) || []).length, 3);
});

test("every canonical event appears in the matrix exactly once", () => {
  const committed = fs.readFileSync(OUTPUT, "utf8");

  for (const key of EVENT_KEYS) {
    const rows = committed.match(new RegExp(`^\\| \`${key}\` \\|`, "gm")) || [];
    assert.equal(rows.length, 1, `${key} should appear in exactly one matrix row, saw ${rows.length}`);
  }
});
