# Omen Current Sprint

**Last updated:** 2026-07-30 (migrated to the status model; 22 CLOSED records moved to `Direction/sprints_completed.md`)
**Purpose:** Active execution queue only — `READY`, `IN_PROGRESS`, `VERIFIED`. Completed evidence belongs in `Direction/sprints_completed.md`, `Blueprints/done/LEDGER.md`, PRs, and dated handoffs.

## How agents use this file

Task states, `Claim:` and `Evidence:` requirements, `Blocked by:` / `Unblock:` grammar, closure types, selection order, and WIP rules are defined in **`Direction/status-model.md`** — the operational mirror carried by this repo so it works in standalone clones and CI. L0 holds the shared canonical source; if both copies are available and disagree on `SCHEMA_VERSION` or operational content, that is a blocking Truth Gate failure — halt and report.

1. Read `Direction/agent_inbox.md` first. A pinned task there overrides this queue.
2. Select only `Status: READY`, agent-buildable work whose `Blocked by:` line is `None`, ordered by the selection rule.
3. Do not auto-pull **Founder / Ops**, **Verify**, **Decision**, database, deploy, or production-mutation work.
4. Keep implementation in small PRs. If an item needs more than about 80 words of implementation detail, write or use a spec and leave the sprint item as a pointer.
5. On completion set `Status: VERIFIED` with an `Evidence:` pointer. Move to `Status: CLOSED` with a `Closure:` value (`COMPLETED` needs evidence, `SUPERSEDED` needs a successor, `DESCOPED` needs a reason) once the result is placed in `Direction/sprints_completed.md` with the appropriate Done receipt; update the decision log only when a decision changed, and record actual skill use. `CLOSED` is terminal — a regression creates a new linked task rather than reopening.

## 2026-07-30 migration summary

This queue was migrated from the retired checkbox mechanic to the status model. 35 task dispositions were reconciled against `main` and the GitHub PR record.

- **13 active** here (13 `READY`, 0 `IN_PROGRESS`, 0 `VERIFIED`).
- **22 `CLOSED`** (18 `COMPLETED`, 4 `DESCOPED`) moved to `Direction/sprints_completed.md` §"Planning-pipeline cutover — migrated dispositions (2026-07-30)". They are not duplicated here.
- Two items surfaced during reconciliation — ESPN waiver-pool implementation and the Actions-restoration sweep — are **not** canonical tasks. They are held in `Direction/agent_inbox.md` under "Planning intake — pending planning-pass" and are not selectable.

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

- **Pause** all new web page migrations and new web-only primitive work.
- **Keep** the existing web app and safe backend work. The API, auth, demo, recommendation contract, platform safety, tests, and production maintenance are native foundations; do not rip them out or treat the web UI as a wrapper target.
- **Native targets:** iPhone uses SwiftUI; Android uses Kotlin + Jetpack Compose. Do not start React Native.
- **M0 contracts are approved.** Native implementation is allowed only inside the approved contracts and current gates.
- **No app-store action yet.** Apple/Google accounts, signing, release configuration, provider flows, DNS/deploy, SQL, and secrets remain gated.

### Agent tools and canvas

All native-agent work is governed by `Blueprints/specs/mobile/omen-native-agent-capabilities-canvas-v1.md`, `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`, and the official [Omen Native Design House](https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3). No agent may assume access to secrets, production, provider data, Figma library publishing, or store accounts.

## Current state

- Production is live on KVM1; `/api/health` and `/api/ready` were healthy at the latest verified baseline.
- Omen is free indefinitely. Stripe application code and residual checkout references were removed on `main`. The production Supabase table/column cleanup remains a separately gated database action.
- Backend test baseline: 469/469 green locally during the selector recovery. GitHub Actions remains unavailable under the billing hold; local evidence is the substitute.
- Tuesday scoring remains disabled until the no-write production dry-run passes and Justin approves the production flag change.

