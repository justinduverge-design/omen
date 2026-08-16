#!/usr/bin/env node
"use strict";

/**
 * Flags sprint items that shipped but are still advertised as open.
 *
 * ## Why this exists
 *
 * Seven times now, `Direction/current_sprint.md` has described work as pullable after it
 * merged to `main`. Twice on 2026-08-16 alone — including once by the reconciliation pass
 * written to stop it happening.
 *
 * The mechanism is dull, which is why it survives: a handoff is written *before* the PR
 * merges, correctly says "not pushed, merged, or deployed", and nothing re-reads it once
 * the PR lands. The sprint file and the inbox inherit that sentence. Nobody is careless —
 * the step where someone would fix it does not exist in the workflow.
 *
 * The cost is real. A session that trusts the queue rebuilds work already on `main`.
 *
 * ## What it checks
 *
 * For every task key in the sprint file, if that key appears in the title of a **merged**
 * PR while the item's `Status:` is not `CLOSED`, that is a staleness finding.
 *
 * It also flags any handoff that still claims "not pushed/merged" while naming a PR number
 * that has since merged — the upstream source of the same drift.
 *
 * ## What it deliberately does NOT do
 *
 * It does not edit anything. Closing an item requires a human judgement this script cannot
 * make: whether the `Done when:` clauses were actually met, or only some of them. Several
 * items on this board are correctly held open *after* merging because a clause is
 * unevidenced (`M4-CC-PlatformsCompact` is the standing example). Auto-closing on a merged
 * PR title would turn one failure mode into a worse one.
 *
 * ## Usage
 *
 *   node scripts/check-sprint-staleness.js          # human-readable report
 *   node scripts/check-sprint-staleness.js --json   # machine-readable
 *   node scripts/check-sprint-staleness.js --limit 200
 *
 * Exit code 1 when findings exist, so it can gate a closeout step.
 * Requires `gh` on PATH and authenticated; without it the script says so and exits 0
 * rather than reporting a false all-clear.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SPRINT_FILE = path.join(ROOT, "Direction", "current_sprint.md");
const HANDOFF_DIR = path.join(ROOT, "Blueprints", "handoffs");

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const limitArg = args.indexOf("--limit");
const PR_LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) || 100 : 100;

/**
 * Task keys look like `### R7 — ...`, `### P1-DraftAssistantSideline — ...`,
 * `### M5-Native-API-Client — ...`, `### B2-D3-S2 — ...`.
 *
 * Anchored to a level-3 heading because that is how the sprint file declares an item; a
 * looser match would pick up prose mentions and drown the report in noise.
 */
const TASK_HEADING = /^###\s+~?~?([A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)\b/;

