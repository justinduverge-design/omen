# Valor Brain metadata v1 — Omen adoption handoff

## Outcome

Omen now participates in the L0-owned `valor-brain/v1` contract while remaining independently cloneable and valid. It has a local resolver, byte-identical schema and validator mirrors, kickoff and Done hooks, and the first governed product page.

## Product truth preserved

`Direction/reviews/2026-08-20-valor-brain-o2-rollback-pilot.md` migrated from experimental `valor-brain-pilot/v0` fields to v1. It remains `REVIEW_ONLY` and separates:

- `state.task: IN_PROGRESS`
- `state.change: APPLIED`
- `state.exercise: NOT_RUN`

This is a metadata migration only. It does not run the rollback exercise, advance O2, close a sprint item, deploy, or broaden production authority.

## Verification

- `node scripts/check-valor-brain.mjs`: 1/1 valid.
- `node --test test/valorBrainMetadata.test.mjs`: 2/2 pass.
- `npm.cmd test` with the existing dependency-bearing checkout through `NODE_PATH`: 572/572 pass.
- `git diff --check`: clean.
- Schema SHA-256 matches L0: `C21296F3F6ADB1CD83A8770490B350DD689ADF0BE1E0426323668E4CDC4C3C2E`.
- Validator SHA-256 matches L0: `49952F48F3FD3C7925541B998F71B111083678BCC57B610AA727A277B3FCC650`.

`node scripts/check-sprint-staleness.js` found no issue in checks that ran. Its coverage block reported GitHub unreachable, so merged-PR and issue-state checks DID NOT RUN and are not claimed green.

## Skills and boundaries

`slops-repo-inspector`, `slops-context-markdown`, `slops-tdd`, and `graphify` were used. Graphify output was stale, which directly constrained v1: no graph ingestion or graph-derived authority was added. No package, secrets, database, deployment, production, or main-branch merge change occurred.
