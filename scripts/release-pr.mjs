#!/usr/bin/env node
// Keeps one PR open from main into production: "Release to production". Merging it is the deploy
// (deploy.yml runs on pushes to production). Run by .github/workflows/release-pr.yml after every push
// to main; `node scripts/release-pr.mjs --dry-run` prints what it would do.
//
// It opens the PR only when main differs from production in a file that deploys, meaning a file not
// in deploy.yml's paths-ignore. Docs-only merges ride along with the next release.
// Exit 0 done or nothing to release; a failing git or gh call exits non-zero with its own message.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const TITLE_PREFIX = "Release to production";
const MAX_LISTED = 60;

// The paths-ignore globs from deploy.yml's push trigger (a flat YAML list; no parser needed).
export function pathsIgnore(deployYml) {
  const lines = deployYml.split("\n");
  const start = lines.findIndex((l) => /^\s+paths-ignore:\s*$/.test(l));
  if (start < 0) throw new Error("deploy.yml has no paths-ignore list");
  const globs = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const m = line.match(/^\s+-\s+["']?([^"'#]+?)["']?\s*(#.*)?$/);
    if (!m) break;
    globs.push(m[1]);
  }
  if (!globs.length) throw new Error("deploy.yml paths-ignore list is empty");
  return globs;
}

// GitHub's filter glob: `**` crosses folders, `*` doesn't, and `**/x` also matches a top-level x.
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") {
        re += "(?:.*/)?";
        i += 2;
      } else {
        re += ".*";
        i += 1;
      }
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

export function deployingFiles(files, globs) {
  const res = globs.map(globToRegExp);
  return files.filter((f) => !res.some((r) => r.test(f)));
}

export function prBody(commits, deploying) {
  const listed = commits.slice(0, MAX_LISTED).map((c) => `- ${c}`);
  if (commits.length > MAX_LISTED) listed.push(`- …and ${commits.length - MAX_LISTED} more`);
  return [
    "**Merging this deploys Omen production** (slopssaloon.com: the API, cron and web app that the",
    "beta apps call). Use **Create a merge commit**, not squash or rebase, so production stays in step",
    "with main.",
    "",
    `${deploying} changed file(s) deploy. Commits on main since the last release:`,
    "",
    ...listed,
    "",
    "Kept up to date by `.github/workflows/release-pr.yml`. Agents never merge this PR;",
    "`scripts/merge-pr.sh` refuses any base but main.",
  ].join("\n");
}

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" }).trim();
const lines = (s) => (s ? s.split("\n") : []);

function main() {
  const dry = process.argv.includes("--dry-run");
  run("git", ["fetch", "-q", "origin", "main", "production"]);
  const files = lines(run("git", ["diff", "--name-only", "origin/production", "origin/main"]));
  const deploying = deployingFiles(files, pathsIgnore(readFileSync(".github/workflows/deploy.yml", "utf8")));
  const open = JSON.parse(
    run("gh", ["pr", "list", "--base", "production", "--head", "main", "--state", "open", "--json", "number"]),
  );
  const ahead = Number(run("git", ["rev-list", "--count", "origin/production..origin/main"]));
  if (!deploying.length || !ahead) {
    // Nothing would deploy (or main has no commit production lacks): a release PR left open would ask
    // Justin to merge a no-op, so close it.
    console.log(
      `release-pr: nothing that deploys differs from production (${files.length} other file(s), ${ahead} commit(s) ahead)`,
    );
    if (open.length && !dry)
      run("gh", [
        "pr",
        "close",
        String(open[0].number),
        "--comment",
        "Closed by release-pr.yml: nothing that deploys differs from production now.",
      ]);
    return;
  }
  const commits = lines(run("git", ["log", "--no-merges", "--format=%h %s", "origin/production..origin/main"]));
  const title = `${TITLE_PREFIX}: ${commits.length} commit(s)`;
  const body = prBody(commits, deploying.length);
  const args = open.length
    ? ["pr", "edit", String(open[0].number), "--title", title, "--body", body]
    : ["pr", "create", "--base", "production", "--head", "main", "--title", title, "--body", body];
  if (dry) {
    console.log(`release-pr (dry run): gh ${args.slice(0, 3).join(" ")} …\n${title}\n\n${body}`);
    return;
  }
  console.log(run("gh", args) || `release-pr: updated #${open[0].number}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
