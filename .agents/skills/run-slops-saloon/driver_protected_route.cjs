/**
 * driver_protected_route.cjs
 *
 * Generic QA driver for ANY auth-gated protected route. Closes the
 * recurring "no authenticated screenshot" gap documented across Phase
 * 1.5d/1.7/1.8/1.12/2.18 (see Blueprints/playbooks/skill-usage-ledger.md).
 *
 * Uses lib/authBypass.cjs (fake Supabase session + onboarding-flag seeded
 * into localStorage — zero real credentials, zero backend, zero network
 * call) so it works in any sandbox. Screenshots every named state for a
 * route in BOTH light and dark mode via page.emulateMedia(), since
 * frontend/src/lib/themeMode.js defaults to 'system' mode (reads
 * prefers-color-scheme) whenever no theme-mode key is stored.
 *
 * To add a new route: add a Blueprints-adjacent config module under
 * routes/<id>.cjs (see routes/waiver.cjs for the shape) — no changes to
 * this driver are needed.
 *
 * Usage (from project root):
 *   node .claude/skills/run-slops-saloon/driver_protected_route.cjs --route waiver
 *   node .claude/skills/run-slops-saloon/driver_protected_route.cjs --route waiver --state picks_loaded
 *   node .claude/skills/run-slops-saloon/driver_protected_route.cjs --route waiver --skip-build --port 5174
 */

"use strict";

const path = require("path");
const fs = require("fs");

const { parseArgs, bootstrap, runAssertions, printSummary } = require("./lib/driverKit.cjs");
const { buildViteEnv, setupAuthenticatedPage, registerApiMocks } = require("./lib/authBypass.cjs");

const PROJECT_ROOT = path.join(__dirname, "..", "..", "..");
const FRONTEND_DIR = path.join(PROJECT_ROOT, "frontend");
const SCREENSHOT_ROOT = path.join(__dirname, "screenshots");

const COLOR_SCHEMES = ["light", "dark"];

async function dispatchInteraction(page, step) {
  if (step.click) {
    await page.locator(step.click).first().click();
  } else if (step.fill) {
    await page.locator(step.fill.selector).fill(step.fill.value);
  } else if (step.waitForTimeout) {
    await page.waitForTimeout(step.waitForTimeout);
  } else if (step.waitForSelector) {
    await page.waitForSelector(step.waitForSelector, { timeout: 10000 });
  } else {
    throw new Error(`Unknown interaction step: ${JSON.stringify(step)}`);
  }
}

async function main() {
  const { route: routeId, state: stateFilter, skipBuild, port, out } = parseArgs(process.argv.slice(2));

  if (!routeId) {
    console.error("[protected-route-qa] Missing required --route <id> flag.");
    console.error("Available routes:");
    for (const f of fs.readdirSync(path.join(__dirname, "routes"))) {
      if (f.endsWith(".cjs")) console.error(`  - ${f.replace(/\.cjs$/, "")}`);
    }
    process.exit(1);
  }

  const routeConfigPath = path.join(__dirname, "routes", `${routeId}.cjs`);
  if (!fs.existsSync(routeConfigPath)) {
    console.error(`[protected-route-qa] No route config at ${routeConfigPath}`);
    process.exit(1);
  }
  const routeConfig = require(routeConfigPath);

  const screenshotDir = path.join(out || SCREENSHOT_ROOT, routeConfig.id);
  fs.mkdirSync(screenshotDir, { recursive: true });

  const label = `[${routeConfig.id}-qa]`;
  const results = [];

  const { browser, BASE_URL, close } = await bootstrap({
    frontendDir: FRONTEND_DIR,
    projectRoot: PROJECT_ROOT,
    port,
    skipBuild,
    viteEnv: buildViteEnv(),
    label,
  });

  try {
    for (const state of routeConfig.states) {
      if (stateFilter && state.id !== stateFilter) continue;

      for (const colorScheme of COLOR_SCHEMES) {
        const stateLabel = `${state.id}-${colorScheme}`;
        console.log(`\n${label} ── ${stateLabel} ──`);

        const page = await browser.newPage();
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.emulateMedia({ colorScheme });

        await setupAuthenticatedPage(page, {
          skipOnboardingSeed: routeConfig.path === "/onboarding",
        });
        await registerApiMocks(page, state.apiMocks || []);

        await page.goto(`${BASE_URL}${routeConfig.path}`, { waitUntil: "networkidle" });

        for (const step of state.interactions || []) {
          await dispatchInteraction(page, step);
        }

        const passed = await runAssertions(page, state.assertions || []);
        results.push({ state: stateLabel, passed });

        const ss = path.join(screenshotDir, `${stateLabel}.png`);
        await page.screenshot({ path: ss, fullPage: true });
        console.log(`  → screenshot: ${ss}`);

        await page.close();
      }
    }

    const allPassed = printSummary(`${routeConfig.id}-qa`, results);
    if (!allPassed) process.exitCode = 1;
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error("[protected-route-qa] FATAL:", err.message);
  process.exit(1);
});
