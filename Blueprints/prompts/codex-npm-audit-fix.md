# Codex Prompt — npm Audit Fix
## Prompt for: Codex
## Operation type: Dependency security — audit and fix moderate production vulnerabilities
## Date: 2026-05-24
## Repo: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\ssffmvp`

---

## Context

The ssffmvp app has 3 known moderate severity vulnerabilities in production dependencies (flagged in a prior `npm audit` run). This prompt resolves them using semver-compatible fixes only. The test suite must pass after the fix.

**175/175 tests pass on the current tree.** That baseline must be maintained.

---

## Scope Constraints

- Do NOT use `npm audit fix --force` — force can introduce breaking changes
- Do NOT modify app source code (`src/`, `frontend/`)
- Do NOT touch `.env`, secrets, Docker, deployment, or SQL files
- Do NOT push or deploy
- Stop and report if any fix fails or introduces a test failure

---

## Step 1: Verify current audit state

```bash
cd C:\Users\JDuve\OneDrive\Desktop\SLOPS\ssffmvp
npm audit --production
```

Record:
- Exact number of vulnerabilities
- Severity levels (expect 3 moderate)
- Package names and paths

If the vulnerability count or severity differs from the expected 3 moderate, stop and report before proceeding. Do not assume the context is unchanged.

---

## Step 2: Confirm test baseline

```bash
node --test
```

Confirm 175/175 tests pass. If the count differs, stop and report.

---

## Step 3: Apply semver-compatible fixes

```bash
npm audit fix --production
```

**Do not add `--force`.** This command only applies fixes within semver ranges — it will not install major version bumps.

Review the output:
- Note which packages were updated
- Note if any vulnerabilities remain (some may require `--force` and are intentionally deferred)

---

## Step 4: Re-run tests

```bash
node --test
```

Expected: 175/175 pass. If any tests fail, stop immediately. Do not proceed to Step 5.

Report which tests failed and what packages were updated — this is the information needed to decide whether to roll back.

---

## Step 5: Re-run audit

```bash
npm audit --production
```

Report:
- How many vulnerabilities remain (if any)
- Whether remaining vulnerabilities require `--force` to fix
- Severity levels of anything remaining

---

## Step 6: Report

Return:
- Packages updated and version changes
- Vulnerabilities resolved
- Vulnerabilities remaining (if any) and why they were not fixed (require `--force`)
- Test result before and after
- Whether `package-lock.json` was modified

---

## Completion Checklist

- [ ] `npm audit --production` baseline recorded
- [ ] 175/175 tests confirmed passing before fix
- [ ] `npm audit fix --production` applied (no `--force`)
- [ ] Tests re-run after fix — 175/175 still passing
- [ ] Final `npm audit --production` result recorded
- [ ] Report delivered with package diffs

---

## Do NOT

- Do not use `--force`
- Do not modify app source, routes, services, or frontend files
- Do not touch `.env`, secrets, Docker, or production config
- Do not push or deploy
- Do not run `npm install` with new packages — only `npm audit fix`
- Do not proceed past Step 4 if tests fail
