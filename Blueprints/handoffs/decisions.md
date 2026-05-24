# Engineering Decisions

## Purpose

Shared frontend/backend engineering decisions for the active `slops-saloon` app repo.

Company-level decisions belong in the SLOPS OS layer. Corvus product decisions belong under `Corvus\Direction` unless they directly affect app contracts.

## Active Decisions

- `Blueprints\handoffs\frontend-to-backend.md` is the canonical place for Claude/frontend requests to Codex/backend.
- `Blueprints\handoffs\backend-to-frontend.md` is the canonical place for Codex/backend contract responses to Claude/frontend.
- `Blueprints\handoffs\decisions.md` is the canonical shared engineering decision log for active app coordination.
- Corvus is the active Fantasy Football MVP product.
- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit and waiver logic live inside Omen / MVP Move unless Justin separates them later.
- Yahoo, Sleeper, and ESPN all matter.
- ESPN is essential but risky and needs recovery playbooks.
- ESPN recovery routes through `/account` with safe state/query context only.
- ESPN league selection belongs in a full Account section for MVP, not a modal.
- Omen may preserve safe request context after ESPN recovery, but the user must click to rerun.
- `espn_import_blocked` remains the MVP user-facing state; safe backend `reason_code` values may be added later.
- Security and privacy decisions are tracked in `Blueprints\security-privacy.md`; compliance evidence is tracked in `probo.yaml`.
- Users need plain-English reasoning, not heavy math.

## Open Decisions

- Whether recovery analytics ship before or after the first paid launch gate.

## Closed Decisions

- Account page ESPN recovery handling — Account.jsx now reads `?recovery=<state>` via `useSearchParams` and passes `recoveryState` to `PlatformConnections`. ESPN CTA in Omen uses safe query params (`platform=espn&recovery=<state>`). `VITE_ESPN_ENABLED` gate is bypassed when arriving from an ESPN recovery state. Closed 2026-05-23.
