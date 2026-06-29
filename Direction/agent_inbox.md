# Omen Agent Inbox

**Auto-populated 2026-06-29 (Codex session) from `Direction/current_sprint.md`; refreshed after Phase 1.5d local closeout.** Phase 1.5d is complete locally as single-win pulse behavior. The win-streak ladder is documented but remains blocked on a backend-computed streak contract.

## Active Task

None pinned after Phase 1.5d local closeout.

## Auto-Populated Top 5

1. **Phase 1.7 — Platform brand color emphasis + button-style consistency.** Sleeper blue / Yahoo purple / ESPN red; apply consistently across `/account/connect`, `/account` connect-row, `/standings` platform badge, and league switcher. Done docs: page + design.
2. **Phase 1.8 — Confidence gradient endpoints.** Rich dark crimson at 0% -> rich dark green at 100%, HSL interpolation, amber midpoint. Apply to Omen confidence bar + Draft Assistant card confidence bar. Done docs: design + recommendation.
3. **Phase 1.9 — Metallic tier treatment.** Draft Assistant top-3 ordinal pills: 1=antique gold, 2=brushed silver, 3=antique bronze. Done docs: design + recommendation if Draft Assistant cards change.
4. **Phase 1.12 — Gray contrast pass + Standings refinements.** WCAG AA gray body string pass across `/account/appearance`, `/standings`, `/hall-of-records`, and `/onboarding`, plus stronger Standings "you" row treatment. Done docs: page + design.
5. **Phase 1.13 — iOS Safari mobile QA sweep.** Routed-page iOS Safari sweep plus radiogroup semantics for mutually exclusive chips. Done docs: page + design.

## Blockers Surfaced

- **Phase 3.12 production enablement** is complete. Live `/api/ready` reports the LLM bridge as `configured_private`; no URL is exposed.
- **Phase 3.15 (`AI_PROVIDER=local|cloud` toggle)** remains gated on a `decision_log.md` dollar-cap entry. Do not pull until Justin's approved dollar cap is logged.
- **Tuesday scoring enablement** remains gated on approved Supabase dry-run validation and explicit scoring enablement approval. Keep `OMEN_CRON_SCORING_ENABLED=false`.
- **Phase 1.5d (post-win pulse animation)** is complete locally as single-win behavior; authenticated visual screenshot/mobile-smoke evidence remains a follow-up gap.
- **Win-streak reward ladder** is documented but blocked on the new backend win-streak summary contract.
- **Frontend Phase 2.10 (Trade share card)** is now unblocked by deployed Backend Phase 2.10 hash routes.
- **Phase 4.16 provider legal packet** is complete as review-only open-agreements source material; counsel/Justin review still gates publication.

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
