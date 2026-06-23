# Omen Agent Inbox

**Auto-populated 2026-06-23 (Codex session) from `Direction/current_sprint.md`.** Phase 1.5g.1 closed locally on branch `codex/phase1-5g-1-motif-schema` in implementation commit `e66e9d7`; no push or deploy. No active task is pinned after closeout.

## Active Task

None pinned. Recommended next pull: **Phase 1.5g.2 — TypeFlourish schema + NE small-caps eyebrow**.

## Auto-Populated Top 5

1. **Phase 1.5g.2 — TypeFlourish schema + NE small-caps eyebrow.** Now unblocked by Phase 1.5g.1. Pre-merge font-feature spike required: verify Google CSS2 `"smcp" 1` retention against the served font, otherwise self-host Alegreya Sans in a separate PR before shipping. Done docs: feature + design.
2. **Phase 1.5g.3 — CulturalMoment schema + DET / NO / GB moments.** Now unblocked by Phase 1.5g.1, but it still needs the route-level mock/live indicator built inside the phase if absent. Scope must keep moments off Omen and Trade recommendation surfaces. Done docs: feature + design.
3. **Phase 1.10A — UX copy options packet.** Unblocked by Phase 1.3 [x]. Decision packet only; no source changes. Invoke `slops-ux-copy` and present 3 options for `/omen` offseason empty state, `/onboarding` "You're ready" success copy, and the landing-page Trade Analyzer Example headline replacement. Done docs: n/a.
4. **Phase 1.11A — Demo Mode frontend fixtures.** Unblocked by Phase 1.3 [x]; Backend Phase 2.7 complete (2026-06-19). Mock-roster / previous-results / mock-draft fixtures, clearly labeled, dev-flag-gated, distinct from public `/demo`. Done docs: feature + design + recommendation.
5. **Phase 1.12 — Gray contrast pass + Standings refinements.** Practically unblocked: Phase 1.6 is checked complete in `current_sprint.md`, but the Phase 1.12 row still has a stale `Phase 1.6 [ ]` suffix. WCAG AA gray-on-background sweep across `/account/appearance`, `/standings`, `/hall-of-records`, and `/onboarding`. Done docs: page + design.

## Blockers Surfaced

- **Phase 1.5d (post-win pulse animation)** remains gated on Backend **Phase 2.17** (`lastResult` field across Sleeper / Yahoo / ESPN). Not in top 5; kept visible because it blocks the next motion polish.
- **Phase 1.5g.2 (typeFlourish + NE small-caps)** requires the Google CSS2 `"smcp" 1` font-feature spike before merge.
- **Phase 1.5g.3 (culturalMoment + DET/NO/GB)** requires a route-level mock/live data-mode indicator; build inside 1.5g.3 if still missing.
- **Phase 1.10B (apply approved copy)** waits on Justin's selection from Phase 1.10A.
- **Phase 1.12 row has stale blocker text**: it says Phase 1.6 `[ ]`, but Phase 1.6 is checked complete in the sprint board.
- **Phase 1.13 (iOS Safari mobile QA sweep)** remains soft-blocked by Phase 1.5g.2 / 1.5g.3 still being in motion.
- **Phase 3.15 (`AI_PROVIDER` toggle)** remains gated on a `decision_log.md` dollar-cap entry. Do not pull until logged.
- **Frontend Phase 2.10 (Trade share card)** waits on Backend Phase 2.10 hash routes.

## Standing Route

```text
SLOPS/
  slops-saloon/
    omen/
```

## Active Notes

- This repo is the Omen product repo. The old nested `Corvus/` folder is retired.
- Product handoffs live in `Blueprints/handoffs/`.
- Product context lives in `Direction/`.
- Division context lives one layer up. OS context is in the sibling `slops-os/` checkout in this workspace.
- Existing user-side work before this pull: `Blueprints/prompts/kickoff-backend-codex.md` modified, `Blueprints/prompts/kickoff-frontend-claude.md` modified, `graphify-out/` untracked, `logos/` untracked. Avoid unless explicitly needed.

## Do Not Touch Unless Explicitly Asked

- `AGENT.md`, `CLAUDE.md`
- `.env`, secrets, or credentials
- Deploy config
- Package files
- SQL or migrations
- Production infrastructure
