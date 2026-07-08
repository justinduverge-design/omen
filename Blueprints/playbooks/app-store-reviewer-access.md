# App-Store Reviewer Access Playbook

## Purpose

Apple/Google reviewers need to see Omen working without a real Yahoo, Sleeper, or ESPN account and without creating a real Supabase login. This playbook is the answer: send the reviewer to `/demo`. It documents why that page is sufficient, what it will and will not show, and what not to attempt instead.

## Quick Answer

Give the reviewer this single instruction: **visit `/demo`.** No login, no platform connection, no setup of any kind. The page loads a populated, real Omen recommendation computed from a fixed sample roster.

## Step-by-Step

1. Navigate to `/demo` (e.g. `https://slopssaloon.com/demo` in production, or the equivalent local/staging origin).
2. Confirm the page loads directly — no redirect to `/login`, no onboarding prompt.
3. Confirm the persistent "Demo Mode" banner is visible above the recommendation, reading: *"Sample league and roster data. This is not live fantasy advice."*
4. Confirm a populated Omen recommendation renders below the banner — a real "Start X over Y" call with confidence, risk, and explanation text, not an empty state or spinner stuck loading.
5. (Optional, to show more tool breadth) Visit `/trade` and `/draft` — both are also public, no login required, and both render populated content with their own mock/preview labeling (see Reference table below).
6. If a reviewer needs to demonstrate the "connect a league" entry point exists without actually connecting one, the `/demo` page's own footer has a "Connect a league" link to `/account/connect` — clicking it is fine to show the UI, but do not attempt to actually connect a real platform account for review purposes.

## What NOT To Do

- **Do not attempt to complete onboarding or reach the authenticated dashboard's live Omen recommendation without a real platform connection.** `Onboarding.jsx`'s `ConnectStep` has no skip option; it only advances once `/api/dashboard/summary` reports a real connected status. There is no seeded demo backend account and no supported bypass. Manually setting the `omen.onboarding.done` localStorage key via devtools is a debugging hack, not a documented or supported reviewer flow — do not present it as one.
- **Do not rely on `?fixture=...` query params** (e.g. `?fixture=omen-roster` on `/omen`, `?fixture=mock-draft` on `/draft`). These are private, dev-only visual-testing fixtures gated by `import.meta.env.DEV` and are absent from any production build. A reviewer testing the shipped app can never reach them.
- **Do not present `/demo`'s fixture data as a real connected league.** It is intentionally never merged with live data — the product treats `demo` as its own distinct mode from `mock` and `live` (see `Blueprints/demo-mode.md`).

## Why `/demo` Is Safe And Sufficient For Review

- **No auth, no Supabase, no LLM, no platform adapter is touched on this path.** `frontend/src/pages/Demo.jsx`'s own header comment states this explicitly, and the backend `GET /api/demo` route (`src/routes/demo.js` → `src/services/demoMode.js`) calls no platform adapter, Supabase client, user service, or LLM — confirmed by direct execution of `buildDemoModeResponse()` during this playbook's verification (see below).
- **The recommendation is genuinely computed, not a static screenshot.** The backend runs a frozen, deterministic 12-player roster fixture (`DEMO_ROSTER_FIXTURE` in `src/services/demoMode.js`) through the real lineup optimizer (`src/services/optimizer.js`'s `evaluateLineup`) to produce an actual start/sit swap with confidence, risk, and explanation fields — the same code path the live product uses, just fed fixture input instead of a real roster.
- **The demo state is clearly and persistently labeled**, satisfying `Direction/facts-of-record.md` fact #7 ("mock data is always labeled. Never silently mixed with live data."). `Demo.jsx` renders a dedicated, non-dismissible `DemoBanner` — deliberately distinct from the shared `MockBanner` component used elsewhere, per `Blueprints/demo-mode.md`'s rule that demo copy must never be conflated with dev-mock copy.
- **The response is deterministic.** Every request returns the same roster, the same recommendation, and the same `contract_version: "omen-demo.v1"` (only `generated_at` changes) — a reviewer reloading the page won't see inconsistent or flaky content.

## Secondary Public Surfaces (Optional, For Tool Breadth)

Both of these are also public, require no login, and always render populated content — useful if a reviewer wants to see more of the product surface than the single Omen recommendation:

| Route | What renders | Labeling |
| --- | --- | --- |
| `/trade` | Trade Analyzer, including a "Buy Low" targets section sourced from a static local fixture (`frontend/src/data/tradePulse.js`) | `MockBanner` reading "Mock buy-low targets - updated each preseason." |
| `/draft` | Draft Assistant, in its production-default "Preview Mode" branch | `MockBanner` reading "Preview Mode — example recommendations. Live personalization activates when the season begins." |

## QA Checklist

Use this to verify the playbook cold, without re-reading the source:

- [ ] `/demo` loads with no redirect to `/login` and no onboarding prompt.
- [ ] A "Demo Mode" banner is visible immediately, reading "Sample league and roster data. This is not live fantasy advice."
- [ ] Below the banner, a populated recommendation renders (a "Start ___ over ___" title, confidence text, risk text) — not a loading skeleton stuck spinning, not an error block, not an empty state.
- [ ] Reloading `/demo` shows the same recommendation content every time (deterministic).
- [ ] The page footer offers "Connect a league" (to `/account/connect`) and "Back to home" (to `/`) — clicking either does not silently swap in live data on `/demo` itself.
- [ ] `/trade` loads with no login and shows its "Buy Low" section under a `MockBanner`.
- [ ] `/draft` loads with no login and shows its Preview Mode `MockBanner`.
- [ ] Attempting to reach the authenticated dashboard without connecting a real platform account correctly stops at the onboarding "Connect your league" step with no skip option — this is expected, not a bug.

## References

- `frontend/src/pages/Demo.jsx` — the `/demo` page component.
- `frontend/src/routes/index.jsx` — route registration (`/demo`, `/trade`, `/draft` are all public).
- `frontend/src/lib/dataMode.js` — the `mock` / `demo` / `live` data-mode store; `/demo` sets `'demo'`.
- `src/routes/demo.js` and `src/services/demoMode.js` — the backend `GET /api/demo` contract and fixture.
- `Blueprints/demo-mode.md` — authoritative spec for Demo Mode's contract, labeling rules, and data-state boundaries. **Known doc-drift:** its status line ("frontend `/demo` implementation pending") is stale — the frontend has been implemented since Phase 2.7 (2026-06-19, per `Blueprints/done/LEDGER.md`). Not corrected here since it's outside this playbook's scope; flagged for whoever next touches that file.
- `Direction/facts-of-record.md` fact #7 — "Mock data is always labeled. Never silently mixed with live data."
