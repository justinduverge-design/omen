# Omen DBS Index

This is the product repo navigation map for Omen.

Omen is Layer 2 inside SLOPS OS.

When Justin says "Layer 3," treat that as this third layer in plain English.

## Canonical Path

```text
C:\Users\JDuve\dev\SLOPS\slops-saloon\omen
```

> Corrected 2026-08-05. This file previously gave **two different canonical
> paths** — an obsolete `OneDrive\Desktop\...\corvus` path here and the correct
> `dev\...\omen` path under Parent Layers. The OneDrive tree and the `corvus`
> name are both retired.

## Parent Layers

- Layer 0 — SLOPS OS: `C:\Users\JDuve\dev\SLOPS`
- Layer 1 — Slops Saloon division: `C:\Users\JDuve\dev\SLOPS\slops-saloon`
- Layer 2 — Omen product repo: `C:\Users\JDuve\dev\SLOPS\slops-saloon\omen`

## Current Truth

- **Omen is a mobile app** (iPhone SwiftUI + Android Kotlin/Compose) that also has a web app. The web app is secondary and is not the beta surface.
- The native mobile pivot is **active authority** — see `Direction/current_sprint.md` §Native Mobile Pivot.
- This repo is the product layer.
- Product docs live at the repo root under `Direction/`, `Blueprints/`, `Brand/`, `References/`, `Solutions/`, and `Archive/`.
- GitHub repo: `justinduverge-design/omen`.
- **Deploy lane: Hostinger KVM1** at `/opt/omen/deploy/hostinger`, containers `omen_api` and `omen_cron`. Production health reports `service: omen-api`.
- Omen is **free indefinitely**. Stripe is fully removed — code, routes, middleware, table, and column.
- The old nested `Corvus/` folder is retired. Do not recreate it.

## Product Folders

```text
Direction/      Current product context, roadmap, sprint, decisions, risks
Blueprints/     Product prompts, specs, handoffs, playbooks, and design/security docs
Brand/          Omen brand system; `brand-system.md` is canonical, older drafts live in `Brand/archive/`
Legal/          Public contract, privacy, and operator identity documents
References/     Research and historical context
Solutions/      Finished product outputs and reports
Archive/        Superseded product history

mobile/         NATIVE APPS — the primary product surface
  ios/          iPhone app (SwiftUI, target OmenIOS)
  android/      Android app (Kotlin + Jetpack Compose)
  contracts/    Native auth provisioning and QA runbooks

src/            Backend source
test/           Backend tests
sql/            Database/reference SQL
scripts/        Product scripts
deploy/         Hostinger KVM1 deploy configuration
evals/          AI evaluation harness
frontend/       Web app (secondary surface)
client/         Frontend build input used by Docker
```

`mobile/` was absent from this list until 2026-08-05 despite being the primary
product surface. Do not start native work without reading the native mobile read
gate in `CLAUDE.md`.

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

**All work** starts with `AGENTS.md` (or `CLAUDE.md` / `AGENT.md` for the
runtime you are), then `Direction/context.md`, `Direction/agent_inbox.md`,
`Direction/current_sprint.md`, `Direction/facts-of-record.md`.

**Native mobile work** — the primary surface. Read the native mobile read gate in
`CLAUDE.md` before planning or writing code. Do not start native feature work
when any of those specs are missing or conflict; flag the gap instead.

**Backend work:**

1. `Direction/current_sprint.md`
2. `Direction/facts-of-record.md`
3. `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`
4. `Blueprints/definition-of-done.md`
5. `Blueprints/api-routes.md`
6. `Blueprints/handoffs/frontend-to-backend.md`
7. `Blueprints/handoffs/backend-to-frontend.md`
8. `Blueprints/handoffs/decisions.md`

**Web frontend work** (secondary surface — new page migrations are paused by the
native pivot override):

1. `Brand/brand-system.md`
2. `Blueprints/specs/page-system.md`
3. `Blueprints/specs/design/component-lock-v1.md`
4. `Blueprints/design.md`
5. `Blueprints/handoffs/backend-to-frontend.md`

**Release / launch work:**

1. `Direction/omen-1.0-plan.md` — scope and sequence
2. `Direction/release_readiness.md` — evidence record

## Handoffs

Use:

- Frontend to backend requests: `Blueprints/handoffs/frontend-to-backend.md`
- Backend to frontend responses: `Blueprints/handoffs/backend-to-frontend.md`
- Shared engineering decisions: `Blueprints/handoffs/decisions.md`

## Source Boundary

Do not treat the parent `slops-saloon/` folder as the app repo.

Do not recreate the retired `Corvus/` subfolder.

Do not edit `.env`, secrets, DNS, SSL, Nginx, production infrastructure, Supabase
migrations, package files, or deployment config unless Justin explicitly approves
that exact work.

Store-related items are founder-gated: Apple/Google accounts, signing
certificates, provisioning profiles, release configuration, and store metadata
submission. Provider client secrets stay in Supabase Studio.

("Stripe behavior" was removed from this list 2026-08-05 — Stripe no longer
exists in Omen.)
