# Corvus Agent Inbox

**Auto-populated 2026-06-19 from `Direction/current_sprint.md`.** No pinned task was present. Agents may work across lanes; this ordering follows the first five eligible backend agent-buildable items and preserves their dependency order.

## Active Task

*(empty — Phase 2.7 closed 2026-06-19 in implementation commit `e966a0a`; next session must run plan approval before Phase 2.8.)*

## Auto-Populated Top 5

1. **Phase 2.8 — Sleeper live draft tracking.** Add debounced Lazy Sync against Sleeper draft endpoints; no long-polling sockets. Done docs: feature + recommendation + security.
2. **Phase 2.10 — Trade share hash routes.** Add UUID-backed create/read routes for stored trade-share payloads and public hash reads. Done docs: feature + recommendation + security.
3. **Phase 2.17 — Platform `lastResult` field for post-win pulse.** Add safe last-game result metadata across Sleeper, Yahoo, and ESPN adapters; research Yahoo/ESPN first and never log ESPN cookie values. Blocks frontend Phase 1.5d. Done docs: feature + security if new ESPN scope is needed.
4. **Phase 3.12 — Tailscale → KVM2 Gemma 4-E4B bridge.** Connect the existing `LLM_BASE_URL` backend lane to the KVM2 narration service. Done docs: feature + security.
5. **Phase 3.13 — Token-constrained prompts.** Constrain narration to no more than 50 words and two sentences for CPU inference mitigation. Done docs: feature + recommendation.

## Blockers Surfaced

- None for next item Phase 2.8. The Sleeper draft deadline is August 15 and the approved design is debounced Lazy Sync without long-polling sockets.
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
