# Codex Prompt — Slops Saloon Source Code Rename
## Prompt for: Codex
## Operation type: File renames + require() updates + config files — no deploy
## Date: 2026-05-24
## Repo: `slops-saloon/` (currently on disk as `ssffmvp/` until Justin renames the directory)
## Status: Historical pre-rename prompt — stale for current `slops-saloon/corvus` work.

---

## Context

Layer 1 is now **Slops Saloon** (division). Layer 2 is **Corvus** (first product).
The directory is being renamed from `ssffmvp/` to `slops-saloon/`. All markdown
documentation has already been updated. This prompt handles the source code side.

**Naming rule applied:**
- Source files specific to the Corvus product → `corvus_*` prefix
- Division-level identifiers (package name, container names, GHCR images) → `slops-saloon`

This prompt does:
- Rename `ssffmvp_*` source files to `corvus_*`
- Update all `require()` references to match the new names
- Update `package.json` name (slops-saloon) and cron script path (corvus_*)
- Update service log label to `"corvus-api"` in logging and contracts
- Update `docker-compose.yml` container names and image tags to `slops-saloon_*`
- Update `.github/workflows/deploy.yml` image tags and cache scopes to `slops-saloon`
- Rename the `.claude/skills/run-ssffmvp/` skill folder to `run-slops-saloon`

Tests must pass (175/175) after all changes. Do not push.

---

## Scope Constraints

- Do NOT touch `.env`, secrets, Infisical, DNS, SSL, or VPS settings
- Do NOT `git push` — commit only, Justin reviews and pushes
- Do NOT run `npm install`, `docker build`, or any deploy commands
- Do NOT delete source files — use `git mv` for all renames
- Stop and report if `npm test` drops below 175 passing tests
- Stop and report if any `require()` reference cannot be resolved

---

## Repo Root

Run from the Slops Saloon repo root. Currently on disk at:
`C:\Users\JDuve\OneDrive\Desktop\SLOPS\ssffmvp`

After Justin renames the directory it will be at:
`C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon`

Either path works — use whichever exists.

---

## Step 1: Verify state

```bash
cd C:\Users\JDuve\OneDrive\Desktop\SLOPS\ssffmvp
git status
node --test 2>&1 | tail -5
```

Confirm:
- On branch `main`, clean tree
- 175/175 tests pass

If tests fail before any changes, stop and report.

---

## Step 2: Rename source files

Use `git mv` so git tracks the rename as a move, not delete+add.

```bash
git mv src/ssffmvp_agents.js         src/corvus_agents.js
git mv src/ssffmvp_api_v2.js         src/corvus_api_v2.js
git mv src/ssffmvp_gdpr.js           src/corvus_gdpr.js
git mv src/ssffmvp_prompt_loader.js  src/corvus_prompt_loader.js
git mv src/ssffmvp_tuesday_cron.js   src/corvus_tuesday_cron.js
git mv test/ssffmvpApiV2.test.js     test/corvusApiV2.test.js
git mv sql/ssffmvp_rls_security.sql  sql/corvus_rls_security.sql
```

Verify the renames registered in git:

```bash
git diff --cached --name-only
```

Expected: 7 rename pairs (R old → new). If any show as D+A instead of R, that is fine —
git sometimes represents renames that way depending on similarity threshold.

---

## Step 3: Update require() references in source files

All `require("./ssffmvp_*")` calls must be updated to match the new filenames.

**In `src/server.js`:**
- `require("./ssffmvp_api_v2")` → `require("./corvus_api_v2")`
- `require("./ssffmvp_agents")` → `require("./corvus_agents")` (if present)
- `require("./ssffmvp_gdpr")` → `require("./corvus_gdpr")` (if present)

**In `src/corvus_tuesday_cron.js`** (just renamed):
- `require("./ssffmvp_agents")` → `require("./corvus_agents")`

**In `src/corvus_prompt_loader.js`** (just renamed):
- Any `require("./ssffmvp_agents")` or similar → `require("./corvus_agents")`

**In `src/corvus_gdpr.js`** (just renamed):
- Any `require("./ssffmvp_gdpr")` in usage comments or self-reference → `corvus_gdpr`

**In `src/corvus_agents.js`** (just renamed):
- Any `require("./ssffmvp_*")` → update to matching `corvus_*` name

Verify no remaining `ssffmvp` require references in source:

```bash
grep -rn 'require.*ssffmvp' src/ test/ --include="*.js" --include="*.jsx"
```

Expected: zero matches. If any remain, fix them before proceeding.

