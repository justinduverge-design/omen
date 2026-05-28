# Corvus Launch Validation — Frontend Owner Report

Date: 2026-05-26

Owner: Frontend (Layer 1)

Mode: Finish mode — evidence, QA, launch-truth validation

Paired with: `corvus-launch-validation-backend-evidence-2026-05-26.md`

---

## Executive Summary

The `frontend/` app is structurally complete, builds cleanly, and routes to all canonical backend endpoints. No legacy routes are called from the frontend — the backend can retire compat routes without any frontend migration cost. Two blockers exist before public launch: the Supabase `waitlist_signups` table must be created, and the Stripe checkout return URLs must be confirmed in the Stripe dashboard. Everything else is launch-ready or correctly deferred.

---

## Build Status

- `npm --prefix frontend run build`: Passes. Emits `frontend/dist`.
- Vite config sets `envDir` to the repo root (`..`), so `VITE_*` vars are read from the root `.env` file.
- **Known warning**: Vite prints a `NODE_ENV=production` warning because `NODE_ENV` is set in the root `.env`. Vite manages mode itself and ignores `NODE_ENV` from `.env` files. The build output is correct, but the warning should be suppressed before launch by removing `NODE_ENV` from `.env` and relying on `--mode production` in the build script instead.

---

## Frontend Route Inventory

All routes defined in `frontend/src/routes/index.jsx`.

### Active at launch

| Path | Component | Auth required |
|---|---|---|
| `/` | `Landing` | No |
| `/login` | `Login` | No |
| `/trade` | `TradeAnalyzer` | No |
| `/draft` | `DraftAssistant` | No |
| `/account/connect` | `ConnectLeague` | Self-managed gate |
| `/account` | `Account` | Yes — ProtectedRoute |
| `/football` | `Football` | Yes — ProtectedRoute |
| `/omen` | `OmenPage` | Yes — ProtectedRoute |
| `*` | `NotFound` | — |

### Deferred pages (files present, not routed)

| File | Status |
|---|---|
| `StartSit.jsx` | File exists, not in router. Confirmed deferred by Layer 1. Matches backend deferral. |
| `WaiverWire.jsx` | File exists, not in router. Confirmed deferred by Layer 1. |
| `Omen.jsx` | Standalone page file exists but is not in the router. `OmenPage.jsx` is the live route for `/omen`. No action required unless a separate entry point is planned. |

---

## API Route Caller Audit

All calls originate from `frontend/src/lib/api.js` via `apiFetch()` with Supabase Bearer token injection.

| Frontend caller | Backend route | Status |
|---|---|---|
| `Football.jsx`, `OmenPage.jsx`, `Account.jsx` | `GET /api/dashboard/summary` | Canonical. OK. |
| `OmenOfTheWeek.jsx` | `POST /api/omen/mvp-move` | Canonical. OK. |
| `TradeAnalyzer.jsx` | `POST /api/trade/compare` | Canonical. Public route. OK. |
| `PlatformConnections.jsx` | `GET /api/platforms/status` | Canonical. OK. |
| `PlatformConnections.jsx` | `POST /api/platforms/sleeper/connect` | Canonical. OK. |
| `PlatformConnections.jsx` | `POST /api/platforms/espn/connect` | Canonical. OK. |
| `PlatformConnections.jsx` | `DELETE /api/platforms/:platform` | Canonical. OK. |
| `PlatformConnections.jsx` | `GET /api/yahoo/auth` (window.location redirect) | Canonical. OK. |
| `Account.jsx` | `POST /api/stripe/checkout` | Canonical. OK. |
| `Account.jsx` | `POST /api/stripe/portal` | Canonical. OK. |

**Legacy route caller check: NONE.** The frontend does not call any of the following backend compat routes:
- `POST /api/optimizer/mvp-move`
- `POST /api/auth/sleeper/connect`
- `GET /api/auth/yahoo/authorize`
- `GET /api/auth/yahoo/callback`
- `POST /api/auth/espn/connect`
- `GET /api/league/standings`

**Conclusion**: The backend can retire all compat routes without any frontend migration.

---

## Auth Flow Validation

- `ProtectedRoute` checks Supabase session and redirects to `/login` with a stored next-URL if unauthenticated. Correct.
- `Account.jsx` has its own session gate (pre-ProtectedRoute check) to handle subscription-related deep links.
- `apiFetch` attaches the Supabase `access_token` as a Bearer header on every request. Backend auth middleware will see a valid JWT or reject with 401.
- **Build-time requirement**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be present in the root `.env` before the production build. If absent, `lib/supabase.js` will initialize without keys and all auth calls will fail silently in the catch block. Verify these exist before cutting a prod build.

---

## Stripe Frontend Flow

- **Checkout**: `Account.jsx` `POST /api/stripe/checkout` → receives `{ url }` → `window.location.href = url`. After payment, Stripe redirects to `/account?subscribed=true`. Banner fires, URL param is cleaned up. Correctly implemented.
- **Portal**: `Account.jsx` `POST /api/stripe/portal` → receives `{ url }` → `window.location.href = url`. Return URL assumed to be `/account`. Correctly implemented.
- **Cancelled**: Stripe cancel URL expected to return to `/account?cancelled=true`. Banner handles this. Correct.
- **Error handling**: 503 (Stripe unavailable) and 400 (invalid plan) are handled with user-facing copy. Correct.
- **Not validated**: The Stripe dashboard test-mode price IDs, webhook secret, checkout success/cancel return URLs, and portal return URL must be configured before real-money validation. This is a Stripe config task, not a frontend code change.

