# Phase 1.5g Trademark Review

**Status:** self-assessed for Phase 1.5g.1 hairlines
**Date:** 2026-06-23
**Scope:** PIT, MIA, NO, GB motif entries in `frontend/src/data/nflTeams.js`

## Review Position

Phase 1.5g.1 ships only static CSS hairlines using palette-sourced color roles. No motif reproduces, traces, or evokes team marks such as the Steelers three-diamond logo, Colts horseshoe, Chiefs arrowhead, Saints fleur-de-lis, Mardi Gras chevrons, or any other protected emblem.

| Team | Motif id | Shape | Palette role | Applies to | Trademark review |
|---|---|---|---|---|---|
| PIT | `pit-gold-hairline` | 1px solid hairline | `secondary` | `page-edge`, `section-divider` | `self-assessed` |
| MIA | `mia-aqua-hairline` | 1px double hairline | `primary` | `page-edge` | `self-assessed` |
| NO | `no-cream-hairline` | 1px solid hairline | `neutral` | `page-edge` | `self-assessed` |
| GB | `gb-gold-tundra-hairline` | 1px solid hairline | `secondary` | `section-divider` | `self-assessed` |

## Explicit Exclusions

- No `ornamentSvgPath` ships in Phase 1.5g.1.
- No corner ornaments, watermarks, chevrons, diamonds, arrows, horseshoes, stars, fleur-de-lis, or logo-adjacent silhouettes ship in Phase 1.5g.1.
- All four motifs set `excludesOmenCard: true`; recommendation surfaces remain neutral.
- Any future mark-like motif must move from `self-assessed` to `counsel-approved` before production render.

## Evidence

- Runtime schema gate: `frontend/src/lib/assertCategoryShape.js`
- Resolver gate: `frontend/src/lib/motifs.js`
- Focused test: `test/teamMotifs.test.mjs`
- Contrast gate: `frontend/scripts/contrast-sweep.mjs`
