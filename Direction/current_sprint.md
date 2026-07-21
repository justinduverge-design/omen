# Omen Current Sprint

**Last updated:** 2026-07-21
**Purpose:** Active execution queue only. Completed evidence belongs in `Direction/sprints_completed.md`, `Blueprints/done/LEDGER.md`, PRs, and dated handoffs.

## How agents use this file

1. Read `Direction/agent_inbox.md` first. A pinned task there overrides this queue.
2. Pull only unchecked, agent-buildable work whose blockers are satisfied.
3. Do not auto-pull **Founder / Ops**, **Verify**, **Decision**, database, deploy, or production-mutation work.
4. Keep implementation in small PRs. If an item needs more than about 80 words of implementation detail, write or use a spec and leave the sprint item as a pointer.
5. On completion, move the result to `Direction/sprints_completed.md`, add the appropriate Done receipt, update the decision log only when a decision changed, and record actual skill use.

## Skill activation contract

Every task plan must name the selected skills and explain why any normally required skill is N/A. Every closeout must record which skills helped, which were skipped or substituted, and what procedure should improve.

### Core bundles

- **Core docs:** `slops-repo-inspector`, `planning-pass`, `slops-context-markdown`, `slops-git-flow`
- **Core implementation:** `slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd`, `slops-quality-baseline`, `slops-code-review`
- **UI / UX:** core implementation + `slops-taste`, `slops-ui-ux-audit`, `slops-mobile-smoke`; add `slops-ux-copy` when user-facing words change
- **Trust boundary:** core implementation + `security-privacy-evidence`, `rbac-risk-review`; add `slops-legal-spot-check` when provider claims, privacy, terms, attribution, or public data-use copy changes
- **Data / ingest:** core implementation + `pre-build-research`, `slops-data-ingest-plan`, `security-privacy-evidence`
- **AI path:** core implementation + `slops-ai-integration-review`, `security-privacy-evidence`; add `slops-financial-sketch` when cost scenarios matter
- **Release / production:** `slops-repo-inspector`, `slops-quality-baseline`, `slops-verify`, `slops-ship`, `slops-canary`; use `slops-investigate` on HOLD, regression, or unexplained behavior
- **Design contract:** `slops-repo-inspector`, `planning-pass`, `slops-context-markdown`, `design-md-author` when a `design.md` contract is required, `slops-design-system-pack`, `slops-ui-ux-audit`

## Native Mobile Pivot — active authority

**Authority:** `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md` and companion mobile contracts are active native-mobile direction.

### Operating override

- **Pause** all new web page migrations and new web-only primitive work. This pauses B3/B4 web composition/page implementation and all C-lane web UI work, including Draft, Connect League, Football, Landing, and trade-page migrations.
- **Keep** the existing web app and safe backend work. The API, auth, demo, recommendation contract, platform safety, tests, and production maintenance are native foundations; do not rip them out or treat the web UI as a wrapper target.
- **Native targets:** iPhone uses SwiftUI; Android uses Kotlin + Jetpack Compose. Do not start React Native.
- **M0 contracts are approved.** Native implementation is allowed only inside the approved contracts and current gates.
- **No app-store action yet.** Apple/Google accounts, signing, release configuration, provider flows, DNS/deploy, SQL, and secrets remain gated.

### Agent tools and canvas

All native-agent work is governed by `Blueprints/specs/mobile/omen-native-agent-capabilities-canvas-v1.md`, `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`, and the official [Omen Native Design House](https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3). These define the approved visual workspace, role lanes, required skills/evidence sequence, least-privilege baseline, and technical access-enforcement checklist. No agent may assume access to secrets, production, provider data, Figma library publishing, or store accounts.

## Reconciled native program status — 2026-07-21

