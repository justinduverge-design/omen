# Engineering Decisions

## Purpose

Shared frontend/backend engineering decisions for the active `ssffmvp` app repo.

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
- Users need plain-English reasoning, not heavy math.

## Open Decisions

- First frontend-to-backend Omen / MVP Move contract request.
- Exact ESPN recovery playbook states and user-facing copy.
