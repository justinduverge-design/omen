# slops-saloon Agent Handoff

## Current State

This file was recreated during a DBS integrity repair on 2026-05-21.

Use this repo as the active product workspace:

`<active-git-root>/slops-saloon/corvus/`

## Layer Rules

- SLOPS is Justin / Slops OS / company operating system.
- `slops-saloon` is the Slops Saloon division layer.
- `slops-saloon\corvus` is the Fantasy Football MVP product repo.
- The old nested `Corvus/` folder is retired.

## Product Rules

- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit lives inside Omen / MVP Move.
- Waiver logic lives inside Omen / MVP Move unless explicitly separated later.
- ESPN, Yahoo, and Sleeper all matter.
- ESPN is essential but risky and needs recovery playbooks.
- Users need plain-English reasoning, not heavy math.

## Safety Rules

Do not deploy, commit, push, delete files, move app folders, touch secrets, or modify production configuration without Justin's explicit approval.

Do not work from `Projects\slops-saloon`.

Do not touch `Archive\quarantine`.

---

## Session Handoff — 2026-05-24

### What was completed

**Documentation (canonical paths fixed):**
- `corvus/Blueprints/specs/corvus-ux-ui-design-system-v1.md` — written to canonical path (was worktree-only)

**Frontend — theme system:**
- `frontend/tailwind.config.js` — added Corvus brand color tokens (raven, charcoal, bone, gold, crimson, omen)
- `frontend/src/index.css` — full CSS custom property token system for dark/light modes with system fallback
- `frontend/src/lib/theme.js` — `applyTheme()`, `getThemeSetting()`, `setTheme()` — reads `localStorage.slops-theme`
- `frontend/src/App.jsx` — initializes theme on load, updates on OS preference change

**Frontend — auth routing:**
- `frontend/src/lib/nextUrl.js` — `corvus.auth.next` localStorage strategy per Codex contract. `storeNextUrl()` sanitizes and stores; `consumeNextUrl()` reads and clears. Only allows same-origin paths from an explicit allowlist.
- `frontend/src/pages/Login.jsx` — P0 screen. Google/Apple/Discord OAuth buttons + email magic link. `?next=` param stored on load. Auth callback (`onAuthStateChange`) detects session and routes to stored destination. `/omen` destination routes through `/account/connect?next=/omen` for league-gate check. Sent-confirmation state. Footer link to `/trade` (no sign-in required).
- `frontend/src/pages/ConnectLeague.jsx` — Step 2 screen. Auth-gated (redirects to `/login` if not signed in). Sleeper resolve → league select → connect flow (against new `/api/platforms/sleeper/resolve` contract). Yahoo OAuth button + returns to `/account/connect?connected=yahoo` after auth. ESPN guided walkthrough with per-browser tab instructions and structured error codes. Manual card locked with "Coming soon" copy (build-gate respected). Skip option with honest Omen-locked copy. Continue button appears after any platform connects.
- `frontend/src/components/layout/ProtectedRoute.jsx` — redirects to `/login` (was `/`), stores current path as `corvus.auth.next` before redirect.
- `frontend/src/pages/Account.jsx` — redirects to `/login` on unauthenticated (was `/`).
- `frontend/src/pages/Landing.jsx` — all CTAs updated to correct routes (`/trade`, `/draft`, `/login`, `/login?next=/omen`). Inline sign-in form replaced with a link to `/login`. `supabase` import removed (no longer needed here).
- `frontend/src/routes/index.jsx` — added `/login`, `/trade`, `/draft`, `/account/connect`, `/omen` routes. Trade Analyzer and Draft Assistant are public (no ProtectedRoute wrapper). Omen is auth-gated.

### Known gaps (not blocking the build)

- **Yahoo OAuth callback** — FIXED. Returns to `/account/connect?connected=yahoo`. Full `?next=` round-trip through Yahoo OAuth is a future enhancement only.
- **Google, Apple, Discord OAuth** — UI is wired, but Supabase dashboard provider config must be confirmed before claiming these work. Email magic link is the only confirmed-wired provider. See frontend-to-backend.md Request 2.
- **ESPN `VITE_ESPN_ENABLED`** — ESPN card in ConnectLeague is hidden unless this env var is set to `true` (or unless ESPN is already connected). See frontend-to-backend.md Request 4.
- **AppLayout.jsx** — still uses hardcoded `bg-slate-950` instead of `var(--color-bg)`. Updating this is a follow-up pass.
- **Draft Assistant endpoint auth status** — not yet confirmed public. See frontend-to-backend.md Request 3.

### Next recommended frontend steps

1. Run `npm install && npm run build` in `frontend/` to verify no compile errors
2. Visual review of `/login` and `/account/connect` in a browser against the P0 screen spec
3. Update `AppLayout.jsx` to use CSS custom property tokens for theming consistency across authenticated pages
4. Build the app shell / dashboard (`/football`) with sidebar nav and the correct tool links
5. Update `Omen.jsx` to use the auth+league gate pattern — show `DisconnectedState` if no platform connected, confirm paid-tier gate before showing live Omen

---

## Session Handoff — 2026-05-25

### What was completed

