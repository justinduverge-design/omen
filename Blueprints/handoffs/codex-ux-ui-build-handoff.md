# Codex UX/UI Build Handoff

**Date:** 2026-05-24
**Updated:** 2026-05-24 (Justin approval pass — open questions resolved)
**From:** Claude Code (design/planning pass)
**To:** Codex (frontend implementation)
**Status:** Ready for build — all product decisions resolved

---

## Required Reading Before Any Code

Read all five docs before writing any code:

| Document | Location |
|---------|---------|
| UX/UI direction decisions | `slops-saloon/Direction/decisions/corvus-ux-ui-direction-v1.md` |
| Slops OS app template spec | `slops-saloon/Blueprints/specs/slops-os-app-template-spec.md` |
| Corvus design system v1 | `corvus/Blueprints/specs/corvus-ux-ui-design-system-v1.md` |
| Sign in / connect league spec | `corvus/Blueprints/specs/sign-in-connect-league-screen-spec.md` |
| This handoff | `corvus/Blueprints/handoffs/codex-ux-ui-build-handoff.md` |

---

## Product Guardrails — Do Not Violate

These are non-negotiable product decisions. Do not interpret them, do not find workarounds.

| Rule | Reason |
|------|--------|
| Do NOT build generic AI chat | Corvus is a decision tool, not a chatbot. No open-ended chat interface at any point in the product. |
| Do NOT make Omen available without a connected league | Omen requires real roster data. No generic recommendation, no "sample" Omen. Show `DisconnectedState` until a league is connected. |
| Do NOT force signup for Trade Analyzer | Trade Analyzer is auth-free. No login wall, no "sign in to see results." The result must appear before any signup prompt. |
| Do NOT build a Slops Saloon parent page at `/` | At launch, `/` serves Corvus. The Slops Saloon parent-brand routing is a future decision. |
| Do NOT add team-color personalization | It is a future backlog item. Do not build it unless it already fits cleanly into an existing component with zero extra work. |
| Do NOT change the Omen/MVP Move backend contract | Already defined in `backend-to-frontend.md`. Do not alter the response shape or endpoint path. |
| Do NOT change Stripe gating logic | Subscription gating is already handled. Do not touch it. |

---

## What Codex Owns in This Build Phase

**Codex owns:** Backend contracts, endpoint implementation, platform adapter wiring, `?next=` redirect preservation logic, and confirming or building the platform status endpoint.

**Claude Code owns:** All frontend screen implementation, component building, routing, styling, and theme system.

Codex does not redesign screens or change component structure without explicit approval.

---

## Priority 1: Sign In Backend Contracts

Write all contracts to `Blueprints/handoffs/backend-to-frontend.md`.

### 1.1 — Auth redirect preservation (`?next=` param)

**This is the most important backend task for this screen.**

After Supabase OAuth redirect, the frontend must route the user to their pre-auth destination (e.g., Omen, not Dashboard). Supabase clears query params during OAuth. The preservation strategy must be decided.

**Codex must specify:**
- How `?next=` is preserved through the Supabase OAuth cycle (localStorage, cookie, Supabase state param, or other)
- Whether backend session state is needed or if it is purely frontend
- CSRF and open-redirect risks and mitigations
- What happens if the `?next=` destination is a protected route and the user skips league connection

The frontend will implement whatever the contract specifies. Write the decision clearly.

### 1.2 — Auth providers: confirm Supabase provider configuration

All four providers are shipping at launch:

| Provider | Supabase support | Action needed |
|---------|-----------------|---------------|
| Google | Existing | Confirm working |
| Apple | Existing | Confirm working |
| Discord | Likely existing | Confirm Discord OAuth app is configured in Supabase; document the Discord developer app credential requirement |
| Email magic link | Existing | Confirm working |

If Discord is not yet configured in Supabase, document the steps required and flag as a pre-launch task.

---

## Priority 2: League Connection Backend Contracts

### 2.1 — Sleeper league connection

**No backend contract or endpoint exists for this. Must be built.**

