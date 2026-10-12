# Omen provider capability matrix v1

**Date:** 2026-10-11. **Status:** audit, read-only except gap G1 (shipped with this document).
**Question (founder):** "make sure we can really get all the information we need from the league providers."
**Method:** code read of `src/adapters/{sleeper,espn,yahoo}.js`, `src/services/yahoo.js`, the routes that call them,
the 2026-08-29 M11A provider proof, and the screen matrix (`Direction/reviews/2026-10-10-screen-data-matrix.md`).
Provider API facts come from the repo's own measured notes first, then public provider documentation and the
community-documented ESPN "kona" API. **Nothing here was run against a live account in this session**; every
"API offers" cell not already exercised by Omen is marked *documented, not exercised* and needs a probe before it is
built on. Line numbers are on `main` at `f57c6091`. Bare `yahoo.js:N` means `src/services/yahoo.js` (the client) except where a cell says `adapters/yahoo.js`; PR #648 shifts lines in `services/yahoo.js` after ~130 by about +4 and in `espn.js` after ~680 by about +15, so use the symbol names when the numbers drift.

## Legend

- **Read** = Omen calls it today and a route uses the result. **Adapter only** = a function exists with no (or one
  indirect) caller. **Not read** = no code.
- **Honest** = the user sees "unavailable" or a stated limitation. **Silent** = the field is `null`/empty with no
  statement, or a feature just does not appear.
- Auth: **Sleeper** is public and unauthenticated (league id or username is enough). **ESPN** reads need the user's
  `espn_s2` + `SWID` cookies for private leagues (`espn.js:442`), stored per connection and re-validated by
  401/403/400 detection (`espn.js:464`). **Yahoo** uses OAuth 2 with scope `openid fspt-r` (read-only Fantasy,
  `src/middleware/yahooOAuth.js:44`); the entitlement was granted 2026-08-28.

## Headline findings

1. **Other teams' rosters are already read on all three providers.** The "trade targets unavailable" and "Yahoo rosters
   of other teams" items in the tracker are stale on the server: `fetchEspnLeagueRosters` (`espn.js:1209`),
   `fetchYahooLeagueRosters` (`yahoo.js:205`) and `fetchSleeperLeagueRosters` (`sleeper.js:723`) feed
   `GET /api/trade/roster` (`trade.js:609-684`) and the Omen call's trade candidate (`omenTradeCandidate.js:150,169`).
   What is still missing is a **League-screen "trade targets" section**: `league-overview.v1` has no such field
   (`league.js` envelope, `overviewEnvelope`). That is a new section built from reads that exist, not a provider gap.
2. **Yahoo is the weakest provider and the gap is one thing: projections.** No per-player projection anywhere
   (`yahoo.js:55`, `withYahooIds` sets `projected_points: null`). That single gap disables Yahoo trade calls
   (`omenTradeCandidate.js` returns `projections_unavailable`), Yahoo waiver ranking (`waivers.js:262-270`,
   `availabilityConfirmed: false`) and Yahoo start/sit ranking. Yahoo also returns no `roster_positions`, so the trade
   lineup solver borrows the slots from the user's own lineup (`omenTradeCandidate.js` `rosterPositionsFromRoster`).
3. **Nobody reads league transactions.** Sleeper, ESPN and Yahoo all document a transactions endpoint; Omen reads none
   (`league.js` `league_transactions` is hard-coded `not_requested`). It is honest today (`unavailable_families:
   ["transactions"]`), and it is the same gap on all three providers, not an ESPN-only one.
4. **Playoff cut line was unknown for ESPN and Yahoo.** Both providers carry the playoff-team count in a settings
   payload Omen already (ESPN) or cheaply (Yahoo) fetches; nothing parsed it. Fixed in this PR (gap G1 below).
5. **Degradation is mostly honest, with three silent spots:** Yahoo `projected_points: null` is not surfaced as a
   statement on the roster itself (it is surfaced on waivers and trade only); ESPN/Yahoo `roster_positions: []` from the
   league-roster reads is silently replaced by the user's own slots; and Yahoo league-roster reads turn a failed
   per-team read into an empty team (`yahoo.js:219-231`) with no flag.
