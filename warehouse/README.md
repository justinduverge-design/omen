# Football warehouse

Omen's own football database: a private PostgreSQL 17 database on KVM1, separate from Supabase. It holds
public, rebuildable football facts and Omen's own numbers. It never holds user, league, credential, Ledger or
saved-trade data; those stay in Supabase.

## Layers

| Layer | What it holds |
|---|---|
| ledger | Ingest receipts and schema versions: how data got here |
| identity | Teams, players, coaches, and every provider ID (ESPN, Yahoo, Sleeper, GSIS) mapped to one player |
| facts | nflverse games, rosters, weekly stats, play-by-play back to 1999, weather and injury reports. Never edited by Omen |
| provider | Third-party projections. Stored, labelled and kept separate |
| sight | Omen's own versioned metrics (Sight), graded against what happened |

## This folder

| Path | What it holds |
|---|---|
| `migrations/` | Numbered schema migrations (`0001`... `0024`) |
| `map/` | The table-by-table routing map, generated from `map/catalog.json` by `node scripts/warehouse-map.js write`. CI checks it against the migrations and the code |
| `test/` | Integration tests for the ingest writers |
| `verify/` | Read-only production checks |

Ingest and metric code: `src/services/footballWarehouse/`. Deploy, schedule, backup and restore:
`infra/warehouse/`. Design: `Blueprints/architecture/omen-football-warehouse-v1.md`.

Ingest runs every day at 07:15 ET, after nflverse publishes. A successful ingest triggers an encrypted backup to
KVM2, and a restore is proven weekly (`infra/schedule/TIMERS.md`).
