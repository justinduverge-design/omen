# API contract tests (S0)

Guards the public API shapes the native screens depend on, so a server or client change cannot break a screen quietly. Built as S0 of `Blueprints/rebuild/omen-call-slice-plan.md`; rules in `Blueprints/specs/omen-decision-engine-v2.md` ("Keeping the API from breaking again").

| Piece | Where | What it does |
|---|---|---|
| Schema | `schemas/<contract>.schema.json` | What the server may send. Extra fields are allowed (additive change is safe); required fields, types, allowed values and per-state rules are enforced. |
| Fixtures | `fixtures/<contract>/<state>.json` | Real server output, one per reachable state, generated from the production builders with volatile fields fixed. |
| Lock | `lock/<contract>.lock.json` | Every path in the schema with its type, whether it is required, and its allowed values. |
| Tests | `test/contractSchemas.test.js` (server); `OmenDecisionViewModelTests` in `OmenDecisionTests.swift` (iOS) | Server: fixtures validate, the schema rejects breaking mutations, the lock is intact, fixtures are current. iOS: the SAME fixture files decode and map to the right screen state. |

## Commands

```bash
node scripts/contracts.js fixtures   # regenerate fixtures from the code; review the diff as an API change
node scripts/contracts.js lock       # regenerate the lock from the schema; see the rule below
node scripts/contracts.js check      # fail if fixtures or lock are out of date (also run by `npm test`)
```

## The rule

Within a contract version the API is **additive only**. You may add optional fields, new capability entries and new allowed values. You may not remove, rename, retype or loosen (required → optional) anything, or remove an allowed value. The lock test fails if you do. **Regenerating the lock to make it pass is the act the lock exists to prevent**: a breaking change needs a new contract version served alongside the old one.

## Known gaps (not covered, on purpose stated)

- **Live-mode payloads.** The mock builder can only produce `limitation` evidence and cannot reach `pending_live_engine`, `yahoo_reauth_required`, `sleeper_league_context_missing`, `context_unavailable` or the three `espn_*` recovery states (it returns a success body for some; a fixture whose body state differs from its name is refused). Those states are listed in `contractSchemas.test.js` and need the seeded-league harness.
- **Contracts beyond `omen-decision-brief.v3`.** `start-sit-detail.v1/v2`, `waiver-analysis.v1`, `trade-compare.v2`, `moves-history.v2` are next. Note `canvas-contract-requirements-v1.json` names `start-sit-detail.v1` for the Start/Sit screens while `decision-capabilities-v1.md` puts the evidence on v2; both versions must be locked and the requirements file corrected.
- **iOS only.** Android decoders are paused (`Direction/decision_log.md`, 2026-09-30).
- **A real production response** has not yet been validated against the schema (needs an authenticated request for the founder's league).