# Active queue

## A. Founder / review gates — do not auto-pull

### A3 — Production security and Supabase review

- **Status:** VERIFIED
- **Evidence:** `Direction/reviews/2026-07-31-a3-production-security-supabase-review.md` (repo-only pass; two items — live Certbot/TLS state and live RLS re-confirmation — flagged as needing a separate access window, not closed here).
- **Priority:** P0
- **Cost:** small
- **Agent-buildable:** audit preparation only
- **Done when:** production settings/secrets checklist is reviewed without exposing values; findings are classified; any mutation is separately approved.
- **Do not touch:** secret values, production database, DNS, Nginx, TLS, or environment variables.

### A4 — Tuesday scoring production enablement

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — production-change pin for the environment flip
- **Blocked by:** TASK-B3 — nflverse scoring replacement must land before an honest nflverse dry-run is possible (found 2026-07-31; current cron is Sportradar-only, no dry-run mode exists in code)
- **Priority:** P0
- **Cost:** small
- **Agent-buildable:** dry-run preparation and verification only, once B3 lands; the env flip is gated
- **Done when:** dry-run validates real rows without writes; production flag is explicitly approved and changed; readiness and cron health pass; rollback owner is named.
- **Do not touch:** the production flag before approval; never log provider credentials or raw user data.

## M. Native mobile execution lane

### M3A-QA — Native auth interactive real-device QA

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — founder/human credential and inbox access
- **Priority:** P0
- **Cost:** small, human-gated
- **Agent-buildable:** preparation only
- **Done when:** Android Play-services AVD or real device proves Google sign-in, email OTP, session restore, account deletion, and log safety; iOS real device proves Sign in with Apple, email OTP, session restore, account deletion, and log safety.
- **Evidence:** sanitized QA matrix; no screenshots or logs containing credentials or tokens.
- **Do not touch:** real credentials in agent logs or screenshots.

### M4-CC-WaiverWatch — Waiver Watch composition + wiring

- **Status:** READY
- **Blocked by:** None — Figma proposal approved (node `67:2`, "03 — Components", badge updated to "APPROVED COMPOSITION — Justin, 2026-07-31"). Ready for native implementation planning; no trust assignment yet covers writing SwiftUI/Compose code for this item.
- **Priority:** P1
- **Cost:** medium
- **Scope:** replace the "Waiver Watch is landing next" placeholder in `OmenCommandCenterScreen` with the approved composition per mobile-visual-briefs §1.3 (Tuesday–Wednesday urgent briefing + Thursday–Monday calm opportunity list). Required states: pending, processed, availability-unknown, no-credible-move, not-connected, off-season.
- **Done when:** the approved composition renders all six registered states on both platforms, primitive-enforcement scanner green, connected tests and `:app:assembleDebug` green.
- **Do not touch:** provider claims, real waiver deadlines from unverified data, backend, live provider auth.

### M4-CC-LedgerPreview — Ledger preview composition + wiring

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — Figma-approved Ledger preview proposal on `03 — Components`
- **Priority:** P1
- **Cost:** small–medium
- **Scope:** replace the "The Ledger is landing next" placeholder with the approved composition per mobile-visual-briefs §1.4 (immutable snapshot rows, outcome language table, no win-rate/streak/celebration).
- **Done when:** the approved composition renders on both platforms with scanner and tests green.
- **Do not touch:** the ledger data model (owned by backend), real move outcomes without verified sources.

### M4-CC-LeaguePulse — League Pulse composition + wiring

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — founder-approved visual brief §1.6 (does not exist yet)
- **Blocked by:** FOUNDER_APPROVAL — Figma-approved League Pulse proposal on `03 — Components`
- **Priority:** P2
- **Cost:** small–medium
- **Scope:** replace the "League Pulse is landing next" placeholder once the approved composition exists.
- **Done when:** the approved composition renders on both platforms, or an honest empty state ships until real events flow in.
- **Do not touch:** invented league-activity data.

