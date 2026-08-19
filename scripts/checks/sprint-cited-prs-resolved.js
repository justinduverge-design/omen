"use strict";

/**
 * The `S8` case: an item still offered as available work while **every PR it cites** is
 * resolved.
 *
 * ## Why title matching could never catch this
 *
 * `S8 — Triage the standing Dependabot queue` named #282, #281, #280, #277, #274, #273 in
 * its own body. All six resolved on 2026-08-11 exactly as its own verdicts prescribed. It
 * was still advertised as an available **P1** pull on 2026-08-19, and was listed as a
 * candidate in that morning's re-derived queue.
 *
 * The sibling check matches sprint keys against PR *titles*. Dependabot titles are
 * `build(deps): …` and never carry a sprint key, so an entire category of work was
 * structurally invisible to the only mechanism watching for drift.
 */

const {
  SPRINT_FILE, parseSprintItems, isAvailableWork, referencedNumbers,
} = require("./markdown");

/**
 * One stray reference to a merged PR is normal — items cite prior art constantly. A whole
 * cited set going resolved while the item still advertises itself is the actual signal.
 */
const MIN_CITED_PRS = 2;

function citedPrsFor(item, byNumber) {
  return referencedNumbers(item.body.join("\n")).filter((n) => byNumber.has(n));
}

module.exports = {
  id: "sprint-cited-prs-resolved",
  title: "sprint items whose own cited PRs are all resolved",
  needs: ["all PRs"],

  appliesWhen(ctx) {
    const text = ctx.read(SPRINT_FILE);
    if (!text) return { applies: false, reason: `${SPRINT_FILE} not present` };

    // Cheap structural precondition, evaluated without touching the network: is any item
    // both available *and* citing enough PR numbers to be judged? If not, the left fielder
    // stays put and no PR listing is fetched on this check's behalf.
    const candidates = parseSprintItems(text).filter(
      (i) => isAvailableWork(i.status) && referencedNumbers(i.body.join("\n")).length >= MIN_CITED_PRS
    );
    if (candidates.length === 0) {
      return {
        applies: false,
        reason: `no READY/IN_PROGRESS item cites ${MIN_CITED_PRS}+ PR or issue numbers`,
      };
    }
    return { applies: true, detail: `${candidates.length} candidate item(s)` };
  },

  run(ctx) {
    const byNumber = new Map(ctx.allPrs().map((pr) => [pr.number, pr]));
    const findings = [];

    for (const item of parseSprintItems(ctx.read(SPRINT_FILE))) {
      if (!isAvailableWork(item.status)) continue;

      const cited = citedPrsFor(item, byNumber);
      if (cited.length < MIN_CITED_PRS) continue;
      if (cited.some((n) => byNumber.get(n).state === "OPEN")) continue;

      findings.push({
        kind: "resolved-citations",
        key: item.key,
        status: item.status,
        prs: cited.map((n) => ({ number: n, state: byNumber.get(n).state })),
      });
    }
    return { findings, informational: [] };
  },
};
