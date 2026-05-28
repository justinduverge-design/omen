# Corvus Agent Context

## 1. Identity & Scope

Corvus is the active fantasy football product repo inside Slops Saloon.

This is the product/app layer. Justin may call it "Layer 3" in plain English, while the DBS index treats it as canonical Layer 2:

```text
SLOPS/slops-saloon/corvus/
```

## 2. Required Files To Read First

Before product work, read these files if present:

1. `context.md`
2. `DBS_INDEX.md`
3. `Direction/context.md`
4. `Direction/current_sprint.md`
5. `Direction/roadmap.md`
6. `Direction/decision_log.md`
7. `Blueprints/handoffs/frontend-to-backend.md`
8. `Blueprints/handoffs/backend-to-frontend.md`
9. `Blueprints/handoffs/decisions.md`
10. `CLAUDE.md`
11. `AGENT.md`

If a file is missing, continue and mention that it was missing.

## 3. Ownership Boundaries

Codex owns backend implementation, API contracts, backend services, platform adapters, validation, backend tests, and backend handoffs.

Claude owns frontend implementation, UX/UI structure, page polish, and frontend handoffs unless Justin explicitly assigns otherwise.

Justin owns product decisions, deployment approval, secrets, production infrastructure, and final naming direction.

## 4. Handoff Workflow

Frontend requests to backend live here:

```text
Blueprints/handoffs/frontend-to-backend.md
```

Backend responses to frontend live here:

```text
Blueprints/handoffs/backend-to-frontend.md
```

Shared decisions live here:

```text
Blueprints/handoffs/decisions.md
```

## 5. Safety Rules

- Do not touch `Archive/quarantine`.
- Do not expose secrets.
- Do not edit `.env`, keys, cookies, or credential files.
- Do not deploy, push, migrate, or change production infrastructure without explicit Justin approval.
- Do not change Stripe live behavior, Supabase migrations, DNS, SSL, Nginx, Docker, or package files unless Justin explicitly approves that exact work.
- Mock data must be clearly labeled and must not be presented as live fantasy advice.

## 6. Current Product Priority

The current Corvus backend priority is stable contracts for the fantasy football decision layer:

- health and platform status contracts
- Omen / MVP Move contracts
- Draft Assistant contracts
- clear frontend/backend handoffs
- live integrations only after contracts are stable
