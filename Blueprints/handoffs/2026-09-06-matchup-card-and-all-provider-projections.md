# 2026-09-06 — The matchup card, and the PROJ column that only Yahoo could fill

**Runtime:** Claude Code. **Authority:** founder direction in session, which supersedes the
`agent_inbox.md` Wave 1 pin for this pull. **Read gate:** native mobile read gate applied before
any code (foundation, design house, delivery governance, onboarding contract, capabilities canvas,
delivery workflow).

## What the founder asked for

Looking at the Command Center on a real iPhone with two Yahoo leagues connected:

1. Make the matchup card more aesthetically pleasing — "the font isn't doing it for me, it looks
   weird", "the names of teams could look better", "add league pill should be verdigris green".
2. "The matchup doesn't produce projections for all leagues, only Yahoo."

Both are done, on **iOS and Android**, with the backend half serving every client.

## 1. The card

**The font finding was one defect wearing four hats.** `OmenTypography` splits three families by
role — sans for UI, **serif for long-form reading**, mono for numbers. The card was reaching for
`bodySmall`, the serif role, for four things that are not prose: the league name, the team record,
the "1 of 2" page count, and the rule caption. Four serif fragments scattered through a
sans-and-mono card is not a font choice, it is an absence of one. Each moved to the role it
belonged in. The families are unchanged.

**The two biggest numbers were outside the type system entirely.** On iOS the score and projection
were raw `.font(.system(size: 28))` literals, which resolve to the platform sans whatever family
the role owns — so the scoreboard would not have followed DM Mono in when the real font resources
land. `OmenTypeRoleSpec.at(size:weight:)` now derives a display size from an existing role,
carrying family, case, tracking and figure rule. **Android already did exactly this**
(`numeric.copy(size = 20.sp)`); iOS was the platform that had drifted, so this restores parity
rather than inventing a seam, and it adds no role to the registry §2.4 map of ten.

**Team names.** The record moved from beside the name to beneath it, and the numeric columns
narrowed 64/72 → 58/78 now that mono digits need less room. Both changes buy width for the name,
which was truncating to "Puk Around &…" on a 393pt phone. `minimumScaleFactor` and an explicit
tail truncation replace a hard clip.

**Your own row is now marked** — a 3pt accent bar on its leading edge. Both rows were styled
identically, so the only thing saying which team was yours was position (yours on top): a real
convention that is invisible, and the screen-reader label had a cue ("Your team") the sighted
reader did not. A bar, not a colour swap on the text, which would have cost contrast.

**The state stopped printing twice.** The eyebrow read `MATCHUP · NOT STARTED` and the rule three
lines below read `Not started`. With columns present the rule now carries no caption and stays a
hairline. Same for `LIVE` / "Live score".

**Verdigris marks actions; brass marks filters.** `OmenChipTone.omen` was doing both jobs, so
`+ Add League` and the `All` filter beside it rendered the same brass. The carousel's own source
already argued the distinction in prose — Add League was moved out of the filter row on 2026-09-04
because "the provider chips are a *filter* and this is an *action*" — but colour still said they
were one family. New `verdigris` tone, drawing a new `omenChip` token: `#3A9A70` dark, **not**
`omen`'s `#2F7D5B`, which is **3.96:1** on `bg` and fails AA at 11pt chip type. `#3A9A70` is the
same hue at **5.69:1**. Light is unchanged at `#1A5C3E` (7.94:1), which already cleared. Follows
the precedent `platformSleeperChip` / `platformEspnChip` already set.

`OmenContextStrip` got the same league-name correction on both platforms. It sits directly above
the matchup card, so leaving it in serif would have kept the effect visible in the next line.

## 2. Projections were never a Yahoo capability

`league-overview.v1` has always carried `matchup.*.projected`. Yahoo filled it; Sleeper and ESPN
hardwired `null`, **each above a comment explaining why the provider could not answer**:

