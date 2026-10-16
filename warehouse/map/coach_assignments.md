<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.coach_assignments

The coach graph: who was head coach, coordinator or assistant head coach for which team each season.

| | |
|---|---|
| Layer | facts: What happened on the field, from public nflverse data. Never edited by Omen. |
| Grain | one row per (coach, team, season, role) |
| Source | Wikipedia team-season staff lists (CC BY-SA facts, title + revision kept) |
| Refresh | daily 07:15 ET |
| Created by | migration 0013 |

## Known gaps

- Play caller is not listed on the pages; inferred scheme influence (Scheme DNA) is a later edge type.
- Pages that omit a staff section leave that team-season without assignments.
