#!/usr/bin/env node
/**
 * Build 12 retro: a test User-Agent once carried the founder's email to Wikipedia.
 * Fails when a personal email address appears in code that builds outbound requests or test traffic:
 * User-Agent / From headers, fetch/axios options, fixtures under test/ and scripts/.
 *
 * Allowed: example.com / example.org / test domains, noreply addresses, and the project contact
 * role addresses in ROLE (product mailboxes, not people), plus OMEN_CONTACT_ALLOW (comma list).
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const DIRS = ["src", "test", "scripts", "evals", "warehouse", "crates"];
const EXT = /\.(js|mjs|cjs|ts|py|rs|json|sh)$/;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const SAFE =
  /@(example\.(com|org|net)|[a-z0-9.-]*\.test|[a-z0-9.-]*\.invalid|localhost)$|^(no-?reply|noreply|test|user|demo)@/i;
const OUTBOUND = /user-agent|\bfrom\b\s*:|fetch\(|axios|headers|reqwest|requests\./i;
const ROLE = ["hello@slopssaloon.com", "reports@slopssaloon.com"];
const allow = new Set([
  ...ROLE,
  ...(process.env.OMEN_CONTACT_ALLOW || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
]);

function* walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === "target" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (EXT.test(e.name)) yield p;
  }
}

const findings = [];
for (const d of DIRS) {
  for (const file of walk(path.join(ROOT, d))) {
    if (file === __filename) continue;
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      const window = lines.slice(Math.max(0, i - 3), i + 4).join("\n");
      for (const addr of line.match(EMAIL) || []) {
        if (SAFE.test(addr) || allow.has(addr.toLowerCase())) continue;
        if (!OUTBOUND.test(window)) continue;
        findings.push(`${path.relative(ROOT, file)}:${i + 1}  ${addr.replace(/^(.).*@/, "$1***@")}`);
      }
    });
  }
}

if (findings.length) {
  console.error("Personal email near outbound request code (never send personal data to third parties):");
  for (const f of findings) console.error("  " + f);
  process.exit(1);
}
console.log("no-pii-outbound: no personal email addresses near outbound request code");
