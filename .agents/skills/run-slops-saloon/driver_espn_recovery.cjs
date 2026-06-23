/**
 * driver_espn_recovery.cjs
 *
 * QA driver for the ESPN recovery Account page flow.
 * Tests 7 states across the reconnect journey:
 *   1. Disconnected ESPN + recovery banner
 *   2. Connected ESPN + reauth_required → Reconnect ESPN button visible
 *   3. Reconnect form opens after clicking "Reconnect ESPN"
 *   4. Successful reconnect → "Return to Omen →" link
 *   5–7. Other ESPN recovery states (league_context_missing, import_blocked, recovery_needed)
 *
 * No .env or live backend needed.
 * - /api/platforms/status and /api/platforms/espn/connect are intercepted with page.route().
 * - Supabase auth is bypassed via localStorage injection (addInitScript) + route mock fallback.
 *
 * Supabase auth strategy:
 *   Vite is spawned with VITE_SUPABASE_URL=http://localhost:54321 so the client is
 *   configured (not the stub that always rejects). The storage key for that URL is
 *   "sb-localhost-auth-token" (Supabase v2 derives it from hostname.split('.')[0]).
 *   addInitScript pre-seeds that key with a non-expired fake session before any page
 *   scripts run. page.route() mocks http://localhost:54321/** as a belt-and-suspenders
 *   fallback for any token-refresh call the client still makes.
 *
 * Usage (from project root):
 *   node .claude/skills/run-slops-saloon/driver_espn_recovery.cjs
 *   node .claude/skills/run-slops-saloon/driver_espn_recovery.cjs --skip-build
 *   node .claude/skills/run-slops-saloon/driver_espn_recovery.cjs --port 5174
 */

"use strict";

const { execSync, spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

// ── CLI args ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const portIdx = args.indexOf("--port");
const PORT = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 5173;

const PROJECT_ROOT = path.join(__dirname, "..", "..", "..");
const FRONTEND_DIR = path.join(PROJECT_ROOT, "frontend");
const SCREENSHOT_DIR = path.join(__dirname, "screenshots", "espn-recovery");

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// ── Fake Supabase credentials ──────────────────────────────────────────────────
// We spawn Vite with these so the Supabase client initialises (not the stub).
// The storage key for "http://localhost:54321" is "sb-localhost-auth-token"
// per Supabase v2: sb-${new URL(url).hostname.split('.')[0]}-auth-token

const FAKE_SUPABASE_URL = "http://localhost:54321";
const FAKE_SUPABASE_ANON_KEY = "fake-anon-key-for-qa-driver";
const SUPABASE_STORAGE_KEY = "sb-localhost-auth-token";

// Fake session stored in localStorage — expires_at is 2 hours in the future so
// the client treats it as valid and returns it directly without a network call.
function buildFakeSession() {
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
  };
}

// ── Vite env vars ──────────────────────────────────────────────────────────────

const VITE_ENV = {
  ...process.env,
  VITE_SUPABASE_URL: FAKE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: FAKE_SUPABASE_ANON_KEY,
  VITE_ESPN_ENABLED: "false",
};

// ── Platform status payloads ───────────────────────────────────────────────────

function makeStatus(espnConnected) {
  return {
    yahoo: { connected: false, platform: "yahoo" },
    sleeper: { connected: false, platform: "sleeper", username: null },
    espn: { connected: espnConnected, platform: "espn" },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function waitForPort(port, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      const req = http.get(`http://localhost:${port}/`, (res) => {
        res.destroy();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) {
          return reject(new Error(`Timed out waiting for port ${port}`));
        }
        setTimeout(attempt, 300);
      });
      req.setTimeout(500, () => {
        req.destroy();
        setTimeout(attempt, 300);
      });
    }
    attempt();
  });
}

/**
 * Sets up auth bypass and platform-status mock for a fresh page.
 * Must be called before page.goto().
 *
 * @param {import('playwright-core').Page} page
 * @param {boolean} espnConnected  - value to return from /api/platforms/status
 */
