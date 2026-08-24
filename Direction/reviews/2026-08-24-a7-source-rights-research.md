# A7 — Football scoring data integration research

**Date:** 2026-08-24
**Decision:** admit only the nflverse CC BY release allowlist for automated football-event collection. This is research only; no provider connection, collector, credential, timer, dependency, or production change is authorized.

## Context

Omen needs completed NFL event facts for a full-league scoring engine, plus private provider rules/outcomes only where the provider has authorized that use. Constraints: free indefinitely; no paid fallback; no scraping; commercial rights and automation must be affirmative; a result must survive correction/replay; all football subject types must be representable.

## Candidates evaluated

### nflverse-data release assets

- **Availability / auth:** open release assets; no auth for the proposed small number of scheduled downloads.
- **Commercial terms:** CC BY 4.0 for the repository/database; retain attribution and admit only the named release families after annual revalidation. [Licence](https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md).
- **Coverage / cadence:** `pbp`, `stats_player`, `stats_team`, schedules, players and rosters; nightly updates after game days and a Thursday correction refresh are documented. [Availability schedule](https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html).
- **Identifiers:** GSIS player IDs and `game_id`, with season/week/game-type dimensions.
- **Rate / automation:** no source-specific cap published; release download use is bounded to the architecture’s daily/Tuesday/Thursday schedule.
- **Complexity / score:** medium / **5 of 5**. The lawful automated source now.

### Sleeper API

- **Availability / auth:** public, read-only API; no token.
- **Commercial terms:** free use is explicitly non-commercial; commercial use requires direct licensing. [Official introduction](https://docs.sleeper.com/).
- **Coverage / cadence:** league `scoring_settings`, rosters, and matchups; official docs expose `points` and `custom_points` on matchups.
- **Identifiers:** Sleeper league, roster, user, and player IDs.
- **Rate / automation:** general guidance is fewer than 1,000 calls/minute.
- **Complexity / score:** easy technically, but rights-blocked / **1 of 5**. Exclude until the founder’s written licensing request receives a scope-sufficient approval.

### Yahoo Fantasy Sports API

- **Availability / auth:** official OAuth API; Omen has an adapter, but its live application entitlement remains refused.
- **Commercial terms:** an executed read-only agreement exists, but the current terms/attribution/retention interpretation needed for complete rule snapshots and derived reconciliation is not yet recorded as sufficient.
- **Coverage / cadence:** league settings, scoring modifiers, and user-authorized league resources are the intended model; entitlement failure means coverage cannot be treated as available.
- **Identifiers:** Yahoo game, league, team, and player keys.
- **Rate / automation:** rate limits are provider-controlled; no production schedule is proposed.
- **Complexity / score:** medium / **2 of 5**. Do not admit until entitlement works and counsel/founder confirms the specific use and attribution.

### ESPN / Disney endpoints

- **Availability / auth:** existing cookies technically support a narrow league integration.
- **Commercial terms:** Disney terms are prohibitive for the needed commercial automated access/copying/extraction. [Terms](https://disneytermsofuse.com/english/).
- **Coverage / cadence:** existing adapter requests settings but normalizes only receptions; no supported commercial scoring/reconciliation interface or correction SLA is established.
- **Identifiers / rate:** ESPN-specific player/team/game IDs; no supported public automation limit.
- **Complexity / score:** hard and prohibited / **1 of 5**. Exclude; report `provider_restricted`, never scrape or extend extraction.

### BALLDONTLIE NFL API

- **Availability / auth:** official API key and paid NFL plans.
- **Commercial terms:** official terms permit the relevant automation, storage, archive, derivative, and commercial fantasy uses through the service interface. [Terms](https://www.balldontlie.io/terms.html).
- **Coverage / cadence:** NFL stats/fantasy products; best-effort correction timeliness.
- **Identifiers / rate:** vendor IDs; NFL plan limits are tiered (including a paid 600/minute tier). [NFL plans](https://nfl.balldontlie.io/).
- **Complexity / score:** easy / **3 of 5**. Lawful fallback, excluded because the founder rejected a paid subscription.

### FantasyPros API and SportsDataIO

- **Availability / auth:** API-key commercial products.
- **Commercial terms:** FantasyPros requires a commercial plan for production/redistribution/history; SportsDataIO’s hobby/discovery access is not a commercial redistribution licence. [FantasyPros](https://www.fantasypros.com/api-data/), [SportsDataIO](https://sportsdata.io/developers).
- **Coverage / cadence:** broad player/team facts, but correction/SLA rights are commercial-contract matters.
- **Identifiers / rate:** vendor IDs and tier/contract-limited access.
- **Complexity / score:** easy technically, paid/licence-gated / **2 of 5**. Exclude under the no-paid-fallback decision.

## Ranked summary

| Category | Winner | Runner-up | Notes |
|---|---|---|---|
| Best open/free | nflverse-data | None admitted | Only candidate with the needed affirmative open licence. |
| Best value | nflverse-data | BALLDONTLIE | BALLDONTLIE is lawful but paid. |
| Best overall | BALLDONTLIE | licensed Sleeper | Both require a founder cost/licensing decision before use. |

## Actionable recommendation

**Build against:** only the nftverse release allowlist in `2026-08-24-a7-owned-football-data-pipeline.md`: immutable `pbp`, `stats_player`, `stats_team`, schedule, player and roster snapshots, with attribution and source-family review before each season.

**Skip:** Sleeper until written commercial scope; Yahoo until entitlement plus terms/attribution confirmation; ESPN absent express written permission; BALLDONTLIE, FantasyPros, and SportsDataIO absent a new paid decision.

**Phase 1:** local, non-production content-addressed snapshot/manifest replay against the admitted source.
**Phase 2:** add a provider only after its affirmative right covers settings retrieval, retention, normalization, calculation, reconciliation, and applicable attribution.
**Implementation notes:** no request may be scheduled before the separate collector approval; unknown terms are exclusion, not fallback; event facts never imply authority to copy provider rules; ADP requires its own source-rights review.
