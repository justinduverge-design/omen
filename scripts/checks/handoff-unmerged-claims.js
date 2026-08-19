"use strict";

/**
 * The upstream source of sprint drift: a handoff still claiming it is unmerged while naming
 * a PR that has merged.
 *
 * Handoffs are point-in-time artifacts written *before* a PR lands, and nothing re-reads
 * them afterwards. The sprint file and the inbox then inherit that stale sentence. This is
 * the check that would have caught #314 the moment it landed.
 */

const path = require("node:path");
const { referencedNumbers } = require("./markdown");

const HANDOFF_DIR = "Blueprints/handoffs";

/**
 * Only the claim itself counts. These files legitimately *discuss* the stale-claim problem
 * in prose — this repo documents its own failure modes at length — and flagging that would
 * make the check cry wolf about its own documentation.
 */
const CLAIMS_UNMERGED = /\*\*Not pushed[^*]*\*\*/i;

function claimingFiles(ctx) {
  return ctx.markdownFiles(HANDOFF_DIR).filter((name) => {
    const text = ctx.read(path.posix.join(HANDOFF_DIR, name));
    return text && CLAIMS_UNMERGED.test(text);
  });
}

module.exports = {
  id: "handoff-unmerged-claims",
  title: "handoffs claiming unmerged while citing a merged PR",
  needs: ["merged PRs"],

  appliesWhen(ctx) {
    if (ctx.markdownFiles(HANDOFF_DIR).length === 0) {
      return { applies: false, reason: `${HANDOFF_DIR} has no markdown files` };
    }
    // Reading the files is local and cheap; fetching PRs is not. If no handoff makes the
    // claim at all, there is nothing a PR listing could tell us.
    const claiming = claimingFiles(ctx);
    if (claiming.length === 0) {
      return { applies: false, reason: 'no handoff claims "Not pushed/merged"' };
    }
    return { applies: true, detail: `${claiming.length} handoff(s) make the claim` };
  },

  run(ctx) {
    const mergedNumbers = new Set(ctx.mergedPrs().map((pr) => pr.number));
    const findings = [];

    for (const name of claimingFiles(ctx)) {
      const rel = path.posix.join(HANDOFF_DIR, name);
      const cited = referencedNumbers(ctx.read(rel)).filter((n) => mergedNumbers.has(n));
      if (cited.length === 0) continue;
      findings.push({ kind: "handoff", file: rel, prs: cited.map((n) => ({ number: n })) });
    }
    return { findings, informational: [] };
  },
};
