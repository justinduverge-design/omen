# Corvus Agent Inbox

**Auto-populated 2026-06-22 (Claude session) from `Direction/current_sprint.md`.** Phase 1.5g.0 doc-only deliverable shipped 2026-06-22 — `Blueprints/specs/team-motif-grammar.md` is the canonical Phase 1.5g spec, with addendum on `Blueprints/specs/page-system.md` adding the Motif / Moment posture column. Category-axis grammar selected over Maximum-flexibility and Tier-Based proposals via 3-proposal × 3-lens synthesis (brand-voice 7 / engineering 6 / maintenance 4; critic verdict patch-then-ship, 10 patches applied). v1 scope bound to 6 teams across three follow-up sprints. Phase 1.5g now split into 1.5g.0 [x] / 1.5g.1 / 1.5g.2 / 1.5g.3 in `current_sprint.md`. No pin present. Same Claude-lean ordering — Phase 1.5g.1 promoted to #1 as the natural continuation of 1.5g.0.

## Active Task

**Phase 1.5g.1 — Motif schema + 4-team hairline ship** (auto-pulled as #1; blocked by Phase 1.5g.0 [x]). Awaiting plan-approval brief acceptance from Justin before build. **Pre-1.5g.3 risk to flag at kickoff:** route-level `window.__corvusDataMode` mock/live indicator does not exist in `frontend/src` today — built inside 1.5g.3 if still missing.

## Auto-Populated Top 5

1. **Phase 1.5g.1 — Motif schema + 4-team hairline ship.** Land `Motif` type, `motifs: []` for PIT + MIA + NO + GB (hairlines only), `frontend/src/lib/motifs.js`, `applyMotifTokens()`, `MOTIF_VARS`, `--motif-*` vars + `[data-motif-target]` selectors, `frontend/src/lib/assertCategoryShape.js` boot-time validator, `frontend/scripts/contrast-sweep.mjs` extension for motif color × surface ≥ 3.0, trademark-review memo. All four motifs ship as `trademarkReview: 'self-assessed'`. Frontend-Claude lean. Done docs: feature + design.
2. **Phase 1.10A — UX copy options packet.** Unblocked (1.3 [x]). Decision packet — no source changes; Justin picks final copy. Invoke `slops-ux-copy` and present 3 options for each: `/omen` offseason empty state, `/onboarding` "You're ready" success copy, landing-page Trade Analyzer Example headline replacement. **Unblocks 1.10B.** Done docs: n/a (decision packet).
3. **Phase 1.11A — Demo Mode frontend fixtures.** Unblocked (1.3 [x]); Backend Phase 2.7 complete (2026-06-19). Mock-roster / previous-results / mock-draft fixtures, clearly labeled, dev-flag-gated, distinct from public `/demo`. Done docs: feature + design + recommendation.
4. **Phase 1.12 — Gray contrast pass + Standings refinements.** Unblocked — Phase 1.6 [x] shipped 2026-06-21. WCAG AA gray-on-background sweep across `/account/appearance`, `/standings` W-L/PF/PA columns, `/hall-of-records` username column, `/onboarding` success paragraph. Plus Standings "DarthSlops · you" row gets distinct row background + team-accent left edge. Frontend-Claude lean. Done docs: page + design.
5. **Phase 2.18 — Waiver Wire route activation.** Unblocked — Phase 1.6 chip helper shipped 2026-06-21. Surfaced by Phase 1.6 `slops-code-review` P2-2. Activate `/waiver` route + NavDrawer entry, remove `<ProGate/>` (Corvus is free per facts-of-record 2026-06-15), migrate local `PositionBadge` to shared `positionChipStyle()`, sweep `slate-*` Tailwind classes onto design tokens, add `/waiver` page-system row. Frontend-Claude lean. Done docs: feature + page + design + recommendation.

## Blockers Surfaced

- **Phase 1.5d (post-win pulse animation)** still gated on Backend **Phase 2.17** (`lastResult` field across Sleeper / Yahoo / ESPN). Not in top 5 — Codex lean; kept on Justin's radar.
- **Phase 1.5g.2 (typeFlourish + NE small-caps)** blocked by Phase 1.5g.1; pre-merge font-feature spike required (Google CSS2 `"smcp" 1` retention unverified — fall back to self-hosted Alegreya Sans under `frontend/public/fonts/` if spike fails).
- **Phase 1.5g.3 (culturalMoment + DET/NO/GB)** blocked by Phase 1.5g.1; route-level `window.__corvusDataMode` mock/live indicator does not exist today and is built inside 1.5g.3 if still missing.
- **Phase 1.10B (apply approved copy)** waits on Justin's selection from the **1.10A** options packet.
- **Phase 1.13 (iOS Safari mobile QA sweep)** soft-blocked by Phase 1.5 [ ] — don't sweep what's about to be repainted (1.5g.1/.2/.3 still open).
- **Phase 3.15 (`AI_PROVIDER` toggle)** still gated on a `decision_log.md` dollar-cap entry — do not pull until logged.
- **Frontend Phase 2.10 (Trade share card)** waits on Backend Phase 2.10 (hash routes).

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