### M4-CC-PlatformsCompact — Shrink Your-Platforms strip on Command Center

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — Figma-first §3.2 proposal for the compact row shape (does not exist yet)
- **Priority:** P1
- **Cost:** small–medium
- **Scope:** compact each `OmenPlatformConnectionCard` to a single-line row so Omen stays the hero above the fold on iPhone SE. Target shape: `[PlatformBadge] Sleeper · Connected · 4m ago  ›` connected, `[PlatformBadge] Yahoo · Not connected [Connect]` disconnected. Move Manage-league / full Connect CTAs into a tap-through detail sheet. Hard cap the strip at ~2 row-heights.
- **Motivation:** founder feedback 2026-07-23 — current cards take too much vertical real estate.
- **Done when:** compact rows render for both connected and disconnected states on both platforms; the Omen card is visible without scroll on iPhone SE (375×667) and Pixel 6a-class Android; the detail sheet handles Manage/Connect; scanner, connected tests, and `:app:assembleDebug` green.
- **Do not touch:** live provider connect flow, provider credentials, deep-link config, F2 status contract.

### M4-Auth-Providers-v1 — Discord OAuth + Passkeys (WebAuthn)

- **Status:** READY
- **Blocked by:** EXTERNAL — GitHub Actions billing hold blocks iOS CI verification; restore expected ~2026-08-01
- **Priority:** P1
- **Cost:** medium
- **Current state:** PR #198 is open and code-complete for the Discord sub-scope; it is the one item with no local verification path. Passkeys deferred to a separate `M4-Auth-Passkeys-Onramp` follow-up (P2).
- **Confirmed Supabase state** (project `xyudxfhqejbwvjngiwhw`, 2026-07-23): Email, Google, Apple, Discord, Passkeys enabled; all others disabled.
- **Done when:** both surfaces ship on Android + iOS; `OmenAuthFlow` renders each button only when its provider is available; the deep-link callback exchanges the Discord code for a session; passkey pairing on a fresh device produces a working credential; scanner, connected tests, `:app:assembleDebug`, and iOS CI green.
- **Do not touch:** provider client secrets (stay in Supabase Studio), Yahoo OAuth, Apple credentials, deploy.

### M4-Help-Support-Implementation — Build approved native Help + Support

- **Status:** READY
- **Blocked by:** EXTERNAL — GitHub Actions billing hold blocks iOS unsigned CI
- **Blocked by:** AGENT_RESOLVABLE — complete Android TalkBack, font-scale, and compact/large-phone screenshot evidence
- **Priority:** P1
- **Cost:** medium
- **Current state:** implementation merged via PR #229; Android compile/scanner evidence green. This is **not** VERIFIED — the `Done when:` criteria below explicitly require accessibility and visual evidence that has not been produced. No valid active `Claim:` exists (checked 2026-07-30), so this is `READY`, not `IN_PROGRESS`.
- **Done when:** iOS and Android meet the approved contract with scanner/tests, compact and large-phone visual evidence, VoiceOver/TalkBack and Dynamic Type/font-scale checks, and an honest parity/limitation record.
- **Do not touch:** new API endpoints, provider credentials/cookies, account/store settings, analytics, deployment, or production.

## B. Backend/recommendation lane

### B2-D — Complete the canonical Omen engine: live Waiver + Trade intelligence

