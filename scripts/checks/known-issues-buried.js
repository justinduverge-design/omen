"use strict";

/**
 * A known issue marked OPEN that names no GitHub issue — the "buried" case.
 *
 * The 2026-08-19 reconciliation surfaced four of these: the locked fonts never being
 * acquired, backend Sentry breadcrumbs leaking URLs, a 4.43:1 contrast pair, and the Android
 * light-mode status bar. All real, all unresolved, and all invisible to anyone steering from
 * GitHub rather than reading the repo.
 *
 * This enforces the standing rule adopted then: **if it is real and open it gets an issue
 * number in its heading; if it is not worth an issue, it is not worth an entry.** Citing the
 * number is also what makes a contradiction machine-visible to the sibling issue-state
 * check — a buried entry cannot be cross-checked against anything.
 */

const { KNOWN_ISSUES_FILE, sections, referencedNumbers } = require("./markdown");

/** Headings that announce a still-open problem, e.g. `… (found 2026-08-17, OPEN)`. */
function isOpenHeading(heading) {
  return /\bOPEN\b/.test(heading);
}

function openSections(ctx) {
  return sections(ctx.read(KNOWN_ISSUES_FILE)).filter((s) => isOpenHeading(s.heading));
}

module.exports = {
  id: "known-issues-buried",
  title: "known-issues entries marked OPEN with no GitHub issue",
  needs: ["issues"],

  appliesWhen(ctx) {
    if (!ctx.read(KNOWN_ISSUES_FILE)) {
      return { applies: false, reason: `${KNOWN_ISSUES_FILE} not present` };
    }
    const open = openSections(ctx);
    if (open.length === 0) {
      return { applies: false, reason: "no entry is marked OPEN" };
    }
    return { applies: true, detail: `${open.length} OPEN entr(ies)` };
  },

  run(ctx) {
    const known = ctx.issuesByNumber();
    const findings = [];

    for (const section of openSections(ctx)) {
      const whole = `${section.heading}\n${section.body.join("\n")}`;
      // A reference only counts if it resolves to a real issue. A bare `#340` that matches
      // nothing is a typo or a PR number, and should not silence the finding.
      const refs = referencedNumbers(whole).filter((n) => known.has(n));
      if (refs.length > 0) continue;
      findings.push({
        kind: "buried-known-issue",
        file: KNOWN_ISSUES_FILE,
        line: section.line,
        heading: section.heading,
      });
    }
    return { findings, informational: [] };
  },
};
