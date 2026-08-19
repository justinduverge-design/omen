"use strict";

/**
 * Sprint item still open while its key shipped in a merged feat/fix PR title.
 *
 * The original check, and the reason this tooling exists: seven times the sprint file
 * described work as pullable after it merged to `main`.
 */

const { SPRINT_FILE, parseSprintItems, isClosed } = require("./markdown");

/**
 * Key-in-title matching, with word boundaries.
 *
 * `R7` must not match `R70`, and must not match "r7" inside a longer token. The lookarounds
 * do that without requiring surrounding spaces, since real titles write keys as
 * `— P1-DraftAssistantSideline +` or `(R7)`.
 */
function titleMentionsKey(title, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9-])${escaped}(?![A-Za-z0-9-])`).test(title);
}

/**
 * Not every merged PR that names a key *shipped* that key.
 *
 * The first run proved the point: it flagged `S3` on "docs: record Sleeper S3 live proof"
 * and `S7` on "docs(sprint): widen S7 …". Neither closed its item — one recorded evidence,
 * the other *widened* scope. Reporting those is how a check earns a reputation for crying
 * wolf and stops being read, which leaves us exactly where we started.
 *
 * Conventional-commit type is the signal: `feat`/`fix`/`refactor`/`perf` ship things,
 * `docs`/`chore`/`test`/`ci` usually do not. Doc PRs mentioning a key are still surfaced,
 * as informational context rather than as a finding that fails the check.
 */
const SHIPPING_TYPE = /^(feat|fix|refactor|perf)(\([^)]*\))?!?:/i;

module.exports = {
  id: "sprint-vs-merged-prs",
  title: "sprint items vs merged PR titles",
  needs: ["merged PRs"],

  appliesWhen(ctx) {
    const text = ctx.read(SPRINT_FILE);
    if (!text) return { applies: false, reason: `${SPRINT_FILE} not present` };
    const open = parseSprintItems(text).filter((i) => !isClosed(i.status));
    if (open.length === 0) {
      return { applies: false, reason: "every sprint item is already CLOSED" };
    }
    return { applies: true, detail: `${open.length} non-closed items` };
  },

  run(ctx) {
    const items = parseSprintItems(ctx.read(SPRINT_FILE));
    const prs = ctx.mergedPrs();
    const findings = [];
    const informational = [];

    for (const item of items) {
      if (isClosed(item.status)) continue;
      const matches = prs.filter((pr) => titleMentionsKey(pr.title, item.key));
      if (matches.length === 0) continue;

      const shipping = matches.filter((pr) => SHIPPING_TYPE.test(pr.title));
      const bucket = shipping.length ? findings : informational;
      bucket.push({
        kind: "sprint-item",
        key: item.key,
        status: item.status || "(no Status: line)",
        prs: (shipping.length ? shipping : matches).map((pr) => ({
          number: pr.number,
          title: pr.title,
        })),
      });
    }
    return { findings, informational };
  },
};
