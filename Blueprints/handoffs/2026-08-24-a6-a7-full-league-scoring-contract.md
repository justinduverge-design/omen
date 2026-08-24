# Handoff — 2026-08-24 — A6/A7 full-league scoring contract foundation

**Branch:** `codex/full-league-scoring-contract` (from deployed `origin/main` `00a7376`)

## Outcome

- **A7 is VERIFIED as research/architecture only.** The source-rights report evaluates six candidates; the detailed memo names the lawful source set, schedules, retention, idempotency/replay, validation, VPS/Pi roles, failure behavior, estimates, and phased plan. Its two 2025 replay weeks are recorded in the architecture memo.
- **A6 remains IN_PROGRESS and correctly blocked.** It now has a provider-neutral, versioned pure scoring-contract engine and a review-only schema proposal. The engine represents offensive, kicking, DST, IDP, threshold, range, and bonus rules; unsupported rules fail closed. It does not claim a provider integration or a complete production scorer.
- The old reception-only partial branch remains preserved but unmerged. The already-deployed ESPN disclosure was not duplicated.

## Safety boundaries preserved

- No SQL was applied to staging or production. `sql/2026-08-24_a6_full_league_scoring_contract_review.sql` is nullable, additive, and marked review-only.
- No collector, timer, provider credential, dependency, secret, deployment, or production change occurred.
- ESPN remains `provider_restricted`; no extraction/reconciliation expansion was made. Sleeper, Yahoo, and paid-source gates are recorded rather than assumed clear. ADP is not claimed.

## Key implementation behavior

- `src/services/scoringContract.js` has the canonical vocabulary/operations and reports unsupported coverage rather than treating an unknown rule as zero points.
- `src/omen_tuesday_cron.js` now selects the proposed contract fields and refuses a post-A6 row marked `scoring_contract_required`; it does **not** use its old PPR fallback for that row. An unmarked historical row retains the established PPR fallback.
- **Scoring-enable sequencing is mandatory:** founder approval → staging schema application → staging verification → production schema application → scoring enablement. The code may deploy while Tuesday scoring remains disabled; it must not execute scoring against a live database until that sequence is separately approved and evidenced.

## Verification

- Baseline before changes: `npm test` **652/652**.
- Final: `npm test` **658/658**; focused scoring/cron tests **17/17**; `npm audit --audit-level=moderate` found **0** vulnerabilities; `git diff --check` clean.
- `node scripts/check-sprint-staleness.js`: no findings. Coverage: all listed checks ran except its explicit prose-vs-prose and `Done when` blind spots; no GitHub reachability skip occurred.
- Self code review: no P0/P1 security, injection, credential, performance, or parser finding. Deliberate non-merge limitation: this is a foundation and requires the staged schema plus completed lawful capture/reconciliation before it can run in production.

## Skills

- Used: `engineering:architecture`, `anthropic-skills:pre-build-research`, `engineering:code-review`.
- Considered but not invoked: `run-slops-saloon` (no UI), `supabase` (no Supabase action), native-mobile skills (no native source), release/ship/canary (no merge/deploy).

## Next exact action

Do not merge this branch. The next action is founder review of the contract and SQL proposal, then a scoped approval for **A7B’s non-production collector slice** and separately the A6 staging schema sequence. Provider permission/entitlement remains an external gate for complete private rule capture and final reconciliation.
