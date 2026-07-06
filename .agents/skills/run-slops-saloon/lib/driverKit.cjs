/**
 * driverKit.cjs
 *
 * Shared scaffolding for run-slops-saloon Playwright drivers: CLI arg
 * parsing, waiting for Vite's port, the build+spawn+launch lifecycle, the
 * assertion runner, and the pass/fail summary printer.
 *
 * Promoted out of the near-identical boilerplate duplicated across
 * driver.cjs, driver_omen.cjs, and driver_espn_recovery.cjs. Those three
 * files are left as-is (working, already cited as real evidence in past
 * handoffs) — this module exists for driver_protected_route.cjs and any
 * future driver, not to retrofit the existing ones.
 */

"use strict";

const { execSync, spawn } = require("child_process");
const http = require("http");
const path = require("path");

/**
 * Parses the CLI flags shared across drivers.
 * @param {string[]} argv - typically process.argv.slice(2)
 */
function parseArgs(argv) {
  const skipBuild = argv.includes("--skip-build");

  const portIdx = argv.indexOf("--port");
  const port = portIdx !== -1 ? parseInt(argv[portIdx + 1], 10) : 5173;

  const routeIdx = argv.indexOf("--route");
  const route = routeIdx !== -1 ? argv[routeIdx + 1] : undefined;

  const stateIdx = argv.indexOf("--state");
  const state = stateIdx !== -1 ? argv[stateIdx + 1] : undefined;

  const outIdx = argv.indexOf("--out");
  const out = outIdx !== -1 ? argv[outIdx + 1] : undefined;

  return { skipBuild, port, route, state, out };
}

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
 * Builds (unless skipBuild), spawns Vite with the given env, waits for the
 * port, and launches a headless Chromium instance via the vendored
 * playwright-core (no extra install). Returns everything a driver needs
 * plus a single close() to tear it all down.
 *
 * @param {object} opts
 * @param {string} opts.frontendDir
 * @param {string} opts.projectRoot
 * @param {number} opts.port
 * @param {boolean} opts.skipBuild
 * @param {Record<string,string>} opts.viteEnv
 * @param {string} [opts.label] - log-line prefix, e.g. "[waiver-qa]"
 */
async function bootstrap({ frontendDir, projectRoot, port, skipBuild, viteEnv, label = "[qa]" }) {
  if (!skipBuild) {
    console.log(`${label} Building frontend...`);
    execSync("npm run build", {
      cwd: frontendDir,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: viteEnv,
    });
    console.log(`${label} Build complete.`);
  } else {
    console.log(`${label} --skip-build: skipping build.`);
  }

  console.log(`${label} Starting Vite on port ${port}...`);
  const viteProc = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
    cwd: frontendDir,
    stdio: "pipe",
    shell: process.platform === "win32",
    env: viteEnv,
  });
  viteProc.stderr.on("data", (d) => process.stderr.write(d));
  await waitForPort(port);
  console.log(`${label} Vite ready on http://localhost:${port}`);

  const { chromium } = require(path.join(projectRoot, "node_modules", "playwright-core"));
  const browser = await chromium.launch({ headless: true });

  return {
    viteProc,
    browser,
    BASE_URL: `http://localhost:${port}`,
    async close() {
      await browser.close();
      viteProc.kill();
      console.log(`${label} Vite stopped.`);
    },
  };
}

/**
 * Runs named assertions against page content.
 * Each assertion is { label, text } (partial getByText match) or
 * { label, selector } (locator count).
 * Returns true if all pass; logs a ✓/✗ line per assertion.
 */
async function runAssertions(page, assertions) {
  let passed = true;
  for (const a of assertions) {
    let count;
    if (a.selector) {
      count = await page.locator(a.selector).count();
    } else {
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

/**
 * Prints the standard "══" pass/fail summary block and returns whether
 * everything passed (so the caller can set process.exitCode).
 *
 * @param {string} label
 * @param {Array<{state: string, passed: boolean}>} results
 */
function printSummary(label, results) {
  const rule = "══════════════════════════════════════════════";
  console.log(`\n[${label}] ${rule}`);
  console.log(`[${label}]  RESULTS`);
  console.log(`[${label}] ${rule}`);
  let allPassed = true;
  for (const { state, passed } of results) {
    console.log(`  ${passed ? "✓" : "✗"}  ${state}`);
    if (!passed) allPassed = false;
  }
  console.log(`[${label}] ${rule}`);
  const total = results.length;
  const passCount = results.filter((r) => r.passed).length;
  console.log(
    allPassed
      ? `[${label}]  ALL ${total} STATES PASSED`
      : `[${label}]  ${passCount}/${total} PASSED — see failures above`
  );
  return allPassed;
}

module.exports = {
  parseArgs,
  waitForPort,
  bootstrap,
  runAssertions,
  printSummary,
};
