---
name: run-slops-saloon
description: Run, screenshot, and QA-test the Omen / slops-saloon app. Use when asked to run the app, start the dev server, take a screenshot, verify the landing page, check a UI change, or dogfood the Trade Analyzer or Waitlist form.
---

# run-slops-saloon

Omen is a Node.js/Express backend + Vite/React frontend. This skill drives the
**frontend dev server** using `playwright-core` (already in `node_modules`) with no
extra installs. The backend requires `.env` secrets and cannot be started without them;
frontend-only QA (landing page, routing, UI changes) does not need the backend.

Driver: `.agents/skills/run-slops-saloon/driver.cjs`
Run from: project root (`<repo>/slops-saloon/omen`)

This directory (`.agents/skills/run-slops-saloon/`) is the canonical, git-tracked
copy. Per-agent mirrors under `.claude/skills/` or `.Codex/skills/` may exist
locally but are gitignored (see the root `.gitignore` `.claude/` rule) — edit
the `.agents/` copy, not a mirror, or your changes won't be shared with any
other session/clone.

There are now **four drivers**, each for a different kind of route:

| Driver | Tests | Auth needed | Use for |
|---|---|---|---|
| `driver.cjs` | `/` public landing page | No | Landing page smoke, public marketing copy |
| `driver_omen.cjs` | `/dev/omen` dev-only test harness | No (dev-only route, no `ProtectedRoute`) | Omen recommendation card states (mocks `POST /api/omen/mvp-move` directly) |
| `driver_espn_recovery.cjs` | `/account` ESPN recovery flow | Yes (auth bypass, narrow/hardcoded to this one flow) | ESPN reconnect states only |
| `driver_protected_route.cjs` | **any** `ProtectedRoute`-gated route | Yes (auth bypass, generalized) | New protected-route screenshot needs — this is the one to reach for |

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
node .agents/skills/run-slops-saloon/driver.cjs

# If Vite is already running on 5173 (faster for repeated checks)
node .agents/skills/run-slops-saloon/driver.cjs --screenshot-only

# Custom port
node .agents/skills/run-slops-saloon/driver.cjs --port 5174

# Custom screenshot output dir
node .agents/skills/run-slops-saloon/driver.cjs --screenshot-only --out /tmp/screenshots
```

Screenshots land in `.agents/skills/run-slops-saloon/screenshots/` by default:
- `landing-desktop.png` — 1280×800 full-page
- `landing-mobile.png` — 375×812 full-page
- `football-route.png` — /football route (redirects to landing when unauthenticated)

The driver asserts (and fails with exit code 1 if any are missing):
- Page title: `Omen`
- H1 contains: `Know the move`
- `Run Your Trade` CTA present
- `Join the Waitlist` CTA present
- Story arc text: `Every trade carries risk`
- Waitlist heading: `Get the signal before launch`

**Known stale assertion (found 2026-07-05, not fixed here):** the H1 check
above no longer matches — `Landing.jsx`'s copy changed to "See the result
before it happens." in Phase 1.10B (2026-06-25) and this driver's assertion
was never updated. Pre-existing drift, unrelated to any change in this
handoff; left as a follow-up rather than expanding this task's scope.

After driver exits read the screenshots with the Read tool so you can see them:

```
Read: .agents/skills/run-slops-saloon/screenshots/landing-desktop.png
Read: .agents/skills/run-slops-saloon/screenshots/landing-mobile.png
```

---

## Run — Omen recommendation card states (`driver_omen.cjs`)

Tests the `/dev/omen` dev-only harness route (unauthenticated — `Omen.jsx` is
only mounted when `import.meta.env.DEV`, per `frontend/src/routes/index.jsx`),
mocking `POST /api/omen/mvp-move` directly per state.

```bash
node .agents/skills/run-slops-saloon/driver_omen.cjs
node .agents/skills/run-slops-saloon/driver_omen.cjs --skip-build --port 5174
```

Screenshots land in `.agents/skills/run-slops-saloon/screenshots/omen/`.

---

## Run — ESPN recovery flow (`driver_espn_recovery.cjs`)

Tests the `/account` ESPN recovery states (disconnected, reauth-required,
reconnect form, success, and 3 other recovery-reason banners) using the
auth-bypass technique (see next section) hardcoded to this one flow.

```bash
node .agents/skills/run-slops-saloon/driver_espn_recovery.cjs
node .agents/skills/run-slops-saloon/driver_espn_recovery.cjs --skip-build --port 5174
```

Screenshots land in `.agents/skills/run-slops-saloon/screenshots/espn-recovery/`.

**Known break (found 2026-07-05, not fixed here):** this driver currently
times out waiting for "Platform Connections" text, because it never seeds
`omen.onboarding.done` into localStorage and `ProtectedRoute.jsx` (lines
63-71) redirects any protected route to `/onboarding` until that flag is
set — confirmed by direct inspection: a debug run against the exact same
auth-bypass setup lands on the "Pick your look" onboarding step, not
`/account`. This predates the `driver_protected_route.cjs` work below (the
onboarding gate was evidently added to `ProtectedRoute.jsx` after this driver
was written) and is unrelated to any change in this handoff. Left as-is per
this task's scope (see "Authenticated protected-route screenshots" below for
the fixed, generalized version) — a follow-up patch would just add the same
`omen.onboarding.done` seed this driver is missing.

---

## Authenticated protected-route screenshots (`driver_protected_route.cjs`)

**The problem this solves:** across several past phases (1.5d, 1.7, 1.8,
1.12, 2.18 — see `Blueprints/playbooks/skill-usage-ledger.md`), agents doing
frontend work on auth-gated routes (`/account`, `/football`, `/omen`,
`/standings`, `/waiver`, `/ledger`) documented "no authenticated screenshot —
Supabase sandbox limitation" as an unfixable known gap. It isn't. You need
**zero real Supabase credentials, zero backend, zero network call**:

1. Vite is spawned with fake `VITE_SUPABASE_URL=http://localhost:54321` /
   fake anon key, so `frontend/src/lib/supabase.js` builds a real
   (non-stub) Supabase client pointed at a URL that's never actually reachable
   or needed.