**Backend — live Omen MVP route:**
- `POST /api/omen/mvp-move` now has a real live path.
- Auth is required for non-mock live calls.
- Pro subscription is required.
- Connected platform is required.
- Yahoo is the first live source.
- Sleeper and ESPN return `pending_live_engine` until their live Omen engines are ready.
- Response envelope remains `omen_mvp_move`.

**Backend — dashboard and subscription contract:**
- `GET /api/dashboard/summary` is the gate source for Omen and Account subscription UI.
- Omen tool states are `needs_platform`, `needs_subscription`, `pending_live_engine`, and `ready`.
- A safe `subscription` block now exists in dashboard summary.
- Stripe checkout success returns to `/account?subscribed=true`.
- Stripe cancel returns to `/account?cancelled=true`.
- Stripe portal returns to `/account`.

**Frontend — canonical Omen state hardening:**
- Canonical `frontend/src/pages/OmenOfTheWeek.jsx` now sends `{}` to live Omen.
- `401` live Omen response routes to `/login` with `corvus.auth.next=/omen`.
- `402` live Omen response renders `UpgradeState`.
- `pending_live_engine` renders connected-but-not-ready copy instead of falling through to the empty state.
- Important: this was first found only in `.claude/worktrees/dreamy-ride-ab2778`; canonical file has now been patched.

**Documentation / handoff:**
- `Blueprints/handoffs/backend-to-frontend.md` contains the current live Omen and Stripe subscription contracts.
- `Blueprints/handoffs/frontend-to-backend.md` has Claude Request 11 as informational only.
- `Direction/context.md` now includes current build truth.

### Verification completed

- Backend full test suite passed: `npm test` — 199 passing.
- Frontend build passed: `npm run build` in `frontend/`.
- `git diff --check` passed.

### Known limitations

- `trial_ends_at` is currently `null`; webhook does not persist Stripe trial end yet.
- Live Omen v1 is Yahoo lineup-swap first. Waiver/trade MVP logic is future expansion.
- Sleeper and ESPN can connect, but their live Omen engines are pending.
- Supabase dashboard config for Google, Apple, and Discord still must be confirmed before claiming those providers work.

### Next recommended work

1. Claude builds the Account subscription section from the dashboard `subscription` block.
2. Browser QA `/account?upgrade=true`, `/account?subscribed=true`, and `/account?cancelled=true`.
3. Browser QA `/omen` for auth-expired, subscription-lapsed, pending-engine, empty, and success states.
4. Codex follow-up later: persist Stripe trial/current period dates from webhook events.

---

## Session Handoff — 2026-05-26

### What was completed

**Backend — investor hardening pass:**
- `POST /api/omen/mvp-move` now has live start/sit MVP paths for Yahoo, Sleeper, and ESPN when auth, subscription, credentials, and league context are usable.
- Sleeper and ESPN no longer default to `pending_live_engine`; they return live `success`/`empty` or explicit recovery states.
- ESPN cookie secrets are decrypted server-side only through Vault and are not exposed in response bodies.
- Draft Assistant recommendations can use supplied provider-backed ADP rows and return `mode: "live_adp"`, `is_mock: false`; mock fallback remains labeled.
- Stripe webhook handling now covers checkout completion, subscription created/updated/deleted, and invoice payment failed.
- Subscription metadata now supports `trial_ends_at`, `current_period_end`, `expires_at`, and `canceled_at` where Stripe provides them.
- `/api/user/export`, `/api/user/consent`, and `/api/user/delete` are mounted privacy routes.
- `/api/ready` now separates dependency/config readiness from `/api/health`.
- Trade Analyzer and Draft Assistant have a stricter public tool rate limit.
- `scripts/load-corvus-routes.js` was added for local/staging smoke-load checks.

**Documentation / reporting:**
- Corvus Layer 2 docs were updated with the 2026-05-26 backend truth.
- `Blueprints/handoffs/backend-to-frontend.md` now has the current contract section Claude should read first.
- Layer 1 Slops Saloon status/report files were prepared for HQ visibility.

### Verification completed

- `npm test` passed: 207/207.
- `npm audit --audit-level=moderate` passed: 0 vulnerabilities.
- `npm --prefix frontend run build` passed and emitted `frontend/dist`.
- `git diff --check` passed before implementation.

### Still requires Justin approval or non-local validation

- Stripe test-mode checkout/portal/webhook validation, then production Stripe validation only with Justin approval.
- Supabase production schema application for new subscription metadata columns.
- Supabase Auth provider confirmation for Google, Apple, and Discord.
- Real-account Yahoo/Sleeper/ESPN Omen QA before public “all platforms live” claims.
- Production deploy.
- Cron scoring enablement with `CORVUS_CRON_SCORING_ENABLED=true`.

### Next recommended work

1. Run Stripe test-mode validation and record evidence.
2. Run `scripts/load-corvus-routes.js` against local/staging with an auth token.
3. Claude updates Account/Omen UI from the 2026-05-26 backend-to-frontend contract.
4. Decide whether to merge or retire `POST /api/optimizer/mvp-move` now that `POST /api/omen/mvp-move` is canonical.
