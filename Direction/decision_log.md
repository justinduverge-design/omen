# Corvus Decision Log

## Active Decisions

- Corvus is the Fantasy Football MVP product.
- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit lives inside Omen / MVP Move.
- Waiver logic lives inside Omen / MVP Move unless explicitly separated later.
- Yahoo, Sleeper, and ESPN all matter.
- ESPN is essential but risky and needs recovery playbooks.
- ESPN recovery routes through `/account` with safe state/query context only.
- ESPN league selection belongs in a full Account section for MVP, not a modal.
- Omen may preserve safe request context after ESPN recovery, but the user must click to rerun.
- `espn_import_blocked` remains the MVP user-facing state; safe backend `reason_code` values may be added later.
- Security and privacy decisions are tracked in `Blueprints\security-privacy.md`; compliance evidence is tracked in `probo.yaml`.
- Users need plain-English reasoning, not heavy math.

## Decisions Added 2026-05-23

- **Canonical Omen path**: `POST /api/omen/mvp-move` + `OmenOfTheWeek.jsx` is the canonical path. `Omen.jsx` was a developer test harness — its route will be unregistered. `GET /api/omen-of-the-week` will be retired after `OmenOfTheWeek.jsx` migrates to POST. `RecoveryPanel` from `Omen.jsx` will be absorbed into `OmenOfTheWeek.jsx`.
- **Matchup DvP data source**: nflverse-data (not Sportradar). Already live in the POST omen route.
- **LLM reasoning**: Gemma/Ollama already wired in `src/routes/omen.js`. Not a stub.

## Decisions Added 2026-05-24

- **Omen migration complete**: `OmenOfTheWeek.jsx` now calls `POST /api/omen/mvp-move`. ESPN recovery states (4) wired. `GET /api/omen-of-the-week` retired. 175/175 tests pass.
- **optimizer/omen product tier**: `POST /api/optimizer/mvp-move` (Pro-gated six-agent pipeline) and `POST /api/omen/mvp-move` are the same product surface at different enrichment tiers. Not competing features — same feature at free vs. Pro depth. Architectural merge decision is open and deferred to post-launch.
- **Corvus repo restructure complete**: The nested `Corvus/` folder was folded into the repo root. The repo itself is now the Corvus product layer.
- **Canonical local path**: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`.
- **Canonical GitHub repo**: `justinduverge-design/corvus`.
- **Canonical Oracle checkout**: `~/corvus`.
- **Production service identity**: health checks report `service: corvus-api`.

## Decisions Added 2026-05-25

- **Backend contract truth reconciled**: `Blueprints/handoffs/backend-to-frontend.md` now states the current tested Omen behavior. `POST /api/omen/mvp-move` has a Yahoo-first live path for authenticated, subscribed users with usable Yahoo league context. Sleeper and ESPN live Omen remain `pending_live_engine`.
- **Current local backend verification**: `npm test` passes 199/199 locally.
- **Frontend build blocker recorded**: primary `frontend/` build currently fails in `frontend/src/pages/Account.jsx`; this is assigned as a Layer 2 Claude/frontend task, not a backend blocker.

## Open Decisions

- Final UI naming between Omen of the Week, Omen, MVP Move, or a combined label.
- Whether waiver logic ever becomes a separate product surface.
- Whether recovery analytics ship before or after the first paid launch gate.
- Whether `getOmenOfTheWeekMock()` in systemContracts.js is retired after Omen migration or kept as a fallback.
- Whether `POST /api/optimizer/mvp-move` merges into `POST /api/omen/mvp-move` as a Pro enrichment layer, or stays a separate route permanently.
