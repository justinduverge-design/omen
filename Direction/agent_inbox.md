# Omen Agent Inbox

**Auto-populated 2026-06-23 (Codex session) from `Direction/current_sprint.md`; refreshed 2026-06-25 (Claude session) after Phase 1.5g.3 closeout.** Phase 1.5g.1 is merged to `main` and deployed via Hostinger KVM1 run `28062382244` at deployed head `8e5d56b`. Phase 1.5g.2 is complete on branch `claude/corvus-kickoff-hre0je` (draft PR; not merged). Phase 1.5g.3 is complete on branch `claude/corvus-kickoff-2gz8am` (draft PR; not merged) — this closes the Phase 1.5g motif-grammar arc (motifs + typeFlourishes + culturalMoments all shipped to branch). No active task is pinned after closeout.

## Active Task

None pinned. Recommended next pull: **Phase 1.10A — UX copy options packet** (decision-only, fully unblocked, no source changes — clears the way for 1.10B).

## Auto-Populated Top 5

1. **Phase 1.10A — UX copy options packet.** Unblocked by Phase 1.3 [x]. Decision packet only; no source changes. Invoke `slops-ux-copy` and present 3 options for `/omen` offseason empty state, `/onboarding` "You're ready" success copy, and the landing-page Trade Analyzer Example headline replacement (current "Know the move before you make it." is brand-banned). Done docs: n/a.
2. **Phase 1.11A — Demo Mode frontend fixtures.** Unblocked by Phase 1.3 [x]; Backend Phase 2.7 complete (2026-06-19). Mock-roster / previous-results / mock-draft fixtures, clearly labeled, dev-flag-gated, distinct from public `/demo`. Note: the new `dataMode` indicator from 1.5g.3 (`frontend/src/lib/dataMode.js`) is the natural place to tag these fixtures as `mock`. Done docs: feature + design + recommendation.
3. **Phase 1.7 — Platform brand color emphasis + button-style consistency.** Unblocked by Phase 1.3 [x] + Phase 1.4 [x]. Verify exact Sleeper blue / Yahoo purple / ESPN red hexes via `ui-ux-pro-max`; apply consistently across `/account/connect`, `/account` connect-row, `/standings` platform badge, league switcher. Done docs: page + design.
4. **Phase 1.12 — Gray contrast pass + Standings refinements.** Now cleanly unblocked: Phase 1.6 [x] is complete. WCAG AA gray-on-background sweep across `/account/appearance`, `/standings`, `/hall-of-records`, and `/onboarding`; Standings "you" row gets a distinct background + team-accent left edge. Done docs: page + design.
5. **Phase 1.13 — iOS Safari mobile QA sweep.** Now unblocked — Phase 1.5g.3 closed, so the themed surfaces are no longer "about to be repainted." Open every routed page on iOS Safari, fix overflow/touch-target/focus/safe-area issues, and convert mutually-exclusive button-toggle groups to `role="radiogroup"`. Use `mobile-first-qa-playbook`. **Includes a 1.5g.3 follow-up:** run the deferred Safari 16/17/18 `color-mix` surface-tint smoke for cultural moments here. Done docs: page + design.

## Blockers Surfaced

- **Phase 1.5d (post-win pulse animation)** remains gated on Backend **Phase 2.17** (`lastResult` field across Sleeper / Yahoo / ESPN). Not in top 5; kept visible because it blocks the next motion polish.
- **Phase 1.10B (apply approved copy)** waits on Justin's selection from Phase 1.10A.
- **Phase 3.15 (`AI_PROVIDER` toggle)** remains gated on a `decision_log.md` dollar-cap entry. Do not pull until logged.
- **Frontend Phase 2.10 (Trade share card)** waits on Backend Phase 2.10 hash routes.
- **Phase 1.5g.3 deferred verification** (not a blocker for the next pull): Safari 16/17/18 `color-mix` tint smoke + authed light/dark moment screenshots still owed — folded into the Phase 1.13 mobile sweep above. If Safari regresses, the pre-resolved-hex fallback is documented in `team-motif-grammar.md` §index.css.
- **1.5g.1 + 1.5g.2 + 1.5g.3 draft PRs** are all unmerged on separate branches — Justin to sequence the merges (1.5g.2 and 1.5g.3 both build on the 1.5g.1 foundation already on `main`).

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
