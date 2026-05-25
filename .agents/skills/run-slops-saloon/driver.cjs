/**
 * Corvus / slops-saloon run driver
 *
 * Starts the Vite frontend dev server, runs Playwright assertions against
 * the landing page, takes screenshots, then stops cleanly.
 *
 * Usage (from project root):
 *   node .claude/skills/run-slops-saloon/driver.cjs [--screenshot-only] [--port 5173]
 *
 *   --screenshot-only   Skip startup; assume Vite is already on --port (default 5173).
 *   --port <N>          Vite port to target (default 5173).
 *   --out <dir>         Screenshot output dir (default: .claude/skills/run-slops-saloon/screenshots/).
 *
 * Requirements:
 *   - node_modules/playwright-core present (already in the project).
 *   - npm / node on PATH.
 *   - No .env needed for the frontend-only path.
 */

const { execSync, spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const screenshotOnly = args.includes('--screenshot-only');
const portIdx = args.indexOf('--port');
const PORT = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 5173;
const outIdx = args.indexOf('--out');
const OUT_DIR = outIdx !== -1
  ? args[outIdx + 1]
  : path.join(__dirname, 'screenshots');

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Helpers ───────────────────────────────────────────────────────────────────

function waitForPort(port, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      const req = http.get(`http://localhost:${port}/`, res => {
        res.destroy();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() > deadline) return reject(new Error(`Timed out waiting for port ${port}`));
        setTimeout(attempt, 300);
      });
      req.setTimeout(500, () => { req.destroy(); setTimeout(attempt, 300); });
    }
    attempt();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let viteProc = null;

  try {
    // 1. Optionally start Vite
    if (!screenshotOnly) {
      console.log(`[driver] Starting Vite on port ${PORT}...`);
      viteProc = spawn('npm', ['run', 'dev', '--', '--port', String(PORT)], {
        cwd: path.join(__dirname, '..', '..', '..', 'frontend'),
        stdio: 'pipe',
        shell: process.platform === 'win32',
      });
      viteProc.stderr.on('data', d => process.stderr.write(d));
      await waitForPort(PORT);
      console.log(`[driver] Vite ready on http://localhost:${PORT}`);
    } else {
      console.log(`[driver] --screenshot-only: targeting existing server on port ${PORT}`);
      await waitForPort(PORT, 3000);
    }

    // 2. Playwright assertions + screenshots
    const { chromium } = require(
      path.join(__dirname, '..', '..', '..', 'node_modules', 'playwright-core')
    );

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // ── Desktop ──
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });

    const title = await page.title();
    if (title !== 'Corvus') throw new Error(`Unexpected title: ${title}`);

    const h1 = (await page.locator('h1').textContent()) ?? '';
    if (!h1.includes('Know the move')) throw new Error(`H1 mismatch: ${h1}`);

    const checks = [
      { sel: 'text=Run Your Trade',            label: 'Run Your Trade CTA' },
      { sel: 'text=Join the Waitlist',          label: 'Waitlist CTA' },
      { sel: 'text=Every trade carries risk',   label: 'Story arc' },
      { sel: 'text=Trade Analyzer',             label: 'Trade Analyzer label' },
      { sel: 'text=Get the signal before launch', label: 'Waitlist heading' },
    ];

    for (const { sel, label } of checks) {
      const n = await page.locator(sel).count();
      if (n === 0) throw new Error(`Missing: ${label} (${sel})`);
      console.log(`[driver] ✓ ${label}`);
    }

    // Console errors check
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    const desktopPath = path.join(OUT_DIR, 'landing-desktop.png');
    await page.screenshot({ path: desktopPath, fullPage: true });
    console.log(`[driver] screenshot → ${desktopPath}`);

    // ── Mobile ──
    await page.setViewportSize({ width: 375, height: 812 });
    const mobilePath = path.join(OUT_DIR, 'landing-mobile.png');
    await page.screenshot({ path: mobilePath, fullPage: true });
    console.log(`[driver] screenshot → ${mobilePath}`);

    // ── Football app route (auth redirect expected) ──
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`http://localhost:${PORT}/football`, { waitUntil: 'networkidle' });
    const footballTitle = await page.title();
    console.log(`[driver] /football title: ${footballTitle}`);
    const footballPath = path.join(OUT_DIR, 'football-route.png');
    await page.screenshot({ path: footballPath, fullPage: true });
    console.log(`[driver] screenshot → ${footballPath}`);

    await browser.close();

    if (consoleErrors.length > 0) {
      console.warn(`[driver] Console errors detected:\n  ${consoleErrors.join('\n  ')}`);
    }

    console.log('[driver] DONE — all checks passed');

  } finally {
    if (viteProc) {
      viteProc.kill();
      console.log('[driver] Vite stopped');
    }
  }
}

main().catch(err => {
  console.error('[driver] FAILED:', err.message);
  process.exit(1);
});
