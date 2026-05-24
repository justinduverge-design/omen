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

