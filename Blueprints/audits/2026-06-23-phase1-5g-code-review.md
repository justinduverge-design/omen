# Phase 1.5g.1 Code Review

**Date:** 2026-06-23
**Scope:** motif schema, resolver, theme token writer, CSS motif targets, motif contrast sweep, focused tests
**Implementation commit:** `e66e9d7c7ae29212af36d947428991b20b45f25b`
**Verdict:** merge

## Findings

No P0/P1/P2 findings.

## Review Notes

- `frontend/src/data/nflTeams.js` adds motifs only for PIT, MIA, NO, and GB.
- `frontend/src/lib/assertCategoryShape.js` validates motif, typeFlourish, and culturalMoment category shapes in dev/test.
- `frontend/src/lib/motifs.js` resolves motif colors from the active team palette and suppresses `pending` trademark states in production.
- `frontend/src/lib/themeMode.js` clears motif vars when leaving Team mode and applies only the first active motif for v1.
- `frontend/src/index.css` renders static hairlines only through `[data-motif-target]`; no Omen-card target is present.
- `frontend/scripts/contrast-sweep.mjs` treats motif color against surface as a required decorative contrast cell at >= 3.0.

## Verification

- RED: `node --test test/teamMotifs.test.mjs` failed before implementation on missing PIT motifs and missing motif token writer.
- GREEN: `node --test test/teamMotifs.test.mjs` passed 3/3.
- Frontend build passed: `npm --prefix frontend run build`.
- Full root tests passed: `npm test` passed 356/356.
- Audit passed: `npm audit --audit-level=moderate` found 0 vulnerabilities.
- Diff hygiene passed: `git diff --check`.

## Residual Risk

- The existing Vite chunk-size warning remains present and unrelated to this task.
- Future mark-like motifs still require counsel approval; Phase 1.5g.1 ships self-assessed CSS hairlines only.
