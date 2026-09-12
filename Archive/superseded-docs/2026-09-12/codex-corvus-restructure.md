# Codex Prompt — Corvus Restructure
## Operation type: DBS reorganization + source rename + division folder creation — no deploy
## Date: 2026-05-24
## Repo: slops-saloon/corvus/
## Status: Historical completed migration prompt — do not re-run without rewriting for the current repo state.

---

## Context

The repo was renamed from `ssffmvp` → `slops-saloon` and then physically moved to
`SLOPS/slops-saloon/corvus/` to reflect the correct layer hierarchy:

- Layer 0: `SLOPS/` — SLOPS OS
- Layer 1: `SLOPS/slops-saloon/` — Slops Saloon division (docs only, no git)
- Layer 2: `SLOPS/slops-saloon/corvus/` — Corvus product git repo ← THIS REPO

Because the whole repo is now the Corvus product layer, the `Corvus/` subfolder
inside it is redundant. This prompt:

1. Folds `Corvus/` subfolder contents up into the repo root
2. Creates the `slops-saloon/` division folder (outside the repo) with DBS context files
3. Renames division-level identifiers from `slops-saloon` → `corvus` in source/config
4. Updates CLAUDE.md and AGENT.md repo-location references
5. Runs 175/175 tests and commits everything

---

## Constraints

- Do NOT touch `.env`, secrets, Infisical, DNS, SSL, or VPS
- Do NOT `git push` — commit only
- Do NOT run `npm install`, `docker build`, or deploy commands
- Use `git mv` for all tracked file moves inside the repo
- Stop and report if tests drop below 175

---

## Repo Root

`C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`

