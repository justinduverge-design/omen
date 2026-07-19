# CI lockfile repair — 2026-07-19

## Outcome

Repaired the root `package-lock.json` after merges #153 and #154 exposed a clean-Linux `npm ci` failure in the `Deploy to Hostinger KVM1` quality job. The lockfile had omitted 30 transitive package records required by the resolved Promptfoo tree.

## Change

- Regenerated lockfile metadata only with the CI-compatible npm resolver.
- Added the missing resolved records and removed two stale optional records.
- Did not change `package.json`, application code, credentials, deployment configuration, or runtime behavior.

## Verification

- `npx --yes npm@latest ci --dry-run` passed before installation.
- `npx --yes npm@latest ci` passed (920 packages, 0 vulnerabilities).
- `npm test` passed: 395 tests.
- `npm audit --audit-level=moderate` passed: 0 vulnerabilities.
- `npm --prefix frontend run build` passed with existing non-blocking warnings.
- Promptfoo mock evaluation passed: 6/6.
- `git diff --check` passed.

## Release status

The two preceding merge workflows stopped before build/deploy at the same `npm ci` gate. This branch exists solely to restore that release gate; its merge should trigger the serialized KVM1 workflow. No direct server mutation was performed.
