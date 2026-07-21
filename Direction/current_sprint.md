# Omen Current Sprint

**Last updated:** 2026-07-20
**Purpose:** Active execution queue only. Completed evidence belongs in `Direction/sprints_completed.md`, `Blueprints/done/LEDGER.md`, PRs, and dated handoffs.

## How agents use this file

1. Read `Direction/agent_inbox.md` first. A pinned task there overrides this queue.
2. Pull only unchecked, agent-buildable work whose blockers are satisfied.
3. Do not auto-pull **Founder / Ops**, **Verify**, **Decision**, database, deploy, or production-mutation work.
4. Keep each implementation in a small PR. If an item needs more than about 80 words of implementation detail, write or use a spec and leave the sprint item as a pointer.
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

### Skill receipt rule

For every pulled item:

- list selected skills in the plan;
- add actual results to `Blueprints/playbooks/skill-usage-ledger.md` or a dated skill receipt linked from the handoff;
- mark unavailable required skills as `SKIPPED` or `SUBSTITUTED`, never silently passed;
- route repeated skill failures through `slops-retro` and, when justified, `slops-skill-author`.

## Native Mobile Pivot — 2026-07-19 (Founder direction)

**Authority:** `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md` and its companion mobile contracts are active native-mobile direction.

### Immediate operating override

- **Pause** all new web page migrations and new web-only primitive work. This pauses B3/B4's web composition/page implementation and all C-lane web UI work, including Draft, Connect League, Football, Landing, and trade-page migrations.
- **Keep** the existing web app and safe backend work. The API, auth, demo, recommendation contract, platform safety, tests, and production maintenance are foundations for native apps; do not rip them out or treat the web UI as a wrapper target.
- **Native targets:** iPhone uses SwiftUI; Android uses Kotlin + Jetpack Compose. Do not start React Native.
- **No native code until M0 contracts are approved.** The next work is contract-first: mobile screen map, token/theme system, component registry, state/API matrix, onboarding/navigation spec, and ESPN mobile decision.
- **No app-store action yet.** Apple/Google accounts, release configuration, provider flows, DNS/deploy, SQL, and secrets remain gated.

### Agent tools and canvas

All native-agent work is governed by `Blueprints/specs/mobile/omen-native-agent-capabilities-canvas-v1.md`, `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`, and the official [Omen Native Design House](https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3). These define the approved visual workspace, role lanes, required skills/evidence sequence, least-privilege baseline, and technical access-enforcement checklist. No agent may assume access to secrets, production, provider data, Figma library publishing, or store accounts.

### Active mobile program

