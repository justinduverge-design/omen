# Trade Components

Tier 2 landing zone for extracting reusable Trade Analyzer pieces.

Current product decision:
- User-facing Phase 1 fields are Position and Name.
- Projection and Status are intentionally Omen-owned analysis/enrichment signals, not user-entered fields.
- Static autocomplete uses `frontend/src/data/nflPlayers.js`.

Future backend Phase 2:
- `GET /api/players/search`
- `GET /api/trade/pulse`
