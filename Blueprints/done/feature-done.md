# Feature Done

A feature is done when the user can use it end-to-end, every failure path is handled, and the feature is reachable from where users naturally land.

> ✅ **Corrected 2026-08-24.** This banner previously declared a *"GitHub Actions billing hold active (until ~2026-08-01)"*. **That hold never existed** — it was retracted on 2026-08-01; CI runs and gates every PR. Still in force, for a different reason: gates 12 and 19 have full local substitutes, and any gate with no local equivalent in your session (notably iOS simulator CI, which is per-PR-retired by choice) is recorded as **DEFERRED-CI** — never skipped, never claimed as green, and never treated as a pass. See `definition-of-done.md` § Verification substitutes.

## Gates

1. Happy path works against real or labeled-mock data
2. Loading state exists (contextual copy, not "Loading…")
3. Empty state exists (acknowledges; doesn't apologize)
4. Error state exists (honest, actionable, retry where applicable)
5. Disconnected-platform state exists (if feature reads Yahoo/Sleeper/ESPN)
6. Mobile layout works (page-system + Phase 1.13 sweep rules)
7. Copy passes brand voice — recommendation first, evidence second
8. Confidence + risk both visible whenever a recommendation exists
9. Mock data labeled — `mode === 'mock'` carries MockBanner; never silently mixed with live
10. Backend contract written to `Blueprints/handoffs/backend-to-frontend.md` if frontend; signed off if backend
11. Reachable from nav / dashboard / where users naturally go
12. `npm test` green if backend; `npm --prefix frontend run build` clean if frontend
13. `git diff --check` clean
14. No new dependency added without flagging first
15. `slops-code-review` returns no P0 (or P0 explicitly accepted by Justin)
16. `slops-ui-ux-audit` returns no P0 if UI changed (or P0 accepted)
17. Notable decisions logged in `Direction/decision_log.md`
18. Behavior-changing code includes intended RED → GREEN evidence through `slops-tdd`, or a specific reason the gate is not applicable
19. `slops-quality-baseline` records current tests/build/audit/diff signals before merge
20. Skill receipt appended to `Blueprints/playbooks/skill-usage-ledger.md`

## AAA mapping

- **Accuracy:** 1, 2, 3, 4, 5, 9, 12, 13, 18, 19
- **Accessibility:** 6
- **Aesthetic:** 7, 15, 16
- **Operational:** 10, 11, 14, 17, 20 (not A/A/A — process gates)
