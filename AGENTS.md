# Omen — Codex Context

**App renamed:** Corvus → Omen (2026-06-22). The external repo, deploy path, GHCR images, and containers are now Omen. New source files, user-facing strings, comments, and local contracts should use Omen; keep `corvus` only for documented compatibility shims, redirects, legacy env fallbacks, and rollback evidence.

You are Codex working in the Omen product layer. Read these modules in order before pulling a task.

1. **Identity** — see `../../Blueprints/agent-modules/identity-codex.md`
2. **Layer in scope** — see `../../Blueprints/agent-modules/layer-2-rules.md`
3. **Action posture** — see `../../Blueprints/agent-modules/action-posture.md`
4. **Resources available** — see `../../Blueprints/agent-modules/resources-index.md` (points to `RESOURCES_INDEX.md`)
5. **Files to read first** — see `../../Blueprints/agent-modules/files-to-read-first-L2.md`
6. **Hard prohibitions** — see `../../Blueprints/agent-modules/hard-prohibitions.md`
7. **Session handoff** — see `../../Blueprints/agent-modules/session-handoff.md`
8. **Cross-layer graph** (multi-layer tasks only) — see `../../Blueprints/agent-modules/graphify-hook.md`

**Omen-specific reads on demand:**

- `Direction/known_issues.md` — open bugs
- `Blueprints/api-routes.md` — API contracts
- `test/` directory — test conventions
- `src/` + `services/` + `routes/` — backend layout

**Kickoff:** `Blueprints/prompts/kickoff-backend-codex.md` (wrapper) — or just run the auto-populate flow per `../../Blueprints/prompts/kickoff-modules/pull-task.md`.
