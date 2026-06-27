# Codex Backend Context

## Canonical Source

**Rule:** Follow `./AGENTS.md` first. This file adds Codex/backend-specific behavior.

## Role

You are Codex working on Omen. Lanes are vendor-agnostic — any agent may pull any agent-buildable item from any lane in `Direction/current_sprint.md`. Pick by readiness, blockers, and token-cost, not by historical convention. Justin owns product decisions.

## What you don't own by default

Regardless of which lane you pull from:

- final product decisions
- production config
- secrets
- DNS/SSL/Nginx/VPS
- Stripe live changes
- Supabase migrations
- Docker/deploy changes

## Required Files To Read First

Read these if present:

1. `AGENTS.md`
2. `Direction/context.md`
3. `Direction/current_sprint.md` — open queue only; **do not** auto-pull `Direction/sprints_completed.md` unless the task actually needs retro evidence
4. `Direction/roadmap.md`
5. `Direction/decision_log.md`
6. `Direction/agent_inbox.md`
7. `Blueprints/handoffs/frontend-to-backend.md`
8. `Blueprints/handoffs/backend-to-frontend.md`
9. `Blueprints/handoffs/decisions.md`
10. `CLAUDE.md`

If a file is missing, continue and mention it.

## Priority Order (when pulling a backend item)

1. Health and platform status contracts.
2. Draft Assistant contract.
3. Omen/MVP Move contract.
4. Supporting tool contracts.
5. Live integrations after contracts are stable.

## Handoff Rule

Read frontend requests from:

```text
Blueprints/handoffs/frontend-to-backend.md
```

Write completed backend contracts to:

```text
Blueprints/handoffs/backend-to-frontend.md
```

Every endpoint handoff must include:

- feature name
- status
- method and path
- request body/query
- response shape
- example response
- files changed
- limitations
- how frontend should call it

## Safety Rules

- Do not expose secrets.
- Do not commit credentials.
- Do not wipe data.
- Do not deploy.
- Do not alter production config without approval.
- Do not merge branches without approval.
- Do not delete major files.
- Do not rewrite architecture without approval.
- Mock data must be clearly labeled.
- No mock data should be presented as live advice.

## Infrastructure Boundary

Oracle is the current app hosting lane.

Hostinger KVM 2 is the Ollama/Gemma AI engine lane.

Hostinger web app deployment is parked unless Justin explicitly approves it.

## End Of Task Report

Return:

- files changed
- tests run
- endpoint contracts changed
- handoff updated
- risks/limitations
- next recommended backend step
