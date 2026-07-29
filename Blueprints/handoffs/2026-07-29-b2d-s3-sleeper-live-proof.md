# B2-D-S3 Sleeper live roster-subtraction proof — 2026-07-29

## Result

**PASS.** The public, read-only verifier ran against founder-provided drafted Sleeper league `1387633793615036416`.

| Observation | Result |
| --- | --- |
| League status | `IN_SEASON`, 8 teams, season 2026 |
| Rostered league-wide | 120 players |
| Available waiver pool | 3,174 players |
| Players with projections | 415 |
| Unknown projections | Sorted last |
| Rostered-player leaks | 0 |

The script exited 0 and reported `S3 PROVEN — roster subtraction verified against a drafted league.`

## Boundary

The probe used Sleeper’s public GET endpoints only. It did not read a browser session, inspect credentials, alter a roster, add/drop a player, deploy code, or run GitHub Actions. This is real-provider capability proof for Sleeper roster subtraction, not a transaction or production-release claim.
