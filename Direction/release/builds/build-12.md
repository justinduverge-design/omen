# Build 12

## Status

**Open. Build 12 implementation shipped 2026-10-20 through #762 and #763 reconciled the release record,
but the release is not complete until the final iPhone walk below passes.**
The source checklist in `Blueprints/handoffs/2026-10-19-build-12-codex-finish.md` is implemented. The open
release gates are installing the final signed build on the founder's iPhone, completing the screen and
unfiltered-accessibility walk, and uploading that proven archive to TestFlight. The one legacy ESPN row with
no team id is explicitly carried into Build 13; it does not block first-time users or the Build 12 binary.

- **Screen rebuild (2026-10-21 to 10-23, PR #770):** every iOS screen was rebuilt on the approved design
  foundation (`Blueprints/specs/design/omen-design-foundation-v1.md`, canvas `design/foundation-v1-canvas/`)
  and the old screens and components were deleted. Full local suite green on 2026-10-23: 613 unit tests and
  every UI test with its accessibility audit. A fresh review's four P1s are fixed. Not yet merged, installed
  on the founder's iPhone, or uploaded.
- Backend shipped to production in two waves: 2026-10-15 to 10-17 (#670 to #713), then the integration
  branch on 2026-10-19 (#752, deploy run 39241836554, green).
- League activity for Yahoo and ESPN switched on in production 2026-10-19 (founder).
- The app is not uploaded. The final source builds and signs; the founder's phone was away for the last
  install, so the final connected-device walk below and TestFlight upload remain.
- **Beta audience:** 7 of the 8 friends-beta leagues. Rhody's ESPN league has been connected since Build 1;
  a new ESPN account in this beta is the first real test of the fresh-login path.
- Baseline before this build: Build 11 (2026-10-12, ESPN first-login repair).

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

Found in the promise audit and the founder's reconnect walk (2026-10-18 and 10-19):

- **ESPN fresh login:** a tester saw the manual League ID box, which looked like an old journey. It is the
  current fallback, and it showed because a brand-new ESPN login can be signed in before ESPN lists its
  leagues.
- **Yahoo return:** the OAuth callback took 4.6 s. It fetched every league and team and cleared the cache
  twice before sending the user back, and then the app fetched the same leagues again.
- **Omen call write-up:** the private model host runs on CPU and takes 25 to 30 s per answer. Every call
  waited its 1.25 s budget, timed out and showed the template; the breaker kept opening.
- **Find a Trade:** an empty result gave no reason. Yahoo Build a Trade could not find your own side, because
  team keys `461.l.N.t.4` and `4` never matched.
- **Sight:** reads stopped silently at 400 players, so a whole-league read lost players.
- **Waivers, first open:** 0.8 to 1.7 s, because ESPN and Yahoo provider reads ran one after another.
- **Accessibility:** Apple's audit found 61 issues on the demo desk (55 Dynamic Type, 6 contrast).
- **League activity:** Yahoo and ESPN showed "unavailable"; the reads were built but switched off.

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

**Integration, 2026-10-18 to 10-19 (#752)**

All of it was built on `build-12/integration`, reviewed by a fresh agent, and merged as one PR.

- *Native lock v2:* the Codex branch `codex/omen-native-lock-v2`, which brings the Command desk and the lock
  work, merged with main's Sight hints.
- *ESPN fresh login:* the server reads ESPN's own count of football leagues and answers with a discovery
  state: `complete`, `partial`, `espn_listing_pending`, `espn_profile_pending` or `no_football_leagues`.
  - While ESPN counts a league it has not listed yet, the app keeps checking for about 30 s.
  - A missing ESPN profile gets two short checks.
  - Each case has its own copy. The League ID box is now the last resort.
  - League ids no longer appear in ESPN request logs.
- *Yahoo callback:* redirects as soon as the tokens are stored. Memberships are written in the background
  under a 30 s budget, and the app reuses that league read (60 s, per user). Disconnecting clears it.
- *Omen call:* the write-up is generated in the background and reused for 30 minutes for the same decision
  facts. The call no longer waits on a slow model host, and the next view of the same move gets the
  narration.
- *Find a Trade:* every empty result names its reason (`no_readable_opponents`, `no_tradeable_players`,
  `no_trade_helps_both_lineups`, `no_fair_trade`, `search_budget_exceeded`) and returns its search funnel.
  Yahoo team keys match their bare ids.
- *Sight:* big reads go in parallel batches of 400, and none are dropped.
- *Waivers:* independent ESPN and Yahoo reads run together.
- *Instrumentation:* signposts on every API request and screen, MetricKit payloads kept on the device (no
  upload), and Xcode performance and accessibility UI tests (cold launch, demo to desk, tab switching, an
  audit of every tab).
  - On the iPhone 15: about 150 ms to first frame, and about 370 ms of main-thread time across four tab
    switches. Earlier "2.8 s tab lag" figures were XCTest idle waits and were withdrawn.
- *Demo:* Build a Trade explains that it needs a league, and the demo no longer calls capabilities.

**Switched on, 2026-10-19**
- League activity for Yahoo and ESPN (`LEAGUE_TRANSACTIONS_YAHOO=1`, `LEAGUE_TRANSACTIONS_ESPN=1`). The env
  file was backed up first.
  - Read-only probe of the founder's account: 5 of 5 leagues `available`.
  - Yahoo: 25 and 25 items, with player names.
  - ESPN: 25, 11 and 14 items, with no player names (ESPN sends ids).

**Warehouse (KVM1)**
- Routing map in SQL, player and team indexes, and the coach graph. Weather: forecasts and the observed
  archive since 1999.
- Player index: matched by GSIS, then ESPN id, then name plus birth date (v10), then the DynastyProcess
  crosswalk (v11, GPL-3.0, founder-accepted). Players still unmatched are tried at read time by name, team
  and position (#703, #705, #706, #708).
- Sleeper injury reports (v12, #709). Step 16 FK indexes applied.

## PRs in this build

43 PRs, #670 to #713, merged 2026-10-15 to 2026-10-17; then #714 to #752 to 2026-10-19. Builds 10 and 11 were #645 to #669.

**Close, 2026-10-23 to 10-25 (#772 to #779):**
- #772 trades never offer kickers or defenses or sell a thin position; #774 claims and trades judged by the
  whole lineup over the coming weeks on Sleeper, ESPN and Yahoo; a Sleeper row with no points is a 0 (the
  "Start Mike Evans" bug); ESPN tells free agents from claims and reads league scoring; Yahoo reads free agents
  and waivers separately, 100 deep.
- #775 reasons first on every surface (the trade card's "Why"); #773 the live walk's fixes (Build a Trade's
  false "couldn't reach the server", "Jr..", labelled Sight drivers) and the walk itself.
- #777 Omen call limit 120/user, 300/IP a minute; body-parser and fast-uri advisories fixed.
- #779 Desk: every team counted ("Projected to win x of N"), projected numbers on the bar, a limit waited
  out quietly, three team reads at a time; app build number 12.

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
| #714 | Docs | Build 12 package: PR list and retro |
| #715 to #751 | Infra | Rust programme Phases 1 to 4, OpenTelemetry, Vector, lint gates (shellcheck, typos, Biome), pruning, branch triage, provider gaps G4/G6/G8 (#746). Infrastructure; nothing user-facing beyond #746 |
| #752 | Integration | Build 12 integration: native lock v2, connection fixes, background narration, load-time instrumentation |
| #753 | Docs | Build 12 package: integration, league activity, canvas plan and post-canvas test walk |
| #754 | Defects | Build 12 defect sweep: League states, live activity with ESPN names, pre-draft reason, chevron contrast |
| #755 | Defects | ESPN activity: name D/ST entries |
| #756 | Design | Whole-app canvas: first cut (proposal) |
| #757 | iOS | Canvas build 1: Desk and shell |
| #758 | iOS | Build 12 screens: every screen wired to the backend on Sleeper, ESPN and Yahoo |
| #759 | Docs | Close-out: Build 12 screens + Codex finish handoff |
| #760 | iOS / Narration | Build 12: light lockup and qwen narration bridge |
| #761 | iOS / Providers / Trade | Finish Build 12 device gate and provider contracts |
| #762 | Contracts | Refresh Build 12 Trade contract fixtures |
| #763 | Docs | Update Build 12 release package and tester notes |
| #770 | iOS | Build 12: every screen rebuilt on the design foundation (Desk, Omen, Player, Trade, League, Waivers, Ledger, Account, Support, switcher, sign-in, Connect, system sheets) |

## Where it lives

- **Production API and warehouse:** everything above.
- **In the app on `main`, not yet on TestFlight:** the Command desk and shared shell; provider-aware Desk,
  Omen, Start/Sit, Waivers, League, Trade and Ledger screens; light and dark lockups; ESPN discovery and
  background late-listing recovery; Find a Trade reasons and "the catch"; Trade horizon states; Sight and
  warehouse evidence; contested records; signposts and MetricKit.
- **On the founder's iPhone:** the #760 Release build, including the light/dark sign-in proof. The final
  #761/#762 source compiles and signs, but still needs its connected-device install and walk.
- **Switches in production:** `SIGHT_ENABLED=true`, `SIGHT_VERSION=v2`, `YAHOO_ENABLED=true`,
  `LEAGUE_TRANSACTIONS_YAHOO=1`, `LEAGUE_TRANSACTIONS_ESPN=1`.

## Shipped 2026-10-19 (#754 to #758)

- **Defect sweep (#754, #755):** no P0, one P1. The source defects shipped; D6 remains an owner-controlled
  production database row, and #760 later fixed D9's light-mode logo.
- **Canvas (#756):** the whole-app canvas and `BUILD.md`, in Claude Design. Figma is retired.
- **Desk and shell (#757):** the Desk, the tabs and the switcher.
- **Screens (#758):** every screen is wired to the backend on all three providers.
  - Real stats and Omen Grades on every player.
  - Omen call evidence built from Omen's read.
  - ESPN and Yahoo personalized trades and projection breakdowns.
  - FLEX fix, light mode, contested Ledger record.
- **Proof:**
  - npm test: 2,580 pass. iOS unit tests: 649 pass.
  - The three stale UI expectations and the remaining accessibility gates were repaired in #761.
  - Two fresh-agent reviews: no P0 or P1.
  - Production probe: real numbers in 89 ms.

## Screen rebuild (#770)

One build, every screen, on the foundation: Desk and its team Rolodex, the Omen call and full argument, the
player page, Trade (chooser, builder, Find a trade, Judge an offer, three-team, verdict and share), League,
Waivers, Ledger and receipt, Account and its pages, Contact support and Report a problem, the team switcher,
Welcome, email code, Connect and league pick, connect failed, the passkey offer and the forced update.

- **Deleted, not kept alongside:** the old J1 to J6 screens, the old trade journey, the league switcher and
  team picker, Help + Support, About, and the design-system pieces nothing renders any more.
- **Behaviour changes:** Account opens as a page from the Desk; Contact support sends an in-app report
  (no more pre-filled email); the team switcher drops the provider filter and favourites; a build without
  Supabase settings says provider sign-in isn't set up; the email code submits itself at six digits.
- **Kept on purpose:** the nflverse CC BY 4.0 credit and the Yahoo attribution (Sources page), the delete
  phrase gate, the report disclosure before Send, and all provider connection logic (Connect was restyled only).
- **Not drawn because the server doesn't send it:** League's "Omen" roster rank, Ledger points per call and
  "confidence then", Notifications settings, Export your data, ties in standings, jersey numbers, team logos,
  the swing matchup and win probability (foundation spec § 9).
- **Review P2s left open:** the Desk's Ledger line disappears without a word when the Ledger can't load, and
  the Desk has no "Report a problem" entry of its own (Account has it).
- **Screenshots:** `output/screens/build12/final/` (dark and light, local only).

## Known issues / next

### Known limit in this build

Sight, Omen's own read, forecasts **points only** (next week's PPR total and a grade), not catches, yards,
carries or touchdowns. Decisions and the new "Why" reasons (#775) rest on that. The stat-line forecast is the
first Build 13 item (`build-13.md`, Forecast liability).

### Explicit Build 13 carry-forward

- Re-prove the complete first-time ESPN connection, discovery and ingestion journey with a new account,
  and repair or retire the legacy connection row with no `espn_team_id`.
- Reconcile the provider capability matrix against current production and code. Record separately what Omen
  uses now, what providers expose but Omen does not use, and what provider fields are obsolete because the
  warehouse or another canonical source supersedes them.
- Evaluate the already-probed `qwen3:1.7b` narration path and other small-model background work without
  changing Build 12's production model setting.

The working inventory is `Direction/release/builds/build-13.md`. These are known follow-ups, not reasons to
hold a Build 12 candidate that passes the final phone and archive gates.

### Historical canvas plan (implemented in #756 to #758)

This section records the plan that produced the shipped canvas and screens. It is provenance, not the
current queue. Brief: `Blueprints/specs/design/omen-whole-app-canvas-v1.md`.

- **First cut, in this order:**
  1. The shared shell and context switcher.
  2. The J2 live-team portfolio.
  3. The J3 Omen analysis-to-evidence transition.
  4. The J4 Trade mode chooser and Find candidate.
  5. The global state board: buttons, rows, sheets, loading, errors, motion, haptics.
  6. Grey-box frames for every other screen.
- **Each frame meets the brief's definition of done:**
  - every state, including unavailable;
  - its evidence source and freshness;
  - Dynamic Type and accessibility;
  - motion and haptics;
  - a latency class;
  - an approval state that is never collapsed into "done".
- **Problems the canvas has to solve, from this build:**
  - Render Sight, injuries, the new evidence lines, the contested record and trade horizons.
  - The 61 accessibility findings (Dynamic Type, contrast), solved in the type and token system rather than
    screen by screen.
  - League activity: Yahoo items carry names; ESPN items carry types only. Design both, and the
    `provider_read` label (below).
  - Find a Trade empty reasons: one message per reason.
  - ESPN connect: the listing-pending and profile-pending notices, and the League ID box as the last resort.
  - The narration states: live, template, and "write-up still coming" for the first view of a move.
  - Loading and partial states for the 1 to 1.7 s first reads (league list, summary, Start/Sit).
- **Canvas home (founder, 2026-10-19).** Figma is retired; the canvas is Claude Design artboards in
  `design/`, starting from `design/native-visual-lock-2026-09-13/`. What the Figma file held is pictured in
  `design/figma-archive/` (13 of its frames exported before the free plan's limit; the rest are listed).
- **Leftovers on the live screens (founder, 2026-10-19).** Some screens on the phone today are visibly off,
  and old components or small stray pieces may still be on them that do not belong. The canvas draws each
  screen from the journey down, not from what is on it now. The screen work then removes every component
  that has no frame, and logs what it removed (the pruning rule).
- **Freedom to rework (founder, 2026-10-19).** The canvas may change the app's structure where that makes
  the product better. Claude designs; the founder approves or rejects. Use references where unsure, and
  record each one as a principle, not a copied layout.

### Build 12 release blockers

1. **Run the final physical-iPhone gate.** Install the final signed Release build, run the Build 12 screen
   and accessibility walk against the already-connected leagues, and record any honest degraded states.
   Source changes are merged; device proof for the final binary is not.
2. **Upload only the proven archive to TestFlight.** Paste the tester notes below and record the TestFlight
   build number here before changing this package to Shipped.

The rejected legacy ESPN credential with no `espn_team_id`, plus a genuinely fresh ESPN-account journey,
is a named Build 13 liability rather than a Build 12 release blocker. Do not edit or delete that production
row by guesswork, and do not claim fresh-account proof until it is actually run.

### Resolved Build 12 findings

- D1 through D5 and D7 through D9 shipped in #754, #755 and #760. The undrafted Sleeper copy, iOS template
  chevron and iOS light lockup entries in `Direction/known_issues.md` are closed or narrowed accordingly.
- The report control, accessibility implementation, stale UI expectations, provider-wide Omen call,
  ESPN late-listing recovery and Trade server fields shipped in #761; final physical-device proof remains
  part of blocker 2 rather than being inferred from source or unit tests.

### Post-Build 12 backlog — not release blockers

- **Narration model:** #760 proved `qwen3:1.7b` with thinking disabled. Production remains on `gemma3:4b`.
  Small-model background work and any production activation are a later, separately approved change.
- **Support/report delivery and move follow-through:** the Desk control is placed correctly, but end-to-end
  support delivery and the "I made the move / Not this week" write route remain post-Build 12 work.
- **Performance and model depth:** parallelise remaining cold reads; re-measure Yahoo player-index coverage;
  improve Sunday injury freshness; keep K low-confidence until it earns more; build Sight v3 separately.
- **Unused provider fields:** Sleeper depth chart plus Yahoo `percent_owned`, keeper and auction values remain
  candidates for later features. Their absence does not prevent today's calls from working.
- **Operations outside this release:** the Cloudflare 522 experiment and off-host backup-expiry risk remain
  tracked in `Direction/known_issues.md`; neither is introduced by the Build 12 binary.

## Tester notes

Paste into TestFlight "What to Test". If the box is short, drop the OMEN SIGHT section first. Re-check the
length once the canvas screens are in: the limit is 4,000 characters.

```
Build 12 — what changed

NEW LOOK
- Every screen was rebuilt as one system: swipe your teams on the Desk, one call per team, the same buttons and states everywhere
- Account is a page from the Desk; Contact support and Report a problem are in Account
- The Ledger leads with your record when Omen disagreed with your provider
- Text grows with your iPhone text size setting; Light, Dark and Match iPhone all work

OMEN CALLS
- Omen makes its own call for Sleeper, Yahoo and ESPN leagues
- A missing provider projection no longer prevents Omen from making a call when its own evidence is available
- When only Omen has a read, the screen says "Omen Read" instead of pretending the provider supplied one

LEAGUE CONNECTIONS
- ESPN and Yahoo: Omen now reads your league's real lineup slots (FLEX, SUPERFLEX, etc.)
- Yahoo: projections now cover most rostered players (was about a quarter); free-agent list no longer stops at 25
- League page reads other managers' rosters more reliably
- Locked players (game started) are never suggested for a swap or drop
- Expired ESPN/Yahoo logins are detected every 6 hours, deleted from our servers, and flagged for reconnect; your league stays connected
- New ESPN login: if ESPN hasn't listed your league yet, Omen tells you and keeps checking. The League ID box is a last resort
- If ESPN lists only some leagues at first, Omen keeps checking for the rest in the background
- Yahoo sends you back to Omen faster after you sign in
- League activity (adds, drops, trades, waiver claims) now shows for Yahoo and ESPN leagues

TRADES
- Both sides must gain: no more lopsided "+0.0 for them" offers
- Trade-locked players are skipped
- Flex rules match your league (W/R/T, W/R, SUPERFLEX)
- Trades are graded over the week, the next 4 weeks and the season so far
- When Find a Trade finds nothing, it tells you why
- Trade detail names "the catch" when the move would leave a position thin
- Future horizons are shown only when Omen has real data; unavailable periods are never guessed

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
- New to ESPN in Omen? Connect it and tell us if you ever see the League ID box
- Connect or reconnect ESPN / Yahoo / Sleeper and check your lineup slots
- Open one Omen call in each provider and confirm each gives you a usable call
- Swipe teams on the Desk and use the team switcher: does every tab follow?
- League page: does the activity match your league?
- Find a Trade: are the offers fair both ways?
- Waivers: does the suggested drop make sense?
- Start/Sit on Sunday morning: are locked players left alone?
```

## Proof

- **Final automated gates:** npm test passed 2,586 of 2,586 before the final fixture-only closeout. The iOS
  unit target passed 649 tests with 1 intentional skip and 0 failures. The focused final provider and Trade
  suites passed 112 of 112; the final Start/Sit route rerun passed 37 of 37.
- **Builds:** simulator build passed. A generic Release iPhone build completed and was signed with Apple
  Development. #760 was installed on the founder's iPhone and its light/dark sign-in appearances were
  inspected; the final #761 build awaits the connected-phone install.
- **Review and CI:** a fresh review found no remaining merge blockers. #761 passed shellcheck, typos and
  Biome. #762 then passed all six PR gates, including the full backend test and contract audit.
- **Founder reconnect walk (2026-10-18, iPhone 15):**
  - Sign-in passed in about 3 s.
  - Sleeper 3 of 3, Yahoo 2 of 2, ESPN 3 of 3 leagues returned, and favourites came back.
  - Probe afterwards: every team readable.
  - Detail: `Direction/release/build-12-connection-test-plan.md`.
- **League activity probe (2026-10-19):** 5 of 5 Yahoo and ESPN leagues available.
- **Database:** the redo rehearsal passed in CI for steps 17 and 18. The warehouse read-only verify passed at
  each schema version up to v12.
- **Production:** Sight v2 recomputed for weeks 1-6 on code revision 2026-10-17.v2-complete.
- **Final production deploy:** merge `36835f11` deployed successfully in run `39473388464`; backend tests,
  recorded contracts, dependency audit, frontend build, image builds, `/api/health`, deployed-logo check and
  public-route visual canary all passed.
- **Not yet done:** install the final signed build on the paired iPhone; run the screen and unfiltered
  accessibility walk below; upload the proven archive to TestFlight. Fresh-account ESPN and the rejected
  legacy row are explicitly carried into Build 13.

### Founder device walk, 2026-10-20

The first post-reconnect walk found release-candidate defects that were not visible in the static canvas:

- the Desk refreshed its payload but not its league directory after a connection, so it could remain blank
  until another tab triggered the missing read;
- the compact Trade direction column wrapped `Out` onto two lines;
- Trade created a public link but did not hand it to the iOS share sheet;
- the Trade verdict lacked an obvious back affordance;
- the Desk's Ledger preview looked tappable but only its small `See all` label opened the Ledger;
- a player with real stats but no returned grade looked partially decoded rather than explicitly unavailable.

The corrective pass reloads the full league context after connection, makes the Ledger preview tappable,
labels a missing grade honestly, restores Trade back/share behavior, and replaces boxed Trade direction rows
with information-specific red `OUT` and green `IN` pills plus divided player lines. The words remain visible,
so color is not the only carrier. This pass also records the governing correction in the canvas build sheet:
the canvas is a proposal and physical-device usability outranks literal container copying.

### To test once the canvas and screens are fixed

Run in this order, on the founder's iPhone with a Release build, while Claude watches the server logs and
`[omen-timing]` signposts. Each item passes or is logged in the package.

1. **Automated gates:**
   - `PerformanceJourneyUITests` (cold launch, demo to desk, tab switching) holds its Xcode baselines.
   - `testAccessibilityAuditEveryTab` reports 0 issues, down from 61.
   - npm test and CI are green.
2. **Sign-in:** sign out and back in. Lands on the desk with leagues kept, and the desk is useful in 3 s or
   less.
3. **Connections:** prove the Build 12 reconnect-refresh correction with one available provider account.
   - The Desk populates immediately after connection without requiring a tab switch.
   - The Yahoo return takes about 1 s or less (it was 4.6 s).
   - Favourites survive.
4. **Each tab, using the already-connected beta leagues:** Desk, Omen call, Start/Sit, Waivers, League (with activity),
   Find a Trade, Build a Trade and Ledger.
   - Every frame state from the canvas renders: loading, partial, empty with reason, error with retry,
     unavailable.
   - Sight, injuries, evidence lines, the contested record and trade horizons appear where the canvas puts
     them.
5. **Narration:** open a move twice. The first view shows the template, and a later view shows the live
   write-up. No breaker-open lines in the logs.
7. **Load times:** each screen's `screen/ready` signpost is inside its canvas latency class, and warm reads
   take under 1 s.
8. **Accessibility by hand:** largest Dynamic Type, VoiceOver through the desk and one decision, Reduce
   Motion, and haptics off.
9. **Demo door:** every tab is reachable without an account, and Build a Trade explains it needs a league.
10. **Then:** TestFlight upload (`Direction/release/ios-upload-runbook.md`), tester notes pasted, and the
    package status set to shipped.

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
- Instrumenting before judging paid off. Signposts and an App Launch trace showed the "tab lag" was test
  overhead, so we did not rebuild the tab bar.
- The founder's reconnect walk, planned from code and settings first, found the Yahoo 4.6 s and the
  narration breaker in one pass.
- One integration branch held all of the late Build 12 work. It got one review and one deploy.

**What went wrong**
- #702 and #703 merged before CI started, which kept the main deploy red until #704. The merge script now
  waits for checks to exist. A later version of that wait hung on a PR with only three checks.
- A test User-Agent once carried the founder's email to Wikipedia. It is not in code; never send personal
  data to third parties.
- Work moved fast enough that the build record was written at the end, not as it went. Packages fix that.
- In the logs we checked, the narration model never finished inside its budget, and only the reconnect
  walk surfaced it. A breaker that keeps opening should alert.
- An audit probe read "Yahoo Sight 0%". The cause was the silent 400-player cap, not Yahoo. Limits should
  say when they cut.

**Where we get better**
- Open the package when the build starts and add each PR as it merges.
- Make one merge helper the only merge path. It should wait for every check to exist and pass.
- Measure coverage after each index change. Yahoo 233 of 305 was measured; the name fallback was not
  re-counted.
- Pair the screens with the backend. Sight, injuries and trade horizons are live, but users cannot see them
  yet.
