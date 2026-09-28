#!/usr/bin/env node
/**
 * Validate that the production readiness checklist remains source-backed.
 * This is local and read-only; it never contacts a database or fleet host.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checklistPath = path.join(root, "Blueprints/playbooks/production-readiness-checklist.md");
const checklist = fs.readFileSync(checklistPath, "utf8");
const required = [
  "sql/2026-09-28_provider_connection_state_execution_review.md",
  "sql/2026-09-28_provider_connection_state_rollback_review.md",
  "scripts/validate-command-center-artifacts.js",
  "Blueprints/handoffs/2026-09-28-native-provider-recovery-verification.md",
  "probo.yaml",
];
const errors = [];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) errors.push(`missing evidence source: ${relative}`);
  if (!checklist.includes(relative)) errors.push(`checklist does not cite: ${relative}`);
}
for (const phrase of [
  "Approval boundary",
  "mandatory stop conditions",
  "unchanged row count",
  "strict host-key checking",
  "reconnect_required",
  "temporarily_unavailable",
  "not ready",
]) {
  if (!checklist.includes(phrase)) errors.push(`missing required gate language: ${phrase}`);
}
if (!checklist.includes("never an automatic operator response")) {
  errors.push("rollback must remain separately approved");
}
if (errors.length) {
  console.error(`Production readiness checklist invalid:\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Production readiness checklist valid: approval, migration, fleet, and native gates are source-backed");
}
