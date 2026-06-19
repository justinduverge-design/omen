# Phase 2.5 ADP Weighting — Slops Code Review

**Date:** 2026-06-18  
**Task:** Phase 2.5 — Proprietary ADP weighting service  
**Guardrail:** `slops-code-review`

## Findings

- P0: none.
- P1: none.
- P2: none required for this scoped service change.

## Review lenses

- **Correctness:** FFC, Yahoo, and MFL rows are matched by normalized player name plus position. The composite is a weighted-average ADP score, sorted low-to-high. Missing providers are reweighted over the sources available for that player. Invalid or non-positive ADP rows are excluded.
- **Configuration:** Defaults are equal relative weights (`1:1:1`). A league scoring-config row may override them at `default_scoring_rules.adp_source_weights`; weights are normalized before use, and an all-zero override safely restores defaults.
- **Mock/live honesty:** Existing `is_mock` and mock note remain unchanged. Weighted mock output is derived only from the already-labeled mock source rows. Live source attribution remains intact.
- **Security/data boundary:** No route auth, Supabase query, service-role access, secrets, cookies, logs, SQL, or RLS policy changed. ESPN credential paths are untouched.
- **Error handling:** Missing source arrays degrade to an empty contribution set. Malformed weights fall back per source; a fully disabled configuration restores defaults instead of returning a misleading empty board.
- **Performance:** One pass over each provider list plus one sort of the merged board; no network calls or database queries were added.
- **Tests:** Focused suite passed 10/10. Full `npm test` passed 297/297 on 2026-06-18. Coverage includes defaults, league overrides, all-zero fallback, cross-provider matching, missing-source reweighting, malformed rows, disabled sources, mock labeling, and route response shape.
- **Scope:** No dependency, package, environment, migration, deploy, or production changes remain in the diff.

## Verdict

**Merge.** No P0 or P1 findings.
