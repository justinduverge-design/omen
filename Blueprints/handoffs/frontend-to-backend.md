# Frontend To Backend Handoff

## Purpose

Claude/frontend writes backend contract requests here.

Codex/backend reads this file before backend work and responds in `backend-to-frontend.md`.

## Active Context

- Corvus is the Fantasy Football MVP product.
- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit lives inside Omen / MVP Move.
- Waiver logic lives inside Omen / MVP Move unless explicitly separated later.
- Yahoo, Sleeper, and ESPN all matter.
- ESPN is essential but risky and needs recovery playbooks.
- Users need plain-English reasoning, not heavy math.

## Open Frontend Requests

None yet.

## Frontend Alignment Audit

Date: 2026-05-24

Owner: Codex/frontend alignment pass

Feature: Corvus dashboard IA and Omen / MVP Move contract alignment

Status: No backend request opened.

Findings:

- Active UI work belongs in `frontend/`; `client/` appears stale because it has no `client/src`.
- `/football` remains the protected app entry point and `Football.jsx` is the dashboard shell.
- Trade Analyzer is the front door, Draft Assistant is the seasonal preparation tool, and Omen of the Week / MVP Move is the weekly main event.
- Standalone Start/Sit and Waiver tabs were removed from primary dashboard navigation so those decisions remain represented inside Omen / MVP Move.
- `OmenOfTheWeek.jsx` remains the mounted production Omen display. `Omen.jsx` remains unmounted and should be treated as a dev/contract harness until Justin decides whether to retire it or extract fixtures from it.
- Mounted Omen now calls `POST /api/omen/mvp-move` with the intended decision scope and signal toggles while letting the backend infer platform, league, team, and week where possible.
- Omen already handles `success`, `empty`, `platform_disconnected`, `espn_*` recovery states, and `error`, including confidence, risk, signals, and ESPN recovery CTA behavior.

Backend need:

None for this pass. A later backend request may be useful if the dashboard should expose a preferred platform, league, team, week, or scoring format for the mounted Omen request.

## Request Template

```text
Date:
Owner:
Feature:
Needed by:

Frontend need:

Expected endpoint or contract:

Required states:
- loading
- success
- empty
- error
- disconnected

Plain-English output needed:

Notes / risks:
```