6. **Per-team Yahoo reads are the latency risk.** `fetchYahooLeagueRosters` is 1 standings call + N roster calls
   (14 calls for a 12-team league), unbudgeted inside the adapter. The Omen call caps it at 1.5 s
   (`omenTradeCandidate.js` `TRADE_READ_BUDGET_MS`); `GET /api/trade/roster` does not.

## Matrix

### 1. League settings and scoring rules

| Provider | Omen reads today | API offers | Auth / failure modes | Degrades |
|---|---|---|---|---|
| Sleeper | `fetchSleeperLeague` (`sleeper.js:297`): name, season, status, `roster_positions`, `scoring_settings`, `settings.playoff_teams`, `trade_deadline`, `playoff_week_start`. Waiver system and scoring format derived (`waivers.js` `loadSleeper`, `scoringSnapshotResolver.js:216-235`). | `GET /v1/league/{id}` returns all of it; fully documented. | Public. Fails only on a wrong id (404). | Honest. |
| ESPN | `mSettings` read three ways: name + standings (`buildLeagueContext`, `espn.js:683`), scoring rules (`fetchEspnScoringSettings` `espn.js:844`, `espnScoringRules` `:763`, reproduced `appliedTotal` for 15/15 players, 1 h cache), waiver settings (`waivers.js` `loadEspn`). **Playoff-team count added by G1** (`scheduleSettings.playoffTeamCount`). Trade deadline field still **unproven** (M11A claim 3). | `view=mSettings` carries scoring items, roster slot counts (`rosterSettings.lineupSlotCounts`), schedule/playoff settings, waiver and trade settings. Community-documented, not an official API. | Private leagues need the user's `espn_s2` + `SWID`; public leagues answer without. 401/403/400 means session expired, reconnect (`espn.js:464`). No official support: field names can change without notice. | Honest on scoring (`limitations` string on waivers; `scoringFormat: null` rather than default PPR). Roster slots are not read from settings, see gap G5. |
| Yahoo | `getLeagueMetadata` (`yahoo.js:312`), raw `getLeagueSettings` (`:338`) used for waiver system (`waiverSystem.fromYahoo`, priority branch verified 2026-09-06, FAAB branch unverified) and scoring snapshot (`scoringSnapshotResolver.js:201`). **Playoff-team count added by G1** (`num_playoff_teams`, *documented, not exercised live*; extra settings call, parallel, 1.2 s cap). | `/league/{key}/settings` returns stat categories, `stat_modifiers`, `roster_positions`, `num_playoff_teams`, `playoff_start_week`, `trade_end_date` (these three *documented, not exercised*), `uses_faab`, `waiver_type` (exercised, verified 2026-09-06). | OAuth `fspt-r`. 401 refreshes; 403 has four distinct causes (entitlement, IP block, rate limit, wrong audience), `get()` attaches Yahoo's body (`yahoo.js:96-130`). | Honest where used; Yahoo `roster_positions` and trade deadline not parsed (silent, they just do not appear). |

### 2. User's roster and lineup slots

| Provider | Omen reads today | API offers | Auth / failure modes | Degrades |
|---|---|---|---|---|
| Sleeper | `buildNormalizedRoster` (`sleeper.js:769`): starters, bench, IR, taxi, projection, injury status. | `/league/{id}/rosters`, `/players/nfl` (about 5 MB, cached), `/projections`. | Public. | Honest. |
| ESPN | `buildNormalizedRoster` (`espn.js:~860`, `mTeam`+`mRoster`), slot map `LINEUP_SLOT_MAP`, `rosterFromEspnData` (`:710`), projection from `statSourceId: 1`. | `mRoster` per team with lineup slot ids, injury status, proTeam, stat rows (actual and projected). | Cookies; SWID is matched to the owner (`findUserTeam`), a user with two teams needs `espn_team_id` (stored). | Honest on missing projections (`firstFinite`, never a coerced zero). |
| Yahoo | `buildNormalizedRoster` (`yahoo.js:~150`) via `normalizeYahooRoster` (`services/roster.js`): slots, status. **`projected_points: null` always** (`yahoo.js:55`). | `/team/{key}/roster;week=N` returns slot, position, status, bye week. Per-player projections are **not confirmed** as available without `;out=stats` sub-resources. | `fspt-r`. | **Partly silent** on the roster itself. Honest on waivers and trade. |

