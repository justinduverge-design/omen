# Omen Current Sprint

**Last updated:** 2026-08-05 (revamped around the 1.0 plan — added Store/Release, Security, and Ops lanes; every lane now maps to a phase gate)
**Purpose:** Active execution queue only — `READY`, `IN_PROGRESS`, `VERIFIED`, `BLOCKED`. Completed evidence belongs in `Direction/sprints_completed.md`, `Blueprints/done/LEDGER.md`, PRs, and dated handoffs.
**Scope and sequence:** `Direction/omen-1.0-plan.md`. **Evidence record:** `Direction/release_readiness.md`.

## How agents use this file

Task states, `Claim:` and `Evidence:` requirements, `Blocked by:` / `Unblock:` grammar, closure types, selection order, and WIP rules are defined in **`Direction/status-model.md`** — the operational mirror carried by this repo so it works in standalone clones and CI. L0 holds the shared canonical source; if both copies are available and disagree on `SCHEMA_VERSION` or operational content, that is a blocking Truth Gate failure — halt and report.

1. Read `Direction/agent_inbox.md` first. A pinned task there overrides this queue.
2. Select only `Status: READY`, agent-buildable work whose `Blocked by:` line is `None`, ordered by the selection rule.
3. Do not auto-pull **Founder / Ops**, **Store / Release**, **Verify**, **Decision**, database, deploy, or production-mutation work.
4. Keep implementation in small PRs. If an item needs more than about 80 words of implementation detail, write or use a spec and leave the sprint item as a pointer.
5. On completion set `Status: VERIFIED` with an `Evidence:` pointer. Move to `Status: CLOSED` with a `Closure:` value (`COMPLETED` needs evidence, `SUPERSEDED` needs a successor, `DESCOPED` needs a reason) once the result is placed in `Direction/sprints_completed.md` with the appropriate Done receipt; update the decision log only when a decision changed, and record actual skill use. `CLOSED` is terminal — a regression creates a new linked task rather than reopening.

## Product shape and the deadline

**Omen is a mobile app** (iPhone SwiftUI + Android Kotlin/Compose) that also has a web app. The web app is secondary and is **not** the beta surface.

The NFL season sets the deadline, not the backlog:

| Date | Event | Meaning |
|---|---|---|
| ~2026-08-24 | **beta open target** | two weeks of real feedback before Week 1 |
| ~2026-09-10 | **NFL Week 1** | Start/Sit, Waiver, and Trade go live-or-broken at once. First real load. |
| ~2026-09-15 | first Tuesday scoring | the core loop provable end to end |

**Founder decisions 2026-08-05:**

- **Draft Assistant is cut from 1.0.** Ships 2027 on a Slops-built ADP developed over fall/winter. Remove it from store metadata, onboarding copy, and marketing claims. Cutting it removed the mid-August draft-season wall and bought back ~3 weeks.
- **Both platforms ship the beta together.** Consistent with every M4 `Done when:` already requiring both.
- **Apple Developer Program is enrolled**; account transfer to Valor Ventures in progress. See R1.

## Phase gates

Each phase has exactly one gate. Do not start the next until it passes.

| Phase | Lane | Gate |
|---|---|---|
| 1 — Unblock the stores | **R** | an app record can be created and a build uploaded on both platforms |
| 2 — Close the native lane | **M**, **B** | feature freeze declared; nothing "prepared locally, not deployed" |
| 3 — Close the observability gap | **O** | a deliberate **native crash** appears in the error backend within 60s on both platforms. *Infrastructure observability is already done — see O1.* |
| 4 — Prove it | **F**, **S** | three providers pass real-account QA; zero unlabeled mock output |
| 5 — Beta open | **R6**, marketing | 10+ real testers in real leagues, both platforms |
| 6 — Season hardening | **A4** | one clean Tuesday scoring run on real data |

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
- **Store work is now OPEN and founder-executed** — see lane R. *(Changed 2026-08-05. This line previously read "No app-store action yet." That was correct under a web-first plan and became the single biggest blocker once mobile became the primary surface: store provisioning is calendar time no agent can compress.)* Apple/Google accounts, signing, release configuration, provider flows, DNS/deploy, SQL, and secrets remain **founder-gated** — gated means Justin executes, not that the work is deferred.

### Agent tools and canvas

All native-agent work is governed by `Blueprints/specs/mobile/omen-native-agent-capabilities-canvas-v1.md`, `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`, and the official [Omen Native Design House](https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3). No agent may assume access to secrets, production, provider data, Figma library publishing, or store accounts.

## Current state