async function setupPage(page, espnConnected) {
  const fakeSession = buildFakeSession();
  const sessionJson = JSON.stringify(fakeSession);
  const storageKey = SUPABASE_STORAGE_KEY;

  // 1. Pre-seed localStorage before any page scripts execute.
  //    Supabase v2 calls setItemAsync(storage, key, JSON.stringify(session)),
  //    so the value stored is already a JSON string.
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: storageKey, value: sessionJson }
  );

  // 2. Mock Supabase auth endpoints — fallback for token-refresh calls.
  await page.route("http://localhost:54321/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: sessionJson,
    });
  });

  // 3. Mock GET /api/platforms/status.
  const statusBody = JSON.stringify(makeStatus(espnConnected));
  await page.route("**/api/platforms/status", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: statusBody,
    });
  });
}

/**
 * Runs named assertions against page content.
 * Each assertion is { label, text } or { label, selector }.
 * Returns true if all pass.
 */
async function runAssertions(page, assertions) {
  let passed = true;
  for (const a of assertions) {
    let count;
    if (a.selector) {
      count = await page.locator(a.selector).count();
    } else {
      // Use getByText for partial match (more robust than text= glob)
      count = await page.getByText(a.text, { exact: false }).count();
    }
    if (count === 0) {
      console.error(`  ✗ MISSING — ${a.label}`);
      passed = false;
    } else {
      console.log(`  ✓ ${a.label}`);
    }
  }
  return passed;
}

