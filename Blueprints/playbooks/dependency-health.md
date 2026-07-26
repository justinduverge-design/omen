# Dependency Health Policy

## Purpose

Keep third-party dependency debt visible, owned, and reviewable before it reaches Omen's runtime.

## Controls

- `Dependency Review` rejects pull requests that introduce a high-severity dependency advisory.
- `Dependency Health` blocks every root production advisory, including low severity, on dependency pull requests and each Monday at 14:17 UTC. The known frontend React Router findings remain a visible non-blocking job until their separately approved major-version migration lands.
- The same workflow reports development-tool advisories as a visible non-blocking signal until their owning tool can be updated or removed.
- Dependabot opens grouped weekly update pull requests for npm and GitHub Actions. It never auto-merges them.
- `SLOPS Prompt Guard` validates and runs deterministic Promptfoo fixtures as a required pull-request check. Provider-dependent evaluation is manual and non-blocking because it depends on external availability.

## Dependency Intake Receipt

Every pull request that adds or changes `package.json` or a lockfile must state:

1. Package purpose and the code path that uses it.
2. Whether it is runtime or development-only.
3. License and maintainer/source check.
4. `npm audit --omit=dev` result and the full-audit delta.
5. Any new advisory, its owner, mitigation, and review date.
6. Removal condition for temporary tooling.

## Current Known Debt

As of 2026-07-26, the root full audit has 15 development-only advisories from the latest available `promptfoo@0.121.19` transitive tree. The separate frontend audit has 2 production moderate React Router advisories and 6 total advisories, including Vite/PostCSS development tooling. They are reported every week; follow-up must evaluate a React Router major-version migration and either adopt an upstream Promptfoo fix or replace the small fixture suite with a SLOPS-owned dependency-light runner. Do not add broad transitive overrides merely to make the report green.

## Review Standard

Dependency update pull requests require `npm ci`, `npm test`, the frontend build, the production audit, and the applicable deterministic evaluation before merge. A clean production audit does not erase documented development-tool debt.
