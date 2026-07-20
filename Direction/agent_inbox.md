# Omen Agent Inbox

**Refreshed:** 2026-07-19
**Authority:** `Direction/current_sprint.md` is the active queue. This file selects or recommends the next pull.

## Active task

## 📌 Native Mobile Pivot — founder direction (2026-07-19)

**Do not auto-pull web UI work.** New web page migrations and web-only primitive expansion are paused while Omen is re-planned as a real SwiftUI iPhone app and Kotlin/Jetpack Compose Android app.

Read `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md` before selecting work.

**M0 contract pack approved (Justin, 2026-07-19).** M0a onboarding/connection, M0b design-system registry, and M0c app-shell/auth/API are all approved contracts. **F2 is now pinned** (P0) — one status truth for `ready` vs `pending_live_engine`. Ratified boundaries: `focus-ring` is a semantic non-color accessibility contract; Alegreya Sans/Alegreya/DM Mono are locked; team colors are out of the phone MVP.

**Last completed pull:** **M2 — Native app-shell project scaffolding** (P0). iOS SwiftUI and Android Compose shells now have safe environment seams, local demo entry, session/navigation placeholders, and `com.slopssaloon.omen` deep-link registration. Android debug build plus local emulator install/launch passed. iOS compilation remains a future non-signing macOS CI action; no signing, store, provider, or credential action occurred. Evidence: `Blueprints/handoffs/2026-07-19-m2-native-app-shell-scaffold.md`.

**Last completed pull:** **M3 — Native vertical slice** (P1), local/demo-only. Welcome, Demo, a visibly temporary local sign-in placeholder, Command Center, and mock/recovery Omen states have parity in the two shells. It makes no real auth/provider/store claim. Evidence: `Blueprints/handoffs/2026-07-19-m3-native-vertical-slice.md`.

**M3-A in progress (Android scaffolding landed 2026-07-19).** Founder granted M3-A authority. Config-independent Android auth foundation built and JVM-tested (25 tests, `assembleDebug` green, emulator screenshots): expanded `SessionState`, `AndroidKeystoreSessionStore` (AES/GCM, no new dep), `SessionManager`, `AuthRepository`+`FakeAuthRepository`, opaque `AuthOutcome`, validators, `GoogleIdTokenProvider` seam, pure `AuthFlow` reducer, and app-shell wiring with BuildConfig-injected public config from git-ignored `local.properties`. Branch `codex/m3a-native-auth-proof` (not pushed). Evidence: `Blueprints/handoffs/2026-07-19-m3a-native-auth-scaffolding.md`.

**M3-A live Android wiring landed (2026-07-19, same session).** Google Web client ID provisioned + added to Supabase Client IDs. Real `SupabaseAuthRepository` (OkHttp/org.json GoTrue, no SDK) + `CredentialManagerGoogleIdTokenProvider` wired behind the interfaces; app uses live repo/provider when configured. 34 unit tests; `assembleDebug` green; live Supabase smoke = HTTP 400 (reachable, anon key accepted); emulator shows live label + "Continue with Google".

**M3-A follow-ups addressed (2026-07-19, same session):** ✅ **In-app account deletion built** (`AccountDeletion` + `OkHttpAccountRepository`, `DELETE /api/user/delete`, phrase-gated, demo-excluded; 37 unit tests). 📋 **Interactive QA runbook** (`mobile/contracts/m3a-interactive-qa-runbook.md`) — Play AVD is creatable; Google account sign-in + OTP-inbox steps are founder/human QA. 📋 **iOS parity spec** (`Blueprints/specs/mobile/m3a-ios-auth-parity-spec.md`) for macOS CI.

**M3-A truly remaining:** (1) run the interactive QA pass on a Play-services device (founder/human — needs a Google account + real inbox) and set a real `omen.apiBaseUrl` to exercise live delete; (2) implement iOS from the parity spec on authorized non-signing macOS CI. Must not expand into provider connection, signing, or store release work.

**In parallel (backend lane):** M0-BE — the 4 backend requirements from M0c §11, now in `Blueprints/handoffs/frontend-to-backend.md`. Shape: one owner + one shared API/state contract + one acceptance-test matrix authored first, then **four small PRs**. **F2 first.**

## Open PR gates

### PR #140 — SVG logo masters

- **State:** draft, open, mergeable
- **Gate:** Justin visual approval plus SVG/UI/code review
- **Do not auto-merge.**
- **Skills:** `slops-repo-inspector`, `slops-design-system-pack`, `slops-ui-ux-audit`, `slops-code-review`, `slops-quality-baseline`, `slops-git-flow`
- **Next action:** inspect full/simple/favicon/app-icon cuts at large and small sizes; approve or return concrete revision findings.

### PR #132 — Master Design System Blueprint v1

- **State:** draft, open, currently not mergeable
- **Gate:** Justin approval of proposed typography, cursor, background, and asset-pipeline direction; reconcile with PR #140 and newer UI work.
- **Do not auto-merge or implement proposed runtime changes.**
- **Skills:** `slops-repo-inspector`, `planning-pass`, `slops-context-markdown`, `slops-design-system-pack`, `slops-ui-ux-audit`
- **Next action:** produce approve/revise/close recommendation and reconciliation table.

## Auto-Populated Top 5

**Suppressed while the Native Mobile Pivot is active.** Items B3 through C5 below are historical web recommendations, not selectable work. Do not run kickoff against them; pull the current next task (M3-A) above, or an explicitly pinned M-lane brief instead.

Generated 2026-07-19 from `Direction/current_sprint.md` after excluding founder/review gates, verify-only items that require Justin pinning, and production-mutation work. Blocked downstream items remain visible with their blocker called out.

