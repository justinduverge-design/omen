# Corvus Agent Inbox

**Auto-populated 2026-06-18 from `Direction/current_sprint.md`.** No pinned task was present. Agents may work across lanes; this ordering follows the first five eligible agent-buildable items and preserves their dependency order.

## Active Task

1. **Phase 2.5 — Proprietary ADP weighting service.** Build on `src/services/adp.js` and the Phase 1.4 schema. Produce a per-player score combining FFC, Yahoo, and MFL, with source weights configurable from each league scoring-config row. Done docs: feature + recommendation + security if DB/service-role access changes.

## Auto-Populated Top 5

1. **Phase 2.5 — Proprietary ADP weighting service.** Active. Establish the weighted ADP service and scoring-config contract consumed by later math work.
2. **Phase 2.6 — Math engine parameterized.** Refactor `src/services/optimizer.js` and `src/services/tradeValue.js` to consume scoring config as a parameter while keeping call sites stable. Follows 2.5 so both services share one configuration shape. Done docs: feature + recommendation.
3. **Phase 2.7 — Demo Mode backend.** Add a public route returning a populated normalized roster and Omen envelope explicitly labeled `mode:"demo"`, distinct from live and mock modes. Done docs: feature + recommendation.
4. **Phase 2.8 — Sleeper live draft tracking.** Add debounced Lazy Sync against Sleeper draft endpoints; no long-polling sockets. Done docs: feature + recommendation + security.
5. **Phase 2.10 — Trade share hash routes.** Add UUID-backed create/read routes for stored trade-share payloads and public hash reads. Done docs: feature + recommendation + security.

## Blockers Surfaced

- None for active Phase 2.5. Backend Phase 1 is closed, including the Phase 1.4 schema prerequisite.
- Phase 2.6 is intentionally sequenced after Phase 2.5 because it consumes the same league scoring configuration.

## Standing Route

```text
SLOPS/
  slops-saloon/
    corvus/
```

## Active Notes

- This repo is the Corvus product repo. The old nested `Corvus/` folder is retired.
- Product handoffs live in `Blueprints/handoffs/`.
- Product context lives in `Direction/`.
- Division context lives one layer up. OS context is in the sibling `slops-os/` checkout in this workspace.

## Do Not Touch Unless Explicitly Asked

- `AGENT.md`, `CLAUDE.md`
- `.env`, secrets, or credentials
- Deploy config
- Package files
- SQL or migrations
- Production infrastructure