| ID | Work | Priority | Blocked by | Current truth |
|---|---|---|---|---|
| M0a | Onboarding and connection contract | P0 | none | ✅ Approved 2026-07-19. Evidence: `Direction/reviews/2026-07-19-m0a-*`. |
| M0b | Mobile design-system contract | P0 | M0a | ✅ Approved 2026-07-19. Evidence: `omen-native-design-system-registry-v1.md`. |
| M0c | Native app-shell/auth/API contract | P0 | M0a | ✅ Approved 2026-07-19. Surfaces 4 backend requirements to `frontend-to-backend.md`. |
| M1 | Native design-system implementation plan | P0 | M0b + M0c | In progress. Governed by M1-P. |
| M1-F | Native Figma token and foundation-library setup | P0 | M1 focus-ring + typography briefs | ✅ Completed 2026-07-19. Evidence: `Blueprints/handoffs/2026-07-19-m1-figma-foundation-library.md`; Figma nodes `13:2` / `14:2`. |
| M1-P | Native primitives + component enforcement | P0 | M1-F + Figma screen-contract pass | 🟡 P2 + P4 complete. **P2 foundations:** PRs #165–#169 (tokens/controls/fields/Card/Badge/Chip/Modal/StateSurfaces/ListRow), #174 PlatformBadge, #175 ConfirmationDialog, #176 platform legibility tokens + fill-on-platform PlatformBadge. **P4 gallery + enforcement:** SwiftUI `DesignSystemGalleryView` (debug-only), Android `PrimitiveEnforcementTest`, iOS `PrimitiveEnforcementTests`; registry §3.2 amended. `OmenAndroidApp.kt` allowlisted with written retirement plan (retires with first M4 feature screen). **Next:** P3 product compositions before M4 feature screens. |
| M2-F | Native app-shell screen contracts | P0 | M1-F | ✅ Completed 2026-07-19. Evidence: `Blueprints/handoffs/2026-07-19-m2-app-shell-contracts.md`; Figma nodes `17:12` / `17:13`. |
| M2-E | Native build-environment decision | P0 | M2-F | ✅ Completed 2026-07-19. Android Studio/SDK/ADB/emulator verified; iOS path is unsigned GitHub macOS simulator CI. |
| M2 | Native app-shell project scaffolding | P0 | M0 + M2-F + M2-E | ✅ Completed 2026-07-19. Evidence: `Blueprints/handoffs/2026-07-19-m2-native-app-shell-scaffold.md`. |
| M3 | Native vertical slice | P1 | M1 + M2 | ✅ Completed 2026-07-19 as local/demo-only. This is not authentication. Evidence: `Blueprints/handoffs/2026-07-19-m3-native-vertical-slice.md`. |
| M3-A | Native authentication proof | P0 | M3 + founder auth-config authority | ✅ Android and iOS implementation merged. Android PR #157. iOS PR #171. PR #172 repaired the post-merge split-screen scaffold regression test. Real-device interactive QA remains separate. |
| M3A-QA | Native auth interactive real-device QA | P0 | M3-A Android + iOS implementations | Founder/human QA. Run `mobile/contracts/m3a-interactive-qa-runbook.md` for Android Google sign-in + email OTP + account deletion, and an equivalent iOS real-device Sign in with Apple + OTP pass. Agent-blocked: credential entry and inbox reading. |
| M0-BE | Native backend requirements bundle | P0 | F2 first | 4 reqs from M0c §11: Yahoo deep-link return, safe provider-state API, connect idempotency, and F2 status truth. Shape: one owner + one shared API/state contract + one acceptance-test matrix authored first, then four small PRs. |
| M4 | Native feature delivery | P1 | M1-P P3 product compositions approved | Blocked. Trade, Draft, League, and Connections ship one contract-backed feature at a time after M1-P P3 lands. P2 + P4 are complete. No feature screen may introduce a new primitive; enforcement scanners (Android + iOS) will fail the build if one does. |
| M5 | Theme packs / skins | P2 | M4 | Deferred. Core Omen themes and accessibility first. |

## Next build order

1. **F2 status truth** — resolve `ready` vs `pending_live_engine` wording/runtime contract before M0-BE expands.
2. **M0-BE backend bundle** — shared API/state contract + acceptance matrix first, then the four small backend PRs.
3. **M1-P P3 product compositions** — PlayerRow, DecisionBrief shell, PlatformConnectionCard, ConnectionStatusBadge, MetricStrip, ConfidenceBar, RiskPanel, SignalList. Context Strip, Matchup Spine, and Evidence Disclosure need Figma-first proposals per registry §3.2 approval trail.
4. **M4 feature screens** — only after shared primitives/compositions are approved and the Figma contract is cited frame-by-frame; landing an M4 feature screen also retires `OmenAndroidApp.kt`'s enforcement allowlist entry.

## Current state

- Production is live on KVM1; `/api/health` and `/api/ready` were healthy at the latest verified baseline.
- Omen is free indefinitely. Stripe application code and residual checkout references were removed on `main` via PRs #117 and #118. The production Supabase table/column cleanup remains a separately gated database action.
- Public ESPN setup guide, extension/store assets, and promo cut merged via PR #122; regression test fix merged via PR #123.
- Public legal/support/delete pages merged via PR #121.
- Transparent horizontal lockup is wired on current `main` and the transparent asset exists in `frontend/public/`.
- Omen UI North Star is active via PR #124. Web primitive/page migration work is paused under the native pivot.
- Draft PR #132 proposes the Master Design System Blueprint and remains founder-approval gated.
- Draft PR #140 adds hand-built SVG logo masters and remains visual-review gated.
- Tuesday scoring remains disabled until the no-write production dry-run passes and Justin approves the production flag change.

# Active queue

## A. Founder / review gates — do not auto-pull

