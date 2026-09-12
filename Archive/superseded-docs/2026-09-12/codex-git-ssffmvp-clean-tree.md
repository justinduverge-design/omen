# Codex Prompt — slops-saloon: Commit Doc Pass and Omen Canonical Migration
## Prompt for: Codex
## Operation type: Git — stage and commit uncommitted local changes in logical groups
## Date: 2026-05-24
## Repo: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon`

---

## Status

Historical prompt. Do not execute as the current cleanup workflow. Current agent
context paths are `Direction/context.md`, `Direction/current_sprint.md`,
`Direction/decision_log.md`, `Direction/roadmap.md`,
`Direction/agent_inbox.md`, and `Blueprints/agent_handoff.md`.

---

## Context

Prior commits on `main` already contain:
- `e7f0828` docs: DBS migration (Phase 1–6)
- `1578a94` feat: Omen MVP Move routes, services, frontend, tests
- `0450d76` feat: ESPN recovery Account page
- `db44bd9` fix: Infisical prod env in deploy workflow

**What remains uncommitted** is the 2026-05-24 doc pass and the Omen canonical path
migration. This prompt stages and commits those two groups. No rebase is needed.

---

## Scope Constraints

- Do NOT open `.env`, `.key`, secrets, or credential files
- Do NOT touch `Archive/quarantine/`
- Do NOT `git push` — commit only
- Do NOT run npm, docker, or any non-git commands
- Stop and report if anything unexpected appears in a staged file list

---

## Step 1: Verify state

```bash
cd C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon
git status
git log --oneline -6
```

Confirm:
- Branch is `main`
- Working tree matches the expected state below (19 modified, 11 deleted, 18 untracked)
- No new unexpected files before proceeding

**Expected modified (M):**
`AGENT.md`, `Blueprints/specs/docs/spec-kit-usage.md`, `CLAUDE.md`,
`Corvus/Direction/current_sprint.md`, `Corvus/Direction/decision_log.md`,
`Corvus/Direction/roadmap.md`, `Direction/current_sprint.md`,
`Direction/decision_log.md`, `Direction/context.md`, `Direction/roadmap.md`,
`Direction/agent_inbox.md`, `Blueprints/agent_handoff.md`,
`frontend/src/pages/OmenOfTheWeek.jsx`, `src/routes/system.js`,
`src/services/systemContracts.js`, `test/systemRoutes.test.js`

**Expected deleted (D):**
`Archive/handoffs-pre-dbs/.gitkeep`, `Archive/handoffs-pre-dbs/backend-to-frontend.md`,
`Archive/handoffs-pre-dbs/decision_log.md`, `Archive/handoffs-pre-dbs/decisions.md`,
`Archive/handoffs-pre-dbs/frontend-to-backend.md`,
`specs/000-infrastructure-boundaries/spec.md`, `specs/001-corvus-decision-layer/spec.md`,
`specs/002-homepage-product-priority/spec.md`, `specs/003-espn-recovery-playbook/spec.md`,
`specs/004-agent-workflow/spec.md`, `specs/005-nflverse-data-research/spec.md`

**Expected untracked (??):**
`Archive/`, `Blueprints/prompts/codex-npm-audit-fix.md`,
`Blueprints/prompts/codex-omen-path-canonicalize.md`,
`Blueprints/specs/docs/infrastructure-boundaries.md`,
`Corvus/Blueprints/specs/corvus-decision-layer.md`,
`Corvus/Blueprints/specs/homepage-product-priority.md`, `References/`

If the actual state differs significantly, stop and report before proceeding.

---

## Step 2: Check for remote divergence

```bash
git fetch origin
git rev-list --count origin/main..HEAD
git rev-list --count HEAD..origin/main
```

- If both counts are `0`: no divergence, continue.
- If `HEAD..origin/main` > 0 (local is behind): **STOP and report.** Do not commit
  over an unmerged remote. Report the counts and await instruction.
- If `origin/main..HEAD` > 0 only (local is ahead): normal, continue.

---

## Step 3: Commit Group A — Doc pass and archive cleanup

Stage all documentation changes, archive moves, and new reference/spec files.
No `.jsx`, `.js`, `.ts`, `.yaml`, or test files.

