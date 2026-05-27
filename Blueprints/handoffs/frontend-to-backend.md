# Frontend To Backend Handoff

## Purpose

Claude/frontend writes backend contract requests here.

Codex/backend reads this file before backend work and responds in `backend-to-frontend.md`.

## Active Context

Last updated: 2026-05-27 (worktree cool-darwin-c7c0d7 — frontend code-complete)

- Corvus is the Fantasy Football MVP product.
- Trade Analyzer is the front door (public, no auth).
- Draft Assistant is the preparation and seasonal tool (public, no auth).
- Omen of the Week / MVP Move is the weekly main event (Pro + platform required).
- Start/Sit and Waiver Wire are deferred — no frontend routes, no backend launch dependency.
- Yahoo, Sleeper, and ESPN all matter. ESPN gated by `VITE_ESPN_ENABLED`.
- ESPN is essential but risky — requires recovery playbooks and staged cookie QA before public launch.
- Users need plain-English reasoning, not heavy math.
- Frontend lives in `frontend/` (React 18, React Router v6, Tailwind, Vite). `client/` is a legacy artifact.
- All frontend API calls use canonical routes. No legacy compat routes are called from the frontend.

## Launch Validation Status — 2026-05-26

Paired report: `Solutions/reports/corvus-launch-validation-frontend-evidence-2026-05-26.md`

### Confirmed clean
- Build passes — 100 modules, `✓ built in 1.31s`, emits `frontend/dist`. Verified in worktree cool-darwin-c7c0d7 on 2026-05-26.
- All API calls use canonical routes — no legacy compat routes called. Backend can retire all compat routes.
- Omen gating, ESPN recovery, Stripe return banners, and `ProtectedRoute` auth are correctly wired.
- `StartSit.jsx` and `WaiverWire.jsx` exist but are not routed — confirmed deferred, matches backend.
- `Account.jsx` subscription section built and wired to Stripe checkout/portal contracts.
- `OmenOfTheWeek.jsx` live body corrected to `{}` and 401/402 defense-in-depth applied.
- `Header.jsx` theme CSS vars applied — follows light/dark mode correctly.
- `Landing.jsx` missing `supabase` import added — waitlist form no longer throws `ReferenceError` at runtime.
- `PlatformConnections.jsx` endpoint corrected from `/api/platforms/status` (legacy) to `/api/platforms` (canonical Stage 1.5 route); CSS vars applied.
- `DraftAssistant.jsx` year badge updated to `new Date().getFullYear()` (was hardcoded `2025`); CSS vars applied.
- `DisconnectedState.jsx`, `EmptyState.jsx`, `UpgradeState.jsx` CSS vars applied — no hardcoded Tailwind color classes remain in UI primitives.
- `Football.jsx` CSS vars applied — tab bar, platform status bar, skeletons, all accent colors.
- `OmenPage.jsx` CSS vars applied — header, skeletons, back-link.
- `Account.jsx` plan prices wired to `GET /api/stripe/prices` with `$5`/`$20` hardcoded fallback; prices update live from Stripe config.
- **Build verified:** ✓ 100 modules, 1.32s. Frontend is code-complete.

