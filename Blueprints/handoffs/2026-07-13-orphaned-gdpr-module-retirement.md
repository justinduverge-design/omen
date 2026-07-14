# Orphaned GDPR Module Retirement

## Outcome

Removed unmounted `src/omen_gdpr.js`. Live privacy behavior remains `src/routes/userPrivacy.js` at `/api/user`.

## Changes

- Removed stale source reference and module.
- Repointed Probo privacy controls to the mounted router.
- Added a test that rejects the retired manifest path.

## Verification

Focused security test 8/8; full tests 388/388; audit 0; frontend build passed with existing warnings; `git diff --check` clean.

## Contracts and Limits

No endpoint, auth, data, or frontend contract changed. No deploy, push, merge, migration, or production action occurred.

## Skill Receipt

Skills invoked: `slops-repo-inspector`, `slops-git-flow`, `security-privacy-evidence`, `slops-code-review`, `slops-quality-baseline`, `slops-context-markdown`.

TDD and UI/provider/release skills were not applicable: deleting an unmounted module changes no executable behavior or user-facing surface.
