# Omen Agent Inbox

**Refreshed:** 2026-07-23 (M4 Command Center v1.1 corrective)
**Authority:** `Direction/current_sprint.md` is the active queue. This file selects or recommends the next pull.

## Active task

## 📌 Next agent pull — Unblock PR #198 when GitHub Actions billing returns (August 2026)

**M4-Auth-Providers-v1 pivoted to Discord-only + shipped on `claude/m4-auth-providers-v1`** (PR [#198](https://github.com/justinduverge-design/omen/pull/198), draft). Full session decision + evidence: `Blueprints/handoffs/2026-07-24-m4-auth-providers-v1-discord-shipped-passkey-deferred.md`.

**What ships in v1:** Discord OAuth on Android (Chrome Custom Tabs) + iOS (`ASWebAuthenticationSession`), PKCE + CSRF-state seams, provider-agnostic contract-layer (Step 4), Passkey types + reducer branches gated behind `UnsupportedPasskeyProvider` so no passkey UI renders. Android verified locally green. **iOS CI blocked on GitHub Actions billing** ("recent account payments have failed or your spending limit needs to be increased") since 2026-07-24.

**What to do when Actions billing is restored:**
1. Trigger `.github/workflows/ios-ci.yml` re-run on `claude/m4-auth-providers-v1` (`gh workflow run ios-ci.yml --ref claude/m4-auth-providers-v1` or push a trivial re-trigger commit).
2. If green: mark PR #198 ready for review; land it.
3. If red: agent addresses whatever iOS CI surfaces (project.pbxproj registration, missing import, exhaustive-switch, etc.) and re-runs.

**Passkeys are NOT part of v1.** Filed as `M4-Auth-Passkeys-Onramp` in the M lane — blocked on Supabase publishing stable public WebAuthn REST OR founder approving `supabase-swift` + `supabase-kt` SDK adoption (breaks the M0c "no Supabase SDK" doctrine, so it's a real decision).

Sprint entry: `Direction/current_sprint.md` → M lane → M4-Auth-Providers-v1. Original brief (pre-pivot, still authoritative for the seam architecture): `Blueprints/specs/mobile/m4-auth-providers-v1-brief.md`.

## 📌 Native Mobile Pivot — founder direction

**Do not auto-pull web UI work.** New web page migrations and web-only primitive expansion are paused while Omen is planned and built as a real SwiftUI iPhone app and Kotlin/Jetpack Compose Android app.

Read these before selecting work:

- `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md`
- `Blueprints/specs/mobile/omen-native-design-system-registry-v1.md`
- `Blueprints/specs/mobile/omen-native-app-shell-auth-api-contract-v1.md`
- `Blueprints/specs/mobile/m1-native-primitives-enforcement-v1.md`
- `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`
- Official Figma: `https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3`

## Current truth — 2026-07-22

**F2 status truth resolved.** Runtime unified 2026-07-19 in `src/services/omenReadiness.js`; doc reconciliation completed 2026-07-22 on branch `claude/f2-status-truth`. `pending_live_engine` = "active connection lacks the provider-specific context required for a safe live attempt" (not "engine unbuilt"). Canonical contract: `Blueprints/specs/mobile/omen-native-backend-state-contract-v1.md` §F2. M0-BE-0 is unblocked.

**M0 contract pack approved.** M0a onboarding/connection, M0b design-system registry, and M0c app-shell/auth/API are approved contracts. Ratified boundaries remain: semantic `focus-ring`; Alegreya Sans / Alegreya / DM Mono locked; team colors are out of the phone MVP.

**M1-P Figma screen-contract pass approved.** The Native Design House now includes principles/references, tokens/themes, component registry/proposals, iOS screen contracts, Android screen contracts, golden screens, and QA/evidence boards. Treat the Figma work as contract evidence, not permission to freestyle feature screens.

**M1-P P2 + P4 complete.** Merged evidence:

- PR #165 — tokens, Button/IconButton, TextField/FormField/Picker
- PR #166 — Card, Badge, Chip
- PR #167 — Modal / Sheet
- PR #168 — State Surfaces
- PR #169 — ListRow
- PR #174 — PlatformBadge
- PR #175 — ConfirmationDialog
- PR #176 — platform legibility tokens + fill-on-platform PlatformBadge
- Branch `claude/m1p-p4-gallery-enforcement` — SwiftUI `DesignSystemGalleryView` (debug-only) + Android `PrimitiveEnforcementTest` + iOS `PrimitiveEnforcementTests`; registry §3.2 amended; `OmenAndroidApp.kt` allowlisted with retirement plan (retires with first M4 feature screen). PR pending push.

**Next:** M1-P P3 product compositions (PlayerRow, DecisionBrief shell, PlatformConnectionCard, ConnectionStatusBadge, MetricStrip, ConfidenceBar, RiskPanel, SignalList) before M4 feature screens. Context Strip, Matchup Spine, and Evidence Disclosure need Figma-first proposals per registry §3.2 approval trail.

**M3-A native auth implementation is merged on both platforms.** Android auth landed in PR #157. iOS auth landed in PR #171. PR #172 fixed the post-merge native scaffold regression test after the iOS screens split out of `AppShellView.swift`. Real-device interactive QA remains founder/human.

**M3A-QA remains open.** Run `mobile/contracts/m3a-interactive-qa-runbook.md` for Android Google sign-in + email OTP + account deletion with real `omen.apiBaseUrl`; iOS still needs real-device Sign in with Apple + OTP-inbox QA. Agents may prepare the matrix, but cannot complete credential/inbox work.

**M0-BE remains open.** The 4 backend requirements from M0c §11 are now in `Blueprints/handoffs/frontend-to-backend.md`: Yahoo deep-link return, safe provider-state API, connect idempotency, and F2. Shape: one owner + one shared API/state contract + one acceptance-test matrix authored first, then four small PRs. F2 first.

## Recommended next pull

### 1. M0-BE-0 — Backend shared contract and acceptance matrix

- **Why next:** F2 is resolved; M0-BE-0 is now unblocked and is the last gate before the four small M0-BE PRs.
- **Priority / cost / blocker:** P0 / medium / none
- **Output:** owner, API/state contract, acceptance matrix, then four small PR briefs.

### 2. M4 Command Center v1 — first feature screen ✅ implementation complete

- **Branch:** `claude/m4-command-center`. Screen assembly at app/feature layer on both platforms; consumes approved primitives + P3 compositions only. `OmenAndroidApp.kt` allowlist entry retired. Local Material Symbols vector drawables for all 5 nav tabs (official Google artwork, no dependency added).
- **M4-Auth (retirement item):** ✅ 2026-07-23 — both auth files refactored to compose approved Omen primitives; `PrimitiveEnforcementTest.ALLOWLISTED_FILES` now empty. Branch `claude/m4-auth-primitive-retirement` waiting on push/merge. Evidence: `Blueprints/handoffs/2026-07-23-m4-auth-primitive-retirement.md`.
- **Evidence:** `Blueprints/handoffs/2026-07-22-m4-command-center-v1.md`.

### 3. M1P-P3 — Product compositions ✅ implementation complete (all 3 batches)

- **Batch 1** on `claude/m1p-p3-compositions` — ConfidenceBar, RiskPanel, MetricStrip, SignalList. Evidence: `Blueprints/handoffs/2026-07-22-m1p-p3-metric-primitives.md`.
- **Batch 2** on `claude/m1p-p3-batch-2` (stacked) — PlayerRow (+ PlayerChip), ConnectionStatusBadge, PlatformConnectionCard. Evidence: `Blueprints/handoffs/2026-07-22-m1p-p3-connection-primitives.md`.
- **Batch 3** on `claude/m1p-p3-batch-3` (stacked) — DecisionBrief shell, all 8 state surfaces. Evidence: `Blueprints/handoffs/2026-07-22-m1p-p3-decision-brief-shell.md`.
- **All three branches waiting on merge.** M4 feature screens unblock as soon as the stack lands.
- Context Strip / Matchup Spine / Evidence Disclosure remain on the Figma-first track per registry §3.2 (separate future work).

### 4. M3A-QA — Native auth real-device QA

- **Why next:** M3-A implementation is merged on both platforms; only human-gated interactive QA remains.
- **Priority / cost / blocker:** P0 / small, human-gated / founder credential + inbox access
- **Output:** sanitized QA matrix from `mobile/contracts/m3a-interactive-qa-runbook.md` for Android and iOS; agent may prep matrix only.

### 5. A1 — Review and disposition PR #140 (SVG logo masters)

- **Why next:** founder/review gate still open; visual review + concrete findings or approval.
- **Priority / cost / blocker:** P0 / small / Justin visual approval
- **Output:** approve/revise recommendation with per-cut findings.

## Open PR gates

### PR #140 — SVG logo masters

- **State:** draft/open at last recorded review
- **Gate:** Justin visual approval plus SVG/UI/code review
- **Do not auto-merge.**
- **Next action:** inspect full/simple/favicon/app-icon cuts at large and small sizes; approve or return concrete revision findings.

### PR #132 — Master Design System Blueprint v1

- **State:** draft/open at last recorded review
- **Gate:** Justin approval of proposed typography, cursor, background, and asset-pipeline direction; reconcile with PR #140 and newer UI work.
- **Do not auto-merge or implement proposed runtime changes.**
- **Next action:** produce approve/revise/close recommendation and reconciliation table.

## Suppressed while Native Mobile Pivot is active

Do not run kickoff against the old Auto-Populated Top 5 web recommendations. B3/B4/C1-C5 remain historical web work and are paused unless Justin explicitly reopens them.

Safe backend work may continue when it does not touch production/provider credentials without approval:

- B2-D — canonical Omen engine: live Waiver + personalized Trade intelligence
- D1 — real `GET /api/trade/pulse`
- D2 — `AI_PROVIDER=local|cloud` control with $0 cap

## Current blockers and gates

- **Tuesday scoring:** production flag remains false until approved no-write dry-run and explicit production-change approval.
- **Production Supabase Stripe cleanup:** source SQL exists, but production schema mutation requires a separate Justin-approved action.
- **PR #132:** proposed only; do not implement typography/cursor/background changes before approval.
- **PR #140:** visual review required; no automatic merge or app wiring.
- **M4 feature screens:** blocked until M1-P P3 product compositions land. P2 primitives + P4 gallery/enforcement are complete.
- **M0-BE:** blocked by F2 status truth first.
- **E2 app-store closeout and E3 relay shell:** wait on E1 mobile-scope decision and explicit store/provider gates.
- **Win-streak UI:** waits on backend win-streak contract.
- **Baked-black fallback deletion:** wait until at least 2026-07-28 and a clean production soak after PR #120.
- **Post-live learning:** waits on Release Done, seven stable days, and `slops-product-pulse`.

## Closed or removed from pull consideration

Do not repull these:

- M0a/M0b/M0c native contracts — approved;
- M1-F Figma token/foundation setup — completed;
- M2-F app-shell screen contracts — completed;
- M2-E native build-environment decision — completed;
- M2 native app-shell project scaffolding — completed;
- M3 local/demo native vertical slice — completed;
- M3-A Android implementation — merged PR #157;
- M3A-iOS implementation — merged PR #171;
- M3A post-merge scaffold regression fix — merged PR #172;
- M1-P P2 primitive foundations complete — merged PRs #165-#169, #174 (PlatformBadge), #175 (ConfirmationDialog), #176 (platform legibility tokens);
- M1-P P4 dual-platform gallery + primitive enforcement — built on `claude/m1p-p4-gallery-enforcement`, PR pending push;
- orphaned GDPR module cleanup — merged PR #119;
- Stripe billing and residual checkout removal — merged PRs #117/#118;
- transparent lockup swap — merged PR #120 and present in current source;
- public legal/support pages — merged PR #121;
- ESPN public guide, extension/store assets, and promo cut — merged PR #122; test fix PR #123;
- UI North Star — merged PR #124;
- canonical web primitive/component Phase A sequence and Trade Analyzer migration — merged PRs #125-#139, but follow-on web migrations are paused;
- team-based runtime theming — removed PR #114; do not revive per-team design/chant work as active sprint scope.

## Agent selection guidance

- **Jules:** narrow component-only or tightly bounded migration briefs with exact allowed files, dependencies, and evidence requirements.
- **Codex:** native implementation, behavior-preserving backend/API/data work, regression tests, and implementation verification.
- **Claude:** doctrine/spec reconciliation, product-gap analysis, recommendation-contract synthesis, copy/legal review, and large-context planning.
- These are tool-fit recommendations, not permanent ownership. Readiness, blockers, and skill availability decide the pull.

## Required kickoff output

Before implementation, the agent must print:

1. task ID and exact scope;
2. priority, cost, blockers, and done-when;
3. selected skills and N/A reasons;
4. files expected to change;
5. test/evidence plan;
6. do-not-touch boundaries;
7. branch name and serialization/hot-file check.

## Required closeout output

The handoff must include:

- actual files changed;
- intended RED, GREEN, broader tests/build/audit results as applicable;
- UI/security/legal/AI evidence as applicable;
- actual skills used, skipped, substituted, or weak;
- one concrete skill improvement or an explicit “no correction needed” verdict;
- branch/commit/PR/deploy status without implying local work is live.

## Do not touch unless explicitly pinned

- `AGENT.md`, `CLAUDE.md`
- `.env`, secrets, or credentials
- deploy configuration or production infrastructure
- package files or dependencies
- SQL, Supabase schema/migrations, or production data
- Apple credentials
- production flags or deploy actions
