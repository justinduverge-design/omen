# 2026-09-07 — Reading ESPN's real client, and the Android primitives hiding three bugs

**Runtime:** Claude Code. **Authority:** founder direction in session. **Continues:**
`2026-09-06-matchup-card-and-all-provider-projections.md`, two of whose three open items this
closes.

Founder: "let's get you to read real ESPN code so that you can do mMatchupScore right" and
"Android gotta get fixed".

## 1. ESPN — the bundle read, and what it corrected

ESPN's production client is public and unauthenticated (`cdn1.espn.net/kona/<build>/_next/…`),
the same source `normalizeFanGroupId` has cited since 2026-09-03. Four questions, one wrong
answer:

| Question | 2026-09-06 assumption | What ESPN's code says |
|---|---|---|
| Which views? | `["mMatchup","mMatchupScore"]` | ✅ ESPN's own matchup fetch, verbatim |
| `totalProjectedPointsLive`? | read it first, off the response | ❌ **client-computed**, assigned onto the model — not on a response. The server field is `totalProjectedPoints` |
| Starter sum? | a fallback | ❌ it is ESPN's **headline** number; the header renders it |
| `statSourceId: 1`? | Projected | ✅ per ESPN's `statSettings.sources` |

The read order is now ESPN's display order: **sum the starters when a roster is present, fall
back to the stated `totalProjectedPoints` when it is not.** The 2026-09-06 code had it backwards
and led with a field that does not exist.

**Starters are now ESPN's question, not Omen's.** ESPN ships a 26-row football `lineupSlots`
table with an explicit `starter` boolean and tests `lineupSlotsMap[lineupSlotId].starter`.
Exactly four rows are `starter: false` — **20 BE, 21 IR, 22 INV, 25 ALL**. Omen tested
`slot !== "BN" && slot !== "IR"` against `LINEUP_SLOT_MAP`, which names ten of twenty-six slots
and answers `"UNK"` for the rest — so INV and ALL counted as starters, and every IDP slot fell
through unnamed. `ESPN_NON_STARTER_SLOT_IDS` is a set of ids now, and `isEspnStarterSlot`
replaced the abbreviation test in `normalizePlayer` as well. The transcribed table is committed:
`References/evidence/2026-09-07-…/espn-lineup-slots-from-production-bundle.json`.

**`Number(null) === 0` bit for the third time, and a test caught it.** The first
`isEspnStarterSlot` guarded with `Number.isFinite(Number(slotId))` — and `Number(null)` is `0`,
which is **slot 0, QB**. An entry with no slot would have been summed as your quarterback. The
guard now rejects `null`/`undefined`/`""` before coercing.

**No hardcoded `statSplitTypeId`**, deliberately: ESPN resolves it by lookup
(`find(splitTypes, {gameSplit: true})`) because it is not stable across its sports, and
`scoringPeriodId === week` already excludes the season-long row.

**What the bundle could not settle is now yours to run.** `scripts/espn-projection-proof.sh`
asks a real league the four remaining questions and prints **field names, types and counts only**
— never a point value, team, or player. Credentials stay in your terminal, same pattern as the
existing `espn-shape-proof.sh`:

```
export ESPN_S2='…' SWID='{…}' ESPN_LEAGUE_ID='…' ESPN_WEEK=1
./scripts/espn-projection-proof.sh
```

## 2. Android — the enforcement failure was hiding three rendering bugs

Five violations in `OmenAuthFlow.kt` and `ConnectScreen.kt`. **The allowlist stayed empty**, per
the iOS precedent. `OmenAuthPrimaryButton`, `OmenAuthTile` and `OmenCanvasTextAction` moved into
`:core:designsystem/component/OmenAuthPrimitives.kt`, mirroring the iOS files.

**`CanvasTextAction` existed twice, privately, and had already drifted** — Auth's took
`color`/`fontWeight`/`height`; Connect's hardcoded them and used a different disabled colour.
Character-for-character the divergence the iOS merge found in the same two screens. Resolved to
Auth's value, the way iOS resolved it, so the platforms do not re-diverge at the point of union.

**The hex literals were the sharper half, and removing them is what exposed the bugs.**
`Color(0xFF0A0A0B)` forced both screens dark regardless of device theme — which is *why* nobody
had seen what was underneath:

1. Connect's provider cards were near-black tiles carrying dark text on a light page → `surface1`.
2. The **email glyph** bakes in cream `#F5F0E8` and sat on a now-white tile → tinted with
   `textPrimary`. Discord and Google keep `Color.Unspecified`: brand marks are never tinted.
