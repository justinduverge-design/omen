# Codex Prompt — Commit Docs/DBS Pass (Pre-requisite for Source Rename)
## Operation type: git cleanup + stage + commit — no source changes, no deploy
## Date: 2026-05-24
## Repo: ssffmvp/ (will be renamed to slops-saloon/ later)
## Status: Historical pre-rename prompt — stale for current `slops-saloon/corvus` work.

---

## Context

The documentation and DBS reorganization pass was completed outside of git
(markdown sed pass + manual DBS layer restructuring). The working tree is dirty
with uncommitted doc moves and edits. This commit captures that work so the
tree is clean before `codex-slops-saloon-rename.md` runs.

This prompt:
- Removes any stale git lock file
- Stages all documentation, DBS, and config changes
- Verifies no source code was accidentally modified
- Commits everything in a single docs commit

Do NOT touch source files (src/, test/, sql/).
Do NOT push.
Do NOT run npm install, docker build, or any deploy commands.

---

## Repo Root

Run from:
`C:\Users\JDuve\OneDrive\Desktop\SLOPS\ssffmvp`

---

## Step 1: Remove stale lock file (if present)

```bash
cd C:\Users\JDuve\OneDrive\Desktop\SLOPS\ssffmvp
if exist .git\index.lock del .git\index.lock
git status
```

---

## Step 2: Verify tests still pass (sanity check before touching git)

```bash
node --test 2>&1 | tail -5
```

Expected: 175/175 passing. If tests fail before any git operations, stop and report.

---

## Step 3: Confirm no source file changes are in the working tree

```bash
git diff --name-only -- src/ test/ sql/
```

Expected: zero output. If any source files show as modified, stop and report — do not stage them.

---

## Step 4: Stage all documentation and config changes

```bash
git add -A -- \
  "*.md" \
  "Corvus/" \
  ".dockerignore" \
  "AGENTS.md" "CLAUDE.md" "DBS_INDEX.md" "README.md" \
  "CURRENT_STATUS.md" "KNOWN_ISSUES.md" "RELEASE_READINESS.md" \
  "agent_handoff.md" "agent_inbox.md" "context.md" "current_sprint.md" \
  "decision_log.md" "prompt_playbook.md" "roadmap.md" \
  "Blueprints/" "Direction/" "References/" "Solutions/" "Archive/"
```

Then verify what is staged:

```bash
git diff --cached --name-only | sort
```

Review the list — confirm:
- Modified markdown files (Direction/, Blueprints/, Corvus/, root-level *.md)
- New Corvus/ subdirectory structure (Corvus/Blueprints/prompts/, Corvus/Blueprints/specs/docs/, Corvus/References/, Corvus/Solutions/, Corvus/Archive/)
- Deleted files from old locations (Blueprints/handoffs/, Blueprints/prompts/ old files, Archive/handoffs-pre-dbs/, References/, Solutions/)
- New Blueprints/prompts/codex-slops-saloon-rename.md

Confirm NOT staged:
- src/ files
- test/ files
- sql/ files
- package.json
- docker-compose.yml (should have no diff vs HEAD)
- package-lock.json (should have no diff vs HEAD)

If anything unexpected is staged, unstage it with `git restore --staged <file>` before committing.

---

## Step 5: Commit

```bash
git commit -m "docs: DBS layer restructure and ssffmvp → Slops Saloon identity pass

Documentation and DBS reorganization:
- Moved Blueprints/handoffs/ → Corvus/Blueprints/handoffs/
- Moved Blueprints/prompts/ content → Corvus/Blueprints/prompts/
- Moved Blueprints/specs/docs/ → Corvus/Blueprints/specs/docs/
- Moved References/docs/, References/historical-handoffs/ → Corvus/References/
- Moved Solutions/audit_report.json etc → Corvus/Solutions/
- Created Corvus/Archive/ for Corvus-layer archive material
- Created Corvus/Direction/known_issues.md, release_readiness.md

Identity rename (documentation only — source code unchanged):
- Layer 1 identity: ssffmvp → Slops Saloon across all active .md files
- DBS_INDEX.md: layer paths, aliases, context labels updated
- AGENTS.md, CLAUDE.md: DBS navigation updated
- direction/context.md, Corvus/ docs: Slops Saloon canonical names

Added:
- Blueprints/prompts/codex-slops-saloon-rename.md (source code rename prompt)"
```

---

## Step 6: Verify clean tree

```bash
git status
git log --oneline -3
```

Expected:
- Working tree clean (nothing to commit)
- New docs commit on top of main

---

## Completion Checklist

- [ ] index.lock removed (if it existed)
- [ ] 175/175 tests pass before staging
- [ ] No source files (src/, test/, sql/) in staged changes
- [ ] All doc/DBS moves and edits staged
- [ ] Single commit made
- [ ] Working tree clean after commit
- [ ] Report commit hash

---

## Do NOT

- Do not push
- Do not stage or modify src/, test/, sql/ files
- Do not touch .env, secrets, or deployment config
- Do not run npm install, docker compose, or any deploy commands
