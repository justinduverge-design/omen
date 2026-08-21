# Omen — Shared Agent Context

This is Omen's canonical repository bootstrap for Codex and any runtime that supports `AGENTS.md`. Claude Code loads `CLAUDE.md`, which imports this file. Lanes are scheduling conveniences, not authority boundaries; confirm the session's actual capabilities and current assignment before acting.

## Product posture

- Omen is primarily a native mobile app: SwiftUI on iPhone and Kotlin/Jetpack Compose on Android.
- The web app is secondary; new web-only page migrations are paused.
- Omen is free indefinitely. Do not introduce Stripe, subscriptions, or paywalls.
- Draft Assistant is outside Omen 1.0 and targets the 2027 fantasy draft on a Slops-built ADP. One factual "2027 fantasy draft" mention is allowed on the marketing site and in a clearly labeled in-app "not in this version" note; never say "coming soon" or name a month. Keep it out of store metadata, onboarding, navigation, legal copy, and the advertised tool list.
- Use `Omen` in current source and copy. Keep `corvus` only for documented compatibility, redirects, legacy environment fallbacks, or rollback evidence.

## Read before pulling a task

1. `DBS_INDEX.md` — repository navigation and canonical paths
2. `Direction/context.md`
3. `Direction/agent_inbox.md` — a founder pin wins
4. `Direction/current_sprint.md`
5. `Direction/status-model.md`
6. `Direction/facts-of-record.md`
7. `Direction/known_issues.md`
8. `Direction/decision_log.md`
9. `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`
10. `Blueprints/definition-of-done.md`
11. `Blueprints/playbooks/omen-company-baseline.md`
12. `Blueprints/playbooks/skill-activation-runbook.md`
13. The latest relevant entry in `Blueprints/handoffs/`

If a file is missing, continue safely and report the gap.

## Read on demand

- Backend/API work: `Blueprints/api-routes.md`, relevant `src/`, `services/`, `routes/`, `test/`, and contract handoffs.
- Design/UI work: `Brand/brand-system.md`, `Blueprints/specs/page-system.md`, and the applicable component, theme, and UX design-system specs.
- Release work: `Direction/omen-1.0-plan.md` and `Direction/release_readiness.md`.

## Native mobile read gate

Before native iPhone, Android, mobile design-system, onboarding, provider-connection, or mobile release work, read:

1. `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md`
2. `Blueprints/specs/mobile/omen-native-design-house-v1.md`
3. `Blueprints/specs/mobile/omen-native-delivery-governance-v1.md`
4. `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md`
5. `Blueprints/specs/mobile/omen-native-agent-capabilities-canvas-v1.md`
6. `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`
7. The relevant approved Figma screen/component and API/state contract

Do not begin native feature code when required authority is missing or contradictory. Do not introduce React Native.

## Safety boundaries

- Do not expose or commit secrets, cookies, or credentials.
- Do not wipe data or present mock data as live advice.
- Do not change production configuration, migrations, deployment, DNS, SSL, VPS infrastructure, package files, store accounts, signing, or release metadata without the required explicit approval.
- Do not merge branches without founder approval.
- Treat local validation, merge, CI, deployment, canary, and live-provider proof as separate evidence stages.

## Kickoff

Run `Blueprints/prompts/kickoff.md` to start an Omen session. This local entry point must continue to work in standalone clones and CI.

## Close-out

Satisfy `Blueprints/definition-of-done.md`, update the required queue/evidence records, append the skill-usage ledger when applicable, and write a dated handoff. Report files changed, checks run, contract or handoff changes, risks or limitations, and the next recommended step.
