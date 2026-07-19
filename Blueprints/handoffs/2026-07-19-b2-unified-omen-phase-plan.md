# Handoff - B2 Unified Omen Phase Plan

**Date:** 2026-07-19
**Branch:** `codex/b2-unified-omen-phase-plan`
**Base:** stacked on B1 branch `codex/b1-unified-omen-recommendation-contract`

## Objective

Plan B2 so the unified Omen recommendation layer can be implemented without guessing at phase order or frontend field needs.

## What Changed

- Added `Blueprints/specs/b2-unified-omen-recommendation-layer.md`.
- Updated B2 in `Direction/current_sprint.md` with the spec path, phase plan, field needs, and field-completeness test requirement.
- Updated `Direction/agent_inbox.md` so B2 starts with B2A unless Justin asks for the full B2 branch at once.
- Added a backend-to-frontend B2 field-needs handoff for `DecisionBrief` and `/omen` migration consumers.

## Planned B2 Phases

1. **B2A - Route-level contract guard:** direct POST defense for off-season/non-ready cases if implementation confirms it is needed.
2. **B2B - Internal recommendation boundary:** clarify/extract recommendation construction only where it reduces actual `src/services/omen.js` complexity.
3. **B2C - DecisionBrief field completeness:** tests and handoff evidence proving every state supplies the fields B3/B4 need.

## Field Need Filed

B2 must preserve/test:

- full envelope fields;
- success recommendation fields;
- signal honesty fields;
- empty/off-season/recovery/error null-recommendation behavior;
- no secret/provider credential values in recovery/error/model paths.

Canonical details live in:

```text
Blueprints/specs/b2-unified-omen-recommendation-layer.md
```

## Verification

- `git diff --check` clean.
- No app tests run; planning/docs-only change.

## Skills Used

- `slops-repo-inspector`: PASS. Confirmed branch, clean state, and B1 context.
- `planning-pass`: PASS. Split B2 into B2A/B2B/B2C and updated sprint/inbox.
- `slops-context-markdown`: PASS. Added spec and handoff docs.
- `slops-git-flow`: PASS. Created a separate light-stacked branch; no push/merge/deploy.

## Not Touched

- App runtime behavior.
- Tests.
- Packages.
- SQL/Supabase.
- Provider credentials.
- Analytics.
- Deploy/production config.

## Next Safe Step

Pull B2A for implementation if backend internals are next; otherwise B3 can proceed against the B2 field-needs plan while waiting for B2 implementation evidence.
