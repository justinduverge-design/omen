#!/usr/bin/env node
"use strict";

/**
 * Renders the provider capability matrix as markdown.
 *
 *   node scripts/generate-provider-matrix.js          write the view
 *   node scripts/generate-provider-matrix.js --check  exit 1 if the committed view is stale
 *
 * The JSON is canonical. The view is generated and never edited by hand.
 */

const fs = require("node:fs");
const path = require("node:path");

const DIR = path.join(__dirname, "..", "Blueprints", "specs", "football-data");
const JSON_PATH = path.join(DIR, "provider-capability-matrix.json");
const VIEW_PATH = path.join(DIR, "provider-capability-matrix.md");
const PROVIDERS = ["sleeper", "espn", "yahoo"];

function cell(entry) {
  return entry.reason ? `${entry.status} (${entry.reason})` : entry.status;
}

function render(matrix) {
  const entries = matrix.entries;
  const capabilities = [...new Set(entries.map((entry) => entry.capability))];
  const find = (provider, capability) =>
    entries.find((entry) => entry.provider === provider && entry.capability === capability);
  const lines = [];
  lines.push("# Provider capability matrix");
  lines.push("");
  lines.push("<!-- GENERATED from provider-capability-matrix.json by scripts/generate-provider-matrix.js. Do not edit. -->");
  lines.push("");
  lines.push(`As of ${matrix.as_of}. ${matrix.note}`);
  lines.push("");
  lines.push(matrix.founder_vocabulary);
  lines.push("");
  lines.push("## Status");
  lines.push("");
  lines.push(`| ${["Capability", ...PROVIDERS].join(" | ")} |`);
  lines.push(`|${["---", ...PROVIDERS.map(() => "---")].join("|")}|`);
  for (const capability of capabilities) {
    lines.push(`| ${[capability, ...PROVIDERS.map((provider) => cell(find(provider, capability)))].join(" | ")} |`);
  }
  lines.push("");
  lines.push("## Everything that is not plainly available");
  lines.push("");
  lines.push("| Provider | Capability | Status | Reason | Detail | Verified |");
  lines.push("|---|---|---|---|---|---|");
  for (const entry of entries.filter((item) => item.status !== "available")) {
    const verified = entry.last_verified ? `${entry.last_verified} (${entry.verification})` : "never";
    lines.push(`| ${entry.provider} | ${entry.capability} | ${entry.status} | ${entry.reason} | ${entry.detail} | ${verified} |`);
  }
  lines.push("");
  lines.push("## Provider data Omen receives or could receive but does not read");
  lines.push("");
  lines.push(matrix.surface_note);
  lines.push("");
  lines.push("| Provider | Field | Seen | Opportunity | Value | Needs |");
  lines.push("|---|---|---|---|---|---|");
  for (const item of matrix.unused_surface) {
    lines.push(`| ${item.provider} | ${item.field} | ${item.kind} | ${item.opportunity} | ${item.value} | ${item.needs} |`);
  }
  lines.push("");
  lines.push("## Vocabulary");
  lines.push("");
  for (const [name, text] of Object.entries(matrix.statuses)) lines.push(`- **${name}**: ${text}`);
  lines.push("");
  for (const [name, text] of Object.entries(matrix.reason_codes)) lines.push(`- \`${name}\`: ${text}`);
  lines.push("");
  for (const [name, text] of Object.entries(matrix.verification)) lines.push(`- verification \`${name}\`: ${text}`);
  lines.push("");
  return lines.join("\n");
}

function main() {
  const matrix = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const view = render(matrix);
  if (process.argv.includes("--check")) {
    const current = fs.existsSync(VIEW_PATH) ? fs.readFileSync(VIEW_PATH, "utf8") : "";
    if (current !== view) {
      console.error("provider-capability-matrix.md is stale. Run: node scripts/generate-provider-matrix.js");
      process.exit(1);
    }
    console.log("provider-capability-matrix.md is current");
    return;
  }
  fs.writeFileSync(VIEW_PATH, view);
  console.log(`wrote ${path.relative(process.cwd(), VIEW_PATH)}`);
}

if (require.main === module) main();

module.exports = { render, JSON_PATH, VIEW_PATH, PROVIDERS };