### 3. Matchups and scores

| Provider | Omen reads today | API offers | Auth / failure modes | Degrades |
|---|---|---|---|---|
| Sleeper | `fetchSleeperMatchups` + `matchupFromMatchups` (`sleeper.js:384,473`), projected total summed from per-player projections. | `/league/{id}/matchups/{week}`. | Public. Projections endpoint failing costs only the PROJ column (`league.js` sleeperOverview). | Honest. |
| ESPN | `fetchEspnMatchup` (`espn.js:1215`, `mMatchup`+`mMatchupScore`), `fetchEspnLastResult` (`:1128`). Projected total summed from starter rows. | `schedule[]` with both sides, scores, per-side rosters. | Cookies. | Honest (`provider_failed`, `no_matchup` for a bye). |
| Yahoo | `getMatchup` (`yahoo.js:265`, `/scoreboard;week=N`): points, **projected total and win probability per side**. | Same. | `fspt-r`. | Honest. Yahoo is the only provider with win probability. |

### 4. Standings

| Provider | Omen reads today | API offers | Auth / failure | Degrades |
|---|---|---|---|---|
| Sleeper | `fetchSleeperStandings` (`sleeper.js:349`). | rosters + users. | Public. | Honest. |
| ESPN | `standingsFromEspnData` (`espn.js:~635`), rank is recomputed from W-L-PF, not read from ESPN's own rank. | `mTeam` record, `rankCalculatedFinal`. | Cookies. | Honest. |
| Yahoo | `getLeagueStandings` (`yahoo.js:425`). | `/league/{key}/standings`. | `fspt-r`. | Honest. |

### 5. All other teams' rosters (trade targets, Find a trade)

| Provider | Omen reads today | API offers | Auth / failure | Degrades |
|---|---|---|---|---|
| Sleeper | `fetchSleeperLeagueRosters` (`sleeper.js:723`): every roster with projections and `roster_positions`. Used by Trade and the Omen call. | `/league/{id}/rosters`, `/users`. | Public, 4 parallel calls, no per-team cost. | Honest; `league_not_active` when pre-draft. |
| ESPN | `fetchEspnLeagueRosters` (`espn.js:1209`): reuses the `mMatchup`+`mMatchupScore` response, so **one call returns every team**. Used by `GET /api/trade/roster` (`trade.js:609`) and the Omen call (`omenTradeCandidate.js:150`). Returns `roster_positions: []`. | Same view. | Cookies; reauth maps to `provider_reauth_required`. A bye week or missing schedule row falls back to `mTeam`'s own roster. | Honest (`reauth_required`, `rosters_unreadable`). Slots silently borrowed from the user's own lineup. |
| Yahoo | `fetchYahooLeagueRosters` (`yahoo.js:205`): standings, then one `getRoster` per team key, in parallel. Used by Trade and the Omen call. No projections, so the Omen call returns `projections_unavailable`. | `/team/{key}/roster` accepts any team in the league. | `fspt-r`. N+1 calls; one team failing yields an empty team, not a failed read (`yahoo.js:219-231`). | Honest in the Omen call; **silent partial** in Trade (an empty team looks like an empty roster). |

### 6. Free agents / waiver pool with availability

