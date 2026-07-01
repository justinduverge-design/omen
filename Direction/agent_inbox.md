# Omen Agent Inbox

**Auto-populated 2026-07-01 (Codex session) from `Direction/current_sprint.md`; no `📌` pin was present.** Phase 1.7 is now complete locally, so the queue rolls forward to the next unblocked frontend polish item.

## Active Task

**Phase 1.8 — Confidence gradient endpoints.** Rich dark crimson at 0% -> rich dark green at 100%, HSL interpolation, amber midpoint. Apply to Omen confidence bar + Draft Assistant card confidence bar. Cost: small. Done docs: design + recommendation.

## Auto-Populated Top 5

1. **Phase 1.8 — Confidence gradient endpoints.** Rich dark crimson at 0% -> rich dark green at 100%, HSL interpolation, amber midpoint. Apply to Omen confidence bar + Draft Assistant card confidence bar. Done docs: design + recommendation.
2. **Phase 1.9 — Metallic tier treatment.** Draft Assistant top-3 ordinal pills: antique gold, brushed silver, antique bronze. Done docs: design + recommendation.
3. **Phase 1.12 — Gray contrast pass + Standings refinements.** Body-gray AA sweep plus current-user standings row treatment. Done docs: page + design.
4. **Phase 1.13 — iOS Safari mobile QA sweep.** Sweep every routed page on iOS Safari, fix overflow/touch/focus/safe-area issues, and convert single-select chip groups to radiogroup semantics. Done docs: page + design.
5. **Phase 2.9 — Account delete UI.** Expose backend route at `src/routes/userPrivacy.js:136` in `Account.jsx` with the `"DELETE MY OMEN DATA"` confirmation phrase. Done docs: feature + page + design + security.

## Blockers Surfaced

- **Phase 3.12 production enablement** is complete. Live `/api/ready` reports the LLM bridge as `configured_private`; no URL is exposed.
- **Phase 3.15 (`AI_PROVIDER=local|cloud` toggle)** now has a logged decision: `cloud budget cap = $0/month` and Omen remains local-only. Do not pull/build the cloud toggle unless Justin later approves and logs a nonzero cap.
- **Ops / Justin items** remain approval/execution gated and were not auto-selected: OP1 operational rename boundaries, production secrets/Supabase review, and cron enablement decision.
- **Tuesday scoring enablement** remains gated on approved Supabase dry-run validation and explicit scoring enablement approval. Keep `OMEN_CRON_SCORING_ENABLED=false`.
- **Phase 1.5d (post-win pulse animation)** is complete locally as single-win behavior; authenticated visual screenshot/mobile-smoke evidence remains a follow-up gap.
- **Backend win-streak summary contract** is complete locally; `currentWinStreak` is now available for frontend Phase 2.19 when it reaches the top of queue.
- **Backend ESPN live draft tracking** is complete locally; frontend can consume the new authenticated `/api/espn/draft*` routes when an ESPN draft surface is ready.
- **Backend Yahoo live draft tracking** is complete locally; frontend can consume the new authenticated `/api/yahoo/draft*` routes when a Yahoo draft surface is ready.
- **Frontend Phase 2.10 (Trade share card)** is now unblocked by deployed Backend Phase 2.10 hash routes.
- **Phase 4.16 provider legal packet** is complete as review-only open-agreements source material; counsel/Justin review still gates publication.
- **Phase 1.7 platform-brand pass** is complete locally; final screenshot/mobile proof remains blocked on a sanctioned authenticated browser session for the protected `/account` and `/standings` routes.

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
- Worktree was clean at pull time; keep unrelated future edits out of this task scope.

## Do Not Touch Unless Explicitly Asked

- `AGENT.md`, `CLAUDE.md`
- `.env`, secrets, or credentials
- Deploy config
- Package files
- SQL or migrations
- Production infrastructure
