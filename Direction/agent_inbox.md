# Omen Agent Inbox

**Refreshed 2026-07-05 (Phase 2.13 Trade Analyzer Strategy + Mock Buy Low content rewrite complete, merged, deploy triggered).** Phase 2.13 closed on branch `frontend/phase2-13-trade-strategy-copy`: all 4 `TRADE_TIPS` bullets rewritten (Justin picked Option C), 3 of 5 Mock Buy Low `reason` lines rewritten, Depth bullet no longer ends with "Build roster depth now." Evidence in `Blueprints/handoffs/2026-07-05-phase2-13-trade-strategy-copy-rewrite.md`. Discovered and filed a new Decisions-lane item: `tradePulse.js` has no data-refresh mechanism despite its own "updated each preseason" copy. No pinned task remains — next unchecked items per `current_sprint.md` lead with Phase 2.14 (Standings team-switching UX).
**Refreshed 2026-07-05 (Phase 2.12 Trade Analyzer form redesign complete locally).** Phase 2.12 is complete on `codex/phase2-12-trade-form-redesign`: `/trade` now uses position buttons instead of dropdowns, sends explicit scoring format, exposes an honest Multi-team net-side mode, adds a desktop swap cue, VORP help, and a shared MockBanner for buy-low targets. Evidence is in `Blueprints/handoffs/2026-07-05-phase2-12-trade-form-redesign.md`.
**Refreshed 2026-07-05 (Phase 2.11 signal-honesty labels complete locally).** Phase 2.11 is complete on `codex/phase2-11-signal-honesty-labels`: Omen recommendation signals now render as visible Live / Stub / Mock / Unavailable input-honesty labels using data-source tokens, with public demo signals display-normalized to Mock. Evidence is in `Blueprints/handoffs/2026-07-05-phase2-11-signal-honesty-labels.md`. No push, merge, deploy, backend route, schema, auth, provider, package, env, or SQL change happened.
**Refreshed 2026-07-05 (Codex kickoff auto-populate).** No pinned task. Phase 1.15 and Phase 2.18 are complete locally per latest handoffs, so they are not re-pulled. Next active build item is Phase 2.11 — FP1 signal-honesty labels. Current repo branch at kickoff: `tooling/authenticated-route-driver`; worktree clean.
**Refreshed 2026-07-05 (Phase 2.18 Waiver Wire route activation complete locally; after Phase 2.10 trade share card merged via PR #80).** Phase 2.18 is complete locally on `frontend/phase2-18-waiver-wire-activation`: `/waiver` is routed and nav-reachable, the doctrine-stale `ProGate` is removed, position chips use the shared helper, and the page's Tailwind literals are swept onto design-system tokens. Evidence is in `Blueprints/handoffs/2026-07-05-phase2-18-waiver-wire-activation.md`. Phase 2.10 (trade share card) is confirmed merged to `origin/main` via PR #80 (`6cd554b`) — local `main` fast-forwarded to match. Phase 2.9 is complete on `codex/phase2-9-account-delete-ui`. Phase 1.14 is complete: PR #75 and PR #76 deploy runs both completed successfully. Phase 1.13 is complete and merged via PR #75.
**Refreshed 2026-07-05 (Phase 1.15 post-deploy visual smoke complete locally; Phase 2.10 trade share card complete locally; Phase 2.9 account delete UI conflict resolution; after Phase 1.14 deploy verification and canonical off-season signal).** Phase 1.15 is complete locally on `codex/phase1-15-post-deploy-visual-smoke`: deploy workflow now has a public-route logo smoke for `/`, `/about`, and `/login`, and `/login` now uses the transparent Omen lockup image. Evidence is in `Blueprints/handoffs/2026-07-05-phase1-15-post-deploy-visual-smoke.md`. Phase 2.10 is complete locally on `frontend/phase2-10-trade-share-card`: `/trade` can create a public share link, `/trade/share/:hash` renders the public card, and `/api/trade/share/:hash/og.svg` serves the server-side OG SVG. Evidence is in `Blueprints/handoffs/2026-07-04-phase2-10-trade-share-card.md`. Phase 2.9 is complete on `codex/phase2-9-account-delete-ui`: `/account` now exposes Omen data deletion through the mounted `/api/user/delete` route, with evidence in `Blueprints/handoffs/2026-07-04-phase2-9-account-delete-ui.md`. Phase 1.14 is complete: PR #75 and PR #76 deploy runs both completed successfully, current prod serves the transparent Omen lockup bundle/asset, and `.github/workflows/deploy.yml` has a post-health bundle-level logo verification step. Phase 1.13 is complete and merged via PR #75; remaining mobile/ARIA polish items are follow-ups, not Phase 1.13 blockers. The Cowork mobile-QA P1s are resolved or routed through the rate-limit and canonical off-season work now in `origin/main`.

## Active Task

None pinned. Phase 2.13 is complete (see refresh line above). Next session should auto-populate from `current_sprint.md`.

## Auto-Populated Top 5

1. **Phase 2.14 — Standings team-switching UX.** Easier inter-platform team switching per Justin QA. Pairs with Phase 1.7 platform color emphasis. Cost: medium. Done docs: feature + page + design.
2. **Phase 2.15 — Account subscription card removal (pre-launch hygiene).** Hide the Omen Pro "All features included" card on `/account` while Omen is free this season. Re-show when billing kill-switch flips. Cost: small. Done docs: page + design.
3. **Phase 2.16 — IDP / defensive-player drafting prep.** Position chip palette (Phase 1.6) must already include DEF; this item carries the data + draft flow updates for leagues that draft defensive players. Cost: large. Done docs: feature + page + design + recommendation.
4. **Vault secretId plaintext logging fix (P0 security).** `src/routes/platforms.js` `vaultDelete()` logs the raw Vault secret id on RPC failure. Not re-verified as still current in this session — surfaced here from the sprint queue, not freshly confirmed.

## Blockers Surfaced

- **Phase 2.12 (Trade Analyzer form redesign)** is complete locally. `/trade` now uses position buttons instead of dropdowns, sends scoring format, exposes honest Multi-team net-side mode, and has browser evidence under `output/playwright/phase2-12-trade-form-redesign/`.
- **Phase 2.11 (FP1 signal-honesty labels)** is complete locally. Omen recommendation signals now render as visible input-honesty labels on the shared recommendation view, using data-source tokens and plain statuses (`Live`, `Stub`, `Mock`, `Unavailable`). Public demo `status: "demo"` signals display as Mock / preview. Evidence: `Blueprints/handoffs/2026-07-05-phase2-11-signal-honesty-labels.md`.
- **Phase 2.18 (Waiver Wire route activation)** is complete locally. `/waiver` is routed behind `ProtectedRoute`, nav-reachable from the Header Tools section, the Pro-gate branch is removed, and the page is fully on design-system tokens. Known gap: no authenticated light/dark screenshot evidence (sandbox limitation, documented in the handoff).
- **Phase 2.10 (trade share card)** is merged to `origin/main` via PR #80 (`6cd554b`). Trade Analyzer can create public share links, `/trade/share/:hash` renders the public card, and `/api/trade/share/:hash/og.svg` provides the server-side OG image. Browser evidence is under `output/playwright/phase2-10-trade-share-card/`.
- **Phase 2.9 (account delete UI)** is complete. `/account` exposes the mounted `DELETE /api/user/delete` route with the exact `DELETE MY OMEN DATA` confirmation phrase, sign-out redirect, login completion notice, and desktop/mobile screenshot evidence.
- **Phase 1.14 (prod deploy stale for logo swap)** is complete and merged. Current prod serves the transparent lockup bundle/asset; the deploy workflow now fails future runs if the production bundle lacks the transparent lockup reference.
- **Phase 1.15 (post-deploy visual smoke on prod)** is complete locally, not pushed/merged/deployed. The deploy workflow now has the public-route logo smoke, and `/login` was aligned to the transparent lockup image after browser QA found current prod was still text-only.
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
