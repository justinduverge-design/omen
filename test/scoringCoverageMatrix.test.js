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

test("the matrix's retention column matches the code, whichever way a flag is set", () => {
  const committed = fs.readFileSync(OUTPUT, "utf8");

  // Deliberately not asserting a fixed posture. An earlier version pinned all three to
  // `false`, which made a legitimate, reasoned change to one provider look like a
  // regression. What must hold is that the document and the code agree.
  const withheld = Object.values(RETAIN_RULE_BODY).filter((retained) => retained === false).length;
  const permitted = Object.values(RETAIN_RULE_BODY).length - withheld;

  assert.equal((committed.match(/⛔ withheld/g) || []).length, withheld);
  assert.equal((committed.match(/✅ permitted/g) || []).length, permitted);
  // The old "ESPN and Yahoo must stay off" invariant is retired, not weakened. It encoded a
  // posture — a rights position for ESPN, an entitlement refusal for Yahoo — and both changed
  // on the record. What this test guards now is the property that actually matters: the
  // committed document tracks the code, whichever way any flag is set.
});

test("every canonical event appears in the matrix exactly once", () => {
  const committed = fs.readFileSync(OUTPUT, "utf8");

  for (const key of EVENT_KEYS) {
    const rows = committed.match(new RegExp(`^\\| \`${key}\` \\|`, "gm")) || [];
    assert.equal(rows.length, 1, `${key} should appear in exactly one matrix row, saw ${rows.length}`);
  }
});