### Open blockers (ops/Justin — no code change needed)
- Request 15: `waitlist_signups` Supabase SQL is prepared locally; Justin must still approve applying it to Supabase.
- Request 16: Supabase subscription date-column SQL is prepared locally; Justin must still approve applying it to Supabase.
- ~~Stripe: `STRIPE_MONTHLY_PRICE_ID` and `STRIPE_SEASON_PRICE_ID` updated in Infisical to match new $5/$20 Price IDs — 2026-05-27.~~ ✓ Done
- Stripe return URL configuration in Stripe dashboard — Justin/ops.
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` prod env confirmation — Justin/ops.

### Open code questions
- None. All code work is complete. Remaining items are ops/Justin only (see Open blockers above).

## Open Frontend Requests

---

### Request 1 — Yahoo OAuth callback destination

**Date:** 2026-05-24
**Owner:** Claude Code / frontend
**Feature:** Platform connection onboarding
**Priority:** ~~High~~ **Resolved 2026-05-24**

**Resolution:** `GET /api/yahoo/callback` now redirects to `/account/connect?connected=yahoo`. Yahoo connect-screen return is fixed. Full `?next=` round-trip through Yahoo OAuth remains a future enhancement — see `backend-to-frontend.md` Yahoo OAuth Callback Fix section.

**Original request (for reference):**

The ConnectLeague screen (`/account/connect`) lets users connect Yahoo by navigating to `GET /api/yahoo/auth`. After Yahoo auth completes, the callback at `GET /api/yahoo/callback` previously redirected to `/football?connected=yahoo`.

This breaks the onboarding flow. The user clicked "Connect Yahoo" from `/account/connect`, authenticated with Yahoo, and now lands at `/football` instead of returning to the connect screen where they can see the connection confirmed and continue.

`corvus.auth.next` is frontend-owned localStorage — the backend cannot read it. The frontend cannot intercept the Yahoo OAuth mid-redirect.

**Requested change:**

Change the `GET /api/yahoo/callback` redirect destination from `/football?connected=yahoo` to `/account/connect?connected=yahoo`.

The `?connected=yahoo` query param is optional but useful — the frontend can read it and briefly highlight the connected card. The important thing is the path.

**If that is not feasible:** redirect to `/login?connected=yahoo` instead. The Login page will detect an existing session (from the OAuth flow) and route the user onward using the stored `corvus.auth.next` value.

**Do not:** redirect to `/` or any path that loses the user's in-progress onboarding step.

**Notes:**
- The Yahoo OAuth state token must not be used to carry user-controlled redirect paths — keep backend redirect logic hardcoded to a safe internal path.
- `?next=` preservation through Yahoo OAuth remains a known gap per the Stage 1.5 handoff. This request only fixes the landing path — full `?next=` round-trip is a follow-up.

---

### Request 2 — Auth provider configuration confirmation

**Date:** 2026-05-24
**Owner:** Claude Code / frontend
**Feature:** Sign-in screen (`/login`)
**Priority:** ~~High~~ **Resolved 2026-05-25**

**Resolution:** Codex confirmed email magic link is the only wired provider. Google, Apple, and Discord require Supabase dashboard config — safe to show buttons with inline error handling. Product decision needed before launch: label or gate unverified providers. See `backend-to-frontend.md` Frontend Request Response section.

---

### Request 3 — Draft Assistant endpoint auth status

**Date:** 2026-05-24
**Owner:** Claude Code / frontend
**Feature:** Draft Assistant (`/draft`)
**Priority:** ~~Medium~~ **Resolved 2026-05-25**

**Resolution:** Both Draft Assistant endpoints are public with no auth required. `POST /api/draft-assistant/recommendations` and `GET /api/draft-assistant/adp` do not require auth. `GET /api/draft-assistant/adp` optionally enriches with Yahoo ADP if an auth header is present but degrades gracefully without it. No code change needed for public `/draft`. See `backend-to-frontend.md` Frontend Request Response section.

---

### Request 4 — ESPN card build flag clarification

**Date:** 2026-05-24
**Owner:** Claude Code / frontend
**Feature:** ConnectLeague screen — ESPN card
**Priority:** ~~Low~~ **Resolved 2026-05-25**

**Resolution:** Codex recommends keeping `VITE_ESPN_ENABLED=false` in production unless Justin explicitly enables it. ESPN endpoint exists and returns safe error codes but remains fragile due to user-copied cookie dependency. If enabled, UI copy should frame ESPN as guided/manual connection. See `backend-to-frontend.md` Frontend Request Response section.

---

### Request 5 — Dashboard summary contract for app shell

**Date:** 2026-05-24
**Owner:** Claude Code / frontend
**Feature:** App shell / dashboard (`/football`)
**Priority:** ~~High~~ **Resolved 2026-05-24**

**Resolution:** Mount path confirmed as `GET /api/dashboard/summary` (visible from `src/routes/dashboard.js`). All status values clarified by Justin and Codex. Waiver Wire and Omen gate behavior documented in `backend-to-frontend.md` Dashboard And Omen Gate Contract section. Frontend has enough to build the `/football` app shell.

---

### Request 6 — Omen subscription gate clarification

**Date:** 2026-05-24
**Owner:** Claude Code / frontend
**Feature:** Omen / MVP Move (`/omen`)
**Priority:** ~~High~~ **Resolved 2026-05-24**

**Resolution — Justin:** Gate order is locked: auth → platform → subscription (UpgradeState) → live Omen only when `status === "ready"`. Subscription gate is real and must not be skipped even when platform is connected. See `backend-to-frontend.md` Dashboard And Omen Gate Contract section for the full status map.

---

### Request 7 — Draft Assistant UI contract

**Date:** 2026-05-24
**Owner:** Claude Code / frontend
**Feature:** Draft Assistant (`/draft`)
**Priority:** ~~High~~ **Resolved 2026-05-24**

**Resolution:** Codex confirmed: MockBanner required on all Draft Assistant output (`is_mock: true` is the current default). `recommendation_type` values (`best_available`, `roster_fit`, `value_pick`, `risk_adjusted`) should display as labels. ADP response shape documented in `backend-to-frontend.md` Draft Assistant And Omen Context Response section. No draft board endpoint — user inputs position needs only. Frontend built accordingly.

**Frontend need:**

The frontend has read `src/routes/draftAssistant.js` and can see both endpoint contracts. This request documents what the frontend will build against and flags the gaps that need product decisions before launch.

**Confirmed from code:**

`POST /api/draft-assistant/recommendations`
- Auth: none required
- Request body:
```json
{
  "scoring_format": "ppr",
  "draft_position": 5,
  "round": 1,
  "position_needs": ["RB", "WR"]
}
```
- `scoring_format`: `ppr`, `half_ppr`, or `standard` — defaults to `ppr`
- `draft_position`: integer > 0 — defaults to 5
- `round`: integer > 0 — defaults to 1
- `position_needs`: array of position strings (e.g. `["RB", "WR", "TE"]`)

- Response shape:
```json
{
  "feature": "draft_assistant",
  "status": "mock_ready",
  "mode": "mock",
  "is_mock": true,
  "contract_version": "draft-assistant-recommendations.v1",
  "generated_at": "ISO timestamp",
  "scoring_format": "ppr",
  "draft_position": 5,
  "round": 1,
  "position_needs": ["RB"],
  "note": "Mock recommendations — live Draft Assistant requires session + platform data.",
  "recommendations": [
    {
      "rank": 1,
      "name": "Sample RB1",
      "position": "RB",
      "team": "EXA",
      "player": { "name": "Sample RB1", "position": "RB", "team": "EXA" },
      "recommendation_type": "roster_fit",
      "headline": "Secure the sample lead back before the value tier breaks",
      "rationale": "...",
      "reasoning": ["..."],
      "confidence_score": 84,
      "risk_level": "low",
      "vorp_score": 18.6
    }
  ]
}
```

`GET /api/draft-assistant/adp`
- Auth: none required (optional Yahoo enrichment via `Authorization` header)
- Query params: `format` (ppr/half-ppr/standard, required), `teams` (integer 1–20, required)
- Dev/no-Redis: returns mock ADP
- Prod + Redis: attempts live Yahoo ADP, falls back to mock on failure

**Questions for Codex:**

1. `is_mock: true` is always present in the current `/recommendations` response. Should the frontend show a MockBanner/preview label on all Draft Assistant output until live data is available? Or does the `note` field cover this sufficiently?

2. What is the shape of the ADP response? `buildMockAdpResponse` is imported from `src/services/adp.js` — the frontend needs to know the response shape to render the ADP table. Please document the ADP response shape in `backend-to-frontend.md`.

3. Is there a player roster / available players list endpoint, or does Draft Assistant operate purely from a position-needs + ADP model? The UI input design depends on whether users enter picked players or just position needs.

4. `recommendation_type` has four values: `best_available`, `roster_fit`, `value_pick`, `risk_adjusted`. Should the UI display these as labels on each recommendation card?

**Frontend states required:**
- loading (POST in flight)
- success with `is_mock: true` (current default — show MockBanner)
- success with `is_mock: false` (future live state)
- empty (no recommendations returned)
- error (network/server failure)

---

### Request 8 — Omen context: how does the frontend populate the MVP Move request

**Date:** 2026-05-24
**Owner:** Claude Code / frontend
**Feature:** Omen / MVP Move (`/omen`)
**Priority:** ~~High~~ **Resolved 2026-05-24**

**Resolution update 2026-05-25:** Codex shipped the live Omen MVP route. `status === 'ready'` is now emitted when the user has usable Yahoo context and an active subscription. Frontend must not build league/platform selectors for Yahoo v1; the live request body is `{}` and the backend infers context from stored platform connections. Sleeper and ESPN return `pending_live_engine` until their live engines are ready. See `backend-to-frontend.md` Dashboard And Omen Gate Contract and Draft Assistant And Omen Context Response sections.

**Frontend need:**

`POST /api/omen/mvp-move` requires `platform`, `league_id`, `team_id`, `season`, `week`, `scoring_format`. The Frontend Alignment Audit in this file notes that the mounted Omen "lets the backend infer platform, league, team, and week where possible." But the frontend needs to know exactly which fields it must supply vs. which the backend can infer from auth context.

**Questions for Codex:**

1. Can the backend infer `platform`, `league_id`, `team_id`, `season`, `week`, and `scoring_format` entirely from the user's auth session and connected platform data — or must the frontend pass them explicitly?

2. If a user has leagues on multiple platforms (e.g. Sleeper + Yahoo): does the backend pick the "primary" league, or does the frontend need to let the user choose a platform and league before calling the endpoint?

3. Does the backend know the current NFL week, or must the frontend pass `week`? If the frontend must supply it, is there an endpoint to get the current season and week?

4. If a user has one connected league, is the minimal valid request just:
```json
{
  "platform": "sleeper",
  "league_id": "league-1",
  "scoring_format": "ppr",
  "season": 2026,
  "week": 8
}
```
...and the backend fills in `team_id` and all signal fields from stored context?

**Frontend design this drives:**

- If backend infers all context: Omen screen needs no configuration UI — just a "Get my MVP Move" button.
- If frontend must supply week: Omen needs a week picker.
- If user can have multiple leagues: Omen needs a league/platform selector before the call.
- The simpler the answer, the faster the build.

---

### Request 11 — Omen live route status update

**Date:** 2026-05-24
**Owner:** Claude Code / frontend
**Feature:** Omen / MVP Move live route
**Priority:** ~~Informational~~ **Resolved 2026-05-25 / re-applied 2026-05-26**

**Resolution:** Changes from 2026-05-25 (prior worktree) re-applied in worktree cool-darwin-c7c0d7 on 2026-05-26. Commit: `7c0a25d`.

Applied in this worktree:
- Live request body is `{}` — `buildOmenRequest()` removed. Backend infers all context from stored platform connections.
- 401 (`omen_auth_required`): stores `/omen` in `corvus.auth.next` localStorage, redirects to `/login`.
- 402 (`omen_subscription_required`): renders `UpgradeState` inline — defense-in-depth behind the gate layer in `OmenPage`/`Football`.
- `needsSubscription` state added to `useOmenData` hook.

**Frontend changes confirmed:**

- `OmenOfTheWeek.jsx` sends `body: {}` — backend infers all context from stored Yahoo credentials.
- `401 omen_auth_required`: sets `localStorage['corvus.auth.next'] = '/omen'` then `navigate('/login')` — user returns to Omen after re-auth.
- `402 omen_subscription_required`: renders `UpgradeState` inline — defense against subscription lapsing between dashboard gate and live call.
- `state: 'needs_subscription'` branch (set on 402): renders `UpgradeState` with Omen copy.
- `state: 'pending_live_engine'`: explicit branch — renders "Platform connected, live recommendations being prepared" — no longer falls through to empty state.
- `state: 'error'` (including `omen_live_generation_failed`): caught by existing error branch, shows retry button.
- Gate layers in `Football.jsx` and `OmenPage.jsx` still guard `OmenOfTheWeek` from rendering before `status === "ready"`. In-component 401/402 handling is defense-in-depth for race conditions.

**No backend change requested.**

---

### Request 9 — Stripe checkout/portal contract + resolved success_url mismatch

**Date:** 2026-05-24
**Owner:** Claude Code / frontend
**Feature:** Account page — upgrade flow / subscription management
**Priority:** ~~High~~ **Resolved 2026-05-25 — backend contract answered**

**Resolution:** Codex fixed the Stripe return route and chose Account as the canonical subscription return screen. Checkout success returns to `/account?subscribed=true`; checkout cancel returns to `/account?cancelled=true`; portal returns to `/account`. `GET /api/dashboard/summary` now exposes a safe `subscription` block for Account UI. See `backend-to-frontend.md` Stripe Account Subscription Contract.

**Contract confirmed from `src/routes/stripe.js` (frontend read-only, no changes made):**

`POST /api/stripe/checkout`
- Auth: required (`requireAuth`)
- Request body: `{ "plan": "monthly" | "season" }`
- Response: `{ "url": "<Stripe hosted checkout URL>" }`
- On success: frontend should `window.location.href = url` (Stripe redirect)
- On 503: Stripe not configured in env — show fallback message, do not crash
- Plan details:
  - `"monthly"` → subscription mode, 7-day free trial
  - `"season"` → one-time payment mode (no trial)

`POST /api/stripe/portal`
- Auth: required (`requireAuth`)
- Request body: none
- Response: `{ "url": "<Stripe customer portal URL>" }`
- On success: frontend should `window.location.href = url`
- On 404: user has no Stripe customer record (not yet subscribed) — show checkout instead of portal

**Original bug - `success_url` mismatch (resolved):**

`src/routes/stripe.js` previously set:
```js
success_url: `${config.appBaseUrl}/dashboard?subscribed=true`
```

No `/dashboard` route exists in the frontend router. Codex resolved this by choosing Account as the canonical subscription return screen.

**Actual backend resolution:**

```
success_url: /account?subscribed=true
cancel_url: /account?cancelled=true
portal return_url: /account
```

**Questions for Codex:**

1. Is there an endpoint to check current subscription status (is_subscribed, plan type, trial status, renewal date) — or should the frontend rely solely on `GET /api/dashboard/summary` which returns no subscription fields today?

2. Does the `/dashboard/summary` response need a `subscription` block (e.g. `{ is_subscribed: true, plan: "monthly", trial_ends_at: "ISO" }`) so the Account page can show "Manage subscription" (portal) vs. "Upgrade to Pro" (checkout)?

3. After `cancel_url: ${config.appBaseUrl}/?cancelled=true` — should the frontend show anything on the landing page for `?cancelled=true`, or silently ignore it?

**Frontend states the Account page upgrade section will need:**
- `subscription_unknown` — summary loading (skeleton)
- `not_subscribed` — show plan picker (monthly vs. season) + checkout CTA
- `subscribed` — show "You are on Corvus Pro" + Manage subscription (portal CTA)
- `trial` — show trial expiry + Manage subscription
- `checkout_error` — Stripe 503, show fallback message
- `portal_error` — portal 404 or 503, degrade gracefully
- `?upgrade=true` entry — auto-scroll to plan picker, highlight Pro section
- `?subscribed=true` return — show success confirmation banner

---

### Request 10 — Account page subscription section build

**Date:** 2026-05-24
**Owner:** Claude Code / frontend
**Feature:** Account page (`/account`) — subscription section
**Priority:** ~~High~~ **Resolved 2026-05-26**

**Resolution:** Built in worktree cool-darwin-c7c0d7 on 2026-05-26. Commit: `7c0a25d`.

What was built:
- `SubscriptionSection` component reads `GET /api/dashboard/summary.subscription`
- Not subscribed: plan picker with Monthly ($9/mo, 7-day trial) and Season Pass ($49) CTAs → `POST /api/stripe/checkout`
- Subscribed: "Corvus Pro — Active" with renewal/expiry date + Manage Subscription → `POST /api/stripe/portal`
- Trial: trial end date + Manage Subscription
- `?upgrade=true`: auto-scrolls to subscription section, highlights upgrade callout
- `?subscribed=true`: shows success banner, cleans param from URL
- `?cancelled=true`: cleans param from URL silently
- Portal 404 (no customer record) degrades gracefully to checkout prompt
- Stripe 503 shows "temporarily unavailable" copy without crashing

**Note:** Plan prices confirmed by Justin as $5/mo and $20 season — updated in commit `98c3a05`. Stripe dashboard update still required before checkout goes live — see Request 18.

---

## Frontend Alignment Audit

Date: 2026-05-24

Owner: Codex/frontend alignment pass

Feature: Corvus dashboard IA and Omen / MVP Move contract alignment

Status: No backend request opened.

Findings:

- Active UI work belongs in `frontend/`; `client/` appears stale because it has no `client/src`.
- `/football` remains the protected app entry point and `Football.jsx` is the dashboard shell.
- Trade Analyzer is the front door, Draft Assistant is the seasonal preparation tool, and Omen of the Week / MVP Move is the weekly main event.
- Standalone Start/Sit and Waiver tabs were removed from primary dashboard navigation so those decisions remain represented inside Omen / MVP Move.
- `OmenOfTheWeek.jsx` remains the mounted production Omen display. `Omen.jsx` remains unmounted and should be treated as a dev/contract harness until Justin decides whether to retire it or extract fixtures from it.
- Mounted Omen now calls `POST /api/omen/mvp-move` with the intended decision scope and signal toggles while letting the backend infer platform, league, team, and week where possible.
- Omen already handles `success`, `empty`, `platform_disconnected`, `espn_*` recovery states, and `error`, including confidence, risk, signals, and ESPN recovery CTA behavior.

Backend need:

None for this pass. A later backend request may be useful if the dashboard should expose a preferred platform, league, team, week, or scoring format for the mounted Omen request.

---

### Request 13 — Omen live path for Sleeper users

**Date:** 2026-05-25
**Owner:** Claude Code / frontend audit
**Feature:** Omen of the Week (`/omen`, `/football` omen tab)
**Priority:** ~~High — Sleeper users pay for Pro and see `pending_live_engine` permanently~~ **Resolved 2026-05-27**

**Resolution:** Codex aligned `GET /api/dashboard/summary` with the already-wired live MVP route. Subscribed users with usable Yahoo, Sleeper, or ESPN league context now receive `tools.omen_of_the_week.status === "ready"`. `POST /api/omen/mvp-move` still uses body `{}` and infers platform, league, team, and week server-side. Waiver Wire remains Yahoo-only. See `backend-to-frontend.md` Current Week And Sleeper Omen Gate Update.

**Frontend need:**

`GET /api/dashboard/summary` returns `omen_of_the_week.status === "pending_live_engine"` for all non-Yahoo users. The frontend correctly gates behind this status, but it means Sleeper subscribers cannot access Omen at all even with a paid subscription and a connected league.

**Questions for Codex:**

1. What does `POST /api/omen/mvp-move` need to receive a Sleeper-sourced roster? Does it need `platform: "sleeper"`, `league_id`, `team_id`, and `week` explicitly — or can the backend infer these from the connected platform record?

2. Does `src/services/omen.js` or the Omen route need a new adapter path for Sleeper, or is the roster normalization contract already platform-agnostic?

3. When Sleeper is wired: what triggers the gate status to change from `pending_live_engine` to `ready` in `buildOmenTool()` inside `src/routes/dashboard.js`?

4. Is there an NFL current-week detection mechanism the backend can use for Sleeper, or must the frontend pass `week` explicitly?

**Frontend states this unlocks:**

- Sleeper users who are subscribed see live Omen output instead of the "being prepared" empty state.
- No frontend changes expected unless the request shape changes.

---

### Request 14 — NFL current week endpoint

**Date:** 2026-05-25
**Owner:** Claude Code / frontend audit
**Feature:** Omen, Waiver Wire, Start/Sit (any feature requiring week context)
**Priority:** ~~Medium — blocks seamless Sleeper + ESPN Omen experience~~ **Resolved 2026-05-27**

**Resolution:** Codex added `GET /api/system/current-week`. It is public, requires no query/body, and returns `contract_version`, `generated_at`, `season`, `week`, and `season_type`. Live Omen does not need frontend-supplied week; standalone roster utilities can call this endpoint before passing an explicit `week`. See `backend-to-frontend.md` Current Week And Sleeper Omen Gate Update.

**Frontend need:**

`GET /api/sleeper/roster` currently requires an explicit `week` query param. The route comment says "until Sleeper week detection is added." If Omen is wired for Sleeper, the frontend needs to know the current NFL week to pass it, or the backend needs to infer it.

**Requested contract:**

```
GET /api/system/current-week
```
Response:
```json
{
  "season": 2026,
  "week": 8,
  "season_type": "regular"
}
```

**Alternatively:** confirm that the backend can infer the current week from the NFL calendar without a frontend-supplied param, and update the `POST /api/omen/mvp-move` contract accordingly.

**Frontend states this drives:**

- If the endpoint exists: Omen, waiver, and roster calls auto-populate week. No week picker needed.
- If the frontend must supply week: Omen needs a week picker UI before the call.

---

---

### Request 15 — `waitlist_signups` Supabase table creation (launch blocker)

**Date:** 2026-05-26
**Owner:** Claude Code / frontend audit → Codex / backend (Supabase migration)
**Feature:** Landing page — waitlist form
**Priority:** High — launch blocker. **Backend SQL prepared 2026-05-27; applying to Supabase still requires Justin approval.**

**Resolution update:** Codex added `public.waitlist_signups` to `sql/corvus_rls_security.sql` with RLS enabled and insert-only browser access for `anon` and `authenticated` roles. Duplicate emails are intentionally allowed for launch so repeat submissions do not become generic frontend errors. No Supabase staging/prod migration was applied. See `backend-to-frontend.md` Supabase Launch SQL And Stripe Pricing Update.

**Frontend need:**

`Landing.jsx` calls `supabase.from('waitlist_signups').insert({ email, platform })` directly from the browser using the anon key. The table does not exist in Supabase yet. On insert failure, the form shows a generic error. The `waitlist_signups` table must be created before launch.

Required schema (already documented in `Landing.jsx:337`):

```sql
CREATE TABLE waitlist_signups (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  platform   text,
  created_at timestamptz default now()
);
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert" ON waitlist_signups FOR INSERT TO anon WITH CHECK (true);
```

No SELECT, UPDATE, or DELETE for the anon role. Adding a unique constraint on `email` is optional — evaluate whether duplicate submissions should be blocked silently or surfaced to the user.

**Approval required:** Justin must approve applying this migration to Supabase staging then production.

**No frontend code change needed.** The form call is already correct — it will start working as soon as the table exists and RLS policy is applied.

---

### Request 16 — Supabase schema migration for subscription display (launch blocker)

**Date:** 2026-05-26
**Owner:** Claude Code / frontend audit → Codex / backend (Supabase migration)
**Feature:** Account page — subscription section
**Priority:** High — launch blocker. **Backend SQL prepared 2026-05-27; applying to Supabase still requires Justin approval.**

**Resolution update:** Codex added explicit `ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at/current_period_end` repair SQL to `sql/corvus_rls_security.sql`. This is necessary because `CREATE TABLE IF NOT EXISTS` does not repair missing columns on an existing table. No Supabase staging/prod migration was applied. See `backend-to-frontend.md` Supabase Launch SQL And Stripe Pricing Update.

**Frontend need:**

`Account.jsx` reads `summary.subscription.current_period_end` and `summary.subscription.trial_ends_at` to display renewal/expiry dates in the `ActiveSubscription` component. Without the schema columns applied, these values will be `null` and the date display will be silently blank.

The migration is `sql/corvus_rls_security.sql` per the backend evidence report.

**Approval required:** Justin must approve applying the migration. Once applied, the Account page subscription display will work without any frontend changes.

---

### Request 17 — Legacy route caller audit result (informational — no action needed)

**Date:** 2026-05-26
**Owner:** Claude Code / frontend audit
**Feature:** Backend compat route retirement
**Priority:** ~~Informational~~ **Resolved 2026-05-27**

**Resolution:** Codex retired the listed legacy compat handlers with explicit `410 Gone` JSON responses and canonical route hints where replacements exist. Broad route mounts were preserved for active canonical/launch routes. No frontend code change expected because launch validation already found zero frontend callers. See `backend-to-frontend.md` Legacy Compat Route Retirement Update.

**Result:**

Frontend launch validation confirms the `frontend/` app calls **zero legacy compat routes**. All API calls target canonical routes. The following backend compat routes have no frontend callers and can be retired at any time:

- `POST /api/optimizer/mvp-move`
- `POST /api/auth/sleeper/connect`
- `GET /api/auth/yahoo/authorize`
- `GET /api/auth/yahoo/callback`
- `POST /api/auth/espn/connect`
- `GET /api/league/standings`

**No backend action required on frontend's part.** Retirement is a backend-only decision.

---

---

### Request 18 — Plan pricing display confirmation

**Date:** 2026-05-26 / Updated 2026-05-27
**Owner:** Claude Code / frontend
**Feature:** Account page — subscription plan picker
**Priority:** ~~Medium~~ **Display resolved 2026-05-27 — Stripe dashboard action still needed from Justin**

**Resolution (code):** Justin confirmed prices: `$5/mo` (Monthly, 7-day trial) and `$20` (Season Pass, one-time). `Account.jsx` updated — commit `98c3a05`. Backend `GET /api/stripe/prices` already added by Codex; it returns `null` on fallback rather than hardcoded amounts so no backend change needed.

**Break-even confirmed:** Omen runs on a self-hosted Ollama instance (Gemma 3 4B) — zero per-call AI charges. $5/mo is comfortably viable.

**Action still required from Justin (Stripe dashboard — ops, not code):**

The frontend now displays `$5/mo` and `$20` but Stripe will charge whatever is on the Price objects in your Stripe dashboard. There is a price mismatch until you update those — users would see `$5` but get charged the old amount at checkout.

Steps required in the [Stripe dashboard](https://dashboard.stripe.com) before enabling checkout:

1. Archive the old Monthly price (`STRIPE_MONTHLY_PRICE_ID`) — Stripe prices cannot be edited, only replaced.
2. Create a new Monthly price: `$5.00 USD`, recurring monthly, 7-day trial.
3. Update `STRIPE_MONTHLY_PRICE_ID` in your environment to the new price ID.
4. Archive the old Season Pass price (`STRIPE_SEASON_PRICE_ID`).
5. Create a new Season Pass price: `$20.00 USD`, one-time payment.
6. Update `STRIPE_SEASON_PRICE_ID` in your environment to the new price ID.

Do not enable public checkout until steps 3 and 6 are done.

---

## Request Template

```text
Date:
Owner:
Feature:
Needed by:

Frontend need:

Expected endpoint or contract:

Required states:
- loading
- success
- empty
- error
- disconnected

Plain-English output needed:

Notes / risks:
```