### A1 — Review and disposition PR #140: SVG logo masters

- **Priority:** P0
- **Cost:** small
- **Blocked by:** Justin visual approval; PR review
- **Agent-buildable:** review/evidence only; no auto-merge
- **Done when:** full/simple/favicon/app-icon SVGs pass structure, transparency, size-tier, brand-rule, and visual checks; PR is either approved for merge or receives concrete revision findings.
- **Do not touch:** app wiring, favicons, production deploy, or brand doctrine beyond review findings.

### A2 — Decide PR #132: Master Design System Blueprint v1

- **Priority:** P1
- **Cost:** medium
- **Blocked by:** Justin approval of proposed typography/cursor/background direction; PR currently needs reconciliation with newer SVG work
- **Agent-buildable:** analysis and reconciliation only
- **Done when:** Justin chooses approve, revise, or close; the blueprint is rebased/reconciled against PR #140 and current UI authority; status and decision log agree.
- **Do not touch:** runtime fonts, Remotion output, cursor code, or tokens before approval.

### A3 — Production security and Supabase review

- **Priority:** P0
- **Cost:** small
- **Blocked by:** Justin pin and access window
- **Agent-buildable:** audit preparation only
- **Done when:** production settings/secrets checklist is reviewed without exposing values; findings are classified; any mutation is separately approved.
- **Do not touch:** secret values, production database, DNS, Nginx, TLS, or environment variables.

### A4 — Tuesday scoring production enablement

- **Priority:** P0
- **Cost:** small
- **Blocked by:** approved no-write Supabase dry-run against real nflverse data; Justin production-change pin
- **Agent-buildable:** dry-run preparation and verification only; env flip is gated
- **Done when:** dry-run validates real rows without writes; production flag is explicitly approved and changed; readiness and cron health pass; rollback owner is named.
- **Do not touch:** production flag before approval; never log provider credentials or raw user data.

## M. Native mobile execution lane

### M1P-Next-1 — PlatformBadge foundation — ✅ merged PR #174 (2026-07-21); legibility tokens + fill-on-platform follow-up merged PR #176.

### M1P-Next-2 — ConfirmationDialog foundation — ✅ merged PR #175 (2026-07-21).

### M1P-P4 — Dual-platform gallery and enforcement — ✅ built 2026-07-21 on `claude/m1p-p4-gallery-enforcement`. SwiftUI `DesignSystemGalleryView` (debug-only), Android `PrimitiveEnforcementTest` (JUnit source scanner in `:core:designsystem`), iOS `PrimitiveEnforcementTests` (XCTest source scanner in `OmenIOSTests`). Registry §3.2 amended. `OmenAndroidApp.kt` allowlisted with retirement plan. Evidence: `Blueprints/handoffs/2026-07-21-m1p-p4-gallery-enforcement.md`.

### M3A-QA — Native auth real-device QA

- **Priority:** P0
- **Cost:** small, human-gated
- **Blocked by:** founder/human credential and inbox access
- **Agent-buildable:** preparation only
- **Done when:** Android Play-services AVD or real device proves Google sign-in, email OTP, session restore, account deletion, and log safety; iOS real device proves Sign in with Apple, email OTP, session restore, account deletion, and log safety.
- **Evidence:** sanitized QA matrix; no screenshots/logs containing credentials or tokens.

### M0-BE-0 — Native backend shared contract and acceptance matrix

- **Priority:** P0
- **Cost:** medium
- **Blocked by:** F2 status truth first
- **Agent-buildable:** yes after F2
- **Done when:** one backend-owned API/state contract and acceptance-test matrix covers Yahoo deep-link return, safe provider-state API, connect idempotency, and the resolved F2 truth before implementation PRs start.
- **Do not touch:** provider credentials, production data, deploy, SQL, or environment variables without separate approval.

## B. Backend/recommendation lane — safe work only while native pivot is active

### B2-D — Complete the canonical Omen engine: live Waiver + Trade intelligence

- **Priority:** P0
- **Cost:** large
- **Blocked by:** reconcile/land current B2 implementation first; then provider-specific live-data capability proof
- **Agent-buildable:** yes, in small backend PRs after a shared API/state contract and test matrix
- **Source of truth:** GitHub issue #162. Omen is the one core tool: canonical `POST /api/omen/mvp-move` must safely honor selected team/league context and honestly choose among Start/Sit, live Waiver, and personalized Trade recommendations.
- **Done when:** #162 acceptance evidence is complete: server-verified multi-league context; real waiver/player-pool logic; personalized trade logic; deterministic recommendation selection; provider capability matrix; no mock/stub advice presented as live.
- **Do not touch:** provider credentials, deployment, production data mutations, or store configuration without separate approval.

