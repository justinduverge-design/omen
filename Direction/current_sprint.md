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

- **Status:** READY
- **Blocked by:** TASK-A7-OwnedFootballDataPipeline — the founder selected the owned source strategy; production scoring must wait for its lawful source set, historical replay, monitoring, and failure behavior to be verified.
- **Blocked by:** TASK-A6-MovesScoringFormat — the scoring-format change must pass review and staging validation so standard and half-PPR leagues are not graded as PPR.
- **Blocked by:** TASK-O2 — the founder-approved condition requires the rollback exercise to be completed before persistent enablement.
- **Blocked by:** AGENT_RESOLVABLE — run the no-write production rehearsal against real rows and record readiness/cron health plus independent standard, half-PPR, and PPR comparisons before enabling writes.
- **Unblock:** 2026-08-22 CLEARED — founder conditionally approved persistent Tuesday scoring enablement once all six evidence gates pass: two historical-week replays; independent three-format comparison; A6 staging validation; real-row/no-write production rehearsal; proven monitoring/failure behavior; and completed O2 rollback exercise with Justin as owner. The flag remains `false` until every condition is evidenced; no production action is authorized before then.
- **Unblock:** 2026-08-22 REASSESSED — `A5` is complete: founder rejected a paid fallback and selected a Slops-owned Omen football-data pipeline. The obsolete missing-`player_stats_2026.csv` premise and `TASK-A5` blocker are replaced by the actual implementation/evidence dependency, `A7-OwnedFootballDataPipeline`; the production flag remains evidence-gated.
- **Priority:** P0
- **Cost:** small
- **Phase:** 6 — **season gate, not a beta gate.** Do not count this against beta. The dry-run is preparable now; the flag flip waits for September.
- **Agent-buildable:** dry-run preparation and verification only; the env flip is gated
- **Done when:** dry-run validates real rows without writes; production flag is explicitly approved and changed; readiness and cron health pass; rollback owner is named.
- **Do not touch:** the production flag before approval; never log provider credentials or raw user data.

### A5 — Decide the Tuesday-scoring fallback data source

- **Status:** CLOSED
- **Closure:** COMPLETED
- **Evidence:** `Direction/decision_log.md` (2026-08-22 — Omen will own its football-data pipeline); `Direction/reviews/2026-08-15-a5-scoring-source-options.md` §0A
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
- **Founder decision 2026-08-22:** no paid fallback subscription. Build a Slops-owned Omen football-data pipeline, automatically operated on existing infrastructure, with source rights and reliability proven before any collector is deployed. `A7-OwnedFootballDataPipeline` carries the agent-owned research and architecture work; ADP is a future consumer, not silently absorbed into Tuesday scoring.

### A6-MovesScoringFormat — Persist league scoring format on recommendations

- **Status:** IN_PROGRESS
- **Claim:** Codex, 2026-08-24 — implementing the founder-approved A6 package first on `codex/a6-a7-football-data`; SQL remains review-only and will not be applied anywhere.
- **Blocked by:** None
- **Unblock:** 2026-08-22 CLEARED — founder approved authoring the additive review-only migration and validating it in staging. Production application remains a separate explicit founder gate; this decision does not authorize applying SQL to production.
- **Priority:** P1 — correctness defect in the grading loop
- **Cost:** small
- **Source:** 2026-08-15 A5 research.
- **What is wrong:** `fetchPendingMoves` selects without `scoring`, carrying the in-source note "`scoring` is not present in the deployed moves schema. scoreMove already defaults an absent format to PPR." So **every** move is graded as PPR. A standard or half-PPR league's recommendation is graded against points its league does not award. `nflverseScoresFromCsv` already computes `rec_std`, `rec_half`, and `rec_ppr` — all three are produced and two are discarded.
- **Why it belongs to the vendor-agnostic ask:** this is the one genuinely *per-league* dimension of scoring. It is not fixed by adding data sources, and it affects Sleeper, ESPN, and Yahoo users identically.
- **Done when:** the league's scoring format is captured at recommendation time and persisted on the move; `scoreMove` reads it rather than defaulting; the PPR default remains only for historical rows that predate the column; review-only SQL authored in `sql/`, not applied.
- **Do not touch:** applying SQL to staging or production — that is the gated founder sequence, in order: approval → staging → verification → production.

### A7-OwnedFootballDataPipeline — Design the automated Slops-owned football-data pipeline

- **Status:** READY
- **Blocked by:** None
- **Priority:** P0 — selected fallback for Tuesday scoring
- **Cost:** medium research and architecture; implementation to be estimated from the resulting plan
- **Source:** founder selected the owned-pipeline option on 2026-08-22 and rejected another subscription before September. Existing VPS/Pi infrastructure may automate collection, validation, preservation, and monitoring, but no source is free to scrape merely because it is publicly readable.
- **Scope:** evaluate at least five primary or openly licensed football-stat sources for licence, ToS, coverage, correction latency, identifiers, rate limits, and automation rights; design immutable raw snapshots → normalized player/game identities → derived standard/half-PPR/PPR results → cross-source validation → Tuesday publication; compare VPS-primary/Pi-witness, Pi-primary/VPS-failover, and VPS-only operating shapes; cost build and in-season maintenance; define monitoring, replay, correction, provenance, and source-loss behavior. Identify the clean extension seam for a future Slops-owned ADP corpus without treating ADP as part of this scoring deliverable.
- **Done when:** a source-backed architecture memo names the lawful source set, exact schedules, storage and retention, idempotency/replay rules, data-quality checks, infrastructure roles, failure and failover behavior, build estimate, weekly maintenance estimate, and a phased implementation plan; at least two historical weeks are replayed in a non-production proof and compared against an independent reference before any production collector is proposed.
- **Do not touch:** no scraping against unclear or prohibitive terms; no production deploy, cron enablement, paid commitment, new dependency, secret, SQL, migration, or provider credential; do not represent future ADP capability as built.
- **External outreach 2026-08-22:** founder sent Sleeper a commercial-use permission/licensing request. A response may add an approved source option, but does not block the selected owned-pipeline research or authorize current commercial API use.

## R. Store and release — critical path, founder-executed

**Phase 1.** This lane is the longest pole and most of it is calendar time no agent can compress. Agents may prepare artifacts; **Justin executes every item here.** Run these first each week — everything else can proceed in parallel, these cannot.

### R2-Android — Google Play Console account + app record

- **Status:** **VERIFIED — 2026-08-18.** Founder-reported and screenshot-evidenced (Play Console "Create app" flow, package name field), not independently browser-verified the way `R2-iOS`/`R3-BUILD-iOS` were — no live Play Console session was opened the way App Store Connect's was.
- **Claim:** Justin, 2026-08-18 — organization account approved by Google; app record created with `applicationId = com.slopssaloon.omen`, matching `mobile/android/app/build.gradle.kts:57`.
- **Blocked by:** None
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

- **Status:** **CLOSED 2026-08-19.**
- **Closure:** COMPLETED — the last open clause was `cost recorded`, supplied by the founder 2026-08-19. **The machine bought was a MacBook Neo at $699**, not the Mac mini this item's Options list assumed. Hardware confirmed by reading the machine directly rather than from the verbal report: `Model Name: MacBook Neo`, `Model Identifier: Mac17,5`, `Chip: Apple A18 Pro`, `Memory: 8 GB`, `macOS 26.5.1` (`25F80`), running Xcode 26.6 (`17F113`). **Option 1 ("buy a Mac") was the option taken; the specific machine and price both differ from the estimate written here** (`~$400 refurb M1/M2, $599 new M4`) — recorded as the actual rather than silently mapped onto the closest bullet. Every other clause was already evidenced on 2026-08-18: a signed build on TestFlight and a repeatable path.
- **Was:** VERIFIED 2026-08-18.
- **Claim:** Justin (archive, signing, App Store Connect actions) + Claude (diagnosis and code fixes), 2026-08-18 — released on verification.
- **Evidence:** independently confirmed in the App Store Connect TestFlight tab: **Version 0.1.0, Build 1, Status: Processing, Date Created Aug 18, 2026 6:25 PM** — the first build this app has ever had reach TestFlight, replacing what was an empty "Submit a build to start testing" state earlier the same day. Full account: `Direction/reviews/2026-08-18-r3-ios-appstore-icon-orientation-fix.md`; `Blueprints/handoffs/2026-08-18-r3-ios-appstore-icon-orientation-fix.md`.
- **What actually blocked it, twice, after signing was fixed:** (1) `ASSETCATALOG_COMPILER_APPICON_NAME = Omen` existed in the Debug build configuration but was **missing entirely from Release** — the configuration an archive actually uses — so a distribution build carried no app-icon reference regardless of what existed on disk. (2) No `UISupportedInterfaceOrientations` was declared anywhere, which Apple's validator rejects outright for a Universal (iPhone+iPad) app. Both fixed; a local `xcodebuild archive -configuration Release` proved the fix compiles clean before the founder spent another round-trip through Xcode's GUI. The already-existing, already-designed Icon Composer brand icon (`OmenIOS/Omen.icon` — real ring-and-laces artwork, not a placeholder) was simply never being referenced; a flat 1024×1024 App Store marketing icon was added alongside it from the same approved brand export (`logos/omen-app-icon-1024.png`) as a belt-and-suspenders fallback, since Icon Composer is new enough that its coverage of the separate marketing-icon requirement wasn't certain.
- **Option 1 is executed and now fully evidenced end to end.** The Mac mini runs Xcode 26.6 (`17F113`) with Automatic Signing for team `6RWR5G9894`; a distribution certificate was generated (`Apple Distribution: Valor Ventures Limited Liability Company`, alongside the pre-existing development one); a signed archive was produced and uploaded through App Store Connect.
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

- **Status:** **VERIFIED — 2026-08-18 (build config VERIFIED 2026-08-05; signing completed and independently confirmed 2026-08-18).**
- **Claim:** Justin (keystore generation, Play App Signing enrollment) + Claude (build verification), 2026-08-18 — released on verification.
- **Evidence 2026-08-18:** upload keystore generated locally via `keytool` (`CN=Justin Duverge Catalino, O=Valor Ventures LLC, OU=Mobile, L=New London, ST=Connecticut, C=US`), stored one level above the repo (never inside it), the four `omen.release*` keys set in git-ignored `local.properties`. `./gradlew bundleRelease` → `BUILD SUCCESSFUL`, `:app:validateSigningRelease` and `:app:signReleaseBundle` both ran. **Independently confirmed, not just trusted from the build log:** extracted the real `.RSA` signature block from the produced `app-release.aab` (`META-INF/OMEN-UPL.RSA`) and read its certificate directly with `openssl` — subject matches the keytool identity exactly, self-signed as expected for a fresh upload key. Keystore and password confirmed never committed (`.jks` lives outside the git working tree entirely; `local.properties` is git-ignored).
- **✅ DONE — do not rebuild (merged as `231c9d2`):** all three original defects are fixed. `release` reads `OMEN_API_BASE_URL` from config (default `https://slopssaloon.com`), `OMEN_DEMO_MODE_ENABLED = false`, a `signingConfigs` block reads the upload keystore from `local.properties` or environment, and a shippability guard fails the build on a placeholder URL or missing signing. `mobile/android/local.properties.example` documents the keys.
- **Blocked by:** None
- **Evidence:** merged to `main` as `231c9d2`. Release now resolves `OMEN_API_BASE_URL` from config with a `https://slopssaloon.com` default and sets `OMEN_DEMO_MODE_ENABLED = false`; a `signingConfigs` block reads the upload keystore from `local.properties` or environment; a release shippability guard fails the build on a placeholder/blank API URL or missing signing (escape hatch `OMEN_ALLOW_UNSIGNED_RELEASE=true`). Added `mobile/android/local.properties.example`. Verified on Windows: `:app:bundleRelease` without signing fails with the guard message; `generateReleaseBuildConfig` emits the production URL and demo mode `false`; `generateDebugBuildConfig` unchanged; `:app:testDebugUnitTest` BUILD SUCCESSFUL.
- **Founder step completed 2026-08-22:** Google Play Console accepted version code 1 into the Omen internal-testing release draft under the `DarthSlops` organization account, and the release page confirms Google Play App Signing is active. No keystore or password entered the repo or recorded evidence.
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

