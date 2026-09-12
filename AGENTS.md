# Omen — Codex Context

**App renamed:** Corvus → Omen (2026-06-22). The external repo, deploy path, GHCR images, and containers are now Omen. New source files, user-facing strings, comments, and local contracts should use Omen; keep `corvus` only for documented compatibility shims, redirects, legacy env fallbacks, and rollback evidence.

You are working in the Omen product layer. Lanes are a scheduling convenience, never an authority boundary — any runtime may be assigned any item. Confirm this session's actual capabilities and read Runtime Policy before applying any authority. See `AGENT.md` for Codex-specific ownership and safety rules.

**Product shape:** Omen is a **mobile app** (iPhone SwiftUI + Android Kotlin/Compose) that also has a web app. The native mobile pivot is active authority; the web app is secondary and new web page migrations are paused. Omen is **free indefinitely** — no Stripe, subscription, or paywall code exists. **Draft Assistant is cut from 1.0** (2026-08-05) and ships for the **2027 fantasy draft** on a Slops-built ADP. Amended 2026-08-14: a single factual "2027 fantasy draft" mention is permitted on the marketing site and in a clearly-labelled in-app "not in this version" note — never "coming soon", never a month. It stays out of **store metadata**, onboarding copy, navigation, legal copy, and the advertised tool list.

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

Paste `Blueprints/prompts/kickoff-l2.md` to start a session — or just run the auto-populate flow described in `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`.

## Close-out

Satisfy `Blueprints/definition-of-done.md`, append a row to `Blueprints/playbooks/skill-usage-ledger.md`, log decisions in `Direction/decision_log.md`, and write a dated handoff in `Blueprints/handoffs/`.
