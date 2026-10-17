<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.game_weather_observed

What the weather actually was for every game, including rain, for Sight's weather and team-elements layers.

| | |
|---|---|
| Layer | facts: What happened on the field, from public nflverse data. Never edited by Omen. |
| Grain | one row per played game |
| Source | Open-Meteo historical archive (CC BY 4.0), venue coordinates from src/data/stadiums.json |
| Refresh | daily 07:15 ET (backfill 1999 onward, then new games) |
| Created by | migration 0017 |

## Known gaps

- Retractable roofs use the game's recorded roof state when nflverse has it; otherwise the outdoor reading.
