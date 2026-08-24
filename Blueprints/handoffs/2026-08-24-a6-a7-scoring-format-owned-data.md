# Handoff — A6 scoring format + A7 owned football-data pipeline

**Date:** 2026-08-24  
**Agent:** Codex  
**Branch:** `codex/a6-a7-football-data`  
**PR:** [#365](https://github.com/justinduverge-design/omen/pull/365) — open and deliberately unmerged for founder review  
**Deployed:** no. No SQL was applied, no collector or timer was enabled, and no production state or credential was touched.

## Outcome

The pre-approved package was completed in the required order. A6 is locally implementation-verified; A7 is research/architecture-verified. Neither is deployed or closed as production behavior.

- `A6-MovesScoringFormat` now captures the connected league's scoring format when a recommendation is generated, persists it on the move, and grades against that persisted contract. Only null or absent historical rows fall back to PPR.
- `A7-OwnedFootballDataPipeline` now has a source-backed, rights-first architecture and operating plan. Its lawful no-subscription source set is the explicitly allowlisted CC BY 4.0 nflverse release families; no unlicensed fallback is implied.

## A6 — implementation and migration boundary

### What changed

- Added one canonical scoring-format normalizer for `Standard`, `Half PPR`, and `PPR`, including exact 0/0.5/1 reception-point mapping.
- Sleeper, ESPN, and Yahoo roster paths now capture league reception scoring and carry it through live recommendation envelopes.
- Successful live generation fails closed when scoring is missing, custom, or unsupported; it does not manufacture a PPR value.
- Successful generation upserts the auditable move row with user, week, season, player, confidence, status, and scoring format.
- Tuesday scoring selects the persisted `scoring` value and rejects invalid non-null values. Null/absent pre-column history alone uses PPR.
- Authored `sql/2026-08-24_a6_moves_scoring_format_review.sql`: additive, nullable, no default, no backfill, explicitly review-only.

### Deployment ordering — load-bearing

Do not deploy the A6 application code before the column exists. The authorized sequence remains:

1. Founder reviews the PR and SQL.
2. Apply the SQL to staging in a separately authorized action.
3. Verify real Sleeper, ESPN, and Yahoo recommendation rows and all three grading modes in staging.
4. Obtain separate founder approval for production SQL.
5. Apply production SQL, verify the column, then deploy the code and run the canary.

The SQL was not applied to staging or production in this task.

## A7 — rights decision and proposed architecture

The full memo is `Direction/reviews/2026-08-24-a7-owned-football-data-pipeline.md`.

- Six primary source/licensing records were evaluated: nflverse, Sleeper, ESPN/Disney, BALLDONTLIE, FantasyPros, and SportsDataIO.
- The proposed automated set is a narrow nflverse allowlist: weekly player/team stats, play-by-play, schedules, and player/roster identity releases whose CC BY 4.0 coverage is explicit. Separately sourced nflverse-hosted families are not automatically included.
- Sleeper remains excluded from commercial automation unless written permission arrives. ESPN automated extraction is prohibited for this use. The other candidates require payment or negotiated rights and were rejected under the founder's no-subscription decision.
- The designed flow is immutable raw snapshot + manifest → normalized GSIS player/game identity → versioned Standard/Half PPR/PPR derivation → independent validation gate → atomic Tuesday publication.
- KVM1 is the proposed primary; Command Center Pi is the provider-diverse witness. A Pi is not the production primary. A total nflverse loss retains the last validated publication and alerts; it never silently switches to an unlicensed source.
- Proposed build estimate is 62–92 hours, with 0.5–1 hour normal weekly maintenance and a 12–24 hour first-season incident reserve. Expected incremental infrastructure cost is $0 on existing hosts.
- ADP is only a future versioned consumer seam. No ADP data, collector, calculation, product capability, or acceptance claim exists.

### Historical replay evidence

A disposable `/tmp` replay used the published 2025 nflverse weekly player-stat CSV and Node built-ins only. No repository data file, dependency, database, cache, provider credential, or production system was used.

| Week | Regular-season rows | Standard mismatches | PPR mismatches | Maximum floating delta |
|---|---:|---:|---:|---:|
| 1 | 1,072 | 0 | 0 | 3.552713678800501e-15 |
| 17 | 1,063 | 0 | 0 | 7.105427357601002e-15 |

The input SHA-256 was `e5e0615b3d96a3eaebfaee91e55afb4a4e7fe0caf057454177bcd7d6ad4bcfc2`. The replay independently recomputed the published nflfastR Standard and PPR formula from component columns. This proves deterministic math and replay against the publication, not independent-provider agreement; a second rights-cleared reference is still required before production acceptance.

## Verification

| Gate | Result |
|---|---|
| Pre-change baseline | `npm test` 618/618 |
| A6 focused tests | 102/102 |
| Post-A6 full suite | `npm test` 626/626 |
| Three-format behavior | Standard, Half PPR, and PPR produce distinct grades; historical null/absent rows fall back to PPR |
| SQL application | **Not run** |
| A7 runtime mutation | **None** — no collector, cron, dependency, secret, credential, SQL, migration, deploy, or production change |
| `npm audit --audit-level=moderate` | 0 vulnerabilities |
| `npm run evals:validate` | passed — 3 prompts, 2 cases |
| `git diff --check` | clean |
| `node scripts/check-sprint-staleness.js` | no findings in the checks that ran; coverage block read in full |
| PR checks | all green on #365: backend tests/audit; frontend + client builds; server boot with SPA present |

## Queue impact and remaining gates

- A7's research/replay dependency on A4 is cleared. A7 does not itself build the production pipeline.
- A4 remains blocked by A6 staging proof, O2 rollback evidence, its real-row no-write rehearsal, monitoring/failure proof, independent three-format reference evidence, and the production gate. `OMEN_CRON_SCORING_ENABLED` remains false.
- Provider-shaped staging proof is especially important for Yahoo and ESPN because local tests use contract-shaped fixtures and this task had no provider credentials.
- Before building A7, Phase 0 must re-verify the exact allowlist rights and obtain a genuinely independent rights-cleared validation reference. If neither exists, fail closed and escalate; do not scrape around the problem.

## Files for review

- `src/services/scoringFormat.js`
- `src/services/moves.js`
- `src/services/omenCron.js`
- `src/routes/omen.js`
- provider adapters and roster services under `src/providers/` and `src/services/`
- `sql/2026-08-24_a6_moves_scoring_format_review.sql`
- `Direction/reviews/2026-08-24-a7-owned-football-data-pipeline.md`

## Explicit non-claims

No merge, deployment, migration application, production validation, provider credential use, collector, scheduled job, independent-provider match, or ADP capability is claimed by this handoff.

The staleness checker does not validate whether a `Done when:` clause was genuinely met, prose contradictions without issue-number linkage, or code outside `Direction/` and `Blueprints/handoffs/`. Its clean result is governance-record evidence only; the test/audit/diff results above carry the code evidence.
