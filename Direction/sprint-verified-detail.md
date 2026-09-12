# Sprint — terminal item detail

**Split out of `Direction/current_sprint.md` on 2026-09-12.** These items are `VERIFIED`, `DONE`,
`SUPERSEDED` or `DEFERRED`: their outcome is settled and their evidence is written. They were
costing roughly 9,700 tokens inside the active queue, which every session pays for before it can
pick a task.

The queue keeps a one-line pointer for each. Full evidence, claims, and correction history live
here. Closure still happens in `Direction/sprints_completed.md` — this file is the reasoning, not
the receipt.


### A7-OwnedFootballDataPipeline — Design the automated Slops-owned football-data pipeline

- **Status:** VERIFIED
- **Blocked by:** None — the memo is delivered; what remains is closure with its evidence line.
- **Evidence:** `Direction/reviews/2026-08-24-a7-source-rights-research.md`; `Direction/reviews/2026-08-24-a7-owned-football-data-pipeline.md`; two-week 2025 replay evidence recorded in the architecture memo.
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
- **Slice C scope correction, 2026-08-15 (founder-approved).** The original slice C was written as `GET /api/platforms/state`. The Command Center's real gap was provider *identity* — league name and team name — which `platform-provider-state.v1` does not carry and `dashboard-summary.v1` does not either. **`league-standings.v1` already carries both**, for all three providers: `league_name` on the envelope (`src/routes/league.js:98`) and `team_name` + `is_current_user` per row (`adapters/sleeper.js:312`, `src/adapters/espn.js`, `src/services/yahoo.js`). So this needed **no backend change** — it was a client composition problem. An earlier note in this item calling it a backend ask was wrong and is retracted.
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

### S5 — Mobile token storage review

- **Status:** **VERIFIED 2026-08-18.**
- **Blocked by:** None — verified on both platforms; what remains is closure with its evidence line.
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

### O1c — Product analytics (Umami) — deferred

- **Status:** DEFERRED to post-beta
- **Priority:** P3
- **Rationale:** Umami is **product** analytics — which screens get used, funnels, retention. It is not an operations signal and it is not a beta gate. `G6` in the deferred backlog already soft-blocks it. O1's Kuma/Beszel stack covers the operational need; O1b covers the error need. Revisit after Phase 5 when there is real usage worth measuring.
- **Do not touch:** treating analytics as a launch blocker.

### P1-YahooReauth — Re-authorize Yahoo under the re-approved API app

- **Status:** ✅ **DONE — UNBLOCKED AND SHIPPED 2026-08-28.** Yahoo granted the entitlement for app `ZcZJXm8V`. A read-only probe from inside `omen_api` returned **200** on `/game/nfl` and `/users;use_login=1/games` — the two calls that 403'd on 2026-08-21 — with a token that auto-refreshed mid-call and was accepted. Both gates were opened the same day: `YAHOO_ENABLED=true` on `omen_api` and `omen_cron` (verified: `/api/yahoo/auth` now 401s on auth instead of 503ing on the flag), and `YAHOO_CONNECTIONS_ENABLED = true` in `frontend/src/lib/yahooAuth.js`. Backend 880/880, frontend build clean. Issue [#308](https://github.com/justinduverge-design/omen/issues/308) closed. **This unblocks F7 and Section K.**
  - **Leagues are bound and the full data path is verified (2026-08-28).** `owner@slopssaloon.com` → `470.l.1255365` (postdraft), `j.duverge21@live.com` → `470.l.1358570` (Fantasy Madness). Both report `isOmenReadyConnection: true`; metadata, `current_week`, team key and a **15-player roster** all return on the deployed image. The predraft league correctly returns no roster until it drafts (season starts 2026-09-09).
  - **Binding required a code fix first.** `getUserLeagues()` returned `[]` for every real response, so every bind was refused. Two more parsers had the same shape bug. See `known_issues.md` (2026-08-28) and `decision_log.md`.
  - **The probe stays for now.** The instruction below says to delete `GET /api/yahoo/access-probe` once green. Deliberately not done in this session: it is the only cheap re-check for an entitlement Yahoo granted by review and can withdraw by review, it is `requireAuth`-gated and read-only, and the eight-day diagnosis it ended was expensive precisely because no such surface existed. Delete it when Yahoo has been stably live long enough to stop suspecting it.
  - **Original status text follows, superseded.** ~~BLOCKED — EXTERNAL (retyped 2026-08-14).~~ This sat at READY long after everything readable had been read. Every hypothesis this item was written to test has been tested and eliminated (see the superseding finding below); what remains is a Fantasy Sports API entitlement that only Yahoo can grant. **The founder re-applied for access on app `ZcZJXm8V` on 2026-08-13.** Nothing in this item is agent-buildable, and it should not be pulled into a session as work — it is a waiting item, not a queued one.
