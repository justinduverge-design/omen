# Frontend to Backend Handoff

## Status

Canonical request queue. Updated 2026-05-19 (Phase 4+5 — Token Recovery UI, Omen Attribution Badge, Waiver Cleanup, ADP Display complete locally).

---

## Completed

### Phase 4+5 — Token Recovery UI, Omen Attribution Badge, Waiver Cleanup, ADP Display (2026-05-19)

**Task 4 — ADP Display in Draft Assistant (DraftAssistant.jsx)**

`DraftAssistant` now accepts a `platforms` prop (passed from `Football.jsx` via `summary?.platforms`) and fetches ADP on mount and on scoring format change:

```
GET /api/draft-assistant/adp?format={scoringFormat}&teams=12
```

Response shape the frontend consumes:

```json
{
  "is_mock": true,
  "format": "ppr",
  "teams": 12,
  "sources": {
    "ffc":   { "players": [{ "name": "Justin Jefferson", "position": "WR", "team": "MIN", "adp": 1.2, "player_id": "..." }] },
    "yahoo": { "players": [{ "name": "...", "adp": 2.5 }] },
    "mfl":   { "players": [{ "name": "...", "adp": 1.8 }] }
  }
}
```

Player name matching is **exact string match** on `player.name` against ADP source player names. A shared `player_id` cross-reference would improve this if name formatting diverges between sources.

