# Full Dependency Debt Remediation — Code Review

## Verdict

**Merge.** No P0 or P1 findings.

## Scope

- Removed Promptfoo and its audit-heavy transitive tree.
- Added a dependency-free SLOPS Prompt Guard with a regression test.
- Removed inactive Promptfoo YAML entrypoints and provider smoke workflow.
- Upgraded frontend React/Router/Vite/PostCSS tooling to supported audit-clean versions.
- Changed declarative-router imports from `react-router-dom` to `react-router` as required by Router 8.

## Evidence

- RED: the new guard test failed because the runner did not exist.
- GREEN: guard test passed; fixture command reports 18/18 assertions.
- Fresh root and frontend installs passed.
- `npm test` passed 417/417.
- Frontend production build passed under Vite 7.3.6.
- Browser smoke passed for `/`, `/privacy`, and `/corvus` redirecting to `/about`.
- Root and frontend full and production-only audits returned zero vulnerabilities.

## Residual Notes

- Vite emits its existing chunk-size warning only; no runtime or router failure was observed.
- No real authenticated browser flow was exercised because imports and routing infrastructure changed, not page behavior. Public routing and the existing full backend suite provide the current regression evidence.
