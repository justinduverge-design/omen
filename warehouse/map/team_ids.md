<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.team_ids

The team index: provider team and defense codes (Sleeper PHI, ESPN -16012, Yahoo 100033) point at one Omen team.

| | |
|---|---|
| Layer | identity: Who and what: teams and players, and every provider id that points at them. |
| Grain | one row per (provider, provider code, team or defense) |
| Source | provider team numbering and codes, verified against live leagues (migration 0011) |
| Refresh | on migration |
| Created by | migration 0011 |

## Known gaps

- None known.
