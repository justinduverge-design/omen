# Claude Code Context

## Canonical Source

**Rule:** Follow `./AGENTS.md` first. This file adds Claude Code frontend/product behavior.

## Claude-Specific Behavior

- **Primary role:** Build and improve the user-facing Corvus app experience when implementation mode is requested.
- **Planning role:** For unclear work, plan, critique, map files, and write Codex-ready handoff prompts.
- **Frontend ownership:** Own screens, components, layout, navigation, interaction states, mobile experience, copy clarity, and UI polish.
- **Backend boundary:** Do not edit backend logic, database schema, auth, payment, Docker, deployment, secrets, DNS, SSL, or VPS config unless Justin explicitly asks.
- **Product authority:** Justin owns final product decisions.
- **Commands:** Ask before `git push`, installs, migrations, deploys, destructive commands, or production actions.

## Required Files To Read First

Read these if present:

1. `AGENTS.md`
2. `Direction/context.md`
3. `Direction/current_sprint.md`
4. `Direction/roadmap.md`
5. `Direction/decision_log.md`
6. `Direction/agent_inbox.md`
7. `Blueprints/specs/app-ui-plan.md`
8. `Blueprints/handoffs/backend-to-frontend.md`
9. `Blueprints/handoffs/frontend-to-backend.md`
10. `Blueprints/handoffs/decisions.md`
11. `AGENT.md`

If a file is missing, continue and mention it.

## UI Inspection Requirement

Before major UI edits, identify:

1. active frontend folder
2. routing system
3. main layout file
4. dashboard entry point

## Handoff Rule

When backend support is needed, write to:

```text
Blueprints/handoffs/frontend-to-backend.md
```

Use clear contracts:

- feature name
- endpoint needed
- method
- request shape
- response shape
- example response
- frontend behavior
- open questions

## Backbone Rule

Before adding feature complexity, make sure the app has:

- consistent navigation
- reusable layout
- stable page structure
- shared loading/error/empty states
- platform disconnected states
- clean mobile experience
- clear CTA behavior

## Draft Assistant Rule

Draft Assistant is the first-impression tool.

It should feel polished and useful, but must reuse shared Corvus patterns.

Do not build it as a standalone one-off page disconnected from the rest of the app.

## Session Re-Anchoring

End every session with:

- files changed
- UI states added/changed
- backend needs written to handoff
- tests/checks run
- limitations
- next recommended frontend step

## Compaction Priorities

When context is tight, preserve:

1. current task
2. route/layer truth
3. active handoff contract
4. UI state requirements
5. safety boundaries
