import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathsIgnore, globToRegExp, deployingFiles, prBody } from '../scripts/release-pr.mjs';

const globs = pathsIgnore(readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8'));

test('reads the real deploy.yml paths-ignore list', () => {
  assert.ok(globs.includes('**/*.md'));
  assert.ok(globs.includes('Direction/**'));
  assert.ok(globs.includes('.github/workflows/**'));
});

test('globs follow GitHub filter rules', () => {
  assert.ok(globToRegExp('**/*.md').test('README.md'));
  assert.ok(globToRegExp('**/*.md').test('a/b/c.md'));
  assert.ok(globToRegExp('crates/**').test('crates/x/src/lib.rs'));
  assert.ok(!globToRegExp('crates/**').test('src/crates.js'));
  assert.ok(!globToRegExp('*.md').test('a/b.md'));
  assert.ok(globToRegExp('uv.lock').test('uv.lock'));
  assert.ok(!globToRegExp('uv.lock').test('uvXlock'));
});

test('docs-only and tests-only changes do not open a release; code does', () => {
  assert.deepEqual(deployingFiles(['README.md', 'Direction/a.md', 'Blueprints/x.png', 'test/a.test.js'], globs), []);
  assert.deepEqual(deployingFiles(['README.md', 'src/server.js', 'test/a.test.js'], globs), ['src/server.js']);
});

test('the body says to merge with a merge commit and caps the list', () => {
  const commits = Array.from({ length: 70 }, (_, i) => `abc${i} change ${i}`);
  const body = prBody(commits, 3);
  assert.match(body, /Create a merge commit/);
  assert.match(body, /and 10 more/);
  assert.equal(body.split('\n').filter((l) => l.startsWith('- abc')).length, 60);
});

test('a deploy.yml without paths-ignore fails loudly', () => {
  assert.throws(() => pathsIgnore('on:\n  push:\n    branches: [production]\n'), /no paths-ignore/);
});