3. **The same glyph bug exists on iOS, in two places** — found by looking, not assumed:
   `AuthEmail` (cream on white) and `AuthApple` (`#0A0A0B` on a `textPrimary` button that is
   near-black in light mode: a black glyph on a black button). Both fixed via a `tintsIcon` flag
   on `OmenAuthPrimaryButton` / `OmenAuthIconTile`.

## 3. Follow-up pass — the same bug class, swept

Added after the first pass, on founder direction to finish Android and ESPN.

**Two more instances of the ESPN starter-slot bug, both feeding the trade optimizer.** The
2026-09-06 fix corrected `normalizePlayer` and the matchup sum; it did not correct the two other
places that re-derived "is this a starter" from the abbreviation:

- `rosterFromEspnData` bucketed with `else slots.starters.push(...)` — a **catch-all**. Any slot
  `LINEUP_SLOT_MAP` did not name fell into starters, so an ESPN Invalid Player (22) or the ALL
  pseudo-slot (25) reached the lineup optimizer as part of the user's starting lineup. Now
  buckets on `is_starter`, which is correct by construction.
- `tradeLineup.lineupEligible` excluded only `IR` and `TAXI`. `INV`/`ALL` normalized to `"UNK"`,
  passed, and could be **offered by the optimizer as a start/sit or trade improvement**. Now a
  named `LINEUP_INELIGIBLE_SLOTS` set. `BN` is deliberately absent — moving a benched player into
  the lineup is the entire point of the solver, and adding it would silently disable start/sit.
  There is a test pinning exactly that, because it is the obvious wrong "fix".

Slots 22 and 25 are also named in `LINEUP_SLOT_MAP` now (`INV`, `ALL`) instead of answering
`"UNK"`, so the shared normalized vocabulary can express them at all.

**`espn-projection-proof.sh` was smoke-tested before being handed over**, since a script that
dies on first run wastes the founder's minute. Its Python was run against synthetic payloads for:
a populated week, an empty schedule (off-season/bye), a missing `schedule` key, a side with no
roster, a roster with zero entries, entries missing `lineupSlotId`, and an HTML error body. All
exit cleanly. The last one previously printed only `Expecting value: line 1 column 1`, which says
nothing useful; it now names the four real causes, expired cookies first.

**Android theme sweep.** The scanner's regex only catches `Color(0xNNNNNNNN)`. Swept for what it
misses — `Color.White`/`Color.Black`/named literals, six-digit `Color(0x…)`,
`MaterialTheme.colorScheme` escapes — and `app/src/main/kotlin` is clean. One real defect turned
up in the drawables: the **back chevron at 2.12:1 in light mode**, under the 3:1 floor for a
control. Fixed by tinting with `textSecondary`, whose dark value *is* the asset's baked
`#AEAEB2`, so dark is unchanged. Verified at the pixel rather than by eye:

| capture | chevron pixel |
|---|---|
| light, before | `(174,174,178)` = `#AEAEB2` — 2.12:1 |
| light, after | `(107,114,128)` = `#6B7280` — 4.63:1 |
| dark, before → after | `(174,174,178)` → `(174,174,178)` — identical |

The **email-code screen** was also captured in light for the first time. Its code boxes were part
of the `Color(0xFF141416)` fix and had never been looked at: empty boxes now render `surface1`
white with a border instead of near-black on cream.

## 4. On a real device — what the founder saw, and what it proved

The build went onto the founder's iPhone (direct install, Apple Development cert, build 5 reused —
no TestFlight, no beta testers). Reading three real leagues settled things no fixture could:

- **Yahoo: projections present, card reads well.** The typography, columns, accent bar and
  verdigris pill all shipped, because they are in the binary.
- **ESPN and Sleeper: still no projections.** *Not* a failure of the adapter work — the
  projections fix is **backend** code that is still uncommitted, and the app talks to
  `slopssaloon.com`, which was running `c814312` with ~20h uptime. Production still hardwires
  `projected: null` for both providers. The ESPN card correctly fell back to the single-number
  layout, which is what the hero does when neither side has a projection.
- **A Sleeper league showed no matchup** — correct (it had not drafted), reported through copy
  that made the founder deduce the reason. Written up in `known_issues.md`.
- **Long team names still truncated**, even after the column widths were narrowed. Fixed: the name
  now wraps to **two lines** on both platforms. A single line has to share the row with two
  numeric columns no matter how much the columns give back, so wrapping was the only thing that
  actually bought room. `lineLimit(2)` / `maxLines = 2` wrap only when needed, so short names are
  unchanged. Verified by temporarily pointing the demo fixture at the founder's real team name,
  screenshotting the wrap, and reverting the fixture.

**The deploy/binary split is the thing to carry:** app-side changes reached the phone the moment
it was installed; every provider-data change needs a deploy, and saying "shipped" without naming
which half is what made this look like a failed fix rather than an undeployed one.

