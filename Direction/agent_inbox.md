# Corvus Agent Inbox

**Auto-populated 2026-06-20 (Claude session) from `Direction/current_sprint.md`.** No pinned task was present. Previous pop (2026-06-19) was Codex-leaning; this pop is Claude-leaning (frontend / docs / specs) and still respects "Blocked by …" suffixes. Agents may work across lanes; either may pull any item.

## Active Task

*(empty — Phase 1.5e closed 2026-06-20, full-scope audit shipped. 32 teams audited with cultural anchors; 6 teams flagged for light axis; 7 defects logged; Phase 1.5f re-scoped to 11-point spike; new reusable methodology doc `Brand/entity-identity-theming.md` for next-product head-start. Awaiting Justin direction: pin **Phase 1.5f** (the spike that implements the audit) as next active, or pull #1 below.)*

## Auto-Populated Top 5

1. **Phase 1.5f — Theme-aware team palettes + cultural-anchor citations (12-point spike per 1.5e identity audit).** Implements the full-scope audit. 12 points: per-team `surfaceAxis` field in `nflTeams.js` (6 light: MIA/IND/LAC/DAL/CAR/ARI); two-axis `SURFACE_RECIPES`; theme-aware `getTeamTemplate()`; sat-aware `textSafe()` (clamps hue-shift for low-saturation accents — fixes LV silver); Bred template bypasses `textSafe` (preserves Falcons varsity-red); per-team accent overrides for HOU/NYG/PHI/SF; TB surface re-derives from secondary (pewter not blood); `--color-text-on-accent` token finally added; two-axis 32-team WCAG re-sweep; Mode picker copy update ("Light or dark to match your team's true colors"); `page-system.md` spec update; **NEW** — `culturalAnchor` field per team + one-line attribution UI on `/account/appearance` tile detail (Justin confirmed 2026-06-20). Audit doc: `Blueprints/audits/2026-06-20-phase1-5e-32-team-identity-audit.md`. Methodology: `Brand/entity-identity-theming.md`. Frontend-Claude lean. Done docs: feature + page + design.
2. **Phase 1.6 — Position chip palette + selected-state styling.** Unblocked (1.3 [x] + 1.4 [x]). Frontend. Unblocks Phase 1.12. Done docs: page + design + recommendation if recommendation cards change.
3. **Phase 1.10A — UX copy options packet.** Unblocked (1.3 [x]). Decision packet — no source changes; Justin picks final copy. Unblocks 1.10B. Done docs: n/a (decision packet).
4. **Phase 2.17 — Platform `lastResult` field (backend).** Backend-Codex lean, but kept on Claude's radar because it is the sole gate left on Phase 1.5d (post-win pulse). Surfaced here so Justin can decide whether to flip it to Codex or have Claude take the research-then-implement path. Done docs: feature + security if any new ESPN scope is needed.
5. **Phase 1.11A — Demo Mode frontend fixtures.** Unblocked (1.3 [x]); Backend Phase 2.7 already complete (2026-06-19). Mock-roster / previous-results / mock-draft fixtures, clearly labeled, dev-flag-gated, distinct from public `/demo`. Done docs: feature + design + recommendation.

## Blockers Surfaced

- **Phase 1.5d (post-win pulse animation)** still gated on Backend **Phase 2.17** (`lastResult` field across Sleeper / Yahoo / ESPN). Listed at #4 above so the dependency stays visible.
- **Phase 1.10B (apply approved copy)** waits on Justin's selection from the **1.10A** options packet.
- **Phase 1.12 (gray contrast + Standings refinement)** waits on **Phase 1.6** (palette reuse).
- **Phase 3.15 (`AI_PROVIDER` toggle)** still gated on a `decision_log.md` dollar-cap entry — do not pull until logged.
- **Frontend Phase 2.10 (Trade share card)** waits on Backend Phase 2.10 (hash routes), which is the top item in the 2026-06-19 Codex pop.

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