| ID | Work | Priority | Blocked by | Done when |
|---|---|---|---|---|
| M0a | Onboarding and connection contract | P0 | ~~Justin review~~ | ✅ **Approved 2026-07-19.** Revised contract covers Omen sign-in (3-mechanism split), demo escape hatch, provider state machine, reliability rules, Sleeper/Yahoo proof paths, and ESPN mobile gate. Concrete auth/API/deep-link/PKCE/idempotency spec assigned to M0c. Evidence: `Direction/reviews/2026-07-19-m0a-*`. |
| M0b | Mobile design-system contract | P0 | ~~M0a~~ | ✅ **Approved 2026-07-19.** `omen-native-design-system-registry-v1.md` — token model (dark/light verified vs `index.css`), data-semantic invariant layer, Alegreya type scale, foundation + Omen-composition registry with iOS/Android mapping, AA/44pt/Dynamic-Type/focus-non-color/reduce-motion rules, theme-pack bounds, Liquid-Glass/Material-3 rules. Per-component build briefs deferred to M1. |
| M0c | Native app-shell/auth/API contract | P0 | ~~M0a~~ | ✅ **Approved 2026-07-19.** `omen-native-app-shell-auth-api-contract-v1.md` — nav/route table, three-mechanism auth + Keychain/Keystore session, `com.slopssaloon.omen://` deep links, safe provider-state API mapping (+F2 dep), idempotency/request-id, demo/reviewer mode, env boundaries, security. Surfaces 4 backend requirements → `frontend-to-backend.md`. |
| M1 | Native design-system implementation plan | P0 | M0b ✅ + M0c ✅ | **In progress.** Small SwiftUI and Compose foundation-component briefs define tokens (incl. the semantic `focus-ring`), accessibility, variants, and evidence — built from the approved `omen-native-design-system-registry-v1.md`. First two build briefs cover semantic `focus-ring` and the locked Alegreya stack; implementation and component coverage are governed by M1-P. |
| M1-P | Native primitives + component enforcement | P0 | M1 focus-ring + typography briefs ✅; authority reconciliation first | **Figma screen-contract pass APPROVED 2026-07-20 (Justin).** P1 authority reconciliation ✅. Full `m1-figma-screen-contract-pass-v1.md` pass built and approved: `01 — Principles & References` board; 3 `03 — Components` proposals now approved compositions (Context Strip, Matchup Spine, Evidence Disclosure — added to `omen-native-design-system-registry-v1.md` §3.2); 10 low-fi screen contracts on `04`/`05` (primary + alternate state each, iOS + Android — split from an original 8 per Justin's "no" on stacked-stage compression); 4 high-fidelity golden-screen pairs; `06 — QA & Evidence` board (14 entries, all marked APPROVED in Figma). **P2 (shared foundation primitives) and P3 (first Omen compositions) are now unblocked.** **P2 token layer, Button + IconButton, and TextField/FormField/Picker slices landed 2026-07-20** (pushed, not merged/deployed): shared color/typography/spacing/`focus-ring`, interactive controls, and field controls in iOS `DesignSystem` and Android `core:designsystem`. Android verified locally (`:core:designsystem:testDebugUnitTest` 18/18, 10 emulator tests, and `:app:assembleDebug`); iOS verified via `ios-ci.yml` run `29788913948` (`Build OmenIOS (simulator, unsigned)` passed). Branch `claude/m1p-p2-designsystem-tokens` pushed, no PR opened yet. Evidence: `Blueprints/handoffs/2026-07-20-m1p-p2-form-controls.md`. **Next P2 slice:** Card/Badge/Chip/Modal/State-surfaces, split into small approved-registry slices. No feature-local primitive clones or unapproved compositions. |
| M1-F | Native Figma token and foundation-library setup | P0 | M1 focus-ring + typography briefs ✅ | ✅ **Completed 2026-07-19.** Populated `02 — Tokens & Themes` and `03 — Components` with approved Core tokens, focus-ring, typography roles, and registry documentation only. Evidence: `Blueprints/handoffs/2026-07-19-m1-figma-foundation-library.md`; Figma nodes `13:2` / `14:2`. No Figma library publish, screen, or new component pattern. |
| M2-F | Native app-shell screen contracts | P0 | M1-F ✅ | ✅ **Completed 2026-07-19.** Contract boards on Figma nodes `17:12` (iOS) and `17:13` (Android) define top-level navigation, entry/exit, demo/auth/recovery, named states, accessibility, and platform differences. Evidence: `Blueprints/handoffs/2026-07-19-m2-app-shell-contracts.md`. |
| M2-E | Native build-environment decision | P0 | M2-F ✅ | ✅ **Completed 2026-07-19.** Android Studio + SDK/ADB/emulator and `Medium_Phone` Android 17/API 37.1 were locally verified. iOS path is non-signing GitHub macOS simulator CI using included capacity only (no billed usage). Evidence: `Blueprints/specs/mobile/omen-native-build-environment-v1.md`. |
| M0-BE | Native backend requirements bundle | P0 | F2 pinned first | 4 reqs from M0c §11 (Yahoo deep-link return, safe provider-state API, connect idempotency, F2). **Shape:** one owner + one shared API/state contract + one acceptance-test matrix authored first, then **four small PRs**. Routes to backend lane. |
| M2 | Native app-shell project scaffolding | P0 | M0 ✅ + M2-F ✅ + M2-E ✅ | ✅ **Completed 2026-07-19.** Created iOS SwiftUI and Android Compose project shells with safe environment seams, app-local demo entry, session/navigation placeholders, `com.slopssaloon.omen` deep link, and no credentials/signing/store configuration. Android debug build + local emulator install/launch verified. iOS compilation remains a future non-signing macOS CI action. Evidence: `Blueprints/handoffs/2026-07-19-m2-native-app-shell-scaffold.md`. |
| M3 | Native vertical slice | P1 | M1 + M2 | ✅ **Completed 2026-07-19 as a local/demo-only slice.** Both shells prove Welcome → Try Demo or Get started → clearly labeled local sign-in placeholder → Command Center → mock Omen/recovery. This is not authentication. Evidence: `Blueprints/handoffs/2026-07-19-m3-native-vertical-slice.md`. |
| M3-A | Native authentication proof | P0 | M3 ✅ + founder auth-config authority | 🟡 **Android done + merged 2026-07-19 (PR #157).** Credential Manager Google + email OTP + Keystore session + in-app account deletion, live Supabase-wired, 37 unit tests, connectivity-smoked. Remaining split into M3A-iOS + interactive QA below. Evidence: `Blueprints/handoffs/2026-07-19-m3a-native-auth-scaffolding.md`. |
| M3A-iOS | Native iOS auth implementation | P0 | M3-A Android ✅ + macOS CI ✅ (`ios-ci.yml`) | **Queued — GitHub issue #159.** Implement the iOS half against `Blueprints/specs/mobile/m3a-ios-auth-parity-spec.md`: Keychain session, Sign in with Apple + email OTP, GoTrue via URLSession, account deletion, XCTest parity; flip `ios-ci.yml` build→test. No signing/store/provider/production. |
| M3A-QA | Native auth interactive real-device QA | P0 | M3-A Android ✅ | **Founder/human QA.** Run `mobile/contracts/m3a-interactive-qa-runbook.md` on a Play-services AVD (created via Android Studio Device Manager): Google sign-in + email OTP round trip + account deletion (needs real `omen.apiBaseUrl`) + log-safety checks. Agent-blocked: credential entry + inbox reading. |
| M4 | Native feature delivery | P1 | M3 + **M1-P shared primitives/compositions approved** | Trade, Draft, League, and Connections ship one contract-backed feature at a time; no feature screen may introduce a new primitive while M1-P is incomplete. |
| M5 | Theme packs / skins | P2 | M4 | Core Omen themes and accessibility pass; approved Omen-owned packs can be added without role-token drift. |

- **M1-P is the next native P0 gate:** shared primitives/compositions and a dual-platform component gallery must be approved before new M4 feature-screen construction.

- **M1-P P2 progress (2026-07-20):** Token layer, Button + IconButton, and
  TextField/FormField/Picker are committed and pushed on `claude/m1p-p2-designsystem-tokens`.
  Android passed 18 token unit tests, 10 emulator tests, and app assembly; unsigned iOS simulator
  CI run `29788913948` passed in 32s. Evidence:
  `Blueprints/handoffs/2026-07-20-m1p-p2-form-controls.md`.

- **M1-P P2 ListRow progress (2026-07-20):** Shared native ListRow foundation is
  complete on branch `codex/m1p-p2-list-row` / PR #169. Android RED proved the
  row was absent, then `:core:designsystem:connectedDebugAndroidTest` passed
  17/17 on `Medium_Phone` Android 17 and `:app:assembleDebug` passed. Unsigned
  iOS simulator CI run `29791872304` passed for commit `a8aa7e3`. Evidence:
  `Blueprints/handoffs/2026-07-20-m1p-p2-list-row.md`.

## Current state

- Production is live on KVM1; `/api/health` and `/api/ready` were healthy at the latest verified baseline.
- Omen is free indefinitely. Stripe application code and residual checkout references were removed on `main` via PRs #117 and #118. The production Supabase table/column cleanup remains a separately gated database action.
- The public ESPN setup guide, extension/store assets, and promo cut merged via PR #122; its regression test fix merged via PR #123.
- Public legal/support/delete pages merged via PR #121.
- The transparent horizontal lockup is already wired in current `main` (`Header.jsx`, `Landing.jsx`, `OmenLanding.jsx`) and the transparent asset exists in `frontend/public/`; the old Phase 4.21 build item is closed.
- The Omen UI North Star is active via PR #124. Canonical Button, Input/Textarea, selection controls, Badge/Chip, PlatformBadge, PlatformConnectionCard, PageHero, state components, Tooltip, MetricStrip, and PlayerRow/PlayerChip are on `main`. Trade Analyzer Phase B migration merged via PR #139.
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
- **Skills:** `slops-repo-inspector`, `slops-design-system-pack`, `slops-ui-ux-audit`, `slops-code-review`, `slops-quality-baseline`, `slops-git-flow`
- **Done when:** full/simple/favicon/app-icon SVGs pass structure, transparency, size-tier, brand-rule, and visual checks; PR is either approved for merge or receives concrete revision findings.
- **Evidence:** SVG structure report, large/small screenshots or contact sheet, PR review verdict, skill receipt.
- **Do not touch:** app wiring, favicons, production deploy, or brand doctrine beyond review findings.

### A2 — Decide PR #132: Master Design System Blueprint v1

- **Priority:** P1
- **Cost:** medium
- **Blocked by:** Justin approval of proposed typography/cursor/background direction; PR currently needs reconciliation with newer SVG work
- **Agent-buildable:** analysis and reconciliation only
- **Skills:** `slops-repo-inspector`, `planning-pass`, `slops-context-markdown`, `slops-design-system-pack`, `slops-ui-ux-audit`, `design-md-author` only where the approved contract requires it
- **Done when:** Justin chooses approve, revise, or close; the blueprint is rebased/reconciled against PR #140 and current UI authority; status and decision log agree.
- **Evidence:** decision memo, conflict/reconciliation table, PR disposition.
- **Do not touch:** runtime fonts, Remotion output, cursor code, or tokens before approval.

### A3 — Production security and Supabase review

- **Priority:** P0
- **Cost:** small
- **Blocked by:** Justin pin and access window
- **Agent-buildable:** audit preparation only
- **Skills:** `slops-repo-inspector`, `security-privacy-evidence`, `rbac-risk-review`, `slops-verify`, `slops-exec-summary`
- **Done when:** production settings/secrets checklist is reviewed without exposing values; findings are classified; any mutation is separately approved.
- **Evidence:** sanitized audit matrix and founder decision.
- **Do not touch:** secret values, production database, DNS, Nginx, TLS, or environment variables.

### A4 — Tuesday scoring production enablement

- **Priority:** P0
- **Cost:** small
- **Blocked by:** approved no-write Supabase dry-run against real nflverse data; Justin production-change pin
- **Agent-buildable:** dry-run preparation and verification; env flip is gated
- **Skills:** `slops-repo-inspector`, `slops-data-ingest-plan`, `security-privacy-evidence`, `slops-verify`, `slops-quality-baseline`, `slops-ship`, `slops-canary`
- **Done when:** dry-run validates real rows without writes; production flag is explicitly approved and changed; readiness and cron health pass; rollback owner is named.
- **Evidence:** dry-run report, approval, change record, post-change canary.
- **Do not touch:** production flag before approval; never log provider credentials or raw user data.

## B. Recommendation system — highest-value product work

### B1 — Unified Omen recommendation contract

- **Priority:** P0
- **Cost:** medium
- **Blocked by:** none
- **Agent-buildable:** yes
- **Status:** Completed 2026-07-19 on branch `codex/b1-unified-omen-recommendation-contract`.
- **Recommended surface:** Claude for contract synthesis or Codex for code-grounded contract analysis; not exclusive ownership
- **Skills:** `slops-repo-inspector`, `planning-pass`, `product-gap-analysis-session`, `workflow-tree-spec`, `slops-ai-integration-review`, `security-privacy-evidence`, `slops-context-markdown`
- **Done when:** one recommendation contract defines how existing Omen of the Week and `POST /api/optimizer/mvp-move` become one system; mock/off-season/no-data fallback policy and recovery-analytics timing are decided; `Blueprints/api-routes.md` and decision log agree.
- **Evidence:** `Direction/reviews/2026-07-19-b1-unified-omen-recommendation-contract.md`, `Direction/reviews/2026-07-19-ai-integration-omen-recommendation-contract.md`, `Direction/reviews/2026-07-19-b1-security-privacy-evidence.md`, `Blueprints/handoffs/2026-07-19-b1-unified-omen-recommendation-contract.md`.
- **Do not touch:** recommendation route behavior in this design item; only safe contract metadata may be reconciled.

### B2 — Implement unified Omen recommendation layer

- **Priority:** P1
- **Cost:** large
- **Blocked by:** none; B1 contract complete.
- **Agent-buildable:** yes
- **Status:** Completed locally 2026-07-19 on branch `codex/b2-unified-omen-phase-plan`; not pushed, merged, deployed, or production-smoked.
- **Skills:** `slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd`, `slops-ai-integration-review`, `security-privacy-evidence`, `demo-mode-pre-empty-state`, `slops-quality-baseline`, `slops-code-review`
- **Spec:** `Blueprints/specs/b2-unified-omen-recommendation-layer.md`
- **Phase plan:** B2A route-level contract guard; B2B internal recommendation boundary; B2C `DecisionBrief` field completeness. Keep as one branch only if the diff stays focused; otherwise split B2A first.
- **Field need:** every Omen envelope must preserve `contract_version`, `state`, `feature`, `mode`, `request_id`, `generated_at`, safe `platform`/`league`/`team`, `signals`, `recommendation`, `alternatives`, `warnings`, and safe `error` where applicable. Success recommendations must expose title/move, impact, confidence, risk, explanation, and signal honesty fields per the B2 spec.
- **Done when:** there is one non-competing recommendation path; direct live POST cannot silently fall back to mock; auth, live/mock/off-season/empty/recovery/error states match B1; field needs above are tested; deterministic fallback remains honest; tests/build/audit pass.
- **Evidence:** intended RED, GREEN, broader suite, API contract, AI/security reviews, handoff, field-completeness test.
- **Do not touch:** cloud spend, provider credentials, SQL, or deploy without separate approval.

### B2-D — Complete the canonical Omen engine: live Waiver + Trade intelligence

- **Priority:** P0
- **Cost:** large
- **Blocked by:** reconcile/land the current B2 implementation first; then provider-specific live-data capability proof.
- **Agent-buildable:** yes, in small backend PRs after a shared API/state contract and test matrix.
- **Source of truth:** GitHub issue #162. Omen is the one core tool: the canonical `POST /api/omen/mvp-move` route must safely honor the selected team/league context and honestly choose among Start/Sit, live Waiver, and personalized Trade recommendations.
- **Skills:** core implementation + `slops-ai-integration-review`, `slops-data-ingest-plan`, `security-privacy-evidence`, `rbac-risk-review`, `slops-code-review`
- **Done when:** #162 acceptance evidence is complete: server-verified multi-league context; real waiver/player-pool logic; personalized trade logic; deterministic recommendation selection; provider capability matrix; no mock/stub advice presented as live.
- **Evidence:** shared contract/test matrix, focused PR receipts, provider capability proof, live-mode honesty tests, security review, handoff.
- **Do not touch:** provider credentials, deployment, production data mutations, or store configuration without separate approval.

### B3 — DecisionBrief composition

- **Priority:** P0
- **Cost:** medium
- **Blocked by:** none; B1 contract complete.
- **Agent-buildable:** yes; component-only PR first
- **Recommended surface:** Jules for the bounded component brief; Codex/Claude may execute if available
- **Skills:** `slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd`, `slops-taste`, `slops-ui-ux-audit`, `slops-mobile-smoke`, `slops-quality-baseline`, `slops-code-review`
- **Done when:** reusable `DecisionBrief` covers verdict, recommendation, confidence, risk, impact, reasoning, input honesty, alternatives, and feedback slot with documented variants and no page migration.
- **Evidence:** component handoff, build/tests, accessibility and responsive audit, skill receipt.
- **Do not touch:** `OmenOfTheWeek.jsx` until the component PR merges.

### B4 — Migrate Omen of the Week to DecisionBrief

- **Priority:** P0
- **Cost:** medium
- **Blocked by:** B3; B2 backend implementation is complete locally and still needs merge/deploy before production UI migration claims.
- **Agent-buildable:** yes
- **Skills:** `slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd`, `demo-mode-pre-empty-state`, `slops-ux-copy`, `slops-taste`, `slops-ui-ux-audit`, `slops-mobile-smoke`, `slops-quality-baseline`, `slops-code-review`, `slops-verify`
- **Done when:** `/omen` uses the unified contract and standard composition/states; live/mock/stale/off-season/disconnected are explicit; recommendation is visually dominant; desktop/mobile light/dark checks have no P0/P1.
- **Evidence:** route tests, screenshots, UI/copy/code reviews, real or contract-faithful state verification.
- **Do not touch:** provider connection mechanics or production data.

## C. UI overhaul — page migrations

### C1 — Draft Assistant primitive migration

- **Priority:** P1
- **Cost:** medium
- **Blocked by:** none; required primitives are on `main`
- **Agent-buildable:** yes
- **Skills:** `slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd`, `slops-taste`, `slops-ui-ux-audit`, `slops-mobile-smoke`, `slops-quality-baseline`, `slops-code-review`; add `slops-ux-copy` only if words change
- **Done when:** scoring controls, inputs, player rows, metrics, and state handling use canonical components; recommendation logic and payloads are unchanged; desktop/mobile light/dark pass.
- **Evidence:** focused regression tests, build/audit, screenshots, UI/code review, skill receipt.
- **Do not touch:** recommendation math unless separately scoped.

### C2 — Connect League primitive migration

- **Priority:** P1
- **Cost:** medium
- **Blocked by:** none; PlatformConnectionCard and ESPN guide are on `main`
- **Agent-buildable:** yes
- **Skills:** `slops-repo-inspector`, `planning-pass`, `workflow-tree-spec`, `slops-git-flow`, `slops-tdd`, `security-privacy-evidence`, `slops-legal-spot-check`, `slops-ux-copy`, `slops-ui-ux-audit`, `slops-mobile-smoke`, `slops-quality-baseline`, `slops-code-review`
- **Done when:** Yahoo/Sleeper/ESPN cards use standard connection/state components; recovery and browser handoff remain truthful; no cookie value can appear in UI/log/share payload; responsive QA passes.
- **Evidence:** state-tree tests, privacy/legal notes, screenshots, review verdicts.
- **Do not touch:** auth/provider contracts, Vault data, or extension permissions without separate scope.

### C3 — Football Command Center migration

- **Priority:** P1
- **Cost:** large
- **Blocked by:** PageHero and state primitives are on `main`; confirm no concurrent hot-file PR
- **Agent-buildable:** yes
- **Skills:** `slops-repo-inspector`, `planning-pass`, `slops-design-system-pack`, `slops-git-flow`, `slops-tdd`, `slops-taste`, `slops-ui-ux-audit`, `slops-mobile-smoke`, `slops-quality-baseline`, `slops-code-review`
- **Done when:** `/football` is organized around today, roster, moves, league, and record; current PlatformStatusBar, standings, post-win pulse, and tool access remain functional; no generic tab-bucket regression.
- **Evidence:** page tests, before/after screenshots, responsive/accessibility audit, code review.
- **Do not touch:** backend summary contracts unless a separate request is filed.

### C4 — MarketingHero component and public-front-door migration

- **Priority:** P2
- **Cost:** large; split into component PR then page PR
- **Blocked by:** approved visual direction from A2, or explicit decision to proceed under current North Star only
- **Agent-buildable:** yes after blocker
- **Skills:** `slops-repo-inspector`, `planning-pass`, `slops-design-system-pack`, `slops-git-flow`, `slops-tdd`, `slops-taste`, `slops-ux-copy`, `slops-ui-ux-audit`, `slops-mobile-smoke`, `slops-quality-baseline`, `slops-code-review`, `slops-legal-spot-check`
- **Done when:** component is reusable; `/`, `/about`, and public demo surfaces use canonical marketing grammar; claims, platform attribution, waitlist, and demo honesty remain correct.
- **Evidence:** component/page handoffs, copy/legal check, screenshots, build/tests.
- **Do not touch:** provisional marketing pillars without fresh approval.

### C5 — Standings team-switching UX

- **Priority:** P2
- **Cost:** medium
- **Blocked by:** none; confirm current provider-state contract first
- **Agent-buildable:** yes
- **Skills:** `slops-repo-inspector`, `planning-pass`, `workflow-tree-spec`, `slops-git-flow`, `slops-tdd`, `slops-ui-ux-audit`, `slops-mobile-smoke`, `slops-quality-baseline`, `slops-code-review`
- **Done when:** switching connected platform/team context is obvious, keyboard usable, and preserves off-season/empty/error states; no provider request regression.
- **Evidence:** focused tests, state matrix, desktop/mobile screenshots, review verdicts.

## D. Backend, data, and AI support

### D1 — Real `GET /api/trade/pulse` endpoint

- **Priority:** P1
- **Cost:** medium
- **Blocked by:** none
- **Agent-buildable:** yes
- **Skills:** `slops-repo-inspector`, `planning-pass`, `pre-build-research`, `slops-data-ingest-plan`, `slops-git-flow`, `slops-tdd`, `demo-mode-pre-empty-state`, `security-privacy-evidence`, `slops-quality-baseline`, `slops-code-review`
- **Done when:** backend returns computed buy-low targets; static list is retired or explicit offline fallback; source status is truthful; empty/error/stale paths are tested and documented.
- **Evidence:** ingest plan, contract, RED/GREEN, broader suite, security review, frontend state verification.
- **Do not touch:** paid data source or new dependency without approval.

### D2 — `AI_PROVIDER=local|cloud` control with $0 cap

- **Priority:** P1
- **Cost:** medium
- **Blocked by:** none; founder decision already sets $0 cloud spend
- **Agent-buildable:** yes
- **Skills:** `slops-repo-inspector`, `planning-pass`, `slops-ai-integration-review`, `slops-financial-sketch`, `slops-git-flow`, `slops-tdd`, `security-privacy-evidence`, `slops-quality-baseline`, `slops-code-review`
- **Done when:** local remains default; cloud execution cannot spend money and hard-fails closed or is disabled; status reporting leaks no URL/secret; tests prove the cap behavior.
- **Evidence:** AI/cost/data-flow review, RED/GREEN, config contract, quality results.
- **Do not touch:** paid API credentials or production env.

### D3 — Win-streak summary contract

- **Priority:** P2
- **Cost:** medium
- **Blocked by:** none
- **Agent-buildable:** yes
- **Skills:** `slops-repo-inspector`, `planning-pass`, `slops-data-ingest-plan`, `slops-git-flow`, `slops-tdd`, `security-privacy-evidence`, `slops-quality-baseline`, `slops-code-review`
- **Done when:** dashboard summary exposes safe integer/null win streak for Sleeper/Yahoo/ESPN from real matchup history; tests cover win/loss/tie/unavailable; contract is documented.
- **Evidence:** source-to-transform plan, route tests, contract and security review.

### D4 — Omen latency investigation

- **Priority:** P2
- **Cost:** medium
- **Blocked by:** none; B1 contract complete.
- **Agent-buildable:** yes
- **Skills:** `slops-repo-inspector`, `slops-investigate`, `slops-ai-integration-review`, `planning-pass`, `slops-tdd`, `slops-quality-baseline`, `slops-code-review`
- **Done when:** measured bottleneck is identified; one bounded optimization is implemented or a no-change recommendation is documented; output correctness and fallback behavior do not regress.
- **Evidence:** before/after measurements, cause analysis, tests, recommendation.

## E. Mobile / app-store coherence

### E1 — Decide mobile product path: full app-store build vs ESPN relay-only shell

- **Priority:** P0
- **Cost:** small
- **Blocked by:** none
- **Agent-buildable:** recommendation memo; founder decision required
- **Skills:** `slops-repo-inspector`, `planning-pass`, `product-gap-analysis-session`, `workflow-tree-spec`, `security-privacy-evidence`, `slops-legal-spot-check`, `slops-exec-summary`
- **Done when:** one mobile scope is authoritative; Phase 4.20 and Phase 5 wording no longer conflict; obsolete queue items are closed or reframed.
- **Evidence:** Have/Need/Gap table, state/data-flow comparison, founder decision, sprint/spec updates.
- **Do not touch:** app code, Apple credentials, SQL, or provider flows in this decision item.

### E2 — App-store readiness closeout

- **Priority:** P1
- **Cost:** medium
- **Blocked by:** E1; merged evidence from 4.20a-d must be reverified on current `main`
- **Agent-buildable:** yes after decision
- **Skills:** `slops-repo-inspector`, `planning-pass`, `security-privacy-evidence`, `slops-legal-spot-check`, `mobile-first-qa-playbook`, `slops-mobile-smoke`, `slops-verify`, `slops-quality-baseline`, `slops-exec-summary`
- **Done when:** chosen mobile build has correct Stripe/ESPN behavior, public legal/support/delete surfaces, affiliation disclaimers, privacy inventory, demo/reviewer route, and no gambling/DFS claims; release-readiness status is current.
- **Evidence:** closeout matrix linked to merged PRs, fresh test/build/audit, mobile QA report.

### E3 — iOS ESPN relay shell phases 5.1–5.4

- **Priority:** P2 experimental
- **Cost:** large across four small/medium PRs
- **Blocked by:** E1; Phase 5.2 by 5.1; Phase 5.3 by Justin-approved `connection_mode` schema action and endpoint contract; Phase 5.4 by 5.3
- **Agent-buildable:** code phases yes after gates; Apple credential steps are Justin-only
- **Skills:** `slops-repo-inspector`, `pre-build-research`, `workflow-tree-spec`, `slops-data-ingest-plan`, `security-privacy-evidence`, `rbac-risk-review`, `slops-git-flow`, `slops-tdd`, `mobile-first-qa-playbook`, `slops-quality-baseline`, `slops-code-review`, `slops-verify`
- **Done when:** each phase satisfies `Blueprints/specs/ios-espn-relay-app-plan-v1.md`; raw cookies never enter app state/log/storage; backend normalization reuses existing adapters; successful connect hands off to the web product.
- **Evidence:** per-phase tests, real-account verification without secrets, security review, signed-build evidence where applicable.
- **Do not touch:** production schema or Apple credentials without Justin.

## F. Verify lane — Justin must pin

### F1 — Service-key Supabase route-scoping audit

- **Priority:** P1
- **Cost:** medium
- **Blocked by:** Justin pin
- **Skills:** `slops-repo-inspector`, `rbac-risk-review`, `security-privacy-evidence`, `slops-tdd`, `slops-code-review`, `slops-context-markdown`
- **Done when:** every service-key route has route/query/scoping-column/test mapping; any unscoped query becomes a P0 defect with a failing isolation test.
- **Evidence:** dated audit table and test references.

### F2 — Resolve `ready` vs `pending_live_engine` documentation conflict

- **Priority:** P1 → **P0 (pinned 2026-07-19)** — native M3 depends on one honest status truth
- **Cost:** small
- **Blocked by:** ~~Justin pin~~ **pinned**; gates the M0-BE backend bundle and native M3
- **Skills:** `slops-repo-inspector`, `slops-verify`, `slops-context-markdown`, `planning-pass`
- **Done when:** runtime and all active contracts use one status truth for connected Sleeper/ESPN users; stale wording is corrected without changing behavior unless separately approved.
- **Evidence:** source-of-truth trace and doc diff.

### F3 — First company-baseline skill-receipt pilot

- **Priority:** P0 operating-system improvement
- **Cost:** small addition to the next implementation task
- **Blocked by:** complete; paired with B1 on 2026-07-19.
- **Skills:** `slops-repo-inspector`, `planning-pass`, plus the selected task’s full bundle; `slops-retro` after closeout
- **Done when:** plan names skills and N/A reasons; handoff records actual results/gaps; usage ledger links evidence; at least one skill improvement is accepted or explicitly judged unnecessary.
- **Evidence:** plan, skill receipt, ledger row, retro decision.

### F4 — ESPN public handoff production verification

- **Priority:** P1
- **Cost:** small
- **Blocked by:** Justin pin if production interaction is required
- **Skills:** `slops-repo-inspector`, `slops-verify`, `mobile-first-qa-playbook`, `security-privacy-evidence`, `slops-ui-ux-audit`
- **Done when:** `/espn-connect`, extension links/assets, share/copy fallbacks, walkthrough, and regression test pass on phone/desktop without exposing cookie names or values in shared payloads.
- **Evidence:** browser/device matrix and security/UI verdict.

## G. Deferred / blocked backlog

These remain real but should not displace P0/P1 work.

- **G1 — Win-streak reward ladder UI.** Priority P2; cost medium; blocked by D3. Skills: UI / UX bundle + `slops-ux-copy`. Done when documented 1/2/3/4/5+ states render from real backend streak data with reduced-motion equivalents.
- **G2 — ESPN live draft Lazy Sync.** Priority P2; cost large; blocked by stable provider contract and season timing. Skills: Data / ingest + Trust boundary + `slops-verify`. Done when real live-draft sync works without credential/logging regressions.
- **G3 — Yahoo live draft Lazy Sync.** Priority P2; cost large; same skill/evidence bar as G2.
- **G4 — IDP / defensive-player draft support.** Priority P3; cost large; blocked by explicit supported-league/data scope. Skills: `pre-build-research`, Data / ingest, UI / UX. Done when defensive positions flow through data, controls, recommendations, and tests.
- **G5 — Skeleton narration states.** Priority P2; cost small; fold into B4/C1 rather than create duplicate page-local loading UI. Skills: UI / UX bundle.
- **G6 — Umami integration.** Priority P3; cost small; soft-blocked on approved observability container and privacy posture. Skills: `self-hosted-observability-runbook`, `security-privacy-evidence`, core implementation, release bundle.
- **G7 — Provider render polish.** Priority P2; cost medium; fold into B4 and F4. Skills: UI / UX + `slops-verify`.
- **G8 — Retire baked-black PNG fallback.** Priority P2; cost small; blocked until at least 2026-07-28 and a clean production soak after PR #120. Skills: core implementation + UI audit + release verification. Done when old file and references are gone with no cached-asset regression.
- **G9 — Five code TODOs.** Priority P3; cost medium; split into separate tasks. Skills: core implementation plus Data / ingest where provider/data behavior changes.
- **G10 — Post-live learning cycle.** Priority P2 milestone; cost large; blocked by Release Done plus seven stable days and a seven-day `slops-product-pulse`. Skills: `slops-product-pulse`, `slops-learning-loop`, `slops-retro`, `planning-pass`.

## Removed from the active queue during grooming

- Operational repo/deploy rename approval: already completed; the repo and KVM1 deploy path are Omen.
- Orphaned `src/omen_gdpr.js` cleanup: merged via PR #119.
- Account subscription-card removal and Stripe integration removal: superseded/completed by PRs #117 and #118.
- Phase 4.20b and 4.20d: merged via PRs #121 and #115.
- ESPN mobile onboarding, public setup guide, and walkthrough production: merged via PRs #122 and #123; only verification remains.
- Phase 4.21 transparent lockup swap: merged via PR #120 and confirmed in current source.
- Completed UI primitive work and Trade Analyzer migration: PRs #125–#139; follow-on page migrations are tracked above.
- Per-team design documents, team-colorway stubs, and chant implementation: removed from the active sprint because team-based app theming was removed via PR #114 and the active North Star treats team skins as future-only. Preserve as historical/future research, not current build instructions.
- Paid-launch and Omen Pro wording: removed from operating instructions because Omen is free indefinitely.

## Guardrails

- Do not recreate an `Omen/` nested directory.
- Do not touch `.env`, secret values, DNS, SSL/TLS, Nginx, production infrastructure, Supabase migrations/schema, Apple credentials, or production flags without explicit approval.
- Do not deploy unless Justin explicitly approves the deploy action.
- Docs/doctrine-only pushes must not restart KVM1.
- ESPN cookie values must never appear in logs, UI, screenshots, URLs, analytics, share payloads, or stored app state outside the approved backend secret flow.
- Mock/demo/stale/offline data must be visibly labeled and never represented as live fantasy advice.
- Account deletion copy and the exact confirmation phrase `DELETE MY OMEN DATA` require fresh approval before change.
- Team-based runtime theming is removed. Do not revive team skins or stale team-design instructions without a new approved theme-pack plan.
- No paid dependency, cloud model spend, or external service commitment without explicit approval.
