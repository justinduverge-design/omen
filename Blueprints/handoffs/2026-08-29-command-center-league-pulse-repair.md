# 2026-08-29 — Command Center League Pulse repair + M1-Screen-Trade ratification

## What landed

Commit `8bc6181` on `feat/command-center-real-data`. Not merged, not deployed.

**The reported symptom was not slowness.** The founder reported "standings temporarily
unavailable takes forever to load" on Command Center. Nothing was loading. `leaguePulse(for:)`
derived League Pulse solely from `dashboard-summary.v1`'s tool status and returned `.unavailable`
for **every** `.ready` / `.pendingLiveEngine` user; that state was then rendered through
`OmenStateSurface(kind: .loading, …)`, which draws a `ProgressView`. A resting state wearing a
loading affordance, on every healthy league, spinning until the app was killed.

`loadContext()` had already fetched `league-standings.v1` for the context strip and was
discarding the rank, record, and team count League Pulse needed. The pulse is now derived from
that same payload — no additional request.

- `OmenLeaguePulseState` gains a real `.loading`. It is the only case that may spin, and it
  always resolves to `.available` or `.unavailable`.
- `.unavailable` renders as `.empty`. `OmenStateSurface`'s own doc comment forbids substituting
  one honest state for another; this was that substitution inside the system that forbids it.
- `cutLine` / `activity` are now optional and stay absent. `league-standings.v1` carries no
  playoff settings and no transaction feed, so neither can be stated without inventing one.
- Standings and Ledger follow-ups now run **concurrently**. They hit different routes and neither
  reads the other's result; in sequence the screen was three serial round trips deep, with the
  slowest (a live provider read) holding the Ledger behind it.

## Evidence

- iOS **281 passing / 0 failures** — `xcodebuild test -project mobile/ios/OmenIOS/OmenIOS.xcodeproj -scheme OmenIOS -destination 'platform=iOS Simulator,name=iPhone 16'`, Xcode 26.6 (17F113). SUBSTITUTED per `definition-of-done.md`.
- Android **58 unit tests / 0 failures** — `./gradlew :app:testDebugUnitTest --rerun-tasks`.
- **Not run:** Android connected instrumentation (needs a device), and no live provider call was
  made. The derivation is proven against fixtures shaped from the `league-standings.v1` contract,
  **not** against a real league. Per `m1-league-screen-data-plan-v1.md` §2.5 gate 5 that is not
  sufficient to claim the capability on a shipped screen — `M11A` still owns that proof.

## The test encoded the bug

`OmenCommandCenterScreenTests.testDisconnectedAndLoadingFixturesNeverInventLedgerOrStandingsData`
asserted `.empty` ledger and `.unavailable` pulse on the **loading** fixture — a screen whose shell
request is still in flight has established neither. It asserted the defect and passed. This is the
same fixture-shaped failure recorded for the Yahoo parsers in `known_issues.md` (2026-08-28): a
fixture written from the implementation tests that the implementation is itself. Corrected, and
both platforms now carry regression tests that keep `.loading` and `.unavailable` distinct.

## Authority changed this session

- **`M1-Screen-Trade` RATIFIED** by the founder. It was the one M1 item explicitly **not**
  pre-authorized. `M5` slice G is unblocked. Status moved `VERIFIED` → `CLOSED / COMPLETED`.
- **`M1-Screen-League` was already unblocked and the queue hid it.** Ratification was
  pre-authorized 2026-08-22 subject to evidence; the 2026-08-24 revision delivered it. Despite
  that, `current_sprint.md` still said "slice F stays blocked" in three places. **A pre-authorized
  gate whose condition is met is an open gate.** Corrected; status now `CLOSED / COMPLETED`.
- **Matchup Hero, League Pulse, and Waiver Watch authorized for real data.** This includes
  step 4 (transaction signals) of `m1-league-screen-data-plan-v1.md` §4, which that document
  scoped **out** of v1 as "a genuine new integration" needing its own §2.5 evidence pass. The
  founder was shown that sizing and chose it. It carries the highest slip risk in the queue.

## Still open — the screen-level finding

League Pulse was one of **three** Command Center sections that could not report a working league.
The other two are unfixed:

- **Matchup Hero** — `.beforeGames`, `.live`, `.final` are constructed only in fixtures and the
  design gallery. The one real-data path returns `.noMatchup` unconditionally
  (`DashboardSummary.swift:113`). The data exists: `fetchSleeperMatchups()`
  (`src/adapters/sleeper.js:357`) and ESPN's `mMatchup` view (`src/adapters/espn.js:633`) both run
  in production and are reduced to a single W/L letter by `normalizeLastResult()`. The opponent's
  name and both point totals are read and thrown away inside `lastResultFromMatchups()`.
- **Waiver Watch** — always `.availabilityUnknown` for a ready league.

**The generalisable lesson.** Each of these three sections is individually defensible; every one
renders a true statement. Together they meant a fully connected user on a healthy league was told
there is no matchup, that waiver availability needs confirming, and that standings are
unavailable. **Honest-state discipline was applied per section and never evaluated for the screen
as a whole**, and no test could catch it because every section behaved exactly as specified.

## Next

1. `GET /api/league/overview` (`league-overview.v1`) — steps 1–2 of the data plan. Unblocks
   Matchup Hero **and** slice F. Additive; `/api/league/standings` must not change.
2. `M5` slices F and G — both now unblocked.
3. Waiver transactions integration (step 4) — per provider, own evidence pass.
4. Two audits, founder-requested: one code, one UI/UX.
