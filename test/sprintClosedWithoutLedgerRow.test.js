"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const check = require("../scripts/checks/sprint-closed-without-ledger-row");

/**
 * Why this test exists.
 *
 * Four items — `O2`, `W1-GATE`, `R4`, `R5` — were marked CLOSED with no row in the completion
 * ledger, and all four were found by hand. `R4` and `R5` sat that way for two weeks while
 * every automated check reported clean.
 *
 * The two directions that matter are the ones the ledger lookup can get wrong. A mention is
 * not a record: `R4` appears in the ledger three times, every one a cross-reference inside
 * another item's prose. If those counted, this checker would report the defect it exists to
 * find as clean — the false all-clear the whole tool is built to avoid. And the prose scan
 * must stay quiet on the ordinary sprint file, or it teaches people to skim.
 */

const ctxFor = (sprint, ledger) => ({
  read: (rel) =>
    ({ "Direction/current_sprint.md": sprint, "Direction/sprints_completed.md": ledger }[rel] ??
      null),
});

const LEDGER_WITH_ROW = [
  "| Task key | Title | Evidence |",
  "| :--- | :--- | :--- |",
  "| R4 | Privacy nutrition labels | PR #350 |",
].join("\n");

test("flags a CLOSED item with no ledger row", () => {
  const { findings } = check.run(
    ctxFor(
      "### R4 — Privacy nutrition labels\n- **Status:** CLOSED — Closure: COMPLETED 2026-08-23.\n",
      "# Ledger\n"
    )
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].key, "R4");
  assert.equal(findings[0].kind, "closed-without-ledger-row");
});

test("a table row counts as a record", () => {
  const { findings } = check.run(
    ctxFor("### R4 — Privacy\n- **Status:** CLOSED 2026-08-23.\n", LEDGER_WITH_ROW)
  );
  assert.deepEqual(findings, []);
});

test("a section heading that leads with the key counts as a record", () => {
  const { findings } = check.run(
    ctxFor(
      "### W1-GATE — ESPN sheet legal gate\n- **Status:** CLOSED 2026-08-31.\n",
      "## W1-GATE — ESPN in-app sheet legal and review gate — closed 2026-08-31\n\nThe answer was negative.\n"
    )
  );
  assert.deepEqual(findings, []);
});

test("a cross-reference in another item's prose is NOT a record", () => {
  // The case that would have hidden R4 and R5 behind a substring match.
  const { findings } = check.run(
    ctxFor(
      "### R4 — Privacy\n- **Status:** CLOSED 2026-08-23.\n",
      "| R3 | Signing | Android internal release unpublished; R4/R5 still gate rollout. |\n"
    )
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].key, "R4");
});

test("catches a closure claimed only in another item's prose, after the stub is swept", () => {
  // R4 and R5 today: the CLOSED stubs are gone from the queue, the ledger row never
  // arrived, and the only surviving trace is an unblock line in a neighbouring item.
  const { findings } = check.run(
    ctxFor(
      [
        "### R6 — Internal testing tracks",
        "- **Status:** READY",
        "- **Unblock:** 2026-08-23 CLEARED — `R4` and `R5` closed after the founder submitted both forms.",
      ].join("\n"),
      "# Ledger\n"
    )
  );
  assert.deepEqual(findings.map((f) => f.key).sort(), ["R4", "R5"]);
  assert.match(findings[0].source, /current_sprint\.md:3/);
});

test("stays quiet on prose about live items and on ordinary sprint text", () => {
  const { findings } = check.run(
    ctxFor(
      [
        "### R6 — Internal testing tracks",
        "- **Status:** READY",
        // R6 is live, so prose calling it closed is a different defect, not this one.
        "- **Note:** someone claimed `R6` was closed; it is not.",
        "- **Note:** lifecycle is READY → IN_PROGRESS → VERIFIED → CLOSED.",
        "- **Note:** PR #350 was closed on 2026-08-23 without merging.",
      ].join("\n"),
      "# Ledger\n"
    )
  );
  assert.deepEqual(findings, []);
});

test("does not apply when nothing is declared closed", () => {
  const verdict = check.appliesWhen(
    ctxFor("### R6 — Tracks\n- **Status:** READY\n", "# Ledger\n")
  );
  assert.equal(verdict.applies, false);
});
