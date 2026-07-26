# Dependency Health Policy

## Purpose

Keep third-party dependency debt visible, owned, and reviewable before it reaches Omen's runtime.

## Controls

- `Dependency Review` rejects pull requests that introduce a high-severity dependency advisory.
- `Dependency Health` blocks every root and frontend production advisory, including low severity, on dependency pull requests and each Monday at 14:17 UTC.
- The same workflow reports development-tool advisories as a visible non-blocking signal until their owning tool can be updated or removed.
- Dependabot opens grouped weekly update pull requests for npm and GitHub Actions. It never auto-merges them.
- `SLOPS Prompt Guard` validates and runs its dependency-free deterministic fixtures as a required pull-request check. It has no provider, credential, or network dependency.

## Dependency Intake Receipt

Every pull request that adds or changes `package.json` or a lockfile must state:

1. Package purpose and the code path that uses it.
2. Whether it is runtime or development-only.
3. License and maintainer/source check.
4. `npm audit --omit=dev` result and the full-audit delta.
5. Any new advisory, its owner, mitigation, and review date.
6. Removal condition for temporary tooling.

## Current Status

As of 2026-07-26, root and frontend full/production audits are all zero. Promptfoo has been removed and its six deterministic checks now run through `evals/slops-prompt-guard.mjs`. The frontend uses React 19.2.7, React Router 8.3.0, Vite 7.3.6, plugin-react 5.2.0, and PostCSS 8.5.23. Do not reintroduce a dependency merely to regain a feature that the SLOPS runner already provides.

## Review Standard

Dependency update pull requests require `npm ci`, `npm test`, the frontend build, the production audit, and the applicable deterministic evaluation before merge. A clean production audit does not erase documented development-tool debt.
