# Corvus Agent Inbox

**Auto-populated 2026-06-20 (Claude session) from `Direction/current_sprint.md`.** No pinned task was present. Previous pop (2026-06-19) was Codex-leaning; this pop is Claude-leaning (frontend / docs / specs) and still respects "Blocked by …" suffixes. Agents may work across lanes; either may pull any item.

## Active Task

*(empty — Phase 1.5e closed 2026-06-20. Verdict-only audit shipped; secondary-scheme verdict = all 9 stay on secondary; three defects filed; "Team mode = always dark" rule flagged for removal with Phase 1.5f scoped in the audit doc. Awaiting Justin direction: either pull #1 below as next active, or pin Phase 1.5f as a higher-priority spike based on the audit's policy recommendation.)*

## Auto-Populated Top 5

1. **Phase 1.6 — Position chip palette + selected-state styling.** Unblocked (1.3 [x] + 1.4 [x]). Frontend. Unblocks Phase 1.12. Done docs: page + design + recommendation if recommendation cards change.
2. **Phase 1.10A — UX copy options packet.** Unblocked (1.3 [x]). Decision packet — no source changes; Justin picks final copy. Unblocks 1.10B. Done docs: n/a (decision packet).
3. **Phase 2.17 — Platform `lastResult` field (backend).** Backend-Codex lean, but kept on Claude's radar because it is the sole gate left on Phase 1.5d (post-win pulse). Surfaced here so Justin can decide whether to flip it to Codex or have Claude take the research-then-implement path. Done docs: feature + security if any new ESPN scope is needed.
4. **Phase 1.11A — Demo Mode frontend fixtures.** Unblocked (1.3 [x]); Backend Phase 2.7 already complete (2026-06-19). Mock-roster / previous-results / mock-draft fixtures, clearly labeled, dev-flag-gated, distinct from public `/demo`. Done docs: feature + design + recommendation.
5. **Phase 1.5f — Theme-aware team palettes (new — sized by 1.5e audit).** Remove the "Team mode is always dark" rule by extending `SURFACE_RECIPES` to a light/dark 2-axis map, making `getTeamTemplate()` theme-aware, deciding Bred light-mode fallback, splitting `textSafe` for light canvas, re-running the 32-team WCAG sweep against light bg, and bundling the `--color-text-on-accent` token fix. Audit doc: `Blueprints/audits/2026-06-20-phase1-5e-32-team-visual-qa.md`. Done docs: design + page.

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
