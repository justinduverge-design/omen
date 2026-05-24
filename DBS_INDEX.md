# slops-saloon DBS Index

This is the repo-local navigation map for the active `slops-saloon` app repo.

For the full three-layer SLOPS map, see `..\DBS_INDEX.md`.

## Layer

`slops-saloon` is Layer 2 in the SLOPS folder system.

Path: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon`

Meaning: the Fantasy Sports MVP Builder department and the active app repo.

Corvus is the active Fantasy Football MVP product inside this repo.

## Current Product Focus

Corvus is the current product.

The product priority is to keep the app backbone stable while building fantasy football decision tools around clear contracts, plain-English reasoning, and safe platform integrations.

## Layer Structure

`slops-saloon` is the Fantasy Sports MVP Builder department. It is the platform PM layer for Corvus (Fantasy Football MVP) and future fantasy sports tools. Each product lives in its own subfolder with its own DBS folders.

## Repo DBS Folders (Platform Level)

Direction contains repo-level context, roadmap, priorities, and current working direction for the slops-saloon platform — not Corvus-specific content.

Blueprints contains platform-level agent infrastructure. Corvus-specific specs, prompts, handoffs, and playbooks live under `Corvus\Blueprints\`.

Solutions contains finished platform-layer outputs. Corvus-specific outputs live under `Corvus\Solutions\`.

References contains platform-level supporting research. Corvus-specific research lives under `Corvus\References\`.

Archive preserves reviewed superseded, parked, stale, or quarantined material at the platform level. Corvus-specific archived material lives under `Corvus\Archive\`. Archive is preservation, not deletion.

## Canonical Context

- Repo context: `Direction\context.md`
- Repo roadmap: `Direction\roadmap.md`
- Product context: `Corvus\Direction\context.md`
- Product roadmap: `Corvus\Direction\roadmap.md`
- Product known issues: `Corvus\Direction\known_issues.md`
- Product release readiness: `Corvus\Direction\release_readiness.md`
- Product README: `Corvus\README.md`

## Canonical Handoffs

- Frontend to backend requests: `Corvus\Blueprints\handoffs\frontend-to-backend.md`
- Backend to frontend responses: `Corvus\Blueprints\handoffs\backend-to-frontend.md`
- Shared engineering decisions: `Corvus\Blueprints\handoffs\decisions.md`
- Security and privacy tracker: `Corvus\Blueprints\security-privacy.md`
- Compliance evidence map: `probo.yaml`

Root handoffs outside this repo are OS-level history or redirects unless a future workflow says otherwise.

## Corvus Specs and Prompts

All Corvus product specs, ADRs, and prompts now live under `Corvus\Blueprints\`:

- `Corvus\Blueprints\specs\` — product specs
- `Corvus\Blueprints\specs\docs\` — ADRs and technical decisions
- `Corvus\Blueprints\prompts\` — Codex and agent prompts
- `Corvus\Blueprints\playbooks\` — operational playbooks (ESPN recovery, etc.)
- `Corvus\Blueprints\handoffs\` — frontend/backend coordination

The platform-level `Blueprints\` folder now contains only agent infrastructure: `agent_handoff.md` and `skills\`.

## Skills

All SLOPS-authored skills live at the SLOPS OS layer:

- `C:\Users\JDuve\OneDrive\Desktop\SLOPS\Blueprints\skills`

When a skill is needed from inside `slops-saloon`, agents should still resolve it through the root skill index:

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
- `