### D1 — Real `GET /api/trade/pulse` endpoint

- **Priority:** P1
- **Cost:** medium
- **Blocked by:** none
- **Agent-buildable:** yes
- **Done when:** backend returns computed buy-low targets; static list is retired or explicit offline fallback; source status is truthful; empty/error/stale paths are tested and documented.
- **Do not touch:** paid data source or new dependency without approval.

### D2 — `AI_PROVIDER=local|cloud` control with $0 cap

- **Priority:** P1
- **Cost:** medium
- **Blocked by:** none; founder decision already sets $0 cloud spend
- **Agent-buildable:** yes
- **Done when:** local remains default; cloud execution cannot spend money and hard-fails closed or is disabled; status reporting leaks no URL/secret; tests prove cap behavior.
- **Do not touch:** paid API credentials or production env.

## F. Verify lane — Justin must pin

### F1 — Service-key Supabase route-scoping audit

- **Priority:** P1
- **Cost:** medium
- **Blocked by:** Justin pin
- **Done when:** every service-key route has route/query/scoping-column/test mapping; any unscoped query becomes a P0 defect with a failing isolation test.

### F2 — Resolve `ready` vs `pending_live_engine` documentation conflict

- **Priority:** P0, pinned 2026-07-19
- **Cost:** small
- **Blocked by:** none; this gates M0-BE
- **Done when:** runtime and all active contracts use one status truth for connected Sleeper/ESPN users; stale wording is corrected without changing behavior unless separately approved.
- **Evidence:** source-of-truth trace and doc diff.

### F4 — ESPN public handoff production verification

- **Priority:** P1
- **Cost:** small
- **Blocked by:** Justin pin if production interaction is required
- **Done when:** `/espn-connect`, extension links/assets, share/copy fallbacks, walkthrough, and regression test pass on phone/desktop without exposing cookie names or values in shared payloads.

## Deferred / paused backlog

These remain real but must not displace native P0/P1 work.

- Web B3/B4/C1-C5 page migrations are paused under the native pivot.
- E1 mobile scope decision remains useful but no longer authorizes the older ESPN-relay-only shell ahead of the full native plan without a new founder decision.
- E2/E3 app-store closeout / relay shell remain blocked by E1 and explicit store/provider gates.
- G1 win-streak reward ladder UI waits on backend win-streak contract.
- G2 ESPN live draft Lazy Sync and G3 Yahoo live draft Lazy Sync wait on stable provider contract and season timing.
- G4 IDP support remains P3 and needs explicit supported-league/data scope.
- G5 skeleton narration states should fold into the relevant native composition or future web migration, not create duplicate local loaders.
- G6 Umami integration remains soft-blocked on approved observability container and privacy posture.
- G8 baked-black PNG fallback deletion waits until at least 2026-07-28 and a clean production soak after PR #120.
- G9 code TODOs must be split into separate tasks.
- G10 post-live learning waits on Release Done, seven stable days, and `slops-product-pulse`.

## Removed from active queue during grooming

- Operational repo/deploy rename approval: completed; repo and KVM1 deploy path are Omen.
- Orphaned `src/omen_gdpr.js` cleanup: merged PR #119.
- Account subscription-card removal and Stripe integration removal: superseded/completed by PRs #117/#118.
- Phase 4.20b and 4.20d: merged via PRs #121 and #115.
- ESPN mobile onboarding, public setup guide, and walkthrough production: merged via PRs #122 and #123; only verification remains.
- Phase 4.21 transparent lockup swap: merged via PR #120 and confirmed in current source.
- Completed web UI primitive work and Trade Analyzer migration: PRs #125-#139; follow-on web migrations are paused.
- Per-team design documents, team-colorway stubs, and chant implementation: removed because team-based runtime theming was removed via PR #114 and the active North Star treats team skins as future-only.
- Paid-launch and Omen Pro wording: removed because Omen is free indefinitely.

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

## Guardrails

- Do not recreate an `Omen/` nested directory.
- Do not touch `.env`, secret values, DNS, SSL/TLS, Nginx, production infrastructure, Supabase migrations/schema, Apple credentials, or production flags without explicit approval.
- Do not deploy unless Justin explicitly approves the deploy action.
- Docs/doctrine-only pushes must not restart KVM1.
- ESPN cookie values must never appear in logs, UI, screenshots, URLs, analytics, share payloads, or stored app state outside the approved backend secret flow.
- Mock/demo/stale/offline data must be visibly labeled and never represented as live fantasy advice.
- Account deletion copy and exact confirmation phrase `DELETE MY OMEN DATA` require fresh approval before change.
- Team-based runtime theming is removed. Do not revive team skins or stale team-design instructions without a new approved theme-pack plan.
- No paid dependency, cloud model spend, or external service commitment without explicit approval.