```
Feature: Sleeper league connection
Method: POST
Path: /api/platforms/sleeper/connect
Auth: Required (Supabase JWT)
```

Request:
```json
{
  "sleeper_username": "string"
}
```

Success response:
```json
{
  "status": "connected",
  "platform": "sleeper",
  "sleeper_user_id": "string",
  "leagues": [
    {
      "id": "string",
      "name": "string",
      "season": 2026,
      "scoring_format": "ppr" | "half_ppr" | "standard",
      "team_id": "string",
      "team_name": "string"
    }
  ]
}
```

Error responses:
```json
{ "status": "error", "code": "sleeper_user_not_found", "message": "We couldn't find that Sleeper username." }
{ "status": "error", "code": "sleeper_api_unavailable", "message": "Sleeper is unreachable right now. Try again in a moment." }
```

Frontend behavior: if `leagues` has more than one entry, show a league picker before completing connection. Store the selected `league_id` in the user's Corvus profile.

### 2.2 — Yahoo OAuth connect status

**Confirm or document gaps:**
- Does `GET /api/platforms` return Yahoo connection status?
- Does `POST /api/yahoo/connect` (or equivalent) work end-to-end in the current codebase?
- What recovery states exist? (disconnected, reauth_required)
- Write the confirmed contract to `backend-to-frontend.md`

### 2.3 — ESPN guided connect flow

The Omen contract already covers ESPN recovery states. The connect screen needs its own contract.

**ESPN UX direction (approved):** The in-product experience should walk the user through every step of the cookie-extraction process. This is not a warning page — it is a guided setup. The copy should be confidence-building, not apologetic.

```
Feature: ESPN cookie-based connect flow
Method: POST
Path: /api/platforms/espn/connect
Auth: Required (Supabase JWT)
```

Request:
```json
{
  "espn_s2": "string",
  "swid": "string"
}
```

Success response:
```json
{
  "status": "connected",
  "platform": "espn",
  "leagues": [
    { "id": "string", "name": "string", "season": 2026, "team_id": "string" }
  ]
}
```

Error responses (distinct, not collapsed):
```json
{ "status": "error", "code": "espn_cookies_invalid", "message": "ESPN didn't accept those cookies. They may be expired or copied incorrectly." }
{ "status": "error", "code": "espn_league_not_found", "message": "We connected to ESPN but couldn't find a fantasy football league for your account." }
{ "status": "error", "code": "espn_blocked", "message": "ESPN returned an unexpected response. Try reconnecting or check that your league is active this season." }
```

### 2.4 — Manual league entry (audit phase — do not build yet)

**Status: Audit required before contract is designed.**

Manual entry is a fallback connection option for users whose platform is not supported or who cannot complete an OAuth/cookie flow. It allows the user to enter their team data by hand.

**Codex must complete a data quality audit before the frontend is built or any contract is written.**

#### Audit scope

Codex evaluates what data a manual entry form can realistically collect, whether that data is sufficient to produce a real, honest Omen recommendation, and what the ceiling is on recommendation quality.

The audit must answer:

**What can Manual entry collect?**
- Team name
- Season year
- Scoring format (ppr / half_ppr / standard)
- Starting lineup rules (which positions, how many starters)
- Current roster (player names + positions, entered by the user)
- Current week's matchup opponent (optional — user may not know)
- Waiver wire pool (cannot be collected without a platform connection)

