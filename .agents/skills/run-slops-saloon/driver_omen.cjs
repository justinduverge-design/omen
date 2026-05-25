/**
 * driver_omen.cjs
 *
 * QA driver for the Omen of the Week / MVP Move tab.
 * Builds the frontend, starts Vite, intercepts POST /api/omen/mvp-move,
 * exercises all 8 contract states, asserts expected UI content, and
 * saves screenshots for each state.
 *
 * No .env or backend needed — API calls are intercepted in Playwright.
 *
 * Usage (from project root):
 *   node .claude/skills/run-slops-saloon/driver_omen.cjs
 *   node .claude/skills/run-slops-saloon/driver_omen.cjs --skip-build
 *   node .claude/skills/run-slops-saloon/driver_omen.cjs --port 5174
 */

"use strict";

const { execSync, spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const portIdx = args.indexOf("--port");
const PORT = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 5173;

const PROJECT_ROOT = path.join(__dirname, "..", "..", "..");
const FRONTEND_DIR = path.join(PROJECT_ROOT, "frontend");
const SCREENSHOT_DIR = path.join(__dirname, "screenshots", "omen");

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// ── Contract-correct mock responses ──────────────────────────────────────────

const NOW = new Date().toISOString();

const BASE_ENVELOPE = {
  feature: "omen_mvp_move",
  mode: "mock",
  generated_at: NOW,
  alternatives: [],
  warnings: [],
};

const SUCCESS_RESPONSE = {
  ...BASE_ENVELOPE,
  state: "success",
  request_id: "omen_req_qa_success",
  platform: { name: "yahoo", status: "connected", recovery: null },
  league: { id: "414.l.12345", name: "Mock Corvus League", season: 2026, week: 1, scoring_format: "ppr" },
  team: { id: "7", name: "Mock Corvus Team" },
  signals: {
    roster:          { status: "mock",  used: true,  source: "platform_adapter",       message: "Roster imported from deterministic mock fixture." },
    projections:     { status: "stub",  used: true,  source: "internal_stub",           message: "Projection provider is not finalized yet." },
    weather:         { status: "mock",  used: true,  source: "weather_fixture",         message: "Mock weather data used." },
    travel_home_away:{ status: "mock",  used: true,  source: "mock_schedule_fixture",   message: "Home/away context from mock schedule." },
    game_time_tv:    { status: "mock",  used: true,  source: "mock_schedule_fixture",   message: "Kickoff context from mock schedule." },
    matchup_dvp:     { status: "stub",  used: false, source: "pending_sportradar",      message: "Matchup DvP remains stubbed until a live provider is approved." },
    waivers:         { status: "mock",  used: true,  source: "mock_waiver_pool",        message: "Mock waiver pool." },
    llm_reasoning:   { status: "stub",  used: true,  source: "ollama_gemma_or_template", message: "Plain-English explanation is templated until Gemma is wired." },
  },
  recommendation: {
    id: "omen_mock_1",
    type: "start_sit",
    title: "Start Marquise Vale over Trent Holloway",
    move: "Move Marquise Vale into your WR2 slot and bench Trent Holloway.",
    primary_player:    { id: "p1", name: "Marquise Vale",   position: "WR", team: "DAL" },
    comparison_player: { id: "p2", name: "Trent Holloway",  position: "WR", team: "CHI" },
    expected_value_delta: { points: 4.2, label: "meaningful" },
    confidence: {
      score: 74,
      label: "medium_high",
      rationale: "Projection gap is clear, but matchup DvP is still stubbed.",
    },
    risk: {
      level: "medium",
      reasons: [
        "Vale has the stronger weekly role, but one matchup signal is still stubbed.",
        "Treat as a contract-safe preview until live projections are finalized.",
      ],
    },
    explanation: {
      summary:        "Your best move is to start Marquise Vale over Trent Holloway.",
      why_it_matters: "Vale projects for a better weekly role and gives your lineup a higher expected point total.",
      risk:           "Medium risk — matchup DvP and some projection inputs are still stubbed.",
      confidence:     "Confidence is 74 out of 100.",
      data_used:      ["connected roster", "weekly projections", "home/away context", "game time context"],
    },
  },
  warnings: ["Mock endpoint response. Do not present as final live fantasy advice."],
};

const EMPTY_RESPONSE = {
  ...BASE_ENVELOPE,
  state: "empty",
  request_id: "omen_req_qa_empty",
  platform: { name: "yahoo", status: "connected", recovery: null },
  league: { id: "mock-league-1", name: "Mock Corvus League", season: 2026, week: 1, scoring_format: "ppr" },
  team: { id: "mock-team-1", name: "Mock Corvus Team" },
  signals: {},
  recommendation: null,
  explanation: {
    summary:        "No move clears the recommendation threshold this week.",
    why_it_matters: "Your lineup is close enough to available alternatives that Corvus should not force a move.",
    risk:           "Forcing a marginal move could create more downside than upside.",
    confidence:     "Confidence is 68 out of 100 that standing pat is reasonable.",
    data_used:      ["connected roster", "weekly projections"],
  },
};

const PLATFORM_DISCONNECTED_RESPONSE = {
  ...BASE_ENVELOPE,
  state: "platform_disconnected",
  request_id: "omen_req_qa_disconnected",
  platform: {
    name: "sleeper",
    status: "disconnected",
    recovery: {
      code: "connect_platform",
      message: "Connect Sleeper before Corvus can read your roster.",
      cta: "Connect Sleeper",
    },
  },
  recommendation: null,
  signals: {
    roster: { status: "unavailable", used: false, source: "platform_adapter", message: "No connected roster is available." },
  },
};

function espnRecovery(state) {
  const configs = {
    espn_reauth_required: {
      httpStatus: 200,
      platformStatus: "reauth_required",
      code: "refresh_espn_cookies",
      message: "Your ESPN connection needs fresh cookies before Corvus can read this league.",
      cta: "Reconnect ESPN",
      fields_needed: ["ESPN_S2", "SWID"],
    },
    espn_league_context_missing: {
      httpStatus: 200,
      platformStatus: "league_context_missing",
      code: "select_or_reimport_espn_league",
      message: "Corvus could not find that ESPN league or team. Select the league again or re-import ESPN.",
      cta: "Select ESPN League",
    },
    espn_import_blocked: {
      httpStatus: 200,
      platformStatus: "import_blocked",
      code: "verify_espn_access",
      message: "ESPN blocked or returned an unexpected import response. Retry, reconnect, or verify league access.",
      cta: "Retry ESPN Import",
    },
    espn_recovery_needed: {
      httpStatus: 200,
      platformStatus: "recovery_needed",
      code: "recover_espn_connection",
      message: "Corvus cannot tell whether ESPN needs reauth, league selection, or a retry. Start ESPN recovery.",
      cta: "Recover ESPN",
    },
  };

  const cfg = configs[state];
  const recovery = {
    code: cfg.code,
    message: cfg.message,
    cta: cfg.cta,
  };
  if (cfg.fields_needed) recovery.fields_needed = cfg.fields_needed;

  return {
    ...BASE_ENVELOPE,
    state,
    request_id: `omen_req_qa_${state}`,
    platform: { name: "espn", status: cfg.platformStatus, recovery },
    recommendation: null,
    signals: {
      roster: { status: "unavailable", used: false, source: "espn_adapter", message: "ESPN roster import is blocked until recovery succeeds." },
    },
  };
}

const ERROR_RESPONSE = {
  ...BASE_ENVELOPE,
  state: "error",
  request_id: "omen_req_qa_error",
  platform: { name: "yahoo", status: "connected", recovery: null },
  recommendation: null,
  signals: {},
  error: {
    code: "omen_generation_failed",
    message: "Corvus could not generate an MVP Move right now.",
    retryable: true,
  },
};

// ── State definitions with assertions ────────────────────────────────────────

const STATES = [
  {
    id: "success",
    httpStatus: 200,
    response: SUCCESS_RESPONSE,
    assertions: [
      { text: "Marquise Vale",       label: "primary player name" },
      { text: "Trent Holloway",      label: "comparison player name" },
      { text: "74",                  label: "confidence score" },
      { text: "medium risk",         label: "risk pill" },
      { text: "Signals used",        label: "signals panel header" },
      { text: "matchup dvp",         label: "matchup_dvp signal row" },
      { text: "stub",                label: "stub signal badge" },
      { text: "Why this move",       label: "explanation section" },
    ],
  },
  {
    id: "empty",
    httpStatus: 200,
    response: EMPTY_RESPONSE,
    assertions: [
      { text: "Stand pat.",          label: "empty headline" },
      { text: "No move clears",      label: "empty summary" },
    ],
  },
  {
    id: "platform_disconnected",
    httpStatus: 200,
    response: PLATFORM_DISCONNECTED_RESPONSE,
    assertions: [
      { text: "Platform disconnected", label: "recovery label" },
      { text: "Sleeper",             label: "platform name" },
      { text: "Connect Sleeper",     label: "recovery CTA" },
    ],
  },
  {
    id: "espn_reauth_required",
    httpStatus: 200,
    response: espnRecovery("espn_reauth_required"),
    assertions: [
      { text: "ESPN connection required", label: "ESPN recovery label" },
      { text: "Reconnect ESPN",      label: "CTA button" },
      { text: "ESPN_S2",             label: "fields_needed" },
    ],
  },
  {
    id: "espn_league_context_missing",
    httpStatus: 200,
    response: espnRecovery("espn_league_context_missing"),
    assertions: [
      { text: "ESPN connection required", label: "ESPN recovery label" },
      { text: "Select ESPN League",  label: "CTA button" },
    ],
  },
  {
    id: "espn_import_blocked",
    httpStatus: 200,
    response: espnRecovery("espn_import_blocked"),
    assertions: [
      { text: "ESPN connection required", label: "ESPN recovery label" },
      { text: "Retry ESPN Import",   label: "CTA button" },
    ],
  },
  {
    id: "espn_recovery_needed",
    httpStatus: 200,
    response: espnRecovery("espn_recovery_needed"),
    assertions: [
      { text: "ESPN connection required", label: "ESPN recovery label" },
      { text: "Recover ESPN",        label: "CTA button" },
    ],
  },
  {
    id: "error",
    httpStatus: 500,
    response: ERROR_RESPONSE,
    assertions: [
      { text: "Error",               label: "error label" },
      { text: "Corvus could not generate", label: "error message" },
      { text: "Try again",           label: "retry button" },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function waitForPort(port, timeoutMs = 20000) {
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
      req.setTimeout(500, () => { req.destroy(); setTimeout(attempt, 300); });
    }
    attempt();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let viteProc = null;
  const results = [];

  try {
    // 1. Build
    if (!skipBuild) {
      console.log("[omen-qa] Building frontend...");
      execSync("npm run build", {
        cwd: FRONTEND_DIR,
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      console.log("[omen-qa] Build complete.");
    } else {
      console.log("[omen-qa] --skip-build: skipping build.");
    }

    // 2. Start Vite
    console.log(`[omen-qa] Starting Vite on port ${PORT}...`);
    viteProc = spawn("npm", ["run", "dev", "--", "--port", String(PORT)], {
      cwd: FRONTEND_DIR,
      stdio: "pipe",
      shell: process.platform === "win32",
    });
    viteProc.stderr.on("data", (d) => process.stderr.write(d));
    await waitForPort(PORT);
    console.log(`[omen-qa] Vite ready on http://localhost:${PORT}`);

    // 3. Launch Playwright
    const { chromium } = require(
      path.join(PROJECT_ROOT, "node_modules", "playwright-core")
    );
    const browser = await chromium.launch({ headless: true });

    // 4. Exercise each state
    for (const { id, httpStatus, response, assertions } of STATES) {
      console.log(`\n[omen-qa] ── State: ${id} ${"─".repeat(40 - id.length)}`);

      const page = await browser.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });

      // Intercept POST /api/omen/mvp-move and return canned response
      await page.route("**/api/omen/mvp-move", (route) => {
        route.fulfill({
          status: httpStatus,
          contentType: "application/json",
          body: JSON.stringify(response),
        });
      });

      // Collect console errors — ignore browser network-level messages
      // ("Failed to load resource") which fire automatically for non-2xx
      // responses and are expected for the error state (HTTP 500).
      const consoleErrors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && !msg.text().startsWith("Failed to load resource")) {
          consoleErrors.push(msg.text());
        }
      });

      // Navigate to /football
      await page.goto(`http://localhost:${PORT}/football`, { waitUntil: "networkidle" });

      // Click the Omen tab
      await page.locator("button", { hasText: "Omen of the Week" }).click();
      await page.waitForTimeout(200);

      // Submit the form
      await page.locator("button", { hasText: "Get my MVP Move" }).click();

      // Wait for response to render (interceptor is synchronous so 600ms is ample)
      await page.waitForTimeout(600);

      // Assert expected content
      let passed = true;
      for (const { text, label } of assertions) {
        const count = await page.locator(`text=${text}`).count();
        if (count === 0) {
          console.error(`  ✗ MISSING — ${label} ("${text}")`);
          passed = false;
        } else {
          console.log(`  ✓ ${label}`);
        }
      }

      // Report console errors
      if (consoleErrors.length > 0) {
        console.warn(`  ⚠ Console errors:\n    ${consoleErrors.join("\n    ")}`);
        passed = false;
      }

      results.push({ state: id, passed });

      // Screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, `omen-${id}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`  → ${screenshotPath}`);

      await page.close();
    }

    await browser.close();

    // 5. Summary
    console.log("\n[omen-qa] ══════════════════════════════════════");
    console.log("[omen-qa]  RESULTS");
    console.log("[omen-qa] ══════════════════════════════════════");
    let allPassed = true;
    for (const { state, passed } of results) {
      const icon = passed ? "✓" : "✗";
      console.log(`  ${icon}  ${state}`);
      if (!passed) allPassed = false;
    }
    console.log("[omen-qa] ══════════════════════════════════════");
    console.log(allPassed
      ? "[omen-qa]  ALL 8 STATES PASSED"
      : "[omen-qa]  FAILURES DETECTED — see above");

    if (!allPassed) process.exitCode = 1;

  } finally {
    if (viteProc) {
      viteProc.kill();
      console.log("\n[omen-qa] Vite stopped.");
    }
  }
}

main().catch((err) => {
  console.error("[omen-qa] FATAL:", err.message);
  process.exit(1);
});
