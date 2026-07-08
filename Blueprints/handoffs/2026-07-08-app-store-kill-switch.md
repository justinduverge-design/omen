# Handoff — Phase 4.20a: Mobile-build kill-switch layer

**Date:** 2026-07-08
**Branch:** `claude/omen-kickoff-439aq7` (local — not merged/deployed)
**Status:** Complete locally, pending review/merge.

## What Changed

Added a new build-time flag, `VITE_APP_STORE_BUILD`, that produces a Stripe-free, ESPN-connect-free frontend bundle for a future mobile app-store submission. Follows the exact `import.meta.env.VITE_* === 'true'` pattern already established by `VITE_BILLING_ENABLED` and `VITE_ESPN_ENABLED` — no new infrastructure, just a third flag applied at the same gating sites, plus closing two pre-existing OR-bypasses that would otherwise leak the suppressed UI back in.

**`frontend/src/pages/Account.jsx`** — `SubscriptionBanner` and `SubscriptionSection` render sites now also require `!APP_STORE_BUILD`. Both are the root cause of every "Omen Pro" copy instance on this page (badge, section eyebrow), so no separate string-level suppression was needed. The `?upgrade=true` scroll-request guard also respects the flag (defensive; functionally already safe since the ref would be null either way).

**`frontend/src/components/ui/UpgradeState.jsx`** — the app-wide generic "Upgrade to Pro" paywall card (used elsewhere, e.g. Most Valuable Play) now returns `null` when `APP_STORE_BUILD` is set, regardless of `BILLING_ENABLED`.

**`frontend/src/components/platforms/PlatformConnections.jsx`** — `showEspnRow` was `ESPN_ENABLED || espnRecovery`; a `?recovery=espn_*` deep link could resurrect the ESPN row even with `ESPN_ENABLED=false`. Now `!APP_STORE_BUILD && (ESPN_ENABLED || espnRecovery)`, so an app-store build can't be reopened via the recovery flow. The `activeForm` initial-state also respects the flag to avoid dead state.

**`frontend/src/pages/ConnectLeague.jsx`** — `EspnCard` had `if (!ESPN_ENABLED && !connected) return null;`, which let a previously-connected ESPN user keep seeing the card even with `ESPN_ENABLED=false`. Added `if (APP_STORE_BUILD) return null;` immediately before that line so app-store builds suppress the card unconditionally. `YahooCard`/`SleeperCard` are structurally independent components — confirmed untouched, satisfying requirement (d) that Yahoo/Sleeper stay available.

**`.env.example` / `deploy/hostinger/ENV-INVENTORY.md`** — documented `VITE_APP_STORE_BUILD`. Also backfilled `VITE_BILLING_ENABLED`, which was read in code but never documented in either file — a pre-existing gap, fixed as a one-line adjacent addition while editing the same section (not separately scoped).

**No backend route/schema change.** Mirrors the existing `VITE_ESPN_ENABLED` posture: frontend-render-only, backend `/api/platforms/espn/connect` stays technically reachable by direct API call, same as today. The sprint item explicitly allowed a `4.20a-backend` split if server-side gating were needed; it wasn't, since the done-when only requires UI-entry-point absence.

## Verification

**New regression test:** `test/appStoreBuildKillSwitch.test.js` (6/6 pass) — source-level regex assertions run through the root `node --test` runner, following the existing precedent (`test/loginBranding.test.js`) since `frontend/` has no component-test harness (no vitest/testing-library, no `*.test.jsx` files, no `test` script in `frontend/package.json`). Asserts each touched file declares `APP_STORE_BUILD` and that both bypass fixes are present, with the `APP_STORE_BUILD` check ordered before the pre-existing bypass condition in each case.

**Full `npm test`:** 201/271 pass on this branch. Baseline before this change (confirmed via `git stash`): 196/271. The 70 remaining failures are pre-existing and environmental (`MODULE_NOT_FOUND` on `test/yahooAuthRoute.test.js` and similar — missing modules unrelated to this change), not introduced by this work.

**Build-output evidence (done-when requirement):** `npm --prefix frontend run build` with `VITE_BILLING_ENABLED=true VITE_ESPN_ENABLED=true` and `VITE_APP_STORE_BUILD` unset — the built bundle contains 1 occurrence each of "Connect ESPN", "Omen Pro", `espn/connect`, and a Stripe-checkout string, plus "Yahoo"/"Sleeper" (1 each). Rebuilding with `VITE_APP_STORE_BUILD=true` added — all four suppressed strings drop to 0 occurrences, while "Yahoo" and "Sleeper" remain at 1 each. `dist/` artifacts were not committed (build output, gitignored).

**`npm ci` in `frontend/`** was run to materialize `node_modules` for the build verification (not previously installed in this environment). No `package.json`/lockfile changes — installed exactly what the existing lockfile specifies.

## Discovered, Not Fixed (out of scope for this task)

- Frontend has no component-test harness at all. If future UI-suppression work needs a rendered-DOM assertion rather than source-level regex, a devDependency addition (vitest + testing-library) would need explicit approval first (package-file edits are gated).
- `Header.jsx` has a pre-existing duplicate `className` attribute (esbuild warning during build) — unrelated to this change, not touched.
- CI/deploy build-arg wiring for `VITE_APP_STORE_BUILD` is intentionally not added — `VITE_ESPN_ENABLED` has `ARG`/`ENV` passthrough in `.github/workflows/deploy.yml` because it ships in the current web deploy; `VITE_APP_STORE_BUILD` is a kill-switch for a mobile wrapper build that doesn't exist yet in this repo's CI. Wiring it into the Hostinger web deploy now would be premature. Flagged as a follow-up for whoever builds actual mobile packaging (e.g. Capacitor).

## Done Docs

Design (UI-suppression, cross-cutting) + Feature. Security-privacy-evidence judged N/A — this removes UI-entry-point reachability for already-gated/labeled features (Stripe, ESPN), introducing no new data flow, consent boundary, or retention change; same reasoning as the 2026-07-06 vault-fix handoff for an analogous "N/A" case.

## Skill Receipt

```
Task: Phase 4.20a — Mobile-build kill-switch layer
Change type: Frontend UI-suppression (build-time flag)
Skills invoked: slops-git-flow (scoped branch/commit/push/PR), slops-code-review (self-administered, verified line numbers before editing, closed both bypasses)
Conditional skills considered but not applicable: slops-ui-ux-audit / slops-ux-copy (no new UI/copy, pure suppression of existing gated UI); security-privacy-evidence (no new data-flow/consent/retention boundary — see Done Docs above)
Evidence: build-output grep comparison (flag off vs on); test/appStoreBuildKillSwitch.test.js 6/6; full npm test 201/271 (no regressions vs this branch's 196/271 pre-change baseline)
Procedure gap found: frontend/ has no component-test harness — source-level regex assertions used instead, consistent with existing test/loginBranding.test.js precedent
```

## Known Gaps

- CI/deploy build-arg wiring not added (see above) — deliberate, documented, not silently closed.
- No automated rendered-DOM test for the suppressed UI states — build-output grep + new source-level regression test are the available substitutes in this repo's current test infrastructure.

## Next Step

Per the refreshed `Direction/agent_inbox.md` Auto-Populated Top 5, the next unstarted item is **Phase 4.20c — Reviewer / demo access documentation (P0)**: a playbook describing how an app-store reviewer reaches a working demo account via the existing `Demo` page/`dataMode` mock system without a real platform connection.
