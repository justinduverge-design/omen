# Move History Components

Tier 2 landing zone for Hall of Records / Move History UI.

Canonical backend contract:
- `GET /api/moves`
- Contract version: `moves-history.v1`

Expected states:
- loading
- success with summary and move rows
- empty
- error

Use backend `summary`; do not recompute W/L totals on the client.
