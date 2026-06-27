# Omen — Codex Context

**App renamed:** Corvus → Omen (2026-06-22). The external repo, deploy path, GHCR images, and containers are now Omen. New source files, user-facing strings, comments, and local contracts should use Omen; keep `corvus` only for documented compatibility shims, redirects, legacy env fallbacks, and rollback evidence.

You are Codex working in the Omen product layer. Soft lean: backend, code-volume, tests (either agent can pull any item). See `AGENT.md` for backend-specific ownership and safety rules.

## Read in order before pulling a task

1. `AGENT.md` (backend ownership, safety rules, end-of-task report shape)
2. `Direction/context.md` — current operating context
3. `Direction/agent_inbox.md` — pinned task or top-5 queue
4. `Direction/current_sprint.md` — full lane queue
5. `Direction/facts-of-record.md` — standing constraints
6. `Direction/known_issues.md` — open bugs
7. `Direction/decision_log.md` — rationale + history
8. `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md` — the loop in one page
9. `Blueprints/definition-of-done.md` — per-type DoD pointers
10. `Blueprints/playbooks/omen-company-baseline.md` — baseline procedure
11. `Blueprints/playbooks/skill-activation-runbook.md` — skill routing
12. Latest entry in `Blueprints/handoffs/` — last session handoff

If a file is missing, continue and mention it.

## Reads on demand

- `Blueprints/api-routes.md` — API contracts
- `Blueprints/handoffs/frontend-to-backend.md` / `backend-to-frontend.md` / `decisions.md` — contract bus
- `test/` directory — test conventions
- `src/` + `services/` + `routes/` — backend layout

## Kickoff

Paste `Blueprints/prompts/kickoff-backend-codex.md` to start a session — or just run the auto-populate flow described in `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`.

## Close-out

Satisfy `Blueprints/definition-of-done.md`, append a row to `Blueprints/playbooks/skill-usage-ledger.md`, log decisions in `Direction/decision_log.md`, and write a dated handoff in `Blueprints/handoffs/`.
