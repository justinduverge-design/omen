#!/usr/bin/env node
// Prints what an Omen session reads before work starts, and fails if the map is over budget.
// Read-only. The always-loaded set is CLAUDE.md, AGENTS.md and the numbered read list in CLAUDE.md.
//   node scripts/harness-cost.js [--json]
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MAP = 'Direction/map.md';
const MAP_BUDGET_TOKENS = 2000; // the map alone
const TOTAL_BUDGET_TOKENS = 10000; // always-loaded set (the ~10k target; baseline was ~92k on 2026-10-03)
const tokens = (bytes) => Math.ceil(bytes / 4); // rough: 4 bytes per token

const claude = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
const m = claude.match(/## Read in order before pulling a task([\s\S]*?)(?:\n## |$)/);
const listed = [];
for (const line of (m ? m[1] : '').split('\n')) {
  if (!/^\s*\d+\.\s/.test(line)) continue;
  const p = line.match(/`?([A-Za-z0-9_./-]+\.md)`?/);
  if (p) listed.push(p[1]);
}
const files = ['CLAUDE.md', 'AGENTS.md', ...listed.filter((f) => f !== 'AGENTS.md')];
const codexExtra = ['AGENT.md']; // Codex also reads this; reported separately, not in the Claude total
const rows = files.map((f) => {
  const full = path.join(ROOT, f);
  const bytes = fs.existsSync(full) ? fs.statSync(full).size : 0;
  return { file: f, bytes, tokens: tokens(bytes), missing: !fs.existsSync(full) };
});
const total = rows.reduce((s, r) => s + r.tokens, 0);
const mapRow = rows.find((r) => r.file === MAP);

const problems = [];
if (!m) problems.push('CLAUDE.md: could not find "Read in order before pulling a task".');
if (!mapRow) problems.push(`${MAP} is not in the read list.`);
else if (mapRow.tokens > MAP_BUDGET_TOKENS) problems.push(`${MAP} is ~${mapRow.tokens} tokens, budget ${MAP_BUDGET_TOKENS}.`);
if (total > TOTAL_BUDGET_TOKENS) problems.push(`Always-loaded set is ~${total} tokens, budget ${TOTAL_BUDGET_TOKENS}.`);
for (const r of rows) if (r.missing) problems.push(`Listed but missing: ${r.file}`);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ rows, total, problems }, null, 2));
} else {
  for (const r of rows) console.log(`${String(r.tokens).padStart(7)} tok  ${String(r.bytes).padStart(7)} B  ${r.file}${r.missing ? '  (MISSING)' : ''}`);
  for (const f of codexExtra) {
    const b = fs.existsSync(path.join(ROOT, f)) ? fs.statSync(path.join(ROOT, f)).size : 0;
    console.log(`${String(tokens(b)).padStart(7)} tok  ${String(b).padStart(7)} B  ${f}  (Codex only, not in the total)`);
  }
  console.log(`${String(total).padStart(7)} tok  total always-loaded (budget ${TOTAL_BUDGET_TOKENS}; was ~92,000 on 2026-10-03)`);
  console.log('Coverage: the files above only. Not counted: parent-layer CLAUDE.md/AGENTS.md (Slops-OS, slops-saloon), MEMORY.md, task-specific reads, skill descriptions, plugin listings.');
  for (const p of problems) console.log(`FAIL  ${p}`);
}
process.exit(problems.length ? 1 : 0);
