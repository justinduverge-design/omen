# Handoff — A6 safety containment and A7B closure

**Date:** 2026-08-26  
**Branch:** `codex/a7b-closure-reconciliation`  
**Base:** `dba6076`  
**PR:** [#372](https://github.com/justinduverge-design/omen/pull/372) — open, unmerged, first check run 3/3 green
**State:** A7B CLOSED/COMPLETED; A6 BLOCKED; A4 BLOCKED; production scoring held

## Outcome

A7B's four `Done when:` clauses were rechecked against the Phase 1–4 evidence, advanced through VERIFIED, and ledgered CLOSED/COMPLETED. The lawful owned football-data pipeline, immutable source evidence, canonical/versioned facts, independent replay, staged failure matrix, KVM1 recovery, Command Center witness, exact-host monitoring/backup, and A4 real-row/no-write rehearsal are all evidenced.

The correction verdict is precise: no authentic upstream revision has changed an accepted subject. Two genuine schedule revisions produced zero changed subjects. The changed-subject exercise is permanently labeled `controlled_fixture_not_upstream`; it proves the correction/supersession path without claiming an observed upstream correction.

## Production safety action

The production read found one pending/followed historical row with every A6 scoring field null and no post-migration rows. Code inspection proved a real-user correctness defect: the live route did not persist recommendations; feedback could create an unmarked row; the cron then classified it as historical and defaulted missing scoring to PPR.

After the founder authorized lead action, the production env was backed up as `.env.production.bak-20260826-a6-scoring-hold`, `OMEN_CRON_SCORING_ENABLED` changed from `true` to `false`, and only compose service `cron` was force-recreated. Verification from the running `omen_cron` container shows:

- `OMEN_CRON_SCORING_ENABLED=false`
- `CORVUS_CRON_SCORING_ENABLED=false`
- container state `running`
- image unchanged: `ghcr.io/justinduverge-design/omen-cron:main`

The API, database, publication controls, and other services were not restarted or mutated by the hold.

## A6 branch repair

- Live scoring format no longer defaults an uncaptured provider format to PPR; it remains `null`.
- Every issued authenticated live recommendation is persisted from server-owned response data before it is returned.
- The row carries `scoring_contract_required=true`, explicit `pending` or `provider_restricted` coverage, and `pending` reconciliation.
- A persistence error returns a sanitized `503` with no recommendation.
- Feedback-only/direct-client rows also set the contract-required marker, so they cannot enter the historical PPR fallback.
- Standard, Half-PPR, and PPR arithmetic remains covered for honestly labeled historical rows.

This is containment, not completion. Full A6 still requires lawful immutable provider-rule snapshots, canonical full-rule evaluation, provider-final reconciliation, deployment, and new-row production proof. Scoring must remain disabled until those applicable re-enable gates and O2 are satisfied.

## Verification

- Baseline: backend 712/712 before the repair.
- RED: focused tests failed for missing post-A6 marker, missing recommendation persistence, and unknown-live-format PPR default.
- GREEN: focused feedback/live-route/live-service/Tuesday-scoring tests 56/56; full backend 713/713; moderate audit 0 vulnerabilities; `git diff --check` clean; sprint staleness 0 findings after F6 was correctly retyped to founder/device-blocked.
- GitHub PR quality: Backend tests, Frontend tests, and Server boot smoke all passed on #372.
- Code review: `Direction/reviews/2026-08-26-a6-safety-a7b-closure-code-review.md`.
- No dependency or lockfile change.

## Records reconciled

- Current operational truth now says scoring is held, not live.
- A4 is blocked by A6 deployment/new-row proof and O2.
- A6 is BLOCKED and explicitly safe-but-incomplete.
- A7B is CLOSED/COMPLETED in `Direction/current_sprint.md`, `Direction/sprints_completed.md`, and `Blueprints/done/LEDGER.md`.
- Decision, known-issue, roadmap, release-readiness, API, env-inventory, inbox, context, and facts-of-record entries reflect the same state.

## Skills and boundaries

Used `run-slops-saloon` for the Omen read/authority/evidence loop. Browser/screenshot QA was N/A because no UI changed. No provider-access expansion, schema change, SQL, database write, dependency, application deploy, merge, or production API restart occurred in this closure pass. PR #372 is deliberately left open for founder review.
