<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.game_weather_forecasts

Forecast wind, cold and rain for upcoming games, so Sight reads the next game with the weather it was trained on.

| | |
|---|---|
| Layer | facts: What happened on the field, from public nflverse data. Never edited by Omen. |
| Grain | one row per (game, fetch) |
| Source | Open-Meteo forecast API (CC BY 4.0), stadium coordinates from src/data/stadiums.json |
| Refresh | daily 07:15 ET, games kicking off in the next 10 days |
| Created by | migration 0015 |

## Known gaps

- Retractable roofs: open or closed is unknown in advance; stored as retractable with the outdoor forecast.
