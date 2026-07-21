# Omen Agent Inbox

**Refreshed:** 2026-07-21
**Authority:** `Direction/current_sprint.md` is the active queue. This file selects or recommends the next pull.

## Active task

## 📌 Native Mobile Pivot — founder direction

**Do not auto-pull web UI work.** New web page migrations and web-only primitive expansion are paused while Omen is planned and built as a real SwiftUI iPhone app and Kotlin/Jetpack Compose Android app.

Read these before selecting work:

- `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md`
- `Blueprints/specs/mobile/omen-native-design-system-registry-v1.md`
- `Blueprints/specs/mobile/omen-native-app-shell-auth-api-contract-v1.md`
- `Blueprints/specs/mobile/m1-native-primitives-enforcement-v1.md`
- `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`
- Official Figma: `https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3`

## Current truth — 2026-07-21

**M0 contract pack approved.** M0a onboarding/connection, M0b design-system registry, and M0c app-shell/auth/API are approved contracts. F2 is pinned P0 as the single status-truth blocker for the native backend bundle. Ratified boundaries remain: semantic `focus-ring`; Alegreya Sans / Alegreya / DM Mono locked; team colors are out of the phone MVP.

**M1-P Figma screen-contract pass approved.** The Native Design House now includes principles/references, tokens/themes, component registry/proposals, iOS screen contracts, Android screen contracts, golden screens, and QA/evidence boards. Treat the Figma work as contract evidence, not permission to freestyle feature screens.

**M1-P P2 foundations complete.** Merged evidence:

- PR #165 — tokens, Button/IconButton, TextField/FormField/Picker
- PR #166 — Card, Badge, Chip
- PR #167 — Modal / Sheet
- PR #168 — State Surfaces
- PR #169 — ListRow
- PR #174 — PlatformBadge
- PR #175 — ConfirmationDialog
- PR #176 — platform legibility tokens + fill-on-platform PlatformBadge (closes registry §2.3 token gap surfaced during PR #174 review)

**Next:** M1-P P4 dual-platform gallery/enforcement, then P3 product compositions or M4 feature screens.

**M3-A native auth implementation is merged on both platforms.** Android auth landed in PR #157. iOS auth landed in PR #171. PR #172 fixed the post-merge native scaffold regression test after the iOS screens split out of `AppShellView.swift`. Real-device interactive QA remains founder/human.

**M3A-QA remains open.** Run `mobile/contracts/m3a-interactive-qa-runbook.md` for Android Google sign-in + email OTP + account deletion with real `omen.apiBaseUrl`; iOS still needs real-device Sign in with Apple + OTP-inbox QA. Agents may prepare the matrix, but cannot complete credential/inbox work.

**M0-BE remains open.** The 4 backend requirements from M0c §11 are now in `Blueprints/handoffs/frontend-to-backend.md`: Yahoo deep-link return, safe provider-state API, connect idempotency, and F2. Shape: one owner + one shared API/state contract + one acceptance-test matrix authored first, then four small PRs. F2 first.

## Recommended next pull

### 1. M1P-P4 — Dual-platform gallery and enforcement

- **Why next:** M1-P P2 is complete through PR #176; the project now needs an enforcement layer so agents cannot clone primitives inside feature screens, plus a dual-platform gallery that proves every approved primitive renders.
- **Priority / cost / blocker:** P0 / medium / unblocked
- **Recommended execution surface:** Codex or Claude Code with native file access; scope the gallery + enforcement as separate PRs if hot files conflict.
- **Output:** Android gallery + device evidence, iOS unsigned-CI gallery evidence where possible, static-audit or test-based enforcement against feature-local primitive clones, dated handoff, Done Ledger row, skill receipt.
- **Do not touch:** provider connect flows, provider credentials, production, SQL, store configuration.

### 2. F2 — Resolve `ready` vs `pending_live_engine`

- **Why next:** gates M0-BE and native provider-state truth.
- **Priority / cost / blocker:** P0 / small / none; pinned
- **Output:** source-of-truth trace and doc diff only unless behavior change is separately approved.

### 3. M0-BE-0 — Backend shared contract and acceptance matrix

- **Why next:** M0c surfaced backend requirements, but implementation should not start before one shared state/API contract and test matrix.
- **Priority / cost / blocker:** P0 / medium / F2 first
- **Output:** owner, API/state contract, acceptance matrix, then four small PR briefs.

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
- **M4 feature screens:** blocked until M1-P P2 primitives and P4 gallery/enforcement close.
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
