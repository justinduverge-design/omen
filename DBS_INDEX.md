# Omen DBS Index

This is the product repo navigation map for Omen.

Omen is Layer 2 inside SLOPS OS.

When Justin says "Layer 3," treat that as this third layer in plain English.

## Canonical Path

```text
C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus
```

## Parent Layers

- Layer 0 - SLOPS OS: `C:\Users\JDuve\OneDrive\Desktop\SLOPS`
- Layer 1 - Slops Saloon division: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon`
- Layer 2 - Omen product repo: `C:\Users\JDuve\dev\SLOPS\slops-saloon\omen`

## Current Truth

- Omen is the Fantasy Football MVP.
- This repo is the product layer.
- The old nested `Corvus/` folder is retired.
- Product docs now live at the repo root under `Direction/`, `Blueprints/`, `Brand/`, `References/`, `Solutions/`, and `Archive/`.
- GitHub repo: `justinduverge-design/omen`.
- Oracle checkout path: `~/corvus`.
- Production health currently reports `service: omen-api`.

## Product Folders

```text
Direction/      Current product context, roadmap, sprint, decisions, risks
Blueprints/     Product prompts, specs, handoffs, playbooks, and design/security docs
Brand/          Omen brand system; `brand-system.md` is canonical, older drafts live in `Brand/archive/`
References/     Research and historical context
Solutions/      Finished product outputs and reports
Archive/        Superseded product history
src/            Backend source
frontend/       Current frontend app
client/         Legacy/current frontend build input as used by Docker
test/           Backend tests
sql/            Database/reference SQL
scripts/        Product scripts
```

## Baseline Entry Files

This app layer still exposes the SLOPS baseline context files:

```text
context.md
DBS_INDEX.md
README.md
AGENTS.md
CLAUDE.md
```

On this Windows workspace, lowercase `agents.md` / `claude.md` references resolve to the canonical `AGENTS.md` / `CLAUDE.md` files.

The app may have extra source, config, and test folders. Those do not replace the baseline DBS entry files.

## Read First

For backend or product work:

1. `context.md`
2. `AGENTS.md`
3. `Direction/context.md`
4. `Direction/current_sprint.md`
5. `Direction/roadmap.md`
6. `Direction/decision_log.md`
7. `Direction/agent_inbox.md`
8. `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`
9. `Blueprints/definition-of-done.md`
10. `Blueprints/handoffs/frontend-to-backend.md`
11. `Blueprints/handoffs/backend-to-frontend.md`
12. `Blueprints/handoffs/decisions.md`

For frontend work:

1. `context.md`
2. `CLAUDE.md`
3. `Direction/context.md`
4. `Direction/agent_inbox.md`
5. `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`
6. `Blueprints/definition-of-done.md`
7. `Brand/brand-system.md`
8. `Blueprints/design.md`
9. `Blueprints/specs/app-ui-plan.md`
10. `Blueprints/handoffs/backend-to-frontend.md`
11. `Blueprints/handoffs/frontend-to-backend.md`

## Handoffs

Use:

- Frontend to backend requests: `Blueprints/handoffs/frontend-to-backend.md`
- Backend to frontend responses: `Blueprints/handoffs/backend-to-frontend.md`
- Shared engineering decisions: `Blueprints/handoffs/decisions.md`

## Source Boundary

Do not treat the parent `slops-saloon/` folder as the app repo.

Do not recreate the retired `Corvus/` subfolder.

Do not edit `.env`, secrets, DNS, SSL, Nginx, production infrastructure, Supabase migrations, Stripe behavior, package files, or deployment config unless Justin explicitly approves that exact work.
