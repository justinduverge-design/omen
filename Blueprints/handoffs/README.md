# Corvus Handoffs

This folder is the active frontend/backend handoff layer for Corvus.

## Active Files

- `frontend-to-backend.md` - Claude/frontend requests for Codex/backend.
- `backend-to-frontend.md` - Codex/backend completed contracts and answers for Claude/frontend.
- `decisions.md` - shared engineering handoff decisions.

## Required Handoff Shape

Every endpoint or contract handoff should include:

- feature name
- status
- method and path
- request body or query
- response shape
- example response
- files changed
- limitations
- how frontend should call it

## Boundary

Do not put root SLOPS OS handoffs or Slops Saloon division handoffs here unless they directly affect Corvus product execution.
