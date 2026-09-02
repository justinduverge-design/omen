"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const check = require("../scripts/checks/issue-state-conflicts");

/**
 * Why this test exists.
 *
 * On 2026-09-02 this checker reported five findings on issue #308, all wrong. Every one sat
 * in historical context — one inside a block headed "Everything below this line is superseded
 * history, retained for provenance", the rest narrating the 2026-08-19 reconciliation.
 * `agent_inbox.md` had already recorded them as known false positives, with the reason that
 * rewriting superseded prose to satisfy a linter would destroy provenance kept on purpose.
 *
 * The exclusion that fixes it can fail in two directions, so both are tested: it must skip
 * the record, and it must still catch a live claim. The second is the one that matters — an
 * exclusion that quietly swallows real findings is worse than the false positives it removed.
 */

/** Build a context over in-memory files, with #308 closed. */
function ctxFor(files) {
  return {
    read: (rel) => files[rel] ?? null,
    markdownFiles: () => Object.keys(files).map((f) => f.replace("Direction/", "")),
    issuesByNumber: () => new Map([[308, { state: "CLOSED" }]]),
  };
}

test("catches a live claim that contradicts a closed issue", () => {
  const { findings } = check.run(
    ctxFor({
      "Direction/facts-of-record.md":
        "# Facts\n\n1. **Yahoo.** The entitlement is refused, issue #308 still open.\n",
    })
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].issue, 308);
  assert.equal(findings[0].claim, "reads as open/blocking");
});

test("skips an inline [SUPERSEDED] marker but not its live siblings", () => {
  // The over-suppression bug: an inline marker used to open a region and blind every
  // following bullet in the same item.
  const { findings } = check.run(
    ctxFor({
      "Direction/current_sprint.md": [
        "### F7 — Yahoo",
        "- **[SUPERSEDED]** Access refused, issue #308 still open.",
        "- **Status:** blocker remains, issue #308 is open.",
      ].join("\n"),
    })
  );
  assert.equal(findings.length, 1, "the live sibling bullet must still be found");
  assert.equal(findings[0].line, 3);
});

test("skips everything after an explicit 'everything below' opener, until the next heading", () => {
  const { findings } = check.run(
    ctxFor({
      "Direction/facts-of-record.md": [
        "# Facts",
        "- **Everything below this line is superseded history, retained for provenance.**",
        "- Access refused, issue #308 still open.",
        "- Still refused, issue #308 open.",
        "## Current status",
        "- Access is refused and issue #308 is still open.",
      ].join("\n"),
    })
  );
  assert.equal(findings.length, 1, "the heading closes the region");
  assert.equal(findings[0].line, 6);
});

test("does not read the decision log, which records what was true at a date", () => {
  const { findings, informational } = check.run(
    ctxFor({
      "Direction/decision_log.md":
        "## 2026-08-24 — a decision\n- taken while its API is refused, issue #308 open.\n",
    })
  );
  assert.equal(findings.length, 0);
  assert.match(informational.join(" "), /decision_log\.md/);
});

test("reports what it skipped rather than suppressing silently", () => {
  const { informational } = check.run(
    ctxFor({
      "Direction/known_issues.md": [
        "## ✅ Reconciled against GitHub — 2026-08-19",
        "- entitlement refused, issue #308 open.",
      ].join("\n"),
    })
  );
  assert.ok(informational.length > 0, "a suppression must be visible in the output");
  assert.match(informational.join(" "), /Not read:/);
});

test("strikethrough text is treated as retracted", () => {
  const { findings } = check.run(
    ctxFor({
      "Direction/current_sprint.md":
        "### F6\n- **Unblock:** ~~refused, issue #308 still open~~ WITHDRAWN\n",
    })
  );
  assert.equal(findings.length, 0);
});
