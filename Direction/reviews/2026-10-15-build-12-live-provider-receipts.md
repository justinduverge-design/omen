# Build 12 live provider receipts (sanitized)

**Date:** 2026-10-15 · **Method:** `scripts/probe-provider-leagues.js`, read-only, one founder account with
Sleeper, ESPN and Yahoo leagues connected, through the same adapters Trade uses. League ids appear as a
6-character hash. No credentials, tokens, cookies, team names or player names were recorded.
**Assumption to confirm:** the account was chosen as the only Apple-sign-in account with all three
providers connected (the founder's email did not match any account exactly).
Evidence state for everything below: `LIVE-SERVER-READ` (real provider responses via the server path,
single run, week 6). Not a device walk; phone certification remains `UNPROVEN`.

| League | Teams | Players read | Unreadable teams | With projection | Real starting slots read |
|---|---|---|---|---|---|
| Sleeper `9aa00e` | 10 | 173 | 0 | 160 | 16 (already) |
| ESPN `3db81d` | 12 | 172 | 0 | 172 | 8 (was 0 before this pass) |
| Yahoo `6c3d33` | 12 | 186 | 0 | 47 before, **157 after** | 9 (was 0 before this pass) |

Remaining unprojected Yahoo players: 15 team defenses (Sleeper publishes no defense stat lines), plus
about 14 skill players with no stat line or no unique name+position+team match.

| Check | Result |
|---|---|
| ESPN waiver system | determined as FAAB (priority branch not seen live) |
| Yahoo waiver system | determined as priority (FAAB branch not seen live) |
| ESPN waiver pool | 843 players, 449 with a projection |
| Yahoo waiver pool | 25 returned of 50 requested before; **50 after paging** (40 projected) |
| Trade/lineup lock flags (ESPN) | present on the read path; 0 locked this run |

## What the live run changed

1. ESPN and Yahoo trade math used the user's own lineup as the league's slot list. Both now read the
   league's real starting slots from provider settings.
2. Yahoo's flex slot name (`W/R/T` and relatives) was not in the lineup solver's flex table, so Yahoo flex
   slots could not be filled in trade math. Fixed.
3. 133 of 139 unprojected Yahoo players were absent from Sleeper's `yahoo_id` map. A strict unique
   name+position+team fallback raised coverage from 47 to 157 of 186.
4. Yahoo's available-player read returned 25 players however many were requested. It is now paged.
5. The matrix claimed ESPN waiver detection was pending a probe; it reads as determined on this league.

## Not covered

One account, one run, one week; no second ESPN/Yahoo league; priority-branch ESPN and FAAB-branch Yahoo
unseen; warehouse not involved in any of these reads (no warehouse service was touched).