## 5. Proved against real leagues — and one bundle-read conclusion was wrong

The founder pushed back on being asked to hand-extract ESPN cookies to test his own product, and
he was right: the repo already holds those credentials and the app already knows how to read them.
`scripts/espn-projection-live-proof.js` runs the **fixed code path** over every connected ESPN
league using `getAuthenticatedEspnCredentials` — the same call `espnOverview` makes in production —
so no operator ever handles a cookie. It prints field presence, types, counts and the derived
projection, never a credential.

**Result — the fix works end to end on real data:**

| Provider | League | `you.projected` | `opponent.projected` |
|---|---|---|---|
| ESPN | `1330728110` | **100.91** | 113.63 |
| ESPN | `13338821` | **128.04** | 126.34 |
| Sleeper | `1311998161723600896` | **125.71** | 126.22 |
| Sleeper | `1387633793615036416` | **130.47** | 140.95 |

Field-level answers, all four questions settled:

- `totalProjectedPoints` → **number**, present.
- `rosterForCurrentScoringPeriod` → **16 entries**, present.
- Starter filter → **9 starters from 16 entries**, all nine carrying a week-1 projected row. The
  ESPN slot table is doing exactly its job.
- `statSplitTypeId` → **1** on every row, confirming the decision not to hardcode it was harmless.

**One claim from the bundle read was wrong, and is corrected in the source.** Reading ESPN's
client, I concluded that because the boxscore chunk *computes* `totalProjectedPointsLive` and
assigns it onto the model, the field would be **absent** on a response. It is not — a live league
returns it as a number and the client's sum overwrites it. The ordering in `espnMatchupProjected`
is unchanged and still correct (it mirrors what ESPN *displays*), but the comment justifying it
overstated what the bundle proved. Reading a client tells you what it does with a payload; only
the payload tells you what is in it.

**A data problem surfaced too:** one ESPN connection row carries no `espn_team_id` and correctly
returns `team_unknown` / `null`. Recorded in `known_issues.md` — it is data, not code.

## Evidence

| Suite | Result |
|---|---|
| Backend `npm test` | **1074/1074 pass** |
| iOS `-only-testing:OmenIOSTests` | **452 tests, 0 failures, 1 skipped** |
| iOS build | `BUILD SUCCEEDED` |
| Android `:core:designsystem:testDebugUnitTest` + `:app:testDebugUnitTest` | **BUILD SUCCESSFUL — `PrimitiveEnforcementTest` now green** |
| Android `:app:assembleDebug` | `BUILD SUCCESSFUL` |
| Driven on the `medium_phone` emulator, light **and** dark | evidence folder below |
| Driven on iPhone 17 Pro simulator, light | evidence folder below |
| Installed and launched on the founder's **physical iPhone 15** | `devicectl` — signed, team 6RWR5G9894 |
| Android primitive scanner re-run gate | violation injected in `app/` → FAILED; reverted → SUCCESSFUL |

`References/evidence/2026-09-07-espn-projections-and-android-primitives/`

New ESPN tests: stated-total fallback, starter sum winning over stated total, ESPN's own starter
slots (incl. IDP, INV, ALL), the no-slot guard, absence-not-zero, roster-present-but-unprojected,
`rosterForMatchupPeriod`, INV/ALL bucketed as bench rather than starters, ineligible-slot players
never started, and a benched player still being lineup-eligible.

## Still open

- **The `+ Add League` verdigris pill still has no screen capture.** Unchanged from yesterday:
  no `ScreenshotScenarios` key renders `OmenLeagueCarousel`, because it is the multi-league
  real-data path. Founder will confirm on the next device build.
- **The ESPN projection path is still fixture-proved, not account-proved.** The bundle read
  settled the field *names* and the algorithm; only a real league settles whether
  `totalProjectedPoints` and `rosterForCurrentScoringPeriod` actually arrive.
  `espn-projection-proof.sh` is the one-minute answer and needs the founder's cookies.
- **iOS `CanvasChevronLeft` has the Android chevron's bug** — same `#AEAEB2` literal, same 2.12:1
  in light, same back-navigation control. Deliberately left to keep this pass inside the stated
  Android + ESPN scope. `OmenIconButton` already applies a `tone` to the glyph and *cannot* take
  effect, because the icon is not template-rendered; the fix and the safety check (it is the only
  asset image passed to that primitive) are written up in `known_issues.md`.
- **The stacked Omen lockup is a dark-only asset on both platforms** and renders as a black
  rectangle on a light page. Deliberately not fixed — it is a brand decision, and the obvious fix
  is wrong (the wordmark is cream, so a transparent lockup disappears on white). Two options
  recorded in `known_issues.md`; needs a founder call.
- **Nothing was deployed.** Deploys are founder-gated.
