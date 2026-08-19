"use strict";

/**
 * Shared, lazily-populated context handed to every checker.
 *
 * ## Why lazy
 *
 * Each GitHub call costs a round trip, and most runs do not need all of them. A checker
 * declares what it needs by *asking* for it; nothing is fetched until something asks. If no
 * applicable checker asks for issues, `gh issue list` never runs.
 *
 * This is the point of the orchestrator split: the left fielder does not move when nobody is
 * on base. A run with an empty handoff directory should not pay for a PR listing that only
 * the handoff check would have used.
 *
 * Every accessor memoises, so ten checkers asking for merged PRs produce one call.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");

/** Raised when GitHub cannot be reached. The orchestrator turns this into "did not run". */
class GitHubUnavailableError extends Error {}

function ghJson(cmdArgs) {
  try {
    const raw = execFileSync("gh", cmdArgs, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
    });
    return JSON.parse(raw);
  } catch (e) {
    throw new GitHubUnavailableError(e.message.split("\n")[0]);
  }
}

function memo(fn) {
  let called = false;
  let value;
  return (...a) => {
    if (!called) {
      value = fn(...a);
      called = true;
    }
    return value;
  };
}

function createContext({ prLimit = 100 } = {}) {
  const fileCache = new Map();

  const readIfExists = (relPath) => {
    if (fileCache.has(relPath)) return fileCache.get(relPath);
    const abs = path.join(ROOT, relPath);
    const value = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
    fileCache.set(relPath, value);
    return value;
  };

  const listMarkdown = memo(() => {
    const out = {};
    for (const dir of ["Direction", "Blueprints/handoffs"]) {
      const abs = path.join(ROOT, dir);
      out[dir] = fs.existsSync(abs)
        ? fs.readdirSync(abs).filter((n) => n.endsWith(".md")).sort()
        : [];
    }
    return out;
  });

  const ctx = {
    root: ROOT,
    prLimit,

    /** Returns file contents, or null when the file is absent. Memoised per path. */
    read: readIfExists,
    exists: (relPath) => fs.existsSync(path.join(ROOT, relPath)),
    markdownFiles: (dir) => listMarkdown()[dir] || [],

    mergedPrs: memo(() =>
      ghJson(["pr", "list", "--state", "merged", "--limit", String(prLimit),
        "--json", "number,title,mergedAt"])),

    /** Every PR regardless of state, so a checker can tell "closed unmerged" from "open". */
    allPrs: memo(() =>
      ghJson(["pr", "list", "--state", "all", "--limit", String(prLimit * 2),
        "--json", "number,title,state"])),

    issues: memo(() =>
      ghJson(["issue", "list", "--state", "all", "--limit", String(prLimit * 2),
        "--json", "number,title,state"])),
  };

  // Assigned after the literal so it can close over `ctx` — `this` would not survive the
  // memo wrapper, which calls its function without a receiver.
  ctx.issuesByNumber = memo(() => new Map(ctx.issues().map((i) => [i.number, i])));

  return ctx;
}

module.exports = { createContext, GitHubUnavailableError, ROOT };
