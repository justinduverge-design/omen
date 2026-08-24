#!/usr/bin/env node
"use strict";

/**
 * Are you the only agent in this working tree?
 *
 * ## Why this exists
 *
 * On 2026-08-24 two agent sessions ran concurrently in the same checkout. The
 * collision was not subtle and was still invisible until it had already caused
 * damage:
 *
 *   - The working branch changed underneath a session **twice**, mid-task, with
 *     no signal other than `git status` listing files nobody in that session
 *     had written.
 *   - One commit (`4bf00fa`, message *"thus might belong to another branch
 *     maybr a7?"*) captured two unrelated workstreams together — A6/A7
 *     football-data work and an in-progress Trade service — because both were
 *     dirty in one tree and `git add` swept the lot.
 *   - Recovering it meant reading reflog to prove nothing was lost.
 *
 * Nobody was careless. **The step where you would notice does not exist in the
 * workflow.** `git status` is the only signal, and an unfamiliar filename in it
 * reads as "left over from something" far more naturally than "another agent is
 * typing right now."
 *
 * ## The rule this encodes
 *
 * At kickoff a working tree should be **clean**. Anything dirty at kickoff was
 * put there by someone else — a previous session that did not finish, or a
 * concurrent one that is still going. Either way it is not yours to commit.
 *
 * More than one registered worktree means more than one place work can be
 * happening at once. That is not automatically a problem — worktrees are the
 * *fix* — but you should know before you start.
 *
 * ## What to do when it reports findings
 *
 * Do not work in a shared dirty tree. Take your own worktree:
 *
 *     git worktree add ../omen-<your-task> -b <your-branch> main
 *
 * A worktree is the only mechanism that actually prevents two sessions from
 * clobbering each other's uncommitted files. Branch discipline alone does not:
 * `git checkout` carries uncommitted changes across branches, which is exactly
 * how the two workstreams got mixed.
 *
 * ## Usage
 *
 *   node scripts/check-workspace-solo.js
 *   node scripts/check-workspace-solo.js --json
 *   node scripts/check-workspace-solo.js --since <sha>   # mid-session drift check
 *
 * Exit code 1 when findings exist, so it can gate a kickoff step.
 *
 * This tool never edits anything, on purpose.
 */

const { execFileSync } = require("node:child_process");

const BLIND_SPOTS = [
  "who owns a dirty file — git records no session identity, so \"not mine\" is a judgement you make, not one this tool makes",
  "an agent working in a different clone of the same repo entirely",
  "an editor, IDE, or watcher holding unsaved changes that have not reached disk",
  "whether the other session is finished or still typing — check its branch's commit times",
];

const MAX_LISTED = 20;

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function parseWorktrees() {
  const raw = git(["worktree", "list", "--porcelain"]);
  const trees = [];
  let current = null;
  for (const line of raw.split("\n")) {
    if (line.startsWith("worktree ")) {
      current = { path: line.slice("worktree ".length), branch: null };
      trees.push(current);
    } else if (line.startsWith("branch ") && current) {
      current.branch = line.slice("branch ".length).replace("refs/heads/", "");
    }
  }
  return trees;
}

function dirtyPaths() {
  const raw = git(["status", "--porcelain"]);
  if (!raw) return [];
  return raw.split("\n").filter(Boolean).map((line) => ({
    code: line.slice(0, 2).trim() || "?",
    path: line.slice(3),
  }));
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const sinceIndex = args.indexOf("--since");
  const since = sinceIndex >= 0 ? String(args[sinceIndex + 1] || "").trim() : null;

  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const head = git(["rev-parse", "--short", "HEAD"]);
  const worktrees = parseWorktrees();
  const dirty = dirtyPaths();

  const findings = [];

  if (worktrees.length > 1) {
    findings.push({
      id: "multiple-worktrees",
      title: `${worktrees.length} worktrees are registered — work can be happening in more than one place`,
      detail: worktrees.map((w) => `${w.path}${w.branch ? `  [${w.branch}]` : "  (detached)"}`),
      action: "Confirm which one is yours. If another session is live, stay in your own worktree and never commit from theirs.",
    });
  }

  if (dirty.length > 0) {
    findings.push({
      id: "dirty-at-kickoff",
      title: `${dirty.length} uncommitted path(s) in this tree — at kickoff, these are not yours`,
      detail: dirty.slice(0, MAX_LISTED).map((d) => `${d.code}  ${d.path}`)
        .concat(dirty.length > MAX_LISTED ? [`… and ${dirty.length - MAX_LISTED} more`] : []),
      action: "Do NOT `git add -A` or `git add .` here. Take your own worktree, or identify every path before staging anything.",
    });
  }

  if (since) {
    const current = git(["rev-parse", head]);
    const baseline = git(["rev-parse", since]);
    if (baseline && current && baseline !== current) {
      findings.push({
        id: "head-drift",
        title: `HEAD moved since ${since} — the branch changed underneath this session`,
        detail: [`was ${since}`, `now ${head} on ${branch}`],
        action: "Someone else moved the branch, or a checkout carried your work. Verify your commits survived (`git reflog`) before continuing.",
      });
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ branch, head, worktrees, dirty, findings, blindSpots: BLIND_SPOTS }, null, 2));
    process.exitCode = findings.length > 0 ? 1 : 0;
    return;
  }

  console.log(`Workspace: ${branch} @ ${head}\n`);

  for (const f of findings) {
    console.log(`FINDING — ${f.title}`);
    for (const line of f.detail) console.log(`    ${line}`);
    console.log(`  → ${f.action}\n`);
  }

  console.log(findings.length === 0
    ? "No findings — this tree looks like yours alone.\n"
    : `${findings.length} finding(s).\n`);

  console.log("Coverage — this is what a pass above does and does not mean:");
  console.log("  ✓ ran      registered worktrees for this repo");
  console.log("  ✓ ran      uncommitted paths in this working tree");
  console.log(since
    ? `  ✓ ran      HEAD drift against ${since}`
    : "  · skipped  HEAD drift — pass --since <sha> at kickoff to enable it");
  for (const b of BLIND_SPOTS) console.log(`  ✗ not checked  ${b}`);
  console.log("");

  if (findings.length > 0) {
    console.log("A clean tree is the kickoff expectation. Branch discipline alone does not");
    console.log("protect you: `git checkout` carries uncommitted changes across branches,");
    console.log("which is exactly how two workstreams got mixed on 2026-08-24. Use:");
    console.log("");
    console.log("    git worktree add ../omen-<your-task> -b <your-branch> main");
    console.log("");
  }

  process.exitCode = findings.length > 0 ? 1 : 0;
}

main();
