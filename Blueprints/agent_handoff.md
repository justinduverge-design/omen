# slops-saloon Agent Handoff

## Current State

This file was recreated during a DBS integrity repair on 2026-05-21.

Use this repo as the active app workspace:

`C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon`

## Layer Rules

- SLOPS is Justin / Slops OS / company operating system.
- `slops-saloon` is the Fantasy Sports MVP Builder department.
- `slops-saloon\Corvus` is the Fantasy Football MVP product layer.

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
- `frontend/src/pages/ConnectLeague.jsx` — Step 2 screen. Auth-gated (redirects to `/login` if not signed in). Sleeper resolve → league select → connect flow (against new `/api/platforms/sleeper/resolve` contract). Yahoo OAuth button. ESPN guided walkthrough with per-browser tab instructions and structured error codes. Manual card locked with "Coming soon" copy (build-gate respected). Skip option with honest Omen-locked copy. Continue button appears after any platform connects.
- `frontend/src/components/layout/ProtectedRoute.jsx` — redirects to `/login` (was `/`), stores current path as `corvus.auth.next` before redirect.
- `frontend/src/pages/Account.jsx` — redirects to `/login` on unauthenticated (was `/`).
- `frontend/src/pages/Landing.jsx` — all CTAs updated to correct routes (`/trade`, `/draft`, `/login`, `/login?next=/omen`). Inline sign-in form replaced with a link to `/login`. `supabase` import removed (no longer needed here).
- `frontend/src/routes/index.jsx` — added `/login`, `/trade`, `/draft`, `/account/connect`, `/omen` routes. Trade Analyzer and Draft Assistant are public (no ProtectedRoute wrapper). Omen is auth-gated.

### Known gaps (not blocking the build)

- **Yahoo OAuth callback** still redirects to `/football?connected=yahoo` — does not preserve `?next=` or return to `/account/connect`. Documented in Codex handoff. Do not claim Yahoo return flow is launch-ready.
- **Google, Apple, Discord OAuth** — UI is wired, but Supabase dashboard provider config must be confirmed before claiming these work. Email magic link is the only confirmed-wired provider.
- **ESPN `VITE_ESPN_ENABLED`** — ESPN card in ConnectLeague is hidden unless this env var is set to `true` (or unless ESPN is already connected). This matches the existing behavior in PlatformConnections.jsx.
- **AppLayout.jsx** — still uses hardcoded `bg-slate-950` instead of `var(--color-bg)`. Updating this is a follow-up pass.
- **node_modules** — not installed in the worktree. Build must be verified against the canonical path or after `npm install` in the worktree's `frontend/`.

### Next recommended frontend steps

1. `npm install` in the worktree `frontend/` and run `npm run build` to verify no compile errors
2. Visual review of `/login` and `/account/connect` in a browser against the P0 screen spec
3. Update `AppLayout.jsx` to use CSS custom property tokens for theming consistency across authenticated pages
4. Build the app shell / dashboard (`/football`) with sidebar nav and the correct tool links
5. Update `Omen.jsx` to use the auth+league gate pattern — show `DisconnectedState` if no platform connected, confirm paid-tier gate before showing live Omen

