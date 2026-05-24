# slops-saloon Decision Log

## Active Decisions

- `slops-saloon` is the Fantasy Sports MVP Builder department and active app repo.
- Corvus is the Fantasy Football MVP product inside `slops-saloon`.
- App development happens inside `slops-saloon`.
- Corvus product, brand, and spec context lives inside `slops-saloon\Corvus`.
- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit lives inside Omen / MVP Move.
- Waiver logic lives inside Omen / MVP Move unless explicitly separated later.
- ESPN, Yahoo, and Sleeper all matter.
- ESPN is essential but risky and needs recovery playbooks.
- ESPN recovery routes through `/account` with safe state/query context only.
- ESPN league selection belongs in a full Account section for MVP, not a modal.
- Omen may preserve safe request context after ESPN recovery, but the user must click to rerun.
- `espn_import_blocked` remains the MVP user-facing state; safe backend `reason_code` values may be added later.
- Security and privacy decisions are tracked in `Blueprints\security-privacy.md`; compliance evidence is tracked in `probo.yaml`.
- SLOPS-authored skills live only in `C:\Users\JDuve\OneDrive\Desktop\SLOPS\Blueprints\skills`.
- Users need plain-English reasoning, not heavy math.

## Decisions Added 2026-05-24

- **optimizer/omen architectural merge**: `POST /api/optimizer/mvp-move` (Pro-gated six-agent pipeline: Manager Agent + Weather/Injury/Matchup/Trend/Vegas/News sub-agents) and `POST /api/omen/mvp-move` (canonical Omen path) are the same product surface at different tiers. Open decision: single endpoint with tier-based enrichment, or `optimizer` as an internal Pro layer called by the `omen` route. Deferred until after load testing and Stripe live validation.
- **Canonical Omen endpoint confirmed**: `POST /api/omen/mvp-move` + `OmenOfTheWeek.jsx` is the display path. DvP enrichment via nflverse-data, LLM reasoning via Gemma/Ollama. GET `/api/omen-of-the-week` retired 2026-05-24.

## Open Decisions

- Whether old root-level planning files should remain as redirects or be archived later.
- Whether any tooling needs compatibility shims after active handoffs moved to `Blueprints\handoffs\`.
- Whether `POST /api/optimizer/mvp-move` merges into `POST /api/omen/mvp-move` as a Pro enrichment tier, or remains a separate route permanently.
