# Build 12

## Status

Backend shipped to production between 2026-10-15 and 2026-10-17. The app release is open: screen work, the
paired-iPhone walk and the TestFlight upload are still to do. Baseline before this build: Build 11
(2026-10-12, ESPN first-login repair).

## Goal

Omen uses everything the league connections give it, trades are fair both ways, and decisions rest on
Omen's own read (Sight), not on one provider number.

## What was wrong

- **Trades:** offers were lopsided ("+0.0 for them", Lamar for a WR). The other side's gain was never
  checked, and trade-locked players were offered (founder screenshots).
- **ESPN and Yahoo lineup slots:** never read, so FLEX and SUPERFLEX were guessed (live probe).
- **Yahoo projections:** covered 47 of 186 rostered players. The free-agent list stopped at 25 (live probe).
- **League page:** said it could not read other managers (founder screenshot).
- **Waivers:**
  - Suggested dropping an RB for a TE, because slot names were read as positions (founder screenshot).
  - Treated a 0.0 projection or a bye as a reason to drop.
- **Signals:** weather, scheme and matchup were display-only, and only injury changed a pick (audit).
- **Expired logins:** dead ESPN and Yahoo logins stayed stored on our servers.
- **Ledger:** grading used a fixed baseline instead of the player Omen passed over, and not the league's own
  scoring. Easy calls inflated the hit rate. Trades were judged on one week.
- **Player index:** most Sleeper and Yahoo players had no link to the warehouse. Only 78 of the 305 players
  Sight rated were reachable from Sleeper or Yahoo.

## What we fixed

