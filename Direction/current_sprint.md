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
| 3 — Make it observable | **O** | a deliberate native crash appears in Sentry within 60s on both platforms |
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
- Backend test baseline: **506/506 green** (`npm test`, 2026-08-02, PR #272), plus focused B2-D 84/84. PRs gated by `pr-quality.yml` (#253). The "Actions billing hold" was a misdiagnosis — two config bugs, fixed in #250.
- Native: iOS 79 Swift files, Android 88 Kotlin files. Discord OAuth merged both platforms (#198).
- **No provider is proven with a real connected account.** This is the top beta risk.
- **Store provisioning underway (2026-08-05).** iOS app record is **created** — `Omen — Fantasy Football Tool`, bundle `com.slopssaloon.omen`, "Prepare for Submission". Root cause of the earlier failure was agreements setup under the Valor Ventures entity, not the account transfer. **Android record still to be created (R2-Android).** Next iOS gate is R3 signing, which is what a TestFlight build needs.
- Tuesday scoring remains disabled until the no-write production dry-run passes and Justin approves the production flag change.

# Active queue

## A. Founder / review gates — do not auto-pull

### A3 — Production security and Supabase review

- **Status:** VERIFIED
- **Evidence:** `Direction/reviews/2026-07-31-a3-production-security-supabase-review.md`. Both originally-flagged live-access items closed 2026-08-01: TLS confirmed via direct handshake (Let's Encrypt, valid through 2026-09-06); RLS confirmed enabled on all 11 public tables via Supabase MCP. New WARN-level finding surfaced: leaked-password protection disabled in Supabase Auth (one-toggle fix, not urgent — carried into S1).
- **Priority:** P0
- **Cost:** small
- **Agent-buildable:** audit preparation only
- **Done when:** production settings/secrets checklist is reviewed without exposing values; findings are classified; any mutation is separately approved.
- **Do not touch:** secret values, production database, DNS, Nginx, TLS, or environment variables.

### A4 — Tuesday scoring production enablement

- **Status:** BLOCKED
- **Blocked by:** founder approval for a persistent production enablement; `OMEN_CRON_SCORING_ENABLED` remains `false`.
- **Blocked by:** [#263](https://github.com/justinduverge-design/omen/issues/263) — nflverse has not published `player_stats_2026.csv`, so pre-season scoring must defer instead of recording a failed move.
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
- **Done when:** at least two viable fallback sources are evaluated for licence, cost, coverage, latency, and ToS; a recommendation and a trigger date are recorded; Justin picks one or explicitly accepts the nflverse-only risk.
- **Do not touch:** paid commitments, new dependencies, or provider contracts without explicit approval.

## R. Store and release — critical path, founder-executed

**Phase 1.** This lane is the longest pole and most of it is calendar time no agent can compress. Agents may prepare artifacts; **Justin executes every item here.** Run these first each week — everything else can proceed in parallel, these cannot.

### R1 — Verify App Store Connect is operable during the Valor Ventures transfer

- **Status:** VERIFIED — **resolved 2026-08-05**
- **Blocked by:** None
- **Priority:** P0
- **Cost:** small
- **Agent-buildable:** no — founder account access
- **Finding and resolution (2026-08-05):** App Store Connect was reachable but **not operable** — the New App form opened and accepted input, but Create failed with a generic "An error has occurred. Try again later." Root cause was **agreements, not the account transfer**: agreement/tax setup under Business → Agreements, Tax, and Banking had to be completed under the Valor Ventures entity. Once completed, the app record created successfully.
- **Evidence:** App Store Connect record live — **`Omen — Fantasy Football Tool`**, iOS App Version 1.0, status "Prepare for Submission", bundle ID `com.slopssaloon.omen`, SKU `omen-ios`.
- **Lesson recorded:** reaching a store form is not the same as being able to complete it. Verify the *write* operation, not the page load. An earlier pass in this session briefly called R1 passed on the form opening; that was wrong and cost a false green.
- **Do not touch:** n/a — closed.

### R2-Android — Google Play Console account + app record

- **Status:** READY
- **Blocked by:** None — Play Console is unaffected by the Apple account transfer, and the D-U-N-S number is **already in hand** (confirmed 2026-08-05).
- **Priority:** **P0 — the unblocked half of Phase 1.**
- **Cost:** small ($25 one-time registration)
- **Agent-buildable:** metadata drafting only; account actions founder-executed
- **Account type: ORGANIZATION.** Decided 2026-08-05. Two reasons, both decisive:
  1. **Personal accounts created after 2023-11-13 must run a closed test with 12+ testers opted in for 14 *consecutive* days before they can even apply for production access. Organization accounts are exempt.** Internal testing does **not** count toward that requirement — so the planned internal-track beta would satisfy none of it.
  2. A personal account publishes the founder's own name as the developer, contradicting `Direction/decision_log.md` (2026-08-02) and PRs #268/#269, which establish **Valor Ventures Limited Liability Company** as Omen's public legal operator.
- **Registration inputs:** D-U-N-S (held); organization name `Valor Ventures Limited Liability Company`; address `23 Darrow St, New London, CT 06320` (recorded as authorized for publication); website; phone.
- **⚠ Public contact:** organization accounts display the developer **email and phone publicly**. Use a business address — not a personal or Apple private-relay address. Decide this before registering; it is user-visible on every listing.
- **App record:** `applicationId = com.slopssaloon.omen` (verified `mobile/android/app/build.gradle.kts:23`, matching iOS). App (not game). **Free** — note Play allows paid→free but **never free→paid**, which suits the free-indefinitely posture.
- **Done when:** the organization developer account is verified and the app record exists with the application ID matching the Android build.
- **Do not touch:** pricing, public availability, or release scheduling.

### R2-iOS — Create the App Store Connect app record

- **Status:** VERIFIED — **2026-08-05**
- **Blocked by:** None
- **Priority:** P0
- **Cost:** small
- **Evidence:** record live at App Store Connect — iOS App Version 1.0, "Prepare for Submission". Bundle ID `com.slopssaloon.omen` (matches `PRODUCT_BUNDLE_IDENTIFIER` in Debug and Release, and the App ID in `Blueprints/specs/mobile/m3a-ios-auth-parity-spec.md` under Team `6RWR5G9894`). SKU `omen-ios`. Platform iOS only. Full Access. `com.slopssaloon.omen.web` was correctly **not** used — that is the Sign in with Apple Services ID, not an app identifier.
- **Do not touch:** pricing, public availability, or release scheduling.

> ### ⚠ Do not press "Add for Review"
>
> That button submits to the **public App Store** and starts App Review. It is a
> **Phase 7** action. The beta path is: signed build → **TestFlight → Internal
> Testing** (≤100 testers, **no review required**). Submitting for review now —
> with no build, no screenshots, and R5's gambling questionnaire unanswered —
> would draw a rejection for nothing.

### R2-NAME — App Store display name of record

- **Status:** VERIFIED — **2026-08-05**
- **Evidence:** the App Store listing name is **`Omen — Fantasy Football Tool`**. The product name remains **Omen**; `PRODUCT_NAME = Omen` in Xcode and the home-screen name are unaffected. The store name carries a search descriptor for discoverability — this is deliberate ASO, not a rebrand.
- **Consequence:** Brand, marketing, and store copy must not treat "Omen — Fantasy Football Tool" as the product name. It is the listing title only. Feeds R7 and K1.
- **Do not touch:** the in-app or brand name; they stay "Omen".

### R3-BUILD-iOS — Establish an iOS build-and-signing path

- **Status:** BLOCKED
- **Blocked by:** FOUNDER_DECISION — hardware/spend
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

- **Status:** READY
- **Blocked by:** None — **no Mac required. Android builds on Windows.**
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
- **Blocked by:** R3, R4, R5, and the Phase 4 gate
- **Priority:** P0
- **Cost:** small
- **Phase:** 5 — this is beta open
- **Agent-buildable:** no
- **Source:** use **internal** tracks, not external. TestFlight internal and Play internal testing each allow ≤100 testers with **no review**, which keeps Apple's Beta App Review off the critical path entirely.
- **Done when:** both apps are installable by invited testers on internal tracks and 10+ real testers in real leagues have access.
- **Do not touch:** external/public tracks, or public store release, before Phase 6.

### R7 — Scrub store metadata of Draft Assistant claims

- **Status:** READY
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

### M3A-QA — Native auth interactive real-device QA

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — founder/human credential and inbox access
- **Priority:** **P0 — auth is the front door**
- **Cost:** small, human-gated
- **Agent-buildable:** preparation only
- **Done when:** Android Play-services AVD or real device proves Google sign-in, email OTP, session restore, account deletion, and log safety; iOS real device proves Sign in with Apple, email OTP, session restore, account deletion, and log safety.
- **Evidence:** sanitized QA matrix; no screenshots or logs containing credentials or tokens.
- **Do not touch:** real credentials in agent logs or screenshots.

### M4-CC-PlatformsCompact — Shrink Your-Platforms strip on Command Center

- **Status:** READY
- **Blocked by:** None — Figma proposal approved (node `73:2`, badge "APPROVED COMPOSITION — Justin, 2026-08-01"). No trust assignment yet covers writing SwiftUI/Compose code for this item.
- **Priority:** **P1 — beta blocker.** The connect flow is the first screen that matters to a new tester.
- **Cost:** small–medium
- **Scope:** compact each `OmenPlatformConnectionCard` to a single-line row so Omen stays the hero above the fold on iPhone SE. Target shape: `[PlatformBadge] Sleeper · Connected · 4m ago  ›` connected, `[PlatformBadge] Yahoo · Not connected [Connect]` disconnected. Move Manage-league / full Connect CTAs into a tap-through detail sheet. Hard cap the strip at ~2 row-heights.
- **Motivation:** founder feedback 2026-07-23 — current cards take too much vertical real estate.
- **Done when:** compact rows render for both connected and disconnected states on both platforms; the Omen card is visible without scroll on iPhone SE (375×667) and Pixel 6a-class Android; the detail sheet handles Manage/Connect; scanner, connected tests, and `:app:assembleDebug` green.
- **Do not touch:** live provider connect flow, provider credentials, deep-link config, F2 status contract.

### M4-Help-Support-Implementation — Build approved native Help + Support

- **Status:** READY
- **Blocked by:** AGENT_RESOLVABLE — iOS unsigned CI runs again as of #250; the remaining gap is accessibility/visual evidence, not CI
- **Blocked by:** AGENT_RESOLVABLE — complete Android TalkBack, font-scale, and compact/large-phone screenshot evidence
- **Priority:** **P1 — store metadata requires a support URL**, so this is on the release path, not just the product path.
- **Cost:** medium
- **Current state:** implementation merged via PR #229; Android compile/scanner evidence green. This is **not** VERIFIED — the `Done when:` criteria require accessibility and visual evidence that has not been produced.
- **Done when:** iOS and Android meet the approved contract with scanner/tests, compact and large-phone visual evidence, VoiceOver/TalkBack and Dynamic Type/font-scale checks, and an honest parity/limitation record.
- **Do not touch:** new API endpoints, provider credentials/cookies, account/store settings, analytics, deployment, or production.

### M4-Auth-Providers-v1 — Discord OAuth (Passkeys deferred to M4-Auth-Passkeys-Onramp)

- **Status:** READY
- **Blocked by:** None. `ios-ci.yml` runs on PRs targeting `main` again as of #250, so this is CI-verifiable.
- **Priority:** P1
- **Cost:** small — **verification only, not implementation**
- **Current state:** **PR #198 is MERGED** (`73c5a1d`, 43 files, +1911/−33 across Android and iOS auth). Reconciled 2026-08-05 — the prior line said "open and code-complete," true when written and stale by the time it was read. Passkeys deferred to `M4-Auth-Passkeys-Onramp` (P2).
- **Confirmed Supabase state** (project `xyudxfhqejbwvjngiwhw`, 2026-07-23): Email, Google, Apple, Discord, Passkeys enabled; all others disabled.
- **Done when:** `OmenAuthFlow` renders each button only when its provider is available; the deep-link callback exchanges the Discord code for a session; scanner, connected tests, `:app:assembleDebug`, and iOS CI green — all recorded as evidence.
- **Do not touch:** provider client secrets (stay in Supabase Studio), Yahoo OAuth, Apple credentials, deploy.

### M4-CC-LedgerPreview — Ledger preview composition + wiring

- **Status:** READY
- **Blocked by:** None — Figma proposal approved (node `72:2`, badge "APPROVED COMPOSITION — Justin, 2026-08-01"). No trust assignment yet covers writing SwiftUI/Compose code for this item.
- **Priority:** P2 — **ship if it fits.** Cut without hesitation if Phase 2 runs long.
- **Cost:** small–medium
- **Scope:** replace the "The Ledger is landing next" placeholder with the approved composition per mobile-visual-briefs §1.4 (immutable snapshot rows, outcome language table, no win-rate/streak/celebration).
- **Done when:** the approved composition renders on both platforms with scanner and tests green.
- **Do not touch:** the ledger data model (owned by backend), real move outcomes without verified sources.

### M4-CC-LeaguePulse — League Pulse composition + wiring

- **Status:** READY
- **Blocked by:** None — visual brief §1.6 and Figma proposal (node `74:2`, badge "APPROVED COMPOSITION — Justin, 2026-08-01") both approved. No trust assignment yet covers writing SwiftUI/Compose code for this item.
- **Priority:** P2 — **ship if it fits.** An honest empty state is an acceptable 1.0 answer.
- **Cost:** small–medium
- **Scope:** replace the "League Pulse is landing next" placeholder once the approved composition exists.
- **Done when:** the approved composition renders on both platforms, or an honest empty state ships until real events flow in.
- **Do not touch:** invented league-activity data.

### M4-CC-WaiverWatch — Waiver Watch composition + wiring

- **Status:** VERIFIED (merged as PR #271 / `e59fe40`, squash — subject reworded from branch commit `adeba4f`; not deployed, provider-proven, or iOS-CI-proven). Reconciled 2026-08-05: the prior line said "not pushed, merged, deployed" after the work had shipped.
- **Blocked by:** iOS simulator/CI verification is deferred to a macOS-capable run. The Figma proposal is approved (node `67:2`, "03 — Components", badge "APPROVED COMPOSITION — Justin, 2026-07-31").
- **Priority:** P1
- **Cost:** medium
- **Done when:** the approved composition renders all six registered states on both platforms, primitive-enforcement scanner green, connected tests and `:app:assembleDebug` green. Local Android evidence is complete: 2 connected tests, assembly, and primitive scanner green; SwiftUI source and XCTest registration are complete but require the separate macOS CI gate.
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
- **Blocked by:** B2-D3-S2, M3A-QA, M4-CC-PlatformsCompact, M4-Help-Support-Implementation, M4-Auth-Providers-v1
- **Priority:** P0
- **Cost:** trivial
- **Phase:** 2 gate
- **Agent-buildable:** no — founder declaration
- **Source:** the discipline that makes the rest of the plan possible. After freeze: bug fixes only, until beta feedback justifies new work.
- **Done when:** freeze is declared in `Direction/decision_log.md`; every remaining non-bug item is moved to the deferred backlog; agents are instructed to reject new feature scope.
- **Do not touch:** new features after this lands.

### B2-D — Complete the canonical Omen engine: live Waiver + Trade intelligence

- **Status:** VERIFIED
- **Evidence:** current `main` commits `c021b52` (selected context), `ffa8999` (Yahoo guarded waiver), `a0dea67` (deterministic selector), `521268b` (Sleeper trade), `171508f` (ESPN adapter), and `623068a` (ESPN canonical wiring); focused B2-D tests 84/84 and full `npm test` 506/506 on 2026-08-02; capability matrix reconciled in `Blueprints/specs/b2d-canonical-omen-context-and-capability-contract-v1.md`; sanitized provider proofs in `Blueprints/handoffs/2026-07-29-b2d-s3-sleeper-live-proof.md` and `Blueprints/handoffs/2026-08-02-b2d-e3-espn-live-proof.md`.
- **Blocked by:** None
- **Priority:** P0
- **Cost:** large
- **Source of truth:** GitHub issue #162.
- **Done when:** #162 acceptance evidence is complete — server-verified multi-league context; real waiver/player-pool logic; personalized trade logic; deterministic recommendation selection; provider capability matrix; no mock/stub advice presented as live.
- **Do not touch:** provider credentials, deployment, production data mutations, or store configuration without separate approval.

### B2-D-E1 — Normalize the ESPN waiver pool

- **Status:** VERIFIED (merged as PR #265 / `171508f`; fixture-tested; no deployment or production-route claim)
- **Blocked by:** None
- **Priority:** P0
- **Cost:** medium
- **Done when:** `kona_player_info` pagination, position/status request filter, `onTeamId === 0` ownership exclusion, requested-week projected-stat extraction, and no-cookie logging behavior are fixture-tested; the adapter returns normalized eligible players or an honest unavailable/empty result.
- **Do not touch:** ESPN credentials, real-account requests, SQL, dependencies, canonical Omen service, public Trade Analyzer, deployment, or production data.

### B2-D-E2 — Wire ESPN waiver candidates into canonical Omen

- **Status:** VERIFIED (merged as PR #266 / `623068a`; fixture-tested; no deployment or production-route claim)
- **Blocked by:** None
- **Priority:** P0
- **Cost:** medium
- **Done when:** canonical service/route tests prove selected-context ownership, live candidate selection, unavailable/empty behavior, and no mock fallback; Yahoo/Sleeper remain unchanged.
- **Do not touch:** provider credentials, public Trade Analyzer, SQL, dependencies, mobile clients, deployment, or production data.

### B2-D-E3 — Prove ESPN roster subtraction in a drafted league

- **Status:** VERIFIED (2026-08-02 founder-authorized read-only provider proof; aggregate evidence only; no deployment or production-route claim)
- **Blocked by:** None
- **Priority:** P0
- **Cost:** small
- **Done when:** rostered-player leakage and `onTeamId` results are recorded without cookies, league ID, team name, username, or player lists; the ESPN waiver capability matrix is updated honestly.
- **Do not touch:** credential values, transactions, application code, deployment, or production data.

### B2-D3-S — Live trade capability: Sleeper

- **Status:** VERIFIED
- **Evidence:** merged `521268b` (PR #259); `test/sleeperAdapter.test.js`, `test/tradeLineup.test.js`, and `test/omenMvpLiveService.test.js`; credential-free drafted-league aggregate proof in `Blueprints/handoffs/2026-08-02-b2d3-sleeper-live-trade-capability.md`.
- **Blocked by:** None
- **Priority:** P0
- **Cost:** medium
- **Key rule:** suggest only trades where **both** teams' projected starting lineup improves; `decisionScore` is the user's weekly lineup delta, with `tradeValue.js` VORP used as a fairness guard, never as the score.
- **Do not touch:** the public Trade Analyzer route, Yahoo/ESPN trade rows, provider credentials, deploy, SQL, production data.

### B3 — Replace Sportradar with nflverse for Tuesday scoring

- **Status:** VERIFIED
- **Evidence:** PRs [#260](https://github.com/justinduverge-design/omen/pull/260), [#261](https://github.com/justinduverge-design/omen/pull/261), [#262](https://github.com/justinduverge-design/omen/pull/262); KVM1 deploy run [30754635716](https://github.com/justinduverge-design/omen/actions/runs/30754635716); production process-only dry run completed with `archived=0`, `scored=0`, and no Supabase or Redis writes. The sole pending move could not be scored because nflverse has not published the 2026 season file; follow-up [#263](https://github.com/justinduverge-design/omen/issues/263) owns explicit pre-season deferral behavior.
- **Blocked by:** None
- **Priority:** P1
- **Cost:** medium
- **Do not touch:** the production `OMEN_CRON_SCORING_ENABLED` flag; no production cron deploy without separate approval.

### D1 — Real `GET /api/trade/pulse`

- **Status:** VERIFIED
- **Evidence:** live-hit `https://slopssaloon.com/api/trade/pulse` 2026-08-01T03:10:53Z — returned `"status":"live","is_mock":false,"source_status":"live_adp"` with 5 real current players. `Direction/reviews/2026-08-01-d1-adp-source-research.md`; `test/adpService.test.js` (9 tests), `test/tradeRoute.test.js` live/unavailable cases.
- **Priority:** P1
- **Cost:** small
- **Do not touch:** paid data source or new dependency without approval.

## S. Security lane

**Phase 4.** Most of this is already closed — A3 verified, F1 verified, Stripe removed, legal shipped, 0 production vulns, GDPR module retired with a regression test. What remains is the last mile plus one mobile-specific threat model.

### S1 — Final production secrets and Supabase settings review

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — founder-only access
- **Priority:** P0
- **Cost:** small
- **Agent-buildable:** checklist preparation only
- **Scope:** final pre-beta pass over production secrets and Supabase settings. Includes the A3 carry-over: **leaked-password protection is disabled in Supabase Auth** (one-toggle fix).
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

### O1 — Self-hosted observability on KVM1

- **Status:** READY
- **Blocked by:** None
- **Priority:** **P0 — hard Phase 3 gate**
- **Cost:** medium
- **Agent-buildable:** configuration yes; the deploy action is founder-gated
- **Scope:** Sentry (self-hosted), Umami, and Vector log shipping per `self-hosted-observability-runbook`. This also unblocks G6 in the deferred backlog.
- **Skills:** `self-hosted-observability-runbook`, `security-privacy-evidence`
- **Done when:** a deliberate test error appears in Sentry within 60 seconds; Umami records a page view; Vector ships container logs; the privacy posture is recorded and no PII or provider credential is captured.
- **Do not touch:** production data, secrets, or DNS without explicit approval.

### O6 — Native crash reporting on both platforms

- **Status:** BLOCKED
- **Blocked by:** O1
- **Priority:** **P0 — hard Phase 3 gate**
- **Cost:** medium
- **Agent-buildable:** yes
- **Source:** a native crash never reaches the API logs. Without this, a tester whose app dies on launch is completely invisible to you.
- **Done when:** a deliberate crash on iOS and on Android each appear in Sentry within 60 seconds, with symbolicated stack traces and no PII or token in the payload.
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

## F. Verify lane — Justin must pin

**Phase 4.** F6–F9 are the beta gate. **F6 and F9 decide whether beta succeeds.**

### F6 — Real-account QA: ESPN

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — real account credentials
- **Priority:** **P0 — highest risk item in the plan**
- **Cost:** medium
- **Agent-buildable:** preparation and matrix only
- **Source:** #265/#266/#267 are merged but **not provider-proven** beyond a read-only aggregate proof. ESPN is the newest code and the most fragile auth path.
- **Scope:** connect, recovery/reauth, waiver pool, drafted-league behavior, and Omen recommendations end to end on a real ESPN account, on both native apps.
- **Done when:** every flow passes on a real account on iOS and Android, with a sanitized matrix and no cookie name or value in any log, screenshot, or payload.
- **Do not touch:** ESPN cookie values anywhere; real credentials in agent output.

### F7 — Real-account QA: Yahoo

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — real account credentials
- **Priority:** P0
- **Cost:** medium
- **Agent-buildable:** preparation and matrix only
- **Done when:** connect, session restore, Omen recommendations, and League Standings pass on a real Yahoo account on both platforms, with a sanitized matrix.
- **Do not touch:** provider credentials in logs or screenshots.

### F8 — Real-account QA: Sleeper

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — real account credentials
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

### F1 — Service-key Supabase route-scoping audit

- **Status:** VERIFIED
- **Evidence:** `Direction/reviews/2026-07-31-f1-service-key-route-scoping-audit.md`; `test/userPrivacyIsolation.test.js` (4 tests), `test/espnRouteIsolation.test.js` (3 tests); `npm test` 476/476 at the time of closure.
- **Priority:** P1
- **Cost:** medium
- **Do not touch:** production data; secret values.

### F4 — ESPN public handoff production verification

- **Status:** VERIFIED
- **Evidence:** `Direction/reviews/2026-07-31-f4-espn-public-handoff-verification.md`; `test/espnConnectGuideRegression.test.js` (5 tests); `npm test` 481/481 at the time of closure.
- **Priority:** P1
- **Cost:** small
- **Do not touch:** ESPN cookie values in logs, UI, URLs, or payloads.

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
- **M4-Auth-Passkeys-Onramp** (P2) — deferred; every new auth provider is new store-review surface during the tightest five weeks.
- E1 mobile scope decision — **resolved 2026-08-05** by the both-platforms decision. E2/E3 app-store closeout is superseded by lane R.
- G1 win-streak reward ladder UI waits on a backend win-streak contract.
- G2 ESPN live draft Lazy Sync and G3 Yahoo live draft Lazy Sync wait on a stable provider contract and season timing.
- G4 IDP support remains P3 and needs an explicit supported-league/data scope.
- G5 skeleton narration states should fold into the relevant native composition.
- G6 Umami integration — **unblocked by O1** once that lands; promote then.
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
- **Store items are founder-executed:** Apple/Google accounts, signing certificates, provisioning profiles, release configuration, and metadata submission. Agents may prepare artifacts; they may not act on store accounts.
- Do not deploy unless Justin explicitly approves the deploy action.
- Docs/doctrine-only pushes must not restart KVM1.
- ESPN cookie values must never appear in logs, UI, screenshots, URLs, analytics, share payloads, or stored app state outside the approved backend secret flow.
- Mock/demo/stale/offline data must be visibly labeled and never represented as live fantasy advice.
- Account deletion copy and exact confirmation phrase `DELETE MY OMEN DATA` require fresh approval before change.
- Team-based runtime theming is removed. Do not revive team skins without a new approved theme-pack plan.
- No paid dependency, cloud model spend, or external service commitment without explicit approval.
- **Draft Assistant is not a 1.0 feature.** Do not advertise it, build against it as a launch dependency, or let it back into scope without a new founder decision.