- **Blocked by:** **Yahoo's approval queue**, not the founder and not the code. No amount of local work advances it.
- **Product posture set 2026-08-14 — SUPERSEDED 2026-08-28, retained for provenance. Do not act on this bullet:** Yahoo is enabled in production and connections are open. ~~Starting a *new* Yahoo connection is disabled behind `YAHOO_ENABLED` (default false)~~ because the OAuth handshake still succeeds and writes a `connected` row that can never serve data. Yahoo stays visible in the UI labelled "On hold"; existing rows stay disconnectable. See `Direction/decision_log.md` (2026-08-14) and issue [#308](https://github.com/justinduverge-design/omen/issues/308), the standing tracker carrying the re-check and re-enable steps. **Do not delete Yahoo code, tests, or fixtures as dead** — they are what makes re-enabling a flag flip.
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

## F. Verify lane — Justin must pin

**Phase 4.** F6–F9 are the beta gate. **F6 and F9 decide whether beta succeeds.**

> **Season-start floor cleared 2026-08-26.** Production `GET /api/system/current-week` reports
> season 2026, week 1, `season_type: "regular"`. The earlier August `off_season` result was correct
> when recorded but is no longer a blocker. F6-F8 still require their real-account/native evidence;
> the open season makes that evidence runnable rather than automatically satisfied.

### W1-A — ESPN in-app connect sheet (iOS + Android)

- **Status:** VERIFIED — 2026-09-03. All acceptance clauses met; one residual noted below.
- **Claim:** a real iPhone signs in to ESPN inside Omen and connects a league end to end, no
  computer involved. Android is at parity in code and on an emulator.
- **Evidence:** founder device test 2026-09-03 — *The Titans of Slopsilonia* connected from a
  phone. iOS: 398 unit tests. Android: 21 new unit tests, APK installed on `medium_phone`.
  Mechanism proven on both platforms before the port
  (`HttpOnlyCookieSpikeTests.swift`, `HttpOnlyCookieSpikeTest.kt`).
  Commits `b2f348a` → `8e9ae4e`.
- **✅ "Zero emitted bytes" clause MET 2026-09-03, both platforms.**
  `OmenIOSTests/EspnEmittedBytesTests.swift` (6) and `EspnEmittedBytesTest.kt` (5) drive the real
  repository and view model through a full connect including a **provoked 500 and its retry**,
  then search every URL, header, bearer and body handed to the transport. **Each suite was itself
  verified by injecting a deliberate leak** (session appended to the directory read's query
  string): 5 of 6 failed on iOS, 4 of 5 on Android, each naming the offending request. Verified on
  both platforms rather than assuming the iOS result transfers — the seams differ.
  - ⚠️ **Deviation needing founder ratification:** the clause says "the **single** connect
    request"; there are now **two** authorized carriers, because `POST /api/platforms/espn/leagues`
    was added for discovery after the contract was written. The tests encode the amended version.
    See `omen-wave1-contract-v1.md` §W1-A Acceptance.
- **✅ Android verified against a real ESPN account, 2026-09-03.** Founder signed in with his own
  MyDisney/ESPN account on the `medium_phone` AVD and completed the flow. This was the last open
  clause.
- **Residual, stated rather than buried:** that pass was on an **emulator**, not physical Android
  hardware. The contract's iOS clause is explicit that "a simulator pass does not satisfy it"; the
  Android clause says only "reaches parity", which this meets. Nobody should later read VERIFIED as
  "proven on an Android handset" — it is not. A physical-device pass is cheap once one is at hand:
  the debug APK is at `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
- **Also still true:** `entryId` / `entry.name` remain unconfirmed in ESPN's own client bundle, so
  blank team names in the picker are the likeliest cosmetic surprise. The league id is verified.
- **Also open:** ESPN's `entryId` / `entry.name` are not confirmed in ESPN's own client bundle, so
  team names in the picker are the likeliest thing to come back blank. Cosmetic; the league id is
  verified.
- **Superseded blocker (kept for the record):** BLOCKED
- **Blocked by:** TASK-W1-REVIEW — do not spend Wave 1's largest build on an ESPN path Apple has
  never seen. See the sequencing note on `W1-REVIEW`.
- **Unblock:** 2026-08-31 CLEARED — `TASK-W1-GATE` CLOSED. The terms answer was negative and the
  founder accepted the risk explicitly; build proceeds under the constraints recorded in the Wave 1
  contract (no association-implying ESPN branding, consent screen, prepared App Review answer).
- **Priority:** P0 — the only confirmed beta failure on record
- **Cost:** medium
- **Agent-buildable:** yes, client-only
- **⚠️ SCOPE IS WRONG AS WRITTEN — corrected 2026-09-02, read before pulling.** "native web auth
  sheet ... → read the session" is not buildable: `ASWebAuthenticationSession` has no cookie API,
  and `ProviderAuthSession.swift` can only return a callback URL, a cancel, or a failure. The only
  in-app mechanism is `WKWebView` + `WKHTTPCookieStore`, i.e. **an embedded ESPN login**, which
  onboarding-connection contract §87 bans outright. That substitution is a founder decision, not an
  implementation choice. Full correction: `omen-wave1-contract-v1.md` §W1-A, 2026-09-02 addendum.
- **Feasibility is settled and was never the blocker.** `OmenIOSTests/HttpOnlyCookieSpikeTests.swift`
  (2026-09-02, iOS 26.5 sim) shows `WKHTTPCookieStore.allCookies()` returns a **server-set HttpOnly
  cookie in full**, control passing — disproving the inference in `2026-07-07-espn-ios-cookie-sync-
  research.md` §C that it would redact like the extension API. The 2026-08-15 real-iPhone finding
  that Safari *extensions* cannot read HttpOnly still stands; different API. **The blocker is
  permission, not mechanism**, so `W1-REVIEW` sequencing is unchanged.
- **Scope:** consent screen → ESPN sign-in surface (mechanism undecided per above) → read the
  session → existing league-selection step. **No new backend.** `POST /api/platforms/espn/connect`
  already accepts `{leagueId, espn_s2, swid, espnTeamId}`, validates through `verifyLeagueAccess()`,
  and stores Vault secret references. Omen renders no credential fields of its own at any point.
- **Prefer Candidate D if this is ever approved** (`2026-07-07` §D): inject a script into the
  logged-in web view, relay ESPN's JSON, never read the cookie at all. Strictly better on security —
  no cookie reaches Omen's server or Vault — and identical on App Review exposure, since a reviewer
  sees the same ESPN login either way.
- **Done when:** a founder-run **device** test connects a real ESPN league end-to-end on an iPhone
  with no computer involved; `espn_s2`/`SWID` appear in zero emitted bytes outside the single
  connect request, proved by provoking a real failure and searching the bytes; Android at parity.
- **Do not touch:** cookie values in logs, echoes, analytics, crash reports, or the W1-B payload.

### W2-Typography — Retire DM Mono across both native platforms

- **Status:** SUPERSEDED 2026-09-07 by the one-typeface founder decision, which retired DM Mono
  **and** the serif in the same pass. Its `Done when:` is met and exceeded: no mono family resolves
  anywhere on either platform, and `numeric` still renders tabular digits through
  `.monospacedDigit()` / the Android tabular feature, asserted by a test on each side. Its **Do not
  touch** held — column alignment never depended on the typeface. Awaiting a `Closure:` value.
- ~~**Status:** READY~~
- **Blocked by:** None
- **Priority:** P1 — design-system correctness; blocks nothing but touches every screen
- **Cost:** small
- **Agent-buildable:** yes
- **Scope:** remove `OmenFontDesign.dmMono` and repoint the `eyebrow`, `chip`, and `numeric` roles
  to Alegreya Sans in `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenTypography.swift`; same on
  Android; update the Matchup Spine type note. Roles keep their uppercase and tracking — that, not
  the typeface, is what distinguished them.
- **Done when:** no mono family resolves anywhere in either app; `numeric` still renders **tabular
  digits** through `.monospacedDigit()` and a standings column is screenshot-proved still aligned;
  registry §2.4 rows match the shipped roles.
- **Do not touch:** the tabular-digit behavior. Losing column alignment is the one way this change
  can go wrong, and reintroducing a mono family to fix it is explicitly prohibited
  (facts-of-record #21).

### W1-CONSENT — Plain consent line on the live ESPN connection

- **Status:** VERIFIED
- **Blocked by:** None
- **Priority:** P0 — ships in the build that goes to Beta App Review, so it lands before `W1-REVIEW`
- **Cost:** small
- **Agent-buildable:** yes
- **Scope:** add a plain-language line to the existing ESPN connect path (web and native entry
  points) stating that the connection uses the user's own ESPN session, that it is their account and
  their choice, and that it is removable at any time from Account. No ESPN branding, styling, or
  wording that implies association or endorsement (Disney ToU §2.B.vii) — a factual platform label
  only.
- **Done when:** the line renders on every ESPN connect entry point; no copy implies ESPN approves
  of or is aware of Omen; screenshot evidence at default and large font scale.
- **Do not touch:** the ESPN credential handling itself. This item is copy and disclosure only.
- **Evidence:** 2026-09-01 Claude. Native: `ConnectView.espnConsentNote`, shown on the ESPN branch
  of Connect. Web: `ESPN_CONSENT_NOTE` on the ESPN card in `ConnectLeague.jsx`; string confirmed
  present in the production bundle (`dist/assets/index-*.js`). Frontend build clean; iOS 318/318.
- **Not visually verified on web** — `/account/connect` is auth-gated and local Supabase is not
  configured, so the line is proved in source and in the built bundle but was not rendered. Worth a
  look on staging before submission.
- **Copy:** "Connecting ESPN uses your own ESPN session so Omen can read your league — your roster,
  scoring, and matchup. It is your account and your choice, and you can disconnect it any time in
  Account. Omen is not affiliated with or endorsed by ESPN."
- The affiliation sentence is load-bearing, not decorative: Disney ToU §2.B.vii bars use that
  suggests an association with their brands.
- **Duplicate resolved 2026-09-07.** This item existed twice in this file: a `READY` copy carrying the
  scope and a later `VERIFIED` copy carrying the evidence, appended 2026-09-01 without retiring the
  original. They are now one entry. The `READY` copy was the one the inbox selector could see, so the
  queue was advertising finished work as available — and `W1-REVIEW` read as blocked on a task that
  was already done.

### W1-DEMO-NAMES — Generic demo fixtures, so the app matches the reviewer notes

- **Status:** VERIFIED
- **Evidence:** 2026-09-01 Claude. iOS `OmenDecisionFixtures.demo` and Android
  `OmenDecisionScreen.kt` now read "Start Sample RB1" / "Bench Sample RB2" with team `Demo`.
  Confirmed rendered on an iPhone 17 simulator: no real player name or NFL abbreviation appears in
  demo mode. iOS 318/318 signed; Android `:app` 106/106. The `#if DEBUG` preview fixtures in
  `OmenDecisionBrief.swift`, `OmenPlayerRow.swift`, and `DesignSystemGalleryView.swift` still carry
  real names and were **deliberately left alone** — they are compiled out of release builds and are
  not what the reviewer notes describe.
- **Blocked by:** None
- **Priority:** P0 — blocks `W1-REVIEW`; the notes currently describe an app we do not ship
- **Cost:** small
- **Agent-buildable:** yes
- **Scope:** `omen-store-review-notes-v1.md` tells Apple that "Player names are generic ('Sample QB
  Starter') specifically so that demo output can never be mistaken for real fantasy advice."
  Verified on an iPhone 17 simulator 2026-09-01: the Omen destination's demo fixture shows
  **Christian McCaffrey**, **Ken Walker III**, and **SEA**. Swap every demo fixture — iOS
  `OmenDecisionFixtures`, the Android equivalent, and any web demo path — to generic names and
  non-NFL team labels.
- **Done when:** no real player name or NFL team abbreviation appears anywhere in demo mode on
  either platform; screenshot evidence per destination; the reviewer-notes claim is true as written.
- **Do not touch:** the demo labelling itself. "DEMO · Sample data — not live advice" and "MOCK ·
  Demo roster snapshot" render correctly and were verified on device.

### W1-TABBAR — Tab bar uses the Omen accent, not iOS system blue

- **Status:** VERIFIED
- **Evidence:** 2026-09-01 Claude. `.tint(OmenColor.accent)` on the `TabView` in
  `CommandCenterView`. Confirmed on simulator: the selected tab renders gold, not `#007AFF`.
  **Android needed no change** — its `NavigationBarItemDefaults.colors` already used
  `OmenTheme.color.accent`; only iOS had drifted.
- **Blocked by:** None
- **Priority:** P1 — ships in the review build; it is the most persistent chrome in the app
- **Cost:** small
- **Agent-buildable:** yes
- **Scope:** the `TabView` in `CommandCenterView` renders its selected item in iOS system blue
  (`#007AFF`), verified on simulator 2026-09-01, while every other element on the same screen uses
  `OmenColor.accent`. Tint the tab bar to the accent on both platforms.
- **Done when:** the selected tab renders in the Omen accent in light and dark mode, with AA
  contrast checked in both; screenshot evidence.

## X. Deferred — captured, not scheduled

Items with a captured intent and a recorded deferral. They are **in no batch** and must not be
auto-pulled. Each names what reopens it.

### X1-PlayerPhotoOmenOfWeek — Player photo on the This Week's Omen lead card

- **Status:** DEFERRED — build half only; see `X1-RESEARCH` above
- **Intent:** `Direction/intents/2026-09-05-player-photo-in-omen-of-the-week.md`
- **Decision:** `Direction/decision_log.md` 2026-09-05 (later)
- **Priority:** none while deferred
- **Cost:** unknown — not estimable until the research below lands
- **Agent-buildable:** the research is; the design is not, see the second gate
- **Scope:** show the recommended player's photo on the This Week's Omen lead card
  (visual briefs §4), and render the card exactly as today when no photo is available. The
  photo must follow the person across NFL team changes and fantasy add/drop/trade, and must
  not be re-fetched on the fantasy-state refresh cadence. **One surface, one photo** — every
  other surface is out of scope and §1.2 / §5.1 / §8.2 keep their existing prohibitions.
- **Blocked by:** RESEARCH — whether a free, lawfully usable NFL player photo source exists at
  Omen's commercial posture is **unanswered**. The intent is written on the founder's stated
  preference ("if we can avoid it"), not on a finding. Run `pre-build-research` before any spec.
- **Blocked by:** FOUNDER_APPROVAL — visual briefs §4.2's approved card anatomy has no photo
  element. A photo is not forbidden on this card, but it is not approved either. Amending §4 is
  a founder call.
- **Open question, founder:** for a player with no photo yet (a Tuesday rookie add who may have
  one by Friday), does a later view pick it up, or does the card stay photoless for the week?
- **Reopens when:** `X1-RESEARCH` answers the licensing question **and** the founder rules on the
  §4 amendment. Either answer landing alone is not enough to schedule this. **Queuing the research
  did not lift this gate** — the founder's 2026-09-05 instruction moved the research, not the build.
- **Done when:** deferred items have no done-when. See the intent's acceptance list, which
  survives this deferral unchanged.
- **Do not touch:** the headshot prohibitions in §1.2, §5.1, and §8.2. This item does not reopen
  them.

### X4-SkillReach — The Slops skills are documents, not skills the tooling can reach

- **Status:** VERIFIED — 2026-09-12. Delivery landed; recording and rollout follow.
- **Evidence:** `Slops-OS/Blueprints/tools/skill-link/link-skills.mjs` creates relative
  `.claude/skills/<name>` symlinks in both repos. `--check` reports 120 in-sync, 0 drift
  (L0: 59 skills; Omen: those 59 plus its 2 local). Registered in `SKILL_ROUTING.md`
  § "Reaching the library (skill-link)". Authorship unchanged — no second editable copy;
  the tool refuses to replace a real directory with a link. Targets are relative, so they
  survive any clone path (an absolute target is reported as drift). `truth-gate --check=registry-drift`
  PASS. Web-only scope is carried in each skill's own `description`, which is what routing reads;
  `slops-ui-ux-audit` was missing that guard and now has it.
- **Priority:** P2, but it compounds — every skill authored while this is true has the same
  reach problem the day it ships
- **Cost:** small
- **Agent-buildable:** yes
- **Source:** founder, 2026-09-11: "I seem to not use the skills as much here on Mac. Like, I
  feel like there's a disconnect there." There is, and it is mechanical rather than a habit
  problem.

**The finding.** There is **no `.claude/skills/` directory** — not in this repo, not in
`Slops-OS`, not in `~/.claude/`. The 65-entry library at `Slops-OS/Blueprints/skills/` is
**markdown documents in a sibling repository**. The harness's skill routing cannot see them,
so they never appear as invocable skills and are never suggested. The only skills actually
offered in a session here are third-party plugin skills.

So a Slops skill fires **only** when someone already knows its name, knows it exists, and goes
and reads the file. That is the disconnect. It is not that the founder forgets to use them —
the tooling has no way to offer them.

`slops-native-sim-drive` was used properly in the 2026-09-11 colour session for exactly one
reason: the session prompt named it explicitly. Nothing else would have surfaced it. The skill
was authored the same day, which makes the point sharper — a brand-new, well-written, `active`
skill was still invisible to the runtime an hour after it was written.

- **Scope:** make the L0 library reachable by the harness — installed or linked into a
  `.claude/skills/` location that skill routing actually reads — so they can be invoked by name
  and surfaced when relevant, without changing where they are authored.
- **Watch for:** authorship must stay in `Slops-OS/Blueprints/skills/` with
  `SKILL_ROUTING.md` authoritative. If the fix makes a second editable copy, the two drift and
  the library becomes worse than unreachable — it becomes wrong. A link or a build step, not a
  copy-paste.
- **Watch for:** three skills are web-app-only (`slops-ui-ux-audit`,
  `mobile-first-qa-playbook`, `slops-mobile-smoke`). Making them *easier* to reach on a native
  task is a regression, not a win — routing has to carry that distinction.
- **Done when:** a session in this repo can invoke a Slops skill by name without being told the
  path, and the founder stops having to remember the library exists.
- **Do not touch:** do not rewrite skills to suit the transport. This is a delivery problem.
