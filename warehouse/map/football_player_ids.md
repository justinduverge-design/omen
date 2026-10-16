<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.football_player_ids

The player index: every provider id (GSIS, ESPN, Sleeper, Yahoo) pointing at one Omen player. Grading, usage and projections resolve through it.

| | |
|---|---|
| Layer | identity: Who and what: teams and players, and every provider id that points at them. |
| Grain | one row per (provider, provider id) |
| Source | nflverse players (GSIS, ESPN) and the Sleeper player list (Sleeper, Yahoo, matched by GSIS) |
| Refresh | daily 07:15 ET |

## Known gaps

- A Yahoo id is indexed only where Sleeper lists it; players Sleeper does not map stay unindexed for Yahoo.
