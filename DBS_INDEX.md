# Corvus DBS Index

This is the product repo navigation map for Corvus.

Corvus is Layer 2 inside SLOPS OS.

## Canonical Path

```text
C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus
```

## Parent Layers

- Layer 0 - SLOPS OS: `C:\Users\JDuve\OneDrive\Desktop\SLOPS`
- Layer 1 - Slops Saloon division: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon`
- Layer 2 - Corvus product repo: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`

## Current Truth

- Corvus is the Fantasy Football MVP.
- This repo is the product layer.
- The old nested `Corvus/` folder is retired.
- Product docs now live at the repo root under `Direction/`, `Blueprints/`, `Brand/`, `References/`, `Solutions/`, and `Archive/`.
- GitHub repo: `justinduverge-design/corvus`.
- Oracle checkout path: `~/corvus`.
- Production health currently reports `service: corvus-api`.

## Product Folders

```text
Direction/      Current product context, roadmap, sprint, decisions, risks
Blueprints/     Product prompts, specs, handoffs, playbooks, and design/security docs
Brand/          Corvus brand and positioning
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

## Read First

For backend or product work:

1. `Direction/context.md`
2. `Direction/current_sprint.md`
3. `Direction/roadmap.md`
4. `Direction/decision_log.md`
5. `Blueprints/handoffs/frontend-to-backend.md`
6. `Blueprints/handoffs/backend-to-frontend.md`
7. `Blueprints/handoffs/decisions.md`

For frontend work:

1. `Direction/context.md`
2. `Blueprints/design.md`
3. `Blueprints/specs/app-ui-plan.md`
4. `Blueprints/handoffs/backend-to-frontend.md`
5. `Blueprints/handoffs/frontend-to-backend.md`

## Handoffs

Use:

- Frontend to backend requests: `Blueprints/handoffs/frontend-to-backend.md`
- Backend to frontend responses: `Blueprints/handoffs/backend-to-frontend.md`
- Shared engineering decisions: `Blueprints/handoffs/decisions.md`

## Source Boundary

Do not treat the parent `slops-saloon/` folder as the app repo.

Do not recreate the retired `Corvus/` subfolder.

Do not edit `.env`, secrets, DNS, SSL, Nginx, production infrastructure, Supabase migrations, Stripe behavior, package files, or deployment config unless Justin explicitly approves that exact work.
