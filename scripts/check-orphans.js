#!/usr/bin/env node
"use strict";

/**
 * Prune as we build — the finder.
 *
 * Omen adds faster than it removes. Routes outlive the screens that called them, tables outlive the
 * features that wrote them, env vars outlive the providers that read them. Nothing fails, so nothing
 * gets deleted. This lists the likely dead things so a person can decide. It never deletes.
 *
 *   node scripts/check-orphans.js            full report
 *   node scripts/check-orphans.js --json     machine-readable
 *
 * Every finding is a CANDIDATE, not a verdict: a route can be called by a cron, a table can be read
 * by SQL in another repo. Confirm before removing. Screens are covered by
 * scripts/check-screen-reachability.mjs and are run from here.
 *
 * Safe to run: reads files and local git refs, writes nothing, makes no network call. Exit 0 always.
 * Rule this serves: Blueprints/definition-of-done.md → "Removal".
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const JSON_OUT = process.argv.includes("--json");
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "Archive", "output", ".build", "DerivedData"]);

function walk(dir, exts, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

const read = (p) => fs.readFileSync(p, "utf8");
const rel = (p) => path.relative(ROOT, p);
const corpus = (dirs, exts) =>
  dirs
    .flatMap((d) => walk(path.join(ROOT, d), exts))
    .map(read)
    .join("\n");

// ── Routes: mounted paths no client or job mentions ─────────────────────────
function routes() {
  const server = read(path.join(ROOT, "src/server.js"));
  const varToFile = {};
  for (const m of server.matchAll(/const (\w+) = require\("\.\/routes\/(\w+)"\)/g)) varToFile[m[1]] = m[2];
  const mounts = [];
  for (const m of server.matchAll(/app\.use\("([^"]+)",[^\n]*?(\w+)\)?;/g)) {
    const file = varToFile[m[2]] || (m[0].match(/routes\/(\w+)/) || [])[1];
    if (file) mounts.push({ base: m[1], file });
  }
  // The route files and server.js define paths; only references elsewhere count as a caller.
  const exts = [".swift", ".kt", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".sh"];
  const outside = ["mobile", "frontend/src", "extension", "scripts", "src", "test"]
    .flatMap((d) => walk(path.join(ROOT, d), exts))
    .filter((f) => !f.includes(`${path.sep}src${path.sep}routes${path.sep}`) && !f.endsWith(`src${path.sep}server.js`))
    .map(read)
    .join("\n");
  const found = [];
  for (const { base, file } of mounts) {
    const fp = path.join(ROOT, "src/routes", `${file}.js`);
    if (!fs.existsSync(fp)) continue;
    for (const m of read(fp).matchAll(/router\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)/g)) {
      const full = (base + (m[2] === "/" ? "" : m[2])).replace(/\/+/g, "/");
      const prefix = full.split("/:")[0];
      if (prefix.length <= base.length && m[2] !== "/") continue;
      // A caller names the path exactly: next char is not part of a longer path segment.
      const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`${esc}(?![\\w-])`).test(outside))
        found.push({ route: `${m[1].toUpperCase()} ${full}`, file: rel(fp) });
    }
  }
  return found;
}

// ── Tables: created, never dropped, never named in code ────────────────────
function tables() {
  const sqlFiles = ["sql", "warehouse", "src/db", "scripts/db"].flatMap((d) => walk(path.join(ROOT, d), [".sql"]));
  const created = new Map();
  const dropped = new Set();
  for (const f of sqlFiles) {
    const s = read(f);
    for (const m of s.matchAll(/create table (?:if not exists )?(?:"?(\w+)"?\.)?"?(\w+)"?/gi))
      created.set(m[2].toLowerCase(), rel(f));
    for (const m of s.matchAll(/drop table (?:if exists )?(?:"?\w+"?\.)?"?(\w+)"?/gi)) dropped.add(m[1].toLowerCase());
  }
  // Drops written as `execute format('drop table %I', t)` over a name list: a table named anywhere
  // in a file that drops tables counts as dropped.
  for (const f of sqlFiles) {
    const s = read(f);
    if (!/drop table/i.test(s) || /create table/i.test(s)) continue;
    for (const t of created.keys()) if (new RegExp(`\\b${t}\\b`, "i").test(s)) dropped.add(t);
  }
  const code = corpus(
    ["src", "scripts", "warehouse", "mobile", "frontend/src"],
    [".js", ".mjs", ".ts", ".py", ".swift", ".kt"],
  );
  return [...created]
    .filter(([t]) => !dropped.has(t) && !new RegExp(`\\b${t}\\b`).test(code))
    .map(([table, file]) => ({ table, file }));
}

// ── Env vars: documented in .env.example, read nowhere ─────────────────────
function envVars() {
  const ex = path.join(ROOT, ".env.example");
  if (!fs.existsSync(ex)) return [];
  const keys = [...read(ex).matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]);
  const code =
    corpus(
      ["src", "scripts", "warehouse", "deploy", "infra", ".github", "frontend/src"],
      [".js", ".mjs", ".ts", ".jsx", ".tsx", ".py", ".sh", ".yml", ".yaml"],
    ) +
    ["docker-compose.yml", "docker-compose.hostinger.yml", "Dockerfile"]
      .map((f) => (fs.existsSync(path.join(ROOT, f)) ? read(path.join(ROOT, f)) : ""))
      .join("\n");
  return keys.filter((k) => !code.includes(k)).map((name) => ({ name }));
}

// ── Branches: local branches already merged into main, or idle 30+ days ────
function branches() {
  const git = (...args) => {
    try {
      return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      return "";
    }
  };
  const current = git("branch", "--show-current");
  const merged = new Set(git("branch", "--merged", "main", "--format=%(refname:short)").split("\n").filter(Boolean));
  const cutoff = Date.now() / 1000 - 30 * 86400;
  return git("for-each-ref", "refs/heads", "--format=%(refname:short)|%(committerdate:unix)")
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("|"))
    .filter(([b]) => b !== "main" && b !== current)
    .filter(([b, t]) => merged.has(b) || Number(t) < cutoff)
    .map(([branch, t]) => ({
      branch,
      reason: merged.has(branch) ? "merged into main" : `idle since ${new Date(t * 1000).toISOString().slice(0, 10)}`,
    }));
}

// ── Untracked output folders ──────────────────────────────────────────────
function untracked() {
  try {
    return execFileSync("git", ["status", "--porcelain", "-z", "--untracked-files=normal"], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\0")
      .filter((l) => l.startsWith("?? "))
      .map((l) => ({ path: l.slice(3) }));
  } catch {
    return [];
  }
}

// ── Screens: delegate to the existing reachability check ───────────────────
function screens() {
  const r = spawnSync(process.execPath, [path.join(__dirname, "check-screen-reachability.mjs"), "--quiet"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (r.error || (r.status !== 0 && r.status !== 1))
    return [{ line: `reachability check did not run (${r.error?.message || `exit ${r.status}`})` }];
  if (r.status === 0) return [];
  // Exit 1 = findings; keep only lines naming a screen, not the header or footer.
  return (r.stdout || "")
    .split("\n")
    .filter((l) => /Screen\b/.test(l) && /referenced only/i.test(l))
    .map((line) => ({ line: line.trim() }));
}

function collect() {
  return {
    routes: routes(),
    tables: tables(),
    envVars: envVars(),
    branches: branches(),
    untracked: untracked(),
    screens: screens(),
  };
}

const TITLES = {
  routes: "Routes no client, job or script mentions",
  tables: "Tables created, never dropped, never named in code",
  envVars: ".env.example keys nothing reads",
  branches: "Local branches merged or idle 30+ days",
  untracked: "Untracked files and folders",
  screens: "Screens (check-screen-reachability)",
};

module.exports = { collect, TITLES };
if (require.main === module) {
  const report = collect();
  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const fmt = {
      routes: (x) => `${x.route}  (${x.file})`,
      tables: (x) => `${x.table}  (${x.file})`,
      envVars: (x) => x.name,
      branches: (x) => `${x.branch}  — ${x.reason}`,
      untracked: (x) => x.path,
      screens: (x) => x.line,
    };
    let total = 0;
    for (const k of Object.keys(report)) {
      console.log(`\n${TITLES[k]}: ${report[k].length}`);
      for (const x of report[k]) console.log(`  - ${fmt[k](x)}`);
      total += report[k].length;
    }
    console.log(`\n${total} candidates. Candidates, not verdicts — confirm each before removing.`);
  }
}
