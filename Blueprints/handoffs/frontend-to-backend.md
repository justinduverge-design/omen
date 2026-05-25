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
**Priority:** High — building Draft Assistant UI; contract read from code, needs Codex confirmation before wiring

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
**Priority:** High — building Omen.jsx; need to know whether backend infers context or frontend must supply it

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
