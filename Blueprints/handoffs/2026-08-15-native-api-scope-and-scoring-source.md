# Handoff — 2026-08-15 — Native API scope, nflverse path repair, A5 memo

**Session type:** reconnaissance → scoping → one bounded repair → M5 slices A + B + C (iOS)
**Branch:** `fix/a5-nflverse-path-and-native-api-scope` → PR [#309](https://github.com/justinduverge-design/omen/pull/309). Pushed and open; **not merged, not deployed.**
**Backend suite:** **537/537 pass** (`npm test`, node `--test`, ~4.6s). Baseline at session start was 535/535.
**iOS suite:** **158/0** on Xcode 26.6 / iPhone 17 Pro simulator, against a 123/0 baseline. See the addenda at the end of this file.

---

## 1. What was asked

1. Assess how ready native mobile is to satisfy the Figma page contracts.
2. Assess how complete the league providers are — can Omen receive real data and give real advice, and is there any preseason data given nflverse's absence.
3. Then: scope the native API client, and make A5's outcome vendor-agnostic across Sleeper, ESPN, and Yahoo.

## 2. Findings

### 2.1 Native mobile — design is ahead of wiring

Against the eight low-fidelity flows and three golden pairs in `Blueprints/specs/mobile/m1-figma-screen-contract-pass-v1.md`:

- **Built both platforms:** Command Center, Omen lead / Start-Sit, Welcome/provider connection. Two of three golden pairs.
- **Partial:** Waiver Analysis (only the Command Center strip), team/league switcher (control exists, no sheet), Account → Connected Leagues (`M4-CC-PlatformsCompact` open).
- **Placeholder only:** Trade ("Trade is landing next"), League ("League is landing next").

**The finding that outranks the table: there is no product API layer in the native app.** `URLSession` / `dashboard/summary` greps across `mobile/ios` return only auth and account files. Both platforms state it in-source — `CommandCenterView.swift:23` selects `OmenCommandCenterFixtures.realDisconnected`; `OmenCommandCenterScreen.kt:426` reads "context sees `realDisconnected` until live wiring exists." A real signed-in user sees a permanently disconnected Command Center regardless of their actual backend connections.

This means several VERIFIED items are verified as *compositions* and still show invented state: `M4-CC-LedgerPreview`, `M4-CC-LeaguePulse`, `M4-CC-WaiverWatch`, `M4-Omen-Screen`. That is not a contradiction of their records — each was explicitly scoped to composition with wiring deferred — but the cumulative effect was not visible anywhere in the queue.

### 2.2 Providers — advice path healthy, scoring path was silently broken

- **Sleeper:** healthy. `state/nfl` → `{"season":"2026","season_type":"pre","week":1}`; player index 200/14.6 MB.
- **ESPN:** adapters merged (#265/#266), provider-proven 2026-08-02, public API serving 2026 preseason.
- **Yahoo:** serving nothing, correctly paused behind `YAHOO_ENABLED`. Entitlement-level 403s; founder re-applied 2026-08-13. No code fix exists.

**Separation worth recording:** advice runs on **provider projections** (`src/services/omen.js:1060`), not nflverse. nflverse feeds **only** Tuesday scoring — grading past recommendations. The founder's question assumed nflverse gated advice; it does not.

**Preseason data does exist** — `api.sleeper.app/v1/stats/nfl/pre/2026/1` returns 1,712 players, 329 individuals with real `pts_ppr`. nflverse never carries preseason at all (verified: `REG` 1–18, `POST` 19–22, no `PRE`).

### 2.3 The silent-failure bug

`src/omen_tuesday_cron.js` fetched the **retired** `player_stats` release tag, which stopped receiving seasons after **2024** — 404 for 2025 as well as 2026. Combined with PR #302's correct 404-deferral, Tuesday scoring would have deferred every move all season while reporting `failed=0`, no error, no alert.

## 3. What changed

### Code — `src/omen_tuesday_cron.js`

- `NFLVERSE_BASE_URL` → `.../releases/download/stats_player`; filename via `nflverseStatsFileName()` → `stats_player_week_<season>.csv`
- `season_type` added to required columns and filtered to `REG` by default (`DEFAULT_SEASON_TYPE`), threaded through `fetchNFLScores`
- Deferral reason message now names the correct file

Required rather than optional-when-present so upstream schema drift fails closed. `REG` filtering matters because nflverse never ships `PRE` but Sleeper does — preseason week N would otherwise collide with regular week N.

### Tests — `test/omenTuesdayCronNflverse.test.js` (+2 net)

- URL-shape assertion rewritten to the new path, **plus a negative guard** asserting the URL no longer contains `/player_stats/`
- New: PRE/REG same-week collision test (both directions)
- New: fail-closed test for a schema missing `season_type`
- Existing fixtures updated to carry `season_type`

### Docs

- `Direction/current_sprint.md` — new `M5-Native-API-Client` (P0, M lane, 7 slices with beta-minimum called out); new `A5-NflversePath` (VERIFIED); new `A6-MovesScoringFormat` (READY, founder-gated); A5 updated with the corrected premise, the vendor-agnostic clarification, and the memo pointer
- `Direction/reviews/2026-08-15-a5-scoring-source-options.md` — the A5 options memo
- `Direction/known_issues.md` — retired-path entry, PPR-grading defect
- `Direction/decision_log.md` — 2026-08-15 entry

## 4. Evidence

- Full backend suite **537/537**, 0 fail
- Corrected URL proven live: `stats_player_week_2025.csv` downloaded, 8.6 MB, `REG` 18,540 rows / `POST` 882, required columns present
- Old path proven dead: 404 for both 2025 and 2026
- Live probes: Sleeper `state`/`stats`/`projections`, ESPN scoreboard, nflverse release index

## 5. Boundaries honored

No backend contract changed. No provider account, credential, or cookie accessed. No SQL authored or applied. No schema, dependency, deploy config, or production flag touched — `OMEN_CRON_SCORING_ENABLED` stays false and A4 is unaffected. No Figma write. Nothing pushed, merged, or deployed.

`A6-MovesScoringFormat` was deliberately **not** fixed in-session: it requires a `moves` column, and per facts-of-record #8 an agent authors schema SQL as review-only source and never applies it.

## 6. Open, needing the founder

1. **A5 decision** — approve the `ScoreSource` interface with ordered fallback; accept or reject Sleeper as secondary given its undocumented-API/no-published-licence status; confirm the fork is post-beta. Trigger date 2026-09-01.
2. **`A6-MovesScoringFormat`** — schema change approval.
3. **`M5-Native-API-Client`** — ready to pull, no gates. Slices A–D are the beta-minimum.

## 7. Skills

`slops-quality-baseline` (suite + evidence discipline) used. `pre-build-research` substituted with direct live endpoint probing — for a source-availability question, probing the actual endpoints is stronger evidence than a literature pass, and the memo records raw results rather than summaries. `slops-git-flow` / `slops-ship` N/A — nothing pushed. `slops-data-ingest-plan` partially applied: the memo covers source evaluation but stops short of a pipeline design, which waits on the founder's pick.

**Skill improvement:** the recurring failure in this repo is queue items whose *premise* silently expires — A5 was written against a file that never existed under that name, and three inbox items described merged work as pullable. A research skill should verify the premise of an item before researching its question. That check cost one HTTP call and changed the entire shape of the answer.

---

# Addendum — M5-Native-API-Client slices A + B, iOS (same day)

**Branch:** `fix/a5-nflverse-path-and-native-api-scope`. Backend PR [#309](https://github.com/justinduverge-design/omen/pull/309) carries the scoring/doc half.

## Result

**Xcode 26.6 (`17F113`), iPhone 17 Pro simulator: 145 tests / 0 failures.** Baseline on the same machine, measured by stashing this branch, was **123 / 0** — so +22 tests, no regressions. The primitive-enforcement scanner is inside that count.

## What shipped

- **Slice A — transport.** `App/Api/OmenApiClient.swift`: base URL from `AppEnvironment`, bearer injection, typed `OmenApiError` (`network` / `unauthorized` / `server(status:)` / `decode`), `OmenHTTPFetching` seam so tests need no `URLProtocol` stub. `Result`-returning rather than throwing, because every call site must render an honest failure surface.
- **Slice B — shell truth.** `DashboardSummary.swift` decodes `dashboard-summary.v1`; `DashboardRepository.swift` is the repository seam plus a stub; `CommandCenterViewModel.swift` owns loading/loaded/failed/demo. `AppShellView` constructs the repository; `CommandCenterView` renders it.

## Design decisions worth carrying to Android

1. **The contract carries no league name, team name, or matchup.** The mapping renders honest absence — context strip stays `.empty` — rather than inventing a label. The missing display-name fields are a backend ask, not something to paper over in the client. A test asserts this so a later "helpful" change can't quietly fabricate a league name.
2. **A ready waiver tool does not mean an empty opportunity list.** `.calm([])` would read as "Omen looked and found nothing." The mapping uses `.availabilityUnknown`, which is what is actually true from this contract.
3. **A failed read never falls back to the disconnected fixture.** It renders an explicit error surface with a retry. Falling back would state as fact that the user has no leagues — the exact mock/live confusion facts-of-record #7 forbids.
4. **Unknown tool statuses degrade to `.unknown`, not a decode failure.** This contract has grown before and will again; an unrecognized status must not black out a Command Center.
5. **Demo never touches the network** and is asserted by a test with a repository that fails if called.
6. **Season comes from the Omen status, not the waiver status.** `buildWaiverTool()` has no off-season branch — the gate lives on `omen_of_the_week` via `isOffSeason()`. Without the override a connected user is told to watch waivers in August. A test caught this during the build; the mapping was fixed rather than the test.

## Two build-mechanics notes for the next session

- The Xcode target's module name is **`Omen`**, not `OmenIOS` — `@testable import Omen`. The directory, project, and scheme are all `OmenIOS`, so this is easy to get wrong and produces a confusing "unable to resolve module dependency" that names only the new files.
- `project.pbxproj` has no file-system-synchronized groups, so new files need manual `PBXBuildFile` / `PBXFileReference` / group / Sources-phase registration. Two traps hit here: nested groups use **relative** `path` (`Api`, not `App/Api`), and the hand-assigned ID space already uses the `E1` prefix for `Assets.xcassets` / `Omen.icon` — collisions silently reroute a file to the wrong path. Check a prefix is free before using it.

## Not done

**Android slices A + B.** Same two slices, `OkHttp`-based, with `:app:assembleDebug`, connected tests, and the primitive scanner as evidence. `M5-Native-API-Client` stays `IN_PROGRESS`; it must not be recorded VERIFIED on the iOS half. Slices C–G are untouched.

---

# Addendum 2 — M5 slice C, iOS: real league identity on the Command Center

**Result: 158 tests / 0 failures** (Xcode 26.6, iPhone 17 Pro simulator). Baseline 123/0; slices A+B+C together add 35 tests.

## The correction that made this cheap

Addendum 1 recorded the missing league/team display names as a **backend ask**. That was wrong, and the correction is worth keeping because it changed the plan from "extend a contract" to "compose two existing ones."

`GET /api/league/standings` → `league-standings.v1` already carries everything the context strip needs, for **all three providers**:

- `league_name` on the envelope — `src/routes/league.js:98`
- `team_name` and **`is_current_user`** per row — `adapters/sleeper.js:312`, `adapters/espn.js`, `services/yahoo.js` each set the flag

So no backend change, no new contract, and no crossing of the backend ownership boundary. Slice C became a client composition of two shipped routes.

## Progressive fill — required, not stylistic

The two routes have different cost and failure profiles, and conflating them would have been the real mistake:

| | `dashboard-summary.v1` | `league-standings.v1` |
|---|---|---|
| Reads | our own Supabase rows | **live provider API** |
| Speed | fast | provider-dependent |
| Off-season | returns tool gates | returns `200` with `standings: []` |
| Failure | fails the shell | must **not** fail the shell |

Shape implemented: summary lands → screen is fully usable with honest states. Then, **only when the shell says a provider is actually connected**, standings is fetched and the context strip upgrades in place. Every standings failure path is silent to the user.

## What the tests lock down

1. Context fills only with a **verified** identity — real platform, non-empty league name, and a team the provider marked `is_current_user`. Any partial answer yields no strip rather than a placeholder next to a real value.
2. A missing `is_current_user` flag means "not known to be mine", never "mine" — otherwise the league leader would be silently claimed as the user's team.
3. An unrecognized provider string yields no platform mark and no strip, rather than a guess that would badge a league with the wrong provider.
4. A standings failure leaves the shell **loaded** and the strip empty — `viewModel.failure` stays nil.
5. A disconnected user never issues the standings call at all (asserted with a counting repository).
6. Off-season empty standings produces no strip.

## Not done

**Android A + B + C parity.** `M5-Native-API-Client` stays `IN_PROGRESS`. Slices D–G untouched.

The Android mapping must reproduce two non-obvious behaviors found on the iOS side: the season override (waiver state comes from the Omen status, because `buildWaiverTool()` has no off-season branch) and the progressive-fill gating (no standings call for a disconnected user).
