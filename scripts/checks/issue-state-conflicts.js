"use strict";

/**
 * A direction file whose wording about an issue contradicts that issue's actual state.
 *
 * ## The case this is modelled on
 *
 * `facts-of-record.md` said Yahoo API access *"was re-approved… the developer application is
 * live again"* while `known_issues.md` recorded a live-verified 403 and issue #308 stayed
 * open. Six days of disagreement, with the optimistic version in the higher-authority file
 * that agents read first.
 *
 * ## Its honest limitation
 *
 * That contradiction was **prose against prose**, and this check could not have caught it as
 * written — only the known-issues side cited #308. What it catches is the narrower, reliable
 * slice: a line that both cites an issue and states a status in words. **Citing the number
 * is what makes a claim checkable**, which is exactly why the buried-entry check exists
 * alongside this one.
 */

const path = require("node:path");
const { referencedNumbers, REF_PATTERN } = require("./markdown");

const DIRECTION_DIR = "Direction";

const SAYS_RESOLVED = /\b(fixed|resolved|closed|re-?approved|complete[d]?|no longer (an issue|blocking))\b/i;
const SAYS_OPEN = /\b(still open|still waiting|still failing|unresolved|refused|blocker|is open|remains open|pending)\b/i;

/**
 * How close a status word must sit to the reference to be read as describing it.
 *
 * Without this, one long summary line poisons itself: the inbox line announcing the
 * 2026-08-19 reconciliation lists #338–#341 (all open) *and* says "`S8` closed as
 * already-done" about something else entirely, and was flagged four times. A claim and a
 * reference in the same sentence is the signal; a claim and a reference in the same
 * paragraph-long line is a coincidence.
 */
const PROXIMITY = 70;

/** The window of text around one reference, where a status word would actually be about it. */
function windowAround(line, index) {
  return line.slice(Math.max(0, index - PROXIMITY), index + PROXIMITY);
}

function directionFiles(ctx) {
  return ctx.markdownFiles(DIRECTION_DIR).map((n) => path.posix.join(DIRECTION_DIR, n));
}

module.exports = {
  id: "issue-state-conflicts",
  title: "direction files whose wording contradicts a cited issue's state",
  needs: ["issues"],

  appliesWhen(ctx) {
    const files = directionFiles(ctx);
    if (files.length === 0) {
      return { applies: false, reason: `${DIRECTION_DIR} has no markdown files` };
    }
    const citing = files.filter((f) => referencedNumbers(ctx.read(f)).length > 0);
    if (citing.length === 0) {
      return { applies: false, reason: "no direction file cites an issue or PR number" };
    }
    return { applies: true, detail: `${citing.length} file(s) cite numbers` };
  },

  run(ctx) {
    const known = ctx.issuesByNumber();
    const findings = [];

    for (const rel of directionFiles(ctx)) {
      const text = ctx.read(rel);
      if (!text) continue;

      // Scoped to a single LINE, not a section.
      //
      // An earlier draft judged whole sections and produced four findings on issue #263
      // alone, every one of them wrong: those sections narrate a still-gated feature while
      // citing a closed issue as historical context, which is correct writing, not a
      // contradiction. A claim and a citation sharing one line is the narrow case where the
      // wording really is about that issue.
      text.split("\n").forEach((line, i) => {
        if (referencedNumbers(line).length === 0) return;

        // Each reference is judged against its own neighbourhood, not the whole line, so a
        // long line discussing several issues cannot cross-contaminate them.
        for (const match of line.matchAll(REF_PATTERN)) {
          const number = Number(match[1]);
          if (!known.has(number)) continue;

          const near = windowAround(line, match.index);
          // Judged only when the neighbourhood makes exactly one kind of claim. Mixed prose
          // ("was open, now fixed") is normal historical narration, not a contradiction.
          const saysResolved = SAYS_RESOLVED.test(near);
          const saysOpen = SAYS_OPEN.test(near);
          if (saysResolved === saysOpen) continue;

          const state = known.get(number).state;
          const conflicts =
            (saysResolved && state === "OPEN") || (saysOpen && state === "CLOSED");
          if (!conflicts) continue;

          findings.push({
            kind: "issue-state-conflict",
            file: rel,
            line: i + 1,
            heading: near.trim().slice(0, 120),
            issue: number,
            issueState: state,
            claim: saysResolved ? "reads as resolved" : "reads as open/blocking",
          });
        }
      });
    }
    return { findings, informational: [] };
  },
};
