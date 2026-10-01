# API contract tests (S0)

Guards the public API shapes the native screens depend on, so a server or client change cannot break a screen quietly. Built as S0 of `Blueprints/rebuild/omen-call-slice-plan.md`; rules in `Blueprints/specs/omen-decision-engine-v2.md` ("Keeping the API from breaking again").

| Piece | Where | What it does |
|---|---|---|
| Schema | `schemas/<contract>.schema.json` | What the server may send. Extra fields are allowed (additive change is safe); required fields, types, allowed values and per-state rules are enforced. |
| Fixtures | `fixtures/<contract>/<state>.json` | Real server output, one per reachable state, generated from the production builders with volatile fields fixed. |
| Lock | `lock/<contract>.lock.json` | Every path in the schema with its type, whether it is required, and its allowed values. |
| Tests | `test/contractSchemas.test.js` (server); `OmenDecisionViewModelTests` in `OmenDecisionTests.swift` (iOS) | Server: fixtures validate, the schema rejects breaking mutations, the lock is intact, fixtures are current. iOS: the SAME fixture files decode and map to the right screen state. |

## What is protected (31 contracts, 127 fixtures)

`omen-decision-brief.v3` (built from the mock builder; `scripts/contracts.js`) and 30 more listed in `registry.json`: the dashboard, league overview/directory/selection, moves history and receipt, platform provider state, quiet week, session, start/sit detail v1 and v2, trade compare/roster/share/capabilities, waiver analysis, account export/delete, beta report, the min-version gate, the ESPN and Sleeper connect routes, and the degraded-state (`*-error.v1`) contracts the screens render. Each has a schema, fixtures, and a lock.

**Where fixtures come from.** Not hand-written. `scripts/contract-recorder.js` is preloaded into the ordinary test run and records every JSON response the real routes send (real handlers, the tests' own stubs). `scripts/contract-synthetic.js` adds bodies built directly by the pure production builders (quiet week, start/sit, waiver) for states no route test reaches. Up to 12 structurally different examples per state are kept, so nullable and optional fields show up in the record. Schemas were inferred from the fixtures, reviewed, and their `state`/`status` enums completed from the server's own constants (`schema-overrides.json`).

**Unversioned routes.** Four routes send no `contract_version` (`espn-connect.v1`, `sleeper-resolve.v1`, `sleeper-connect.v1`, `platform-disconnect.v1` here are names, matched by route). Adding the field is additive and recommended.

## Findings the first pass produced

1. **An expired ESPN connection showed "update the app".** iOS read the recovery message from a field v3 no longer sends. Fixed and locked.
2. **Every FAAB and priority waiver league rendered as "not determined" on iOS.** The app renders a budget or claim order only from `waiver_system.budget_text` / `order_text`; the server never sent them. The server now composes both (additive), so "Your budget $80 of $100" can appear. Found by an "always-nil" probe: decode every fixture with the app's own types and list the properties that are nil in all of them.
3. Naming mismatches in `canvas-contract-requirements-v1.json`: `active-league.v1` is `league-active-selection.v1` on the server; Start/Sit screens name `start-sit-detail.v1` while the evidence is on v2.
4. Three fixtures in the first draft were `success` bodies under other state names (mock builder limits); the generator now refuses a fixture whose state does not match its name.

## Commands

```bash
node scripts/contracts.js fixtures   # regenerate the brief's fixtures from the code; review the diff as an API change
node scripts/contract-recorded.js record   # re-record every other contract's fixtures from the route tests
npm run contracts:check              # both checks; `record` and `schemas --force` are for deliberate changes only
node scripts/contracts.js lock       # add NEW paths to each lock; refuses if the schema breaks it (--accept-breaking overrides)
node scripts/contracts.js check      # fail if the brief's fixtures or any lock is out of date (also run by `npm test`)
```

## The rule

Within a contract version the API is **additive only**. You may add optional fields, new capability entries and new allowed values. You may not remove, rename, retype or loosen (required → optional) anything, or remove an allowed value. The lock test fails if you do. **Regenerating the lock to make it pass is the act the lock exists to prevent**: a breaking change needs a new contract version served alongside the old one.

## Known gaps (stated, not hidden)

- **What the tests reach.** Fixtures cover what the existing route tests and builders exercise. A state no test produces has no fixture: `start-sit-detail` `games_started` and `incomplete_data`, the brief's live-only states (`pending_live_engine`, `yahoo_reauth_required`, `sleeper_league_context_missing`, `context_unavailable`, `espn_*`), and live-mode evidence kinds. Each is named in the tests, not silently untested.
- **`required` is a floor.** A field is required if it is present in every recorded variant; that is evidence, not proof it is required in every real situation. Tighten after live traffic is validated.
- **`platform-provider-state.v1` is weakly constrained** (only `contract_version` is required across its success and error variants).
- **Not yet recorded:** `POST /api/platforms/espn/leagues` (ESPN discovery), `trade-find.v1`, `league-standings.v1`, `sleeper-draft-*`, `draft-assistant-recommendations.v1` (none are screen contracts today).
- **iOS decodes only some contracts through types we can test** (15 of 30). Connect flows, session, export/delete and beta report are decoded by private code and are schema-protected on the server side only. `TradeCompare.capabilities` is read by the app and never sent by `trade-compare.v2`.
- **No real production response has been validated** against a schema (needs an authenticated request for the founder's league).
- **CI drift check is non-blocking for now** (`continue-on-error`): it confirms fixtures recorded on a Mac are byte-identical on the CI runner. Flip it to blocking after a few green runs.
- **iOS only.** Android decoders are paused (`Direction/decision_log.md`, 2026-09-30).