| Provider | Omen reads today | API offers | Auth / failure | Degrades |
|---|---|---|---|---|
| Sleeper | `fetchSleeperAvailablePlayers` (`sleeper.js:670`): the league's own rostered set subtracted from the player dump, so availability is the league's truth. | No direct free-agent endpoint; subtraction is the standard method. | Public. | Honest; `availabilityConfirmed` true. |
| ESPN | `fetchEspnWaiverPool` (`espn.js:584`): `kona_player_info` with `filterStatus: FREEAGENT, WAIVERS`, paginated 500 x 20 pages, sorted by percent owned. Used by `waivers.js loadEspn` and the Omen call (`omen.js:953`). Waiver deadline always null. | Same view; also `onTeamId`, waiver process dates in settings. | Cookies. Pagination overflow throws 502. | Honest; pool failure becomes `null`/"unavailable" (`omen.js` waiverSignal). |
| Yahoo | `getAvailablePlayers` (`yahoo.js:400`): `players;status=A;sort=AR;count=50`. The pool is read, but **marked unconfirmed** (`availabilityConfirmed: false`, `waivers.js:262-270`) because it has no projection. | `status=A` (available) vs `W` (on waivers) vs `FA`; sorts by rank, percent owned. | `fspt-r`. Cap 25-50 per page; no pagination loop in Omen. | Honest ("cannot rank waiver adds"). Waiver-vs-FA distinction and ownership percent not used. |

### 7. Transactions and trade history

| Provider | Omen reads today | API offers | Auth / failure | Degrades |
|---|---|---|---|---|
| Sleeper | Not read. | `GET /v1/league/{id}/transactions/{round}` (adds, drops, trades, waiver results), documented. *Documented, not exercised.* | Public. One call per round, 18 rounds for the season. | Honest (`unavailable_families: ["transactions"]`, `league.js`). |
| ESPN | Not read. | `view=mTransactions2` (and `kona_league_communication` for the activity feed) with `scoringPeriodId`. Community-documented. *Not exercised; shape unproven.* | Cookies; same failure modes as every ESPN read. | Honest. |
| Yahoo | Not read. | `/league/{key}/transactions` (add/drop/trade, `;types=` filter). Documented. *Not exercised.* | `fspt-r`. | Honest. |

### 8. Schedule and bye

| Provider | Omen reads today | API offers | Auth / failure | Degrades |
|---|---|---|---|---|
| All | Omen does **not** use the providers for the NFL schedule. It uses its own `nflSchedule.js` (calendar context) and, for opponents, the warehouse/nflverse path. Bye detection from the provider is limited to "no matchup this week" (`no_matchup` for fantasy bye, `espn.js:1108`, `yahoo.js` null matchup). | Sleeper `/players/nfl` has team only; ESPN `proTeamId` plus `proTeamSchedules` in `kona_player_info`; Yahoo roster rows carry `bye_weeks` (*documented, not exercised*). | n/a | Honest for fantasy bye. A player's NFL bye is not a provider read, so it cannot disagree with the provider. |

### 9. Injury and status

| Provider | Omen reads today | API offers | Auth / failure | Degrades |
|---|---|---|---|---|
| Sleeper | `player.injury_status` (`sleeper.js:266`), from the cached players dump (freshness depends on cache TTL). | Same. | Public. | Honest (null when unknown). |
| ESPN | `injuryStatus` mapped through `INJURY_STATUS_MAP` (`espn.js:146,331,426`), on both roster and free-agent pool. | Same, plus `active` flag. | Cookies. | Honest. |
| Yahoo | `status` / `status_full` on roster and pool rows (`services/roster.js:63,189`). | Same. | `fspt-r`. | Honest. |

### 10. Player projections

