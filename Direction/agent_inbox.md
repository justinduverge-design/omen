# Omen Agent Inbox

**Auto-populated 2026-06-30 (Claude session); refreshed after Phase 1.7 local closeout.** Phase 1.7 (platform brand color emphasis) is complete locally — see `Direction/sprints_completed.md`. Phase 1.5d remains complete locally as single-win pulse behavior; the win-streak ladder is still blocked on a backend-computed streak contract.

## Active Task

None pinned after Phase 1.7 local closeout.

## Auto-Populated Top 5

1. **Phase 1.8 — Confidence gradient endpoints.** Rich dark crimson at 0% -> rich dark green at 100%, HSL interpolation, amber midpoint. Apply to Omen confidence bar + Draft Assistant card confidence bar. Done docs: design + recommendation.
2. **Phase 1.9 — Metallic tier treatment.** Draft Assistant top-3 ordinal pills: 1=antique gold, 2=brushed silver, 3=antique bronze. Done docs: design + recommendation if Draft Assistant cards change.
3. **Phase 1.12 — Gray contrast pass + Standings refinements.** WCAG AA gray body string pass across `/account/appearance`, `/standings`, `/hall-of-records`, and `/onboarding`, plus stronger Standings "you" row treatment. Done docs: page + design.
4. **Phase 1.13 — iOS Safari mobile QA sweep.** Routed-page iOS Safari sweep plus radiogroup semantics for mutually exclusive chips. Done docs: page + design.
5. **Phase 2.9 — Account delete UI.** Expose backend route at `src/routes/userPrivacy.js:136` in `Account.jsx`. Confirmation phrase: "DELETE MY OMEN DATA". Done docs: feature + page + design + security.

## Blockers Surfaced

- **Phase 3.12 production enablement** is complete. Live `/api/ready` reports the LLM bridge as `configured_private`; no URL is exposed.
- **Phase 3.15 (`AI_PROVIDER=local|cloud` toggle)** remains gated on a `decision_log.md` dollar-cap entry. Do not pull until Justin's approved dollar cap is logged.
- **Tuesday scoring enablement** remains gated on approved Supabase dry-run validation and explicit scoring enablement approval. Keep `OMEN_CRON_SCORING_ENABLED=false`.
- **Phase 1.5d (post-win pulse animation)** is complete locally as single-win behavior; authenticated visual screenshot/mobile-smoke evidence remains a follow-up gap.
- **Win-streak reward ladder** is documented but blocked on the new backend win-streak summary contract.
- **Frontend Phase 2.10 (Trade share card)** is now unblocked by deployed Backend Phase 2.10 hash routes.
- **Phase 4.16 provider legal packet** is complete as review-only open-agreements source material; counsel/Justin review still gates publication.
- **Phase 1.7 (platform brand color emphasis)** is complete locally — not pushed/merged/deployed. Sleeper's brand hex has no confirmed public source; flagged for Justin if he has Sleeper's actual brand kit.
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
