# Win-Streak Summary Contract Code Review

## Scope / Base

- Branch: `codex/phase1-5d-post-win-pulse`
- Base: working-tree diff on top of `a2a4aca1a301be6ba394acf9eafbeaf702628984`
- Scope: additive `/api/dashboard/summary.platforms.*.currentWinStreak` field plus provider history helpers and tests.

## Verdict

Merge after normal commit hygiene. No P0/P1 findings.

## Findings

None.

## Positive Verification Evidence

- Intended RED: `node --test test/dashboardSummary.test.js` failed because platform summaries omitted `currentWinStreak`.
- GREEN focused dashboard + adapters: `node --test test/dashboardSummary.test.js test/sleeperAdapter.test.js test/yahooAdapter.test.js test/espnAdapter.test.js` -> 39/39.
- Full backend: `npm test` -> 397/397.
- Audits: `npm audit --audit-level=moderate` and `npm audit --omit=dev --audit-level=high` both found 0 vulnerabilities.
- Frontend build: `npm --prefix frontend run build` clean with existing Vite `NODE_ENV=production` and chunk-size warnings.
- Legacy client build: `npm --prefix client run build` clean.
- Diff hygiene: `git diff --check` clean.

## Review Notes

- Contract is additive and fail-closed: ambiguous or unavailable provider history returns `null`, not a guessed streak.
- Semantics are stable for frontend: latest loss or tie -> `0`; consecutive wins -> positive integer.
- Dashboard summary remains usable when a provider lookup fails; enrichment does not fail the whole route.
- ESPN, Yahoo, and Sleeper paths reuse existing credential boundaries and do not expose raw provider ids, OAuth tokens, cookies, or bodies.
- No package, SQL, env, deploy, migration, or production config changes were made.

## Test Gaps / Follow-Up

- No production ESPN smoke was run; real-cookie validation remains Justin-gated.
- ESPN can still return `null` when older private-history access is incomplete, which is expected fail-closed behavior.