| Provider | Omen reads today | API offers | Auth / failure | Degrades |
|---|---|---|---|---|
| Sleeper | `fetchSleeperProjections` (`sleeper.js:640`) and stat lines (`:647`) from the `api.sleeper.com/projections` endpoint (not in Sleeper's public docs, widely used; this is the one repo dependency on an undocumented host). | Weekly per-player stat projections. | Public; undocumented, so it can change. Failure becomes `{}` and rows read unprojected. | Honest (no projection means no ranked move). |
| ESPN | `statSourceId: 1` rows in `mRoster` and in `kona_player_info` (`espn.js:~334,381,407`); matchup totals from `mMatchupScore`. | Same, with the league's own `appliedTotal`. | Cookies. | Honest. |
| Yahoo | **None per player.** `getProjectedStats` (`yahoo.js:378`) returns one **team** total, then `void`ed (`adapters/yahoo.js` `buildNormalizedRoster`). | The scoreboard projects a team total (read in `getMatchup`). A per-player projection route is **not confirmed**; needs a probe of `/team/{key}/players/stats` and `/league/{key}/players;...;out=stats` with projected `type`. | `fspt-r`. | Partly silent (see headline 2). |

### 11. Draft data

| Provider | Omen reads today | API offers | Auth / failure | Degrades |
|---|---|---|---|---|
| Sleeper | `fetchSleeperLeagueDrafts`, `fetchSleeperDraft`, `fetchSleeperDraftPicks` (`sleeper.js:825-870`), routed in `routes/sleeper.js:98-146` (live draft state). | `/league/{id}/drafts`, `/draft/{id}`, `/draft/{id}/picks`. | Public. | Honest. |
| ESPN | Not read (draft assistant uses ADP data, not the user's ESPN draft). | `view=mDraftDetail`. *Not exercised.* | Cookies. | Honest ("no draft source"). |
| Yahoo | ADP only via `getDraftAnalysis` (`yahoo.js:416`, `services/adp.js:340-356`). The league's own draft results are not read. | `/league/{key}/draftresults`. *Not exercised.* | `fspt-r`. | Honest. |

## What fails for private or restricted leagues

| Provider | Failure | Today |
|---|---|---|
| ESPN private league, no cookie | 401/403 (sometimes a 302 or 400 on the fan directory). | Mapped to `provider_reauth_required` / `reauth_required`; users are asked to reconnect (`espn.js:464-494`, `trade.js:618`). Honest. |
| ESPN cookie expiry mid-season | Same as above; cookies live about a year but ESPN can invalidate them. | Honest. No proactive refresh is possible; there is no ESPN OAuth. |
| ESPN changes kona field names or views | Parsers return null/empty. | Mostly honest (defensive parsing), but nothing alerts; every ESPN "unproven" claim in M11A depends on a live probe. |
| Yahoo token expiry | 401 triggers refresh; refresh failure reads `yahoo_token_expired`. | Honest. |
| Yahoo rate limit / entitlement / IP block | 403 or 999 with distinct bodies. | Reported to Sentry with body (`yahoo.js:130`); the user sees a generic provider failure. |
| Yahoo league-roster fan-out | N+1 calls under rate limit. | One team failing yields an empty team (silent partial). |
| Sleeper league private? | Sleeper leagues are not private to the public API. | n/a |
| Sleeper `projections` host unavailable | `{}`. | Honest (unprojected). |

## Ranked gap list

Effort: S = under a day, M = 1-3 days, L = more than 3 days or needs founder-side probe. "Unlocks" names user-visible
features.

| # | Gap | Effort | Unlocks | Status |
|---|---|---|---|---|
| G1 | **Playoff-team count for ESPN and Yahoo** (cut line, "X games clear of the cut", standings-derived activity). ESPN is free (already in `mSettings`); Yahoo is one parallel settings call. | S | League table cut line and Activity items on ESPN and Yahoo; fixes the "cut line under your own row" lie for those two providers (needs the iOS side to read `playoff_picture.settings_known`, already in the contract). | **Shipped in this PR.** Live shape of ESPN `scheduleSettings.playoffTeamCount` is unproven, so a missing field leaves the cut line unclaimed. |
| G2 | **Yahoo per-player projections** (probe `players/stats` sub-resources; if absent, a warehouse-based projection fallback). | M-L (probe needs the founder's Yahoo session) | Yahoo trade calls, waiver ranking, start/sit ranking, "The Gridiron Corps" Omen call. By far the largest user-visible gap. | Open. Needs a probe first. |
| G3 | **League-screen "Trade targets" section** from the existing league-roster reads, rendered on the cached overview. Adds a field to `league-overview.v1` (additive). | M | Closes the "trade targets unavailable" League item for Sleeper and ESPN; Yahoo only once G2 lands (no projections). | Open. All three provider reads exist. Hot-path cost: the roster read must be off the overview request or cached. |
| G4 | **Transactions feed** (Sleeper first: public, documented, one call per round; then Yahoo `/transactions`; ESPN `mTransactions2` last, shape unproven). | M for Sleeper, M each for the others | League Activity: adds, drops, trades, waiver results; trade-history evidence; "the wire". | Open. Honest `unavailable` today. |
| G5 | **Yahoo/ESPN `roster_positions` for the league** (ESPN `rosterSettings.lineupSlotCounts` from `mSettings`; Yahoo `roster_positions` in settings). Today the trade solver borrows the user's own slots, which is wrong when the user has an empty or unusual slot. | S-M | More accurate trade lineups and waiver fit on ESPN and Yahoo. | Open. |
| G6 | **Yahoo waiver vs free agent distinction and ownership percent** (`status=W`/`FA`, percent owned), and pagination beyond one page of 50. | S | Waiver Watch honesty and "available" labels on Yahoo. Ranking still needs G2. | Open. |
| G7 | **Waiver deadline and trade deadline** from settings (Sleeper has `trade_deadline` as a week; ESPN claim 3 unproven; Yahoo `trade_end_date` is a date), plus week-to-date conversion (screen matrix S5-7). | M | League deadlines, "Deadline in N days" signal. | Open. |
| G8 | **Per-team failure surfacing in Yahoo league rosters** (return a `read_failed` flag instead of an empty team) and a time budget on `GET /api/trade/roster`. | S | Honest Trade for Yahoo; protects latency. | Open. |
| G9 | **ESPN and Yahoo draft results** (`mDraftDetail`, `draftresults`). | M | Draft recap, keeper and ADP-vs-pick evidence; low priority for the beta. | Open. |

## Gap G1 as shipped

- `src/adapters/espn.js`: `playoffTeamCountFromEspnData` and `buildLeagueContext` now returns `playoff_teams`
  (from the `mSettings` payload already requested; no new ESPN call).
- `src/services/yahoo.js`: `YahooClient#getPlayoffTeamCount` reads `num_playoff_teams` from the verified
  `league[1].settings[0]` shape, returns null on any error.
- `src/routes/league.js`: both overviews pass the count to `playoffPicture` and `standingsActivity`. The Yahoo settings
  read starts beside the matchup read, so it adds no serial latency, and is capped at 1.2 s so it can never hold the
  overview. The overview is response-cached, so the extra Yahoo call is paid once per cache window.
- Contract: no change to `league-overview.v1`. `settings_known`, `cut_line_note` and `activity` already exist; they now
  fill for ESPN and Yahoo. The recorded contract fixtures changed (`test/contracts/fixtures/league-overview.v1/200.shape1,5,6,7` re-recorded, `shape8-11` added): ESPN and Yahoo overviews now carry a populated `playoff_picture` (`settings_known: true`) and standings-derived `activity`. That is additive field population, reviewed as an API change; the schema lock (`scripts/contracts.js`) needed no change. Verified as CI does: `npm test` with the recorder, then `node scripts/contract-recorded.js compare <dir>` reports `fixtures current (141)`.
- Sentry: the Yahoo settings read for the playoff count passes `{ report: false }`, so a persistent settings 403 does not report once per uncached overview; the waiver-path settings read still reports.
- Tests: `test/providerPlayoffTeams.test.js` (parsers) and four cases in `test/leagueOverviewRoute.test.js`.
- Unverified live: ESPN `scheduleSettings.playoffTeamCount` and Yahoo `num_playoff_teams` need one read against a real
  league (device walk 2). If either is absent the cut line stays unclaimed, exactly as before.
