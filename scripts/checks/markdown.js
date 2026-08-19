"use strict";

/**
 * Shared markdown/record parsing for the staleness checkers.
 *
 * Kept in one place so a fix to how a `Status:` line is read benefits every checker rather
 * than one of them silently disagreeing with the others.
 */

const SPRINT_FILE = "Direction/current_sprint.md";
const KNOWN_ISSUES_FILE = "Direction/known_issues.md";

/**
 * Task keys look like `### R7 — ...`, `### P1-DraftAssistantSideline — ...`,
 * `### M5-Native-API-Client — ...`, `### B2-D3-S2 — ...`.
 *
 * Anchored to a level-3 heading because that is how the sprint file declares an item; a
 * looser match would pick up prose mentions and drown the report in noise.
 */
const TASK_HEADING = /^###\s+~?~?([A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)\b/;

function parseSprintItems(markdown) {
  if (!markdown) return [];
  const lines = markdown.split("\n");
  const items = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(TASK_HEADING);
    if (heading) {
      if (current) items.push(current);
      current = { key: heading[1], status: null, blockedBy: null, heading: line.trim(), body: [] };
      continue;
    }
    if (!current) continue;
    current.body.push(line);

    // `- **Status:** **CLOSED 2026-08-16.**` / `- **Status:** READY`
    if (!current.status) {
      const status = line.match(/^\s*-\s*\*\*Status:\*\*\s*(.+)$/);
      if (status) current.status = status[1].replace(/\*/g, "").trim();
    }

    // `- **Blocked by:** None` / `- **Blocked by:** 2026 NFL regular season has not opened.`
    if (!current.blockedBy) {
      const blocked = line.match(/^\s*-\s*\*\*Blocked by:\*\*\s*(.+)$/);
      if (blocked) current.blockedBy = blocked[1].replace(/\*/g, "").trim();
    }
  }
  if (current) items.push(current);
  return items;
}

/** An item is settled when its status opens with a terminal state. */
function isClosed(status) {
  if (!status) return false;
  return /^\s*(CLOSED|~~)/i.test(status);
}

/**
 * Only work still advertised as *available*.
 *
 * `VERIFIED` items legitimately have all their PRs merged — that is what VERIFIED means, and
 * several are deliberately held there while one `Done when:` clause stays unevidenced. An
 * earlier draft treated "not closed" as the gate and flagged six of them, which would have
 * trained everyone to skim past the output. `S8` was `READY`: shipped work still offered as
 * a pull. That is the signal worth interrupting someone for.
 *
 * A heading with no `Status:` line is not a task at all — the sprint file also uses `###`
 * for prose sections like "Agent selection guidance".
 */
function isAvailableWork(status) {
  if (!status) return false;
  return /^\s*(READY|IN_PROGRESS)\b/i.test(status);
}

/**
 * A stated blocker is the item saying "yes, this is open, and here is why" — which is the
 * status model working, not drift.
 *
 * `F6` is the case: `READY`, every cited PR merged, and genuinely unstartable because the
 * 2026 regular season has not opened (facts-of-record #10). Flagging it taught nothing and
 * cost a read. An item whose `Blocked by:` is anything other than `None` has already
 * accounted for itself.
 */
function isBlocked(item) {
  if (!item.blockedBy) return false;
  return !/^none\b/i.test(item.blockedBy);
}

/** Split a markdown file into `## `/`### ` sections so a claim can be tied to its heading. */
function sections(markdown) {
  if (!markdown) return [];
  const lines = markdown.split("\n");
  const out = [];
  let current = { heading: "(preamble)", line: 1, body: [] };
  lines.forEach((line, i) => {
    if (/^#{2,3}\s+/.test(line)) {
      out.push(current);
      current = { heading: line.replace(/^#+\s*/, "").trim(), line: i + 1, body: [] };
    } else {
      current.body.push(line);
    }
  });
  out.push(current);
  return out;
}

/** `#123`, `PR #123`, `pull/123`, `issues/123`. Two-to-five digits avoids matching years. */
const REF_PATTERN = /(?:pull\/|issues\/|PRs?\s*#|#)(\d{2,5})\b/g;

function referencedNumbers(text) {
  if (!text) return [];
  return [...new Set([...text.matchAll(REF_PATTERN)].map((m) => Number(m[1])))];
}

module.exports = {
  SPRINT_FILE,
  KNOWN_ISSUES_FILE,
  parseSprintItems,
  isClosed,
  isAvailableWork,
  isBlocked,
  sections,
  referencedNumbers,
  REF_PATTERN,
};
