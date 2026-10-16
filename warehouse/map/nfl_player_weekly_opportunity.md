<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.nfl_player_weekly_opportunity

Usage: snaps, routes, carries, targets, red-zone and goal-line work, deep targets.

| | |
|---|---|
| Layer | facts: What happened on the field, from public nflverse data. Never edited by Omen. |
| Grain | one row per (season, week, season type, player) |
| Source | derived from nfl_plays by the ingest |
| Refresh | daily 07:15 ET, after plays |

## Known gaps

- Snap counts carry an open rights review; readers select opportunity counts only.
