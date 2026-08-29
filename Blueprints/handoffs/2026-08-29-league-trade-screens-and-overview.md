# 2026-08-29 — `league-overview.v1`, League + Trade screens (iOS), Command Center repair

Branch `feat/command-center-real-data`. **Not merged, not deployed.**

Commits: `8bc6181` (League Pulse), `c30f6d5` (docs), `a49c35d` (overview route),
`6e9c58f` (Matchup Hero), `d4a77cd` (League screen), `1650e57` (Trade screen).

## Founder direction this session

> "Build a solid foundation… anticipate the code we have to build. Make it suffice for a
> second, queue the nitty gritty work to be done well with a fresh context window. Then we
> finish waivers."

So: build the seam now, fill it later. That is what `activity.unavailable_families` is.

## What is done

**Backend — `GET /api/league/overview` → `league-overview.v1`.** Additive; `/standings` is
untouched because the Command Center context strip consumes it.

- Both providers already fetched the full matchup and discarded it.
  `lastResultFromMatchups()` and `lastResultFromEspnSchedule()` each resolved the opponent and
  both point totals, returned one `"W"`/`"L"` letter, and dropped the rest.
  `matchupFromMatchups()` / `matchupFromEspnSchedule()` keep it. **No new provider requests** —
  team names come from the standings rows the caller already has.
- **Sections fail independently.** A dead matchup read returns `matchup.status: "unavailable"`
  beside live standings.
- **The waiver seam is built:** `activity.status: "empty"` with
  `unavailable_families: ["transactions"]`. Step 4 fills `items` and flips `status`. **No
  contract change and no client change will be needed.**
- `playoff_picture` carries current position only. `cut_line_note` null, `settings_known`
  false — no path reads playoff settings yet. No probability, no clinch/elimination (§2.1).

**iOS — three sections that could not report a working league now can.**

- **League Pulse** — was hardwired `.unavailable` and drawn with `kind: .loading`, so it spun
  forever on every healthy league. Now derived from real standings; `.loading` is a real state
  that always resolves.
- **Matchup Hero** — `.beforeGames` / `.live` / `.final` existed for months with no real-data
  path; the only production path returned `.noMatchup` unconditionally. Now wired.
- **Waiver Watch** — still `.availabilityUnknown`. **Unchanged and deliberately so.**

**iOS — both pages built.** `M5` slice F (League) and slice G (Trade) replace their
placeholders. Trade personalization is wired against the same `league-overview.v1` read the
League screen uses, so the two cannot disagree about which league the user is in.

The Command Center also now issues **one** overview call where it previously made a standings
call and a ledger call in sequence — and those two now run concurrently.

## Evidence

- Backend **901/901** (`npm test`), up from 890.
- iOS **302 passing / 0 failures** — `xcodebuild test … -destination 'platform=iOS Simulator,name=iPhone 16'`, Xcode 26.6 (17F113). SUBSTITUTED per `definition-of-done.md`.
- Android **58 unit tests / 0 failures** at the League Pulse commit. **Android has NOT been
  touched since**; see below.

**Not proven against a real league.** Every provider path here is fixture-proven only. No live
call was made this session. `m1-league-screen-data-plan-v1.md` §2.5 gate 5 still requires
per-provider live proof before these capabilities are claimed on a shipped screen — `M11A`
owns it, and it is a **release blocker for these screens**, not a nicety. The ⚠️ rows in §1 of
that plan (ESPN projection shape, deadline field for both providers) remain unverified.

## What is NOT done — pick up here

**1. Android parity — the largest gap, and a shipping requirement.** "Both platforms ship the
beta together" is a founder decision. Android currently has only the League Pulse repair.
Needed, mirroring the iOS files one-for-one:

| iOS file | Android mirror needed |
|---|---|
| `App/Api/LeagueOverview.swift` | `feature/api/LeagueOverview.kt` |
| `App/Api/LeagueViewModel.swift` | `feature/api/LeagueViewModel.kt` |
| `App/CommandCenter/OmenLeagueScreen.swift` | `feature/commandcenter/OmenLeagueScreen.kt` |
| `App/Api/TradeCompare.swift` | `feature/api/TradeCompare.kt` |
| `App/Api/TradeViewModel.swift` | `feature/api/TradeViewModel.kt` |
| `App/CommandCenter/OmenTradeScreen.swift` | `feature/commandcenter/OmenTradeScreen.kt` |
| `fetchOverview` on `LeagueRepository` | same on the Kotlin repository |
| optional-token POST on `OmenApiClient` | same on the Kotlin client |

Android's `LeagueStandings.Team` gained `wins`/`losses` this session; the parser reads them.

**2. Waivers — the deferred integration.** Step 4 of the data plan: per-provider transaction
reads for Sleeper and ESPN, each needing its own §2.5 evidence pass. **The contract slot is
already built, so this does not touch `league-overview.v1` or either screen.** Waiver Watch on
Command Center is still hardwired to `.availabilityUnknown` and should be finished — or hidden
— as part of that work, not before.

**3. Two audits, founder-requested:** one code, one UI/UX. Note for the UI/UX pass: the iOS
suite already carries `XCTExpectFailure` on **pre-existing Command Center contrast and
app-wide Dynamic Type findings**. Those are live audit findings, not new regressions, and
`M12-BrandFonts` is sequenced before the accessibility pass on purpose — running it on system
fallbacks means running it twice.

## Two test-shape findings worth keeping

1. **`realLoading` asserted `.empty` ledger and `.unavailable` pulse** — on a screen whose
   shell request was still in flight. It asserted the defect and passed green. Same shape as
   the Yahoo fixture failure of 2026-08-28: a fixture written from the implementation tests
   only that the implementation is itself.
2. **`testLeaguePlaceholderUsesTheApprovedCopy` pinned placeholder copy by value.** Once the
   real screen shipped, that assertion could only ever prove the screen had *not* shipped.
   Replaced with the invariant R7 actually cares about — no Draft entry on the League
   destination — plus a check that the real screen is mounted, so a blank tab cannot pass.
   **A test that pins a placeholder is a test with an expiry date, and nothing marks it.**