function parseSprintItems(markdown) {
  const lines = markdown.split("\n");
  const items = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(TASK_HEADING);
    if (heading) {
      if (current) items.push(current);
      current = { key: heading[1], status: null, heading: line.trim() };
      continue;
    }
    if (!current || current.status) continue;

    // `- **Status:** **CLOSED 2026-08-16.**` / `- **Status:** READY`
    const status = line.match(/^\s*-\s*\*\*Status:\*\*\s*(.+)$/);
    if (status) {
      current.status = status[1].replace(/\*/g, "").trim();
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

function mergedPullRequests(limit) {
  const raw = execFileSync(
    "gh",
    ["pr", "list", "--state", "merged", "--limit", String(limit), "--json", "number,title,mergedAt"],
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  return JSON.parse(raw);
}

/**
 * Key-in-title matching, with word boundaries.
 *
 * `R7` must not match `R70`, and must not match the word "r7" inside a longer token. The
 * lookarounds do that without needing the key to be surrounded by spaces, since real titles
 * write keys as `— P1-DraftAssistantSideline +` or `(R7)`.
 */
function titleMentionsKey(title, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9-])${escaped}(?![A-Za-z0-9-])`).test(title);
}

/**
 * Not every merged PR that names a key *shipped* that key.
 *
 * The first run of this script proved the point: it flagged `S3` on "docs: record Sleeper S3
 * live proof" and `S7` on "docs(sprint): widen S7 to cover unused @anthropic-ai/sdk
 * production dep". Neither closed its item — one recorded evidence, the other *widened* the
 * scope. Reporting those as staleness is how a check earns a reputation for crying wolf and
 * stops being read, which would leave us exactly where we started.
 *
 * So conventional-commit type is used as the signal: `feat`/`fix`/`refactor`/`perf` ship
 * things, `docs`/`chore`/`test`/`ci` usually do not. Doc PRs that mention a key are still
 * reported, but as informational context rather than as a finding that fails the check.
 */
const SHIPPING_TYPE = /^(feat|fix|refactor|perf)(\([^)]*\))?!?:/i;

function findStaleSprintItems(items, prs) {
  const findings = [];
  const informational = [];

  for (const item of items) {
    if (isClosed(item.status)) continue;
    const matches = prs.filter((pr) => titleMentionsKey(pr.title, item.key));
    if (matches.length === 0) continue;

    const shipping = matches.filter((pr) => SHIPPING_TYPE.test(pr.title));
    const target = shipping.length ? findings : informational;
    target.push({
      kind: "sprint-item",
      key: item.key,
      status: item.status || "(no Status: line)",
      mergedPrs: (shipping.length ? shipping : matches).map((pr) => ({
        number: pr.number,
        title: pr.title,
        mergedAt: pr.mergedAt,
      })),
    });
  }
  return { findings, informational };
}

/**
 * The upstream source: a handoff still claiming it is unmerged while naming a PR that has.
 * Handoffs are point-in-time artifacts and nothing re-reads them after a merge — this is
 * the check that would have caught #314 the moment it landed.
 */
function findStaleHandoffs(prs) {
  if (!fs.existsSync(HANDOFF_DIR)) return [];
  const mergedNumbers = new Set(prs.map((pr) => pr.number));
  const findings = [];

  for (const name of fs.readdirSync(HANDOFF_DIR)) {
    if (!name.endsWith(".md")) continue;
    const text = fs.readFileSync(path.join(HANDOFF_DIR, name), "utf8");

    // Only the claim itself counts. These files legitimately *discuss* the stale-claim
    // problem in prose, and flagging that would make the check cry wolf about its own
    // documentation — which is how a check gets ignored.
    const claimsUnmerged = /\*\*Not pushed[^*]*\*\*/i.test(text);
    if (!claimsUnmerged) continue;

    const cited = [...text.matchAll(/(?:pull\/|PR\s*#|#)(\d{2,5})\b/g)]
      .map((m) => Number(m[1]))
      .filter((n) => mergedNumbers.has(n));
    if (cited.length === 0) continue;

    findings.push({
      kind: "handoff",
      file: path.relative(ROOT, path.join(HANDOFF_DIR, name)),
      mergedPrs: [...new Set(cited)],
    });
  }
  return findings;
}

function main() {
  if (!fs.existsSync(SPRINT_FILE)) {
    console.error(`Sprint file not found at ${path.relative(ROOT, SPRINT_FILE)} — nothing to check.`);
    process.exit(0);
  }

  let prs;
  try {
    prs = mergedPullRequests(PR_LIMIT);
  } catch (e) {
    // Exiting 0 here is deliberate. A missing or unauthenticated `gh` means the check did
    // not run; reporting "no findings" would be a false all-clear, which is worse than
    // saying nothing. The message says which it is.
    console.error("Could not list merged PRs (is `gh` installed and authenticated?).");
    console.error(`  ${e.message.split("\n")[0]}`);
    console.error("Skipping the staleness check — this is NOT an all-clear.");
    process.exit(0);
  }

  const items = parseSprintItems(fs.readFileSync(SPRINT_FILE, "utf8"));
  const sprint = findStaleSprintItems(items, prs);
  const findings = [...sprint.findings, ...findStaleHandoffs(prs)];
  const { informational } = sprint;

  if (asJson) {
    console.log(JSON.stringify(
      { checked: items.length, prs: prs.length, findings, informational }, null, 2
    ));
    process.exit(findings.length ? 1 : 0);
  }

  console.log(`Checked ${items.length} sprint items against ${prs.length} merged PRs.\n`);

  const reportInformational = () => {
    if (informational.length === 0) return;
    console.log("Mentioned in merged docs/chore PRs — probably fine, shown for context:");
    for (const item of informational) {
      const titles = item.mergedPrs.map((pr) => `#${pr.number}`).join(", ");
      console.log(`  ${item.key} (${item.status}) — ${titles}`);
    }
    console.log("");
  };

  if (findings.length === 0) {
    console.log("No staleness found — every task key shipped in a feat/fix PR is CLOSED, and");
    console.log("no handoff claims to be unmerged while citing a merged PR.\n");
    reportInformational();
    process.exit(0);
  }

  for (const finding of findings) {
    if (finding.kind === "sprint-item") {
      console.log(`STALE  ${finding.key}`);
      console.log(`       Status: ${finding.status}`);
      for (const pr of finding.mergedPrs) {
        console.log(`       merged in #${pr.number} — ${pr.title}`);
      }
    } else {
      console.log(`STALE  ${finding.file}`);
      console.log(`       still claims "Not pushed/merged" while citing merged PR(s): ` +
        finding.mergedPrs.map((n) => `#${n}`).join(", "));
    }
    console.log("");
  }

  console.log(`${findings.length} finding(s).\n`);
  reportInformational();
  console.log("This script does not edit anything on purpose. Closing an item needs a human");
  console.log("judgement it cannot make — whether every `Done when:` clause was met, or only");
  console.log("some. Items are legitimately held open after merging when a clause is");
  console.log("unevidenced. Review each finding, then close or annotate it by hand.");
  process.exit(1);
}

main();
