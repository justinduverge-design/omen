# Phase 2.7 Demo Mode — Slops Code Review

Date: 2026-06-19

Task: Add a public deterministic normalized roster and Omen envelope labeled `mode: "demo"`, distinct from live and mock modes.

## Inputs reviewed

- Phase 2.7 implementation diff and focused tests.
- `Blueprints/definition-of-done.md` plus Feature and Recommendation Done gates.
- `Blueprints/demo-mode.md`, the frontend/backend handoffs, and existing Omen/roster contracts.
- `demo-mode-pre-empty-state`, `slops-code-review`, and `slops-git-flow` requirements.

## Findings

### P0

None.

### P1

None.

### P2

- Frontend Phase 2.7 must add an explicit `demo` data-source treatment. It must use `mode`/`is_demo` rather than interpreting `is_mock: false` as live.
- The Layer 0 shared demo pattern remains unharvested. This backend task created the required Corvus product contract only; cross-layer doctrine changes remain separately gated.

## Lens results

- Correctness: fixed roster inputs produce a stable valid RB-for-RB recommendation with confidence, risk, explanation, and source evidence. Demo, live, and mock flags are mutually explicit.
- Security: the route is public by design, accepts no input, uses the public-tool rate limiter, reads no identity/provider/database state, and returns no user data or credentials.
- Error handling: the pure service fails closed if its fixture stops producing a recommendation; Express routes the error through the existing backend handler.
- Performance: bounded in-memory clone plus optimizer work over eleven sample players; no network, database, LLM, or N+1 path.
- Tests: focused suite passed 5/5; full backend suite passed 312/312; audit reports zero vulnerabilities.
- Scope: backend service, route, mount, tests, and required closure records only. No frontend, package, migration, deploy, secret, or production change.

## Verdict

**Merge.** No P0 or P1 findings.