**League connections**
- ESPN and Yahoo lineup slots are read, as are ESPN lock flags and teams. Yahoo projections now cover 157 of
  186 players, the waiver pool is paged, and unreadable teams are named (#670 and follow-ups).
- Locked players are never swapped, displaced or dropped: ESPN lineup and roster locks, and Yahoo
  `is_editable` (#701).
- Credential health: every 6 hours a refused login is deleted from Vault, and the connection is marked
  needs-reconnect with the league kept (step 17, #698).
- ESPN free agents carry their NFL team and ownership trend (#704).

**Trades**
- Two-sided fairness guard: both sides gain at least 0.5 in their lineup, and value loss is bounded (#670).
- Flex rules match the league (W/R/T, W/R, W/T, SUPERFLEX). Trade-locked players are skipped (#670).

**Start/Sit and Waivers**
- Sight is blended into each decision, with the provider leading at weight 0.3. Low-confidence Sight is
  ignored. In Waivers, Sight fills a missing projection (#701).
- Waivers use real positions and never drop a bye, a 0.0, a player Sight grades 70+, or into a lineup hole
  (#673, #701).
- Bye planning: the last bench cover for a starter whose bye is 1 or 2 weeks out is kept. An add that covers
  that bye says so (#711).
- Sleeper injury status fills in when the provider reports none (#709).
- New evidence lines: Omen's Sight read, ESPN market trend, and an upcoming bye covered (#701, #704, #711).

**Sight (Omen's own read)**
- v1, then v2, served since 2026-10-17. v2 covers QB, RB, WR, TE, K and DEF and adds context: Vegas totals,
  opponent, role changes, weather, rain and team elements. Weights adapt by season phase.
- Held out 2022-2025, v2 against points-per-game: QB 0.383/0.329, RB 0.535/0.506, WR 0.495/0.483,
  TE 0.459/0.428, DEF 0.280 against 0.075 production. K is weak and labeled low confidence.
- Graded weekly against actual results and provider projections. The switch is `SIGHT_ENABLED` /
  `SIGHT_VERSION`.

**Ledger**
- Each call is graded against the player it passed over, on the league's own scoring when the league can be
  read (#672 and the Ledger writer).
- Contested hit rate: calls against an OUT or bye alternative do not count (#702).
- Trades are graded over the week, the next 4 weeks and the season so far (step 18, #710).

**Warehouse (KVM1)**
- Routing map in SQL, player and team indexes, and the coach graph. Weather: forecasts and the observed
  archive since 1999.
- Player index: matched by GSIS, then ESPN id, then name plus birth date (v10), then the DynastyProcess
  crosswalk (v11, GPL-3.0, founder-accepted). Players still unmatched are tried at read time by name, team
  and position (#703, #705, #706, #708).
- Sleeper injury reports (v12, #709). Step 16 FK indexes applied.

## Where it lives

- **Production API and warehouse:** everything above.
- **Not yet in the app:** the Sight block, injury status, the new evidence lines, the contested record,
  trade horizons, warehouse usage evidence on trades, and the "unreadable team" state. The backend sends all
  of it.

## Known issues / next

- **App screens:** render Sight, injuries, evidence, the contested record and trade horizons.
- **Coverage:** Sight reaches Yahoo for 233 of 305 players through the index. The read-time name match
  should cover the rest, but the count is not re-measured.
- **Injuries:** daily only, so Sunday-morning inactives are missed. Sleeper's practice fields are empty.
- **Kickers:** K Sight is noise and stays low confidence.
- **Sight v3:** coach graph and scheme links into Sight. Built as a bundle and switched once.
- **Provider surface:** Sleeper depth chart, Yahoo `percent_owned`, keeper and auction values are still
  unused (provider matrix).
- **Merge process:** two PRs merged before CI started (#702, #703). This is fixed in the merge script, and
  the main deploy was red until #704.

## Tester notes

Paste into TestFlight "What to Test". If the box is short, drop the OMEN SIGHT section first.

```
Build 12 — what changed

LEAGUE CONNECTIONS
- ESPN and Yahoo: Omen now reads your league's real lineup slots (FLEX, SUPERFLEX, etc.)
- Yahoo: projections now cover most rostered players (was about a quarter); free-agent list no longer stops at 25
- League page reads other managers' rosters more reliably
- Locked players (game started) are never suggested for a swap or drop
- Expired ESPN/Yahoo logins are detected every 6 hours, deleted from our servers, and flagged for reconnect; your league stays connected

TRADES
- Both sides must gain: no more lopsided "+0.0 for them" offers
- Trade-locked players are skipped
- Flex rules match your league (W/R/T, W/R, SUPERFLEX)
- Trades are graded over the week, the next 4 weeks and the season so far

START/SIT & WAIVERS
- Picks now weigh Omen's own player read (Sight) alongside the provider projection
- Waivers never suggest dropping a bye-week player, a 0.0 projection, or a player Omen rates strong
- Won't drop your last backup before a starter's bye in the next 2 weeks
- Uses real positions, so no more dropping an RB for a TE
- New notes: market trend on ESPN adds, and "covers X's bye"
- Injury status from Sleeper fills in when your provider shows none

OMEN SIGHT (new, behind the scenes)
- Omen's own weekly read for every QB, RB, WR, TE, K and DEF
- Built from usage, role changes, matchup, Vegas totals, weather and rain
- Beats a plain points-per-game read on past seasons at every skill position
- Graded every week against what actually happened

LEDGER
- Calls graded on your league's own scoring
- New "contested" hit rate: easy calls (benching an injured player) don't count

PLEASE TEST
- Connect or reconnect ESPN / Yahoo / Sleeper and check your lineup slots
- Find a Trade: are the offers fair both ways?
- Waivers: does the suggested drop make sense?
- Start/Sit on Sunday morning: are locked players left alone?
```

## Proof

- **Tests:** npm test passes, 2,503 tests at #711.
- **Database:** the redo rehearsal passed in CI for steps 17 and 18. The warehouse read-only verify passed at
  each schema version up to v12.
- **Production:** Sight v2 recomputed for weeks 1-6 on code revision 2026-10-17.v2-complete.
- **Not yet done:** the paired-iPhone walk.
