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

## PRs in this build

43 PRs, #670 to #713, merged 2026-10-15 to 2026-10-17. Builds 10 and 11 were #645 to #669.

| PR | Area | Title |
|---|---|---|
| #670 | Trades | Build 12: Trade reliability and projection foundation |
| #672 | Ledger | Ledger: keep each league's scoring rules (writer only; grading stays off) |
| #673 | Start/Sit & Waivers | Waiver fix + League trade targets (phone report 2026-10-15) |
| #674 | Ledger | Ledger grading: resolve provider ids through the crosswalk |
| #675 | Ledger | Ledger grading: compare each call against its alternative |
| #676 | Ledger | Cron: warehouse reader for Ledger grading (already applied on KVM1) |
| #677 | Ledger | Ledger: grade on the league's own scored points |
| #678 | Warehouse | Warehouse map: routing files in the repo and in the warehouse (0007) |
| #679 | Warehouse | Warehouse verifier: accept v4 and check the map |
| #680 | Warehouse | Warehouse publisher: admit the file Build 12 added to releases |
| #681 | Sight | Sight v0: RB, WR and TE ratings |
| #682 | Sight | Sight v1: fitted weekly reads, weekly grading, version switch |
| #683 | Sight | Warehouse: store provider projections (the yardstick for Sight) |
| #684 | Warehouse | Warehouse: the player index (ESPN, Sleeper, Yahoo -> one Omen player) |
| #685 | Warehouse | Player index: Sleeper floor 2,000 |
| #686 | Sight | Sight in the API behind SIGHT_ENABLED / SIGHT_VERSION |
| #687 | Sight | Sight v1: QB |
| #688 | Sight | Sight: recompute when the weights change |
| #689 | Sight | Sight v2: game context (Vegas + opponent) |
| #690 | Warehouse | Warehouse: team and defense index (0011); ESPN players carry their NFL team |
| #691 | Sight | Sight v2: kickers and defenses |
| #692 | Sight | Sight v2: role changes (usage trend, vacated opportunity) |
| #693 | Sight | Sight: weather tested and not added; v2 layer results in the spec |
| #694 | Warehouse | Warehouse: the coach graph (0013) |
| #695 | Sight | Sight v2 flex grade; polite coach backfill |
| #696 | Sight | Sight v2 complete: weather, forecasts, code-version stamp |
| #697 | Sight | Sight v2: rain and team-elements inputs; observed game weather (0017) |
| #698 | Connections | Connections: credential health (refused credentials are removed) |
| #699 | Warehouse | Coach backfill: Wikimedia-policy User-Agent |
| #700 | Sight | Sight v2 final: rain and team elements in the live run |
| #701 | Sight | Start/Sit and Waivers decide on Sight plus lock flags |
| #702 | Ledger | Ledger: contested hit rate |
| #703 | Warehouse | Player index: Sleeper and Yahoo through the ESPN crosswalk |
| #704 | Start/Sit & Waivers | Waivers: ESPN market signal; fix main's contract fixtures |
| #705 | Warehouse | Player index: name and birth date match (warehouse v10) |
| #706 | Warehouse | Player index: DynastyProcess crosswalk for Yahoo (warehouse v11) |
| #707 | Docs | Close-out: Sight v2, decisions, player index |
| #708 | Sight | Sight for every Yahoo player: name + team + position fallback |
| #709 | Sight | Sleeper injury data: warehouse table, Sight block, decision fallback |
| #710 | Ledger | Ledger: trade grading over three horizons (redo step 18) |
| #711 | Start/Sit & Waivers | League GM: bye-week planning in Waivers |
| #712 | Docs | Close-out: trade horizons, injuries, bye planning |
| #713 | Docs | Build packages: Build 12 record and ship-when-ready cadence |

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

## Retro

**What worked**
- Live probes against real leagues found the real gaps. Lineup slots were never read, Yahoo projections
  covered only a quarter of players, and the waiver pool stopped at 25. Guessing would not have found these.
- Sight was measured before it was trusted. Every layer was scored on held-out seasons against a plain
  points-per-game read. Layers that did not help were recorded; the founder kept some of them.
- Version switching was done as one bundle. v2 was built on the side and switched on once.
- Database steps were rehearsed before production. Each warehouse version was proven on a scratch Postgres
  with a refused re-apply, then backed up, applied and verified. The Supabase steps were rehearsed in CI.
- Every PR got a fresh-agent review, and real bugs were caught before merge:
  - a wrong-person name match;
  - a week the warehouse had not loaded being scored 0-0;
  - an injury write that could roll back the player-id writes.

**What went wrong**
- #702 and #703 merged before CI started, which kept the main deploy red until #704. The merge script now
  waits for checks to exist. A later version of that wait hung on a PR with only three checks.
- A test User-Agent once carried the founder's email to Wikipedia. It is not in code; never send personal
  data to third parties.
- Work moved fast enough that the build record was written at the end, not as it went. Packages fix that.

**Where we get better**
- Open the package when the build starts and add each PR as it merges.
- Make one merge helper the only merge path. It should wait for every check to exist and pass.
- Measure coverage after each index change. Yahoo 233 of 305 was measured; the name fallback was not
  re-counted.
- Pair the screens with the backend. Sight, injuries and trade horizons are live, but users cannot see them
  yet.
