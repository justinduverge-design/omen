# Dependency Health Controls — Handoff

## Objective

Remove the production `body-parser` advisory and make new or existing dependency debt visible before merge.

## Scope Completed

- Locked the runtime `body-parser` resolution to 1.20.6.
- Added weekly Dependabot update proposals for npm and GitHub Actions; no auto-merge is configured.
- Added a pull-request Dependency Review that rejects newly introduced high-severity advisories.
- Added a strict root production-audit job plus visible non-blocking frontend and development-audit jobs, scheduled weekly and runnable manually.
- Converted the existing Promptfoo mock fixtures into `SLOPS Prompt Guard`: validation plus deterministic 6-case evaluation are required on relevant pull requests. Provider-dependent evaluation is manual and non-blocking.
- Added the dependency intake receipt policy and the related decision/security evidence.

## Files Changed

- `package.json`, `package-lock.json`
- `.github/dependabot.yml`
- `.github/workflows/ai-evals.yml`
- `.github/workflows/dependency-review.yml`
- `.github/workflows/dependency-health.yml`
- `Blueprints/playbooks/dependency-health.md`
- `Direction/reviews/2026-07-26-dependency-health-controls.md`
- `Direction/reviews/2026-07-26-dependency-health-controls-code-review.md`
- `Direction/decision_log.md`
- `Blueprints/playbooks/skill-usage-ledger.md`

## Verification

- CI-style clean install: passed with `npx --yes npm@latest ci`.
- Mock config validation: passed.
- Deterministic prompt guard: 6/6 passed.
- Root production audit at low severity: 0 vulnerabilities.
- Frontend production audit: 2 moderate React Router advisories; reported by the new frontend production-audit job without blocking unrelated dependency pull requests until a separately approved major-version migration lands.
- Workflow YAML parse: 4/4 passed.
- Full backend tests: 416/416 passed.
- Frontend production build: passed with the existing chunk-size warning.
- Root full audit: intentionally remains 15 development-only advisories through Promptfoo 0.121.19.
- Frontend full audit: 6 advisories (2 production React Router, Vite/PostCSS development tooling).

## Risk and Limitation

`npm audit` currently recommends a semver-breaking move to an older Promptfoo version for some dev advisories. Do not accept that automated suggestion. The current evidence supports either waiting for an upstream fixed release or replacing the small deterministic suite with a SLOPS-owned dependency-light runner after parity testing. React Router requires a separately approved v7 migration; it was not silently upgraded in this dependency-control task.

The existing quality baseline is stale/internally duplicated and predates the current 416-test suite and advisory state, so it was not ratcheted by this control-only change. The current command evidence is the merge-quality record for this branch.

## Next Step

Review and merge this scoped branch. Then schedule separate React Router migration and Promptfoo replacement/parity tasks; no provider credential or deployment action is required for this commit.