```bash
git add CLAUDE.md
git add AGENT.md
git add Direction/context.md
git add Direction/current_sprint.md
git add Direction/decision_log.md
git add Direction/roadmap.md
git add Direction/agent_inbox.md
git add Blueprints/agent_handoff.md
git add Corvus/Direction/current_sprint.md
git add Corvus/Direction/decision_log.md
git add Corvus/Direction/roadmap.md
git add Blueprints/specs/docs/spec-kit-usage.md
git add Blueprints/specs/docs/infrastructure-boundaries.md
git add Blueprints/prompts/codex-npm-audit-fix.md
git add Blueprints/prompts/codex-omen-path-canonicalize.md
git add Corvus/Blueprints/specs/corvus-decision-layer.md
git add Corvus/Blueprints/specs/homepage-product-priority.md
git add References/
git add Archive/
git add Archive/handoffs-pre-dbs/backend-to-frontend.md
git add Archive/handoffs-pre-dbs/decision_log.md
git add Archive/handoffs-pre-dbs/decisions.md
git add Archive/handoffs-pre-dbs/frontend-to-backend.md
git add Archive/handoffs-pre-dbs/.gitkeep
git rm specs/000-infrastructure-boundaries/spec.md
git rm specs/001-corvus-decision-layer/spec.md
git rm specs/002-homepage-product-priority/spec.md
git rm specs/003-espn-recovery-playbook/spec.md
git rm specs/004-agent-workflow/spec.md
git rm specs/005-nflverse-data-research/spec.md
```

Verify staged files — confirm no `.jsx`, `.js`, `.ts`, `.yaml`, or test files:

```bash
git diff --cached --name-only
```

If any source files appear, un-stage them with `git restore --staged <file>` and
report which files were found. Do not commit until the staged list is docs-only.

Commit:

```bash
git commit -m "docs: 2026-05-24 doc pass, archive cleanup, and context normalization

Agent files:
- CLAUDE.md: route table updated (omen row added), universal rules absorbed,
  handoff paths updated to Blueprints/handoffs/
- AGENT.md: canonical Omen path documented, universal rules absorbed,
  handoff paths updated to Blueprints/handoffs/
- Universal rules now live in CLAUDE.md and AGENT.md

Canonical DBS pointers:
- Direction/context.md, Direction/current_sprint.md, Direction/decision_log.md,
  Direction/roadmap.md, Direction/agent_inbox.md, Blueprints/agent_handoff.md

Direction updates:
- Direction/context.md: Universal AI Rules merged from global-context.md
- Direction/current_sprint.md, Direction/decision_log.md updated
- Corvus/Direction: decision_log.md updated, roadmap.md rewritten post-launch

New specs and references:
- Blueprints/specs/docs/infrastructure-boundaries.md
- Blueprints/specs/docs/spec-kit-usage.md (updated)
- Corvus/Blueprints/specs/corvus-decision-layer.md
- Corvus/Blueprints/specs/homepage-product-priority.md
- References/docs/nflverse-data-research.md
- References/historical-handoffs/pre-dbs-contract-notes.md

Archive operations (old pre-DBS locations retired):
- handoffs/ folder archived to Archive/handoffs-pre-dbs/
- specs/ folder archived to Archive/specs-pre-dbs/
- Direction/global-context.md archived to Archive/global-context-pre-dbs.md"
```

---

## Step 4: Commit Group B — Omen canonical path migration

Stage only app source and test files. No markdown or doc files.

```bash
git add frontend/src/pages/OmenOfTheWeek.jsx
git add src/routes/system.js
git add src/services/systemContracts.js
git add test/systemRoutes.test.js
```

Verify staged files — confirm only source/test files are staged:

```bash
git diff --cached --name-only
```

Confirm only `.jsx`, `.js`, and test files are staged — no markdown.

Commit:

```bash
git commit -m "feat: Omen canonical path migration — OmenOfTheWeek, system routes, contracts

- frontend/src/pages/OmenOfTheWeek.jsx: canonical Omen display layer
- src/routes/system.js: updated system routes
- src/services/systemContracts.js: system service contracts
- test/systemRoutes.test.js: system route tests

Canonical Omen path: POST /api/omen/mvp-move + OmenOfTheWeek.jsx
DvP enrichment via nflverse-data, LLM reasoning via Gemma/Ollama."
```

---

## Step 5: Final verification

```bash
git status
git log --oneline -8
```

Expected:
- Working tree is clean
- Two new commits on top of `db44bd9`

---

## Completion Checklist

- [ ] State verified — matches expected modified/deleted/untracked counts
- [ ] Remote divergence check passed (not behind origin/main)
- [ ] Group A (doc pass + archive) committed
- [ ] Group B (Omen canonical migration) committed
- [ ] `git status` is clean after both commits
- [ ] Report both commit hashes and final `git log --oneline -8`

---

## Do NOT

- Do not `git push`
- Do not `git pull --rebase` unless Step 2 shows local is behind
- Do not auto-resolve conflicts — stop and report
- Do not open `.env`, `.key`, or credential files
- Do not run npm, docker, or build commands
