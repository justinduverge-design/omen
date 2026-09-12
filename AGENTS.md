# Omen — Shared Agent Context

**App renamed:** Corvus → Omen (2026-06-22). The external repo, deploy path, GHCR images, and containers are now Omen. New source files, user-facing strings, comments, and local contracts should use Omen; keep `corvus` only for documented compatibility shims, redirects, legacy env fallbacks, and rollback evidence.

You are working in the Omen product layer. Lanes are a scheduling convenience, never an authority boundary — any runtime may be assigned any item. Confirm this session's actual capabilities and read Runtime Policy before applying any authority. See `AGENT.md` for Codex-specific ownership and safety rules.

**Omen is a fantasy football management app.** A user connects a real league — ESPN, Yahoo, or
Sleeper — and Omen tells them the best move to make this week: what to do, why it matters, what the
risk is, and how confident it is. Plain-English reasoning, not heavy math. It ships as a mobile app
(iPhone SwiftUI + Android Kotlin/Compose) with a secondary web app; native is active authority.

**Product detail lives in `Direction/context.md`. Standing constraints — what is free, what is cut,
what may be said publicly — live in `Direction/facts-of-record.md`.** Both are in the read order.
Do not restate them here: this paragraph carried the billing and Draft-Assistant constraints until
2026-09-12 and had already drifted from the facts of record.

## Read in order before pulling a task

**One read order, expressed once: `CLAUDE.md` § "Read in order before pulling a task".**
`Blueprints/prompts/kickoff-l2.md` carries the identical list by contract and
`node scripts/check-kickoff-drift.js` enforces it.

This file used to restate the order, and the restatement drifted — it still listed
`Direction/decision_log.md` as an up-front read after that was dropped on 2026-09-12, and it
never carried the `current_sprint` / `known_issues` splits. A second copy of a read order is a
second source of truth for the same contract, and the copy is always the one that goes stale.
Read the list in `CLAUDE.md`.

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

Paste `Blueprints/prompts/kickoff-l2.md` to start any Omen session. It is the only live kickoff prompt in `Blueprints/prompts/`; older task-specific kickoffs are archived under `Archive/prompts/`.

Short founder prompts are valid. If the founder says something like "this Command Center screen feels wrong" or "fix this League flow", the agent should use kickoff, identify the surface, route to the relevant skills by name, and ask only for the missing decision or approval that materially changes the work.

## Close-out

Satisfy `Blueprints/definition-of-done.md`, append rows to `Blueprints/playbooks/skill-usage-ledger.md` and `Blueprints/done/LEDGER.md`, log decisions in `Direction/decision_log.md`, write a dated handoff in `Blueprints/handoffs/`, and run the close-out gates named by `AGENT.md` / `CLAUDE.md`. A P0 blocks close-out; an unrun check is not a passing check.
