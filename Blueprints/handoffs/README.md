# Omen Handoffs

Dated notes written when work continues in another session: `YYYY-MM-DD-<topic>.md`. The newest files describe
the current state. `Direction/map.md` names the latest handoff to start from.

## Long-running files

- `frontend-to-backend.md` and `backend-to-frontend.md`: endpoint and contract requests and answers between the
  app (web and native) and the API.
- `decisions.md`: shared engineering decisions made during handoffs. Product decisions go in
  `Direction/decision_log.md`.
- `jules/`: the 2026-07 web UI brief queue for Jules. Historical.

Most files before 2026-09 describe the web-first phase and are history, not instructions.

## Shape of an endpoint or contract handoff

Feature name, status, method and path, request body or query, response shape, an example response, files
changed, limitations, and how the client should call it.

## Boundary

Handoffs for Slops OS (L0) or the Slops Saloon division (L1) do not belong here unless they directly change
Omen work.