2. Before `page.goto()`, Playwright's `page.addInitScript()` pre-seeds
   `localStorage` with a fake-but-valid-shaped Supabase v2 session
   (`expires_at` 2 hours out, so the client never attempts a network
   refresh) **and** `omen.onboarding.done = 'true'` (closes the gap
   `driver_espn_recovery.cjs` above never had to handle — see its note).
3. `frontend/src/components/layout/ProtectedRoute.jsx`'s
   `supabase.auth.getSession()` resolves the fake session synchronously from
   localStorage. Its other check, `apiFetch('/api/session')`, fails silently
   on `.catch()` when there's no backend running, so it doesn't need mocking.
4. Whatever `/api/*` endpoint the target page fetches gets mocked per-state
   via `page.route()`.

This is implemented once, reusably, in `lib/authBypass.cjs` +
`lib/driverKit.cjs`, consumed by `driver_protected_route.cjs`. To add a new
route, add a small config file under `routes/<id>.cjs` — no driver code
changes needed. See `routes/waiver.cjs` for a fully worked example (2 states)
and `routes/{football,omen,standings,ledger}.cjs` for minimal stubs (1 state
each, just enough to prove the route renders past the auth/onboarding gate —
add more states as future phases need them).

```bash
# Run every state for a route, both light and dark mode
node .agents/skills/run-slops-saloon/driver_protected_route.cjs --route waiver

# Run one named state only
node .agents/skills/run-slops-saloon/driver_protected_route.cjs --route waiver --state picks_loaded

node .agents/skills/run-slops-saloon/driver_protected_route.cjs --route waiver --skip-build --port 5174
```

Screenshots land in
`.agents/skills/run-slops-saloon/screenshots/<route-id>/<state-id>-<light|dark>.png`.

### Dark/light mode

`frontend/src/lib/themeMode.js` defaults to `'system'` mode whenever no
`omen.theme.mode` key is stored, and `'system'` mode reads
`window.matchMedia('(prefers-color-scheme: dark)')`. The driver calls
`page.emulateMedia({ colorScheme: 'light' | 'dark' })` before each
`page.goto()` — no localStorage seeding needed for theme at all.

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
  Do not attempt `~/.agents/skills/gstack/browse/setup` on Windows.

- **Orphaned Vite dev servers on Windows** — `viteProc.kill()` sometimes doesn't
  kill the whole process tree (`npm run dev` spawned with `shell: true` on
  Windows creates a cmd.exe → npm.cmd → node chain, and killing the top PID can
  leave the actual Vite server running). If a driver run behaves like it's
  talking to a stale/different app state, check
  `netstat -ano | grep LISTENING` for the port in question and
  `taskkill //F //PID <pid>` any leftover listener before re-running.

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
| Protected route redirects to `/onboarding` instead of the target page | The auth-bypass localStorage seed is missing `omen.onboarding.done`. Use `lib/authBypass.cjs`'s `setupAuthenticatedPage()` (seeds it automatically) rather than hand-rolling a new session injection. |
| Fresh `git worktree add` checkout: driver can't find Vite / playwright-core | Worktrees don't carry `node_modules` (gitignored, per-directory). Run `npm ci` at repo root and inside `frontend/` in the new worktree first. |