Each `RecommendationCard` now renders an `AdpRow` beneath the reasoning list:
- **Primary chip** (amber): connected platform ADP — currently only Yahoo has ADP source data. Sleeper/ESPN connected users see no primary chip (graceful).
- **Corvus rank chip** (slate): always shown as `Corvus #N`.
- **Other sources** (small gray text): FFC, MFL, Yahoo (when Yahoo isn't the connected platform). FFC renders as an `<a>` link to `https://fantasyfootballcalculator.com` (attribution required). Others render as `<span>`.
- If ADP is loading: skeleton pulses. If no ADP data at all: row hidden. If a player has no ADP in any source: shows `—`.

`MockBanner` message now conditionally appends `" ADP data is preview only."` when `adpData?.is_mock` is true.

Backend fields needed:
- `is_mock` on the ADP response root (same pattern as other endpoints).
- `sources.yahoo.players` populated — likely empty in mock currently; Yahoo ADP is gracefully skipped if absent.
- FFC and MFL data can be static/cached; Yahoo should be dynamic if possible.

---

### Phase 4 — Token Recovery UI, Omen Attribution Badge, Waiver Cleanup (2026-05-19)

**Task 1 — Yahoo Token Expired Recovery UI (Football.jsx)**

`PlatformStatusBar` now reads `v?.status === 'token_expired'` from each platform object in `summary.platforms`. When present it renders an inline amber banner (non-blocking — connected platforms still show above it) with copy "{label} session expired — reconnect to restore your live data" and a "Reconnect {label} →" button that redirects to `/api/yahoo/auth`.

Backend contract needed: `GET /api/dashboard/summary` must include `status: "token_expired"` on the relevant platform object when the stored OAuth token has expired or been revoked. The existing `connected: false` alone is not sufficient — the frontend needs the `status` field to distinguish "never connected" from "expired token". Example:

```json
{
  "platforms": {
    "yahoo": { "connected": false, "status": "token_expired" }
  }
}
```

Until this field is added, the amber banner will never appear (graceful — no UI regression).

**Task 2 — Omen Attribution Badge (OmenOfTheWeek.jsx)**

Attribution line `Powered by Corvus · Week {week} · {scoring_format}` added inside the summary card, styled `text-xs text-gray-400`.

Backend field needed: `scoring_format` on the Omen response root (alongside `week`, `season`, `is_mock`). Currently absent from the mock and live response shapes — will display `—` until added.

Example addition to the response:

```json
{
  "week": 4,
  "season": 2026,
  "scoring_format": "PPR",
  ...
}
```

**Task 3 — WaiverWire Platform-Centric Cleanup (WaiverWire.jsx)**

- Platform selector dropdown removed; backend now infers platform from the authenticated user's linked account.
- Fetch updated: `GET /api/optimizer/waiver` (no `platform` query param; `week` still optional).
- Platform displayed as a badge pill (`border-slate-700 bg-slate-800`) next to the section header, read from `result.platform`.
- Shared `ErrorState` and `EmptyState` from `components/ui/` replace local implementations.
- `result.pool_size` still displayed. `result.recommendations[].available` guarded defensively but not relied on.

Backend fields confirmed present in mock and live responses — no new fields needed for Task 3.

---

### Corvus app backbone endpoints

Status: completed locally by Codex and wired locally by Claude Code.

- `GET /api/session` - session shell endpoint used by `ProtectedRoute.jsx`.
- `GET /api/dashboard/summary` - platform/tool summary used by `Football.jsx`.
- `POST /api/draft-assistant/recommendations` - free mock Draft Assistant endpoint used by `DraftAssistant.jsx`.
- `GET /api/optimizer/waiver` - Pro, platform-centric Waiver Wire endpoint ready for `WaiverWire.jsx`.

Verification:

- Backend `npm test` passed with 139 tests / 0 failures.
- Frontend `npm run build` passed after wiring.
- Deployment status: local dirty worktree only. Not confirmed merged or production-deployed.

Frontend wiring completed:

- `ProtectedRoute.jsx` checks backend session state after Supabase session resolution and signs out on authenticated server mismatch.
- `Football.jsx` uses dashboard summary to drive PlatformStatusBar plus Omen/Waiver tool states.
- `DraftAssistant.jsx` removed local mock fallback and uses backend `is_mock` for the banner.
- `TradeAnalyzer.jsx` and `StartSit.jsx` use shared `ErrorState`/`EmptyState` handling.
- `OmenOfTheWeek.jsx` displays a dash placeholder for null live delta values.
- Mobile tabs scroll horizontally instead of wrapping.

---

### Omen of the Week mock contracts
- `GET /api/health` — ready
- `GET /api/omen-of-the-week` — mock ready (`systemContracts.js`)
- `GET /api/platform-status` — ready

Frontend has consumed all three contracts. `OmenOfTheWeek.jsx` is built and wired to `/api/omen-of-the-week`.

### Live Omen endpoint

Status: completed locally by Codex.

Route: `GET /api/omen-of-the-week`

Completed backend behavior:

- No auth -> deterministic mock preview response remains available.
- `?preview=mock` -> deterministic mock preview response remains available.
- Authenticated request with no connected platform -> `mode: "live"`, `is_mock: false`, `recommendation: null`, `status: "needs_platform_connection"`.
- Authenticated Yahoo connection with usable `league_id` and roster-backed lineup edge -> `mode: "live"`, `is_mock: false`, `status: "live"`, and `recommendation.move_type: "lineup_swap"`.
- Authenticated connected platform with no supported live path/result -> `status: "connected_platform_pending_live_engine"`, `recommendation: null`.
- Invalid bearer token -> `401 Invalid or expired token`.

Frontend should continue using `is_mock` and `mode` as the source of truth. When `recommendation` is non-null in live mode, render it as real Omen advice with no preview banner.

---

## Current Backend Requests

### 0. Phase 4 frontend/backend integration queue

Current priority queue after backbone wiring:

- `WaiverWire.jsx`: consume `GET /api/optimizer/waiver?week={n}` directly, remove the platform selector, and stop sending `platform`.
- `OmenOfTheWeek.jsx`: surface a live attribution badge such as `Live · Yahoo` when `mode === "live"` and `is_mock === false`.
- Account/platform connections UI: add a recoverable token-expired state for Yahoo refresh failures, especially `401 Yahoo token expired - re-authenticate`.
- `Landing.jsx`: decide whether "Coming Soon" should become a live auth CTA.
- `StartSit.jsx`: render signal weights as strings (`high | medium | low`) instead of assuming numeric values.

---

### 1. Move type coverage

The mock and first live Omen path return `move_type: "lineup_swap"` with `primary_action.type: "start_sit"`.

The frontend `PrimaryActionCard` conditionally renders on `type === "start_sit"`. When waiver or trade move types become live, add a backend contract note here and I will add the corresponding UI panel.

Pending move types:
- `waiver_pickup` — primary_action shape TBD
- `trade` — primary_action shape TBD

### 2. Week / season context

The mock hardcodes `week: 1, season: 2026`. Live Yahoo Omen now copies `week` from the normalized roster response and sets `season` from the backend runtime year. A true NFL week/season service is still pending.

---

### 3. Platform status bar — `/api/platforms/status` response shape

The `PlatformStatusBar` component in Football.jsx (Hall of Records) calls `GET /api/platforms/status` (auth-required, existing endpoint) and expects:

```json
{
  "yahoo":   { "connected": true,  "platform": "yahoo" },
  "sleeper": { "connected": false, "platform": "sleeper", "username": null },
  "espn":    { "connected": false, "platform": "espn" }
}
```

The component reads the top-level platform keys directly. Backend now preserves that shape and also includes a `connections` wrapper for compatibility with any older UI code.

Status: completed by Codex.

---

### 4. Start/Sit signals

Status: completed by Codex.

Backend added deterministic `signals` to `POST /api/start-sit` while preserving existing fields.

Implemented rule: `LLM_BASE_URL` is not exposed; useful deterministic signals return even when Gemma/Ollama is unavailable.

### 5. Waiver Wire endpoint — GET /api/optimizer/waiver

Status: completed locally by Codex. Frontend `WaiverWire.jsx` is built against the contract, and completed endpoint details are documented in `handoffs/backend-to-frontend.md`.

Route: `GET /api/optimizer/waiver?week={n}`
Auth required: yes — bearer token + Pro subscription
Response shape: defined in `backend-to-frontend.md` section 7

Frontend is ready to consume live responses. Mock fallback (`is_mock: true`) will render correctly. Backend implemented the route in `src/routes/optimizer.js`. The endpoint is platform-centric and infers the linked Yahoo league from the authenticated account rather than requiring `leagueKey` or `platform` query params.

---

## Notes

- Do not change the top-level response shape or rename any fields in the mock contract without coordinating with frontend first — the component destructures the shape directly.
- The `disclaimer` field is intentionally not shown to end users. Do not surface it unless instructed.
- `is_mock: true` is the source of truth for showing the preview banner. Set it to `false` when the omen is live.
- Latest backend verification: `npm test` passes with 139 tests / 0 failures.
