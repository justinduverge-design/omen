# Omen Agent Inbox

**Auto-populated 2026-06-23 (Codex session) from `Direction/current_sprint.md`; refreshed 2026-06-25 (Claude session) after Phase 1.10B (partial) closeout.** Phase 1.5g.1 is merged to `main` and deployed via Hostinger KVM1 run `28062382244` at deployed head `8e5d56b`. **Correction to the prior refresh:** Phase 1.5g.2 (PR #65) and Phase 1.5g.3 (PR #66) are no longer draft/unmerged — `git log` on `main` shows both already squash-merged (`68f2d21`, `cdae3bc`). Phase 1.10A shipped (`Blueprints/handoffs/2026-06-25-phase1-10a-ux-copy-options.md`) and Justin's picks (A1/B1/C1+C2) were applied as Phase 1.10B (partial) — hero headlines on `Landing.jsx` + `OmenLanding.jsx` and the `Onboarding.jsx` success step. No active task is pinned after closeout.

## Active Task

None pinned. Two decisions are open from this session, surfaced below — neither is pulled until Justin responds.

## Auto-Populated Top 5

1. **Phase 1.11A — Demo Mode frontend fixtures.** Unblocked by Phase 1.3 [x]; Backend Phase 2.7 complete (2026-06-19). Mock-roster / previous-results / mock-draft fixtures, clearly labeled, dev-flag-gated, distinct from public `/demo`. Note: the new `dataMode` indicator from 1.5g.3 (`frontend/src/lib/dataMode.js`) is the natural place to tag these fixtures as `mock`. Done docs: feature + design + recommendation.
2. **Phase 1.7 — Platform brand color emphasis + button-style consistency.** Unblocked by Phase 1.3 [x] + Phase 1.4 [x]. Verify exact Sleeper blue / Yahoo purple / ESPN red hexes via `ui-ux-pro-max`; apply consistently across `/account/connect`, `/account` connect-row, `/standings` platform badge, league switcher. Done docs: page + design.
3. **Phase 1.12 — Gray contrast pass + Standings refinements.** Now cleanly unblocked: Phase 1.6 [x] is complete. WCAG AA gray-on-background sweep across `/account/appearance`, `/standings`, `/hall-of-records`, and `/onboarding`; Standings "you" row gets a distinct background + team-accent left edge. Done docs: page + design.
4. **Phase 1.13 — iOS Safari mobile QA sweep.** Now unblocked — Phase 1.5g.3 closed, so the themed surfaces are no longer "about to be repainted." Open every routed page on iOS Safari, fix overflow/touch-target/focus/safe-area issues, and convert mutually-exclusive button-toggle groups to `role="radiogroup"`. Use `mobile-first-qa-playbook`. **Includes a 1.5g.3 follow-up:** run the deferred Safari 16/17/18 `color-mix` surface-tint smoke for cultural moments here. Done docs: page + design.
5. **Phase 2.7 — Demo Mode UI.** New public route `/demo`. Backend Phase 2.7 complete; frontend implementation unblocked. Populated example roster + Omen envelope with prominent "Demo Mode" labeling, reusing Omen rendering components. Done docs: feature + page + design + recommendation.

## Blockers Surfaced

- **Phase 1.5d (post-win pulse animation)** remains gated on Backend **Phase 2.17** (`lastResult` field across Sleeper / Yahoo / ESPN). Not in top 5; kept visible because it blocks the next motion polish.
- **Phase 1.10B headline + onboarding copy is done** (Justin picked A1/B1/C1+C2, applied 2026-06-25). Two pieces of the original Phase 1.10B sprint wording remain open and need a Justin decision, not a pull: (1) the `/omen` offseason empty-state copy has no backend status to attach to yet — see the `frontend-to-backend.md` request filed 2026-06-25; (2) removing the `/draft` "Preview Mode" banner touches mock/live disclosure and wasn't covered by the copy-pick approval — needs explicit go-ahead before any agent removes it.
- **Phase 3.15 (`AI_PROVIDER` toggle)** remains gated on a `decision_log.md` dollar-cap entry. Do not pull until logged.
- **Frontend Phase 2.10 (Trade share card)** waits on Backend Phase 2.10 hash routes.
- **Phase 1.5g.3 deferred verification** (not a blocker for the next pull): Safari 16/17/18 `color-mix` tint smoke + authed light/dark moment screenshots still owed — folded into the Phase 1.13 mobile sweep above. If Safari regresses, the pre-resolved-hex fallback is documented in `team-motif-grammar.md` §index.css.
- **Stale kickoff module paths.** `CLAUDE.md` and both `Blueprints/prompts/kickoff-*.md` files still point at `Blueprints/agent-modules/` and `Blueprints/prompts/kickoff-modules/`, neither of which exists in this checkout. Flagged across the last two sessions (1.5g.2, this one) — needs either the modules authored or the kickoff docs corrected to point at the real `Direction/`-based flow.

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
