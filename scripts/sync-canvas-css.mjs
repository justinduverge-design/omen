#!/usr/bin/env node
/**
 * Every artboard in a design canvas carries the same stylesheet inline, so that opening one file
 * in a browser renders it with no build step, no sibling fetch, and no server. That is the whole
 * point of the `.dc.html` convention and it is worth keeping: a relative <link> breaks the moment
 * an artboard is previewed from a data: URL, mailed, or opened from a zip.
 *
 * The cost of that choice is N copies of the same CSS, which drift. This script removes the cost
 * without giving up the property: `_shared.css` is the single source, every artboard's <style>
 * block is generated from it, and --check proves they still agree.
 *
 *   node scripts/sync-canvas-css.mjs <canvas-dir>            write _shared.css into every artboard
 *   node scripts/sync-canvas-css.mjs <canvas-dir> --check    exit 1 if any artboard has drifted
 *
 * --check is the gate. Editing CSS inside an artboard is the mistake it exists to catch.
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const check = process.argv.includes('--check');
if (!dir) { console.error('usage: sync-canvas-css.mjs <canvas-dir> [--check]'); process.exit(2); }

const sharedPath = path.join(dir, '_shared.css');
if (!fs.existsSync(sharedPath)) { console.error(`no _shared.css in ${dir}`); process.exit(2); }
const shared = fs.readFileSync(sharedPath, 'utf8').trim();

const boards = fs.readdirSync(dir).filter(f => f.endsWith('.dc.html')).sort();
if (!boards.length) { console.error(`no .dc.html artboards in ${dir}`); process.exit(2); }

const drifted = [];
const missing = [];
let written = 0;

for (const f of boards) {
  const p = path.join(dir, f);
  let src = fs.readFileSync(p, 'utf8');
  const m = src.match(/<style>([\s\S]*?)<\/style>/);

  if (!m) { missing.push(f); continue; }
  if (m[1].trim() === shared) continue;

  if (check) { drifted.push(f); continue; }
  src = src.slice(0, m.index) + `<style>\n${shared}\n</style>` + src.slice(m.index + m[0].length);
  fs.writeFileSync(p, src);
  written++;
}

if (check) {
  if (drifted.length || missing.length) {
    for (const f of drifted) console.error(`DRIFTED  ${f} — its <style> differs from _shared.css`);
    for (const f of missing) console.error(`NO STYLE ${f} — artboards must carry the shared block inline`);
    console.error(`\n${drifted.length + missing.length} of ${boards.length} artboards out of sync.`);
    console.error('Fix by editing _shared.css and re-running without --check. Never edit CSS in an artboard.');
    process.exit(1);
  }
  console.log(`canvas css parity: OK (${boards.length} artboards match _shared.css).`);
  console.log('\nWhat this does NOT check:');
  console.log('  · whether the CSS is correct — that is OmenColorContrastTest and the registry');
  console.log('  · artboard BODY markup, which is per-screen by design');
  console.log('  · that a class used in an artboard exists in the stylesheet');
} else {
  console.log(`synced ${written} artboard(s) from _shared.css; ${boards.length - written - missing.length} already current.`);
  if (missing.length) { for (const f of missing) console.error(`NO STYLE ${f} — add an empty <style></style> block`); process.exit(1); }
}