---

## Step 4: Update service labels

These are the logger/service identity strings — not filenames, not paths.

**`src/middleware/logging.js`** — find and replace:
- `"ssffmvp-api"` → `"corvus-api"`

**`src/services/systemContracts.js`** — find and replace all occurrences:
- `"ssffmvp-api"` → `"corvus-api"`

Verify:

```bash
grep -rn 'ssffmvp' src/ --include="*.js" --include="*.jsx"
```

Expected: zero matches.

---

## Step 5: Update package.json

Edit `package.json`:
- `"name": "ssffmvp"` → `"name": "slops-saloon"`
  *(division-level package name — the repo hosts Slops Saloon, Corvus is the product inside)*
- `"cron": "node src/ssffmvp_tuesday_cron.js"` → `"cron": "node src/corvus_tuesday_cron.js"`

Verify the cron script path resolves:

```bash
node -e "require('fs').accessSync('src/corvus_tuesday_cron.js')" && echo "cron path ok"
```

---

## Step 6: Update docker-compose.yml

Edit `docker-compose.yml` — change the following values only. Do not alter any other
config, env vars, volume mounts, port bindings, or service definitions.

Container names and image tags reflect the Slops Saloon division (the repo that contains
Corvus), not Corvus itself.

**API service:**
- `image: ghcr.io/justinduverge-design/ssffmvp:main`
  → `image: ghcr.io/justinduverge-design/slops-saloon:main`
- `container_name: ssffmvp_api`
  → `container_name: slops-saloon_api`

**Cron service:**
- Comment: `# Logs are written to /var/log/ssffmvp_cron.log inside container.`
  → `# Logs are written to /var/log/slops-saloon_cron.log inside container.`
- `image: ghcr.io/justinduverge-design/ssffmvp-cron:main`
  → `image: ghcr.io/justinduverge-design/slops-saloon-cron:main`
- `container_name: ssffmvp_cron`
  → `container_name: slops-saloon_cron`

**Shared network:**
- `name: ssffmvp_network`
  → `name: slops-saloon_network`

Verify no remaining `ssffmvp` in docker-compose.yml:

```bash
grep "ssffmvp" docker-compose.yml
```

Expected: zero matches.

---

## Step 7: Update .github/workflows/deploy.yml

Edit `.github/workflows/deploy.yml` — change image tags, cache scopes, and container
log reference. Do not change workflow triggers, secrets refs, SSH commands structure,
or anything unrelated to the naming.

**API image build step:**
- `tags: ghcr.io/justinduverge-design/ssffmvp:main`
  → `tags: ghcr.io/justinduverge-design/slops-saloon:main`
- `cache-from: type=gha,scope=ssffmvp-api`
  → `cache-from: type=gha,scope=slops-saloon-api`
- `cache-to: type=gha,mode=max,scope=ssffmvp-api`
  → `cache-to: type=gha,mode=max,scope=slops-saloon-api`

**Cron image build step:**
- `tags: ghcr.io/justinduverge-design/ssffmvp-cron:main`
  → `tags: ghcr.io/justinduverge-design/slops-saloon-cron:main`
- `cache-from: type=gha,scope=ssffmvp-cron`
  → `cache-from: type=gha,scope=slops-saloon-cron`
- `cache-to: type=gha,mode=max,scope=ssffmvp-cron`
  → `cache-to: type=gha,mode=max,scope=slops-saloon-cron`

**Health check / smoke test step:**
- `docker logs ssffmvp_api` → `docker logs slops-saloon_api`

Verify no remaining `ssffmvp` in deploy.yml:

```bash
grep "ssffmvp" .github/workflows/deploy.yml
```

Expected: zero matches.

---

## Step 8: Rename the Claude skill folder

```bash
mv .claude/skills/run-ssffmvp .claude/skills/run-slops-saloon
git add .claude/skills/run-slops-saloon/
git rm -r --cached .claude/skills/run-ssffmvp/ 2>/dev/null || true
```

The SKILL.md inside the folder already says `run-slops-saloon` (updated in the
prior markdown pass). No content changes needed inside the folder.

---

## Step 9: Run tests

```bash
node --test 2>&1 | tail -10
```

Expected: 175/175 passing, 0 failing.

If any tests fail, diagnose and fix before committing. Do not commit a broken test state.

---

## Step 10: Commit

Stage all changes:

```bash
git add -A
git diff --cached --name-only
```

