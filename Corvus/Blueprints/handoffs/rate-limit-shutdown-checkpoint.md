# Rate-Limit Shutdown Checkpoint

**Date:** 2026-05-23
**Owner:** Claude
**Session type:** ESPN recovery Account page wiring — all 6 changes implemented

---

## Current Project State

- Trade Analyzer is live and the active front door.
- Omen of the Week / MVP Move frontend is complete. All 8 contract states verified end-to-end with Playwright.
- ESPN recovery Account page wiring is complete. The full Omen → Account → reconnect → Return to Omen journey is implemented and wired.
- Backend mock endpoint (`POST /api/omen/mvp-move`) is registered in `server.js`. All ESPN states return correct recovery envelopes.
- `llm_reasoning` signal is still `stub`. Omen explanations are deterministic templates.
- Matchup DvP is still stubbed. Confidence scores remain `medium`.
- No commits or pushes made this session.

---

## Work Completed This Session

1. Read `layer-handoff-protocol.md` — understood the three SLOPS layers (0-OS, 1-slops-saloon, 2-Corvus) and handoff chain.
2. Implemented Change 1 — `Omen.jsx` `RecoveryPanel`: accepts `state` prop, builds safe query-param href for ESPN states only (`/account?platform=espn&recovery=<state>`). Non-ESPN states keep plain `/account`.
3. Implemented Change 2 — `Account.jsx`: imports `useSearchParams`, reads `?recovery=` param, passes `recoveryState` to `PlatformConnections`. Never logs or displays the raw value.
4. Implemented Change 3 — `PlatformConnections.jsx`: accepts `recoveryState` prop. Added `espnRecovery` and `showEspnCard` derived values. ESPN card renders when `VITE_ESPN_ENABLED === 'true'` OR when `recoveryState` starts with `espn_`.
5. Implemented Change 4 — `PlatformConnections.jsx`: added `ESPN_RECOVERY_COPY` map with state-specific user-facing messages. Recovery banner renders above the ESPN form when arriving from an Omen recovery CTA.
6. Implemented Change 5 — `PlatformConnections.jsx`: when `recoveryState === 'espn_reauth_required'` and ESPN is already connected, a "Reconnect ESPN" button appears that opens the connect form. A "Cancel" button returns to the connected view.
7. Implemented Change 6 — `PlatformConnections.jsx`: after a successful ESPN connect during a recovery flow, `espnConnectSucceeded` is set. ESPN card switches to a success view with a "Return to Omen →" link pointing to `/football`.
8. Updated `Direction/current_sprint.md`, `Corvus/Direction/current_sprint.md`, and `Blueprints/handoffs/decisions.md` to reflect ESPN recovery wiring as closed.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/pages/Omen.jsx` | `RecoveryPanel` — accepts `state` prop, builds safe `accountHref` for ESPN states |
| `frontend/src/pages/Account.jsx` | Added `useSearchParams`, reads `recovery` param, passes `recoveryState` to `PlatformConnections` |
| `frontend/src/components/platforms/PlatformConnections.jsx` | Accepts `recoveryState` prop; ESPN_ENABLED bypass; recovery banner; reconnect UI; Return to Omen link |
| `Direction/current_sprint.md` | Advanced focus to Matchup DvP and LLM reasoning |
| `Corvus/Direction/current_sprint.md` | Marked ESPN recovery wiring complete, set next priority |
| `Blueprints/handoffs/decisions.md` | Closed ESPN recovery open decision, one remaining open decision |

---

## Files Not Found

| File | Status |
|---|---|
| `Blueprints/security-privacy.md` | Not read — no new security surface added; URL params are state identifiers only, no credentials |
| `probo.yaml` | Not read — no compliance evidence changes |

---

## What Was Not Done

- No Playwright QA driver written for the recovery flow — the Omen driver covers the CTA render; Account page recovery states were not exercised with a new driver.
- Matchup DvP / Sportradar integration not started.
- LLM reasoning (Gemma) not wired to Omen route.
- Stripe live keys not touched.
- Security hardening (helmet, rate limiting) not started.
- No commits or pushes made.
- No deploy performed.

---

## Current Risks / Open Questions

- **Recovery analytics timing is open.** Whether recovery event tracking ships before or after the first paid launch gate is undecided.
- **Matchup DvP is still stubbed.** Confidence scores remain `medium` until Sportradar or an equivalent provider is approved.
- **Gemma/Ollama reasoning is templated.** The `llm_reasoning` signal is `stub` — Omen explanations are deterministic templates, not live LLM output.
- **No QA driver for Account recovery flow.** The reconnect UI and Return to Omen link were not exercised with Playwright. Manual testing recommended before paid launch.
- **`VITE_ESPN_ENABLED=false` + recovery flow** — the ESPN card bypass logic has not been exercised against a real backend. The `espnRecovery` flag is derived from URL param; if the backend returns an ESPN state but `VITE_ESPN_ENABLED` is false, the card will now show. This is the intended behavior but has not been verified with a running server.

---

## Recommended Next Step

**Matchup DvP provider decision** — the confidence score is the most visible stub in the Omen screen. Approve Sportradar or an equivalent provider, then request a Codex backend task to wire real DvP data into the service. Alternatively, write a QA driver for the Account recovery flow first if pre-launch risk review is required.

---

## Exact Next Prompt For Justin

```text
You are Claude, the frontend engineer for the Slops Saloon `slops-saloon` repo.

Read first — do not skip any:
- DBS_INDEX.md
- Blueprints/handoffs/rate-limit-shutdown-checkpoint.md
- Blueprints/handoffs/decisions.md
- Direction/current_sprint.md

Goal: Write a Playwright QA driver for the ESPN recovery Account page flow.

Context:
- Omen.jsx RecoveryPanel now builds `/account?platform=espn&recovery=<state>` for ESPN states.
- Account.jsx reads `?recovery=` and passes `recoveryState` to PlatformConnections.
- PlatformConnections shows a recovery banner, reconnect UI, and Return to Omen link.
- No QA driver exists for this flow yet.

Deliverables:

1. Write `.claude/skills/run-slops-saloon/driver_espn_recovery.cjs` — a Playwright driver that:
   - Navigates directly to `/account?platform=espn&recovery=espn_reauth_required`
   - Asserts the recovery banner text is visible
   - Asserts the "Reconnect ESPN" button is visible (for the connected + reauth state)
   - Asserts the connect form is visible when ESPN is not connected
   - Asserts the "Return to Omen →" link is present after a mocked successful connect
   - Uses page.route() to mock `/api/platforms/status` and `/api/platforms/espn/connect`
   - Uses page.route() to mock Supabase auth (or navigates around the auth gate)
   - Screenshots each state

2. Run the driver and report pass/fail per assertion.

Scope:
- Frontend QA only — Playwright driver and assertion logic.
- Do not touch backend, secrets, SQL, payments, deploy config, or infrastructure.
- Do not start new features.
- Do not commit or push.
```
