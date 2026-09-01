import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

// The frontend libs under test touch `localStorage` and `window.location.origin`.
// Stub both before importing, the same way `omenSignalLabels.test.mjs` isolates
// browser-facing helpers from the backend test runner.
function installBrowserStubs(initial = {}) {
  const store = new Map(Object.entries(initial));
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  globalThis.window = { location: { origin: 'https://slopssaloon.com' } };
  return store;
}

const nextUrl = () => import('../frontend/src/lib/nextUrl.js?' + Math.random());
const onboarding = () => import('../frontend/src/lib/onboarding.js?' + Math.random());

test('finishing connect with no stored next lands on /football, not /account', async () => {
  installBrowserStubs();
  const { consumeConnectDestination } = await nextUrl();
  assert.equal(consumeConnectDestination(), '/football');
});

test('finishing connect does not bounce back to the page the user just completed', async () => {
  // ConnectLeague stores '/account/connect' when a signed-out visitor hits it,
  // so honoring the stored next verbatim returns the user to the connect page.
  installBrowserStubs({ 'omen.auth.next': '/account/connect' });
  const { consumeConnectDestination } = await nextUrl();
  assert.equal(consumeConnectDestination(), '/football');
});

test('finishing connect still honors a real stored destination', async () => {
  installBrowserStubs({ 'omen.auth.next': '/omen' });
  const { consumeConnectDestination } = await nextUrl();
  assert.equal(consumeConnectDestination(), '/omen');
});

test('the stored next is cleared once consumed', async () => {
  const store = installBrowserStubs({ 'omen.auth.next': '/omen' });
  const { consumeConnectDestination } = await nextUrl();
  consumeConnectDestination();
  assert.equal(store.has('omen.auth.next'), false);
});

test('consumeNextUrl keeps its /account default for callers that did not opt in', async () => {
  installBrowserStubs();
  const { consumeNextUrl } = await nextUrl();
  assert.equal(consumeNextUrl(), '/account');
});

test('an off-origin or disallowed stored next cannot survive the connect exit', async () => {
  installBrowserStubs({ 'omen.auth.next': 'https://evil.example/steal' });
  const { consumeConnectDestination } = await nextUrl();
  assert.equal(consumeConnectDestination(), '/football');
});

test('a fresh browser with a server-side connection is treated as onboarded', async () => {
  installBrowserStubs();
  const { syncOnboardingFromServer, isOnboardingDone } = await onboarding();
  assert.equal(isOnboardingDone(), false, 'precondition: nothing in storage');

  const done = await syncOnboardingFromServer(async () => ({
    platforms: { sleeper: { connected: true }, yahoo: { connected: false } },
  }));

  assert.equal(done, true);
  assert.equal(isOnboardingDone(), true, 'the flag is hydrated from the server, not only from a local click');
});

test('a fresh browser with no connection still onboards', async () => {
  installBrowserStubs();
  const { syncOnboardingFromServer, isOnboardingDone } = await onboarding();
  const done = await syncOnboardingFromServer(async () => ({
    platforms: { sleeper: { connected: false } },
  }));
  assert.equal(done, false);
  assert.equal(isOnboardingDone(), false);
});

test('a failed platform check does not silently mark onboarding complete', async () => {
  installBrowserStubs();
  const { syncOnboardingFromServer, isOnboardingDone } = await onboarding();
  const done = await syncOnboardingFromServer(async () => { throw new Error('offline'); });
  assert.equal(done, false);
  assert.equal(isOnboardingDone(), false);
});

test('the legacy corvus onboarding flag is still honored', async () => {
  installBrowserStubs({ 'corvus.onboarding.done': 'true' });
  const { isOnboardingDone } = await onboarding();
  assert.equal(isOnboardingDone(), true);
});

test('the onboarding gate consults the server before sending an established user back through setup', () => {
  const protectedRoute = read('frontend', 'src', 'components', 'layout', 'ProtectedRoute.jsx');
  assert.match(protectedRoute, /resolveOnboardingStatus/,
    'ProtectedRoute must hydrate onboarding state from /api/platforms, not from localStorage alone');
  // The gate must redirect on a CONFIRMED "no league", never on a failed check.
  // It used to test a bare boolean that was false for both, so one flaky
  // /api/platforms response threw an established user back to setup.
  assert.match(protectedRoute, /onboarding === OnboardingStatus\.NOT_CONNECTED/,
    'only a confirmed not-connected answer may redirect to onboarding');
  assert.doesNotMatch(protectedRoute, /localStorage\.getItem\('(omen|corvus)\.onboarding\.done'\)/,
    'the gate must go through the shared onboarding helper so every reader agrees');
});

test('connect exits route through the shared helpers', () => {
  const connectLeague = read('frontend', 'src', 'pages', 'ConnectLeague.jsx');
  assert.match(connectLeague, /consumeConnectDestination/,
    'Continue must use the connect-aware destination resolver');
  assert.doesNotMatch(connectLeague, /localStorage\.setItem\('omen\.onboarding\.done'/,
    'onboarding completion belongs to the shared helper, not an inline write');
});
