#!/usr/bin/env node
"use strict";

/**
 * Orchestrator for the record-staleness checks.
 *
 * ## Why this exists
 *
 * Seven times, `Direction/current_sprint.md` described work as pullable after it merged to
 * `main`. Twice on 2026-08-16 alone — including once by the reconciliation pass written to
 * stop it happening.
 *
 * The mechanism is dull, which is why it survives: a handoff is written *before* the PR
 * merges, correctly says "not pushed, merged, or deployed", and nothing re-reads it once the
 * PR lands. The sprint file and the inbox inherit that sentence. Nobody is careless — the
 * step where someone would fix it does not exist in the workflow. The cost is real: a
 * session that trusts the queue rebuilds work already on `main`.
 *
 * ## Why it became an orchestrator (2026-08-19)
 *
 * The known-issues reconciliation found two things the single-purpose version reported clean:
 *
 *   1. **`S8` was finished on 2026-08-11 and still advertised as an available P1 pull.** The
 *      check matched sprint keys against PR *titles*, and Dependabot titles are
 *      `build(deps): …` — they never carry a sprint key. A whole category was invisible.
 *   2. **`facts-of-record.md` contradicted `known_issues.md` about Yahoo for six days**, with
 *      the wrong version in the higher-authority file. Nothing compared the direction files
 *      to each other, or either to GitHub.
 *
 * The founder's objection was the right one: *a checker that inspects part of what can go
 * stale and then prints "no staleness found" is worse than no checker* — it converts an
 * unknown into a false all-clear.
 *
 * The founder also set the shape: **one file that kicks off domain checkers, where a checker
 * that has nothing to do does not move.** Each checker in `scripts/checks/` declares its own
 * preconditions in `appliesWhen(ctx)`, evaluated against local files only. Network data is
 * fetched lazily by `context.js` and only if some *applicable* checker asks for it — an empty
 * handoff directory costs no PR listing.
 *
 * ## The contract a checker implements
 *
 *   id            stable slug, used in output and `--only`
 *   title          one line, human-readable
 *   needs          data labels for the coverage report, e.g. ["merged PRs"]
 *   appliesWhen(ctx) -> { applies, reason?, detail? }   local checks only, no network
 *   run(ctx)         -> { findings[], informational[] }
 *
 * ## Usage
 *
 *   node scripts/check-sprint-staleness.js
 *   node scripts/check-sprint-staleness.js --json
 *   node scripts/check-sprint-staleness.js --only known-issues-buried,issue-state-conflicts
 *   node scripts/check-sprint-staleness.js --limit 200
 *
 * Exit code 1 when findings exist, so it can gate a closeout step. If GitHub is unreachable
 * the network-dependent checkers are reported as **did not run** rather than as passing, and
 * the exit code reflects only what actually ran.
 */

const { createContext, GitHubUnavailableError } = require("./checks/context");

const CHECKERS = [
  require("./checks/sprint-vs-merged-prs"),
  require("./checks/sprint-cited-prs-resolved"),
  require("./checks/handoff-unmerged-claims"),
  require("./checks/known-issues-buried"),
  require("./checks/issue-state-conflicts"),
  require("./checks/known-issues-missing-paths"),
];

/**
 * Blind spots, stated on every run.
 *
 * Listing what the tool cannot see is the whole point of printing coverage — a pass is only
 * meaningful against a known scope.
 */
const BLIND_SPOTS = [
  "prose-vs-prose contradictions between two files that cite no issue number " +
    "(the 2026-08-13 Yahoo case — cite the number and issue-state-conflicts can see it)",
  "whether a `Done when:` clause was genuinely met — always a human call",
  "anything in a file outside Direction/ and Blueprints/handoffs/",
];

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const limitArg = args.indexOf("--limit");
const prLimit = limitArg >= 0 ? Number(args[limitArg + 1]) || 100 : 100;
const onlyArg = args.indexOf("--only");
const only = onlyArg >= 0 ? String(args[onlyArg + 1] || "").split(",").map((s) => s.trim()) : null;

