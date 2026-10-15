# Provider matrix against the live database — 2026-10-15

Matrix: `Blueprints/specs/football-data/provider-capability-matrix.json` (view: `.md`). Database: Supabase
project `xyudxfhqejbwvjngiwhw`, read-only queries on 2026-10-15. Nothing was changed.

## What the matrix said versus what was believed

1. **No machine-readable matrix existed.** PR 670 (`codex/build-12`) changes no provider-matrix file. The only
   matrix on `main` was prose (`omen-provider-capability-matrix-v1.md`, #648), written 2026-10-11 from a code read
   with nothing run live. The JSON file above is new and is built from current source.
2. **The prose matrix is stale on its headline.** It said Yahoo has no per-player projection. On `main`,
   `src/services/yahooProjections.js` derives one from Sleeper's public stat line, matched on the Yahoo id and scored
   with the league's own rules. The matrix now records `yahoo/player_projections` as `degraded: derived_projection`.

## Mismatches between the matrix and the database

| # | Claim | Database | Cause |
|---|---|---|---|
| 1 | Brief: "7 of 9 connections `unknown`, all sleeper" | 7 `unknown`: 3 sleeper, 3 espn, 1 yahoo. 2 `valid`: 1 espn, 1 yahoo | The brief miscounted. Sleeper has no credential, so it can never become `valid`. |
| 2 | `yahoo/league_scoring_rules` is `available` (rules are derivable) | 0 of 2 Yahoo leagues have stored rules | **No app code writes `league_scoring_rules`.** The 3 rows (1 espn, 2 sleeper) are the one-time step 11 backfill from `moves.scoring_contract`, ingest event 2026-10-03. Yahoo had no league-scoped move to copy. Redo spec §7 code ticket 6 was never built. |
| 3 | Same, sleeper | 2 of 3 stored | Same cause. |
| 4 | Same, espn is `degraded: provider_restricted` | 1 of 4 stored | The stored row is a backfill, unrelated to the restriction. Both gaps exist, for different reasons. |
| 5 | (not a matrix capability) credential health | `unknown` means never re-checked | `credential_state` becomes `valid` only inside `connection_store_espn`, `connection_store_yahoo` and `connection_rotate_yahoo`. Nothing in `src/` writes `needs_reauth` or re-validates a stored credential. A stale ESPN cookie therefore still reads `valid`. |
| 6 | `yahoo/player_projections` depends on a Yahoo id match | `player_provider_ids`: yahoo 1180, all `provider_supplied` | Omen never matched Yahoo ids itself. They come from the `yahoo_id` field on Sleeper's player list, so coverage is capped by that field. Open for task 5 (is it the source's coverage or lazy population). |
| 7 | (identity) sleeper | 2195 ids: 2160 `name_birth_date`, 35 `provider_supplied`; 56 unresolved (51 `no_match`, 5 `conflict`) | Lead for task 5. |

## What this changes

- Scoring rules are a **missing writer**, not a provider degradation. Wiring the app to write a league's rules when
  its scoring hash is new is a bigger lever than any index.
- Credential health needs a writer for failure and for periodic re-check before `credential_state` means anything.
  It is runtime state, so it is deliberately not a matrix row.
- `last_verified` in the matrix is a code-level date (2026-10-15), except three entries tied to live proofs
  (Sleeper `playoff_settings`, 2026-08-29). No ESPN or Yahoo entry has been exercised live by this work.
