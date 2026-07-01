# Omen Agent Inbox

**Auto-populated 2026-07-01 (Claude session); refreshed after Phase 1.9 local closeout.** Phase 1.9 (metallic tier treatment) is complete locally — see `Direction/current_sprint.md` Frontend Phase 1. Phase 1.8, 1.7, and 1.5d remain complete locally as previously documented; the win-streak ladder is still blocked on a backend-computed streak contract.

## Active Task

None pinned after Phase 1.9 local closeout.

## Auto-Populated Top 5

1. **Phase 1.12 — Gray contrast pass + Standings refinements.** WCAG AA gray body string pass across `/account/appearance`, `/standings`, `/hall-of-records`, and `/onboarding`, plus stronger Standings "you" row treatment. Done docs: page + design.
2. **Phase 1.13 — iOS Safari mobile QA sweep.** Routed-page iOS Safari sweep plus radiogroup semantics for mutually exclusive chips. Done docs: page + design.
3. **Phase 2.9 — Account delete UI.** Expose backend route at `src/routes/userPrivacy.js:136` in `Account.jsx`. Confirmation phrase: "DELETE MY OMEN DATA". Done docs: feature + page + design + security.
4. **Phase 2.10 — Trade share card.** Share button on Trade Analyzer result, server-side OG image. Now unblocked (Backend Phase 2.10 hash routes deployed). Done docs: feature + page + design + recommendation.
5. **Phase 2.11 — FP1 signal-honesty labels.** Surface each Omen input's `live` / `stub` / `unavailable` status. Backend vocabulary already exists at `src/services/omen.js:356`. Done docs: feature + page + design + recommendation.

## Blockers Surfaced

- **Phase 1.9 (metallic tier treatment)** is complete locally — not pushed/merged/deployed. Applied only to the Draft Assistant card-header ordinal pill; the `Omen #N` ADP-footer pill was deliberately left unchanged per the locked footer structure. Appearance-tile metallic add-on stays out of scope, unbuilt.
- **Phase 3.12 production enablement** is complete. Live `/api/ready` reports the LLM bridge as `configured_private`; no URL is exposed.
- **Phase 3.15 (`AI_PROVIDER=local|cloud` toggle)** remains gated on a `decision_log.md` dollar-cap entry. Do not pull until Justin's approved dollar cap is logged.
- **Tuesday scoring enablement** remains gated on approved Supabase dry-run validation and explicit scoring enablement approval. Keep `OMEN_CRON_SCORING_ENABLED=false`.
- **Phase 1.5d (post-win pulse animation)** is complete locally as single-win behavior; authenticated visual screenshot/mobile-smoke evidence remains a follow-up gap.
- **Win-streak reward ladder** is documented but blocked on the new backend win-streak summary contract.
- **Frontend Phase 2.10 (Trade share card)** is now unblocked by deployed Backend Phase 2.10 hash routes.
- **Phase 4.16 provider legal packet** is complete as review-only open-agreements source material; counsel/Justin review still gates publication.
- **Phase 1.7 (platform brand color emphasis)** is complete locally — not pushed/merged/deployed. Sleeper's brand hex has no confirmed public source; flagged for Justin if he has Sleeper's actual brand kit.
- **Phase 1.8 (confidence gradient endpoints)** is complete locally — committed to `main`, not pushed/merged/deployed. The crimson floor's non-text contrast against the dark track (1.45:1) is below WCAG 1.4.11's 3:1 guideline, accepted as a documented tradeoff since both confidence bars always show the score as text. Flag for Justin if he wants a brighter floor regardless of the "deeper than risk-high" spec language.
- **`test/deployHardening.test.js` has 1 pre-existing CRLF line-ending failure** (unrelated to recent feature work; confirmed present since at least the 2026-06-29 Phase 2.17-follow-up entry in `decision_log.md`). Spun off as its own background-task suggestion rather than fixed inline.

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
- Worktree was clean before this inbox refresh.

## Do Not Touch Unless Explicitly Asked

- `AGENT.md`, `CLAUDE.md`
- `.env`, secrets, or credentials
- Deploy config
- Package files
- SQL or migrations
- Production infrastructure