**What can Manual entry NOT collect?**
- Real-time waiver availability (Corvus has no access to the user's platform waiver wire)
- Opponent strength or matchup DvP (only possible if the user enters opponent players manually)
- Scoring settings beyond the top-level format (custom bonus structures, kicker rules, etc.)
- Transaction history (add/drop patterns, trade history)
- Injury or practice report status (Corvus can pull this from public sources, not platform-specific)

**Is that enough for honest Omen?**

Evaluate against each Omen decision type:

| Decision type | Manual feasible? | Constraints |
|--------------|-----------------|-------------|
| start_sit | Possibly | Requires roster + opponent. Waiver pool missing. |
| waiver_pickup | No | Waiver pool is unavailable without platform connection. |
| trade_suggestion | Limited | Can analyze trade value but cannot see available trading partners. |
| matchup_note | Possibly | Only if user enters opponent lineup or accepts generic matchup context. |

**Report format (write to `backend-to-frontend.md`):**

Codex writes a Manual Entry Feasibility Report covering:
1. What the form can collect (with proposed field schema)
2. Which Omen decision types are feasible given manual data
3. Which decision types are not feasible and why
4. Recommended `DataSourceLabel` values for manual-derived signals
5. Proposed confidence score adjustment (if any) when data is manual
6. A recommended checklist of required fields that must be complete before Omen is unlocked for manual users

**Framework to implement once audit is complete:**

This framework is approved and should be implemented once the audit confirms feasibility:

- **Incomplete manual entry:** Omen is locked. Trade Analyzer remains available.
- **Complete manual entry (checklist met):** Omen available for feasible decision types only. All manual-derived signals labeled `DataSourceLabel: manual`. Corvus must not claim waiver, opponent, or scoring data it does not have.
- **Connected platform:** Full Omen access. No manual labels needed.

The UI must clearly show which checklist items are missing and what each one unlocks. It should not show a locked error — it should show a progress state that encourages completion.

**Do not build the Manual entry frontend or API contract until the audit report is written.**
Justin reviews the report and makes the final call on whether Manual Omen ships, ships with limitations, or is deferred to a later version.

### 2.5 — Platform status endpoint

The frontend needs a single endpoint to check all platform connection statuses on load.
This powers `StatusBadge` in the nav, the Connect League screen, and the Omen `DisconnectedState`.

```
Method: GET
Path: /api/platforms
Auth: Required (Supabase JWT)
```

Expected response:
```json
{
  "platforms": {
    "sleeper": {
      "status": "connected" | "disconnected",
      "username": "string | null",
      "leagues": [{ "id": "string", "name": "string", "season": 2026, "selected": true }]
    },
    "yahoo": {
      "status": "connected" | "disconnected" | "reauth_required"
    },
    "espn": {
      "status": "connected" | "disconnected" | "reauth_required" | "espn_recovery_needed"
    },
    "manual": {
      "status": "connected" | "disconnected",
      "team_name": "string | null"
    }
  }
}
```

Confirm if this endpoint already exists. If yes, document its current shape. If no, build it.

---

## Priority 3: Design Token Integration

Codex handles the theme infrastructure. Claude Code handles screen implementation on top of it.

**Codex actions:**

1. Add CSS custom properties for dark and light mode to `frontend/src/index.css`. Token values are in `corvus/Blueprints/specs/corvus-ux-ui-design-system-v1.md`.
2. Extend `tailwind.config.js` with Corvus color tokens (`raven`, `charcoal`, `bone`, `gold`, `crimson`, `omen`) and font families (`serif: Cormorant Garamond`, `sans: Alegreya Sans`).
3. Add `data-theme` attribute switching logic (system default → user preference). Apply to the `<html>` element.
4. Implement `localStorage` persistence using the key `slops-theme`. Valid values: `dark`, `light`, `system`.
5. System theme: read `prefers-color-scheme` via `matchMedia`. Re-evaluate on OS theme change.

---

## Priority 4: Route Updates

Current router (`frontend/src/routes/index.jsx`) is missing required routes.

**Codex adds:**

| Route | Component | Auth required | Notes |
|-------|-----------|--------------|-------|
| `/login` | `SignIn.jsx` | No | New page |
| `/login?sent=true` | `SignIn.jsx` (sent state) | No | State passed via query param |
| `/account/connect` | `ConnectLeague.jsx` | Yes | New page, post-auth step |
| `/trade` | `TradeAnalyzer.jsx` | No | Exists, needs route |
| `/draft` | `DraftAssistant.jsx` | No | Exists, needs route |
| `/omen` | `OmenOfTheWeek.jsx` | Yes | Exists, needs route |

Use `ProtectedRoute` (`frontend/src/components/layout/ProtectedRoute.jsx`) for all auth-required routes.

**Launch routing:** `/` serves Corvus (the existing landing page). No change needed for launch.

---

## Priority 5: Component Scaffolding

Scaffold the following components if they do not already exist. Props and structure must match the design system spec. Do not fully style — that is Claude Code's job.

| Component | File | Purpose |
|-----------|------|---------|
| `SignIn` | `frontend/src/pages/SignIn.jsx` | Step 1 of the sign-in flow |
| `ConnectLeague` | `frontend/src/pages/ConnectLeague.jsx` | Step 2 — platform connection |
| `ConfidenceMeter` | `frontend/src/components/ui/ConfidenceMeter.jsx` | `score` (0–100) + `label` prop |
| `RiskBadge` | `frontend/src/components/ui/RiskBadge.jsx` | `level` (low/medium/high) + `reasons` prop |
| `StatusBadge` | `frontend/src/components/ui/StatusBadge.jsx` | Platform connection state indicator |
| `DataSourceLabel` | `frontend/src/components/ui/DataSourceLabel.jsx` | `status` (live/stub/mock/unavailable/manual) |
| `RecommendationCard` | `frontend/src/components/ui/RecommendationCard.jsx` | Full Omen output display |
| `EvidenceList` | `frontend/src/components/ui/EvidenceList.jsx` | List of signals used in recommendation |

Prop signatures should match the backend response contract in `backend-to-frontend.md`.

---

## Priority 6: Platform Status in Nav

`Header.jsx` should show platform connection status for authenticated users.
- Connected: platform badge or single "Connected" indicator
- Disconnected: "Connect a league" invite (links to `/account/connect`)

Requires the `GET /api/platforms` contract from Priority 2.5 above.

---

## Build Constraints

**Mobile-first:** All components must be built mobile-first (375px base, expand up).
No horizontal scroll. No text requiring pinch-to-zoom.

**Theme support:** Light, dark, and system modes must work before any screen is considered done.

**State coverage:** Every data-loading screen must handle: loading, success, empty, error, disconnected.

**Data labeling:** Mock, stub, manual, and unavailable data must always be labeled. Never present non-live data as live advice.

**Auth order:** Auth always comes before league connection. Always. Do not invert this.

**Omen gate:** Omen must show `DisconnectedState` for any authenticated user without a connected league. Do not show an empty recommendation, a generic recommendation, or a loading state that never resolves.

---

## What Is NOT In Scope

- Generic AI chat of any kind
- Slops Saloon parent landing page
- Social sharing, public trade links, leaderboards
- Team-color personalization
- Content hub, blog, or media features
- Any second Slops Saloon product
- Altering Stripe, Supabase schema, DNS, SSL, Nginx, or production secrets

---

## Remaining Backend Open Questions (Codex resolves)

| Question | Owner | Priority |
|---------|-------|---------|
| Discord OAuth app configured in Supabase? | Codex | High |
| `?next=` preservation strategy through Supabase OAuth | Codex | High |
| Sleeper connect endpoint | Codex | High — blocks frontend |
| Yahoo OAuth end-to-end status | Codex | High |
| ESPN connect guided flow contract | Codex | High |
| Manual entry — does it unlock Omen? | Codex (then Justin) | Medium |
| Platform status endpoint — does it exist? | Codex | High |
| Session duration for Corvus users | Codex | Medium |

Write all resolutions to `Blueprints/handoffs/backend-to-frontend.md`.

---

## Frontend Build Gate (Claude Code)

Claude Code begins building `SignIn.jsx` and `ConnectLeague.jsx` after:
1. Codex confirms or provides: `?next=` strategy, Sleeper contract, platform status contract
2. Theme token integration is done (Priority 3)
3. Routes are scaffolded (Priority 4)

Claude Code does not need to wait for Manual entry or Yahoo/ESPN contracts to start Step 1.

---

## End of Handoff

Backend questions and contract responses: write to `Blueprints/handoffs/backend-to-frontend.md`.
Frontend requests to backend: write to `Blueprints/handoffs/frontend-to-backend.md`.
