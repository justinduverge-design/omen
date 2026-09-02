#!/usr/bin/env node
/**
 * The read order lives in two places by design — CLAUDE.md is what an agent
 * reads on arrival, kickoff-l2.md is what gets pasted to start a session.
 * They are one contract. This fails when they stop agreeing.
 *
 * It compares the ordered list of file paths each one tells an agent to read.
 * Prose, numbering style, and commentary are ignored; only the sequence of
 * paths matters, because that is the part an agent acts on.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLAUDE = path.join(ROOT, 'CLAUDE.md');
const KICKOFF = path.join(ROOT, 'Blueprints/prompts/kickoff-l2.md');

// A path token: something.md, or a directory reference we care about.
const PATH_RE = /`?([A-Za-z0-9_./-]+\.md)`?/g;

function section(file, startRe, endRe) {
  const text = fs.readFileSync(file, 'utf8');
  const start = text.search(startRe);
  if (start === -1) return null;
  const rest = text.slice(start);
  const end = rest.search(endRe);
  return end === -1 ? rest : rest.slice(0, end);
}

function paths(block) {
  if (!block) return null;
  const out = [];
  for (const line of block.split('\n')) {
    // Only numbered read-order lines.
    if (!/^\s*\d+\.\s/.test(line)) continue;
    const m = line.match(PATH_RE);
    if (m) out.push(m[0].replace(/`/g, ''));
  }
  return out;
}

const claudeBlock = section(CLAUDE, /## Read in order before pulling a task/, /\n## Reads on demand/);
const kickoffBlock = section(KICKOFF, /ALWAYS-READ CORE/, /\nThen run, in order:/);

const a = paths(claudeBlock);
const b = paths(kickoffBlock);

const problems = [];
if (!a) problems.push('CLAUDE.md: could not find the "Read in order before pulling a task" section.');
if (!b) problems.push('kickoff-l2.md: could not find the "ALWAYS-READ CORE" read order.');

if (a && b) {
  if (a.length !== b.length) {
    problems.push(`Read order length differs: CLAUDE.md has ${a.length}, kickoff-l2.md has ${b.length}.`);
  }
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      problems.push(`Position ${i + 1}: CLAUDE.md says "${a[i] ?? '(nothing)'}", kickoff-l2.md says "${b[i] ?? '(nothing)'}".`);
    }
  }
}

if (problems.length) {
  console.error('Kickoff drift — the agent docs and the kickoff prompt disagree about what to read.\n');
  for (const p of problems) console.error('  ✗ ' + p);
  console.error('\nThese two are one contract. Fix both, not one.');
  process.exit(1);
}

console.log(`Kickoff read order matches across CLAUDE.md and kickoff-l2.md (${a.length} entries).`);
console.log('\nWhat this does NOT check:');
console.log('  · whether the listed files exist (see check-sprint-staleness.js for path rot)');
console.log('  · whether the read order is the right one — that is a founder decision');
console.log('  · the L0 kickoff, which lives in the Slops-OS repo');
