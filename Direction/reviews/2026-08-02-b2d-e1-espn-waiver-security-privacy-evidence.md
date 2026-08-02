# B2-D-E1 ESPN Waiver Adapter — Security & Privacy Evidence

**Date:** 2026-08-02  
**Scope:** `src/adapters/espn.js` and fixture-only adapter tests in `test/espnAdapter.test.js`.  
**Commit:** `2748a5c` (local only; not pushed, merged, deployed, or provider-proven).

## Sources reviewed

- `Blueprints/specs/b2d-espn-e1-waiver-pool-v1.md`
- `Blueprints/specs/b2d-espn-e0-verdict-v1.md`
- `src/adapters/espn.js`
- `test/espnAdapter.test.js`

## Data and control review

| Boundary | Control and evidence |
| --- | --- |
| ESPN cookies | Existing server-only adapter inputs remain inputs only. This slice did not inspect, print, persist, or expose a credential value. Tests use non-secret placeholders. |
| Provider request | The player filter is serialized only into `x-fantasy-filter`; request logging continues to omit query strings. No live provider request ran in this session. |
| Availability ownership | Every normalized candidate must have `onTeamId === 0`, including nested `playerPoolEntry` payloads. The fixture test excludes a rostered entry. |
| Scoring data | Only `statSourceId === 1` for the requested period can become `projected_points`; actual stat source `0` remains unavailable rather than being relabeled. |
| Storage and sharing | No cache, SQL, telemetry, route, client, or external share path was added. Raw ESPN response bodies are not persisted by this slice. |

## Classification and residual gaps

ESPN cookies remain restricted authentication secrets; league/player-pool data is provider-scoped product data; normalized player names, positions, injury state, team abbreviation, and projected points remain application data. No classification, consent, retention, RBAC, or sharing rule changed because E1 stays inside the existing server adapter and has no caller in canonical Omen.

The fixture suite proves source-code behavior only. Drafted-league roster-subtraction proof remains `B2-D-E3`, founder-executed under `Blueprints/specs/b2d-espn-observation-12-resolution-protocol-v1.md`. No transaction, credential capture, or production action is authorized by this evidence.
