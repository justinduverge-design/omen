# Codex Context — Omen

## Canonical Source

**Rule:** Follow `./AGENTS.md` first. This file adds Codex-specific behavior.

> **Reconciled 2026-08-05.** This file was titled "Codex Backend Context" and
> described a Stripe-era, web-only, Oracle-hosted product. Corrections: Stripe
> was removed 2026-07-12; the deploy lane is Hostinger KVM1, not Oracle; and
> Omen is now primarily a **native mobile app**. Codex's entry point had zero
> mobile awareness while `CLAUDE.md` carried a full native read gate.

## Product shape

**Omen is a mobile app** — iPhone (SwiftUI) and Android (Kotlin + Jetpack
Compose) — that also has a web app. The native mobile pivot is **active
authority** (`Direction/current_sprint.md` §Native Mobile Pivot). The web app is
secondary; new web page migrations are paused.

Omen is **free indefinitely**. There is no Stripe, subscription, or paywall code.

## Native mobile read gate

For any native iPhone, Android, mobile design-system, mobile onboarding,
provider-connection, or mobile release task, read these before planning or code:

1. `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md`
2. `Blueprints/specs/mobile/omen-native-design-house-v1.md`
3. `Blueprints/specs/mobile/omen-native-delivery-governance-v1.md`
4. `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md`
5. `Blueprints/specs/mobile/omen-native-agent-capabilities-canvas-v1.md`
6. `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`
7. The relevant approved Figma screen/component and API/state contract

Do not start native feature code when any of those are missing or conflict.
Flag the gap instead. Native targets are SwiftUI and Kotlin/Compose — **do not
introduce React Native.**

## Role

You are Codex working on Omen. Lanes are vendor-agnostic — any agent may pull any agent-buildable item from any lane in `Direction/current_sprint.md`. Pick by readiness, blockers, and token-cost, not by historical convention. Justin owns product decisions.

## Backend lean — typical scope

This file adds backend-specific procedure. It describes a soft lean, not an ownership boundary:

- API routes
- backend services
- platform adapters (Yahoo, Sleeper, ESPN)
- auth/session support when approved
- health checks
- backend tests
- env documentation
- backend handoffs

(Removed 2026-08-05: "subscription/status support" — Stripe and all
subscription code were deleted from Omen on 2026-07-12.)

## What you don't own by default

Regardless of which lane you pull from:

- final product decisions
- production config
- secrets
- DNS/SSL/Nginx/VPS
- Supabase migrations
- Docker/deploy changes
- **Apple/Google store accounts, signing certificates, provisioning profiles,
  release configuration, and store metadata submission**
- provider client secrets (these stay in Supabase Studio)

## Required Files To Read First

Read these if present:

1. `AGENTS.md`
2. `context.md` — product shape and current truth
3. `Direction/context.md`
4. `Direction/agent_inbox.md` — pinned task or top-5 queue
5. `Direction/current_sprint.md`
6. `Direction/facts-of-record.md` — standing constraints
7. `Direction/known_issues.md`
8. `Direction/decision_log.md`
9. `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`
10. `Blueprints/definition-of-done.md`
11. `Blueprints/handoffs/frontend-to-backend.md`
12. `Blueprints/handoffs/backend-to-frontend.md`
13. `Blueprints/handoffs/decisions.md`

For launch or release work also read `Direction/omen-1.0-plan.md` (scope and
sequence) and `Direction/release_readiness.md` (evidence record).

If a file is missing, continue and mention it.

## Backend Priority Order

1. Health and platform status contracts.
2. Omen/MVP Move contract (`POST /api/omen/mvp-move` — the only canonical route).
3. Supporting tool contracts.
4. Live integrations after contracts are stable.

**Draft Assistant was removed from this list 2026-08-05** — it is cut from 1.0
and ships 2027 on a Slops-built ADP. Do not build against it or reference it in
store metadata, onboarding copy, or marketing claims.

## Handoff Rule

Use `Direction/agent_inbox.md` as the active task slot. Use
`Blueprints/prompts/kickoff-l2.md` when the founder starts a task,
and satisfy `Blueprints/definition-of-done.md` before calling the task done.

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

**Hostinger KVM1 is the live app hosting lane** — `/opt/omen/deploy/hostinger`,
containers `omen_api` and `omen_cron`, image `ghcr.io/justinduverge-design/omen:main`.
Health at `https://slopssaloon.com/api/health` reports `service: omen-api`.

Hostinger KVM2 is the Ollama/Gemma AI engine lane.

> Corrected 2026-08-05. This section previously said "Oracle is the current app
> hosting lane" and "Hostinger web app deployment is parked unless Justin
> explicitly approves it." Both were wrong and actively misleading — Hostinger
> KVM1 has been the production lane for some time.

Deploys still require Justin's approval when the task is not explicitly a deploy task.

## End Of Task Report

Return:

- files changed
- tests run
- endpoint contracts changed
- handoff updated
- risks/limitations
- next recommended backend step
