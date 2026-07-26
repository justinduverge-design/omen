# Dependency Health Controls — Code Review

## Scope and Base

Review of `chore/dependency-health-controls` against `9a72708`, covering the root lockfile resolution, dependency workflows, Dependabot configuration, and Promptfoo CI behavior.

## Verdict

**Merge.** No P0 or P1 findings.

## Positive Findings

- The runtime `body-parser` change is limited to the patched 1.20.6 lockfile node; `npm audit --omit=dev --audit-level=low` is clean.
- Deterministic Promptfoo fixtures have a stable local command and no longer suppress failure with `|| true`.
- The external provider smoke is manual and `continue-on-error`, so it remains observable without making a provider outage look like a product regression.
- Dependabot and dependency review cover both root and frontend manifests/locks. No automatic merge, secret, deployment, or provider configuration was added.
- The frontend audit is visible without making unrelated root dependency pull requests permanently fail before the required React Router migration is approved.

## Current Evidence

- Clean CI-style root install passed.
- YAML parse passed for all four new/changed workflow configuration files.
- Promptfoo mock validation passed; deterministic fixture evaluation passed 6/6.
- Full backend suite passed 416/416; frontend production build passed with the existing chunk-size warning; `git diff --check` passed.

## P2 Follow-Ups

1. Frontend React Router has 2 production moderate advisories and needs a separately approved v7 migration.
2. Root Promptfoo 0.121.19 has 15 development-only advisories. Evaluate an upstream fixed release or a parity-tested dependency-light SLOPS runner.
3. GitHub-hosted workflow execution and repository security settings cannot be proven locally; after push, confirm Dependabot alerts/security updates and the dependency graph are enabled, then inspect the first workflow runs.

## Intentionally Not Taken

- No broad transitive overrides or downgrade to the audit-suggested older Promptfoo version.
- No Promptfoo fork, provider credential change, deployment, merge, or push.