async function waitForAccountPage(page) {
  // Wait for the auth gate to clear — the heading appears once checkingSession = false.
  await page.waitForSelector("text=Platform Connections", { timeout: 10000 });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let viteProc = null;
  const results = [];

  try {
    // 1. Optionally build
    if (!skipBuild) {
      console.log("[espn-recovery-qa] Building frontend...");
      execSync("npm run build", {
        cwd: FRONTEND_DIR,
        stdio: "inherit",
        shell: process.platform === "win32",
        env: VITE_ENV,
      });
      console.log("[espn-recovery-qa] Build complete.");
    } else {
      console.log("[espn-recovery-qa] --skip-build: skipping build.");
    }

    // 2. Start Vite dev server with fake Supabase env.
    console.log(`[espn-recovery-qa] Starting Vite on port ${PORT}...`);
    viteProc = spawn("npm", ["run", "dev", "--", "--port", String(PORT)], {
      cwd: FRONTEND_DIR,
      stdio: "pipe",
      shell: process.platform === "win32",
      env: VITE_ENV,
    });
    viteProc.stderr.on("data", (d) => process.stderr.write(d));
    await waitForPort(PORT);
    console.log(`[espn-recovery-qa] Vite ready on http://localhost:${PORT}`);

    // 3. Launch Playwright
    const { chromium } = require(
      path.join(PROJECT_ROOT, "node_modules", "playwright-core")
    );
    const browser = await chromium.launch({ headless: true });

    const BASE_URL = `http://localhost:${PORT}`;

    // ─────────────────────────────────────────────────────────────────────────
    // STATE 1: Disconnected ESPN + recovery banner + connect form
    // Expectation: recovery banner copy + all 3 form fields + "Connect ESPN" button
    // ─────────────────────────────────────────────────────────────────────────
    {
      const id = "1_disconnected_banner";
      console.log(`\n[espn-recovery-qa] ── ${id} ──`);

      const page = await browser.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });
      await setupPage(page, false);

      await page.goto(
        `${BASE_URL}/account?platform=espn&recovery=espn_reauth_required`,
        { waitUntil: "networkidle" }
      );
      await waitForAccountPage(page);

      const passed = await runAssertions(page, [
        {
          text: "Your ESPN session has expired",
          label: "recovery banner copy (reauth_required)",
        },
        { selector: "#espn-s2",        label: "espn_s2 field" },
        { selector: "#espn-swid",      label: "SWID field" },
        { selector: "#espn-league-id", label: "league_id field" },
        { text: "Connect ESPN",        label: "'Connect ESPN' submit button" },
      ]);

      results.push({ state: id, passed });
      const ss = path.join(SCREENSHOT_DIR, `${id}.png`);
      await page.screenshot({ path: ss, fullPage: true });
      console.log(`  → screenshot: ${ss}`);
      await page.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STATE 2: Connected ESPN + reauth_required → "Reconnect ESPN" button
    // Expectation: banner + Connected badge + Reconnect ESPN button; form hidden
    // ─────────────────────────────────────────────────────────────────────────
    {
      const id = "2_connected_reauth_button";
      console.log(`\n[espn-recovery-qa] ── ${id} ──`);

      const page = await browser.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });
      await setupPage(page, true);

      await page.goto(
        `${BASE_URL}/account?platform=espn&recovery=espn_reauth_required`,
        { waitUntil: "networkidle" }
      );
      await waitForAccountPage(page);

      let passed = await runAssertions(page, [
        {
          text: "Your ESPN session has expired",
          label: "recovery banner copy (reauth_required)",
        },
        { text: "Connected", label: "'Connected' badge" },
        { text: "Reconnect ESPN", label: "'Reconnect ESPN' button" },
      ]);

      // Connect form must NOT be visible before clicking Reconnect ESPN
      const formVisible = await page.locator("#espn-s2").count();
      if (formVisible > 0) {
        console.error(
          "  ✗ UNEXPECTED — connect form visible before Reconnect ESPN clicked"
        );
        passed = false;
      } else {
        console.log("  ✓ connect form hidden (correct — not opened yet)");
      }

      results.push({ state: id, passed });
      const ss = path.join(SCREENSHOT_DIR, `${id}.png`);
      await page.screenshot({ path: ss, fullPage: true });
      console.log(`  → screenshot: ${ss}`);
      await page.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STATE 3: Reconnect form opens after clicking "Reconnect ESPN"
    // Expectation: all 3 form fields visible + Cancel button + submit = "Reconnect ESPN"
    // ─────────────────────────────────────────────────────────────────────────
    {
      const id = "3_reconnect_form_open";
      console.log(`\n[espn-recovery-qa] ── ${id} ──`);

      const page = await browser.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });
      await setupPage(page, true);

      await page.goto(
        `${BASE_URL}/account?platform=espn&recovery=espn_reauth_required`,
        { waitUntil: "networkidle" }
      );
      await waitForAccountPage(page);

      // Click "Reconnect ESPN" to open the reconnect form
      await page.locator("button", { hasText: "Reconnect ESPN" }).click();
      await page.waitForTimeout(300);

      let passed = await runAssertions(page, [
        { selector: "#espn-s2",        label: "espn_s2 field" },
        { selector: "#espn-swid",      label: "SWID field" },
        { selector: "#espn-league-id", label: "league_id field" },
        { text: "Cancel",              label: "'Cancel' button" },
      ]);

      // Submit button inside reconnect form is labeled "Reconnect ESPN"
      const submitCount = await page
        .locator("button[type='submit']")
        .filter({ hasText: "Reconnect ESPN" })
        .count();
      if (submitCount === 0) {
        console.error(
          '  ✗ MISSING — submit button labeled "Reconnect ESPN" inside open form'
        );
        passed = false;
      } else {
        console.log('  ✓ submit button labeled "Reconnect ESPN" (reconnect form)');
      }

      results.push({ state: id, passed });
      const ss = path.join(SCREENSHOT_DIR, `${id}.png`);
      await page.screenshot({ path: ss, fullPage: true });
      console.log(`  → screenshot: ${ss}`);
      await page.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STATE 4: Successful reconnect → "ESPN reconnected successfully." + "Return to Omen →"
    // ─────────────────────────────────────────────────────────────────────────
    {
      const id = "4_reconnect_success";
      console.log(`\n[espn-recovery-qa] ── ${id} ──`);

      const page = await browser.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });
      await setupPage(page, true);

      // Mock ESPN connect to succeed
      await page.route("**/api/platforms/espn/connect", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.goto(
        `${BASE_URL}/account?platform=espn&recovery=espn_reauth_required`,
        { waitUntil: "networkidle" }
      );
      await waitForAccountPage(page);

      // Open reconnect form
      await page.locator("button", { hasText: "Reconnect ESPN" }).click();
      await page.waitForTimeout(300);

      // Fill form with fake credentials
      await page.fill("#espn-s2", "fake-espn-s2-cookie-value-for-qa");
      await page.fill(
        "#espn-swid",
        "{FAKE0000-0000-0000-0000-000000000000}"
      );
      await page.fill("#espn-league-id", "12345678");

      // Submit
      await page
        .locator("button[type='submit']")
        .filter({ hasText: "Reconnect ESPN" })
        .click();

      // Wait for async connect + status refresh + React state update
      await page.waitForTimeout(800);

      let passed = await runAssertions(page, [
        {
          text: "ESPN reconnected successfully",
          label: "reconnect success message",
        },
        {
          text: "Return to Omen",
          label: "'Return to Omen →' link",
        },
      ]);

      // Verify the link href points to /football
      const returnLink = page.getByRole("link", { name: /Return to Omen/i });
      const linkCount = await returnLink.count();
      if (linkCount > 0) {
        const href = await returnLink.getAttribute("href");
        if (href === "/football") {
          console.log('  ✓ "Return to Omen →" href = /football');
        } else {
          console.error(
            `  ✗ WRONG href — "Return to Omen →" points to "${href}", expected "/football"`
          );
          passed = false;
        }
      }

      results.push({ state: id, passed });
      const ss = path.join(SCREENSHOT_DIR, `${id}.png`);
      await page.screenshot({ path: ss, fullPage: true });
      console.log(`  → screenshot: ${ss}`);
      await page.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STATES 5–7: Other ESPN recovery states — verify banner copy
    // ─────────────────────────────────────────────────────────────────────────
    const OTHER_RECOVERY_STATES = [
      {
        id: "5_league_context_missing",
        recovery: "espn_league_context_missing",
        bannerText: "Omen needs your ESPN league ID",
      },
      {
        id: "6_import_blocked",
        recovery: "espn_import_blocked",
        bannerText: "Your ESPN league may be private",
      },
      {
        id: "7_recovery_needed",
        recovery: "espn_recovery_needed",
        bannerText: "Omen lost access to your ESPN data",
      },
    ];

    for (const { id, recovery, bannerText } of OTHER_RECOVERY_STATES) {
      console.log(`\n[espn-recovery-qa] ── ${id} ──`);

      const page = await browser.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });
      await setupPage(page, false);

      await page.goto(
        `${BASE_URL}/account?platform=espn&recovery=${recovery}`,
        { waitUntil: "networkidle" }
      );
      await waitForAccountPage(page);

      const passed = await runAssertions(page, [
        {
          text: bannerText,
          label: `recovery banner copy for ${recovery}`,
        },
      ]);

      results.push({ state: id, passed });
      const ss = path.join(SCREENSHOT_DIR, `${id}.png`);
      await page.screenshot({ path: ss, fullPage: true });
      console.log(`  → screenshot: ${ss}`);
      await page.close();
    }

    await browser.close();

    // ── Summary ────────────────────────────────────────────────────────────────

    console.log(
      "\n[espn-recovery-qa] ══════════════════════════════════════════════"
    );
    console.log("[espn-recovery-qa]  RESULTS");
    console.log(
      "[espn-recovery-qa] ══════════════════════════════════════════════"
    );
    let allPassed = true;
    for (const { state, passed } of results) {
      const icon = passed ? "✓" : "✗";
      console.log(`  ${icon}  ${state}`);
      if (!passed) allPassed = false;
    }
    console.log(
      "[espn-recovery-qa] ══════════════════════════════════════════════"
    );
    const total = results.length;
    const passCount = results.filter((r) => r.passed).length;
    console.log(
      allPassed
        ? `[espn-recovery-qa]  ALL ${total} STATES PASSED`
        : `[espn-recovery-qa]  ${passCount}/${total} PASSED — see failures above`
    );

    if (!allPassed) process.exitCode = 1;
  } finally {
    if (viteProc) {
      viteProc.kill();
      console.log("\n[espn-recovery-qa] Vite stopped.");
    }
  }
}

main().catch((err) => {
  console.error("[espn-recovery-qa] FATAL:", err.message);
  process.exit(1);
});
