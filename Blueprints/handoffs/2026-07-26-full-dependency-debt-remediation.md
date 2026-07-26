# Full Dependency Debt Remediation — Handoff

## Objective

Clear the remaining root Promptfoo and frontend Router/tooling advisories without hiding them through unsafe overrides or an unmaintained fork.

## Completed

- Removed `promptfoo` from root development dependencies and its 598-package tree.
- Added `evals/slops-prompt-guard.mjs` plus JSON fixtures and a Node regression test. It preserves three prompt templates, two fixtures, and 18 deterministic assertions using only Node built-ins.
- Removed unused Promptfoo YAML configs and provider smoke workflow.
- Upgraded frontend to React 19.2.7, React Router 8.3.0, Vite 7.3.6, plugin-react 5.2.0, and PostCSS 8.5.23.
- Migrated 25 declarative-routing imports from `react-router-dom` to `react-router`.

## Verification

- Fresh root and frontend `npm ci`: passed.
- Full backend suite: 417/417 passed.
- SLOPS Prompt Guard: validation passed; 18/18 assertions passed.
- Frontend production build: passed; existing chunk-size warning remains.
- Browser smoke: `/`, `/privacy`, and `/corvus` → `/about` passed.
- Root and frontend full/production-only audits: all 0 vulnerabilities.
- Root and frontend production-audit CI jobs are both strict gates at low severity.
- `git diff --check`: passed.

## Files of Interest

- `evals/slops-prompt-guard.mjs`
- `evals/slops-prompt-guard.json`
- `test/slopsPromptGuard.test.mjs`
- `frontend/package.json`
- `frontend/src/main.jsx`
- `frontend/src/routes/index.jsx`
- `.github/workflows/ai-evals.yml`

## No Action Taken

No push, merge, deployment, credential access, provider call, database change, or GitHub repository setting change occurred.

## Next Step

Review and push the dependency-health branch. Confirm the first GitHub runs for Dependency Health, Dependency Review, and SLOPS Prompt Guard, then enable/confirm the repository dependency graph and Dependabot security updates if they are not already active.