Division folder to create (outside repo):
`C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\`

---

## Step 1: Verify clean tree and 175/175 tests

```bash
cd C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus
git status
node --test 2>&1 | tail -5
```

If tree is dirty or tests fail, stop and report before proceeding.

---

## Step 2: Fold Corvus/ subfolder up into repo root

The `Corvus/` subfolder contains Direction, Blueprints, Brand, Archive, References,
and Solutions. These belong at the repo root since the whole repo is Corvus.

### 2a — Move unique folders (no conflict)

```bash
git mv Corvus/Brand Brand
git mv Corvus/References References 2>/dev/null || git mv Corvus/References References-corvus
```

For References — if `References/` already exists at root, merge manually:
```bash
# If References/ already exists, move Corvus/References contents into it
git mv Corvus/References/docs/* References/docs/ 2>/dev/null || true
git mv Corvus/References/historical-handoffs/* References/historical-handoffs/ 2>/dev/null || true
```

For Solutions — merge into existing:
```bash
git mv Corvus/Solutions/* Solutions/ 2>/dev/null || true
```

For Archive — merge into existing:
```bash
git mv Corvus/Archive/handoffs-pre-dbs Archive/handoffs-pre-dbs 2>/dev/null || true
git mv Corvus/Archive/specs-pre-dbs Archive/specs-pre-dbs 2>/dev/null || true
git mv Corvus/Archive/current-status-2026-05-20.md Archive/ 2>/dev/null || true
```

### 2b — Merge Corvus/Blueprints into repo Blueprints/

The `Corvus/Blueprints/` has prompts, handoffs, specs, playbooks, and design docs.
These go to `Blueprints/` at repo root — this is where engineering docs belong.

```bash
# Prompts
git mv Corvus/Blueprints/prompts/* Blueprints/prompts/ 2>/dev/null || true

# Handoffs
git mv Corvus/Blueprints/handoffs Blueprints/handoffs

# Specs
git mv Corvus/Blueprints/specs Blueprints/specs

# Playbooks
git mv Corvus/Blueprints/playbooks Blueprints/playbooks

# Root-level Blueprints files
git mv Corvus/Blueprints/design.md Blueprints/design.md
git mv Corvus/Blueprints/security-privacy.md Blueprints/security-privacy.md

# Merge README
# Keep existing Blueprints/README.md — discard Corvus/Blueprints/README.md
git rm Corvus/Blueprints/README.md 2>/dev/null || true
```

### 2c — Merge Corvus/Direction into Direction/

**Important conflict resolution:**
- `Direction/context.md` at repo root is the SLOPS Saloon division context — it will be
  moved OUT of the repo to `slops-saloon/Direction/context.md` in Step 3
- `Corvus/Direction/context.md` is the Corvus product context — it REPLACES the root one
- For current_sprint.md, roadmap.md, decision_log.md: prefer `Corvus/Direction/` versions
  (they are more recent and Corvus-specific)

```bash
# Save the old Slops Saloon context for use in Step 3
cp Direction/context.md /tmp/slops-saloon-context.md

# Replace with Corvus product context
git rm Direction/context.md
git mv Corvus/Direction/context.md Direction/context.md

# Replace sprint/roadmap/decision_log with Corvus/Direction/ versions
# (check if they differ — if identical, just remove the duplicate)
git rm Direction/current_sprint.md 2>/dev/null || true
git mv Corvus/Direction/current_sprint.md Direction/current_sprint.md

git rm Direction/roadmap.md 2>/dev/null || true
git mv Corvus/Direction/roadmap.md Direction/roadmap.md

git rm Direction/decision_log.md 2>/dev/null || true
git mv Corvus/Direction/decision_log.md Direction/decision_log.md

# Unique files from Corvus/Direction
git mv Corvus/Direction/known_issues.md Direction/known_issues.md
git mv Corvus/Direction/release_readiness.md Direction/release_readiness.md

# agent_inbox stays (already at Direction/agent_inbox.md from root)
git rm Corvus/Direction/agent_inbox.md 2>/dev/null || true
```

### 2d — Remove the now-empty Corvus/ folder

```bash
# Remove any remaining empty dirs or .gitkeep files
find Corvus -type f | xargs git rm -f 2>/dev/null || true
rmdir Corvus 2>/dev/null || true
```

Verify:
```bash
ls Corvus 2>/dev/null && echo "WARNING: Corvus/ not empty" || echo "Corvus/ removed"
```

---

## Step 3: Create slops-saloon/ division folder (outside repo)

This folder is NOT inside the git repo. It lives at the division layer:
`C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\`

Do not git add or commit these files — they are outside the repo.

### 3a — Create DBS_INDEX.md

Create `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\DBS_INDEX.md`:

```markdown
# Slops Saloon DBS Index

Layer 1 of the SLOPS OS. Slops Saloon is the sports, music, and arts division.

## Layer Structure

- Layer 0 — SLOPS OS: `C:\Users\JDuve\OneDrive\Desktop\SLOPS`
- Layer 1 — Slops Saloon (this folder): `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon`
- Layer 2 — Corvus (active product): `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`

## Active Product

Corvus — Fantasy Football MVP.

All engineering, product code, and Corvus-specific DBS content lives in `corvus/`.

## Division Folders

```
Direction/     Division-level context, roadmap, and notes
Blueprints/    Future division-level prompts and specs (empty until second product)
```

## Navigation

- Corvus repo: `corvus/`
- Corvus context: `corvus/Direction/context.md`
- Corvus roadmap: `corvus/Direction/roadmap.md`
- SLOPS OS index: `../DBS_INDEX.md`
```

### 3b — Create Direction/context.md for the division

Use the saved Slops Saloon context from Step 2c (`/tmp/slops-saloon-context.md`) as the
base. Update it to reflect the new layer structure.

Create `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\Direction\context.md`:

```markdown
# Slops Saloon Context

## Layer

Slops Saloon is the sports, music, and arts division of SLOPS OS.

Path: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon`

SLOPS is Justin's company operating system. Slops Saloon is the first active division.
It is the umbrella for sports and entertainment products.

This folder contains division-level direction. All product engineering lives in `corvus/`.

## Active Product

Corvus — Fantasy Football MVP.

See `corvus/Direction/context.md` for the Corvus product context.

## Division Rules

- Corvus is the only active product.
- When a second product starts, it gets its own subdirectory at this level.
- Division-level decisions (naming, brand standards, multi-product rules) live here.
- Product-level decisions live in `corvus/Direction/`.

## Division Roadmap

1. Corvus — Fantasy Football MVP (active)
2. Future products TBD

See `corvus/Direction/roadmap.md` for the Corvus product roadmap.
```

### 3c — Create Blueprints/README.md placeholder

Create `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\Blueprints\README.md`:

```markdown
# Slops Saloon Blueprints

Division-level blueprints. Currently empty — populated when a second product starts
or when division-level workflows are needed.

For Corvus product blueprints, see `corvus/Blueprints/`.
```

---

## Step 4: Update source code — slops-saloon → corvus

Edit the following files. Use exact string replacement. Do not touch any other content.

### 4a — package.json

- `"name": "slops-saloon"` → `"name": "corvus"`

### 4b — docker-compose.yml

- `image: ghcr.io/justinduverge-design/slops-saloon:main`
  → `image: ghcr.io/justinduverge-design/corvus:main`
- `container_name: slops-saloon_api`
  → `container_name: corvus_api`
- `image: ghcr.io/justinduverge-design/slops-saloon-cron:main`
  → `image: ghcr.io/justinduverge-design/corvus-cron:main`
- `# Logs are written to /var/log/slops-saloon_cron.log inside container.`
  → `# Logs are written to /var/log/corvus_cron.log inside container.`
- `container_name: slops-saloon_cron`
  → `container_name: corvus_cron`
- `name: slops-saloon_network`
  → `name: corvus_network`

Verify:
```bash
grep "slops-saloon" docker-compose.yml
```
Expected: zero matches.

### 4c — .github/workflows/deploy.yml

- `tags: ghcr.io/justinduverge-design/slops-saloon:main`
  → `tags: ghcr.io/justinduverge-design/corvus:main`
- `cache-from: type=gha,scope=slops-saloon-api`
  → `cache-from: type=gha,scope=corvus-api`
- `cache-to: type=gha,mode=max,scope=slops-saloon-api`
  → `cache-to: type=gha,mode=max,scope=corvus-api`
- `tags: ghcr.io/justinduverge-design/slops-saloon-cron:main`
  → `tags: ghcr.io/justinduverge-design/corvus-cron:main`
- `cache-from: type=gha,scope=slops-saloon-cron`
  → `cache-from: type=gha,scope=corvus-cron`
- `cache-to: type=gha,mode=max,scope=slops-saloon-cron`
  → `cache-to: type=gha,mode=max,scope=corvus-cron`
- `docker logs slops-saloon_api`
  → `docker logs corvus_api`

Verify:
```bash
grep "slops-saloon" .github/workflows/deploy.yml
```
Expected: zero matches.

---

## Step 5: Update CLAUDE.md and AGENT.md

The repo has moved. Update the path references in both files.

**In CLAUDE.md** — update any reference to:
- `slops-saloon/` (as a repo path) → `slops-saloon/corvus/`
- The DBS navigation section: Layer 2 is now `slops-saloon/corvus/`

**In AGENT.md** — same updates as CLAUDE.md for DBS navigation.

The read-first file paths (`Direction/context.md`, `Direction/current_sprint.md`, etc.)
do NOT need to change — they are relative paths within the repo and are still correct.

---

## Step 6: Run tests

```bash
node --test 2>&1 | tail -10
```

Expected: 175/175 passing. Fix any failures before committing.

---

## Step 7: Stage and commit

```bash
git add -A
git diff --cached --name-only | sort
```

Confirm staged changes include:
- Deleted `Corvus/` tree (all files moved or removed)
- New/moved files under `Blueprints/`, `Direction/`, `Brand/`, `Archive/`, etc.
- Modified `package.json`, `docker-compose.yml`, `.github/workflows/deploy.yml`
- Modified `CLAUDE.md`, `AGENT.md`

DO NOT stage anything under `node_modules/`, `.env*`, or `*.key`.

```bash
git commit -m "refactor: corvus restructure — fold Corvus/ subfolder, rename to corvus

DBS restructure:
- Corvus/ subfolder folded into repo root (repo IS the Corvus product)
- Brand/, References/, Solutions/, Archive/ merged up from Corvus/
- Blueprints/ merged — prompts, handoffs, specs, playbooks now at repo root
- Direction/ merged — Corvus product context, sprint, roadmap, decision_log

Source rename (slops-saloon → corvus):
- package.json name: corvus
- docker-compose.yml: corvus_api, corvus_cron, corvus_network, GHCR corvus:main
- deploy.yml: GHCR tags + cache scopes → corvus
- CLAUDE.md, AGENT.md: repo path updated to slops-saloon/corvus/

175/175 tests pass."
```

---

## Step 8: Final verification

```bash
git status
git log --oneline -5
grep -rn "slops-saloon" package.json docker-compose.yml .github/workflows/deploy.yml
ls Corvus 2>/dev/null && echo "WARNING: Corvus/ still exists" || echo "Corvus/ clean"
```

Expected:
- Clean working tree
- New commit on top of main
- Zero `slops-saloon` matches in source/config files
- `Corvus/` folder gone

---

## Completion Checklist

- [ ] 175/175 tests pass before changes
- [ ] `Corvus/` subfolder fully merged into repo root and removed
- [ ] `slops-saloon/Direction/context.md` created (outside repo)
- [ ] `slops-saloon/DBS_INDEX.md` created (outside repo)
- [ ] `slops-saloon/Blueprints/README.md` created (outside repo)
- [ ] `package.json` name = corvus
- [ ] `docker-compose.yml` all slops-saloon refs → corvus
- [ ] `deploy.yml` all slops-saloon refs → corvus
- [ ] `CLAUDE.md` and `AGENT.md` repo path updated
- [ ] 175/175 tests pass after changes
- [ ] Single commit with all changes
- [ ] Report commit hash

---

## Do NOT

- Do not push
- Do not run docker compose, docker build, or npm install
- Do not touch .env, secrets, or production infrastructure
- Do not git add the files created in Step 3 (they are outside the repo)
- Do not modify frontend components, SQL, or Supabase migrations
