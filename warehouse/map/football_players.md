<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.football_players

Every NFL player with position and birth date. Rookies arrive here when nflverse lists them; retired players stay.

| | |
|---|---|
| Layer | identity: Who and what: teams and players, and every provider id that points at them. |
| Grain | one row per NFL player ever (GSIS) |
| Source | nflverse players |
| Refresh | daily 07:15 ET |

## Known gaps

- No per-season status (rookie, active, practice squad, IR, retired): derived from nfl_weekly_rosters today, not stored.
