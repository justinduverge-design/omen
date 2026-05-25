# Frontend To Backend Handoff

## Purpose

Claude/frontend writes backend contract requests here.

Codex/backend reads this file before backend work and responds in `backend-to-frontend.md`.

## Active Context

- Corvus is the Fantasy Football MVP product.
- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit lives inside Omen / MVP Move.
- Waiver logic lives inside Omen / MVP Move unless explicitly separated later.
- Yahoo, Sleeper, and ESPN all matter.
- ESPN is essential but risky and needs recovery playbooks.
- Users need plain-English reasoning, not heavy math.

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
**Priority:** High — frontend has built UI for all four providers; three are unverified

**Frontend need:**

The `/login` screen now renders buttons for all four auth providers:
- Google OAuth (`supabase.auth.signInWithOAuth({ provider: 'google' })`)
- Apple Sign In (`supabase.auth.signInWithOAuth({ provider: 'apple' })`)
- Discord OAuth (`supabase.auth.signInWithOAuth({ provider: 'discord' })`)
- Email magic link (`supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: origin + '/login' } })`)

All four use `redirectTo: window.location.origin + '/login'` as the OAuth callback destination.

Email magic link is the only confirmed-wired provider. The other three require Supabase dashboard configuration.

**Requested from Codex:**

Confirm which of the following are configured in the Supabase project Auth → Providers settings:
1. Google — client ID + secret, redirect URL whitelisted?
2. Apple — service ID + key configured, redirect URL whitelisted?
3. Discord — application client ID + secret, redirect URL whitelisted?

For each unconfigured provider: confirm whether it is safe to show the button to users (fails gracefully with an error Supabase returns) or whether the button should be hidden until configuration is complete.

**Frontend behavior if provider errors:** Supabase returns an error from `signInWithOAuth()` — the Login screen catches it and shows the error message inline. Users will not be silently dropped. This is an acceptable degraded state for launch if the providers are not configured yet, but Justin needs to know which providers actually work before approving the sign-in screen.

**Do not guess — confirm from Supabase dashboard or project config, not from repository code.**

---

### Request 3 — Draft Assistant endpoint auth status

**Date:** 2026-05-24
**Owner:** Claude Code / frontend
**Feature:** Draft Assistant (`/draft`)
**Priority:** Medium — `/draft` is now a public route, backend status unknown

**Frontend need:**

`/draft` is now a public route (no auth required). The DraftAssistant page calls backend endpoints for recommendations.

**Requested from Codex:**

Confirm which endpoint(s) Draft Assistant calls and whether they require auth. Specifically:
- What is the Draft Assistant endpoint path and method?
- Is auth required on that endpoint?
- If auth is currently required, can it be opened to unauthenticated callers the same way `POST /api/trade/compare` was opened in the Stage 1.5 pass?

Draft Assistant is free this season. Unauthenticated access should work. If the endpoint requires auth today, this is a blocking gap for the public `/draft` route.

---

### Request 4 — ESPN card build flag clarification

**Date:** 2026-05-24
**Owner:** Claude Code / frontend
**Feature:** ConnectLeague screen — ESPN card
**Priority:** Low — affects ESPN visibility in production builds

**Frontend need:**

The ESPN card in `ConnectLeague.jsx` is hidden unless `VITE_ESPN_ENABLED=true` is set at build time (matching the existing behavior in `PlatformConnections.jsx`). If ESPN is already connected for a user, the card shows regardless of the flag.

**Requested from Codex:**

Confirm the intended build flag behavior for production:
- Should `VITE_ESPN_ENABLED` be `true` in the production Oracle build?
- Or should ESPN remain hidden in production until explicitly enabled?
- Is the ESPN connect endpoint (`POST /api/platforms/espn/connect`) stable enough for production use, or is it still in a soft-launch / feature-gated state?

This does not require a code change — it is a deploy config decision. Respond with the intended flag value for the production build and the Oracle deploy environment.

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

