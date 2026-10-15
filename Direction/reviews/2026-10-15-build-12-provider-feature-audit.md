# Build 12 provider × feature audit

**Date:** 2026-10-15 · **Branch:** `codex/build-12` (PR #670, with #671's matrix and step-16 source merged in)
**Rule:** a gap here is a missing Omen implementation unless the matrix says `provider_restricted`.
Evidence states: `PASS-CONTRACT` (source + automated tests), `UNPROVEN` (needs the founder's connected
leagues on a device or an authenticated server read), `NOT-APPLIED` (source only).

## Changed in this pass

| Change | Feature | State |
|---|---|---|
| Yahoo per-team roster read failure is flagged (`read_status: "unreadable"`, `unreadable_team_ids`) instead of becoming an empty team. Trade skips the team; an unreadable own roster reports `rosters_unreadable`. The candidate result carries `teams_unreadable`. | Trade, Find a Trade, weekly Omen trade branch | `PASS-CONTRACT` |
| ESPN `lineupLocked` / `rosterLocked` / `tradeLocked` are read onto each player (`lineup_locked`, `roster_locked`, `trade_locked`; absent = unknown, never "unlocked"). The trade search never proposes a trade-locked player on either side. | Trade, Find a Trade | `PASS-CONTRACT` |
| #671 provider matrix, generator and drift test reconciled onto #670; matrix updated for the two changes above. | all | `PASS-CONTRACT` |
| Step-16 projection-log indexes carried as source. | data layer | `NOT-APPLIED` |

Full suite on the branch: 2421 tests, 0 failures.

## Feature × provider, what is built and what is still open

| Feature | Uses today | Open (Omen-side unless noted) |
|---|---|---|
| Trade / Find a Trade | All three providers' league-wide rosters, derived Yahoo projections, ESPN trade locks, per-team read flag. | Roster slots are borrowed from the user's lineup for ESPN and Yahoo (`borrowed_from_user_lineup`); ESPN `eligibleSlots` and settings view would give the real slot list. Sleeper/ESPN/Yahoo transactions and Sleeper `traded_picks` are not read. |
| Waiver | Sleeper full pool; ESPN pool and waiver signals; Yahoo available players with derived projection. | ESPN and Yahoo waiver system stay `not_determined` until a live probe (`probe_pending`, Yahoo FAAB unverified). ESPN `percentOwned` unused. `lineup_locked` is read but Waiver does not act on it yet. |
| Start/Sit | Roster projections on all three providers, injury status. | `lineup_locked` / `roster_locked` not yet used to stop a recommendation for a locked player. Sleeper practice/injury notes need a founder rights decision. |
| Weekly Omen | All of the above; Yahoo uses derived projections, not a whole-feature disable. | Same lock and slot gaps. |
| League | Settings, standings, matchup, playoff settings. | Transactions are not read on any provider (`not_read_by_omen`). |
| Command | Reads the same connections. | Inherits the gaps above; no provider-specific disable found. |
| Ledger | Records recommendations. | League scoring rules have no app-side writer and credential health is not persisted. These are missing Omen code, not provider limits (#671 DB reconciliation). Deferred by the Build 12 scope; production Ledger scoring is excluded from this release gate. |

## Live provider proof

**Not performed.** Authenticated reads of the founder's connected ESPN, Yahoo and Sleeper leagues require
production credentials held in the production database or on the device. This session did not extract or
use them, and nothing in this document is derived from private league data. Every `PASS-CONTRACT` above
is fixture-based. The sanitized receipts needed (counts, field presence, status codes only) are listed
in the PR for the next step, which needs the founder's go-ahead on how the server read is run.