- **Sleeper** — "Sleeper's matchup rows carry no projection." True, and beside the point: Sleeper
  publishes per-player projections and *this same adapter has fetched them since M11* for the
  roster and waiver paths. The matchup path never asked. Now summed from **starters** — never
  `players`, which would project the bench as if it played. `sleeperOverview` fetches projections
  as a third, independently-failing domain: a dead projections read costs the PROJ column, not the
  matchup.
- **ESPN** — "ESPN can carry projections in other views; this one does not." True of the *request*
  Omen was making, not of ESPN. The projections live in `mMatchupScore` and `fetchEspnMatchup`
  asked only for `mMatchup`. It now requests both, reads ESPN's own stated total, and falls back
  to summing starters via `projectedPointsForEspnPlayer` — which already existed, for the waiver
  pool.

**Both comments were accurate about the code and were read as facts about the provider.** That is
the lesson worth carrying: a comment saying "the provider does not give us X" should name the
*request* that was made, or it hardens into a capability claim nobody re-tests. The same paragraph
in `src/routes/league.js` had already generalised to "neither of which ESPN's `mMatchup` gives
us" — written the same week, retracted here and in `api-routes.md`.

**Absence still survives as absence.** Every path returns `null`, never `0`. `Number(null) === 0`
downstream is exactly what produced the 2026-09-05 `mvp-move` hang. Win probability remains
Yahoo-only and is deliberately not in the contract.

## An accessibility bug the new tests found

The new iOS cover asserted the card's a11y label mentions the projection. It failed: the pre-game
label read `scoreText`, which is an em dash before kickoff **by design**, so VoiceOver announced
"projected —" while the screen showed `100.7`. The number moved into its own field on 2026-09-04
and the label was never re-pointed at it. Fixed on both platforms, with a JVM cover on Android
(`MatchupHeroLabelTest`) so it needs no emulator.

## Evidence

| Suite | Result |
|---|---|
| Backend `npm test` | **1067/1067 pass** |
| iOS `-only-testing:OmenIOSTests` | **452 tests, 0 failures, 1 skipped** |
| iOS build | `BUILD SUCCEEDED` |
| Android `:core:designsystem:testDebugUnitTest` | 25 tests, **1 failure — pre-existing**, see below |
| Android `:app:compileDebugKotlin` + `:core:designsystem:compileDebugKotlin` | `BUILD SUCCESSFUL` |
| Driven on iPhone 17 Pro simulator, light **and** dark | `References/evidence/2026-09-06-matchup-card-and-projections/` |

New tests: 3 ESPN matchup-projection cases, 4 Sleeper, 2 iOS hero-column, 5 iOS typography
derivation, 2 iOS verdigris-token, 2 Android label, 1 Android verdigris-token.

## Honestly unverified, and open

- **The `+ Add League` chip was not captured on screen.** There is no `ScreenshotScenarios` key
  that renders `OmenLeagueCarousel` — the carousel is the multi-league real-data path and needs
  credentials — so the verdigris is proved by the contrast arithmetic, a token test on both
  platforms, and its addition to the design-system gallery, but not by a render. A founder glance
  on a real device with two leagues closes it.
- **The provider projections are proved against fixtures, not against live ESPN or Sleeper
  accounts.** The ESPN path in particular reads `mMatchupScore` fields chosen defensively (stated
  total, then starter sum, then `null`) because this session could not probe ESPN with real
  credentials. If ESPN's payload names the field differently in production the column will be
  absent — never wrong.
- **Android `PrimitiveEnforcementTest` fails on `main`** with five violations in `OmenAuthFlow.kt`
  and `ConnectScreen.kt`, neither touched here. Newly recorded in `known_issues.md`; it is the
  exact defect class the iOS scanner caught in the same two screens and that was fixed there on
  2026-09-05 by moving primitives into the design system rather than allowlisting. Do not
  allowlist.
- **The iOS UI-test target had 3 failures** (`HelpSupportAccessibilityUITests`, "Invalid target app"
  from the accessibility-audit harness). Environmental, unrelated to this change, and not
  investigated.
- **Nothing was deployed.** Deploys are founder-gated.
