# Corvus Agent Inbox

**Auto-populated 2026-06-18 from `Direction/current_sprint.md`.** No pinned task was present. Agents may work across lanes; this ordering follows the first five eligible agent-buildable items and preserves their dependency order.

## Active Task

*(empty — Phase 2.5 closed 2026-06-18 in implementation commit `d04c535`; next session must run plan approval before Phase 2.6.)*

## Auto-Populated Top 5

1. **Phase 2.6 — Math engine parameterized.** Refactor `src/services/optimizer.js` and `src/services/tradeValue.js` to consume scoring config as a parameter while keeping call sites stable. Phase 2.5's scoring-config convention is now available. Done docs: feature + recommendation.
2. **Phase 2.7 — Demo Mode backend.** Add a public route returning a populated normalized roster and Omen envelope explicitly labeled `mode:"demo"`, distinct from live and mock modes. Done docs: feature + recommendation.
3. **Phase 2.8 — Sleeper live draft tracking.** Add debounced Lazy Sync against Sleeper draft endpoints; no long-polling sockets. Done docs: feature + recommendation + security.
4. **Phase 2.10 — Trade share hash routes.** Add UUID-backed create/read routes for stored trade-share payloads and public hash reads. Done docs: feature + recommendation + security.
5. **Phase 2.17 — Platform `lastResult` field for post-win pulse.** Add safe last-game result metadata across Sleeper, Yahoo, and ESPN adapters; research Yahoo/ESPN first and never log ESPN cookie values. Blocks frontend Phase 1.5d. Done docs: feature + security if new ESPN scope is needed.

## Blockers Surfaced

- None for next item Phase 2.6. Phase 2.5 established the shared scoring-config convention.
- Phase 2.17 remains ahead of frontend Phase 1.5d because it is that animation's backend dependency.

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
