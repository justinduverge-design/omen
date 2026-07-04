# Omen Agent Inbox

**Refreshed 2026-07-04 (Codex Phase 1.14 closeout).** Phase 1.14 is complete locally: PR #75 and PR #76 deploy runs both completed successfully, current prod serves the transparent Omen lockup bundle/asset, and `.github/workflows/deploy.yml` now has a post-health bundle-level logo verification step. Handoff: `Blueprints/handoffs/2026-07-04-phase1-14-deploy-logo-verification.md`.

## Active Task

None pinned. Phase 1.14 is done; next agent should pull from the top-5 below unless Justin pins a task.

## Auto-Populated Top 5 (next up if 1.14 isn't picked, or after it closes)

1. **Two untriaged P1s from the 2026-07-02 Cowork mobile-QA audit** (`Solutions/reports/2026-07-02-mobile-qa-omen.md`): (a) League Standings fails to load on `/standings` and `/football` for a fully-connected account, reproduced across every viewport/team theme — needs an eng call on genuine bug vs. off-season empty state wearing error copy; (b) an unhandled 429 rate-limit response renders raw backend JSON on-page with no styling — no generic API-error boundary exists anywhere in the frontend. Neither is yet a checklist item in `current_sprint.md` — triage first, then fix.
2. **Phase 1.13 — remaining scope.** 7 authenticated routes still unswept for touch-target/overflow issues (sandbox Supabase-auth limitation blocked every session so far — try real-device or production QA per the Cowork audit's WebDriver approach instead of the dev sandbox); `ConnectLeague.jsx` ESPN browser-selector (tabs pattern) and `AppearancePicker.jsx` 32-team grid (2D keyboard nav) ARIA conversions remain deferred follow-ups. See `Blueprints/handoffs/2026-07-02-phase1-13-mobile-qa-sweep-partial.md` and the 2026-07-03 remediation/discrete-fixes handoffs.
3. **Phase 2.9 — Account delete UI.** Expose backend route at `src/routes/userPrivacy.js:136` in `Account.jsx`. Confirmation phrase: "DELETE MY OMEN DATA". Done docs: feature + page + design + security.
4. **Phase 2.10 — Trade share card.** Share button on Trade Analyzer result, server-side OG image. Unblocked (Backend Phase 2.10 hash routes deployed). Done docs: feature + page + design + recommendation.
5. **Phase 2.18 — Waiver Wire route activation.** Free-tier route currently hidden behind doctrine-stale `ProGate`; 6 focused sub-tasks in `current_sprint.md`. Unblocked (Phase 1.6 chip helper shipped). Done docs: feature + page + design + recommendation.

## Blockers Surfaced

- **Phase 1.14 (prod deploy stale for logo swap)** is complete locally. Current prod serves the transparent lockup bundle/asset; the deploy workflow now fails future runs if the production bundle lacks the transparent lockup reference.
- **Phase 1.13 (iOS Safari mobile QA sweep) code is now merged to `main` via PR #75** (CSP `upgrade-insecure-requests` fix, cross-browser focus-trap via `useFocusTrap.js`, discrete team-palette repairs) — real Safari WebDriver verified. Sprint doc still shows this item unchecked because 7 authenticated routes remain unswept; see Top 5 #2.
- **Two untriaged P1s from the Cowork mobile-QA audit** (Standings load failure, unhandled 429 raw-JSON render) — see Top 5 #1. Worth a `current_sprint.md` entry of their own once triaged.
- **Phase 1.9 (metallic tier treatment)** is complete and merged to `main`. Applied only to the Draft Assistant card-header ordinal pill per locked footer structure. Appearance-tile metallic add-on stays out of scope, unbuilt.
- **Phase 1.12 (gray contrast pass + Standings refinements)** is complete and merged to `main`. Retired Hall of Records username target closed as documentation debt (page retired to `/ledger`, no replacement surface invented).
- **Phase 3.12 production enablement** is complete. Live `/api/ready` reports the LLM bridge as `configured_private`; no URL is exposed.
- **Phase 3.15 (`AI_PROVIDER=local|cloud` toggle)** remains gated on a `decision_log.md` dollar-cap entry. Do not pull until Justin's approved dollar cap is logged.
- **Tuesday scoring enablement** remains gated on approved Supabase dry-run validation and explicit scoring enablement approval. Keep `OMEN_CRON_SCORING_ENABLED=false`.
- **Phase 1.5d (post-win pulse animation)** is complete as single-win behavior; authenticated visual screenshot/mobile-smoke evidence remains a follow-up gap.
- **Win-streak reward ladder (Phase 2.19)** is documented but blocked on the new backend win-streak summary contract (`current_sprint.md` Backend — Behind launch readiness).
- **Phase 4.16 provider legal packet** is complete as review-only open-agreements source material; counsel/Justin review still gates publication.
- **Phase 1.7 (platform brand color emphasis)** is complete and merged. Sleeper's brand hex has no confirmed public source; flagged for Justin if he has Sleeper's actual brand kit.
- **Phase 1.8 (confidence gradient endpoints)** is complete and merged. The crimson floor's non-text contrast against the dark track (1.45:1) is below WCAG 1.4.11's 3:1 guideline, accepted as a documented tradeoff since both confidence bars always show the score as text.
- **Phase 2.20 (chant-render implementation)** is blocked on at least 6 teams' chants verified via `design-md-author` plus initial texture assets — do not pull yet.
- **New Decisions-lane items from the 2026-07-03 doctrine merge** (marketing pillars confirm/revise, retire baked-black logo fallback, Corvus-reference audit) sit in `current_sprint.md` Decisions lane — Justin-gated, agents prepare recommendations only.
- **`test/deployHardening.test.js` has 1 pre-existing CRLF line-ending failure** (unrelated to recent feature work; confirmed present since at least 2026-06-29). Spun off as its own background-task suggestion rather than fixed inline.
- **Doc debt:** `current_sprint.md` Frontend Phase 1 has three overlapping Phase 1.13 bullet entries (in-progress detail, an older duplicate stub, and the Cowork audit note) that should get consolidated into one entry next time someone closes out 1.13 fully.

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
- Worktree was clean before this refresh; local `main` fast-forwarded cleanly to `origin/main` (`339da00`), no local commits were at risk.

## Do Not Touch Unless Explicitly Asked

- `AGENT.md`, `CLAUDE.md`
- `.env`, secrets, or credentials
- Deploy config
- Package files
- SQL or migrations
- Production infrastructure
