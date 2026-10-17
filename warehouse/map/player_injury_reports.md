<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.player_injury_reports

Injury status and body part for every player, so Start/Sit can weigh an injury the league's provider did not report.

| | |
|---|---|
| Layer | facts: What happened on the field, from public nflverse data. Never edited by Omen. |
| Grain | one current row per injured player |
| Source | Sleeper public player list (same daily download as the player index); founder-approved 2026-10-17 |
| Refresh | daily 07:15 ET, with the player index |
| Created by | migration 0023 |

## Known gaps

- Once a day: a Sunday-morning inactive is not seen until the next run.
- Sleeper's practice fields are often empty.