---

## Subscription UI

- `Account.jsx` renders a plan picker (Monthly / Season Pass) for unsubscribed users and an `ActiveSubscription` block for subscribed users.
- `current_period_end` and `expires_at` are read from the dashboard summary subscription object. Display logic is correct.
- `can_manage_billing` gates the "Manage subscription" portal button. If the backend doesn't return this field, the button won't appear — safe default.
- **Dependency**: The Supabase schema migration (`trial_ends_at`, `current_period_end` columns) must be applied before subscription data surfaces correctly. Justin must approve this migration before launch. Frontend is already reading these fields.

---

## Omen Feature Gate

The dashboard summary `tools.omen_of_the_week.status` field drives gating in both `Football.jsx` (tab view) and `OmenPage.jsx` (dedicated route). States handled:

| Backend status | Frontend response |
|---|---|
| `needs_platform` | `DisconnectedState` with CTA to `/account/connect` |
| `needs_subscription` | `UpgradeState` with upgrade CTA |
| `pending_live_engine` | `EmptyState` — platform connected, live engine pending |
| `ready` (or summary unavailable) | `OmenOfTheWeek` — handles its own live/error/empty/mock states |

`OmenOfTheWeek.jsx` handles all backend `state` values from `POST /api/omen/mvp-move`: `needs_subscription`, `pending_live_engine`, ESPN recovery states (`espn_reauth_required` etc.), `platform_disconnected`, `empty`, `error`, and `success`. All wired correctly.

---

## ESPN Feature Flag

`VITE_ESPN_ENABLED=true` must be set in the root `.env` to show the ESPN card in `PlatformConnections`. Not set by default. Correct gating for launch — matches backend recommendation to keep public ESPN claims out of launch until recovery QA is proven.

Recovery flows from Omen → `/account?recovery=espn_*` are already wired and will show the ESPN card even when `VITE_ESPN_ENABLED` is false, if the user arrives via an ESPN recovery CTA.

---

## Waitlist

`Landing.jsx` includes a waitlist form that inserts to `supabase.from('waitlist_signups')` directly from the browser using the anon key.

**Blocker**: The `waitlist_signups` table does not exist in Supabase. The required schema and RLS policy are documented in a `TODO [Codex]` comment at `Landing.jsx:337`. The form will fail silently (shows a generic error) until this table is created.

Required schema (from the TODO comment):
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

This is a Supabase migration. Justin must approve applying it.

---

## `client/` Directory Note

A second frontend directory exists at `corvus/client/`. It has its own `package.json` (name: `ssffmvp-client`), `vite.config.js`, and `index.html`, but its `src/` directory is empty and the only React file outside it is `client/PrivacyPolicy.jsx`. This directory is not part of the production build and appears to be a legacy artifact. It is not a launch blocker, but it should be archived or removed to avoid confusion after launch.

---

## Blockers

| # | Blocker | Owner | Action |
|---|---|---|---|
| 1 | `waitlist_signups` table missing in Supabase | Justin (approval) + Codex (apply migration) | Apply the schema from `Landing.jsx:337` |
| 2 | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` not verified in prod build env | Justin | Confirm values are in root `.env` before prod build |
| 3 | Stripe checkout success/cancel return URLs not confirmed in Stripe dashboard | Justin | Set to `{prod-domain}/account?subscribed=true` and `{prod-domain}/account?cancelled=true` |
| 4 | Supabase schema migration (`trial_ends_at`, `current_period_end`) not applied | Justin (approval) | Linked to backend blocker — subscription display depends on it |

---

## Warnings (Non-blocking)

| # | Warning | Recommendation |
|---|---|---|
| W1 | `NODE_ENV=production` in root `.env` triggers a Vite build warning | Remove `NODE_ENV` from `.env`; Vite sets it automatically from `--mode` |
| W2 | `client/` directory is a legacy artifact not used in production | Archive or delete after launch |
| W3 | `Omen.jsx` page file exists but is not routed | Confirm intentional or remove before launch to avoid dead code |

---

## Confirmed Deferrals

- `StartSit.jsx` — not routed. Deferred. Aligned with backend.
- `WaiverWire.jsx` — not routed. Deferred. Aligned with backend.
- Standalone `/omen` route exists but is only reachable if users navigate directly; the primary entry point is the `/football` dashboard tab. Both work.

---

## Recommended Next Steps

1. **Justin approves**: Supabase `waitlist_signups` migration and `corvus_rls_security.sql` schema migration.
2. **Codex applies** both migrations to staging, then production.
3. **Justin confirms** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and Stripe return URLs in the prod environment before cutting the prod build.
4. **Frontend owner cleans up**: Remove `NODE_ENV=production` from root `.env`, archive `client/`, remove or route `Omen.jsx`.
5. **Real Stripe test-mode validation** (per backend report) before flipping to live keys.
