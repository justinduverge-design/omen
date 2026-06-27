# Omen Agent Inbox

**Auto-populated 2026-06-27 (Codex session) from `Direction/current_sprint.md`; refreshed after Phase 2.17 local closeout.** Phase 2.17 is built locally on branch `codex/phase2-17-platform-last-result` and awaits Justin push/PR/deploy decision. Next pull should start from the refreshed top-5 below unless Justin pins another item.

## Active Task

None pinned after Phase 2.17 local closeout.

## Auto-Populated Top 5

1. **Phase 3.12 — Tailscale -> KVM2 Gemma 4-E4B bridge.** Wire private local narration path using the existing `LLM_BASE_URL` env inventory. Done docs: feature + security.
2. **Phase 3.13 — Token-constrained prompts.** Enforce CPU-friendly narration prompts at <=50 words / 2 sentences. Done docs: feature + recommendation.
3. **Phase 4.16 — Termly base ToS + Privacy Policy.** Draft AI-authored custom paragraphs for ESPN cookie handling, Yahoo attribution, and Sleeper attribution for Justin review. Done docs: security + content-marketing if public pages/posts are produced.
4. **Phase 1.7 — Platform brand color emphasis + button-style consistency.** Sleeper blue / Yahoo purple / ESPN red; apply consistently across `/account/connect`, `/account` connect-row, `/standings` platform badge, and league switcher. Done docs: page + design.
5. **Phase 1.8 — Confidence gradient endpoints.** Rich dark crimson at 0% -> rich dark green at 100%, HSL interpolation, amber midpoint. Apply to Omen confidence bar + Draft Assistant card confidence bar. Done docs: design + recommendation.

## Blockers Surfaced

- **Phase 3.15 (`AI_PROVIDER=local|cloud` toggle)** remains gated on a `decision_log.md` dollar-cap entry. Do not pull until Justin's approved dollar cap is logged.
- **Tuesday scoring enablement** remains gated on approved Supabase dry-run validation and explicit scoring enablement approval. Keep `OMEN_CRON_SCORING_ENABLED=false`.
- **Phase 1.5d (post-win pulse animation)** is unblocked once Phase 2.17 is pushed/merged/deployed; local contract is built but not live.
- **Frontend Phase 2.10 (Trade share card)** is now unblocked by deployed Backend Phase 2.10 hash routes.

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
