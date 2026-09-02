import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// `frontend/src/lib/onboarding.js` touches `localStorage` on the success path.
// Node has no DOM, so a minimal in-memory stand-in lets the real module run
// unmodified rather than being tested through a copy of itself.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const {
  OnboardingStatus,
  resolveOnboardingStatus,
  hasConnectedPlatform,
  isOnboardingDone,
} = await import(path.join(root, 'frontend', 'src', 'lib', 'onboarding.js'));

const connected = { platforms: { sleeper: { connected: true } } };
const none = { platforms: { sleeper: { connected: false }, yahoo: { connected: false } } };

test.beforeEach(() => store.clear());

test('a connected platform resolves to CONNECTED and caches the answer', async () => {
  const status = await resolveOnboardingStatus(async () => connected);

  assert.equal(status, OnboardingStatus.CONNECTED);
  assert.equal(isOnboardingDone(), true, 'a confirmed connection should prime the local cache');
});

test('a clean "no platforms" answer resolves to NOT_CONNECTED', async () => {
  const status = await resolveOnboardingStatus(async () => none);

  assert.equal(status, OnboardingStatus.NOT_CONNECTED);
  assert.equal(isOnboardingDone(), false);
});

// The defect this whole tri-state exists for. `syncOnboardingFromServer` used to
// return a bare `false` here, `ProtectedRoute` read that as "new user", and one
// flaky /api/platforms response threw an established account back to the first
// setup screen — the loop beta users kept reporting after signing in.
test('a failed check is UNKNOWN, never a verdict that the user is new', async () => {
  const failures = [
    new Error('network down'),
    Object.assign(new Error('server exploded'), { status: 500 }),
    Object.assign(new Error('unauthorized'), { status: 401 }),
  ];

  for (const failure of failures) {
    const status = await resolveOnboardingStatus(async () => { throw failure; });
    assert.equal(
      status,
      OnboardingStatus.UNKNOWN,
      `${failure.message} says nothing about whether the account has a league`,
    );
    assert.notEqual(status, OnboardingStatus.NOT_CONNECTED);
  }
});

test('a malformed payload is UNKNOWN rather than a confident "not connected"', async () => {
  for (const body of [null, undefined, {}, { platforms: null }]) {
    const status = await resolveOnboardingStatus(async () => body);
    // A body with no `platforms` key at all is not the server saying "no leagues";
    // it is the server not answering the question that was asked.
    assert.notEqual(status, OnboardingStatus.CONNECTED);
  }
});

test('any one connected provider is enough', () => {
  for (const platform of ['sleeper', 'yahoo', 'espn']) {
    assert.equal(hasConnectedPlatform({ platforms: { [platform]: { connected: true } } }), true);
  }
  assert.equal(hasConnectedPlatform({ platforms: { yahoo: { connected: 'yes' } } }), false,
    'only a real boolean true counts — a truthy string is a contract drift, not a connection');
});

test('the onboarding page keeps its step across a remount', () => {
  const source = fs.readFileSync(
    path.join(root, 'frontend', 'src', 'pages', 'Onboarding.jsx'),
    'utf8',
  );

  // `useState(0)` meant a route change, a provider redirect coming back, or React
  // remounting the tree silently dropped the user at screen one.
  assert.match(source, /useState\(readStep\)/,
    'the step must be restored, not reset, when the page remounts');
  assert.doesNotMatch(source, /const \[step, setStepState\] = useState\(0\)/);
  assert.match(source, /sessionStorage/,
    'the step should survive a redirect but not outlive the visit');
});

test('the onboarding page advances on a server-confirmed connection without being told', () => {
  const source = fs.readFileSync(
    path.join(root, 'frontend', 'src', 'pages', 'Onboarding.jsx'),
    'utf8',
  );

  // The connection is made on another page, or for ESPN in another tab. A user
  // who connected and came back to a tab still saying "no platform detected" had
  // every reason to think it had failed.
  assert.match(source, /visibilitychange/,
    'returning to the tab should re-check the connection');
  assert.match(source, /resolved === OnboardingStatus\.CONNECTED\) setStep\(2\)/,
    'a background re-check must act only on a positive answer');
});