Review staged files — confirm:
- Renames of 7 source/test/sql files (ssffmvp_* → corvus_*)
- Content changes in server.js (require updates)
- Content changes in corvus_tuesday_cron.js, corvus_agents.js, corvus_gdpr.js,
  corvus_prompt_loader.js (require updates and internal references)
- Content changes in logging.js, systemContracts.js (service label → corvus-api)
- package.json (name + cron path)
- docker-compose.yml (container names + GHCR image tags → slops-saloon)
- .github/workflows/deploy.yml (GHCR tags + cache scopes → slops-saloon)
- .claude/skills/ folder rename (run-ssffmvp → run-slops-saloon)

Commit:

```bash
git commit -m "refactor: rename ssffmvp → corvus/* and slops-saloon per canonical layer names

Source file renames (corvus = product layer):
- src/ssffmvp_agents.js         → src/corvus_agents.js
- src/ssffmvp_api_v2.js         → src/corvus_api_v2.js
- src/ssffmvp_gdpr.js           → src/corvus_gdpr.js
- src/ssffmvp_prompt_loader.js  → src/corvus_prompt_loader.js
- src/ssffmvp_tuesday_cron.js   → src/corvus_tuesday_cron.js
- test/ssffmvpApiV2.test.js     → test/corvusApiV2.test.js
- sql/ssffmvp_rls_security.sql  → sql/corvus_rls_security.sql

Internal updates:
- require() references updated in server.js, cron, agents, gdpr, prompt_loader
- Service label: ssffmvp-api → corvus-api (logging.js, systemContracts.js)
- package.json: name=slops-saloon, cron script → src/corvus_tuesday_cron.js
- docker-compose.yml: container names + GHCR images → slops-saloon (division layer)
- deploy.yml: GHCR tags + cache scopes + health check → slops-saloon
- .claude/skills/run-ssffmvp → run-slops-saloon

175/175 tests pass."
```

---

## Step 11: Final verification

```bash
git status
git log --oneline -3
grep -rn "ssffmvp" src/ test/ package.json docker-compose.yml .github/workflows/deploy.yml 2>/dev/null
```

Expected:
- Working tree clean
- New commit on top of main
- Zero `ssffmvp` matches in the checked files

---

## Completion Checklist

- [ ] 175/175 tests pass before changes
- [ ] 7 source/test/sql files renamed with git mv (ssffmvp_* → corvus_*)
- [ ] All require() references updated — zero ssffmvp in src/
- [ ] Service labels updated in logging.js and systemContracts.js (→ corvus-api)
- [ ] package.json name (slops-saloon) and cron path (corvus_*) updated
- [ ] docker-compose.yml container names, image tags, and network name updated (→ slops-saloon)
- [ ] deploy.yml image tags, cache scopes, and health check updated (→ slops-saloon)
- [ ] Skill folder renamed to run-slops-saloon
- [ ] 175/175 tests pass after all changes
- [ ] Single commit with all changes
- [ ] Report commit hash and final git log

---

## Do NOT

- Do not `git push`
- Do not run `docker compose up`, `docker build`, or any deploy commands
- Do not touch `.env`, Infisical, secrets, or production infrastructure
- Do not modify frontend components, Supabase migrations, or database files
  unless a require() fix requires it
- Do not rename `manager_agent.md` or `sub_agents.md`

---

## Justin's Action Items (After Codex Completes)

These must be done by Justin manually — Codex cannot do them:

1. **Rename local directory**
   ```
   In File Explorer or terminal:
   rename  SLOPS\ssffmvp  to  SLOPS\slops-saloon
   ```

2. **Rename GitHub repo**
   - GitHub → repository Settings → Danger Zone → Rename → `slops-saloon`

3. **Update git remote inside the renamed directory**
   ```bash
   cd SLOPS\slops-saloon
   git remote set-url origin https://github.com/justinduverge-design/slops-saloon
   git remote -v
   ```

4. **Push the Codex commit**
   ```bash
   git push origin main
   ```
   GitHub Actions will build and push new images as `slops-saloon:main` and
   `slops-saloon-cron:main` to GHCR.

5. **Oracle — update directory and remote**
   ```bash
   # SSH to Oracle
   mv /path/to/ssffmvp /path/to/slops-saloon
   cd /path/to/slops-saloon
   git remote set-url origin https://github.com/justinduverge-design/slops-saloon
   git pull origin main
   docker compose pull        # pulls new slops-saloon images
   docker compose up -d       # restarts with new container names (slops-saloon_api, slops-saloon_cron)
   ```
   Verify with `docker ps` and `curl https://slopssaloon.com/api/health`.