These are recommendations, not hard ownership assignments. Any capable agent may execute them after reading the named skill procedures.

### 1. B3 — DecisionBrief component

- **Why next:** the core recommendation surface is still missing while its supporting primitives now exist.
- **Priority / cost / blocker:** P0 / medium / none; B1 contract complete.
- **Recommended execution surface:** Jules for a strictly component-only Phase A PR
- **Skills:** `slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd`, `slops-taste`, `slops-ui-ux-audit`, `slops-mobile-smoke`, `slops-quality-baseline`, `slops-code-review`
- **Output:** canonical composition, variants, accessibility evidence, no page migration.

### 2. C1 — Draft Assistant primitive migration

- **Why next:** component dependencies are already on `main`; this is a contained Phase B migration with high user value.
- **Priority / cost / blocker:** P1 / medium / none
- **Recommended execution surface:** Codex; Jules may execute only with a tightly bounded page-migration brief
- **Skills:** `slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd`, `slops-taste`, `slops-ui-ux-audit`, `slops-mobile-smoke`, `slops-quality-baseline`, `slops-code-review`
- **Output:** canonical inputs/selection/player/metric/state components with recommendation math unchanged.

### 3. C2 — Connect League primitive migration

- **Why next:** PlatformConnectionCard and the public ESPN guide are already merged; the page can now consolidate without inventing new behavior.
- **Priority / cost / blocker:** P1 / medium / none
- **Recommended execution surface:** Codex for behavior-preserving migration; Claude for copy/legal reconciliation if needed
- **Skills:** `slops-repo-inspector`, `planning-pass`, `workflow-tree-spec`, `slops-git-flow`, `slops-tdd`, `security-privacy-evidence`, `slops-legal-spot-check`, `slops-ux-copy`, `slops-ui-ux-audit`, `slops-mobile-smoke`, `slops-quality-baseline`, `slops-code-review`
- **Output:** standard connection cards and recovery states with zero cookie-value exposure.

### 4. D1 — Real `GET /api/trade/pulse`

- **Why next:** removes stale hand-authored buy-low advice and turns an honesty gap into a real data contract.
- **Priority / cost / blocker:** P1 / medium / none
- **Recommended execution surface:** Codex
- **Skills:** `slops-repo-inspector`, `planning-pass`, `pre-build-research`, `slops-data-ingest-plan`, `slops-git-flow`, `slops-tdd`, `demo-mode-pre-empty-state`, `security-privacy-evidence`, `slops-quality-baseline`, `slops-code-review`
- **Output:** computed endpoint, explicit fallback, tested empty/error/stale paths, honest UI status.

### 5. D2 — `AI_PROVIDER` $0-cap control

- **Why next:** founder decision is logged at a $0 cloud cap; the backend can now hard-fail or disable cloud execution without new spend.
- **Priority / cost / blocker:** P1 / medium / none
- **Recommended execution surface:** Codex
- **Skills:** `slops-repo-inspector`, `planning-pass`, `slops-ai-integration-review`, `slops-financial-sketch`, `slops-git-flow`, `slops-tdd`, `security-privacy-evidence`, `slops-quality-baseline`, `slops-code-review`
- **Output:** local remains default; any cloud provider path cannot spend money and exposes only safe status.

## Next after the top five

- **C3 — Football Command Center migration:** P1, large; confirm no hot-file conflict.
- **B4 — Omen page migration:** after B3 and B2 merge/deploy.
- **E1 — Mobile scope decision:** P0 decision memo; resolves full-app vs relay-only conflict.
- **F1 — Service-key Supabase audit:** P1 Verify-lane item; Justin must pin.

## Current blockers and gates

- **Tuesday scoring:** production flag remains false until approved no-write dry-run and explicit production-change approval.
- **Production Supabase Stripe cleanup:** source SQL exists, but production schema mutation requires a separate Justin-approved action.
- **PR #132:** proposed only; do not implement its typography/cursor/background changes before approval.
- **PR #140:** visual review required; no automatic merge or app wiring.
- **B3 DecisionBrief:** B1 contract is complete; no contract blocker remains.
- **B4 unified Omen migration:** waits on B3 and for B2 to merge/deploy before production UI migration claims.
- **C4 public-front-door migration:** waits on A2 visual-direction decision or an explicit current-North-Star-only authorization.
- **E2 app-store closeout and E3 relay shell:** wait on E1 mobile-scope decision.
- **iOS Phase 5.3:** requires explicit approval before any `connection_mode` production schema action.
- **Win-streak UI:** waits on backend win-streak contract.
- **Baked-black fallback deletion:** wait until at least 2026-07-28 and a clean production soak after PR #120.
- **Post-live learning:** waits on Release Done, seven stable days, and `slops-product-pulse`.

## Closed or removed from pull consideration

Do not repull these:

- orphaned GDPR module cleanup — merged PR #119;
- Stripe billing and residual checkout removal — merged PRs #117/#118;
- transparent lockup swap — merged PR #120 and present in current source;
- public legal/support pages — merged PR #121;
- ESPN public guide, extension/store assets, and promo cut — merged PR #122; test fix PR #123;
- UI North Star — merged PR #124;
- canonical primitive/component Phase A sequence and Trade Analyzer migration — merged PRs #125–#139;
- team-based runtime theming — removed PR #114; do not revive per-team design/chant work as active sprint scope.

## Agent selection guidance

- **Jules:** narrow component-only or tightly bounded migration briefs with exact allowed files, dependencies, and evidence requirements.
- **Codex:** behavior-preserving page migrations, backend/API/data work, regression tests, and implementation verification.
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