- **Status:** READY
- **Blocked by:** AGENT_RESOLVABLE — provider-specific live-data capability proof still outstanding for ESPN
- **Priority:** P0
- **Cost:** large
- **Source of truth:** GitHub issue #162. Canonical `POST /api/omen/mvp-move` must safely honor selected team/league context and honestly choose among Start/Sit, live Waiver, and personalized Trade recommendations.
- **Current state:** the Sleeper waiver stack and deterministic selector landed (PRs #215, #238, #239, #240); Yahoo availability-only fallback landed (PR #236). ESPN implementation is held in planning intake pending `planning-pass`.
- **Done when:** #162 acceptance evidence is complete — server-verified multi-league context; real waiver/player-pool logic; personalized trade logic; deterministic recommendation selection; provider capability matrix; no mock/stub advice presented as live.
- **Do not touch:** provider credentials, deployment, production data mutations, or store configuration without separate approval.

### D1 — Real `GET /api/trade/pulse`

- **Status:** READY
- **Blocked by:** AGENT_RESOLVABLE — scope the remaining delta against merged PR #197 before pulling
- **Priority:** P1
- **Cost:** medium
- **Current state:** PR #197 landed the honest live-or-unavailable contract — `src/routes/trade.js:180` returns `source_status: "live_adp_unavailable"` with an empty set, and `:189` computes `buy_low` when a source exists. The remaining delta is the live ADP source itself.
- **Done when:** backend returns computed buy-low targets; the static list is retired or an explicit offline fallback is in place; source status is truthful; empty/error/stale paths are tested and documented.
- **Do not touch:** paid data source or new dependency without approval.

### B3 — Replace Sportradar with nflverse for Tuesday scoring

- **Status:** READY
- **Blocked by:** None
- **Priority:** P1
- **Cost:** medium
- **Source:** surfaced 2026-07-31 during A4 dry-run prep (`Direction/reviews/2026-07-31-a4-tuesday-scoring-dry-run-prep.md`). `src/omen_tuesday_cron.js` requires `SPORTRADAR_API_KEY` (paid) and has zero nflverse integration or dry-run mode, despite `deploy/hostinger/ENV-INVENTORY.md` describing both a "current nflverse scoring path" and an `OMEN_CRON_DRY_RUN` flag that don't exist in code.
- **Scope:** replace the Sportradar fetch in `fetchNFLScores()`/`runScoring()` with a weekly nflverse `player_stats_<season>.csv` pull (same free, no-key GitHub-releases source already used by `src/services/matchupService.js`, which carries `season`/`week`/`position`/`fantasy_points(_ppr)` columns); implement the `OMEN_CRON_DRY_RUN` flag so scoring can run read-only; drop `SPORTRADAR_API_KEY` from `REQUIRED_SCORING_ENV`.
- **Done when:** Tuesday scoring sources weekly player fantasy points from nflverse instead of Sportradar; `OMEN_CRON_DRY_RUN=true` runs the full scoring pass against real rows with zero Supabase writes; `SPORTRADAR_API_KEY` is no longer required; tests cover the nflverse row-mapping and dry-run no-write behavior; `npm test` green.
- **Do not touch:** the production `OMEN_CRON_SCORING_ENABLED` flag; no production cron deploy without separate approval.

## F. Verify lane — Justin must pin

### F1 — Service-key Supabase route-scoping audit

- **Status:** VERIFIED
- **Evidence:** `Direction/reviews/2026-07-31-f1-service-key-route-scoping-audit.md`; `test/userPrivacyIsolation.test.js` (4 tests), `test/espnRouteIsolation.test.js` (3 tests); `npm test` 476/476 at the time of this closure.
- **Priority:** P1
- **Cost:** medium
- **Done when:** every service-key route has a route/query/scoping-column/test mapping; any unscoped query becomes a P0 defect with a failing isolation test.
- **Do not touch:** production data; secret values.

### F5 — ESPN connect walkthrough recording

- **Status:** READY
- **Blocked by:** None
- **Priority:** P2
- **Cost:** small-medium
- **Source:** surfaced 2026-07-31 during F4 verification (`Direction/reviews/2026-07-31-f4-espn-public-handoff-verification.md`). Production `/espn-connect` still shows the placeholder copy "A mock 90-second Chrome/Edge walkthrough is coming here" — descoped out of F4 rather than blocking that verification pass.
- **Scope:** record/produce the ~90-second Chrome/Edge walkthrough of the ESPN Connect helper flow using mock/demo data only — no real ESPN account or credentials, matching the page's own existing promise. Embed or link the asset on `EspnConnectGuide.jsx`, replacing the placeholder copy.
- **Done when:** the walkthrough asset exists, renders correctly on desktop and mobile, and contains no real ESPN credentials, cookies, or account data.
- **Do not touch:** real ESPN account/credentials in the recording; any live cookie values.

### F4 — ESPN public handoff production verification

- **Status:** VERIFIED
- **Evidence:** `Direction/reviews/2026-07-31-f4-espn-public-handoff-verification.md`; `test/espnConnectGuideRegression.test.js` (5 tests); `npm test` 481/481.
- **Priority:** P1
- **Cost:** small
- **Done when:** `/espn-connect`, extension links/assets, share/copy fallbacks, and the regression test pass on phone and desktop without exposing cookie names or values in shared payloads. (Walkthrough split out to F5, 2026-07-31 — see that item.)
- **Do not touch:** ESPN cookie values in logs, UI, URLs, or payloads.

## Deferred / paused backlog — not selectable

These are real but are **not** active tasks and carry no status. They must not displace native P0/P1 work, and they are not eligible for selection until `planning-pass` promotes them.

- E1 mobile scope decision remains useful but no longer authorizes the older ESPN-relay-only shell ahead of the full native plan without a new founder decision.
- E2/E3 app-store closeout / relay shell remain blocked by E1 and explicit store/provider gates.
- G1 win-streak reward ladder UI waits on a backend win-streak contract.
- G2 ESPN live draft Lazy Sync and G3 Yahoo live draft Lazy Sync wait on a stable provider contract and season timing.
- G4 IDP support remains P3 and needs an explicit supported-league/data scope.
- G5 skeleton narration states should fold into the relevant native composition or future web migration.
- G6 Umami integration remains soft-blocked on an approved observability container and privacy posture.
- G8 baked-black PNG fallback deletion waits on a clean production soak.
- G9 code TODOs must be split into separate tasks.
- G10 post-live learning waits on Release Done, seven stable days, and `slops-product-pulse`.
- M5 theme packs / skins deferred behind M4 — core Omen themes and accessibility first.

## Required kickoff output

Before implementation, the agent must print:

1. task ID and exact scope;
2. priority, cost, blockers, and done-when;
3. selected skills and N/A reasons;
4. files expected to change;
5. test/evidence plan;
6. do-not-touch boundaries;
7. branch name and serialization/hot-file check.

If the pulled item's done-when cites CI, state the local-evidence substitute you will record instead.

## Required closeout output

The handoff must include:

- actual files changed;
- intended RED, GREEN, broader tests/build/audit results as applicable;
- UI/security/legal/AI evidence as applicable;
- actual skills used, skipped, substituted, or weak;
- one concrete skill improvement or an explicit "no correction needed" verdict;
- branch/commit/PR/deploy status without implying local work is live.

## Guardrails

- Do not recreate an `Omen/` nested directory.
- Do not touch `.env`, secret values, DNS, SSL/TLS, Nginx, production infrastructure, Supabase migrations/schema, Apple credentials, or production flags without explicit approval.
- Do not deploy unless Justin explicitly approves the deploy action.
- Docs/doctrine-only pushes must not restart KVM1.
- ESPN cookie values must never appear in logs, UI, screenshots, URLs, analytics, share payloads, or stored app state outside the approved backend secret flow.
- Mock/demo/stale/offline data must be visibly labeled and never represented as live fantasy advice.
- Account deletion copy and exact confirmation phrase `DELETE MY OMEN DATA` require fresh approval before change.
- Team-based runtime theming is removed. Do not revive team skins without a new approved theme-pack plan.
- No paid dependency, cloud model spend, or external service commitment without explicit approval.
