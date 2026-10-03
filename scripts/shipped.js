#!/usr/bin/env node
// Regenerates Direction/shipped.md: what has merged and what is open, grouped by area, from GitHub.
// Read-only against GitHub; writes only Direction/shipped.md. Needs an authenticated `gh`.
//   node scripts/shipped.js [--since YYYY-MM-DD] [--stdout]
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const sinceIdx = args.indexOf('--since');
const since = sinceIdx >= 0 ? args[sinceIdx + 1] : '2026-08-01';
if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) {
  console.error('--since needs YYYY-MM-DD');
  process.exit(2);
}

// First match wins, so the specific areas sit above the broad ones.
const AREAS = [
  ['League Office (retired 2026-10-02)', /league.?office/i],
  ['Identity and accounts', /identity|account|sign.?in|onboarding|waitlist/i],
  ['Performance and background jobs', /^perf\b|\bcron\b|cache|worker|latency/i],
  ['Football data', /football intelligence|football-data|projection|nflverse|adp|scoring/i],
  ['Database', /^db\b|database|migration|supabase|\brls\b|redo step|vault|erase|erasure/i],
  ['Security', /^security\b|security|credential|cookie|token leak/i],
  ['Native iOS', /^ios\b|swiftui|\bios\b|xcode|testflight|native/i],
  ['Native Android', /android|kotlin|compose|play console/i],
  ['Trade Analyzer', /trade/i],
  ['Providers (ESPN / Yahoo / Sleeper)', /espn|yahoo|sleeper|provider/i],
  ['Omen of the Week / Moves', /omen of the week|\bmoves?\b|start\/sit|waiver|ledger/i],
  ['Docs and process', /^docs?\b|docs?:|handoff|decision log|runbook|playbook|sprint/i],
  ['CI and tooling', /^chore\b|^ci\b|workflow|eslint|dependabot|deps|lint|test baseline/i],
  ['Web app', /web|frontend|client|css/i],
];
const areaOf = (title) => (AREAS.find(([, re]) => re.test(title)) || ['Other'])[0];

const gh = (a) => execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const merged = JSON.parse(
  gh(['pr', 'list', '--state', 'merged', '--limit', '1000', '--json', 'number,title,mergedAt'])
).filter((p) => p.mergedAt.slice(0, 10) >= since);
const open = JSON.parse(
  gh(['pr', 'list', '--state', 'open', '--limit', '200', '--json', 'number,title,isDraft,createdAt'])
);

const group = (list) => {
  const m = new Map();
  for (const p of list) {
    const a = areaOf(p.title);
    if (!m.has(a)) m.set(a, []);
    m.get(a).push(p);
  }
  return [...m.entries()].sort((x, y) => y[1].length - x[1].length);
};

const clean = (t) => t.replace(/\s+/g, ' ').replace(/\|/g, '/').trim();
const out = [];
out.push('# Shipped and in flight');
out.push('');
out.push(
  `Generated ${new Date().toISOString().slice(0, 10)} from GitHub by \`node scripts/shipped.js\`. ` +
    `Merged PRs since ${since}: **${merged.length}**. Open: **${open.length}**. ` +
    'Do not edit by hand; rerun the script. Not part of the startup read.'
);
out.push('');
out.push('## Open now');
out.push('');
if (!open.length) out.push('Nothing open.');
for (const p of open.sort((a, b) => a.number - b.number)) {
  out.push(`- #${p.number}${p.isDraft ? ' (draft)' : ''} ${clean(p.title)}`);
}
out.push('');
out.push('## Shipped by area');
out.push('');
out.push('| Area | Merged |');
out.push('|---|---|');
const grouped = group(merged);
for (const [a, l] of grouped) out.push(`| ${a} | ${l.length} |`);
for (const [a, l] of grouped) {
  out.push('');
  out.push(`### ${a} (${l.length})`);
  out.push('');
  for (const p of l.sort((x, y) => y.mergedAt.localeCompare(x.mergedAt))) {
    out.push(`- ${p.mergedAt.slice(0, 10)} #${p.number} ${clean(p.title)}`);
  }
}
out.push('');

const text = out.join('\n');
if (flag('--stdout')) process.stdout.write(text);
else {
  const dest = path.join(__dirname, '..', 'Direction', 'shipped.md');
  fs.writeFileSync(dest, text);
  console.log(`wrote ${dest} (${merged.length} merged, ${open.length} open)`);
}
