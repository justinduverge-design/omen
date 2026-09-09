"use strict";

/**
 * The `O2` / `W1-GATE` / `R4` / `R5` case: an item declared **CLOSED** with nothing written
 * into `Direction/sprints_completed.md`.
 *
 * ## Why this is the defect worth a checker
 *
 * The process in `current_sprint.md` is explicit: an item moves to `CLOSED` *"once the result
 * is placed in `Direction/sprints_completed.md` with the appropriate Done receipt"*. Closure
 * and ledger row are one step. When only the first half happens the item still looks
 * finished, so nothing ever looks wrong — and then the closed stub is swept out of the active
 * queue in the next reconciliation and the evidence has nowhere left to be. The 2026-09-02
 * pass caught `O2` and `W1-GATE` this way and called it *"worth noting as a pattern"*. It was:
 * `R4` and `R5` had already been closed the same way on 2026-08-23 and went undetected for
 * two weeks, by hand, while every other checker reported clean.
 *
 * ## Two paths, because closure is claimed in two places
 *
 * 1. **The item itself** — `### R4 …` with `- **Status:** CLOSED`. This is the moment the
 *    invariant is supposed to hold, and catching it here is what makes the fix cheap.
 * 2. **The queue's prose** — `- **Unblock:** … `TASK-W1-GATE` CLOSED.` Closure is routinely
 *    announced in another item's unblock lines, and those survive the tombstone sweep that
 *    removes the item. This path is why `R4` and `R5` are still visible today: their stubs
 *    are gone, but line 396 still says they were closed, and the ledger still has no row.
 *
 * ## What counts as a record
 *
 * Not a mention — a **record position**: the task-key column of a ledger table row, or a
 * section heading that leads with the key. `R4` appears three times in the ledger already,
 * every one of them a cross-reference inside another item's prose ("R4/R5 still gate
 * rollout"). A substring match would have read those as evidence and reported the exact
 * defect it exists to find as clean, which is the false all-clear these checks exist to
 * prevent.
 */

const { SPRINT_FILE, parseSprintItems, isClosed } = require("./markdown");

const LEDGER_FILE = "Direction/sprints_completed.md";

/**
 * A task key with a digit in its first segment: `R4`, `O2`, `W1-GATE`, `B2-D3-S2`,
 * `M5-Native-API-Client`. The digit is what keeps the prose scan honest — without it every
 * capitalised word near "CLOSED" becomes a candidate key.
 */
const KEY_SHAPE = /^[A-Z][A-Za-z]*\d[A-Za-z0-9]*(?:-[A-Za-z0-9]+)*$/;

/** Keys as they are written in prose: optionally backticked, optionally `TASK-` prefixed. */
const KEY_IN_PROSE = /`?(?:TASK-)?([A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)`?/g;

/** Judged in a window around each key, for the same reason `issue-state-conflicts` does. */
const CLAIMS_CLOSED = /\b(?:CLOSED|closed)\b/;
const WINDOW = 70;

/** Table rows whose first cell is the key, and headings that lead with it. */
function ledgerKeys(text) {
  const keys = new Set();
  if (!text) return keys;
  for (const line of text.split("\n")) {
    const cell = line.match(/^\s*\|\s*`?([A-Za-z][A-Za-z0-9-]*)`?\s*\|/);
    if (cell) keys.add(cell[1]);
    const heading = line.match(/^#{2,4}\s+`?([A-Za-z][A-Za-z0-9-]*)`?\b/);
    if (heading) keys.add(heading[1]);
  }
  return keys;
}

function closedItems(text) {
  return parseSprintItems(text).filter((i) => isClosed(i.status));
}

/**
 * Prose claims that some *other* key is closed. Keys that are live items in the queue are
 * skipped: prose calling an open item closed is a contradiction, but a different one, and
 * reporting it here would only muddy what this check means.
 */
function proseClaims(text, liveKeys) {
  const claims = new Map();
  text.split("\n").forEach((line, i) => {
    for (const match of line.matchAll(KEY_IN_PROSE)) {
      const key = match[1];
      if (!KEY_SHAPE.test(key)) continue;
      if (liveKeys.has(key)) continue;
      const near = line.slice(Math.max(0, match.index - WINDOW), match.index + WINDOW);
      if (!CLAIMS_CLOSED.test(near)) continue;
      if (!claims.has(key)) claims.set(key, { line: i + 1, quote: near.trim().slice(0, 120) });
    }
  });
  return claims;
}

module.exports = {
  id: "sprint-closed-without-ledger-row",
  title: "items declared CLOSED with no row in the completion ledger",
  needs: [],

  appliesWhen(ctx) {
    const text = ctx.read(SPRINT_FILE);
    if (!text) return { applies: false, reason: `${SPRINT_FILE} not present` };
    if (!ctx.read(LEDGER_FILE)) return { applies: false, reason: `${LEDGER_FILE} not present` };

    const items = closedItems(text).length;
    const live = new Set(parseSprintItems(text).filter((i) => i.status && !isClosed(i.status))
      .map((i) => i.key));
    const claims = proseClaims(text, live).size;
    if (items + claims === 0) {
      return { applies: false, reason: "nothing in the sprint file is declared CLOSED" };
    }
    return { applies: true, detail: `${items} closed item(s), ${claims} prose closure claim(s)` };
  },

  run(ctx) {
    const text = ctx.read(SPRINT_FILE);
    const recorded = ledgerKeys(ctx.read(LEDGER_FILE));
    const findings = [];

    for (const item of closedItems(text)) {
      if (recorded.has(item.key)) continue;
      findings.push({
        kind: "closed-without-ledger-row",
        key: item.key,
        source: `${SPRINT_FILE} — \`Status: ${item.status}\``,
      });
    }

    const live = new Set(parseSprintItems(text).filter((i) => i.status && !isClosed(i.status))
      .map((i) => i.key));
    const seen = new Set(findings.map((f) => f.key));
    for (const [key, where] of proseClaims(text, live)) {
      if (recorded.has(key) || seen.has(key)) continue;
      findings.push({
        kind: "closed-without-ledger-row",
        key,
        source: `${SPRINT_FILE}:${where.line} — "${where.quote}"`,
      });
    }

    return { findings, informational: [] };
  },
};