- **Status:** CLOSED
- **Closure:** COMPLETED — both platforms now satisfy the signing and first-upload acceptance. iOS build 1 reached TestFlight on 2026-08-18; Google Play Console accepted Android version code 1 into an internal-testing release draft on 2026-08-22 and confirms Play App Signing is active. The Android release was not published and has no testers yet.
- **Evidence:** `R3-BUILD-iOS` evidence above; `R3-BUILD-Android` evidence above; Google Play Console organization account `DarthSlops`, app `com.slopssaloon.omen`, internal-testing draft version code 1, observed 2026-08-22; `Direction/decision_log.md` (2026-08-22 — Android's first signed bundle reached Google Play; rollout remains gated)
- **Unblock:** 2026-08-18 CLEARED — `R2-Android` approved, removing the only Android-side blocker.
- **Unblock:** 2026-08-22 CLEARED — Google Play accepted the signed AAB and displayed version code 1 on the internal-release preview. Play App Signing is active. This closes signing/provisioning only; `R4`/`R5` and tester selection still gate publishing the internal release.
- **Priority:** P0
- **Cost:** small–medium
- **Agent-buildable:** no — certificates and keys
- **Done when:** iOS distribution certificate and provisioning profile exist and a signed build uploads successfully; Android upload key and Play App Signing are configured and a signed AAB uploads successfully.
- **Do not touch:** never place certificates, keys, or passwords in the repo, logs, or agent output.

### R4 — Privacy nutrition labels and Data Safety form

- **Status:** CLOSED
- **Closure:** COMPLETED
- **Evidence:** `Direction/reviews/2026-08-23-r4-r5-store-declarations.md`; `Direction/decision_log.md` (2026-08-23 — both stores' privacy and age declarations are complete)
- **Unblock:** 2026-08-18 CLEARED — `R2-Android` approved, removing the only remaining blocker (iOS side was already clear).
- **Unblock:** 2026-08-23 PARTIALLY CLEARED — the founder submitted Google Play's Data Safety declaration. Play Console now lists it among the actioned declarations, records three collected/shared data categories, confirms encryption in transit, and shows `https://slopssaloon.com/delete-account` for both account-deletion URL and deletion support. The live privacy-policy URL, sign-in-access instructions, and 13+ target-audience declaration were also completed. This is the Google half only; Apple privacy nutrition labels remain before R4 closes.
- **Unblock:** 2026-08-23 CLEARED — Apple App Privacy was published against the shipped Privacy Notice: eight declared data types, no tracking, diagnostics not linked to identity, and the public Privacy Notice and deletion-choice URLs attached. Together with the submitted Google declaration, this satisfies both halves of R4.
- **Priority:** P1
- **Cost:** small
- **Agent-buildable:** drafting yes; submission founder-only
- **Source:** the privacy policy shipped in #269 is the input. In-app account deletion is already implemented — that is an Apple requirement already satisfied.
- **Done when:** Apple privacy nutrition labels and the Google Data Safety form are drafted against actual data flows (Supabase auth, provider tokens, no ad SDKs), reviewed against the shipped privacy policy, and submitted.
- **Do not touch:** claims not supported by the actual data flow.

### R5 — Age rating and gambling questionnaire

- **Status:** CLOSED
- **Closure:** COMPLETED
- **Evidence:** `Direction/reviews/2026-08-23-r4-r5-store-declarations.md`; `Direction/decision_log.md` (2026-08-23 — both stores' privacy and age declarations are complete)
- **Unblock:** 2026-08-18 CLEARED — `R2-Android` approved, removing the only remaining blocker (iOS side was already clear).
- **Unblock:** 2026-08-22 PARTIALLY CLEARED — the Google Play IARC content-rating questionnaire was submitted under `owner@slopssaloon.com` at 10:15 AM and reports `Completed`, with general-audience results including ESRB Everyone, PEGI 3, USK 0, and IARC 3+. This is the Google half only; Apple age-rating/gambling responses and the cross-store copy consistency check remain before R5 closes.
- **Unblock:** 2026-08-23 CLEARED — the founder saved Apple's current seven-step age-rating questionnaire after a read-back of every answer. Bounded public trade-share is declared as UGC; social, chat, ads, mature content, violence, medical guidance, gambling, simulated gambling, contests, and loot boxes are No/None. The founder applied the 13+ override required by Omen's Terms; App Store Connect reports 13+ in 172 countries/regions, with Apple's regional equivalents elsewhere. Both stores are now complete and consistent with the standing no-wagering boundary.
- **Priority:** **P0 — store-rejection risk**
- **Cost:** small
- **Agent-buildable:** drafting yes; submission founder-only
- **Source:** fantasy sports can trigger Apple's gambling review path. `Direction/reviews/2026-07-12-store-metadata-privacy-gambling-copy-audit.md` already exists — use it rather than re-deriving.
- **Skills:** `slops-legal-spot-check`
- **Done when:** both store questionnaires are answered consistently with the shipped copy and the existing gambling-copy audit; no marketing or in-app string implies wagering, real-money play, or guaranteed outcomes.
- **Do not touch:** answering a questionnaire in a way the app copy does not support.

### R6 — Internal testing tracks

- **Status:** READY
- **Blocked by:** EXTERNAL — Apple Beta App Review approval for iOS version 0.1.0, Build 1; App Store Connect currently reports `Waiting for Review`.
- **Blocked by:** EXTERNAL — 10+ qualified testers from real fantasy leagues must accept beta access; at least one allowlisted tester with a compatible Android device must complete the Google Play opt-in and installation proof.
- **Unblock:** 2026-08-11 ROUTED — split from a single untyped comma list into typed, machine-readable lines per `Direction/status-model.md`. No dependency was added or removed.
- **Unblock:** 2026-08-22 CLEARED — the founder conditionally approved opening the private internal testing tracks as soon as `R3`, `R4`, and `R5` are complete. This removes the repeat founder gate only; it does not satisfy those tasks, invite anyone early, authorize external testing, or authorize public release.
- **Unblock:** 2026-08-22 CLEARED — `R3` completed when Google Play accepted Android version code 1 and confirmed Play App Signing; only `R4` and `R5` remain before tester selection and internal publication.
- **Unblock:** 2026-08-23 CLEARED — `R4` and `R5` closed after the founder submitted and verified both stores' privacy and age declarations. The 2026-08-22 conditional founder approval is now operative: private internal tester selection and internal-track publication may proceed, but external/public release remains prohibited.
- **Unblock:** 2026-08-23 REASSESSED — Build 1 is Ready to Test and attached to `Omen Internal Beta`, but the eligible tester picker is empty. Apple limits internal testers to App Store Connect users with qualifying roles; granting console access to ordinary beta users merely to avoid Beta App Review is not authorized. Evidence: `Direction/reviews/2026-08-23-r6-testflight-tester-model.md`.
- **Unblock:** 2026-08-23 CLEARED — the founder approved External TestFlight for the real-user iOS cohort so friends and fantasy-league participants can be invited without App Store Connect roles. The first-build Beta App Review is accepted as part of that route. This authorizes external beta setup and invitations only; it does not authorize public App Store release.
- **Unblock:** 2026-08-23 ESCALATED — `Omen External Beta` was created, Test Information and Build 1's `What to Test` were saved, and the founder submitted iOS version 0.1.0 (Build 1) to Beta App Review. App Store Connect now reports `Waiting for Review`, with the build attached to both the internal and external groups. No external tester has been invited yet.
- **Unblock:** 2026-08-23 CLEARED — Android version 0.1.0 (version code 1) was published to the Google Play internal track. Play Console reports the track `Active` and the release `Available to internal testers`; one founder-controlled Google account is allowlisted and the private opt-in link is enabled. The release remains unreviewed under Google's temporary package-name label, and installation has not yet been proven.
- **Unblock:** 2026-08-23 REASSESSED — store-side setup is complete as far as it can proceed without outside outcomes: Apple is awaiting Beta App Review and Android is active for allowlisted testers. The founder does not own Android hardware, so Android installation evidence must come from a qualified external tester; the proposed no-subscription recruitment route is documented at `Direction/reviews/2026-08-23-r6-beta-cohort-recruitment-plan.md`. No outreach has been sent and no anonymous install-exchange user counts toward the real-league threshold merely by installing.
- **Unblock:** 2026-08-23 CLEARED — the founder approved the prepared direct-contact message, waitlist email, moderator-permission request, tester feedback prompt, iPhone installation note, and Android recruitment/installation notes as launch-ready. This clears copy review only: Apple approval and the 10+ qualified-tester outcome remain external blockers, and no message, invitation, public link, or tester-list change has been sent or made under this approval.
- **Priority:** P0
- **Cost:** small
- **Phase:** 5 — this is beta open
- **Agent-buildable:** no
- **Source:** use Google Play internal testing for Android. Reserve TestFlight Internal Testing for genuine App Store Connect team members; use External TestFlight, including first-build Beta App Review, for the real-user iOS cohort.
- **Done when:** both apps are installable by invited testers on their approved beta tracks and 10+ real testers in real leagues have access.
- **Do not touch:** public store release or production tracks before Phase 6.

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

- **Status:** **VERIFIED (slices A + B + C + D + E, both platforms).** A+B+C 2026-08-15; **D 2026-08-16**; **E 2026-08-17**. The beta-minimum client (A+B+C+D) plus the Ledger is complete. F/G stay design-gated behind the M1 screen contracts, which are proposed but not ratified; this item is not closed.
- **✅ DONE — do not rebuild (2026-08-15, PR [#309](https://github.com/justinduverge-design/omen/pull/309) `02857e7`):** slice **A** shared transport (base URL, bearer injection, timeout, typed error enum), slice **B** shell truth from `GET /api/dashboard/summary`, slice **C** provider strip. Both platforms. The fixtures they replaced (`OmenCommandCenterFixtures.realDisconnected`, the hardcoded connection cards) are gone from the live path. The repository/view-model pattern now exists on both platforms — **copy it, don't reinvent it.**
- **✅ DONE — slice D (2026-08-16), both platforms. Merged as PR [#317](https://github.com/justinduverge-design/omen/pull/317) / `80ee3fa`; not deployed.** The Omen destination now renders `POST /api/omen/mvp-move` (`2026-05-18.omen-live.v1`) instead of picking a fixture. `OmenDecisionFixtures.realDisconnected` is **unreferenced on both platforms** — it is off the live path entirely, and `demo` is reachable only from the demo state. Every documented contract state is mapped from `omen-native-backend-state-contract-v1.md` §F2 + `src/services/omen.js`: `success`, `empty`, `off_season`, `platform_disconnected` → Connect, and all seven recovery states render the **server's own** sentence rather than a client re-wording. An unrecognised state fails safe to an error rather than being force-fitted into `success`. Evidence: **iOS 208/208** (Xcode 26.6 `17F113`, iPhone 17 Pro sim; baseline 192, +16), **Android 64/64** connected on `medium_phone` API 36 (baseline 51, +13), `:app:assembleDebug` + core JVM suites green, backend 563/563 unchanged.
- **✅ DONE — slice E (2026-08-17), both platforms. Merged as PR [#320](https://github.com/justinduverge-design/omen/pull/320) / `ee4387f`; not deployed.** The Ledger renders `moves-history.v1` instead of the preview fixture, with its own loading and error surfaces — a Ledger read failure must not be allowed to render "No Ledger entries yet", which is a positive claim about the user's history. Evidence: **iOS 221/221** unit + 5/5 UI (Xcode 26.6 `17F113`, iPhone 16 sim; baseline 208), **Android `:app:testDebugUnitTest` 27/27** (baseline 13) + `:app:assembleDebug` + `:core:designsystem` 22/22.
- **🔨 REMAINING:** slices **F** and **G** only — and they are **not pullable** — they are new screens whose M1 screen-contract slices do not exist; keep the honest "landing next" placeholders until those are approved.
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

### M5-Slice-E-Ledger — Wire the Ledger to `GET /api/moves`

- **Status:** CLOSED
- **Closure:** COMPLETED
- **Evidence:** merged PR [#320](https://github.com/justinduverge-design/omen/pull/320) / `ee4387f`, 2026-08-17. Not deployed. `Blueprints/handoffs/2026-08-16-m5-slice-e-ledger.md`; `mobile/ios/OmenIOS/OmenIOS/App/Api/MovesHistory.swift` + `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/feature/api/MovesHistory.kt`; iOS 221/221 unit + 5/5 UI (Xcode 26.6 `17F113`, iPhone 16 sim), Android `:app:testDebugUnitTest` 27/27 + `:app:assembleDebug` + `:core:designsystem` 22/22.
- **Blocked by:** None
- **Priority:** P0 — the last pure-wiring slice of the beta-minimum client.
- **Cost:** small
- **Agent-buildable:** yes, in full
- **Source:** `M5-Native-API-Client` slice E. Slices A–D shipped; the transport, repository, view-model, and contract-mapping patterns all exist on both platforms and were re-proven by slice D on 2026-08-16. **Copy slice D, do not reinvent it** — `OmenDecision.swift` / `OmenDecision.kt` and their view models are the template, including the honest-absence rules.
- **Scope:** `GET /api/moves` → `moves-history.v1` replaces the Ledger preview fixture. The approved composition (Figma node `72:2`) is unchanged — this is wiring only, no visual work.
- **Carry the slice-D lessons in:** grep `src/routes/moves.js` for the literal states/shapes it emits before modelling the client (slice D found eleven states where the specs named four); render the server's own message for recovery states rather than a client re-wording; fail safe on an unrecognised shape rather than force-fitting it; never fabricate a field to satisfy a non-optional type — drop the row instead.
- **Skills:** `slops-tdd`, native read gate
- **Done when:** the Ledger decodes `moves-history.v1` into existing native state types on both platforms; loading, empty, and error route to `OmenStateSurface` rather than crashing or substituting a fixture; demo still renders labeled fixtures via the demo user id and a test proves the live path is unreachable from demo; iOS `xcodebuild test` and Android `:app:testDebugUnitTest` + `:app:assembleDebug` green, with `xcodebuild -version` recorded per the local-substitute rule. **Pure mapping tests now belong in `:app/src/test`** — the JVM source set landed 2026-08-16; only tests needing a semantics tree or a real Context go in `androidTest`.
- **Do not touch:** backend contracts — an unmet native need goes to `Blueprints/handoffs/frontend-to-backend.md`, not into `src/`. Do not collapse the demo path (facts-of-record #7).

### M1-Screen-Trade — M1 screen contract: Trade builder + verdict

- **Status:** VERIFIED
- **Evidence (revised proposal, not approval):** `src/services/tradeLeagueContext.js`, `src/routes/trade.js`, `test/tradePersonalization.test.js` (`npm test` 651/651, baseline 618 + 33), `Blueprints/api-routes.md` § "Trade compare v2"; Figma `mWjrAKPi4JSIP5lAmGAtB3` revised contracts iOS `98:2` / `98:29` / `99:2` / `99:29` and Android `98:53` / `98:80` / `99:53` / `99:80`, superseded originals `41:130` / `41:143` / `41:176` / `41:192` and `41:153` / `41:166` / `41:202` / `41:218`, QA record `87:2`; `Blueprints/handoffs/2026-08-24-m1-league-trade-contract-revision.md`.
- **Merged and deployed 2026-08-24:** PR [#364](https://github.com/justinduverge-design/omen/pull/364) / `0694a03`. `trade-compare.v2` verified live on `https://slopssaloon.com/api/trade/compare` — v2 contract version, `close_needs_context` neutral, `insufficient_data` with correct counts, and `unauthenticated` degrading to **200** neutral rather than 401. The personalized path is inert until a client sends `league_context` with a session. **Merging is not ratification** — this item stays `VERIFIED` and `M5` slice G stays blocked.
- **Blocked by:** None — the agent-resolvable backend + contract batch is delivered; what remains is founder ratification, which is **not** pre-authorized for this item.
- **Unblock:** 2026-08-16 REASSESSED — founder resolved both open questions (see `Direction/decision_log.md`). The verdict enum gains its fourth state **on the server** (additive `contract_version` + evaluability signal on `POST /api/trade/compare`), and **"Personalize" waits for real league context** — the personalized half of slice G stays blocked until `/compare` accepts league/roster context, and native ships no scoring-format-only Personalize affordance. Both routed to the backend lane. Ratification of the contract itself is still outstanding.
- **Unblock:** 2026-08-16 ROUTED — proposal complete and awaiting founder ratification. The low-fidelity iOS/Android frames and the golden pair **already existed** from the M1-P pass (iOS `41:130`/`41:143`/`41:176`/`41:192` + golden `38:2`; Android `41:153`/`41:166`/`41:202`/`41:218` + golden `39:2`); what was missing was §2's "01 — Principles & References" board and the "06 — QA & Evidence" record, both now written (`86:2`, `87:2`). Two open questions need a founder call before `M5` slice G — the shipped three-value verdict enum vs the approved four-label vocabulary, and "Personalize" having no backend input. Both are recorded in `Blueprints/handoffs/frontend-to-backend.md`.
- **Unblock:** 2026-08-22 ROUTED — founder did not ratify the current contract. Return only when the server accepts real league/roster context, the personalized result is demonstrably different from neutral analysis where context matters, all four approved verdict states are server-supported, and the revised iOS/Android evidence shows the complete personalized flow.
- **Unblock:** 2026-08-24 DELIVERED — all four conditions are met. `POST /api/trade/compare` accepts an optional `league_context`; personalization applies the league's real scoring format, roster construction, and the caller's own positional depth, not a scoring-format label; the difference is **shown** — one identical offer returns `close_needs_context` neutrally and `favors_you` in a 3-WR league, and two league shapes return two net values while both report mode `personalized`; and all four verdict states carry explicit server semantics via an additive `contract_version` + `evaluability` signal. Neutral-by-default is unchanged (§8.1 stays founder-approved). Only Sleeper personalizes today; ESPN and Yahoo are named unsupported rather than faked.
- **Evidence (proposal, not approval):** Figma `mWjrAKPi4JSIP5lAmGAtB3` nodes `86:2` (references board) and `87:2` (QA & Evidence record); `Blueprints/handoffs/2026-08-16-m1-screen-contracts.md`.
- **Priority:** P1 — **this is what blocks `M5` slice G.** The native Trade destination ships an honest "landing next" placeholder today and must keep it until this is approved.
- **Cost:** medium
- **Agent-buildable:** proposal yes; approval no.
- **Source:** `m1-figma-screen-contract-pass-v1.md` §2 "04 — iOS Screens / 05 — Android Screens", flow **4 (Trade builder + verdict)**, plus its golden-screen pair under "Trade verdict". Named as a blocker in `M5-Native-API-Client`: slices F and G "are not wiring — they are new screens whose Figma slices do not exist yet."
- **Backend is already live and is not the gate:** `POST /api/trade/compare` ships today and Trade Analyzer is free and public on web. What is missing is the native screen contract, not the data.
- **Skills:** `figma:figma-generate-design`, `design:design-critique`, native read gate
- **Done when:** low-fidelity iOS and Android screen contracts exist for the Trade builder and its verdict, each with primary plus most-important alternate state; the golden-screen pair exists; every visible element maps to an approved component or an explicit proposal; platform differences are intentional and documented; and §4's acceptance clauses are satisfied and recorded in "06 — QA & Evidence".
- **Do not touch:** do not invent or rename semantic tokens; do not create an unapproved production component; do not use competitor layouts or copy; do not begin `M5` slice G implementation on an unapproved contract.

### M1-Screen-League — M1 screen contract: League matchup + standings/activity

- **Status:** VERIFIED
- **Evidence (revised proposal, not approval):** `Blueprints/specs/mobile/m1-league-screen-data-plan-v1.md`; Figma `mWjrAKPi4JSIP5lAmGAtB3` revised contracts iOS `95:2` / `96:2` and Android `95:35` / `96:32`, superseded originals `30:162` / `30:181` / `30:194` / `30:213`, QA record `88:2`; `Blueprints/handoffs/2026-08-24-m1-league-trade-contract-revision.md`.
- **Merged 2026-08-24:** PR [#364](https://github.com/justinduverge-design/omen/pull/364) / `0694a03`, deployed to production by `deploy.yml` on push to `main` (run `success`). **Merging is not ratification** — this item stays `VERIFIED`, the frames keep their `REVISED PROPOSAL` badges, and `M5` slice F stays blocked.
- **Blocked by:** None — the agent-resolvable revision is delivered; what remains is founder ratification, which was pre-authorized on 2026-08-22 subject to this evidence.
- **Unblock:** 2026-08-16 REASSESSED — founder resolved both open questions. **The empty activity section is the v1 build target:** both Primary frames are redrawn and renamed "standings live, activity empty (v1)", and the populated composition is preserved as a labelled future state (iOS `90:2`, Android `90:8`). **Off-season uses clean omission for 1.0**; prior-season history is parked as a future backend capability. Slice F may build standings plus an empty activity section once the contract is ratified. Ratification itself is still outstanding.
- **Unblock:** 2026-08-16 ROUTED — proposal complete and awaiting founder ratification. The low-fidelity frames already existed (iOS `30:162`/`30:181`, Android `30:194`/`30:213`); the missing halves — references board and QA & Evidence record — are written (`86:2`, `88:2`). The R7 scope correction was executed **in Figma**: both M2 app-shell frames still listed a `Draft` destination and were amended with a dated note (iOS `18:7`, Android `18:20`). One open question needs a founder call: the Primary frame draws a populated "Around the League" section for which **no backend feed exists**, so either that frame or the v1 build target has to change.
- **Unblock:** 2026-08-22 ROUTED — founder did not ratify the current contract. Ratification is pre-authorized once revised iOS and Android evidence demonstrates a complete matchup view, standings, and meaningful league activity; an empty activity panel may exist only as a genuine empty/error state, not as the primary approved experience.
- **Unblock:** 2026-08-24 DELIVERED — the revision is complete. Primary (v2) carries a live Matchup Spine, Playoff Picture, rank table, and a **populated** Around the League built from standings-derived and deadline signals; the empty activity panel moved to Alternate (v2) as a truthful state. The backend-data plan carries the §2.5 provider capability matrix and an additive `GET /api/league/overview` proposal. **The matchup data already ships** — `fetchSleeperMatchups()` and ESPN's `mMatchup` view both run today and are discarded down to one win/loss letter. Ratification is the only step left.
- **Evidence (proposal, not approval):** Figma `mWjrAKPi4JSIP5lAmGAtB3` nodes `86:2` (references board) and `88:2` (QA & Evidence record), plus corrected `18:7` / `18:20`; `Blueprints/handoffs/2026-08-16-m1-screen-contracts.md`.
- **Priority:** P1 — **this is what blocks `M5` slice F.** The native League destination ships an honest placeholder today and must keep it until this is approved.
- **Cost:** medium
- **Agent-buildable:** proposal yes; approval no.
- **Source:** `m1-figma-screen-contract-pass-v1.md` §2, flow **5 (League matchup + standings/activity)**.
- **Backend is already live and is not the gate:** `GET /api/league/standings` → `league-standings.v1` ships and is already consumed by the Command Center context strip (slice C), so the data shape is proven in native code.
- **Scope correction carried in, 2026-08-16 (R7):** the app-shell contract used to define this destination as carrying a **"seasonal Draft entry."** Draft is cut from 1.0 and the whole draft path is dark; `omen-native-app-shell-auth-api-contract-v1.md` §1.4 is amended and the `draft` row is preserved for 2027. **This screen contract must not include a Draft entry.**
- **Skills:** `figma:figma-generate-design`, `design:design-critique`, native read gate
- **Done when:** low-fidelity iOS and Android screen contracts exist for League matchup and standings/activity with primary plus alternate state, including the honest off-season empty state (`league-standings.v1` correctly returns `standings: []` out of season — facts-of-record #10); every element maps to an approved component or explicit proposal; §4 acceptance recorded in "06 — QA & Evidence".
- **Do not touch:** no Draft entry; no invented tokens; no unapproved production component; do not begin `M5` slice F on an unapproved contract.

### M1-QA-EvidenceGate — Close the M1 screen-contract pass acceptance gate

- **Status:** READY
- **Blocked by:** None
- **Priority:** P2 — no beta feature depends on it, but §4 is the gate that makes every M1 screen contract citable as approved design authority rather than a drawing someone made.
- **Cost:** medium
- **Agent-buildable:** yes, in full (proposal); founder ratifies.
- **Source:** the 2026-08-16 `M1-Screen-Trade` / `M1-Screen-League` pass. That session found all eight low-fidelity flows and all three golden pairs already drawn on both platforms, but pages **`01 — Principles & References`** and **`06 — QA & Evidence`** were **empty**, and `m1-figma-screen-contract-pass-v1.md` §4 requires both. It wrote them for two flows only: references board `86:2` (scoped to Trade + League) and QA records `87:2` / `88:2`.
- **Scope:** the remaining **six** flows — Command Center, Omen lead + Start/Sit detail, Waiver Analysis, team/league switcher sheet, Account → Connected Leagues, and Welcome/provider connection. For each: a `06` QA record in the shape already established (frames + contract links + states + intentional platform differences + open questions + approval status), and its reference influence annotated on `01`. Audit each flow against shipped backend truth the way the Trade and League records did — that audit is what surfaced the verdict-enum and activity-feed gaps.
- **Done when:** `06 — QA & Evidence` holds a record for all eight flows; `01 — Principles & References` annotates every source that influenced any of them; every visible element in the six audited flows maps to an approved component or an explicit proposal; and any conflict found is recorded as an open question rather than resolved inside a screen (§1).
- **Do not touch:** do not redraw the existing frames — they are the M1-P pass's approved work. Do not mark anything approved; ratification is founder-only. No new tokens, no unapproved production component, no competitor artifact.

### M9-NativeScreenBacklog — Mint delivery items for the four approved-but-unbuilt screens

- **Status:** READY
- **Blocked by:** None
- **Priority:** P2 — planning, not build. It exists because the gap is currently invisible: these screens are designed, approved, and nowhere in the queue.
- **Cost:** small
- **Agent-buildable:** yes (planning-pass shape); founder ratifies priority.
- **Source:** the 2026-08-16 screen-contract audit. Native ships four surfaces — Command Center, Omen, Connect, Help. `M5-Native-API-Client` covers slices A–G and stops. **Four approved screen contracts have no delivery item anywhere:** Waiver Analysis (visual briefs §6), Start/Sit detail (§5), the Ledger **detail** screen (§7 — slice E wired only the Command Center *preview*), and the team/league switcher sheet (§10.2). The switcher is the load-bearing one: `M5` slice C fills the context strip, and §10.1 makes that strip the control that switches every personalized surface — today it has nothing to open.
- **Done when:** each of the four carries a canonical task record with key, priority, `Done when:`, `Blocked by:`, and a stated backend dependency (or none), ordered against the beta-minimum; and any that is deliberately post-1.0 says so with a reason rather than being left unqueued.
- **Do not touch:** no implementation. This is a planning act.

### M10-DesignLaneStaleness — Extend the staleness check to design work

- **Status:** READY
- **Blocked by:** None
- **Priority:** P2
- **Cost:** small
- **Agent-buildable:** yes, in full
- **Source:** `scripts/check-sprint-staleness.js` matches sprint keys against merged **PR titles**, so it can only ever see the code lane. On 2026-08-16 the queue offered `M1-Screen-Trade` and `M1-Screen-League` as work to be done when every frame they asked for already existed in Figma — the **eighth** recorded instance of this pattern and the first the script structurally could not catch, on the same day the script was written to end it.
- **Scope:** for any sprint item whose evidence is a Figma node rather than a PR, assert the named frames are **absent** before the item is presented as pullable. The node ids are already recorded in each item's `Evidence:` line, so the check can read them from `current_sprint.md` and query the file. Keep the existing signal-quality discipline: report a hit as a finding only when it is unambiguous, and exit 0 with an explicit "this is NOT an all-clear" when Figma access is unavailable.
- **⚠️ Amended 2026-08-24 — the obvious way to check absence returns a FALSE POSITIVE.** Figma pages load lazily, and two separate reads lie about it before a page is loaded: `get_metadata` with no `nodeId` returned **one** page for a file that has **seven**, and `page.children.length` reported **0** for pages holding **27** frames. A checker that infers "this frame does not exist" from either would confidently report existing, approved work as missing — the exact false finding this item exists to prevent, inverted. **Absence may only be concluded from a direct probe of the specific node id** (`get_metadata` with that `nodeId`, or `getNodeByIdAsync` after `setCurrentPageAsync`). Evidence: during the 2026-08-24 `M1-Screen-League`/`M1-Screen-Trade` revision, the page listing supported a confident conclusion that node `86:2` was never written; probing `86:2` directly returned a fully populated references board.
- **Done when:** the check flags a design item whose frames exist while its `Status:` is not `CLOSED`; **concludes absence only from a direct per-node probe, never from a page listing or a `children.length` read**, and carries a test or fixture proving it does not report a lazily-unloaded page as empty; is proven against the real 2026-08-16 case; stays quiet on genuinely-unstarted items; and edits nothing — closing an item stays a human judgement.
- **Do not touch:** do not auto-close anything; do not write to Figma.

### M11-M1ContractProviderProof — Prove the M1 contract claims against real provider data

- **Status:** BLOCKED
- **Blocked by:** FOUNDER — needs a real connected Sleeper league and a real connected ESPN league (credentials are founder-only), **and** ratification of `M1-Screen-League` / `M1-Screen-Trade` first. If either contract is rejected again the proof target changes, so running this before ratification risks proving the wrong thing.
- **Unblock:** ratify the two contracts, then make a Sleeper and an ESPN league available for a read-only proof session.
- **Priority:** P2 — nothing in beta depends on it, but every capability claim in both contracts is currently fixture-proven only, and `Blueprints/specs/mobile/m1-league-screen-data-plan-v1.md` §1 marks four rows ⚠️ unverified on purpose.
- **Cost:** small
- **Agent-buildable:** yes once the leagues exist; the founder supplies access, the agent runs the reads and records evidence.
- **Source:** the 2026-08-24 contract revision ([#364](https://github.com/justinduverge-design/omen/pull/364)). Both halves were deliberately shipped with their unproven edges named rather than smoothed over.
- **Scope — exactly five claims, no more:**
  1. **ESPN per-side projection shape** — the data plan asserts ESPN returns projected totals in the same `mMatchup` view. Inferred from surrounding usage, never parsed anywhere in `src/`.
  2. **Sleeper deadline field** — trade deadline / playoff start on the league settings object.
  3. **ESPN deadline field** — same, on ESPN league settings.
  4. **Trade personalization against a real Sleeper league** — `src/services/tradeLeagueContext.js` currently resolves real settings only in tests. Confirm `roster_positions`, `scoring_settings.rec`, and `total_rosters` arrive in the expected shape from a live league.
  5. **The neutral-vs-personalized difference on real data** — the verdict flip is proven on deterministic fixtures; observe it once on a real roster.
- **Done when:** each of the five carries a live, sanitized evidence line (shape confirmed or corrected, dated, provider named); `m1-league-screen-data-plan-v1.md` §1 has no remaining ⚠️ row that is merely inferred; **any claim that fails is degraded in the contract to the section it affects rather than the screen** (§2.5 gate 5 — no global parity claim from one provider); and no league name, roster, manager identity, cookie, or token value appears in the evidence.
- **Do not touch:** no ESPN cookie or Yahoo token value in any artifact (facts-of-record #6); no write to any provider; no production action. **Yahoo is out of scope** — its API is refused at the app-entitlement level (facts-of-record #11, issue [#308](https://github.com/justinduverge-design/omen/issues/308)) and no proof is possible until that clears.

### M8-EspnAndroidHelper — Decide the Android ESPN path

- **Status:** CLOSED
- **Closure:** COMPLETED — founder decision 2026-08-22: retain the existing desktop/web ESPN connection path through beta; after beta, try Microsoft Edge's mobile-extension route first. This closes the decision only, not an implementation, submission, publication, or security review.
- **Evidence:** `Direction/decision_log.md` (2026-08-22 — Android ESPN stays desktop-assisted through beta; try Microsoft Edge mobile post-beta); `Direction/reviews/2026-08-15-espn-mobile-feasibility-memo.md` § "2026-08-22 Android decision brief"
- **Unblock:** 2026-08-22 CLEARED — the founder selected the beta posture and the post-beta first experiment. The active founder gate is removed; future Edge feasibility is recorded in the deferred backlog and must be promoted as a separate task after beta.
- **Priority:** P2
- **Why it is not a mirror of iOS:** **Firefox does not support `storage.session.setAccessLevel` on any platform** (MDN browser-compat-data). `background.js` calls it precisely so the content script can read the payload the popup staged; without it that read throws and the handoff fails silently. A Firefox port is a **code change**, not a repackage — the staging step would move to message passing or a `storage.local` write with an immediate clear, which carries its own privacy review since `storage.local` persists where `storage.session` does not. An earlier read this session called Firefox Android "the most open path"; on the API that matters it is the closed one.
- **Edge Android** is on by default for Android 11+/Edge 123+ but uses a curated, sandboxed store. Verify Microsoft's current mobile curation policy directly before planning around it — the available sources were secondary and mixed quality.
- **Interim answer:** Android ESPN users connect on desktop via the published Chrome/Edge listings. Documented, not hidden.

### M3A-QA — Native auth interactive real-device QA

- **Status:** READY
- **Blocked by:** EXTERNAL — interactive human device/inbox access and a genuinely disposable account are required for the remaining Android matrix and destructive deletion proof; no founder identity may be used as the deletion fixture
- **Unblock:** 2026-08-12 REASSESSED — the founder supplied the physical iPhone interaction needed for one successful native Sign in with Apple ceremony: the Apple sheet appeared, authorization completed, and Omen reached authenticated state. That is valid partial evidence, not the full matrix. Email OTP, return/cancel/background/termination cases, session restore, account deletion, log safety, and the Android half remain open.
- **Unblock:** 2026-08-13 PARTIALLY CLEARED — physical-iPhone evidence now covers Sign in with Apple, Face ID passkey registration/sign-in, Discord OAuth with PKCE return to Omen, six-digit email OTP, and persisted-session restore after force-close/reopen. Supabase custom SMTP was repaired with a Resend sending-only key scoped to `slopssaloon.com`; both signup and returning-user templates now emit `{{ .Token }}`, and Email OTP length is six digits. Xcode 26.6 passes **121 tests / 0 failures** after the callback and OTP-normalization fixes. **Status stays `READY`:** destructive account deletion was not run against a founder account, and Android email OTP/session restore/account deletion/log-safety interactive evidence remains open.
- **Unblock:** 2026-08-22 CLEARED — the founder's mandatory-security doctrine removes the approval classification. Auth, log-safety, session, and deletion testing are required operating evidence; founder-only device/inbox access identifies the human executor, not discretion to skip the controls.
- **Priority:** **P0 — auth is the front door**
- **Cost:** small, human-gated
- **Agent-buildable:** implementation and sanitized evidence preparation; credential/inbox/device interactions remain human-only, and destructive proof must use a disposable account
- **Done when:** Android Play-services AVD or real device proves Google sign-in, email OTP, session restore, account deletion, and log safety; iOS real device proves Sign in with Apple, email OTP, session restore, account deletion, and log safety.
- **Evidence:** sanitized QA matrix; no screenshots or logs containing credentials or tokens.
- **Do not touch:** real credentials in agent logs or screenshots.

### M4-CC-PlatformsCompact — Shrink Your-Platforms strip on Command Center

- **Status:** **CLOSED 2026-08-22.** The last unevidenced `Done when:` clause is now evidenced: the Android render exists, the assembly/scanner/connected-test results are recorded, and `6466a4c` has a handoff. Ledgered in `Direction/sprints_completed.md`.
- **Closure:** COMPLETED
- **Evidence:** `References/evidence/2026-08-14-cc-platforms-compact/` — `README.md` plus `android-medium-phone-command-center-demo-connected.png` (connected **and** disconnected rows in one frame) and `android-medium-phone-command-center-disconnected.png`, on `medium_phone` API 36 at 1080×2400 @420dpi (411×914dp, Pixel-6a-class). Above-the-fold measured by column scan, not eyeballed: Omen hero card ends at y=2000 with the nav bar starting at y=2127. Strip border sampled from the rendered pixel at `#E5E5E3` = the light `border` token (`OmenColor.kt:146`). Gates on 2026-08-22: `:app:assembleDebug` BUILD SUCCESSFUL, `PrimitiveEnforcementTest` **1/1**, `:core:designsystem:testDebugUnitTest` **22/22**, `:app:testDebugUnitTest` **45/45**, `:app:connectedDebugAndroidTest` **53/53**. Handoff: `Blueprints/handoffs/2026-08-22-m4-render-evidence-package.md`.
- **Prior evidence (implementation):** `6466a4c` — `OmenPlatformCompactRow.swift` (+197) and `OmenPlatformCompactRow.kt` (+173) with paired tests (`OmenCommandCenterScreenTests.swift` +50, `OmenPlatformCompactRowTest.kt` +52, `OmenCommandCenterScreenTest.kt` amended), wired into both `OmenCommandCenterScreen` files; iPhone SE renders at `References/evidence/2026-08-14-cc-platforms-compact/iphone-se-command-center-demo.png` and `iphone-se-dynamic-type-xxxl.png`; visual-brief and state-contract updates in the same commit. The status-dot sub-scope was deferred to post-beta polish by PR [#305](https://github.com/justinduverge-design/omen/pull/305).
- **✅ DONE — do not rebuild:** the compact row is **built, tested, and merged on both platforms** (`OmenPlatformCompactRow.swift` +197, `OmenPlatformCompactRow.kt` +173, wired into both `OmenCommandCenterScreen` files, paired tests on each). iPhone SE render evidence is committed. The status-dot sub-scope is deliberately deferred post-beta (#305). **No composition or code work is owed here.**
- **✅ REMAINING WORK DONE 2026-08-22:** the Pixel-6a-class Android render, the `:app:assembleDebug` + primitive-scanner + connected-test results, and the handoff for `6466a4c` all exist. `B-FREEZE` loses this blocker.
- **Formerly-unevidenced clause — now evidenced, and closed the way the note asked.** The clause required the Omen card above the fold on **Pixel 6a-class Android** as well as iPhone SE. It was closed by attaching the Android render and assembly evidence, **not** by deleting the clause.
- **Unblock:** 2026-08-22 CLEARED — Android compact-row render, assembly/scanner/connected-test results, and the `6466a4c` handoff all delivered.
- **Not covered, stated rather than implied:** the disconnected row's inline `[Connect]` button does not appear in these renders. That is correct behavior — screenshot mode passes no connect handler and the row draws the button only when one exists, per the honest-state rule. The Connect/Manage paths are covered by the connected tests.
- **Priority:** **P1 — beta blocker.** The connect flow is the first screen that matters to a new tester.
- **Cost:** small–medium
- **Scope:** compact each `OmenPlatformConnectionCard` to a single-line row so Omen stays the hero above the fold on iPhone SE. Target shape: `[PlatformBadge] Sleeper · Connected · 4m ago  ›` connected, `[PlatformBadge] Yahoo · Not connected [Connect]` disconnected. Move Manage-league / full Connect CTAs into a tap-through detail sheet. Hard cap the strip at ~2 row-heights.
- **Motivation:** founder feedback 2026-07-23 — current cards take too much vertical real estate.
- **Done when:** compact rows render for both connected and disconnected states on both platforms; the Omen card is visible without scroll on iPhone SE (375×667) and Pixel 6a-class Android; the detail sheet handles Manage/Connect; scanner, connected tests, and `:app:assembleDebug` green.
- **Do not touch:** live provider connect flow, provider credentials, deep-link config, F2 status contract.

### M4-Help-Support-Implementation — Build approved native Help + Support

- **Status:** **CLOSED 2026-08-22.** Ledgered in `Direction/sprints_completed.md`.
- **Closure:** COMPLETED
- **Evidence:** `References/evidence/2026-08-22-m4-help-support-native/` — `README.md` plus:
  - **Android states** — all five (`available`, `no-account`, `offline`, `submission-unavailable`, `provider-recovery`) on `medium_phone` API 36 at 411×914dp.
  - **Android font scale** — 1.3 and 2.0 (accessibility maximum). Help + Support content reflows cleanly at both.
  - **Android compact phone** — 360×640dp via `wm size`/`wm density` override, reset afterwards.
  - **Android TalkBack** — focus capture plus `android-talkback-accessible-name-inventory.txt`: **0 actionable elements without an accessible name**, and a whole-tree scan for `espn_s2`/`swid`/`cookie`/`token`/`bearer`/`password`/`secret`/`session=` returned **no hits**.
  - **iOS** — five states on iPhone SE (3rd gen, 375×667pt compact), three on iPhone 17 Pro Max (large), plus Dynamic Type at `accessibility-extra-extra-extra-large`.
  - **iOS VoiceOver substitute** — new `mobile/ios/OmenIOS/OmenIOSUITests/HelpSupportAccessibilityUITests.swift`, **7/7 pass**: all five states plus largest-Dynamic-Type audited with `performAccessibilityAudit()`, and both interactive rows asserted reachable and named.
  - `xcodebuild -version` = **Xcode 26.6 (17F113)**. Handoff: `Blueprints/handoffs/2026-08-22-m4-render-evidence-package.md`.
- **Honest parity/limitation record** (the `Done when:` asks for one explicitly):
  - **A real-device VoiceOver pass is still open.** The iOS Simulator cannot run VoiceOver — `com.apple.VoiceOverTouch` is a background-only launchd job there. The audit is the documented substitute and is not claimed as equivalent.
  - **The Android TalkBack evidence is a static accessibility-tree check**, not a human listening pass. It proves a name exists and is well-formed, not that the announcement is useful or well-ordered.
  - **One real defect found, and it is not this screen's.** At Android font scale 2.0 the app-wide bottom nav breaks — "Command" wraps to "Comma / nd", "League" clips at the screen edge. Confirmed production code by reading `OmenAndroidApp.kt:505` against the screenshot-mode twin. Recorded in `Direction/known_issues.md`; **still needs a GitHub issue number.**
  - **Help Center rows are non-interactive by design** (`OmenHelpSupportScreen.kt:107-109`, `OmenListRow` with no `onClick`), which is why they are absent from the actionable-name inventory. Verified in source, not assumed.
- **Unblock:** 2026-08-22 CLEARED — Android TalkBack, font-scale, and compact/large-phone evidence delivered, along with the iOS half the old `Blocked by:` line understated.
- **Unblock:** 2026-08-11 REASSESSED — the iOS-CI half of this blocker is retired. As of 2026-08-11 `ios-ci.yml` no longer runs per-PR (release branches + manual dispatch only); routine iOS verification moved to the founder's Mac. **This makes the iOS half of this item Mac-required.** Run the `SUBSTITUTED` command in `Blueprints/definition-of-done.md` → "Local substitutes" and record the output. The Android half is unaffected and remains workable on Windows.
- **Priority:** **P1 — store metadata requires a support URL**, so this is on the release path, not just the product path.
- **Cost:** medium
- **Current state:** implementation merged via PR #229; the accessibility and visual evidence its `Done when:` required was produced on 2026-08-22 and is linked above. PR #229's own closeout was explicit that device evidence had not been run (`adb` unavailable on that Windows workspace) — that is the gap this closed.
- **Done when:** iOS and Android meet the approved contract with scanner/tests, compact and large-phone visual evidence, VoiceOver/TalkBack and Dynamic Type/font-scale checks, and an honest parity/limitation record.
- **Do not touch:** new API endpoints, provider credentials/cookies, account/store settings, analytics, deployment, or production.

### M4-Auth-Providers-v1 — Discord OAuth (iOS passkeys promoted separately)

- **Status:** **CLOSED 2026-08-19.**
- **Closure:** COMPLETED — **the implementation landed in #198 and the local verification passed on 2026-08-13; only the recording step was ever missing.** Surfaced by the 2026-08-19 staleness sweep as an item still advertised as `READY` while every PR it cites was merged — the same shape as `S8`. Each `Done when:` clause re-verified against current `main` on 2026-08-19 rather than trusted from the older note:
  - **Provider-conditional rendering** — Android `OmenAuthFlow.kt:118` renders the Discord block only `if (discordConfigured)` and hides it entirely otherwise; Google degrades to a disabled "Google (not configured)" button rather than vanishing. iOS `SignInView.swift:64` gates on `viewModel.discordSignInAvailable`. Verified by reading both call sites.
  - **Deep-link callback exchange** — Android `OmenAndroidApp.kt` dispatches `AuthEvent.OAuthCallbackReceived` then `repo.exchangeOAuthCode(...)`; iOS `AuthViewModel.handleOAuthCallback(_:)` destructures `.valid(code, codeVerifier)` into `repository.exchangeOAuthCode(...)`. Verified by reading both paths.
  - **Scanner** — Android `PrimitiveEnforcementTest` **1/1**; iOS `PrimitiveEnforcementTests` **1/1**.
  - **Android** — `:core:designsystem:testDebugUnitTest` **22/22**, `:app:testDebugUnitTest` **43/43**, `:app:connectedDebugAndroidTest` **51/51** on `medium_phone` API 36, `:app:assembleDebug` BUILD SUCCESSFUL.
  - **Local Mac** — `xcodebuild test` **234/234, 0 failures**, `xcodebuild -version` = **Xcode 26.6 (`17F113`)**, per the local-substitute rule in `Blueprints/definition-of-done.md`. "iOS CI green" is not cited anywhere.
- **Scope of the 2026-08-19 pass, stated precisely.** It re-proved the code paths and the full test/build matrix. It did **not** re-run a live Discord OAuth round-trip — that evidence remains the 2026-08-13 founder-observed run on the Play-enabled Android emulator and a physical iPhone, with Supabase recording successful PKCE exchanges, and is recorded in the `Unblock:` line below. Do not read today's counts as a fresh live-provider proof.
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
- **Blocked by:** AGENT_RESOLVABLE — reconcile the founder-observed Face ID ceremony against the exact remaining acceptance steps and capture any missing fresh-install plus Account list/remove evidence without credential material
- **Unblock:** 2026-08-22 CLEARED — both founder blockers were stale. The reviewed passkey work merged as `81878d0`; the public AASA URL now serves HTTP 200 JSON without redirect for exactly `6RWR5G9894.com.slopssaloon.omen`; and `Blueprints/handoffs/2026-08-13-native-auth-completion.md` records the founder-observed physical-iPhone Face ID passkey and sign-out ceremonies. This is evidence reconciliation, not a new approval. The item remains open because the record does not explicitly prove every exact Done-when step (fresh install and Account list/remove).
- **Priority:** **P1 — founder pin 2026-08-12.** This supersedes the earlier P2 deferral for the iOS half only.
- **Cost:** small — implementation, public association, and the founder-observed Face ID path are complete; exact acceptance-evidence reconciliation remains
- **Current state:** merge `81878d0` implements the native `AuthenticationServices` provider, official Supabase first-factor passkey endpoints, account add/list/remove, one-time pairing offer, the `webcredentials:slopssaloon.com` entitlement, and the AASA artifact/explicit Express route. Xcode 26.6 (`17F113`) passes **121 tests / 0 failures**; Automatic Signing under team `6RWR5G9894` builds and installs the app on the registered iPhone with both Apple Sign In and Associated Domains in the signed entitlements. On 2026-08-22 the public AASA URL returned HTTP 200, `Content-Type: application/json`, no redirect, and exactly `6RWR5G9894.com.slopssaloon.omen`; the 2026-08-13 handoff records the founder-observed Face ID passkey and sign-out ceremonies.
- **Done when:** `https://slopssaloon.com/.well-known/apple-app-site-association` serves the exact team/bundle association as JSON without redirect; a fresh physical-device install can add a passkey, list/remove it in Account, sign out, and sign back in with Face ID; sanitized evidence records the ceremony without credential material.
- **Evidence:** merge `81878d0`; `Blueprints/handoffs/2026-08-12-m3a-ios-authorization-passkeys.md`; `Blueprints/handoffs/2026-08-13-native-auth-completion.md`; public `https://slopssaloon.com/.well-known/apple-app-site-association` read-only check 2026-08-22; `/private/tmp/omen-m3a-full-simulator-final.log`; `/private/tmp/omen-m3a-device-build-final.log` (local-only command logs, no credentials).
- **Do not touch:** Android passkeys, Xcode Cloud, archive/TestFlight, production deployment, provider secrets, UI redesign, or Figma in this item.

### M4-CC-WaiverWatch — Waiver Watch composition + wiring

- **Status:** **CLOSED 2026-08-22.** The six registered honest states are now rendered and reviewed on iOS, which is what the item was actually waiting on. Ledgered in `Direction/sprints_completed.md`.
- **Closure:** COMPLETED
- **Evidence:** `References/evidence/2026-08-22-m4-waiver-watch-ios/` — `README.md` plus one capture per state (`pending`, `processed`, `availability-unknown`, `no-credible-move`, `not-connected`, `off-season`) on iPhone 17 Pro Max / iOS 26.5, each showing the approved copy the Android connected test asserts. Registered as `waiver-watch.*` entries in both `ScreenshotScenarios` registries (iOS and Android twin), which vary only `waiverWatch` on the real `OmenCommandCenterScreen` — the composition itself was not touched. `xcodebuild -version` = **Xcode 26.6 (17F113)** per the local-substitute rule. Handoff: `Blueprints/handoffs/2026-08-22-m4-render-evidence-package.md`.
- **Prior status:** VERIFIED (merged as PR #271 / `e59fe40`, squash — subject reworded from branch commit `adeba4f`; not deployed or provider-proven). Reconciled 2026-08-05: the prior line said "not pushed, merged, deployed" after the work had shipped.
- **✅ DONE — do not rebuild:** the approved composition (Figma node `67:2`) is **built and merged on both platforms**. SwiftUI source and XCTest registration complete; Android carries 2 connected tests, `:app:assembleDebug`, and a green primitive-enforcement scanner. The full iOS suite passes on Xcode 26.6. **No code is owed here.**
- **✅ REMAINING WORK DONE 2026-08-22:** the six registered states were captured and reviewed on iOS, and `xcodebuild -version` is recorded. The composition was not reopened.
- **Two limitations stated rather than buried.** (1) These scenarios are **deliberately not added to the `native-visual-evidence.yml` matrix**: Waiver Watch renders below the fold on every current iPhone, that workflow captures with no interaction, and a matrix row would upload the top of the Command Center labelled as Waiver Watch evidence. Making them CI-capturable needs a scroll anchor on `OmenCommandCenterScreen` — a change to a shipped screen, out of scope here. (2) The `calm` state has **no committed render on either platform**; `urgent` is covered by the existing `command-center.demo-connected` captures.
- **Unblock:** 2026-08-22 CLEARED — the six-state iOS render evidence was captured and reviewed. The 2026-08-12 XCTest run proved the registered tests pass; this proves the states were rendered and looked at. Figma node `67:2` was already approved, so design was never the gate.
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
- **Unblock:** 2026-08-22 CLEARED — `TASK-M4-CC-PlatformsCompact` CLOSED (Android render + assembly/scanner/connected-test evidence, handoff for `6466a4c`).
- **Unblock:** 2026-08-22 CLEARED — `TASK-M4-Help-Support-Implementation` CLOSED (TalkBack, font-scale, compact/large-phone, and iOS accessibility-audit evidence).
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
- **Blocked by:** None
- **Unblock:** 2026-08-22 CLEARED — founder established that required security controls are mandatory operating practice, not optional approval gates. Founder-only dashboard access identifies the executor; it does not make leaked-password protection or secret-scope verification discretionary.
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
- **Blocked by:** None
- **Unblock:** 2026-08-22 CLEARED — credential containment and required rotation are mandatory release controls. Founder-only credential access is an execution boundary, not a decision about whether the control applies.
- **Unblock:** 2026-08-22 REASSESSED — founder confirmed Yahoo access is not restored and the Apple `.p8` key has probably not been moved. ESPN cookies do not satisfy rotation merely by aging: `espn_s2` is an expiring session cookie with no Omen refresh flow, while `SWID` can remain stable; a fresh validated reconnect overwrites the existing Vault secrets, but invalidation of the old ESPN session or evidence that it was never exposed is still required.
- **Priority:** P1
- **Cost:** small
- **Agent-buildable:** no
- **Source:** ESPN adapter work ran against local branches with provider access. Rotate anything that could have been captured in a local log, shell history, or branch artifact before real testers arrive.
- **Unblock:** 2026-08-11 REASSESSED — no rotation evidence exists on `main`. Founder-reported Supabase configuration work is **not** rotation and does not satisfy this item. **Newly in scope:** P1-YahooReauth will mint a fresh Yahoo token, which discharges the Yahoo portion of this item if the old `token_secret_id` is retired rather than left orphaned — sequence S2's Yahoo half after that item and record it. Also still open from the 2026-07-30 preservation pass: the Apple `.p8` signing key sitting under `C:\Users\JDuve\dev` inherits `CodexSandboxUsers:(I)(RX)` read access and should be relocated outside any agent-reachable path.
- **Done when:** any credential that touched local branch work is rotated or explicitly cleared as never-exposed, with the decision recorded.
- **Do not touch:** credential values in any written record.

### S3 — Rate limits on the three hot routes

- **Status:** CLOSED
- **Closure:** COMPLETED — ledgered in `Direction/sprints_completed.md` § "S3 + S4 + O4 — the three hot routes get limits, containment, and their first load number". **On a branch under founder review, not on `main` and not deployed:** PR [#355](https://github.com/justinduverge-design/omen/pull/355), left open deliberately.
- **Evidence:** commit `0c1f85e` — `src/middleware/hotRouteLimits.js` (per-IP + per-credential limiters, honest 429 envelope), wired in `src/server.js` ahead of the routers; `test/hotRouteRateLimits.test.js` (14 tests: limit-hit on all three routes for both scopes, reset, anonymous-flood containment, key derivation, mount ordering); budgets and the per-credential tradeoff documented in `Blueprints/api-routes.md` § Rate Limits. Proven against a booted server, not only in unit tests: 20 × 401 then 429 on `POST /api/omen/mvp-move` with `Retry-After: 60` and `RateLimit-Policy: 20;w=60`. Mutation-checked — removing the mount turns 8 of the 14 tests red. `npm test` 607/607.
- **Blocked by:** None
- **Priority:** P1
- **Cost:** small–medium
- **Agent-buildable:** yes
- **Scope:** `POST /api/omen/mvp-move`, `POST /api/trade/compare`, `GET /api/dashboard/summary`. These take the Sunday-morning load and are the ones a tester can hammer.
- **Skills:** core implementation + `security-privacy-evidence`
- **Done when:** each route has an enforced per-user and per-IP limit with an honest 429 envelope; tests cover limit-hit and reset behavior; limits are documented in `Blueprints/api-routes.md`.
- **Do not touch:** provider rate limits, production config, or the deploy action.

### S4 — Confirm no provider credentials reachable in logs on error paths

- **Status:** CLOSED
- **Closure:** COMPLETED — ledgered in `Direction/sprints_completed.md` § "S3 + S4 + O4 — the three hot routes get limits, containment, and their first load number". **On a branch under founder review, not on `main` and not deployed:** PR [#355](https://github.com/justinduverge-design/omen/pull/355), left open deliberately.
- **Evidence:** commit `0f546e8` — `test/providerCredentialContainment.test.js` (11 tests) provokes real Yahoo, Sleeper, and ESPN failure paths over their real transports, with the fake provider echoing the credential back in body and headers, captures actual stdout/stderr plus the client-facing envelope, and searches it for the exact canary values fed in. Each test first asserts the canary was genuinely on the wire, so a pass cannot mean the request carried nothing to leak. Two real gaps found by that method and closed in `src/middleware/sentry.js`: `authorization` was absent from the sensitive-key pattern (an axios error carries `config.headers`), and `Bearer <token>` survived the key/value rule because it stops a value at the first space. Containment is now structural — every winston line leaves through the scrubber (`src/middleware/logging.js`), and the terminal error handler moved to `src/middleware/errorEnvelope.js` so the message it echoes is scrubbed and the shipped envelope is the one under test. GlitchTip-payload half was already proven by `O8` (`test/providerErrorCapture.test.js`). Mutation-checked: reverting either scrubber turns the corresponding backstop test red. `npm test` 618/618.
- **Known boundary:** a credential logged as a bare value with no key beside it is invisible to the text scrubber. No code path does this, and facts-of-record #6 keeps ESPN cookie values out of every emission site by construction, but the limit is recorded in the test rather than left implicit.
- **Blocked by:** None
- **Unblock:** 2026-08-18 CORRECTED — this item's scope previously read "...or Sentry payloads once O1 lands." That reference was always wrong: `O1` (Kuma/Beszel) never emitted Sentry-shaped payloads — that was `O1b`'s job, and `O1b` closing on 2026-08-17 proved the tool works, not that anything sends to it. `O8` is what will actually emit adapter-failure payloads. The log/error-envelope half of this item's scope is testable now regardless.
- **Priority:** P1
- **Cost:** small
- **Agent-buildable:** yes
- **Scope:** error paths specifically — happy paths are already covered. Provoke adapter failures for Yahoo, Sleeper, and ESPN and confirm nothing leaks into logs or error envelopes now; extend the same proof to GlitchTip payloads once `O8` ships.
- **Skills:** `security-privacy-evidence`, `slops-investigate`
- **Done when:** a test proves each adapter's failure path emits no cookie, token, or credential fragment in logs and error envelopes; ESPN cookie names and values are absent from every surface, including GlitchTip payloads once `O8` exists.
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

- **Status:** **CLOSED 2026-08-19.**
- **Closure:** COMPLETED — **the work was finished 2026-08-11 and the status was never advanced.** Verified against GitHub 2026-08-19: **zero open Dependabot PRs.** All six named below are resolved exactly as this item's own verdicts prescribed — #273, #274, #277, #281, #282 **merged**; #280 **closed** (correctly: it carried `tailwindcss` 3→4 and `vite` 7→8, which would have broken the build) and now covered by an `ignore` rule so it stops reopening. `.github/dependabot.yml` carries the ignore rules and the phantom-label defect is fixed. Every `Done when:` clause is met: written verdicts for all six, #281 resolved by merge, each red diagnosed to the real cause (a single `nanoid` frontend dev-advisory on `main`, not the PRs), and the config amended rather than PRs manually closed.
- **Why this sat open for eight days.** `scripts/check-sprint-staleness.js` matches sprint keys against merged **PR titles**, and Dependabot PR titles are `build(deps): …` — they never contain the key `S8`. So the one mechanism that exists to catch this drift is structurally blind to dependency work. **This item was still being offered as an available P1 pull on 2026-08-19** — it was listed as candidate #3 in that morning's re-derived queue before this reconciliation caught it.
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

- **Status:** **VERIFIED 2026-08-18.**
- **Claim:** Claude, 2026-08-18 — released on verification.
- **Evidence:** `Direction/reviews/2026-08-18-s5-mobile-token-storage-review.md`; `Blueprints/handoffs/2026-08-18-s5-mobile-token-storage-review.md`. **Storage was already compliant on both platforms — no plaintext token storage found, no source fix required.** iOS uses Keychain Services (`kSecClassGenericPassword`, `AfterFirstUnlockThisDeviceOnly`); Android encrypts with an AndroidKeyStore-backed AES-256/GCM key before ciphertext touches `SharedPreferences`. The actual gap was test coverage: neither store had a direct test before this pass. Added `KeychainSessionStoreTests.swift` (5 tests) and `AndroidKeystoreSessionStoreTest.kt` (5 tests, new `androidTest` source set on `core/session`), both exercising the real secure-storage APIs with a regression guard proving tokens never surface in plaintext prefs. iOS full suite 229/231 passed (1 pre-existing pinned `XCTExpectFailure`, 1 flaky UI test in an unrelated subsystem — confirmed passing on isolated retry; baseline 226 + 5 new = 231 exactly). Android: new tests 5/5 on `medium_phone` API 36 connected instrumentation, `:app:assembleDebug` and the existing `SessionManagerTest` (6/6) both green.
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

- **Status:** **CLOSED 2026-08-17.**
- **Closure:** COMPLETED — GlitchTip deployed on Command Center, all four `Done when:` clauses met with direct evidence.
- **Claim:** Claude, 2026-08-17 — released on verification.
- **The resource estimate here was conservative, and checking it changed the hosting call.** This item's own text estimated GlitchTip at "roughly 1–2 GB." The primary source (`glitchtip.com/documentation/install`) states 256–512 MB is enough and arm64 is officially supported. That meant Command Center's 3.2 GB available headroom was plenty — no need to reach for KVM2. Self-hosted Sentry was never evaluated further; its ~16 GB footprint was disqualifying on sight, as already recorded above.
- **Stack:** `postgres:18` + `valkey/valkey:9` + `glitchtip/glitchtip:6` (`SERVER_ROLE: all_in_one`) at `/opt/command-center/glitchtip/compose.yml`, bound to `100.98.81.0:8000` only — Tailscale-only, matching the existing Kuma/Beszel convention on that host, never `0.0.0.0`. `ALLOWED_HOSTS` pinned to the Tailscale IP rather than left on Django's wildcard default. Email alerts route through Resend SMTP, the same provider Supabase auth already uses for `slopssaloon.com`, on a separate scoped API key rather than reusing Supabase's.
- **A real defect was found and fixed during deploy, not assumed away.** GlitchTip's `smtp://…@host:465` URL does not imply implicit TLS — it opened a plaintext connection into a TLS-only port and hung until timeout, which is what surfaced mid-session as "registration taking forever." Confirmed with a direct `smtplib` reproduction (plaintext-on-465 times out; implicit-SSL-on-465 and STARTTLS-on-587 both work against Resend). Fixed by moving to port 587. **Carry forward: don't trust a bare `smtp://host:port` pairing to imply the right TLS mode — verify the protocol handshake, not just TCP reachability.**
- **`mem_limit` needed real follow-through to actually enforce, not just declare.** Command Center's stock kernel had no cgroup memory accounting, so Docker silently discarded the 768m/256m/768m caps — confirmed via `docker inspect` (`HostConfig.Memory: 0`) and the live cgroup file reading `max`, not inferred from `docker stats`' misleading fallback display. Fixed with the standard Raspberry Pi fix (`cgroup_enable=memory cgroup_memory=1` in `/boot/firmware/cmdline.txt`, backup taken first) plus a reboot. **A plain daemon-restart after reboot was not enough** — it reuses each container's already-baked config rather than re-resolving it against the newly-available kernel capability; a `docker compose up -d --force-recreate` was required before the caps actually applied. Re-verified: `HostConfig.Memory` correctly reads 805306368 / 268435456 bytes post-recreate. All seven containers on the host (Pi-hole, Beszel, Beszel-agent, Kuma, plus GlitchTip's three) survived the reboot cleanly via `restart: unless-stopped`.
- **Done-when evidence:**
  - *Deliberate error, within 60s, usable stack trace:* a synthetic `ESPNMalformedResponseError` (mirroring this item's own canonical example) was POSTed to the ingest API from an external host and confirmed stored, grouped, and queryable with full stack frames intact in **under 1 second** — verified directly against `issue_events_issueevent` in Postgres, not inferred from the ingest endpoint's 200 response alone.
  - *Host and resource cost recorded:* ~300 MB RAM measured (519Mi → 812Mi host `used`, before/after the full stack), ~2.9 GB disk (2.88 GB images + 87 MB volumes) — both comfortably inside Command Center's headroom.
  - *No PII/credential/cookie in payload:* the verification event was entirely synthetic, explicitly labeled as a test in its own `extra` field.
- **Operational resilience proven 2026-08-18, matching the discipline every other Slops OS layer got (see `Blueprints/specs/infrastructure/slops-os-raspberry-pi-fleet-v1.md`) rather than resting on the one synthetic ingest test above.** The original closure proved GlitchTip *accepts and stores* an error; it did not prove GlitchTip *survives* anything, which is a different and equally necessary claim. Two controlled tests: (1) `glitchtip-web` stopped deliberately — confirmed the site actually went down (`HTTP 000`, connection refused), restarted, confirmed recovery in ~18s, confirmed the pre-existing issue row survived the outage untouched. (2) Command Center rebooted a second time, cleanly this time (not incidental to chasing the cgroup bug) — all seven containers on the host came back via `restart: unless-stopped` alone with **zero manual intervention**, GlitchTip returned `HTTP 200` on the first post-boot attempt, and critically `HostConfig.Memory` still read the correct `805306368`/`268435456` bytes without needing another `--force-recreate` — proving the mem_limit fix above was a durable configuration change, not a one-time patch that would silently regress on the next reboot.
- **Kuma monitor added and proven 2026-08-18** — closes the gap above. `GlitchTip` monitor (`HTTP(s) - Keyword`, target `http://100.98.81.0:8000/`, keyword `GlitchTip`, 60s interval), matching the pattern of the three Omen monitors. Proven with a controlled kill/recover cycle observed directly in the Kuma UI, not inferred: stopping `glitchtip-web` produced a real `[GlitchTip] [DOWN] timeout of 48000ms exceeded` event and the badge dropped to red; restarting produced a confirmed `Up` status with a healthy 16ms current response time. GlitchTip now has the same synthetic-monitoring coverage the three Omen endpoints do.
- **✅ Addendum 2026-08-18 — the Sentry SaaS half of the same 2026-08-17 ratification, reconciled onto `main` for the first time.** This closure record has only ever described GlitchTip because the Sentry SaaS half of the ratified split destination (Option D) was recorded on the branch that became PRs #327/#328, which merged after this task closed. Full account in `decision_log.md`, 2026-08-18. Short version: org **`valor-ventures-llc`** exists, web (React) DSN verified end-to-end with a real transmitted event, iOS/Android projects provisioned and unverified pending `O6`. That same verification pass found and PR #328 fixed a real gap — the frontend Sentry client did not scrub OAuth `code`/`state` the way the backend does — closing one of this item's own "no PII/credential in payload" evidence gates for the frontend half. The backend has the identical breadcrumb-URL variant of that gap, still open, tracked in `known_issues.md`.
- **Downstream:** `O6` listed `TASK-O1b` as a blocker on both platforms; that half is now resolved. See `O6` below for the remaining `R3-BUILD-iOS` gate on the iOS half only, and for the two provisioned Sentry projects already waiting on it.
- **Do not touch:** KVM1 production resources (untouched — GlitchTip lives entirely on Command Center); public exposure of the error-tracking UI (confirmed Tailscale-bound only, never `0.0.0.0`).

### O1c — Product analytics (Umami) — deferred

- **Status:** DEFERRED to post-beta
- **Priority:** P3
- **Rationale:** Umami is **product** analytics — which screens get used, funnels, retention. It is not an operations signal and it is not a beta gate. `G6` in the deferred backlog already soft-blocks it. O1's Kuma/Beszel stack covers the operational need; O1b covers the error need. Revisit after Phase 5 when there is real usage worth measuring.
- **Do not touch:** treating analytics as a launch blocker.

### O6 — Native crash reporting on both platforms

- **Status:** **CLOSED 2026-08-21.**
- **Closure:** COMPLETED — ledgered in `Direction/sprints_completed.md` § "O6 — native crash reporting, and the IP-address question that held it open". The IP-attribution item that this record deliberately held the task open for is resolved: the founder enabled **Prevent Storing of IP Addresses** on the Sentry iOS, Android and React projects on 2026-08-21.
- **⚠️ Evidence boundary, stated rather than blurred.** The setting change is **founder-confirmed in the Sentry dashboard**. It was **not** re-proven empirically — no fresh deliberate crash was run afterward to observe the user count fall to 0 on iOS. O6's `Done when:` concerns the *payload*, and the payload was already proven clean by grep and by `SentryEnvelopeReporterTests`; the IP was added by Sentry at ingestion, which is why a settings change is the right fix. **But "the toggle is on" and "no IP is stored on the next crash" are two different claims**, and only the first is evidenced here. A fresh deliberate crash on each platform would close that gap and is cheap to run whenever a device is already in hand — worth folding into `F10`'s real-device matrix rather than minting a task for it.
- **Status history:** VERIFIED 2026-08-19 — both halves, founder-confirmed in the dashboard.
- **Claim:** Claude, 2026-08-19 — released on verification.
- **iOS live proof, 2026-08-19.** Founder supplied the DSN; a deliberate `NSException` was raised via the `-OMEN_CRASH_TEST` launch argument on the iPhone 16 simulator. **Sentry returned HTTP 200** — crash at `21:23:30Z`, report acknowledged at `21:23:32.502`, so **~2 seconds against a 60-second requirement.** Stack frames are symbolicated: frame 3 is `$s4Omen14CrashReportingO16crashIfRequested9argumentsySaySSG_tFZ` (Swift-mangled `Omen.CrashReporting.crashIfRequested(arguments:)`), with further `Omen` frames at 4, 5, and 7 — real symbols, not bare addresses. Payload carries no user data, token, or league identifier; the PII boundary is directly asserted in `SentryEnvelopeReporterTests`. Tests: **244/244** iOS unit (Xcode 26.6 `17F113`).
- **Dashboard confirmed 2026-08-19.** `OmenDeliberateTestCrash` — "O6 verification — deliberate NSException, no user data attached" — `APPLE-IOS-1`, 2 events, seen 2 min after the run, alongside the Android half's `ANDROID-1`. Stored and rendered, not merely accepted.
- **⚠️ One discrepancy found in that dashboard, and it is not cosmetic.** The iOS issue shows **Users: 1**; the Android issue shows **Users: 0**. **Neither payload emits a `user` field** — verified by grepping both reporters — so the attribution is added by Sentry at ingestion, and the usual cause is the client IP being stored as `user.ip_address` unless *Prevent Storing of IP Addresses* is enabled. **Because the code is identical in shape across both platforms, this is a per-project settings difference, not a code difference.** It matters here specifically: the Android half's evidence cites "0 users (confirming no PII attached)", and the same sentence cannot honestly be written for iOS. O6's `Done when:` says *no PII in the payload* and our payload is provably clean — but an IP is personal data under GDPR, and we are storing one for iOS and apparently not for Android. **Action: check *Prevent Storing of IP Addresses* on both Sentry projects and make them agree** (founder-owned — it is a Sentry dashboard setting). A payload-level `user.ip_address` suppression is the belt-and-braces alternative; it should be re-tested empirically rather than assumed to work.
- **Not closed yet, deliberately:** the IP-attribution question above is a privacy posture item on a crash pipeline, which is exactly the class of thing this task's `Do not touch` line exists to protect. Settle it, then `CLOSED`.
- **A real bug this proof caught, and it was the one already written on the wall.** The first DSN write truncated to `https:` in the built `Info.plist` — xcconfig treats `//` as a comment, exactly as `Base.xcconfig`'s own header warns ("The truncation is silent — it reaches `Info.plist` and ships in the build"). Fixed by routing the scheme separator through `$(OMEN_SLASH)`. **The warning existed and was still walked into**, because the DSN was pasted as a plain value rather than treated as a URL. Any future `Local.xcconfig` URL needs the same indirection — verify by extracting the key from the *built* `Info.plist`, never by reading the xcconfig.
- **iOS implementation 2026-08-19.** `App/CrashReporting/SentryEnvelopeReporter.swift` mirrors the proven Android reporter: hand-rolled envelope, **no Sentry SDK dependency** (same call the Android half and `O8` made), posting `application/x-sentry-envelope` to `/api/<project>/envelope/`. Installed via `CrashReporting.install(dsn:)` as the first statement in `OmenIOSApp.init`, chaining to any previously-installed handler. Blank DSN is a no-op, matching Android and the backend. Plumbed through `OMEN_IOS_SENTRY_DSN` → `Base.xcconfig` → `Info.plist` → `AppEnvironment.sentryDsn`. Tests: `SentryEnvelopeReporterTests` **9/9**; full iOS unit suite **243/243** (Xcode 26.6 `17F113`).
- **A real coverage limit on iOS, stated rather than implied.** `NSSetUncaughtExceptionHandler` fires for **Objective-C exceptions only**. Pure Swift runtime traps — `fatalError()`, force-unwrapping nil, index out of range — raise `SIGTRAP`/`SIGILL` and do **not** reach it. Catching those needs signal handlers with genuine async-signal-safety hazards, deliberately out of scope. **The iOS half is therefore partial crash coverage**, and the deliberate-crash proof must use an `NSException` for the claim to be honest about what it demonstrates. Android has no equivalent gap: `Thread.setDefaultUncaughtExceptionHandler` catches all JVM throwables.
- **Blocked by (historical):** None
- **Unblock:** 2026-08-11 ROUTED — split from a single untyped prose blocker into typed lines per `Direction/status-model.md`. No dependency was added or removed.
- **Unblock:** 2026-08-12 REASSESSED — the local Mac/device development-signing prerequisite is now satisfied, but at that point this blocker still stood: no archive/dSYM upload or deliberate native crash had been performed, `TASK-O1b` was still open, and `R3-BUILD-iOS` had not reached TestFlight.
- **Unblock:** 2026-08-17 RESOLVED — `TASK-O1b` closed; GlitchTip is live on Command Center (`http://100.98.81.0:8000`, Tailscale-only) with a proven ingest path (deliberate test error confirmed stored with a full stack trace in <1s). This item's Android-half blocker was satisfied as of this date — Android crash-reporting integration became agent-buildable. At that point overall `Status` stayed `BLOCKED` because iOS symbolication still needed `TASK-R3-BUILD-iOS` to reach a signed build for dSYM upload — see the two entries below for how both remaining pieces closed the same day.
- **Note 2026-08-18 (reconciled onto `main` late — see `decision_log.md`):** the Sentry SaaS org created under `O1b`'s ratified split destination already has **iOS and Android projects provisioned with DSNs**, alongside the verified web one. Neither DSN is wired into a native app yet — no Sentry SDK exists in either codebase — so this was a head start, not a shortcut past the actual `Done when:` work.
- **Unblock 2026-08-18 (1/2) — Android half PROVEN.** Hand-rolled Sentry envelope integration (no SDK dependency, same choice O8 made for the backend), wired via `Thread.setDefaultUncaughtExceptionHandler` in `MainActivity.onCreate`. A real deliberate crash (`adb shell am crash`) reached the Android Sentry project in under 1 second — founder-confirmed directly in the Sentry dashboard: `android.app.RemoteServiceException$CrashedByAdbException` / "shell-induced crash", `ANDROID-1`, 2 events, **0 users** (confirming no PII attached). Stack trace is real class/method/line names (unminified debug build — inherently symbolicated, no ProGuard mapping question in play for this proof). Evidence: `Direction/reviews/2026-08-18-o6-android-crash-reporting.md`; `Blueprints/handoffs/2026-08-18-o6-android-crash-reporting.md`.
- **Unblock 2026-08-18 (2/2) — iOS half's blocker CLEARED.** `TASK-R3-BUILD-iOS` reached TestFlight (`VERIFIED`, see its own record) — a signed build now has a proven, repeatable path. **This does not mean the iOS half of O6 is done** — no Sentry client has been wired into the iOS app and no deliberate iOS crash has been proven yet. It means that work is now agent-buildable rather than gated. `Status` is `READY`, not `VERIFIED`, until the iOS half actually happens.
- **Priority:** **P0 — hard Phase 3 gate, and the single largest blind spot in the whole system**
- **Cost:** medium
- **Agent-buildable:** yes
- **Source:** **the Pi observability stack cannot see this at all.** A SwiftUI or Compose crash never reaches KVM1, so it never touches Nginx, `omen_api`, Kuma, or Beszel. Every one of those stays green while a tester's app dies on launch. Omen is now a mobile-first product, which makes this the most consequential monitoring gap that exists — and it is invisible precisely because everything else looks healthy.
- **Done when:** a deliberate crash on iOS and on Android each appear in the error backend within 60 seconds, with symbolicated stack traces and no PII or token in the payload.
- **Do not touch:** shipping any crash payload containing user data, provider tokens, or league identifiers.

### O7 — Forced-update / minimum-version gate

- **Status:** **CLOSED 2026-08-19.**
- **Closure:** COMPLETED — see `Direction/sprints_completed.md` § "O7 — the forced-update gate lands inert".
- **Claim:** Claude, 2026-08-19 — released on closure.
- **Evidence:** `Blueprints/handoffs/2026-08-19-o7-forced-update-gate.md`. Backend `GET /api/system/min-version` (`system-min-version.v1`) in `src/routes/system.js` + `getMinVersionStatus()` in `src/services/systemContracts.js`, minimum sourced from `config.minAppVersion` (`MIN_APP_VERSION_IOS` / `MIN_APP_VERSION_ANDROID`, both defaulting to `0.1.0` so an unconfigured deploy blocks nobody). iOS `MinVersionGateClient`/`UpdateGateViewModel`/`ForcedUpdateView` gate ahead of the session switch in `AppShellView`; Android `MinVersionGateClient`/`UpdateGateViewModel`/`ForcedUpdateScreen` do the same in `OmenAndroidApp`. **Fails open at three layers** — the service reports `ok` for an unknown platform or unparseable version, both clients collapse network/non-2xx/undecodable to `Unavailable`, and both view models treat `Unavailable` identically to `Ok`. Tests: backend 3 new (below/at/unavailable, incl. bad platform + bad version) with the suite at **569/569**; iOS `MinVersionGateTests` 8/8 with the unit suite at **234/234** and UI at **5/5**; Android `MinVersionGateTest` 8/8 with `:app:testDebugUnitTest` at **42/42** and `:app:assembleDebug` clean. Route also proven against a real booted server (below-minimum → `update_required`, at-minimum → `ok`, no-params → `ok`).
- **Visual evidence:** `forced-update.blocked` registered in both `ScreenshotScenarios` registries and both `native-visual-evidence.yml` matrices; rendered on iPhone 16 simulator (light + dark) and `medium_phone` emulator. Screenshots in `Direction/reviews/evidence/2026-08-19-o7/`. **Rendering caught a real defect the 276 passing tests could not:** `ForcedUpdateView` set no background and was inheriting the system default (`#000000`/`#FFFFFF`) instead of `OmenColor.bg` (`#0A0A0B`/`#FAFAF9`) — fixed and re-verified by sampling the rendered pixel on all three captures. Android was already correct (hosted in `Surface(color = OmenTheme.color.bg)`). **Accessibility audit done and passing:** `ForcedUpdateAccessibilityUITests` (5 tests) — passes at default and at `AccessibilityExtraExtraExtraLarge`, update control exposed by name and hittable, prompt names reason + required version. The unfiltered audit reports **exactly one** finding, the app-wide `OmenTypography` Dynamic Type issue (pinned `XCTExpectFailure`), and notably **does not fail contrast** unlike the Command Center. iOS UI suite now 10/10. **Still outstanding:** human VoiceOver pass on a physical device, and no Android accessibility audit in this pass.
- **Deliberately not done:** the minimum stays at `0.1.0` on both platforms and the store URLs stay blank — per this item's own **Do not touch**, there is no live store listing to send a blocked user to yet. Raising either value is a founder action gated on R3/R4, not part of this task.
- **Priority:** **P0 — mobile has no rollback**
- **Cost:** medium
- **Agent-buildable:** yes
- **Source:** once a build is on a phone it stays there until the user updates. A server-driven minimum-version check is the only lever available when a bad build ships.
- **Scope:** a server-supplied minimum supported version; the app blocks with an honest update prompt below it. Must fail open on network error — never lock a user out because the check itself failed.
- **Done when:** both platforms honor a server-driven minimum version, show an honest blocking prompt, and fail open on network error; tests cover below-minimum, at-minimum, and check-unavailable.
- **Do not touch:** forcing an update without a working store listing to update to.

### O2 — Named rollback owner and tested rollback path

- **Status:** IN_PROGRESS — **documentation and immutable-tag fix applied**; only the founder-executed live exercise remains.
- **Claim:** Justin Duverge, 2026-08-20 — founder-directed O2 continuation; immutable-tag fix landed, live exercise retained for founder execution.
- **Delivered:** `Blueprints/playbooks/rollback-runbook.md` — the backend procedure that works *today*, the mobile answer, and the verification steps. Wired into `Blueprints/done/release-done.md` gates 11 and 16.
- **⚠️ The finding this task existed to surface:** before PR #347, `deploy.yml` published only mutable `:main` tags and immediately ran a bare `docker image prune -f`, destroying the local artifact a rollback would need. GHCR digest lookup remained possible but required package-read access and a value nobody had recorded. The before-state stays documented in the runbook so a later "cleanup" cannot silently recreate it.
- **Fix APPLIED 2026-08-20 — PR [#347](https://github.com/justinduverge-design/omen/pull/347) / `5cf3597`.** The workflow now publishes `:sha-${{ github.sha }}` alongside `:main` for both API and cron images, and scopes image pruning to `--filter "until=168h"`. Local verification before merge: deploy hardening 4/4, backend 570/570, workflow YAML parsed. GitHub registered no deploy run for the workflow-only merge because `.github/workflows/**` is path-ignored; production was not restarted.
- **The runbook now documents the applied path:** immutable SHA tags are primary for current builds; digest lookup is the permanent fallback for builds published before the tag change. The before/after account remains so a later "cleanup" trimming the tag list back to one entry can see what that costs.
- **Mobile answer recorded** as the `Done when:` requires: **no rollback exists.** Halting distribution stops new installs and does not remove or downgrade an installed app. `O7`'s forced-update gate is the mitigation, with its ordering constraint stated — store URLs first, minimum second, or a bad build becomes a total lockout.
- **Rollback owner named 2026-08-19: Justin Duverge.** Recorded in `Blueprints/playbooks/rollback-runbook.md`. Owner and sole executor are the same person — a real single point of failure on a solo product, noted rather than papered over.
- **Remaining, founder-only:** execute the path once against a non-critical deploy. The runbook's last section gives the exact six-step shape, and notes that the number worth timing is how long the digest lookup takes when you do not already know it.
- **Unblock:** 2026-08-22 CLEARED — the founder authorized the controlled non-critical rollback exercise and established that rollback capability plus periodic proof are mandatory operating controls, not optional approval items. Founder-only production access identifies Justin as executor; it does not create discretion to skip the drill. No exercise or deployment occurred in this decision session, so the task remains `IN_PROGRESS` until execution evidence exists.
- **Also corrected while here:** `Blueprints/done/release-done.md` carried a ⛔ HARD-BLOCKED banner citing the GitHub Actions billing hold. That hold was retracted 2026-08-01 — it never existed — and the banner would have blocked a legitimate Release Done closure on a false premise for 18 days.
- **Blocked by:** None
- **Priority:** P0
- **Cost:** small
- **Agent-buildable:** documentation yes; the rollback exercise is founder-executed
- **Source:** A4's own `Done when:` already requires a named rollback owner. Test it before you need it.
- **Skills:** `slops-ship`, `slops-canary`
- **Done when:** the backend rollback path is executed once against a non-critical deploy and documented; a rollback owner is named; the mobile answer is explicitly recorded as "no rollback — O7 forced-update is the mitigation."
- **Do not touch:** an unplanned rollback, a critical deployment, or any exercise without the named human executor, a known-good target, health checks, restore steps, and an evidence plan.

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

- **Status:** CLOSED
- **Closure:** COMPLETED — ledgered in `Direction/sprints_completed.md` § "S3 + S4 + O4 — the three hot routes get limits, containment, and their first load number". **On a branch under founder review, not on `main`:** PR [#355](https://github.com/justinduverge-design/omen/pull/355), left open deliberately.
- **Evidence:** commit `1d3f97d`; full record in `Direction/reviews/2026-08-22-o4-hot-route-load-rehearsal.md`. Local loopback only — `scripts/local-load-stack.js` boots the real `src/server.js` against a loopback Supabase stub; no production, no staging, no provider traffic, no LLM call. **Beta (20 concurrent × 8 = 160/route):** p95 20 / 5 / 23 ms for trade / mvp-move / dashboard, 0 % error rate, 0 rate-limited. **10× (200 concurrent × 8 = 1600/route):** p95 107 / 20 / 101 ms, 0 % error rate, 0 rate-limited. Concurrency chosen against the S3 limits and off the repo, not out of the air — 8 requests/client sits under the tightest per-credential budget (`mvp-move`, 10/min), 20 is the top of the K2 beta cohort, and 200 is R6's internal-track ceiling (100 iOS + 100 Android), which is exactly 10×. Each simulated client carries its own `X-Forwarded-For` and bearer token so the limits distribute as they will in production. Two further saturation runs, one identity on purpose, confirm the S3 limiters bind at exactly their documented numbers with the documented envelope and correct `scope`, and never 5xx.
- **Not claimed:** no provider fan-out, no real LLM call, `mvp-move` ran in explicit mock mode, the stub user has no platform connections, and the whole run is loopback on one host. Per the item's own Scope, Week 1 Sunday morning is the real load test — this is the rehearsal.
- **Priority:** P1
- **Cost:** small
- **Agent-buildable:** yes, against approved local/staging targets
- **Source:** `scripts/load-omen-routes.js` exists and has never been run.
- **Scope:** `POST /api/omen/mvp-move`, `POST /api/trade/compare`, `GET /api/dashboard/summary`. Note that **Week 1 Sunday morning is the real load test** — this is the rehearsal, not the proof.
- **Done when:** load evidence is recorded for all three routes with p95 latency and error rate at a realistic beta concurrency, and again at 10× that.
- **Do not touch:** load-testing production without explicit approval.

### O5 — Supabase backup and restore verification

- **Status:** **CLOSED 2026-08-17 (doc reconciliation — the work itself completed 2026-08-11).**
- **Closure:** COMPLETED — this item sat as "never verified" while the actual pipeline was built and proven in a parallel, undocumented context (the Slops OS infrastructure fleet) a full week earlier. Found and reconciled during the `O1b`/Drive-migration session.
- **Evidence:** `Blueprints/specs/infrastructure/slops-os-raspberry-pi-fleet-v1.md` → "Layer 3 — Steward Automation → The backup pipeline." Encrypted Restic pipeline KVM1 → KVM2, including explicit Supabase Auth export (`auth.users`/`auth.identities`/`auth.mfa_factors`, which the default `supabase db dump` excludes); scheduled every 6 hours; **full disaster-recovery drill proven** — snapshot restored into an isolated, network-disconnected disposable Postgres container with every recovered row count matching source exactly (`moves=1`, `platform_connections=8`, `profiles=3`, `users=3`, `waitlist_signups=10`, zero orphaned Auth identities). Steward monitors freshness (HEALTHY / WARNING >8h / DOWN) through a forced-command-restricted channel that never touches Supabase or Restic credentials.
- **Known residual gap, honestly carried forward:** KVM1 and KVM2 are both Hostinger — this is off-host but not off-provider disaster separation. A second copy on a different provider/local storage remains undone.
- **Do not touch:** production data; never restore over production. (Honored throughout — every restore drill ran in an isolated, network-disconnected container, never against production.)

### O8 — Wire GlitchTip into Omen's actual error paths

- **Status:** **CLOSED 2026-08-21.**
- **Closure:** COMPLETED — ledgered in `Direction/sprints_completed.md` § "O8 — error tracking reaches production, and finds it was never on". PR [#353](https://github.com/justinduverge-design/omen/pull/353) merged and deployed (run `32530387393`); the production DSN defect it uncovered is closed as [#354](https://github.com/justinduverge-design/omen/issues/354). Proven in production: `/api/ready` → `error_tracking.valid: true`, and a real ESPN 404 provoked inside the running container landed in GlitchTip issue 2 tagged `environment: production`, with no credential leak in the stored payload.
- **Claim:** Claude, 2026-08-21 — O8 implementation pass.
- **Evidence:** `Blueprints/handoffs/2026-08-21-o8-glitchtip-error-paths.md`; PR [#353](https://github.com/justinduverge-design/omen/pull/353). A **real** provoked ESPN adapter failure (live GET to `lm-api-reads.fantasy.espn.com` for a nonexistent league → HTTP 404, raised inside `doEspnRequest()`) arrived in the GlitchTip `omen-backend` project as **issue 2**, `Error: ESPN API returned HTTP 404`, `first_seen 2026-08-21 21:37:47+00`, with a **10-frame stack trace**, all four tags recorded (`provider`, `omen_mode`, `provider_operation`, `provider_status`), full `extra` context, and **zero credential leaks** — verified by querying `issue_events_issueevent` directly rather than trusting the ingest 200, and by canary-searching the stored payload for the espn_s2 and SWID values the adapter was handed (all three checks false). `npm test` 591/591.
- **⚠️ Production is NOT yet sending — tracked separately as [#354](https://github.com/justinduverge-design/omen/issues/354), P0.** O8's own `Done when:` never mentioned production configuration, and the code half is complete and proven. But the pass discovered that **KVM1's `SENTRY_DSN` is the literal placeholder `paste_the_value_here` with a real DSN glued on**, in both `omen_api` and `omen_cron` — 115 characters, identical. It is not a legal URL, so `@sentry/node` built no transport and **dropped every event in silence** while reporting `enabled: true`. Omen has been reporting errors nowhere at all. Correcting it is a secrets + production-restart action, so it is founder-gated; the guard against it recurring shipped here.
- **Blocked by:** None
- **Priority:** P1 — this is the payoff `O1b` was built for. `O1b`'s done-when was proven with a synthetic error sent by hand from a terminal. Closing `O1b` proved the tool works — it did not prove the tool catches anything real, and those are different claims. Do not conflate them in future status language.
- **⚠️ This item's original Scope was written on a false premise — corrected 2026-08-21.** It said *"nothing in `src/` sends anything to GlitchTip yet"* and therefore instructed: *"prefer a direct HTTP integration against GlitchTip's store/envelope endpoint over adding `@sentry/node`… `package.json`/dependencies are on this repo's standing do-not-touch list."* **`@sentry/node` was already a dependency and already wired**, and had been since Phase 1.2 (`cc14e79`): `initSentry()` runs before every other import in `src/server.js:24`, `Sentry.setupExpressErrorHandler` is installed at `src/server.js:346`, `src/omen_tuesday_cron.js` has had process-level handlers since the same commit, and `src/middleware/sentry.js` carried a real `beforeSend` scrubber. So the dependency gate the Scope was routing around **did not apply**, and hand-rolling an HTTP integration would have added a second, weaker reporting path beside a working one. The accurate statement of the gap was narrower: **the SDK was wired to the framework but not to the failure paths that actually matter** — no provider adapter reported anything, and the API process had no `uncaughtException`/`unhandledRejection` handlers even though the cron did. *Generalisable: the Scope line was written from the `O1b` handoff's "what is NOT proven" section without grepping `src/`. `main` is the proof — for absence claims too, not only for presence claims.*
- **Cost:** medium
- **Agent-buildable:** yes, with one dependency caveat below
- **Source:** `Blueprints/handoffs/2026-08-17-o1b-glitchtip-error-tracking.md`, "What is NOT proven" — flagged the same day GlitchTip was deployed.
- **Scope:** capture real unhandled backend errors, starting with the sprint's own recurring example — Yahoo/Sleeper/ESPN adapter failures — plus a global Express error handler and `process.on('uncaughtException' / 'unhandledRejection')`. **Prefer a direct HTTP integration against GlitchTip's store/envelope endpoint** over adding `@sentry/node` or an equivalent SDK: this session proved the wire format by hand (plain JSON POST with an `X-Sentry-Auth` header, no library needed), and `package.json`/dependencies are on this repo's standing do-not-touch list (`agent_inbox.md`) — a hand-rolled integration avoids that gate entirely. If the SDK later proves genuinely necessary (breadcrumbs, auto-instrumentation), that is a separate, explicitly-approved step, not a default.
- **Must scrub PII/provider credentials/ESPN cookie values before sending.** This is the exact property `S4` exists to verify — build this with `S4`'s acceptance bar in mind rather than as an afterthought to be cleaned up later.
- **Must never let demo-user activity reach the real GlitchTip project** (facts-of-record #7 — mock and live stay separated; a demo error would pollute real signal and make genuine issues harder to see).
- **Skills:** core implementation + `security-privacy-evidence`
- **Done when:** a real, provoked adapter failure (not a curl-synthetic test) appears in GlitchTip with a usable stack trace; a test proves no credential/cookie/PII fragment reaches the payload; a test proves demo-mode errors never reach the real project.
- **Delivered 2026-08-21:**
  - `src/middleware/providerErrors.js` — `captureProviderError()`, wired at each provider's single lowest-level HTTP chokepoint: `YahooClient.get()` (`src/services/yahoo.js`), `getJson()` (`src/adapters/sleeper.js`), and all five failure branches of `doEspnRequest()` (`src/adapters/espn.js`). Context is an **allowlist**, not a denylist. Yahoo's `401 yahoo_token_expired` is deliberately not reported — it is the ordinary refresh path and the highest-volume Yahoo error there is.
  - **Grouping by `provider + operation + status`,** not by stack. Every provider failure shares one throw site, so the default stack fingerprint would have collapsed a 403 entitlement refusal and a 500 outage into a single issue — the exact confusion that let the Yahoo 403 run on a bare status code for eight days.
  - **Demo isolation, two independent guards** (facts-of-record #7): an explicit `omen_mode` tag, plus a route-prefix drop in `beforeSend` that catches anything thrown under `/api/demo` even when nobody remembered to tag it. Prefix matching respects the segment boundary, so a future `/api/demographics` is not silently unreportable.
  - `src/server.js` — `uncaughtException` (report → drain → exit 1, let the container restart) and `unhandledRejection` (report, keep serving).
- **Two real defects found and fixed while here, both pre-existing:**
  1. **`flushSentry()` calls `Sentry.close()`, which flushes *and permanently disables the client*.** Using it on a survivable path would have ended error reporting for the life of the container after the first unhandled rejection — a silent, permanent outage of the tool O1b was built to provide. Split into `flushSentry()` (terminal) and `drainSentry()` (non-terminal), with the distinction documented at the definition.
  2. **The shared scrubber missed two shapes that are the common case here, not edge cases.** A leading `\b` meant `access_token=…` never matched — `_token` has no word boundary before `token` — so the literal key names our own code uses (`access_token`, `refresh_token`, `token_secret_id`) were exactly the ones it skipped. And `key=value` matched while `"key": "value"` did not, so a secret inside a JSON body passed straight through. Provider error bodies **are** JSON, and O8 forwards a snippet of them by design. Found by O8's own containment test, which failed on first run against a real Yahoo-shaped 403 body.
- **Evidence:** `npm test` **587/587** (baseline was 575; +12 in `test/providerErrorCapture.test.js`). End-to-end proof: `node scripts/verify-provider-error-capture.js` provokes a **real** ESPN adapter failure — a live GET to `lm-api-reads.fantasy.espn.com` for a nonexistent league, answered HTTP 404, raised inside `doEspnRequest()` — and asserts against **the exact bytes the SDK transmits**, not against intent: 0 credential leaks, `provider=espn`, `omen_mode=live`, fingerprint `["provider","espn","http_error","404"]`, 10 stack frames resolving back into `espn.js`.
- **The DSN question is ANSWERED, and the answer was worse than the hypothesis.** The open question at the first pass was *"does production's `SENTRY_DSN` point at GlitchTip or at sentry.io?"* Read directly from both running containers over Tailscale: it points at **neither**, because it is malformed and nothing was ever transmitted. See [#354](https://github.com/justinduverge-design/omen/issues/354).
- **Three defensive fixes shipped so this class cannot recur silently:**
  1. `describeSentryDsn()` **validates instead of testing truthiness**, and an invalid-but-set DSN now disables the client honestly and logs loudly at boot.
  2. The validator **matches the SDK's own key grammar** (`[A-Za-z0-9_]+`). A validator looser than the thing it validates reintroduces the exact bug — `/api/ready` would report healthy while every event dropped. Found the hard way: the first live attempt used GlitchTip's dashed-UUID key, my validator passed it, and `@sentry/node` rejected it with `Invalid Sentry Dsn`.
  3. `GET /api/ready` → `checks.error_tracking` surfaces `{configured, valid, host, project_id, reason}` — **host and project id only, never the key**. Reported, not gating: refusing to serve traffic because monitoring is misconfigured would turn a reporting outage into a user-facing one.
- **⚠️ GlitchTip project keys are dashed UUIDs and `@sentry/node` refuses them.** The dashes must be stripped; GlitchTip accepts the undashed form. This is not written down in `O1b`'s handoff and would have cost the next session the same hour. Confirmed live against the `omen-backend` project.
- **Do not touch:** adding a new npm dependency without explicit approval; KVM1 production behavior beyond the error-reporting hook itself. *(Honored — no dependency added; `@sentry/node` was already present. No production change made.)*

### O9 — Route GlitchTip issues through the existing Layer 5 Discord alerting

- **Status:** **CLOSED 2026-08-21.**
- **Closure:** COMPLETED — ledgered in `Direction/sprints_completed.md` § "O9 — GlitchTip reaches the phone". All three `Done when:` clauses proven live, not in dry-run.
- **Option chosen: (a), extend the dispatcher.** Option (b) — GlitchTip's native webhook pointed at the same Discord URL — was rejected because it would create a second alert path into one channel with different semantics, and O9's own `Done when:` requires the *same* dedup/recovery behavior as Layer 5's other signals. (b) could only satisfy that by reimplementing the noise control that already exists. Reading GlitchTip's Postgres directly mirrors how the dispatcher already reads Kuma's SQLite, so the integration added **no new secret and no new auth surface**.
- **Evidence (live, in order):** CRITICAL alert listing three unresolved issues delivered to `#slops-alerts` and quoted back by the founder → unchanged repeat run silent (dedup) → founder resolved all three in the GlitchTip UI → exactly one `SLOPS RECOVERY` delivered and quoted back → subsequent run silent (no repeat recovery). Other signals confirmed unaffected by running each collector directly: 6 `result=` lines from Steward/Sentinel, all 4 Kuma monitors `status=1`, Pi-hole probe clean.
- **⚠️ Two latent dispatcher defects found and fixed, both pre-dating GlitchTip and both invisible until now:**
  1. **A multi-signal alert could never have been delivered.** The payload was built by interpolating the signature into JSON, and a multi-line signature embeds raw newlines in a JSON string — Discord answers `400`. Every alert ever proven had exactly one failing signal, so this was never exercised. **If two things had broken at once, no notification would have been sent at all** — the alerting layer failing in exactly the situation it exists for. Found because GlitchTip became the fourth source and produced the first genuinely multi-line signature. Now built with a real JSON encoder.
  2. **State was persisted before delivery was confirmed**, so a failed send was never retried — the state file claimed "already reported" for an alert that never left the machine. This is how defect 1 stayed silent: the first failed send still recorded its signature. Delivery now happens first.
- **Also corrected in-pass:** the install briefly set mode `0755` on a script that was `0700`. The script reads the Discord webhook secret path; restored to `0700` and recorded in `ops/command-center/README.md` as a post-deploy check.
- **Deployed artifact is now vendored** at `ops/command-center/slops-alert-dispatcher`, verified byte-identical to `/usr/local/sbin/slops-alert-dispatcher` on the Pi. It previously existed only on a device nobody could diff.
- **Constitution honored:** notification-only. Every added data path is read-only by construction — GlitchTip is read under a forced read-only Postgres transaction, verified by confirming an `UPDATE` is refused.
- **Blocked by:** None.
- **Priority:** P2
- **Cost:** small–medium
- **Agent-buildable:** research/configuration yes; treat with the same care as `O1b` — the actual change lives on Command Center's dispatcher, not in this repo, so the deploy step there is founder-gated the same way.
- **Source:** founder-flagged 2026-08-18. GlitchTip (`O1b`) and the Layer 5 Discord dispatcher (`Blueprints/specs/infrastructure/slops-os-raspberry-pi-fleet-v1.md`) don't know about each other — the dispatcher already polls Kuma/Steward/Sentinel every 5 minutes and is proven notification-only, but it predates GlitchTip and has no path to it.
- **Scope:** evaluate two options against Layer 5's existing noise-control rules (dedup on unchanged signature, one recovery notice, notification-only — no remediation capability) before picking one: (a) extend the Command Center dispatcher to poll GlitchTip's issues API the same way it polls Kuma, or (b) use GlitchTip's own native alert/webhook capability pointed at the same Discord webhook.
- **Done when:** a deliberate new GlitchTip issue reaches `#slops-alerts` on Discord; existing Kuma/Steward/Sentinel alerting is unaffected; the same dedup/recovery behavior already proven for Layer 5's other signals is proven for this one too.
- **Do not touch:** the dispatcher's remediation boundary (notification-only stays notification-only, per the Constitution in the infrastructure spec); Command Center's resource budget (the `mem_limit` discipline `O1b` established applies here too).

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
- **Blocked by:** 2026 NFL regular season has not opened. `GET /api/dashboard/summary` returns `omen_of_the_week: "off_season"` via `isOffSeason()` in `src/services/nflSchedule.js` — correct behavior, not a defect (facts-of-record #10). The scope's *Omen recommendations* clause therefore cannot pass yet, on any account, by anyone.
- **Unblock:** the 2026 regular season opening. **Nothing a founder or an agent can do before then.**
- **Corrected 2026-08-19.** This line previously read `Blocked by: None`, which made a season-floored P0 read as immediately pullable — and it was surfaced as a candidate by the staleness sweep for exactly that reason. The connect/recovery/waiver/drafted-league halves *are* workable now and can be matrixed ahead of time; only the Omen-recommendation half is floored. Split the evidence and state which half was proven, per facts-of-record #10.
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

- **Status:** **CLOSED 2026-08-21.**
- **Closure:** COMPLETED — ledgered in `Direction/sprints_completed.md` § "F9 — mock / live labeling sweep". **This was a pure bookkeeping gap:** F9 met every clause on 2026-08-20 and simply never advanced from `VERIFIED`, which is why `check-sprint-staleness.js` kept flagging it. Re-checked before closing rather than trusted: the inventory exists (`Direction/reviews/2026-08-20-f9-mock-live-labeling-inventory.md`, 150 lines), and the two "not proven" items belong to `F10`/`F11` by their own records, not to F9's `Done when:`.
- **Status history:** VERIFIED 2026-08-20 — all three `Done when:` clauses met; inventory at `Direction/reviews/2026-08-20-f9-mock-live-labeling-inventory.md`. Signed iOS simulator 246/246 (`OmenDecisionTests` 14/14, Xcode 26.6, iPhone 16) and Android `:core:designsystem:connectedDebugAndroidTest` 60/60 on a `medium_phone` AVD, both new Mock/Demo label assertions executing. **Not proven:** human VoiceOver/TalkBack on the labeled states, and rendered screenshot evidence of the new Mock/Demo/Unverified treatments — both belong to F11/F10.
- **Claim:** 2026-08-20 Codex — inventorying and enforcing honest recommendation-state labels across web, iOS, and Android; deferred cross-platform verification completed by Claude on macOS the same day
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
- **M8-EdgeAndroid-PostBeta** — after beta, test Omen's existing Chromium extension on a real Android device and pursue Microsoft Edge mobile-extension eligibility first. The experiment must prove HttpOnly-cookie access and one-shot in-memory handoff before any submission; mobile curation is external and no publication is pre-approved. Firefox direct-message port remains the fallback if Edge is not technically viable or not admitted.
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
