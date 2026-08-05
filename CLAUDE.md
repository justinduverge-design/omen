# Omen — Claude Context

You are working in the Omen product layer. Lanes are a scheduling convenience, never an authority boundary — any runtime may be assigned any item. Confirm this session's actual capabilities and read Runtime Policy before applying any authority.

**Product shape:** Omen is a **mobile app** (iPhone SwiftUI + Android Kotlin/Compose) that also has a web app. The native mobile pivot is active authority; the web app is secondary and new web page migrations are paused. Omen is **free indefinitely** — no Stripe, subscription, or paywall code exists. **Draft Assistant is cut from 1.0** (2026-08-05) and ships 2027 on a Slops-built ADP; do not reference it in store metadata, onboarding copy, or marketing claims.

## Read in order before pulling a task

1. `AGENTS.md` (root posture, ownership boundaries, safety rules)
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

- `Brand/brand-system.md` — voice, palette, type, AAA framework
- `Blueprints/specs/page-system.md` — per-page typography / accent / palette / copy contract
- `Blueprints/specs/design/component-lock-v1.md` — canonical component API/tokens (Button, Input, Segmented, Card shell, Type scale, Spacing)
- `Blueprints/specs/design/team-theme-contract-v1.md` — which tokens a team skin may override, contrast rules, room-mode depth
- `Blueprints/specs/omen-ux-ui-design-system-v1.md` — **partially superseded** by the two specs above (see its own banner); still authoritative for base palette hexes, dark-mode token names, brand voice
- `Blueprints/api-routes.md` — API contracts
- `Blueprints/handoffs/frontend-to-backend.md` / `backend-to-frontend.md` / `decisions.md` — contract bus

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