function main() {
  const ctx = createContext({ prLimit });
  const selected = only ? CHECKERS.filter((c) => only.includes(c.id)) : CHECKERS;

  const ran = [];
  const skipped = [];
  const unavailable = [];
  const findings = [];
  const informational = [];

  for (const checker of selected) {
    let verdict;
    try {
      verdict = checker.appliesWhen(ctx);
    } catch (e) {
      unavailable.push({ id: checker.id, title: checker.title, reason: e.message });
      continue;
    }

    if (!verdict.applies) {
      skipped.push({ id: checker.id, title: checker.title, reason: verdict.reason });
      continue;
    }

    try {
      const result = checker.run(ctx);
      ran.push({ id: checker.id, title: checker.title, detail: verdict.detail });
      findings.push(...(result.findings || []).map((f) => ({ ...f, checker: checker.id })));
      informational.push(...(result.informational || []));
    } catch (e) {
      // A network failure means this checker did not run. Reporting it as passing would be
      // the false all-clear this tool exists to prevent, so it is called out separately and
      // does not count toward a clean exit.
      const reason = e instanceof GitHubUnavailableError
        ? `GitHub unreachable — ${e.message}`
        : e.message;
      unavailable.push({ id: checker.id, title: checker.title, reason });
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ ran, skipped, unavailable, findings, informational }, null, 2));
    process.exit(findings.length ? 1 : 0);
  }

  report({ ran, skipped, unavailable, findings, informational });
  process.exit(findings.length ? 1 : 0);
}

function describe(f) {
  switch (f.kind) {
    case "sprint-item":
      return [
        `STALE    ${f.key}`,
        `         Status: ${f.status}`,
        ...f.prs.map((pr) => `         merged in #${pr.number} — ${pr.title}`),
      ];
    case "resolved-citations":
      return [
        `STALE    ${f.key}  (every PR it cites is resolved)`,
        `         Status: ${f.status}`,
        `         cited: ${f.prs.map((p) => `#${p.number} ${p.state}`).join(", ")}`,
        "         The S8 shape — its own PRs are done and the status never advanced.",
        "         Title matching cannot see this class.",
      ];
    case "handoff":
      return [
        `STALE    ${f.file}`,
        `         claims "Not pushed/merged" while citing merged PR(s): ` +
          f.prs.map((p) => `#${p.number}`).join(", "),
      ];
    case "buried-known-issue":
      return [
        `BURIED   ${f.file}:${f.line}`,
        `         ${f.heading}`,
        "         Marked OPEN but names no GitHub issue, so it is invisible to anyone",
        "         steering from GitHub. Raise one, or drop the entry.",
      ];
    case "issue-state-conflict":
      return [
        `CONFLICT ${f.file}:${f.line}`,
        `         ${f.heading}`,
        `         ${f.claim}, but issue #${f.issue} is ${f.issueState}`,
      ];
    case "missing-path":
      return [
        `STALE    ${f.file}:${f.line}`,
        `         ${f.heading}`,
        `         references \`${f.missingPath}\`, which no longer exists`,
      ];
    default:
      return [`FINDING  ${JSON.stringify(f)}`];
  }
}

function report({ ran, skipped, unavailable, findings, informational }) {
  for (const f of findings) {
    describe(f).forEach((l) => console.log(l));
    console.log("");
  }

  console.log(findings.length === 0
    ? "No findings in the checks that ran.\n"
    : `${findings.length} finding(s).\n`);

  console.log("Coverage — this is what a pass above does and does not mean:");
  for (const c of ran) {
    console.log(`  ✓ ran      ${c.title}${c.detail ? ` (${c.detail})` : ""}`);
  }
  for (const c of skipped) {
    console.log(`  · skipped  ${c.title} — ${c.reason}`);
  }
  for (const c of unavailable) {
    console.log(`  ! DID NOT RUN  ${c.title} — ${c.reason}`);
  }
  for (const b of BLIND_SPOTS) {
    console.log(`  ✗ not checked  ${b}`);
  }
  console.log("");

  if (unavailable.length > 0) {
    console.log("Some checks did not run. That is NOT an all-clear for what they cover.\n");
  }

  if (informational.length > 0) {
    console.log("Mentioned in merged docs/chore PRs — probably fine, shown for context:");
    for (const item of informational) {
      console.log(`  ${item.key} (${item.status}) — ` +
        item.prs.map((pr) => `#${pr.number}`).join(", "));
    }
    console.log("");
  }

  if (findings.length > 0) {
    console.log("This tool never edits anything, on purpose. Closing an item needs a human");
    console.log("judgement it cannot make — whether every `Done when:` clause was met, or");
    console.log("only some. Items are legitimately held open after merging when a clause is");
    console.log("unevidenced. Review each finding, then close or annotate it by hand.");
  }
}

main();