- Production is live on KVM1; `/api/health` and `/api/ready` healthy at the latest verified baseline.
- Omen is free indefinitely. Stripe application code and residual checkout references were removed on `main`. The production Supabase table/column cleanup remains a separately gated database action.
- Backend test baseline: **537/537 green** (`npm test`, 2026-08-15, PR #309). PRs gated by `pr-quality.yml` (#253). The "Actions billing hold" was a misdiagnosis — two config bugs, fixed in #250.
- Native test baseline: iOS **188** (Xcode 26.6, iPhone 17 Pro sim), Android **50** connected instrumentation on API 36, both after `M6-ContextualHelp` (#312).
- Native: Discord OAuth merged both platforms (#198). A signed-in native user can connect a Sleeper league and see real league state (#309, #310).
- **Queue reconciled 2026-08-16.** 23 finished items moved to `Direction/sprints_completed.md` → "Sprint-queue reconciliation — 2026-08-16". This file now carries active work only.
- **No provider is proven with a real connected account.** This is the top beta risk.
- **Store provisioning underway (2026-08-05).** iOS app record is **created** — `Omen — Fantasy Football Tool`, bundle `com.slopssaloon.omen`, "Prepare for Submission". Root cause of the earlier failure was agreements setup under the Valor Ventures entity, not the account transfer. **Android record still to be created (R2-Android).** Next iOS gate is R3 signing, which is what a TestFlight build needs.
- Tuesday scoring remains disabled until the no-write production dry-run passes and Justin approves the production flag change.

# Active queue

## A. Founder / review gates — do not auto-pull

### A4 — Tuesday scoring production enablement

- **Status:** BLOCKED
- **Blocked by:** FOUNDER_APPROVAL — persistent production enablement; `OMEN_CRON_SCORING_ENABLED` remains `false`.
- **Blocked by:** EXTERNAL — [#263](https://github.com/justinduverge-design/omen/issues/263), nflverse has not published `player_stats_2026.csv`, so pre-season scoring must defer instead of recording a failed move.
- **Blocked by:** TASK-A5 — the fallback source decision determines what this enables against if nflverse never publishes. Typed 2026-08-11; the dependency already existed in prose but was not machine-readable.
- **Priority:** P0
- **Cost:** small
- **Phase:** 6 — **season gate, not a beta gate.** Do not count this against beta. The dry-run is preparable now; the flag flip waits for September.
- **Agent-buildable:** dry-run preparation and verification only; the env flip is gated
- **Done when:** dry-run validates real rows without writes; production flag is explicitly approved and changed; readiness and cron health pass; rollback owner is named.
- **Do not touch:** the production flag before approval; never log provider credentials or raw user data.

### A5 — Decide the Tuesday-scoring fallback data source

- **Status:** READY
- **Blocked by:** None
- **Priority:** P0
- **Cost:** small
- **Phase:** 2 — decide now, not in September
- **Agent-buildable:** research and options memo only; the vendor/source decision is founder-owned
- **Source:** if nflverse never publishes `player_stats_2026.csv`, the feature that closes Omen's entire loop has no data source for the whole season. A4 is blocked on an external publish nobody here controls.
- **Skills:** `pre-build-research`, `slops-data-ingest-plan`
- **Founder steer (2026-08-11):** prefer another **free** source in the nflverse class. Building a Slops-owned scraper is an accepted fallback but is the last option, not the opener — it converts a data problem into a maintenance obligation that runs every Tuesday during the season. Evaluate free sources first and say plainly whether any clears licence and latency.
- **Done when:** at least two viable fallback sources are evaluated for licence, cost, coverage, latency, and ToS; the build-our-own option is costed against them including in-season maintenance; a recommendation and a trigger date are recorded; Justin picks one or explicitly accepts the nflverse-only risk.
- **Do not touch:** paid commitments, new dependencies, or provider contracts without explicit approval.
- **Memo delivered 2026-08-15:** `Direction/reviews/2026-08-15-a5-scoring-source-options.md`. Two free in-class sources evaluated (Sleeper, ESPN), the fork costed against them, recommendation and trigger date recorded. **Awaiting the founder pick — the agent half of this item is discharged; the decision is not.**
- **Founder steer amended 2026-08-15 — vendor-agnostic.** The requirement is that scoring survive any one source dying, for Sleeper, ESPN, and Yahoo users alike. The memo's key finding is that this is *source*-agnosticism, not provider-agnosticism: weekly fantasy points are a league-independent NFL fact, and the pipeline already keys on normalized player name, emits all three scoring formats, and dependency-injects `fetchNFLScores`. The seam exists; the memo proposes formalizing it as a `ScoreSource` interface with ordered fallback.
- **Premise corrected 2026-08-15.** This item was written as "if nflverse never publishes `player_stats_2026.csv`." That file was never going to exist under that name for any season — see `A5-NflversePath` below. The real question is fallback resilience, not one missing file.

### A6-MovesScoringFormat — Persist league scoring format on recommendations

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — adds a column to the deployed `moves` schema; per facts-of-record #8 an agent authors the SQL as review-only source and never applies it
- **Priority:** P1 — correctness defect in the grading loop
- **Cost:** small
- **Source:** 2026-08-15 A5 research.
- **What is wrong:** `fetchPendingMoves` selects without `scoring`, carrying the in-source note "`scoring` is not present in the deployed moves schema. scoreMove already defaults an absent format to PPR." So **every** move is graded as PPR. A standard or half-PPR league's recommendation is graded against points its league does not award. `nflverseScoresFromCsv` already computes `rec_std`, `rec_half`, and `rec_ppr` — all three are produced and two are discarded.
- **Why it belongs to the vendor-agnostic ask:** this is the one genuinely *per-league* dimension of scoring. It is not fixed by adding data sources, and it affects Sleeper, ESPN, and Yahoo users identically.
- **Done when:** the league's scoring format is captured at recommendation time and persisted on the move; `scoreMove` reads it rather than defaulting; the PPR default remains only for historical rows that predate the column; review-only SQL authored in `sql/`, not applied.
- **Do not touch:** applying SQL to staging or production — that is the gated founder sequence, in order: approval → staging → verification → production.

## R. Store and release — critical path, founder-executed

**Phase 1.** This lane is the longest pole and most of it is calendar time no agent can compress. Agents may prepare artifacts; **Justin executes every item here.** Run these first each week — everything else can proceed in parallel, these cannot.

### R2-Android — Google Play Console account + app record

- **Status:** IN_PROGRESS
- **Blocked by:** EXTERNAL — Google organization verification is **under review** as of 2026-08-11. No further founder action is available until Google responds.
- **Unblock:** 2026-08-11 ROUTED — registration was submitted and initially rejected. Root cause was **the wrong D-U-N-S number**: `145076002`, labelled *Resolution Duns* in the D&B correspondence, was being entered instead of the actual assigned D-U-N-S **`14-800-8695` (`148008695`)**. The correct number appears nowhere in that D&B email, which is why it was missed. Resubmitted with `148008695`; Google accepted it and moved the account to review. Two earlier theories — entity-name mismatch and propagation delay — were **wrong and are withdrawn**.
- **Open correction:** the D&B record still lists **Legal Form: Corporation**. Valor Ventures is an **LLC**. This did not block Google, but it is inaccurate on the record and should be corrected with D&B directly; leaving it risks a mismatch surfacing at a later verification step.
- **Priority:** **P0 — the unblocked half of Phase 1.**
- **Cost:** small ($25 one-time registration)
- **Agent-buildable:** metadata drafting only; account actions founder-executed
- **Account type: ORGANIZATION.** Decided 2026-08-05. Two reasons, both decisive:
  1. **Personal accounts created after 2023-11-13 must run a closed test with 12+ testers opted in for 14 *consecutive* days before they can even apply for production access. Organization accounts are exempt.** Internal testing does **not** count toward that requirement — so the planned internal-track beta would satisfy none of it.
  2. A personal account publishes the founder's own name as the developer, contradicting `Direction/decision_log.md` (2026-08-02) and PRs #268/#269, which establish **Valor Ventures Limited Liability Company** as Omen's public legal operator.
- **Registration inputs:** D-U-N-S **`148008695`** (verified correct 2026-08-11 — *not* `145076002`, which is the Resolution Duns and will be rejected); organization name `Valor Ventures Limited Liability Company`; address `23 Darrow St, New London, CT 06320` (recorded as authorized for publication); website; phone.
- **Account status (2026-08-11):** account submitted, **organization verification under review by Google.** The payments profile display name was corrected to the Valor Ventures entity before submission; the D-U-N-S could not be added from the payments centre and had to go in via the developer registration flow.
- **⚠ Register from the right Google account — this is near-permanent.** The Play Console is owned by the **Google account** that signs up, not by the address displayed publicly. Transferring ownership later is support-driven and painful — the same shape of problem as the Apple entity transfer. **Do not register with a personal `@gmail.com`.** Create a Google account using `owner@slopssaloon.com` (a Google Account can use any email address; it need not be Gmail-hosted) and register from that, so console owner, legal entity, and public contact align from day one.
- **Public contact decided 2026-08-10:** `support@slopssaloon.com` — an existing alias, consistent with the `legal@` and `privacy@` precedent set on 2026-08-02. `owner@slopssaloon.com` remains **not published** per that same decision.
- **⚠ The developer phone is published too.** Organization listings display the phone alongside the email. Provision a business/VoIP number before registering rather than exposing a personal mobile permanently.
- **App record:** `applicationId = com.slopssaloon.omen` (verified `mobile/android/app/build.gradle.kts:23`, matching iOS). App (not game). **Free** — note Play allows paid→free but **never free→paid**, which suits the free-indefinitely posture.
- **Done when:** the organization developer account is verified and the app record exists with the application ID matching the Android build.
- **Do not touch:** pricing, public availability, or release scheduling.

### R3-BUILD-iOS — Establish an iOS build-and-signing path

- **Status:** READY
- **Blocked by:** None
- **Unblock:** 2026-08-11 CLEARED — founder purchased a Mac mini (the stated lean in Option 1 below); delivery expected 2026-08-12. The `FOUNDER_DECISION — hardware/spend` blocker is resolved, and `FOUNDER_DECISION` was never a valid blocker type under `Direction/status-model.md` — retyped in the same pass. **This is the gateway item for the entire iOS lane:** it unblocks M3A-QA on-device debugging, F10's iOS half, O6 symbolication, R3/R6 signing and upload, and the local `xcodebuild` substitution now cited by `Blueprints/definition-of-done.md`. Pull it first once the machine arrives.
- **Unblock:** 2026-08-12 REASSESSED — **Option 1 is executed.** The Mac mini is the trusted local iOS development host and runs Xcode 26.6 (`17F113`). The existing project now uses Automatic Signing for team `6RWR5G9894` while retaining bundle ID `com.slopssaloon.omen`; a connected `iPhone15,4` was paired, trusted, placed in Developer Mode, registered through Xcode's normal provisioning flow, and the existing Omen app built, installed, and launched on it. The committed simulator command from `Blueprints/definition-of-done.md` also ran on an iPhone 16 simulator with **108 tests, 0 failures**, but Xcode 26.6 does not match that row's Xcode 16.2 pin, so this is strong local regression evidence rather than a claim of exact CI-toolchain equivalence. **Status stays `READY`:** this item's `Done when:` requires a signed build to reach TestFlight; no archive, distribution upload, TestFlight action, entitlement, or capability change occurred.
- **Priority:** **P0 — no iOS beta exists without this**
- **Cost:** small (rent) or ~$400–600 (buy)
- **Agent-buildable:** no
- **Source:** `Blueprints/specs/mobile/omen-native-build-environment-v1.md:22` already states it — "this Windows workstation cannot run Xcode, an iOS simulator, or a signed build on an iPhone." `ios-ci.yml` runs `CODE_SIGNING_ALLOWED=NO` by design. **Nothing in the pipeline currently produces a distributable iOS build.**
- **Constraint discovered 2026-08-05:** Xcode Cloud requires **Xcode 15+ on a Mac** to create the first workflow (web can edit/launch afterward). The founder's **2017 MacBook Air cannot run it** — it tops out at macOS Monterey (Ventura dropped 2017 Airs), and Xcode 15 needs macOS 13.5+. Independently, `IPHONEOS_DEPLOYMENT_TARGET = 17.0` needs the iOS 17 SDK, which ships only with Xcode 15+.
- **Options:**
  1. **Buy a Mac mini** (~$400 refurb M1/M2, $599 new M4) — **founder's stated lean.** Also unblocks M3A-QA on-device debugging, F10 device matrix, and O6 crash symbolication. No rented-machine credential exposure.
  2. **Rent a hosted Mac hourly** (~$1/hr, no minimum) *once* to create the Xcode Cloud workflow, then run free forever on the 25 included compute hours/month. ~$5–20 total. Caveat: requires signing into Xcode with the Apple ID on third-party hardware.
  3. **GitHub Actions macOS runner with manual signing** — no Mac needed (CSR can be generated with `openssl` on Windows), but the repo is **private** so macOS runners bill at **10×**. GitHub Free's 2,000 minutes ≈ 200 macOS minutes ≈ 1–2 signed builds/month, and `ios-ci.yml` already draws from that pool. Violates the "no billed macOS minutes" posture in the build-environment spec.
- **Done when:** a signed iOS build reaches TestFlight, produced by a repeatable path, with the option chosen and its cost recorded.
- **Do not touch:** Apple ID credentials on any machine that is not trusted; billed macOS minutes without explicit approval.

### R3-BUILD-Android — Fix the release build config and add signing

- **Status:** VERIFIED — **2026-08-05**
- **✅ DONE — do not rebuild (merged as `231c9d2`):** all three original defects are fixed. `release` reads `OMEN_API_BASE_URL` from config (default `https://slopssaloon.com`), `OMEN_DEMO_MODE_ENABLED = false`, a `signingConfigs` block reads the upload keystore from `local.properties` or environment, and a shippability guard fails the build on a placeholder URL or missing signing. `mobile/android/local.properties.example` documents the keys. **No agent code is owed here.**
- **🔨 REMAINING — founder-only, ~10 minutes:** generate the upload keystore with `keytool`, set the four `omen.release*` keys in `local.properties`, and enroll in Play App Signing. Then `./gradlew bundleRelease` produces the signed AAB the `Done when:` requires and this closes. **Never commit the `.jks` or any password.** An agent cannot do this part and should not try.
- **Blocked by:** FOUNDER_APPROVAL — upload keystore generation and Play App Signing enrollment
- **Unblock:** 2026-08-16 REASSESSED — retyped from `None`. The build config was agent work and is done; what remains is a founder credential action, so `None` was understating the gate.
- **Evidence:** merged to `main` as `231c9d2`. Release now resolves `OMEN_API_BASE_URL` from config with a `https://slopssaloon.com` default and sets `OMEN_DEMO_MODE_ENABLED = false`; a `signingConfigs` block reads the upload keystore from `local.properties` or environment; a release shippability guard fails the build on a placeholder/blank API URL or missing signing (escape hatch `OMEN_ALLOW_UNSIGNED_RELEASE=true`). Added `mobile/android/local.properties.example`. Verified on Windows: `:app:bundleRelease` without signing fails with the guard message; `generateReleaseBuildConfig` emits the production URL and demo mode `false`; `generateDebugBuildConfig` unchanged; `:app:testDebugUnitTest` BUILD SUCCESSFUL.
- **Remaining (founder):** generate the upload keystore with `keytool` and set the four `omen.release*` keys in `local.properties`. Never commit the `.jks` or any password. See `local.properties.example`.
- **Priority:** **P0 — three defects would each break the beta build**
- **Cost:** small–medium
- **Agent-buildable:** yes (the upload keystore itself is founder-generated and never committed)
- **Findings (2026-08-05, `mobile/android/app/build.gradle.kts`):**
  1. **Line 47** — `release` hardcodes `OMEN_API_BASE_URL = "https://example.invalid"` rather than reading from config. A release AAB cannot reach the backend at all.
  2. **Line 48** — `release` sets `OMEN_DEMO_MODE_ENABLED = true`. **The beta build ships in demo mode.** This collides directly with F9 and the standing guardrail that mock data must never be presented as live fantasy advice. Testers would receive demo output believing it was real. Highest-severity of the three.
  3. **No `signingConfigs` block** — `./gradlew bundleRelease` emits an unsigned AAB, which Play rejects.
  - Supabase URL / anon key / Google web client ID *do* read from git-ignored `local.properties` (`.gitignore:44`), so any machine or CI without that file builds them empty.
- **Scope:** give `release` a real API base URL and `OMEN_DEMO_MODE_ENABLED = false`; add a `signingConfigs` block reading an upload keystore from `local.properties` or environment; enroll in Play App Signing; keep every real value out of git.
- **Skills:** core implementation + `security-privacy-evidence`
- **Done when:** `./gradlew bundleRelease` produces a signed AAB pointing at the real API with demo mode off; no keystore, password, or key is committed; a test or check asserts release ≠ demo mode.
- **Do not touch:** committing the keystore or any password; the `debug` build's demo defaults.

### R3 — Signing and provisioning

- **Status:** BLOCKED
- **Blocked by:** None for iOS (R2-iOS VERIFIED 2026-08-05); R2-Android for the Android side
- **Priority:** P0
- **Cost:** small–medium
- **Agent-buildable:** no — certificates and keys
- **Done when:** iOS distribution certificate and provisioning profile exist and a signed build uploads successfully; Android upload key and Play App Signing are configured and a signed AAB uploads successfully.
- **Do not touch:** never place certificates, keys, or passwords in the repo, logs, or agent output.

### R4 — Privacy nutrition labels and Data Safety form

- **Status:** BLOCKED
- **Blocked by:** None for iOS (R2-iOS VERIFIED 2026-08-05); R2-Android for the Android side
- **Priority:** P1
- **Cost:** small
- **Agent-buildable:** drafting yes; submission founder-only
- **Source:** the privacy policy shipped in #269 is the input. In-app account deletion is already implemented — that is an Apple requirement already satisfied.
- **Done when:** Apple privacy nutrition labels and the Google Data Safety form are drafted against actual data flows (Supabase auth, provider tokens, no ad SDKs), reviewed against the shipped privacy policy, and submitted.
- **Do not touch:** claims not supported by the actual data flow.

### R5 — Age rating and gambling questionnaire

- **Status:** BLOCKED
- **Blocked by:** None for iOS (R2-iOS VERIFIED 2026-08-05); R2-Android for the Android side
- **Priority:** **P0 — store-rejection risk**
- **Cost:** small
- **Agent-buildable:** drafting yes; submission founder-only
- **Source:** fantasy sports can trigger Apple's gambling review path. `Direction/reviews/2026-07-12-store-metadata-privacy-gambling-copy-audit.md` already exists — use it rather than re-deriving.
- **Skills:** `slops-legal-spot-check`
- **Done when:** both store questionnaires are answered consistently with the shipped copy and the existing gambling-copy audit; no marketing or in-app string implies wagering, real-money play, or guaranteed outcomes.
- **Do not touch:** answering a questionnaire in a way the app copy does not support.

### R6 — Internal testing tracks

- **Status:** BLOCKED
- **Blocked by:** TASK-R3
- **Blocked by:** TASK-R4
- **Blocked by:** TASK-R5
- **Blocked by:** FOUNDER_APPROVAL — the Phase 4 gate must close first
- **Unblock:** 2026-08-11 ROUTED — split from a single untyped comma list into typed, machine-readable lines per `Direction/status-model.md`. No dependency was added or removed.
- **Priority:** P0
- **Cost:** small
- **Phase:** 5 — this is beta open
- **Agent-buildable:** no
- **Source:** use **internal** tracks, not external. TestFlight internal and Play internal testing each allow ≤100 testers with **no review**, which keeps Apple's Beta App Review off the critical path entirely.
- **Done when:** both apps are installable by invited testers on internal tracks and 10+ real testers in real leagues have access.
- **Do not touch:** external/public tracks, or public store release, before Phase 6.

### R7 — Scrub store metadata of Draft Assistant claims

- **Status:** **CLOSED 2026-08-16.**
- **Closure:** COMPLETED — merged as PR [#315](https://github.com/justinduverge-design/omen/pull/315) / `08aa73f`, all four checks green. **Not deployed.** `Done when:` met in full; the recorded grep is below.
- **Claim:** Claude, 2026-08-16 — released on verification.
- **The store metadata was already clean; the defect was in the app.** `omen-store-listing-copy-v1.md`, `omen-store-review-notes-v1.md`, and `omen-store-privacy-and-rating-answers-v1.md` name Draft Assistant only as a *prohibition* with unticked R7 checkboxes, and the listing is still "Draft for founder review. Not submitted." Nothing there needed scrubbing. **Two false claims were live in shipped native copy on both platforms**, which this item's `Done when:` also covers ("in-app onboarding copy"):
  1. The **League placeholder** promised "…plus seasonal **Draft entry**, arrive in the M4-League-Screen slice" — a forward promise of a cut feature, which reads to a user as "coming soon", the phrasing `CLAUDE.md` prohibits.
  2. The **off-season Waiver Watch** state said Omen "will surface relevant **draft** and roster opportunities". With the draft path dark, 1.0 surfaces none.
- **Why `M6-ContextualHelp`'s existing ban did not catch either:** it bans the exact product name "Draft Assistant" in *help* copy. Neither string contains it, and neither is help copy. The new tests ban the **word** inside user-facing literals, which is the level the claim actually lives at.
- **Found while fixing it — an unrelated leak in the same sentences.** Both "landing next" placeholders told users their feature arrives "in the **M4-League-Screen** / **M4-Trade-Screen** slice". A sprint key is not a date, a version, or anything a user can act on. Removed from all five sites and banned by a shape-matching rule, so a newly-minted key cannot slip through either.
- **Contract amended, not silently overridden.** `omen-native-app-shell-auth-api-contract-v1.md` defined the League destination as carrying a "seasonal Draft entry" — it was the older authority, and the native copy was faithfully implementing it. Per governance §3 the conflict is recorded rather than quietly resolved: the `draft` destination row is **preserved** for 2027 and marked out of 1.0 scope, with an amendment note at §1.4.
- **Evidence:** RED proven on both platforms by restoring the original strings — iOS named both files and quoted both sentences; Android failed on `State=OffSeason`. GREEN: **iOS 192/192** (`xcodebuild test`, Xcode **26.6** build **17F113**, iPhone 17 Pro simulator; baseline 188 + 4 new incl. the `OmenIOSUITests` set), **Android 51/51** connected instrumentation on `medium_phone` API **36** (baseline 50, +1) with `:app:assembleDebug` green, backend **563/563**, frontend build clean, `git diff --check` clean.
- **Recorded grep (the `Done when:` artifact):** `grep -rniE '"[^"]*\bdrafts?\b[^"]*"'` across `mobile/ios/OmenIOS/OmenIOS` and `mobile/android/app/src/main` returns exactly **one** hit — `DesignSystemGalleryView.swift:334` `"Leave draft?"`, a discard-unsaved-work confirmation in the dev-only design-system gallery. Different sense of the word, never shipped in a fantasy context. `M4-Trade-Screen` / `M4-League-Screen` return none.
- **Blocked by:** None
- **Priority:** P1
- **Cost:** small
- **Agent-buildable:** yes
- **Source:** Draft Assistant is cut from 1.0. Any store listing, screenshot, onboarding string, or marketing line promising it is now a false claim.
- **Skills:** `slops-ux-copy`, `slops-legal-spot-check`
- **Done when:** no store metadata, screenshot, in-app onboarding copy, or marketing surface references Draft Assistant as an available 1.0 feature; a grep across app strings and marketing copy is recorded as evidence.
- **Do not touch:** the Draft Assistant code path itself — it stays in the repo for 2027, it just is not advertised.

## M. Native mobile execution lane

**Phase 2.** D7-equivalent scope (new auth providers) is deferred — every new provider is new store-review surface during the tightest five weeks.

### M5-Native-API-Client — Wire native screens to the existing Omen API

- **Status:** **VERIFIED (slices A + B + C + D, both platforms).** A+B+C 2026-08-15; **D 2026-08-16**. Slice E remains unstarted, F/G are design-gated; this item is not closed.
- **✅ DONE — do not rebuild (2026-08-15, PR [#309](https://github.com/justinduverge-design/omen/pull/309) `02857e7`):** slice **A** shared transport (base URL, bearer injection, timeout, typed error enum), slice **B** shell truth from `GET /api/dashboard/summary`, slice **C** provider strip. Both platforms. The fixtures they replaced (`OmenCommandCenterFixtures.realDisconnected`, the hardcoded connection cards) are gone from the live path. The repository/view-model pattern now exists on both platforms — **copy it, don't reinvent it.**
- **✅ DONE — slice D (2026-08-16), both platforms.** The Omen destination now renders `POST /api/omen/mvp-move` (`2026-05-18.omen-live.v1`) instead of picking a fixture. `OmenDecisionFixtures.realDisconnected` is **unreferenced on both platforms** — it is off the live path entirely, and `demo` is reachable only from the demo state. Every documented contract state is mapped from `omen-native-backend-state-contract-v1.md` §F2 + `src/services/omen.js`: `success`, `empty`, `off_season`, `platform_disconnected` → Connect, and all seven recovery states render the **server's own** sentence rather than a client re-wording. An unrecognised state fails safe to an error rather than being force-fitted into `success`. Evidence: **iOS 208/208** (Xcode 26.6 `17F113`, iPhone 17 Pro sim; baseline 192, +16), **Android 64/64** connected on `medium_phone` API 36 (baseline 51, +13), `:app:assembleDebug` + core JVM suites green, backend 563/563 unchanged.
- **🔨 REMAINING:** slice **E** (Ledger → `GET /api/moves`), pure wiring against a shipped route. Slices **F** and **G** are **not pullable** — they are new screens whose M1 screen-contract slices do not exist; keep the honest "landing next" placeholders until those are approved.
- **Claim:** Claude, 2026-08-15 — slices A + B + C. **Released 2026-08-16** — no one is advancing D–G right now.
- **Evidence (iOS A + B + C):** Xcode 26.6 (`17F113`) `xcodebuild test`, iPhone 17 Pro simulator — **158 tests / 0 failures**, up from a 123/0 baseline measured on the same machine by stashing the branch. Includes the primitive-enforcement scanner. Files: `App/Api/OmenApiClient.swift`, `DashboardSummary.swift`, `DashboardRepository.swift`, `CommandCenterViewModel.swift`, `LeagueStandings.swift`, wired through `AppShellView` → `CommandCenterView`. Handoff: `Blueprints/handoffs/2026-08-15-native-api-scope-and-scoring-source.md`.
- **Evidence (Android A + B + C):** `:app:assembleDebug` and `:app:assembleDebugAndroidTest` green; **26 connected instrumentation tests / 0 failures** on the `medium_phone` API 36 emulator (4 pre-existing Command Center tests + 22 new); `:core:auth`, `:core:session`, `:core:designsystem` JVM unit tests green. Files: `app/feature/api/OmenApiClient.kt`, `DashboardSummary.kt`, `LeagueStandings.kt`, `Repositories.kt`, `CommandCenterViewModel.kt`, wired through `OmenAndroidApp.kt`. Uses `org.json` and existing OkHttp — **no new dependency and no build-config change.**
- **Android test placement note:** the app module has no JVM `src/test` source set, and adding one would change build configuration and dependencies — outside this item's boundary. The slice A–C tests are pure logic but live in `androidTest` for that reason. If a future item adds a unit-test source set to `:app`, these should move.
- **Open:** slices **D–G**. D (Omen destination) and E (Ledger) are wiring against shipped routes. **F and G are not wiring** — they are new screens whose M1 screen-contract slices do not exist; do not pull them without approved design.
- **Slice C scope correction, 2026-08-15 (founder-approved).** The original slice C was written as `GET /api/platforms/state`. The Command Center's real gap was provider *identity* — league name and team name — which `platform-provider-state.v1` does not carry and `dashboard-summary.v1` does not either. **`league-standings.v1` already carries both**, for all three providers: `league_name` on the envelope (`src/routes/league.js:98`) and `team_name` + `is_current_user` per row (`adapters/sleeper.js:312`, `adapters/espn.js`, `services/yahoo.js`). So this needed **no backend change** — it was a client composition problem. An earlier note in this item calling it a backend ask was wrong and is retracted.
- **Progressive fill is the required shape, not a preference.** `dashboard-summary.v1` reads our own rows; `league-standings.v1` makes a **live provider call** — slower, independently failable, and correctly empty in the off-season. The Command Center renders fully from shell truth first, then upgrades the context strip in place if standings succeeds. A standings failure must never fail the screen, and the strip must never regress or fill with a placeholder. Tests lock all three.
- **Modeling note found in build (worth keeping):** `buildWaiverTool()` in `src/routes/dashboard.js` returns only `ready` or `needs_platform` — it has **no** off-season branch, because the season gate lives on `omen_of_the_week` via `isOffSeason()`. Waiver UI state must therefore take the season from the Omen status, or a connected user is told to watch waivers in August. A test caught this; the Android mapping must reproduce it.
- **Blocked by:** None. The backend routes, their contracts, and the native state mapping are all approved and live; no new backend, design, or founder gate is involved.
- **Priority:** **P0 — beta blocker.** Every approved Command Center and Omen composition renders hardcoded fixtures on a real signed-in device. `M4-CC-LedgerPreview`, `M4-CC-LeaguePulse`, `M4-CC-WaiverWatch`, and `M4-Omen-Screen` are all VERIFIED as *compositions* and all still show invented state to a real user. This item is what makes them true.
- **Cost:** medium
- **Agent-buildable:** yes, in full
- **Source:** 2026-08-15 native/backend reconciliation. A grep for `URLSession` / `dashboard/summary` across `mobile/ios` returns only auth and account files. The native app has no product API layer at all; both platforms say so in-source — `CommandCenterView.swift:23` selects `OmenCommandCenterFixtures.realDisconnected`, and `OmenCommandCenterScreen.kt:426` reads "context sees `realDisconnected` until live wiring exists."
- **Precedent:** `URLSessionAccountRepository.swift` / `OkHttpAccountRepository.kt` are a working repository pair against `DELETE /api/user/delete`. Every slice below repeats that pattern — base URL from `AppEnvironment`, bearer from `SessionManager`, typed outcome mapping.

**Slices, in dependency order. Each is independently shippable.**

| Slice | Route → contract | Replaces |
| --- | --- | --- |
| A. Transport | — | Shared client: base URL, bearer injection, timeout, typed error enum (`network` / `unauthorized` / `server` / `decode`). No screen changes. |
| B. Shell truth | `GET /api/dashboard/summary` → `dashboard-summary.v1` | `OmenCommandCenterFixtures.realDisconnected` |
| C. Provider strip | `GET /api/platforms/state` → `platform-provider-state.v1` | Hardcoded connection cards. Pairs with `M4-CC-PlatformsCompact`. |
| D. Omen destination | `POST /api/omen/mvp-move` → `2026-05-18.omen-live.v1` | `OmenDecisionFixtures` |
| E. Ledger | `GET /api/moves` → `moves-history.v1` | Ledger preview fixture (node `72:2` composition unchanged) |
| F. League page | `GET /api/league/standings` → `league-standings.v1` | "League is landing next" placeholder |
| G. Trade page | `POST /api/trade/compare` | "Trade is landing next" placeholder |

- **Beta-minimum is A + B + C + D.** That is a real signed-in user seeing their real connections and their real Omen. E is cheap once D lands. **F and G are not pure wiring** — they are new screens whose Figma slices do not exist yet (`M1` screen-contract items 4 and 5); do not pull them as part of this item, and keep the honest placeholders until those slices are approved.
- **Done when:** each pulled slice decodes its contract into the existing native state types on both platforms; loading, error, and empty states route to `OmenStateSurface` rather than crashing or substituting fixtures; demo mode still renders fixtures via `SessionManager.demoUserID`; iOS `xcodebuild test` and Android `:app:assembleDebug` + primitive-enforcement scanner green, with `xcodebuild -version` recorded per the local-substitute rule in `Blueprints/definition-of-done.md`.
- **Do not touch:** backend contracts — an unmet native need goes to `Blueprints/handoffs/frontend-to-backend.md`, not into `src/`. Do not invent state names; `omen-native-backend-state-contract-v1.md` §F2 is the mapping authority for `ready` / `pending_live_engine` / `needs_platform` / `off_season`. Do not collapse the demo path (facts-of-record #7 — mock stays labeled, never silently mixed with live). Never log bearer tokens or ESPN cookie values.

### M8-EspnAndroidHelper — Decide the Android ESPN path (deferred)

- **Status:** BLOCKED
- **Blocked by:** FOUNDER_DECISION — see the memo §7.2. Not started, and deliberately not parallel to `M7`.
- **Priority:** P2
- **Why it is not a mirror of iOS:** **Firefox does not support `storage.session.setAccessLevel` on any platform** (MDN browser-compat-data). `background.js` calls it precisely so the content script can read the payload the popup staged; without it that read throws and the handoff fails silently. A Firefox port is a **code change**, not a repackage — the staging step would move to message passing or a `storage.local` write with an immediate clear, which carries its own privacy review since `storage.local` persists where `storage.session` does not. An earlier read this session called Firefox Android "the most open path"; on the API that matters it is the closed one.
- **Edge Android** is on by default for Android 11+/Edge 123+ but uses a curated, sandboxed store. Verify Microsoft's current mobile curation policy directly before planning around it — the available sources were secondary and mixed quality.
- **Interim answer:** Android ESPN users connect on desktop via the published Chrome/Edge listings. Documented, not hidden.

### M3A-QA — Native auth interactive real-device QA

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — founder/human credential and inbox access
- **Unblock:** 2026-08-12 REASSESSED — the founder supplied the physical iPhone interaction needed for one successful native Sign in with Apple ceremony: the Apple sheet appeared, authorization completed, and Omen reached authenticated state. That is valid partial evidence, not the full matrix. Email OTP, return/cancel/background/termination cases, session restore, account deletion, log safety, and the Android half remain open.
- **Unblock:** 2026-08-13 PARTIALLY CLEARED — physical-iPhone evidence now covers Sign in with Apple, Face ID passkey registration/sign-in, Discord OAuth with PKCE return to Omen, six-digit email OTP, and persisted-session restore after force-close/reopen. Supabase custom SMTP was repaired with a Resend sending-only key scoped to `slopssaloon.com`; both signup and returning-user templates now emit `{{ .Token }}`, and Email OTP length is six digits. Xcode 26.6 passes **121 tests / 0 failures** after the callback and OTP-normalization fixes. **Status stays `READY`:** destructive account deletion was not run against a founder account, and Android email OTP/session restore/account deletion/log-safety interactive evidence remains open.
- **Priority:** **P0 — auth is the front door**
- **Cost:** small, human-gated
- **Agent-buildable:** implementation and local evidence; credential/inbox/device interactions remain founder-only
- **Done when:** Android Play-services AVD or real device proves Google sign-in, email OTP, session restore, account deletion, and log safety; iOS real device proves Sign in with Apple, email OTP, session restore, account deletion, and log safety.
- **Evidence:** sanitized QA matrix; no screenshots or logs containing credentials or tokens.
- **Do not touch:** real credentials in agent logs or screenshots.

### M4-CC-PlatformsCompact — Shrink Your-Platforms strip on Command Center

- **Status:** **VERIFIED 2026-08-16 — implementation merged, one done-when clause unevidenced.** Shipped as PR [#304](https://github.com/justinduverge-design/omen/pull/304) / `6466a4c` (2026-08-15). This item sat at `READY` after it merged — the fourth time this queue has advertised shipped work as pullable.
- **Evidence:** `6466a4c` — `OmenPlatformCompactRow.swift` (+197) and `OmenPlatformCompactRow.kt` (+173) with paired tests (`OmenCommandCenterScreenTests.swift` +50, `OmenPlatformCompactRowTest.kt` +52, `OmenCommandCenterScreenTest.kt` amended), wired into both `OmenCommandCenterScreen` files; iPhone SE renders at `References/evidence/2026-08-14-cc-platforms-compact/iphone-se-command-center-demo.png` and `iphone-se-dynamic-type-xxxl.png`; visual-brief and state-contract updates in the same commit. The status-dot sub-scope was deferred to post-beta polish by PR [#305](https://github.com/justinduverge-design/omen/pull/305).
- **✅ DONE — do not rebuild:** the compact row is **built, tested, and merged on both platforms** (`OmenPlatformCompactRow.swift` +197, `OmenPlatformCompactRow.kt` +173, wired into both `OmenCommandCenterScreen` files, paired tests on each). iPhone SE render evidence is committed. The status-dot sub-scope is deliberately deferred post-beta (#305). **No composition or code work is owed here.**
- **🔨 REMAINING — evidence + record, small:** one Pixel-6a-class Android render proving the Omen card sits above the fold, a recorded `:app:assembleDebug` + primitive-scanner + connected-test result, and a handoff file for `6466a4c`. Then this closes and `B-FREEZE` loses a blocker.
- **Unevidenced clause — do not claim it:** the `Done when:` requires the Omen card above the fold on **Pixel 6a-class Android** as well as iPhone SE. Only iPhone SE captures were committed, and PR #304 shipped **no handoff file**, so no `:app:assembleDebug` / scanner / connected-test result is recorded anywhere in the repo for this change. That is why this is `VERIFIED`, not `CLOSED`: close it by attaching the Android render and assembly evidence, not by deleting the clause.
- **Blocked by:** AGENT_RESOLVABLE — Android compact-row render + assembly/scanner evidence, and a handoff record for `6466a4c`
- **Priority:** **P1 — beta blocker.** The connect flow is the first screen that matters to a new tester.
- **Cost:** small–medium
- **Scope:** compact each `OmenPlatformConnectionCard` to a single-line row so Omen stays the hero above the fold on iPhone SE. Target shape: `[PlatformBadge] Sleeper · Connected · 4m ago  ›` connected, `[PlatformBadge] Yahoo · Not connected [Connect]` disconnected. Move Manage-league / full Connect CTAs into a tap-through detail sheet. Hard cap the strip at ~2 row-heights.
- **Motivation:** founder feedback 2026-07-23 — current cards take too much vertical real estate.
- **Done when:** compact rows render for both connected and disconnected states on both platforms; the Omen card is visible without scroll on iPhone SE (375×667) and Pixel 6a-class Android; the detail sheet handles Manage/Connect; scanner, connected tests, and `:app:assembleDebug` green.
- **Do not touch:** live provider connect flow, provider credentials, deep-link config, F2 status contract.

### M4-Help-Support-Implementation — Build approved native Help + Support

- **Status:** READY
- **Blocked by:** AGENT_RESOLVABLE — complete Android TalkBack, font-scale, and compact/large-phone screenshot evidence
- **Unblock:** 2026-08-11 REASSESSED — the iOS-CI half of this blocker is retired. As of 2026-08-11 `ios-ci.yml` no longer runs per-PR (release branches + manual dispatch only); routine iOS verification moved to the founder's Mac. **This makes the iOS half of this item Mac-required.** Run the `SUBSTITUTED` command in `Blueprints/definition-of-done.md` → "Local substitutes" and record the output. The Android half is unaffected and remains workable on Windows.
- **Priority:** **P1 — store metadata requires a support URL**, so this is on the release path, not just the product path.
- **Cost:** medium
- **Current state:** implementation merged via PR #229; Android compile/scanner evidence green. This is **not** VERIFIED — the `Done when:` criteria require accessibility and visual evidence that has not been produced.
- **Done when:** iOS and Android meet the approved contract with scanner/tests, compact and large-phone visual evidence, VoiceOver/TalkBack and Dynamic Type/font-scale checks, and an honest parity/limitation record.
- **Do not touch:** new API endpoints, provider credentials/cookies, account/store settings, analytics, deployment, or production.

### M4-Auth-Providers-v1 — Discord OAuth (iOS passkeys promoted separately)

- **Status:** READY
- **Blocked by:** None
- **Unblock:** 2026-08-11 REASSESSED — previously "CI-verifiable as of #250." That is no longer true: `ios-ci.yml` stopped running per-PR on 2026-08-11 (release branches + manual dispatch only). **The iOS half of this item is now Mac-required** — verify with the `SUBSTITUTED` `xcodebuild test` command in `Blueprints/definition-of-done.md` and record `xcodebuild -version` alongside the result. Android remains workable on Windows.
- **Priority:** P1
- **Cost:** small — **verification only, not implementation**
- **Current state:** **PR #198 is MERGED** (`73c5a1d`, 43 files, +1911/−33 across Android and iOS auth). Reconciled 2026-08-05 — the prior line said "open and code-complete," true when written and stale by the time it was read. The founder promoted the iOS passkey half on 2026-08-12 as `M4-Auth-Passkeys-iOS-Onramp`; Android remains deferred.
- **Unblock:** 2026-08-13 VERIFIED LOCALLY — Discord OAuth completed on the Play-enabled Android emulator and physical iPhone. Supabase's provider-owned OAuth `state` is no longer overwritten; Omen's CSRF state travels inside the allow-listed `redirect_to`. Android preserves PKCE state across the callback with a single-task activity, and iOS consumes `ASWebAuthenticationSession`'s callback URL directly rather than waiting on an `onOpenURL` event the system session may consume. Supabase recorded successful PKCE exchanges; Android tests/assembly and iOS **121/0** are green.
- **Confirmed Supabase state** (project `xyudxfhqejbwvjngiwhw`, 2026-07-23): Email, Google, Apple, Discord, Passkeys enabled; all others disabled.
- **Done when:** `OmenAuthFlow` renders each button only when its provider is available; the deep-link callback exchanges the Discord code for a session; scanner, connected tests, `:app:assembleDebug` green, and the local Mac `xcodebuild test` run green — all recorded as evidence. "iOS CI green" is no longer an available citation for this item outside a release branch.
- **Do not touch:** provider client secrets (stay in Supabase Studio), Yahoo OAuth, Apple credentials, deploy.

### M4-Auth-Passkeys-iOS-Onramp — Complete native iOS passkey authorization

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — merge and production-deploy the reviewed AASA route at `slopssaloon.com`; this PR does not deploy
- **Blocked by:** FOUNDER_APPROVAL — after AASA is live, perform the Face ID passkey pair → sign out → passkey sign-in ceremony on the physical iPhone
- **Priority:** **P1 — founder pin 2026-08-12.** This supersedes the earlier P2 deferral for the iOS half only.
- **Cost:** small — implementation and local evidence are complete; external association and interactive proof remain
- **Current state:** branch `feat/m3a-ios-apple-auth` implements the native `AuthenticationServices` provider, official Supabase first-factor passkey endpoints, account add/list/remove, one-time pairing offer, the `webcredentials:slopssaloon.com` entitlement, and an AASA artifact/explicit Express route. Xcode 26.6 (`17F113`) passes **121 tests / 0 failures**; Automatic Signing under team `6RWR5G9894` builds and installs the app on the registered iPhone with both Apple Sign In and Associated Domains in the signed entitlements. The public AASA URL still returns 404 until an approved merge/deploy.
- **Done when:** `https://slopssaloon.com/.well-known/apple-app-site-association` serves the exact team/bundle association as JSON without redirect; a fresh physical-device install can add a passkey, list/remove it in Account, sign out, and sign back in with Face ID; sanitized evidence records the ceremony without credential material.
- **Evidence:** `Blueprints/handoffs/2026-08-12-m3a-ios-authorization-passkeys.md`; `/private/tmp/omen-m3a-full-simulator-final.log`; `/private/tmp/omen-m3a-device-build-final.log` (local-only command logs, no credentials).
- **Do not touch:** Android passkeys, Xcode Cloud, archive/TestFlight, production deployment, provider secrets, UI redesign, or Figma in this item.

### M4-CC-WaiverWatch — Waiver Watch composition + wiring

- **Status:** VERIFIED (merged as PR #271 / `e59fe40`, squash — subject reworded from branch commit `adeba4f`; not deployed, provider-proven, or iOS-CI-proven). Reconciled 2026-08-05: the prior line said "not pushed, merged, deployed" after the work had shipped.
- **✅ DONE — do not rebuild:** the approved composition (Figma node `67:2`) is **built and merged on both platforms**. SwiftUI source and XCTest registration complete; Android carries 2 connected tests, `:app:assembleDebug`, and a green primitive-enforcement scanner. The full iOS suite passes on Xcode 26.6. **No code is owed here.**
- **🔨 REMAINING — evidence only, roughly an hour on the Mac:** capture and review the **six registered states rendering on iOS** (the passing XCTest run proves the tests pass, not that each state was visually rendered and reviewed), with the accessibility check alongside it, and record `xcodebuild -version` per the local-substitute rule. Then this closes. Do not reopen the composition.
- **Blocked by:** AGENT_RESOLVABLE — the macOS hardware gate is gone, but this item's own six-state iOS rendering evidence has not been captured; the 2026-08-12 XCTest run proves the registered tests pass, not that every state was visually rendered and reviewed. The Figma proposal is approved (node `67:2`, "03 — Components", badge "APPROVED COMPOSITION — Justin, 2026-07-31"), so design is not the gate.
- **Unblock:** 2026-08-11 ROUTED — retyped from an untyped prose blocker to `TASK-R3-BUILD-iOS`. With the Mac arriving 2026-08-12 and iOS CI no longer running per-PR, this item's remaining gap is verified by the local `xcodebuild test` substitution, not by CI.
- **Unblock:** 2026-08-12 REASSESSED — the Mac mini and local simulator now exist, and the full Omen XCTest suite passes 108/108 on Xcode 26.6. That clears the former hardware dependency but does not manufacture the missing per-state render/accessibility evidence or exact Xcode 16.2 substitution required by the current Done authority; the remaining blocker is therefore agent-resolvable evidence work rather than `TASK-R3-BUILD-iOS`.
- **Priority:** P1
- **Cost:** medium
- **Done when:** the approved composition renders all six registered states on both platforms, primitive-enforcement scanner green, connected tests and `:app:assembleDebug` green. Local Android evidence is complete: 2 connected tests, assembly, and primitive scanner green; SwiftUI source and XCTest registration are complete, and the remaining iOS gap is item-specific render/accessibility evidence on the now-available Mac rather than a missing macOS environment.
- **Do not touch:** provider claims, real waiver deadlines from unverified data, backend, live provider auth.

## B. Backend / recommendation lane

**Phase 2.** Backend feature work is essentially complete. What remains is merging what is built and then freezing.

### B2-D3-S2 — Merge and deploy the prepared-not-deployed set

- **Status:** READY
- **Blocked by:** None
- **Priority:** P0
- **Cost:** small
- **Agent-buildable:** merge preparation yes; the deploy action is founder-gated
- **Scope:** land the work sitting in "Prepared Locally, Not Deployed" — ESPN connect input normalization for pasted cookie fragments and full ESPN league URLs, the SPA `index.html` cache header fix, `GET /api/version`, Tier 2 smoke cleanup mode, the API route reference, and League Standings error-envelope polish. Also review and merge B2-D3-S if it is still open.
- **Skills:** `slops-code-review`, `slops-quality-baseline`, `slops-git-flow`, `slops-ship`
- **Done when:** `Direction/release_readiness.md` §"Not Deployed / Not Merged" is empty; `npm test` green; deploy approved and executed by Justin; post-deploy canary passes.
- **Do not touch:** ESPN cookie values in logs or echoes; production flags; SQL.

### B-FREEZE — Declare feature freeze

- **Status:** BLOCKED
- **Blocked by:** TASK-B2-D3-S2
- **Blocked by:** TASK-M3A-QA
- **Blocked by:** TASK-M4-CC-PlatformsCompact
- **Blocked by:** TASK-M4-Help-Support-Implementation
- **Blocked by:** TASK-M4-Auth-Providers-v1
- **Unblock:** 2026-08-11 ROUTED — split from a single untyped comma list into typed, machine-readable lines per `Direction/status-model.md`. No dependency was added or removed.
- **Priority:** P0
- **Cost:** trivial
- **Phase:** 2 gate
- **Agent-buildable:** no — founder declaration
- **Source:** the discipline that makes the rest of the plan possible. After freeze: bug fixes only, until beta feedback justifies new work.
- **Done when:** freeze is declared in `Direction/decision_log.md`; every remaining non-bug item is moved to the deferred backlog; agents are instructed to reject new feature scope.
- **Do not touch:** new features after this lands.

## S. Security lane

**Phase 4.** Most of this is already closed — A3 verified, F1 verified, Stripe removed, legal shipped, 0 production vulns, GDPR module retired with a regression test. What remains is the last mile plus one mobile-specific threat model.

### S1 — Final production secrets and Supabase settings review

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — founder-only access
- **Priority:** P0
- **Cost:** small
- **Agent-buildable:** checklist preparation only
- **Scope:** final pre-beta pass over production secrets and Supabase settings. Includes the A3 carry-over: **leaked-password protection is disabled in Supabase Auth** (one-toggle fix).
- **Unblock:** 2026-08-11 REASSESSED — founder reports partial progress: additional authentication providers enrolled and further Supabase configuration completed. **Recorded, not credited.** The named acceptance criterion here is leaked-password protection plus a per-secret presence-and-scope pass, and neither has been evidenced. Confirm the specific toggle and produce the secret inventory before this moves.
- **Skills:** `security-privacy-evidence`
- **Done when:** every production secret is confirmed present, correctly scoped, and unexposed; leaked-password protection is enabled; findings are recorded without values.
- **Do not touch:** secret values in logs, agent output, or evidence files.

### S2 — Rotate credentials exposed during local branch work

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — founder-only
- **Priority:** P1
- **Cost:** small
- **Agent-buildable:** no
- **Source:** ESPN adapter work ran against local branches with provider access. Rotate anything that could have been captured in a local log, shell history, or branch artifact before real testers arrive.
- **Unblock:** 2026-08-11 REASSESSED — no rotation evidence exists on `main`. Founder-reported Supabase configuration work is **not** rotation and does not satisfy this item. **Newly in scope:** P1-YahooReauth will mint a fresh Yahoo token, which discharges the Yahoo portion of this item if the old `token_secret_id` is retired rather than left orphaned — sequence S2's Yahoo half after that item and record it. Also still open from the 2026-07-30 preservation pass: the Apple `.p8` signing key sitting under `C:\Users\JDuve\dev` inherits `CodexSandboxUsers:(I)(RX)` read access and should be relocated outside any agent-reachable path.
- **Done when:** any credential that touched local branch work is rotated or explicitly cleared as never-exposed, with the decision recorded.
- **Do not touch:** credential values in any written record.

### S3 — Rate limits on the three hot routes

- **Status:** READY
- **Blocked by:** None
- **Priority:** P1
- **Cost:** small–medium
- **Agent-buildable:** yes
- **Scope:** `POST /api/omen/mvp-move`, `POST /api/trade/compare`, `GET /api/dashboard/summary`. These take the Sunday-morning load and are the ones a tester can hammer.
- **Skills:** core implementation + `security-privacy-evidence`
- **Done when:** each route has an enforced per-user and per-IP limit with an honest 429 envelope; tests cover limit-hit and reset behavior; limits are documented in `Blueprints/api-routes.md`.
- **Do not touch:** provider rate limits, production config, or the deploy action.

### S4 — Confirm no provider credentials reachable in logs on error paths

- **Status:** READY
- **Blocked by:** None
- **Priority:** P1
- **Cost:** small
- **Agent-buildable:** yes
- **Scope:** error paths specifically — happy paths are already covered. Provoke adapter failures for Yahoo, Sleeper, and ESPN and confirm nothing leaks into logs, error envelopes, or Sentry payloads once O1 lands.
- **Skills:** `security-privacy-evidence`, `slops-investigate`
- **Done when:** a test proves each adapter's failure path emits no cookie, token, or credential fragment; ESPN cookie names and values are absent from every surface.
- **Do not touch:** real credential values in test fixtures.

### S6 — KVM2 public Nginx exposure (`openclaw.slopssaloon.com`)

- **Status:** READY
- **Blocked by:** None
- **Unblock:** 2026-08-11 CLEARED — founder decision: **`openclaw` is no longer wanted. Retire it.** The item is *not* closed, because the decision half is what got answered; the public surface described below is still live. Scope below is narrowed from "investigate and decide" to "execute the retirement."
- **Priority:** **P1 — public attack surface on a host designated private**
- **Cost:** small
- **Agent-buildable:** investigation and a written takedown plan only; **any change to KVM2 is founder-executed** and needs its own action-level approval
- **Source:** surfaced by the Raspberry Pi live VPS discovery (2026-08-07/08), still open. KVM2 (`srv1647690` / `100.67.187.57`) is documented as the **private** Ollama/Gemma AI host — Ollama is correctly bound to its Tailscale address only. But Nginx on that same host listens **publicly on 80/443** (IPv4 and IPv6), Certbot-managed, serving `openclaw.slopssaloon.com` → `127.0.0.1:3200`.
- **Why it matters:** a host whose stated role is "private AI, reachable only over Tailscale" is accepting connections from the public internet, on the same box as the model endpoint. That is not automatically a vulnerability, but it is an unowned public surface on a machine the architecture treats as private, and nobody has confirmed the upstream on `:3200` is alive, patched, or still wanted.
- **Skills:** `security-privacy-evidence`, `rbac-risk-review`
- **Done when:** the `openclaw.slopssaloon.com` vhost no longer serves publicly, its Certbot renewal is removed so no cert renews for a dead name, the `127.0.0.1:3200` upstream is confirmed stopped, DNS for the subdomain is retired, and KVM2's remaining public 80/443 listeners are inventoried and shown to be either intended or also removed. Record before/after listener state.
- **Do not touch:** do not disable Nginx wholesale or alter other KVM2 configuration as part of Omen work — the Pi tracker explicitly warns against this. Retire this one vhost, not the web server. Agents investigate read-only and produce the plan; the founder runs it.

### S8 — Triage the standing Dependabot queue

- **Status:** READY
- **Blocked by:** None
- **Priority:** **P1 — one open PR sits on a hard-failure rule** (see below); the rest are P2 hygiene
- **Cost:** small per PR, medium for the batch
- **Agent-buildable:** yes for triage, analysis, and the written verdict. **Merging is founder-only.**
- **Source:** six Dependabot PRs open as of 2026-08-11 (#282, #281, #280, #277, #274, #273), four of them red. Nothing in this sprint has ever covered dependency-PR triage, which is why they accumulated. `.github/dependabot.yml` runs **weekly, Mondays 09:00 America/New_York** across four ecosystems (root npm, frontend npm, github-actions, Android Gradle) — so **closing a PR is not a decision, it is a six-day delay.** The only durable levers are `ignore` rules or `open-pull-requests-limit`.
- **Why red matters more than open.** Per `Direction/agent_inbox.md`, two dependency PRs previously reached green and **would still have broken production** — #206 (`express` 4→5) passed 481/481 and would have crash-looped prod, because the bare-`*` SPA fallback throws under `path-to-regexp` 8 and sits behind `HAS_SPA`, which is false in CI and true in the production image. A red dependency PR on this repo is the gate working. Do not bulk-close.
- **#281 is the one with a standing rule attached.** `production-dependencies`, currently failing. `dependency-health.yml:28` runs `npm audit --omit=dev --audit-level=low`, and the 2026-07-26 decision makes **production dependency advisories a hard failure at every severity**. Triage this one first and on its own.
- **Receipts are required.** The same 2026-07-26 decision: dependency-changing PRs must identify purpose, scope, license/source, production audit result, and rollback. A merged bump with no receipt is not done.
- **Unblock:** 2026-08-11 CLEARED — triaged. **Root cause of the red was a single advisory on `main`, not the PRs.** `nanoid <3.3.17` (high, **frontend dev-dependency only**) failed `dependency-health.yml:65` (`npm --prefix frontend audit --audit-level=low`), so every PR running that check went red regardless of content — including #281, a root/backend PR that never touches `frontend/`. Fixed by `npm --prefix frontend audit fix` → `nanoid 3.3.16 → 3.3.18`, 12 insertions / 3 deletions, frontend build green (vite 7.3.6, 563 modules). Root audit was already clean at 0 vulnerabilities, prod and dev.
- **Verdicts recorded 2026-08-11:**
  - **#281** production-dependencies (supabase-js, upstash/redis, express-rate-limit — all patch) → **MERGE** after rebase
  - **#273** frontend-runtime (`@sentry/react` 10.68→10.69, `supabase-js` 2.110.8→2.112.2, both minor) → **MERGE** after rebase
  - **#274** development-tooling (`impeccable` 3.4→3.5, dev-only) → **MERGE** after rebase
  - **#282** android-dependencies + gradle wrapper → **MERGE**
  - **#277** `actions/upload-artifact` v4→v7 → **READ FIRST.** Three majors, but used in exactly one workflow (`native-visual-evidence.yml`) with no production dependency
  - **#280** frontend-tooling → **DO NOT MERGE.** Carries `tailwindcss` 3.4.17→**4.3.3** and `vite` 7→**8**. Tailwind v4 removes the JS config format (`frontend/tailwind.config.js` exists) and replaces the `@tailwind` directives (`frontend/src/index.css` has three). It would break the build. Now covered by `ignore` rules in `.github/dependabot.yml`, so Dependabot closes it and stops reopening it
- **Config defects fixed 2026-08-11:** `.github/dependabot.yml` referenced labels `dependencies`, `security`, and `android` — **none exist in this repository**, and GitHub rejected them on every PR with "The following labels could not be found." Removed. Added `ignore` rules for the `tailwindcss`, `vite`, and `@vitejs/plugin-react` majors, each with its reason inline. **Closing a Dependabot PR is not a decision — it reopens weekly. An `ignore` rule is the decision.**
- **Skills:** `slops-code-review`, `slops-verify`, `security-privacy-evidence`
- **Done when:** every open Dependabot PR carries a written verdict — merge, hold with a reason, or ignore-rule with a scope and expiry; #281 is resolved or its advisory is explicitly accepted in writing; each red PR's failure is diagnosed as *real breakage* or *flake* rather than closed unread; and if the queue is to stay small, `dependabot.yml` is amended with `ignore` rules or limits rather than relying on manual closing.
- **Do not touch:** merging to `main` — founder-only, never delegated. Do not close a red PR without recording why it was red. Do not raise `--audit-level` or add `--omit=dev` to a gate to make a failure disappear.

### S7 — Retire stale cloud-AI runtime dependencies (OpenAI **and Anthropic**)

- **Status:** READY
- **Blocked by:** None
- **Priority:** P2
- **Cost:** small
- **Agent-buildable:** yes
- **Source:** open audit item from the Pi deployment tracker. Live `/api/ready` reports `provider=local, model=gemma3:4b, transport=openai_compatible_chat_completions, private_route_required=true`. **`openai_compatible_chat_completions` describes the wire protocol, not the vendor** — the proven route points at private KVM2/Ollama. But the naming is readable as "Omen sends data to OpenAI," which contradicts the Privacy Notice statement that Omen does not send user or fantasy-platform data to a cloud AI provider.
- **Scope widened 2026-08-11 — `@anthropic-ai/sdk` is the same defect.** Found while triaging Dependabot #287 (`0.115.0 → 0.116.0`). It is declared in root `package.json:15` as a **production** dependency and **imported nowhere in the codebase** — the only non-package matches are in gitignored `graphify-out/` artifacts. Residue remains at `src/config/index.js:64-65` (`anthropicApiKey: process.env.ANTHROPIC_API_KEY`) and a stale comment at `src/omen_prompt_loader.js:7` referring to "the Anthropic API." Same risk shape as the OpenAI naming above: a cloud-AI vendor SDK shipping in the production dependency tree contradicts the Privacy Notice claim that Omen sends no user or fantasy-platform data to a cloud AI provider. It also means Dependabot will keep opening bumps for a package nothing calls.
- **Done when:** source and configuration are searched for stale OpenAI- **and Anthropic**-specific dependencies, keys, fallback paths, or environment variables; `@anthropic-ai/sdk` is removed from `package.json` or its live use is documented; the `ANTHROPIC_API_KEY` config slot and the `omen_prompt_loader.js` comment are removed or corrected; production config is confirmed to require no cloud-AI credential of any vendor; intentionally-generic protocol naming is documented so it cannot be misread as vendor use.
- **Do not touch:** the working private Ollama route; secret values.

### S5 — Mobile token storage review

- **Status:** READY
- **Blocked by:** None
- **Priority:** **P0 — new threat model.** A leaked provider token on a stolen phone is not the same risk as a web session.
- **Cost:** small–medium
- **Agent-buildable:** yes
- **Scope:** confirm no session or provider token is written to plaintext `UserDefaults` (iOS) or `SharedPreferences` (Android). iOS must use Keychain; Android must use `EncryptedSharedPreferences` or equivalent. Review certificate/transport handling on both.
- **Skills:** `security-privacy-evidence`, `rbac-risk-review`
- **Done when:** both platforms store credentials in the OS-provided secure store, verified by inspection and a test; a written record states what is stored where and for how long.
- **Do not touch:** real tokens in test fixtures, screenshots, or logs.

## O. Ops and observability lane

**Phase 3.** This is the lane that decides whether you can diagnose anything after beta opens. **O1 and O6 are the highest-value items in the whole plan** — mobile is worse than web here, because you cannot read a user's console.

### O1b — Application error tracking (Sentry-class)

- **Status:** READY
- **Blocked by:** None
- **Priority:** **P0 — the gap Kuma and Beszel cannot close**
- **Cost:** medium
- **Agent-buildable:** research and configuration; the deploy action is founder-gated
- **Why this is not covered by O1:** Uptime Kuma answers *"is the endpoint up?"* Beszel answers *"is the host healthy?"* Neither can answer *"a user just got a 500 on `POST /api/omen/mvp-move` because ESPN returned malformed JSON, here is the stack trace."* Synthetic checks stay green while individual user requests fail. That is the signal beta feedback depends on.
- **⚠ Do not default to self-hosted Sentry.** It wants ~16 GB RAM and a large compose stack (Kafka, ClickHouse, Snuba, Relay, Postgres, Redis). It **cannot** run on Command Center (Pi 4, 4 GB, <1 GiB budget), **must not** run on KVM1 (3.8 GB, production, 49% disk), and would dominate KVM2 (7.8 GB, the AI host).
- **Evaluate GlitchTip first** — Sentry-SDK-compatible, Django + Postgres + Redis, roughly 1–2 GB. Existing Sentry client integrations work unchanged. **Verify arm64 image availability and current resource profile before committing.**
- **Skills:** `pre-build-research`, `self-hosted-observability-runbook`, `security-privacy-evidence`
- **Done when:** a deliberate backend error appears in the chosen tool within 60 seconds, with a usable stack trace; host and resource cost are recorded; no PII, provider credential, or ESPN cookie appears in any captured payload.
- **Do not touch:** KVM1 production resources; public exposure of the error-tracking UI.

### O1c — Product analytics (Umami) — deferred

- **Status:** DEFERRED to post-beta
- **Priority:** P3
- **Rationale:** Umami is **product** analytics — which screens get used, funnels, retention. It is not an operations signal and it is not a beta gate. `G6` in the deferred backlog already soft-blocks it. O1's Kuma/Beszel stack covers the operational need; O1b covers the error need. Revisit after Phase 5 when there is real usage worth measuring.
- **Do not touch:** treating analytics as a launch blocker.

### O6 — Native crash reporting on both platforms

- **Status:** BLOCKED
- **Blocked by:** TASK-O1b — needs an error-tracking backend before symbols have anywhere to land
- **Blocked by:** TASK-R3-BUILD-iOS — iOS symbolication specifically; the Android half is not gated on it
- **Unblock:** 2026-08-11 ROUTED — split from a single untyped prose blocker into typed lines per `Direction/status-model.md`. No dependency was added or removed.
- **Unblock:** 2026-08-12 REASSESSED — the local Mac/device development-signing prerequisite is now satisfied, but this blocker stands: no archive/dSYM upload or deliberate native crash was performed, `TASK-O1b` is still open, and `R3-BUILD-iOS` has not reached TestFlight.
- **Priority:** **P0 — hard Phase 3 gate, and the single largest blind spot in the whole system**
- **Cost:** medium
- **Agent-buildable:** yes
- **Source:** **the Pi observability stack cannot see this at all.** A SwiftUI or Compose crash never reaches KVM1, so it never touches Nginx, `omen_api`, Kuma, or Beszel. Every one of those stays green while a tester's app dies on launch. Omen is now a mobile-first product, which makes this the most consequential monitoring gap that exists — and it is invisible precisely because everything else looks healthy.
- **Done when:** a deliberate crash on iOS and on Android each appear in the error backend within 60 seconds, with symbolicated stack traces and no PII or token in the payload.
- **Do not touch:** shipping any crash payload containing user data, provider tokens, or league identifiers.

### O7 — Forced-update / minimum-version gate

- **Status:** READY
- **Blocked by:** None
- **Priority:** **P0 — mobile has no rollback**
- **Cost:** medium
- **Agent-buildable:** yes
- **Source:** once a build is on a phone it stays there until the user updates. A server-driven minimum-version check is the only lever available when a bad build ships.
- **Scope:** a server-supplied minimum supported version; the app blocks with an honest update prompt below it. Must fail open on network error — never lock a user out because the check itself failed.
- **Done when:** both platforms honor a server-driven minimum version, show an honest blocking prompt, and fail open on network error; tests cover below-minimum, at-minimum, and check-unavailable.
- **Do not touch:** forcing an update without a working store listing to update to.

### O2 — Named rollback owner and tested rollback path

- **Status:** READY
- **Blocked by:** None
- **Priority:** P0
- **Cost:** small
- **Agent-buildable:** documentation yes; the rollback exercise is founder-executed
- **Source:** A4's own `Done when:` already requires a named rollback owner. Test it before you need it.
- **Skills:** `slops-ship`, `slops-canary`
- **Done when:** the backend rollback path is executed once against a non-critical deploy and documented; a rollback owner is named; the mobile answer is explicitly recorded as "no rollback — O7 forced-update is the mitigation."
- **Do not touch:** rolling back production without approval.

### O3 — Post-deploy canary

- **Status:** READY
- **Blocked by:** None
- **Priority:** P1
- **Cost:** small
- **Agent-buildable:** yes
- **Skills:** `slops-canary`
- **Done when:** after a deploy, health/ready endpoints, key routes, error rate, and p95 latency are checked against a known-good baseline, producing a pass/hold/rollback recommendation.
- **Do not touch:** executing a rollback automatically — recommend only.

### O4 — Load test the three hot routes

- **Status:** READY
- **Blocked by:** None
- **Priority:** P1
- **Cost:** small
- **Agent-buildable:** yes, against approved local/staging targets
- **Source:** `scripts/load-omen-routes.js` exists and has never been run.
- **Scope:** `POST /api/omen/mvp-move`, `POST /api/trade/compare`, `GET /api/dashboard/summary`. Note that **Week 1 Sunday morning is the real load test** — this is the rehearsal, not the proof.
- **Done when:** load evidence is recorded for all three routes with p95 latency and error rate at a realistic beta concurrency, and again at 10× that.
- **Do not touch:** load-testing production without explicit approval.

### O5 — Supabase backup and restore verification

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — database access
- **Priority:** P1
- **Cost:** small
- **Agent-buildable:** checklist only
- **Source:** never verified. An untested backup is not a backup.
- **Done when:** a backup is confirmed to exist on a known schedule and a restore is exercised into a non-production target, with recovery-point and recovery-time recorded.
- **Do not touch:** production data; never restore over production.

## P. Launch-blocking defects — discovered 2026-08-11

All four were found by reading live production state against the code, not by reading the queue.
None of them existed as sprint items before this pass, and three of them sit directly on the
Section K launch gate. Evidence for each is a live authenticated call against `slopssaloon.com`
recorded the same day.

**Why this section exists:** the queue's picture of Yahoo was wrong in both directions — it was
typed as a founder-credentials gate when the account was already connected, and separately assumed
to need re-integration when the real fault is a stale token. Grouping these keeps the discovery
event traceable.

### P1-YahooReauth — Re-authorize Yahoo under the re-approved API app

- **Status:** **BLOCKED — EXTERNAL (retyped 2026-08-14).** This sat at READY long after everything readable had been read. Every hypothesis this item was written to test has been tested and eliminated (see the superseding finding below); what remains is a Fantasy Sports API entitlement that only Yahoo can grant. **The founder re-applied for access on app `ZcZJXm8V` on 2026-08-13.** Nothing in this item is agent-buildable, and it should not be pulled into a session as work — it is a waiting item, not a queued one.
- **Blocked by:** **Yahoo's approval queue**, not the founder and not the code. No amount of local work advances it.
- **Product posture set 2026-08-14 — paused, not cancelled.** Starting a *new* Yahoo connection is disabled behind `YAHOO_ENABLED` (default false) because the OAuth handshake still succeeds and writes a `connected` row that can never serve data. Yahoo stays visible in the UI labelled "On hold"; existing rows stay disconnectable. See `Direction/decision_log.md` (2026-08-14) and issue [#308](https://github.com/justinduverge-design/omen/issues/308), the standing tracker carrying the re-check and re-enable steps. **Do not delete Yahoo code, tests, or fixtures as dead** — they are what makes re-enabling a flag flip.
- **How to re-check (cheap, ~30 seconds):** sign in to Omen and hit `GET /api/yahoo/access-probe` (`src/routes/yahoo.js`, still deployed from PR [#296](https://github.com/justinduverge-design/omen/pull/296); deliberately **not** gated by `YAHOO_ENABLED` so it keeps working while Yahoo is paused). It runs four Yahoo calls of increasing specificity. **Any 200 means the entitlement landed**; four 403s means it has not. Do not re-derive the diagnosis from scratch — the probe is the whole test.
- **When the probe goes green — the whole re-enable procedure:** set `YAHOO_ENABLED=true` on **both** `omen_api` and `omen_cron`, redeploy, and flip `YAHOO_CONNECTIONS_ENABLED` to `true` in `frontend/src/lib/yahooAuth.js`. Then delete the probe and move this item to VERIFIED. Nothing else is required — this is the "plug and play" the founder expects, and `test/platforms.test.js` proves the flag restores availability.
- **Delete the probe** once a green result is recorded; it was added as temporary diagnostic surface.
- **Priority:** **P0 by impact — gates F7, which gates Section K — but not schedulable.** Plan Sleeper and ESPN work as though Yahoo will not arrive in time.
- **Cost:** zero agent cost; pure wait
- **Agent-buildable:** **no.** The config diff, redirect-URI check, and token-health test this item once scoped are all **done** — credentials confirmed current, redirect URI confirmed matching, token confirmed freshly issued. There is no remaining code task here.
- **Source:** verified live 2026-08-11. `GET /api/platforms` returns `yahoo: connected, 1 league`, so the `platform_connections` row is active and carries a usable `league_id`. But `GET /api/dashboard/summary` returns `waiver_wire: "needs_platform"`, and that branch (`src/routes/dashboard.js:219-224`) is only reachable when `hasUsableYahooToken()` fails. Per `src/services/omenReadiness.js:8-14`, that means `token_secret_id` is absent or `token_expires_at` is past. **The integration is intact; the token is dead.** Yahoo API access was separately re-approved in early 2026-08.
- **Diagnostic order — do not skip step 1.** The existing `platform_connections` row proves a *successful* OAuth round-trip happened at some point, which means the client credentials were valid when it was created. Wrong client credentials fail at the authorize step with `invalid_client` and never produce a row at all. So the default hypothesis is a dead user grant, not bad app credentials — most likely Yahoo invalidated outstanding grants when the app's access lapsed, and re-approval restored the app without resurrecting the grant.
  1. ~~**Reconnect Yahoo through the app.**~~ **Not currently possible — see `P1-YahooConnectButtons` below.** Reproduced 2026-08-11: there is no working UI path to re-initiate Yahoo OAuth. Fix that item first, or complete consent manually by POSTing to `/api/yahoo/auth` with a valid bearer token and following the returned `url`.
  2. If consent fails, compare the deployed `YAHOO_REDIRECT_URI` against the URI registered on the re-approved app. A mismatch throws `redirect_uri_mismatch` with perfectly valid credentials, and is the likelier fault after a re-registration.
  3. Only if the dashboard's Client ID differs from the deployed `YAHOO_CLIENT_ID` did the re-approval issue a new app. **That, and only that, makes this a secrets action** requiring its own action-level approval.
- **Skills:** `security-privacy-evidence`, `slops-investigate`
- **Do not rotate pre-emptively.** Writing new client credentials invalidates every outstanding Yahoo user grant, requires a Supabase Studio write plus a deploy, and — if the credentials were fine — masks the real cause while spending a secrets action to fix nothing.
- **Done when:** the fault is identified as grant-level or app-level and recorded as such; `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`, and `YAHOO_REDIRECT_URI` are confirmed current against the re-approved app; a fresh consent round-trip stores a non-null `token_secret_id` with a future `token_expires_at`; and `/api/dashboard/summary` stops reporting `needs_platform` for a Yahoo-connected user.
- **Where the credentials actually live — corrected 2026-08-11.** **Not Supabase Studio.** Yahoo is a custom OAuth implemented in Omen's own backend, not a Supabase Auth provider. `src/config/index.js:52-57` reads `process.env.YAHOO_CLIENT_ID` / `YAHOO_CLIENT_SECRET` / `YAHOO_REDIRECT_URI`; `docker-compose.yml:49-51` and `:91-93` inject them into both the `omen_api` and `omen_cron` services from the `.env` file on the deploy host (KVM1). `deploy/hostinger/ENV-INVENTORY.md:25-27` is the inventory of record. The "provider client secrets stay in Supabase Studio" guidance elsewhere in this sprint is correct for **Google, Apple, and Discord** (Supabase Auth providers) and **wrong for Yahoo**.
- **Both services need it.** `omen_api` and `omen_cron` each receive the Yahoo vars. Updating one and not the other leaves the Tuesday scoring cron authenticating with dead credentials.
- **`docker-compose.yml` uses `${VAR:?required}` guards (16 of them).** A missing or malformed var makes the container **refuse to start** rather than run degraded. That is good safety, but it means a botched `.env` edit is an outage, not a warning — have the previous values recoverable before editing.
- **Superseding finding 2026-08-13 — the fault is app-level, not grant-level.** Step 1's diagnostic order below was followed and completed: the founder updated `YAHOO_CLIENT_ID`/`YAHOO_CLIENT_SECRET` on KVM1, force-recreated both containers, and completed a fresh disconnect/reconnect OAuth round-trip. Yahoo still refuses every Fantasy Sports call. A temporary access probe (`GET /api/yahoo/access-probe`, PR [#296](https://github.com/justinduverge-design/omen/pull/296)) returned **403 on all four calls, including public `/game/nfl` metadata that requires no user scope** — which disproves the "dead user grant" default hypothesis stated below, and also disproves bad client credentials (those fail at authorize with `invalid_client`; the handshake succeeds). **The deployed Yahoo app does not hold Fantasy Sports API entitlement.** Yahoo gates that behind a separately reviewed application (`https://sports.yahoo.com/developer/access/`), distinct from the permission checkbox on the app record. Remaining work is founder-side on the Yahoo developer account. **Narrowed the same session:** the deployed client id decodes to app **`ZcZJXm8V`** ("SlopsSaloon Fanatasy Football MVP"), which is confirmed to have `Fantasy Sports - Read` checked and the correct redirect URI — so the wrong-app branch is eliminated and the deployed credentials are correct. The checkbox is a *request*, not a *grant*: Yahoo issues Fantasy Sports API access via a separately reviewed application (`https://sports.yahoo.com/developer/access/`), and a checked-but-unapproved app returns exactly this 403. The prior approval most likely attached to the earlier app that was deleted. **Action: re-apply for Fantasy Sports API access for `ZcZJXm8V`; no agent-buildable code fix exists.** See `Direction/known_issues.md`.
- **Do not touch:** client secrets in logs, agent output, commit messages, or the repo. All four local `.env*` files are gitignored and none has ever been committed (verified 2026-08-11) — keep it that way. Do not delete the existing `platform_connections` row; it is fine, and re-creating it loses the league binding.

### P1-ConnectContinueRoute — "Continue" after connecting lands on the wrong page

- **Status:** **CLOSED 2026-08-16.**
- **Closure:** COMPLETED — merged to `main` as PR [#314](https://github.com/justinduverge-design/omen/pull/314) / `107ed66` (2026-08-16T14:55Z). Receipt in `Direction/sprints_completed.md`; ledger row in `Blueprints/done/LEDGER.md` (2026-08-16).
- **Claim:** Claude, 2026-08-16 — released on verification.
- **Evidence:** merged `107ed66`, from branch `claude/p1-connect-continue-route`. RED first: `test/connectContinueRoute.test.mjs` failed on the missing `consumeConnectDestination` / `syncOnboardingFromServer` helpers. GREEN: 12/12 focused, full `npm test` **549/549** (537 baseline, +12), `npm --prefix frontend run build` clean, `git diff --check` clean. Handoff: `Blueprints/handoffs/2026-08-16-p1-connect-continue-route.md`. **Merged, not deployed.**
- **Correction, 2026-08-16 (same day, later session):** this record and the inbox both read "Not pushed, merged, or deployed" *after* the work had merged — the **sixth** recorded instance of this queue mis-describing shipped work, and the second in a single day. The handoff was written pre-merge and never revised post-merge, which is the mechanism: a handoff is a point-in-time artifact, and nothing re-reads it when the PR lands. Not deployed remains true.
- **Third defect found while fixing the first:** `ConnectLeague.jsx:696` stores `/account/connect` as the post-login destination when a signed-out visitor hits the connect page. Honoring the stored `next` verbatim therefore returned the user to the screen they had just completed — so fixing only the empty-`next` default would have left a second, less obvious wrong landing. `consumeConnectDestination()` treats `/account/connect`, `/onboarding`, and anything `sanitize()` rejects as "no destination" and lands on `/football`.
- **Cost of the gate fix, stated plainly:** `ProtectedRoute` now holds the spinner for one `/api/platforms` round-trip when the local flag is absent. Users who have the flag pay nothing. It fails closed — a network error or an unauthenticated answer leaves the flag unset and sends the user to onboarding, never past it.
- **Blocked by:** None
- **Priority:** P1
- **Cost:** small
- **Agent-buildable:** yes
- **Source:** verified live 2026-08-11 — `localStorage['omen.auth.next']` is `null` in a real signed-in session. `ConnectLeague.jsx:571` `handleContinue()` navigates to `consumeNextUrl()`, which falls back to `'/account'` when nothing is stored (`frontend/src/lib/nextUrl.js:38`). `handleSkip()` on line 568 hardcodes `/football` and behaves correctly. So **Skip works and Continue does not** — finishing onboarding drops the user on account settings instead of the dashboard.
- **Related:** onboarding completion is tracked only in `localStorage['omen.onboarding.done']` and is never read back from the server, even though `/api/platforms` already knows. `ProtectedRoute.jsx:66-70` gates on the local flag alone, so any cleared storage, new browser, incognito window, or second device sends an established account back through onboarding. Fix both together or the routing fix will look intermittent.
- **Skills:** `slops-tdd`, `slops-ui-ux-audit`
- **Done when:** completing connect lands on `/football` regardless of stored `next`; a server-backed connection is treated as onboarding-complete so a fresh browser does not re-onboard an existing user; and a test covers the empty-`next` case and the fresh-browser case.
- **Do not touch:** the `sanitize()` allowlist in `nextUrl.js` — it is doing correct origin and path validation. The bug is the default value, not the validation.

### P1-DraftAssistantSideline — Remove Draft Assistant from the 1.0 surface

- **Status:** **CLOSED 2026-08-16.**
- **Closure:** COMPLETED — merged as PR [#315](https://github.com/justinduverge-design/omen/pull/315) / `08aa73f`, all four checks green. **Not deployed.** Receipt in `Direction/sprints_completed.md`; ledger row in `Blueprints/done/LEDGER.md`. `Done when:` met in full.
- **Claim:** Claude, 2026-08-16 — released on verification.
- **Evidence:** RED first, twice. Pass one: `test/draftAssistantSideline.test.js` failed 8 of 10, and the new `dashboardSummary` assertion failed against the hardcoded `{available: true, status: "ready"}`. Pass two, after the founder override: the draft-dark route assertions failed while `/api/sleeper/draft*` was still registered. GREEN: full `npm test` **563/563** (549 baseline, +14), `npm --prefix frontend run build` clean, `git diff --check` clean. **Strongest single piece of evidence:** the production bundle contains zero occurrences of `Draft Assistant`, `draft-assistant`, or `Draft Position` — the page tree-shakes out entirely once unrouted, so it is unreachable rather than merely unlinked. Handoff: `Blueprints/handoffs/2026-08-16-p1-draft-assistant-sideline.md`.
- **Fourth surface found while sweeping:** `frontend/src/lib/nextUrl.js` allowlisted `/draft` as a post-login redirect destination, so a stored or crafted `?next=/draft` passed validation and would have landed a freshly signed-in user on a 404. Removed. An allowlist entry for a route that no longer exists is a dead end, not a permission.
- **Founder override, same day — the whole draft path is dark.** The first pass held `/api/sleeper/draft*` mounted as live-draft *tracking* rather than Draft Assistant. The founder resolved it the other way: 1.0 ships **no draft surface at all**. Those three routes now register only behind `DRAFT_ASSISTANT_ENABLED` (`/roster` and the rest of the Sleeper router untouched), and the Privacy "drafts" collection line moved with them — with the endpoints unmounted, keeping that word *overstates* collection, the mirror of the error that kept it in place while they were live. `test/sleeperDraftRoute.test.js` opts the flag on so the preserved implementation stays green. Founder also confirmed **no "2027 fantasy draft" marketing line** is wanted.
- **Blocked by:** None
- **Priority:** P1
- **Cost:** medium
- **Agent-buildable:** yes
- **Source:** founder decision 2026-08-11 — **Draft Assistant is sidelined to the 2027 season** and becomes next season's marketing beat. `CLAUDE.md` already records it as cut from 1.0 (2026-08-05), but verified live 2026-08-11 the product still ships it: `/api/dashboard/summary` advertises `draft_assistant: {available: true, status: "ready"}` (`src/routes/dashboard.js:268`, hardcoded), `Header.jsx:26` links it in primary nav, and `routes/index.jsx:52` serves `/draft`.
- **Scope — wider than the route.** Frontend: `pages/DraftAssistant.jsx`, `routes/index.jsx`, `components/layout/Header.jsx`, `pages/Landing.jsx`, `pages/OmenLanding.jsx`, `pages/Football.jsx`, `components/help/HelpButton.jsx`. Backend: `src/routes/draftAssistant.js`, `src/services/sleeperDraft.js`, `src/services/sleeperDraftAccess.js`, `src/services/adp.js`, and the hardcoded `dashboard.js` tool entry. **Legal copy: `pages/Privacy.jsx` and `pages/Terms.jsx` both describe Draft Assistant** — shipping legal text about a feature that does not exist is its own defect.
- **Preserve, do not delete.** The 2027 plan depends on this code. Remove it from the *reachable surface* — nav, routes, advertised tools, marketing and legal copy — and leave the implementation in the tree behind a disabled flag, or move it to `Archive/` with a MANIFEST row naming its return date. Deleting it costs next season's head start.
- **Skills:** `slops-ui-ux-audit`, `slops-ux-copy`, `slops-legal-spot-check`, `slops-repo-inspector`
- **Done when:** no nav entry, route, dashboard tool entry, landing-page claim, help entry, or legal clause references Draft Assistant; `/draft` returns the standard not-found behavior; `draft_assistant` no longer appears in `/api/dashboard/summary`; store metadata and onboarding copy are re-checked against `CLAUDE.md`'s prohibition; and the preserved implementation's location and re-activation path are recorded in `Direction/decision_log.md`.
- **Do not touch:** `src/services/adp.js` beyond disconnecting it from the live route — the 2027 plan is a Slops-built ADP and this is the starting point. Do not delete the Sleeper draft services.

## F. Verify lane — Justin must pin

**Phase 4.** F6–F9 are the beta gate. **F6 and F9 decide whether beta succeeds.**

> **Season-start floor (verified 2026-08-11).** `GET /api/dashboard/summary` currently returns
> `omen_of_the_week: "off_season"` — correct behavior for August, produced by `isOffSeason()` in
> `src/services/nflSchedule.js`. Every F-lane item whose acceptance includes *Omen recommendations*
> therefore **cannot fully pass until the 2026 regular season opens.** The non-Omen halves (connect,
> session restore, reauth, standings, trade candidates, labeling) are testable now and should be run
> now. Do not record an F-item as VERIFIED on the strength of its non-Omen half alone — split the
> evidence and say which half was proven.

### F6 — Real-account QA: ESPN

- **Status:** READY
- **Blocked by:** None
- **Unblock:** 2026-08-11 CLEARED — real ESPN account connected and drafted; league *Las Vegas Pro Head to Head Points PPR*. `GET /api/platforms` confirms `espn: connected, 1 league` (verified live, 2026-08-11). Credentials are no longer the gate; Omen-half acceptance still waits on season start.
- **Priority:** **P0 — highest risk item in the plan**
- **Cost:** medium
- **Agent-buildable:** preparation and matrix only
- **Source:** #265/#266/#267 are merged but **not provider-proven** beyond a read-only aggregate proof. ESPN is the newest code and the most fragile auth path.
- **Scope:** connect, recovery/reauth, waiver pool, drafted-league behavior, and Omen recommendations end to end on a real ESPN account, on both native apps.
- **Done when:** every flow passes on a real account on iOS and Android, with a sanitized matrix and no cookie name or value in any log, screenshot, or payload.
- **Do not touch:** ESPN cookie values anywhere; real credentials in agent output.

### F7 — Real-account QA: Yahoo

- **Status:** READY
- **Blocked by:** TASK-P1-YahooReauth
- **Unblock:** 2026-08-11 REASSESSED — the old `FOUNDER_APPROVAL — real account credentials` typing was wrong in both directions. A real Yahoo account with a drafted league exists, and `GET /api/platforms` reports `yahoo: connected, 1 league`. But `/api/dashboard/summary` returns `waiver_wire: "needs_platform"`, which is only reachable when `hasUsableYahooToken()` fails — so the connection row is live while the **OAuth token is expired or its `token_secret_id` is missing**. This is a token problem, not a credentials problem and not a re-integration. Retyped to depend on P1-YahooReauth.
- **Priority:** P0
- **Cost:** medium
- **Agent-buildable:** preparation and matrix only
- **Done when:** connect, session restore, Omen recommendations, and League Standings pass on a real Yahoo account on both platforms, with a sanitized matrix.
- **Do not touch:** provider credentials in logs or screenshots.

### F8 — Real-account QA: Sleeper

- **Status:** READY
- **Blocked by:** None
- **Unblock:** 2026-08-11 CLEARED — real Sleeper account connected and drafted; league **Omen App Data** (confirmed by founder, 2026-08-11). `GET /api/platforms` confirms `sleeper: connected, 1 league` (verified live, 2026-08-11). Omen-half acceptance still waits on season start.
- **Priority:** P0
- **Cost:** medium
- **Agent-buildable:** preparation and matrix only
- **Scope:** includes the known gap — `GET /api/sleeper/roster` requires an explicit `week` param and there is no auto week detection. Verify the app always supplies it correctly, including at week boundaries.
- **Done when:** connect, Omen recommendations, trade candidates, and the explicit-`week` path all pass on a real Sleeper account on both platforms.
- **Do not touch:** provider credentials in logs or screenshots.

### F9 — Mock / live labeling sweep

- **Status:** READY
- **Blocked by:** None
- **Priority:** **P0 — trust-critical.** Mislabeled mock output presented as live advice is the one bug that costs credibility permanently.
- **Cost:** medium
- **Agent-buildable:** yes
- **Scope:** every surface on both native apps and the web app. Demo, mock, stale, offline, and unavailable states must be visibly labeled and never read as live fantasy advice.
- **Skills:** `demo-mode-pre-empty-state`, `slops-ui-ux-audit`, `slops-ux-copy`
- **Done when:** every recommendation surface either shows verifiably live data or is explicitly labeled; a written inventory maps each surface to its labeling; no path presents fallback output as live.
- **Do not touch:** removing a label to make a screen look better.

### F10 — Real-device matrix

- **Status:** READY
- **Blocked by:** None
- **Priority:** P1
- **Cost:** medium
- **Agent-buildable:** automated sweep yes; real-device confirmation human
- **Scope:** iPhone SE (375×667), a large iPhone, and a Pixel-class Android. Most fantasy traffic is phone traffic.
- **Skills:** `mobile-first-qa-playbook`, `slops-mobile-smoke`
- **Done when:** no horizontal overflow, no touch target under 44px, safe-area insets correct on fixed elements, no input under 16px, and no JS errors — across the matrix, with severity-ranked findings resolved or explicitly accepted.
- **Do not touch:** treating the automated sweep as a substitute for real-device QA.

### F11 — Accessibility pass

- **Status:** READY
- **Blocked by:** None
- **Priority:** P1
- **Cost:** medium
- **Agent-buildable:** yes
- **Source:** Apple review checks this, and M4-Help-Support already requires it. Doing it once, app-wide, is cheaper than per-item.
- **Skills:** `slops-ui-ux-audit`
- **Done when:** VoiceOver and TalkBack traverse every primary flow; Dynamic Type and font-scale hold to the largest supported setting without clipping; WCAG AA contrast passes on both themes.
- **Do not touch:** shipping a screen that traps focus or strands a screen-reader user.

### F5 — ESPN connect walkthrough recording

- **Status:** READY
- **Blocked by:** None
- **Priority:** P2 — doubles as an onboarding and store-preview asset
- **Cost:** small–medium
- **Source:** production `/espn-connect` still shows the placeholder "A mock 90-second Chrome/Edge walkthrough is coming here."
- **Scope:** record the ~90-second walkthrough using mock/demo data only — no real ESPN account or credentials. Embed on `EspnConnectGuide.jsx`, replacing the placeholder.
- **Done when:** the asset exists, renders on desktop and mobile, and contains no real ESPN credentials, cookies, or account data.
- **Do not touch:** real ESPN account/credentials in the recording; any live cookie values.

## K. Marketing — hold until Phase 4 closes

Nothing public ships until F6–F9 pass. There is no value in driving signups into unproven provider auth. Fantasy is seasonal and word-of-mouth: **ten engaged testers in real leagues during the season beat a thousand cold signups in November.**

- **K1** — landing page and store copy honest about mock vs live; **no Draft Assistant claims** (pairs with R7). Before beta.
- **K2** — recruit 10–20 beta testers from existing leagues. At beta open.
- **K3** — feedback channel, Discord or in-app. At beta open.
- **K4** — Omen of the Week / `slops-explainer-cut` content. After Week 1.
- **K5** — Reddit and community push. After two stable weeks.

## Deferred / paused backlog — not selectable

These are real but are **not** active tasks and carry no status. They must not displace P0/P1 beta work, and they are not eligible for selection until `planning-pass` promotes them.

- **Draft Assistant 2027** — cut from 1.0 on 2026-08-05. Winter track: build the Slops ADP Oct–Feb, off the critical path.
- **M4-Auth-Passkeys-Android-Onramp** (P2) — Android remains deferred; the founder promoted only the iOS half on 2026-08-12.
- E1 mobile scope decision — **resolved 2026-08-05** by the both-platforms decision. E2/E3 app-store closeout is superseded by lane R.
- G1 win-streak reward ladder UI waits on a backend win-streak contract.
- G2 ESPN live draft Lazy Sync and G3 Yahoo live draft Lazy Sync wait on a stable provider contract and season timing.
- G4 IDP support remains P3 and needs an explicit supported-league/data scope.
- G5 skeleton narration states should fold into the relevant native composition.
- G6 Umami integration — **unblocked by O1** once that lands; promote then.
- G8 baked-black PNG fallback deletion waits on a clean production soak.
- G9 code TODOs must be split into separate tasks.
- **Platforms strip status dot (post-beta polish)** — founder decision 2026-08-14: **not for beta, revisit before launch.** Add a status indicator dot to `OmenPlatformCompactRow` on both platforms. Two constraints are not optional when it is picked up: (1) use the existing **verdigris / crimson** semantic tokens, **not raw green/red** — red/green is the worst pair for the most common colorblindness (~8% of men); (2) give the dot a **non-color differentiator** (filled = connected, hollow ring = disconnected), because the design house forbids status that color alone carries. **Bonus the dot unlocks:** a dot is far narrower than the word "Connected", so the row can drop the redundant platform-name text at large Dynamic Type and stop truncating to `Co…` at XXXL on iPhone SE. The founder accepted that truncation on 2026-08-14 (`#304`), so this is polish, not a defect fix — but the two land naturally together.
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
- **Store items are founder-executed:** Apple/Google accounts, signing certificates, provisioning profiles, release configuration, and metadata submission. Agents may prepare artifacts; they may not act on store accounts.
- Do not deploy unless Justin explicitly approves the deploy action.
- Docs/doctrine-only pushes must not restart KVM1.
- ESPN cookie values must never appear in logs, UI, screenshots, URLs, analytics, share payloads, or stored app state outside the approved backend secret flow.
- Mock/demo/stale/offline data must be visibly labeled and never represented as live fantasy advice.
- Account deletion copy and exact confirmation phrase `DELETE MY OMEN DATA` require fresh approval before change.
- Team-based runtime theming is removed. Do not revive team skins without a new approved theme-pack plan.
- No paid dependency, cloud model spend, or external service commitment without explicit approval.
- **Draft Assistant is not a 1.0 feature.** Do not advertise it, build against it as a launch dependency, or let it back into scope without a new founder decision.
