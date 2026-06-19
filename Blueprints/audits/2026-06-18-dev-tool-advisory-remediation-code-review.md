# Dev-Tool Advisory Remediation — Slops Code Review

**Date:** 2026-06-18  
**Task:** Remove the 11 advisories reported by the full root `npm audit`  
**Guardrail:** `slops-code-review`

## Findings

- P0: none.
- P1: none.
- P2: none required for this scoped dependency remediation.

## Review lenses

- **Correctness:** The direct dev dependency `promptfoo` moves from exact version `0.121.9` to exact version `0.121.17`. npm's non-breaking audit remediation refreshes its transitive dev tree to patched releases.
- **Security:** Full `npm audit --audit-level=moderate` reports 0 vulnerabilities, down from 11 (1 low, 1 moderate, 9 high). Production-only audit also reports 0. No app runtime dependency declaration, route, auth path, secret, credential, log, RLS policy, or Sentry behavior changed.
- **Tool compatibility:** `promptfoo --version` returns `0.121.17` with exit code 0.
- **Application compatibility:** Full backend suite passes 297/297. Primary frontend production build passes at 460.56 kB / 131.08 kB gzip, unchanged from the prior Phase 2.5 build evidence.
- **Scope:** Diff is limited to root `package.json`, root `package-lock.json`, and this review evidence. No frontend/client package file, env, migration, deploy, or production file changed.
- **Install reproducibility:** A fresh-clone `npm ci` run is required after the package commit under the 2026-06-16 lockfile rule; do not merge or deploy without it.

## Verdict

**Merge after fresh-clone `npm ci` passes.** No P0 or P1 findings.
