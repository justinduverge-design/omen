"use strict";

/**
 * A known issue describing a repo path that no longer exists.
 *
 * The `src/omen_gdpr.js` case: the entry said the file "remains present" long after PR #119
 * deleted it. Nobody was wrong when they wrote it — the file was simply removed elsewhere
 * and the entry describing it was never revisited.
 *
 * Needs no network access at all, so it runs even when `gh` is unavailable.
 */

const fs = require("node:fs");
const path = require("node:path");
const { KNOWN_ISSUES_FILE, sections } = require("./markdown");

/**
 * Only backticked references with a directory separator and a source-file extension.
 *
 * A bare filename is usually generic prose ("the `package.json` convention"), and anything
 * without a slash is too likely to be an example rather than a real repo path.
 */
const PATH_REF = /`([A-Za-z0-9_.\-/]+\.(?:js|jsx|ts|tsx|swift|kt|kts|json|yml|yaml|sql|cjs|mjs))`/g;

/**
 * Only paths rooted at a real top-level directory count.
 *
 * `lib/authBypass.cjs` is written relative to its sibling driver and lives at
 * `.agents/skills/run-slops-saloon/lib/authBypass.cjs` — a correct reference that a naive
 * repo-root existence test calls missing. Requiring a known root keeps the check to paths
 * that are genuinely repo-rooted.
 */
const REPO_ROOTS = [
  "src/", "test/", "scripts/", "frontend/", "mobile/", "sql/",
  "Blueprints/", "Direction/", "Brand/", ".github/", ".agents/", "deploy/",
];

/**
 * An entry that says a file was deleted is doing its job, not going stale.
 *
 * The `src/omen_gdpr.js` correction written on 2026-08-19 names the file precisely to record
 * that PR #119 removed it. Flagging that line would punish the fix for the very drift this
 * check exists to catch.
 */
const DESCRIBES_REMOVAL = /\b(deleted|removed|retired|no longer exists|was an orphan|gone)\b/i;

function referencedPaths(text) {
  const out = new Set();
  for (const m of text.matchAll(PATH_REF)) {
    const p = m[1];
    if (p.startsWith("http")) continue;
    if (!REPO_ROOTS.some((root) => p.startsWith(root))) continue;
    out.add(p);
  }
  return [...out];
}

module.exports = {
  id: "known-issues-missing-paths",
  title: "known-issues entries naming repo paths that no longer exist",
  needs: [],

  appliesWhen(ctx) {
    const text = ctx.read(KNOWN_ISSUES_FILE);
    if (!text) return { applies: false, reason: `${KNOWN_ISSUES_FILE} not present` };
    const count = referencedPaths(text).length;
    if (count === 0) return { applies: false, reason: "no repo paths referenced" };
    return { applies: true, detail: `${count} path(s) referenced` };
  },

  run(ctx) {
    const findings = [];
    const seen = new Set();

    // Line-level, so the removal guard applies to the sentence that names the path rather
    // than to a whole section that might mention several files for different reasons.
    for (const section of sections(ctx.read(KNOWN_ISSUES_FILE))) {
      section.body.forEach((line, offset) => {
        if (DESCRIBES_REMOVAL.test(line)) return;
        for (const p of referencedPaths(line)) {
          if (seen.has(p)) continue;
          seen.add(p);
          if (fs.existsSync(path.join(ctx.root, p))) continue;
          findings.push({
            kind: "missing-path",
            file: KNOWN_ISSUES_FILE,
            line: section.line + offset,
            heading: section.heading,
            missingPath: p,
          });
        }
      });
    }
    return { findings, informational: [] };
  },
};
