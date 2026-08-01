# Omen — Codex Context

**App renamed:** Corvus → Omen (2026-06-22). The external repo, deploy path, GHCR images, and containers are now Omen. New source files, user-facing strings, comments, and local contracts should use Omen; keep `corvus` only for documented compatibility shims, redirects, legacy env fallbacks, and rollback evidence.

You are working in the Omen product layer. Lanes are a scheduling convenience, never an authority boundary — any runtime may be assigned any item. Confirm this session's actual capabilities and read Runtime Policy before applying any authority. See `AGENT.md` for backend-specific ownership and safety rules.

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
- `Blueprints/specs/design/component-lock-v1.md` / `team-theme-contract-v1.md` — current frontend design authority; read before any task that touches shared UI components or team theming, even from the backend lane

## Native mobile read gate

For any native iPhone, Android, mobile design-system, mobile onboarding, provider-connection, or mobile release task, read these before planning or code:

1. `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md`
2. `Blueprints/specs/mobile/omen-native-design-house-v1.md`
3. `Blueprints/specs/mobile/omen-native-delivery-governance-v1.md`
4. `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md`
5. `Blueprints/specs/mobile/omen-native-agent-capabilities-canvas-v1.md`
6. `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`
7. Relevant approved Figma screen/component and API/state contract

Do not start native feature code when any of those sources are missing or conflict. Flag the gap instead.

## Kickoff

Paste `Blueprints/prompts/kickoff-l2.md` to start a session — or just run the auto-populate flow described in `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`.

## Close-out

Satisfy `Blueprints/definition-of-done.md`, append a row to `Blueprints/playbooks/skill-usage-ledger.md`, log decisions in `Direction/decision_log.md`, and write a dated handoff in `Blueprints/handoffs/`.
