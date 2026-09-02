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
 *
 * ## What it deliberately does not read: the historical record
 *
 * A direction file holds two kinds of sentence. A **current claim** ("Yahoo access is
 * refused") is checkable against the issue and is this check's whole subject. A **historical
 * record** — a superseded block kept for provenance, or a dated decision entry stating what
 * was true when the decision was taken — is correct writing that will never match today's
 * issue state, because it is not about today.
 *
 * Before 2026-09-02 this check read both, and reported five findings on issue #308 that were
 * all wrong: one inside a block explicitly headed *"Everything below this line is superseded
 * history, retained for provenance"*, and four narrating the 2026-08-19 reconciliation in
 * past tense. `agent_inbox.md` had already recorded them as known false positives, with the
 * reason: **rewriting superseded-history prose to satisfy a linter would destroy provenance
 * this repo keeps on purpose.**
 *
 * That is the failure this exclusion prevents — not a nuisance, but a check that, if obeyed,
 * would have deleted the record of how a real contradiction was found and fixed. The
 * exclusions are counted and reported rather than silent, so a suppression can never quietly
 * grow into blindness.
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

/**
 * Files that are append-only records of dated events rather than statements of current state.
 *
 * `decision_log.md` entries are headed `## YYYY-MM-DD — <what was decided>` and describe the
 * world as it stood on that date. An entry reading "Yahoo is never offered as a
 * personalization source while its API is refused (issue #308)" was true on 2026-08-24 and is
 * the reason the decision was taken. Editing it to match a later reality would falsify the
 * log. `CLAUDE.md` names this file "rationale and history" for exactly this reason.
 *
 * Current-state files — `facts-of-record.md`, `known_issues.md`, `current_sprint.md`,
 * `agent_inbox.md`, `context.md` — stay in scope. They are where a stale claim does damage,
 * and they are the pair the original #308 contradiction lived in.
 */
const HISTORICAL_FILES = new Set(["Direction/decision_log.md"]);

/**
 * Markers that put a line, or everything after it, into the historical record.
 *
 * Two forms appear in this repo, both from `facts-of-record.md` #11:
 *   inline  `- **[SUPERSEDED 2026-08-28 — the refusal is over.]** Yahoo ... is REFUSED ...`
 *   opener  `- **Everything below this line is superseded history, retained for provenance.**`
 *
 * An opener runs until the next level-2 heading, which is where a new record begins.
 */
/**
 * An inline marker makes ONE line historical: `- **[SUPERSEDED 2026-08-28 ...]** Yahoo ... is
 * REFUSED ...`. It does not speak for the lines after it — a sprint item often carries one
 * superseded bullet among live ones, and treating the marker as an opener blinded the rest of
 * the item.
 */
const SUPERSESSION_INLINE =
  /\[?\bSUPERSEDED\b|\bsuperseded (?:by|on)\b|~~/i;

/**
 * An opener explicitly hands everything after it to the record:
 * `- **Everything below this line is superseded history, retained for provenance.**`
 * It runs until the next heading of any level.
 */
const SUPERSESSION_OPENER =
  /\b(everything below|all below|below this line)\b[^.]*\b(superseded|historical|provenance)\b|\bsuperseded history\b|\bretained for provenance\b/i;

/**
 * A superseded region ends at the next heading of ANY level.
 *
 * An earlier draft closed regions only at `##`. Sprint items are `###`, so one item
 * mentioning SUPERSEDED swallowed every item after it in the same lane — 8 marker lines in
 * `current_sprint.md` blinded most of the file. A marker speaks for its own block, not for
 * everything that happens to follow it.
 */
const SECTION_BREAK = /^#{1,6}\s/;

/**
 * A dated reconciliation heading — `## ✅ Reconciled against GitHub — 2026-08-19` — opens a
 * record of what was found on that date, not a claim about now.
 */
const DATED_RECORD_HEADING = /^##\s.*\b(reconcil\w*|superseded|archive[d]?|history|historical)\b/i;

/**
 * Mark every line of a file that sits in historical context.
 *
 * Returns an array of booleans parallel to the file's lines. Computed once per file so a
 * long decision log is not re-scanned per reference.
 */
function historicalLines(text) {
  const lines = text.split("\n");
  const historical = new Array(lines.length).fill(false);
  let inRegion = false;

  lines.forEach((line, i) => {
    if (SECTION_BREAK.test(line)) {
      // A heading of any level closes an open region, then may open its own.
      inRegion = DATED_RECORD_HEADING.test(line);
      historical[i] = inRegion;
      return;
    }
    if (SUPERSESSION_OPENER.test(line)) {
      inRegion = true;
      historical[i] = true;
      return;
    }
    // An inline marker is historical on its own line only.
    historical[i] = inRegion || SUPERSESSION_INLINE.test(line);
  });

  return historical;
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
    // Counted, not silent. A suppression nobody can see is how a check goes blind.
    let suppressedInBlocks = 0;
    let suppressedInLogs = 0;
    const blockFiles = new Set();

    for (const rel of directionFiles(ctx)) {
      const text = ctx.read(rel);
      if (!text) continue;

      const isHistoricalFile = HISTORICAL_FILES.has(rel);
      const historical = isHistoricalFile ? null : historicalLines(text);

      // Scoped to a single LINE, not a section.
      //
      // An earlier draft judged whole sections and produced four findings on issue #263
      // alone, every one of them wrong: those sections narrate a still-gated feature while
      // citing a closed issue as historical context, which is correct writing, not a
      // contradiction. A claim and a citation sharing one line is the narrow case where the
      // wording really is about that issue.
      text.split("\n").forEach((line, i) => {
        if (referencedNumbers(line).length === 0) return;

        // Historical context is not a claim about now — see the header note.
        if (isHistoricalFile) {
          suppressedInLogs += 1;
          return;
        }
        if (historical[i]) {
          suppressedInBlocks += 1;
          blockFiles.add(rel);
          return;
        }

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

    const informational = [];
    if (suppressedInLogs > 0) {
      informational.push(
        `Not read: ${suppressedInLogs} issue reference(s) in ${[...HISTORICAL_FILES].join(", ")} — ` +
          `an append-only log of dated decisions, which states what was true when each ` +
          `decision was taken. Editing it to match today would falsify the record.`
      );
    }
    if (suppressedInBlocks > 0) {
      informational.push(
        `Not read: ${suppressedInBlocks} issue reference(s) inside superseded blocks or dated ` +
          `reconciliation sections in ${[...blockFiles].sort().join(", ")}. ` +
          `Provenance, not current claims. If a live claim is hiding in one of these blocks, ` +
          `this check will not see it — that is the accepted cost of not rewriting history.`
      );
    }
    return { findings, informational };
  },
};
