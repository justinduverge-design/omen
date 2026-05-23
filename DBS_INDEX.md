# ssffmvp DBS Index

This is the repo-local navigation map for the active `ssffmvp` app repo.

For the full three-layer SLOPS map, see `..\DBS_INDEX.md`.

## Layer

`ssffmvp` is Layer 2 in the SLOPS folder system.

Path: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\ssffmvp`

Meaning: the Fantasy Sports MVP Builder department and the active app repo.

Corvus is the active Fantasy Football MVP product inside this repo.

## Current Product Focus

Corvus is the current product.

The product priority is to keep the app backbone stable while building fantasy football decision tools around clear contracts, plain-English reasoning, and safe platform integrations.

## Repo DBS Folders

Direction contains repo-level context, roadmap, priorities, and current working direction.

Blueprints contains app specs, handoffs, prompts, workflows, reusable instructions, and implementation plans.

Solutions contains finished app-layer outputs or implementation-adjacent results. Do not move active source code here without explicit approval.

References contains supporting research, source material, comparison notes, and historical context.

Archive preserves reviewed superseded, parked, stale, or quarantined material. Archive is preservation, not deletion.

## Canonical Context

- Repo context: `Direction\context.md`
- Repo roadmap: `Direction\roadmap.md`
- Product context: `Corvus\Direction\context.md`
- Product roadmap: `Corvus\Direction\roadmap.md`
- Product README: `Corvus\README.md`

## Canonical Handoffs

- Frontend to backend requests: `Blueprints\handoffs\frontend-to-backend.md`
- Backend to frontend responses: `Blueprints\handoffs\backend-to-frontend.md`
- Shared engineering decisions: `Blueprints\handoffs\decisions.md`
- Security and privacy tracker: `Blueprints\security-privacy.md`
- Compliance evidence map: `probo.yaml`

Root handoffs outside this repo are OS-level history or redirects unless a future workflow says otherwise.

## Specs and Prompts

App specs live under:

- `Blueprints\specs\`
- `Blueprints\specs\docs\`

App prompts live under:

- `Blueprints\prompts\`

Corvus product specs live under:

- `Corvus\Blueprints\specs\`

Corvus product playbooks live under:

- `Corvus\Blueprints\playbooks\`

## Skills

All SLOPS-authored skills live at the SLOPS OS layer:

- `C:\Users\JDuve\OneDrive\Desktop\SLOPS\Blueprints\skills`

When a skill is needed from inside `ssffmvp`, agents should still resolve it through the root skill index:

1. `..\Blueprints\skills\README.md`
2. `..\Blueprints\skills\SKILL_INDEX.md`
3. `..\Blueprints\skills\<skill-name>\SKILL.md`

Do not create app-local or Corvus-local skill folders unless Justin explicitly changes this rule.

## App Source Boundary

Active implementation remains in the app source tree, including:

- `src\`
- `frontend\`
- `client\`
- `scripts\`
- `sql\`
- `test\`
- `Dockerfile`
- `docker-compose.yml`
- `package.json`

Do not move source, deploy config, package files, SQL, tests, scripts, `.git`, `node_modules`, `.env`, secrets, keys, credentials, or active implementation assets during DBS cleanup.

## Product Rules

- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit lives inside Omen / MVP Move.
- Waiver logic lives inside Omen / MVP Move unless explicitly separated later.
- ESPN, Yahoo, and Sleeper all matter.
- ESPN is essential but risky and needs recovery playbooks.
- Users need plain-English reasoning, not heavy math.

## Stale Path Warning

Do not use old `Projects\ssffmvp` copies as active source.

Do not inspect, restore, upload, commit, push, share, or reorganize quarantine contents without a secrets-safe review.
