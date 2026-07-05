# Omen Agent Inbox

**Refreshed 2026-07-04 (Phase 2.10 trade share card complete locally; Phase 2.9 account delete UI conflict resolution; after Phase 1.14 deploy verification and canonical off-season signal).** Phase 2.10 is complete locally on `frontend/phase2-10-trade-share-card`: `/trade` can create a public share link, `/trade/share/:hash` renders the public card, and `/api/trade/share/:hash/og.svg` serves the server-side OG SVG. Evidence is in `Blueprints/handoffs/2026-07-04-phase2-10-trade-share-card.md`. Phase 2.9 is complete on `codex/phase2-9-account-delete-ui`: `/account` now exposes Omen data deletion through the mounted `/api/user/delete` route, with evidence in `Blueprints/handoffs/2026-07-04-phase2-9-account-delete-ui.md`. Phase 1.14 is complete: PR #75 and PR #76 deploy runs both completed successfully, current prod serves the transparent Omen lockup bundle/asset, and `.github/workflows/deploy.yml` has a post-health bundle-level logo verification step. Phase 1.13 is complete and merged via PR #75; remaining mobile/ARIA polish items are follow-ups, not Phase 1.13 blockers. The Cowork mobile-QA P1s are resolved or routed through the rate-limit and canonical off-season work now in `origin/main`.

## Active Task

None pinned. Auto-populate from Top 5.

## Auto-Populated Top 5

1. **Phase 2.18 — Waiver Wire route activation.** Free-tier route currently hidden behind doctrine-stale `ProGate`; 6 focused sub-tasks in `current_sprint.md`. Unblocked (Phase 1.6 chip helper shipped). Done docs: feature + page + design + recommendation.
2. **Phase 1.15 — Post-deploy visual smoke on prod.** Add a `slops-canary`-driven post-deploy smoke against `slopssaloon.com` for home/about/login logo visibility and no `[C]` placeholder / black-rectangle regression. Cost: small. Done docs: release.
3. **Phase 2.11 — FP1 signal-honesty labels.** Surface each Omen input's `live` / `stub` / `unavailable` status. Backend vocabulary already exists at `src/services/omen.js:356`. Cost: medium. Done docs: feature + page + design + recommendation.
4. **Phase 2.12 — Trade Analyzer form redesign.** Replace position dropdowns with position-as-buttons surface, plus multi-team trade support. Done docs: page + design + recommendation.
5. **Phase 2.13 — Trade Analyzer Strategy + Mock Buy Low content rewrite.** Rewrite the "SO SO" strategy sidebar copy via `slops-ux-copy`; specifically remove the "Build roster depth now" tail from Depth bullet. Cost: small. Done docs: page + design + recommendation.

## Blockers Surfaced

- **Phase 2.10 (trade share card)** is complete locally. Trade Analyzer can create public share links, `/trade/share/:hash` renders the public card, and `/api/trade/share/:hash/og.svg` provides the server-side OG image. Browser evidence is under `output/playwright/phase2-10-trade-share-card/`.
- **Phase 2.9 (account delete UI)** is complete. `/account` exposes the mounted `DELETE /api/user/delete` route with the exact `DELETE MY OMEN DATA` confirmation phrase, sign-out redirect, login completion notice, and desktop/mobile screenshot evidence.
- **Phase 1.14 (prod deploy stale for logo swap)** is complete and merged. Current prod serves the transparent lockup bundle/asset; the deploy workflow now fails future runs if the production bundle lacks the transparent lockup reference.
- **Phase 1.13 (iOS Safari mobile QA sweep)** is complete and merged to `main` via PR #75. The sprint doc now reflects Justin's correction: real Safari WebDriver evidence and the remediation/discrete-fix handoffs satisfy the phase; remaining mobile/ARIA polish is tracked as separate follow-up work, not a Phase 1.13 blocker.
- **Both Cowork mobile-QA P1s are resolved or routed.** (a) Unhandled 429 raw-JSON leak — root cause was `src/server.js`'s general rate limiter mounted globally instead of scoped to `/api/*`; fixed and live-verified with static assets exempt while API limiting remains active. (b) Standings-fails-to-load — canonical off-season signal now lets `GET /api/league/standings` return a successful empty standings envelope during off-season before provider calls. Contract: `Blueprints/handoffs/backend-to-frontend.md` ("Canonical Off-Season Signal — 2026-07-04").
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
- **Doc debt closed:** `current_sprint.md` Frontend Phase 1 now has one completed Phase 1.13 entry. Deferred mobile/ARIA polish remains named as follow-up scope rather than blocking the phase checkbox.
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
