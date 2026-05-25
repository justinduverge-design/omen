---
name: run-slops-saloon
description: Run, screenshot, and QA-test the Corvus / slops-saloon app. Use when asked to run the app, start the dev server, take a screenshot, verify the landing page, check a UI change, or dogfood the Trade Analyzer or Waitlist form.
---

# run-slops-saloon

Corvus is a Node.js/Express backend + Vite/React frontend. This skill drives the
**frontend dev server** using `playwright-core` (already in `node_modules`) with no
extra installs. The backend requires `.env` secrets and cannot be started without them;
frontend-only QA (landing page, routing, UI changes) does not need the backend.

Driver: `.Codex/skills/run-slops-saloon/driver.cjs`
Run from: project root (`C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon`)

---

## Prerequisites

Already satisfied in this project:

- Node.js 24+ (`node --version`)
- `node_modules/playwright-core` — installed, no extra install needed
- `frontend/node_modules` — installed (`npm install` inside `frontend/`)

No `apt-get`, no bun, no system browser install needed. `playwright-core` ships
Chromium binaries that it downloads on first use to `%LOCALAPPDATA%\ms-playwright`.

---

## Build

```bash
# Always build before QA-ing visual changes
cd frontend && npm run build
```

Build takes ~1 second. Output goes to `frontend/dist/`. The Express server serves
this dist in production; Vite dev server serves it in dev with HMR.

---

## Run — agent path (driver)

The driver starts Vite, asserts key page elements, takes screenshots, and stops.

```bash
# Full flow: start Vite + assert + screenshot + stop
node .Codex/skills/run-slops-saloon/driver.cjs

# If Vite is already running on 5173 (faster for repeated checks)
node .Codex/skills/run-slops-saloon/driver.cjs --screenshot-only

# Custom port
node .Codex/skills/run-slops-saloon/driver.cjs --port 5174

# Custom screenshot output dir
node .Codex/skills/run-slops-saloon/driver.cjs --screenshot-only --out /tmp/screenshots
```

Screenshots land in `.Codex/skills/run-slops-saloon/screenshots/` by default:
- `landing-desktop.png` — 1280×800 full-page
- `landing-mobile.png` — 375×812 full-page
- `football-route.png` — /football route (redirects to landing when unauthenticated)

The driver asserts (and fails with exit code 1 if any are missing):
- Page title: `Corvus`
- H1 contains: `Know the move`
- `Run Your Trade` CTA present
- `Join the Waitlist` CTA present
- Story arc text: `Every trade carries risk`
- Waitlist heading: `Get the signal before launch`

After driver exits read the screenshots with the Read tool so you can see them:

```
Read: .Codex/skills/run-slops-saloon/screenshots/landing-desktop.png
Read: .Codex/skills/run-slops-saloon/screenshots/landing-mobile.png
```

---

## Run — human path

```bash
# Terminal 1: backend (needs .env — skip if not available)
npm start
# → FATAL: missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY
# → If .env exists and is populated, server starts on port 3000

# Terminal 2: frontend dev server
cd frontend && npm run dev
# → Vite on http://localhost:5173 with HMR
# → Open http://localhost:5173 in browser
```

The frontend Vite config proxies `/api` → `http://localhost:3000`, so the full
app (auth, Trade Analyzer, Waitlist persistence) only works when the backend is
also running with valid `.env` credentials.

---

## Tests

```bash
# Unit + route tests (no .env required — tests mock what they need)
node --test test/tradeValue.test.js test/tradeRoute.test.js
# → 20 pass, 0 fail

# Full test suite
npm test
```

---

## Gotchas

- **`gstack browse` setup fails on Windows** with `Subshells with redirections are
  currently not supported`. Use `playwright-core` directly via `driver.cjs` instead.
  Do not attempt `~/.Codex/skills/gstack/browse/setup` on Windows.

- **Backend won't start without `.env`** — exits immediately with
  `FATAL: missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY`.
  This is intentional (fail-fast config). Landing page and UI QA work fine without
  the backend running.

- **ESM import paths on Windows** — `node --input-type=module` with absolute
  Windows paths like `C:/...` fails with `ERR_UNSUPPORTED_ESM_URL_SCHEME`. Always
  use CJS (`require`) for scripts that import project node_modules by path, or write
  the script file into the project directory first so relative imports resolve.

- **Playwright Chromium first-run** — the first run downloads Chromium to
  `%LOCALAPPDATA%\ms-playwright`. Subsequent runs are fast. If it errors with
  "Executable doesn't exist", run `node -e "require('./node_modules/playwright-core').chromium.launch()"` once to trigger the download.

- **`npm run dev` backgrounding on Windows** — `Start-Process` with `-FilePath npm`
  fails with "not a valid Win32 application" because `npm` is a `.cmd` file, not an
  exe. Use Bash `&` backgrounding instead or spawn via `node`'s `child_process.spawn`
  with `shell: true`.

- **Vite port conflict** — if 5173 is taken, pass `--port 5174` to both Vite
  (`cd frontend && npx vite --port 5174`) and the driver
  (`node driver.cjs --port 5174`).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `FATAL: missing required environment variables` | Backend needs `.env`. For frontend-only QA skip the backend. |
| Driver times out waiting for port | Vite might have failed to start. Run `cd frontend && npm run dev` manually and check for errors. |
| `Executable doesn't exist` from playwright | Chromium not downloaded yet. Run `node -e "require('./node_modules/playwright-core').chromium.launch().then(b=>b.close())"` to download. |
| White/blank screenshot | Vite didn't finish loading. Increase wait or use `waitUntil: 'networkidle'`. |
| ESM import errors on Windows | Use CJS (`require`) not ESM (`import`) for Windows path imports. |
