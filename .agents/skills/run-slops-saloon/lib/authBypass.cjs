/**
 * authBypass.cjs
 *
 * Shared auth-bypass primitives for QA'ing PROTECTED (auth-gated) routes
 * without a real Supabase account, a real backend, or any network call.
 *
 * Extracted and generalized from driver_espn_recovery.cjs, which proved this
 * technique against the /account ESPN-recovery flow (see that file's own
 * comment header for the original narrow version). This module is the
 * reusable version any driver can call for ANY protected route.
 *
 * How it works:
 *   1. Vite is spawned with fake VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 *      (buildViteEnv()) so frontend/src/lib/supabase.js builds a real
 *      (non-stub) Supabase client — just one pointed at a URL that's never
 *      actually reachable or needed.
 *   2. Before page.goto(), setupAuthenticatedPage() uses Playwright's
 *      page.addInitScript() to pre-seed localStorage with:
 *        - a fake-but-valid-shaped Supabase v2 session, so
 *          ProtectedRoute.jsx's supabase.auth.getSession() resolves
 *          synchronously from localStorage with zero network call
 *          (session.expires_at is 2 hours out, so the client never
 *          attempts a token refresh);
 *        - omen.onboarding.done = 'true', so ProtectedRoute.jsx's second
 *          gate (redirect to /onboarding until this flag is set) doesn't
 *          divert the driver away from the target route. The original
 *          ESPN-recovery driver never needed this because /account happens
 *          to be reachable either way in that flow; every other protected
 *          route (/waiver, /football, /standings, /ledger, /omen) needs it.
 *   3. registerApiMocks() intercepts whatever /api/* endpoints the target
 *      page fetches, since there's still no real backend running.
 *
 * ProtectedRoute.jsx's other check — apiFetch('/api/session') — fails
 * silently on a .catch() when there's no backend, so it does not need to be
 * mocked for the auth gate itself to pass; only page-specific data fetches do.
 */

"use strict";

// ── Fake Supabase config ────────────────────────────────────────────────────
// Storage key format is sb-${new URL(url).hostname.split('.')[0]}-auth-token
// per @supabase/supabase-js v2 — verified against the installed version in
// frontend/node_modules/@supabase/auth-js.

const FAKE_SUPABASE_URL = "http://localhost:54321";
const FAKE_SUPABASE_ANON_KEY = "fake-anon-key-for-qa-driver";
const SUPABASE_STORAGE_KEY = "sb-localhost-auth-token";

/**
 * Vite env vars to spawn the dev server with so the Supabase client
 * initializes for real (not the stub used when VITE_SUPABASE_URL is unset).
 *
 * @param {Record<string,string>} [overrides] - extra/overriding env vars
 *        (e.g. { VITE_ESPN_ENABLED: 'false' })
 */
function buildViteEnv(overrides = {}) {
  return {
    ...process.env,
    VITE_SUPABASE_URL: FAKE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: FAKE_SUPABASE_ANON_KEY,
    ...overrides,
  };
}

/**
 * Builds a fake-but-valid-shaped Supabase v2 session object. expires_at is
 * 2 hours in the future so the client treats it as valid and returns it
 * directly from localStorage without attempting a network refresh.
 *
 * @param {object} [overrides] - shallow-merged into the top-level session;
 *        pass { user: {...} } to override user fields.
 */
function buildFakeSession(overrides = {}) {
  return {
    access_token: "qa-fake-access-token",
    refresh_token: "qa-fake-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 7200,
    expires_in: 7200,
    token_type: "bearer",
    user: {
      id: "qa-user-00000000-0000-0000-0000-000000000000",
      aud: "authenticated",
      email: "qa@omen.test",
      role: "authenticated",
      created_at: "2025-01-01T00:00:00.000Z",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
    },
    ...overrides,
  };
}

/**
 * Prepares a fresh Playwright page for an authenticated visit to a protected
 * route. Must be called BEFORE page.goto().
 *
 * @param {import('playwright-core').Page} page
 * @param {object} [options]
 * @param {object} [options.sessionOverrides] - passed to buildFakeSession()
 * @param {Record<string,string>} [options.extraLocalStorage] - additional
 *        key/value pairs to seed alongside the session and onboarding flag
 *        (e.g. { 'omen.theme.mode': 'system' } — though 'system' is already
 *        the default when no mode key is stored, per themeMode.js).
 * @param {boolean} [options.skipOnboardingSeed] - set true only if the
 *        target route is /onboarding itself.
 */
async function setupAuthenticatedPage(page, options = {}) {
  const {
    sessionOverrides = {},
    extraLocalStorage = {},
    skipOnboardingSeed = false,
  } = options;

  const sessionJson = JSON.stringify(buildFakeSession(sessionOverrides));

  const seeds = {
    [SUPABASE_STORAGE_KEY]: sessionJson,
    ...(skipOnboardingSeed ? {} : { "omen.onboarding.done": "true" }),
    ...extraLocalStorage,
  };

  await page.addInitScript((values) => {
    for (const [key, value] of Object.entries(values)) {
      localStorage.setItem(key, value);
    }
  }, seeds);

  // Belt-and-suspenders fallback for any token-refresh call the client
  // still makes against the fake Supabase URL.
  await page.route(`${FAKE_SUPABASE_URL}/**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: sessionJson,
    });
  });
}

/**
 * Registers page.route() mocks for a table of endpoint patterns.
 * Generalizes the single hardcoded /api/platforms/status mock in
 * driver_espn_recovery.cjs into a reusable primitive any route config can use.
 *
 * @param {import('playwright-core').Page} page
 * @param {Array<{pattern: string, status?: number, body: object|string, method?: string}>} mocks
 *        `pattern` is a Playwright glob, e.g. "**\/api/optimizer/waiver*".
 */
async function registerApiMocks(page, mocks = []) {
  for (const mock of mocks) {
    const { pattern, status = 200, body, method } = mock;
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    await page.route(pattern, (route) => {
      if (method && route.request().method() !== method) {
        return route.continue();
      }
      route.fulfill({
        status,
        contentType: "application/json",
        body: bodyStr,
      });
    });
  }
}

module.exports = {
  FAKE_SUPABASE_URL,
  FAKE_SUPABASE_ANON_KEY,
  SUPABASE_STORAGE_KEY,
  buildViteEnv,
  buildFakeSession,
  setupAuthenticatedPage,
  registerApiMocks,
};
