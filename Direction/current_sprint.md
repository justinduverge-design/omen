# Omen Current Sprint

Last updated: 2026-06-27 (split executed: done-item evidence moved to `Direction/sprints_completed.md`; lane labels made vendor-agnostic — lanes are work areas, not agent assignments.)

## How this feeds the loop

`Next` below is the queue. Each item lives under a **lane** (work area, not an agent assignment) and is a checkbox.
- Agents are lane-agnostic — any agent may pull any agent-buildable item from any lane. No frontend/backend lean, no Claude/Codex split. Pick by readiness, blockers, and token-cost (see `Blueprints/playbooks/sprint-synergy.md` once written).
- When `Direction/agent_inbox.md` has no pinned Active Task, agents organize the next unchecked agent-buildable items across Backend + Frontend lanes and surface blockers.
- `agent_inbox.md` overrides this — pin a specific or custom task there and it wins.
- When an item is done, the agent moves it to `Direction/sprints_completed.md` with full evidence (run IDs, commit SHAs, test counts) and logs the decision in `Direction/decision_log.md`.
- Agents do not auto-pull from **Ops / Justin**, **Verify**, or **Decisions** unless Justin explicitly pins one.

> **Where to look for history:** done-item evidence with run/commit IDs lives in `Direction/sprints_completed.md`. Doctrine and decisions live in `Direction/decision_log.md`. Per-phase deliverable receipts live in `Blueprints/done/`. In-app retro signal lives at `/ledger` (Move History). Don't pull these into context unless the task actually needs them.

## Current State

- Live on the renamed route; PR #22 deployed (run `26833528435`); `/api/health` ok, `/api/ready` ready.
- Backend tests 378/378 local (2026-06-25); frontend build clean at the prior baseline; full `npm audit --audit-level=moderate` reports 0 vulnerabilities. The last fresh-clone verification at `2acb663` passed `npm ci` and the then-current 297/297 tests.
- Tier 2 authenticated production smoke: 13/13 passed 2026-06-04. Local authenticated load smoke 2026-06-05: Trade Analyzer p95 34ms, dashboard summary p95 633ms, Omen p95 4999ms (latency follow-up, not blocked).
- ESPN real-account QA complete — Sleeper / Yahoo / ESPN all connected.
- Tuesday scoring nflverse adapter implemented locally with fixture tests and dry-run no-write mode. Cron stays disabled (`OMEN_CRON_SCORING_ENABLED=false`) until approved real-data dry-run validates production Supabase data without writes.
- Posture: **KVM1-live / post-cutover QA**. Remaining gates: final production secrets/Supabase review, and Tuesday scoring enablement after backend provider validation.
- Phase 1.4 (font system) actually-in-prod 2026-06-16. Two carry-forward operating rules in `decision_log.md`: clean-clone (`rm -rf node_modules && npm ci` or `/tmp` clone) verification required for any Phase touching `package.json`/`package-lock.json`, and never merge with the gating CI check red. Full incident: `Blueprints/handoffs/2026-06-16-phase1-4-lockfile-resync-handoff.md`.
- Deploy operating mode: `.github/workflows/deploy.yml` runs deploy locally on KVM1's self-hosted runner (`corvus-kvm1-deploy`, label `omen-deploy`). `.github/workflows/deploy-kvm1-tailscale-fallback.yml` is manual-only backup over Tailscale (last green run `27693807505`).

## Now

- **Phase 1.5 PR1 (team-theming system core) merged 2026-06-17 via PR #41.** Phase 1.5b / 1.5c / 1.5d are unblocked on the frontend side (1.5d still needs Backend Phase 2.17).
- Hold all API contracts stable; keep docs aligned to the 2026-06-04 state.
- Keep Tuesday scoring disabled until scoreable move metadata is confirmed against real rows and an approved nflverse dry-run validates production Supabase data without writes.
- Treat Omen local p95 around 5s under repeated load as a performance follow-up before broad paid-user traffic.

## Next

### Ops / Justin (gated — agent prepares, Justin executes)
- [ ] **OP1 — Approve Omen operational rename boundaries.** Decide whether the cutover includes only deploy identity or also the GitHub repo/local folder rename; confirm maintenance window, KVM1 access, runner-label approach, and old Corvus artifact retention. Spec: `Blueprints/specs/omen-operational-rename-cutover.md`. Done-when: Justin explicitly approves the scope and rollback owner; no production mutation happens in this item.
- [ ] Final review of production secrets + Supabase settings before paid-launch confidence.
- [ ] Decide on enabling `OMEN_CRON_SCORING_ENABLED=true` only after the nflverse scoring adapter and dry-run validation are complete.

### Backend — Phase 2
- [ ] **Phase 2.17 — Platform `lastResult` field for post-win pulse.** Add `lastResult: 'W' | 'L' | null` + `lastGameId: string | null` + `lastGameKickoff: ISO8601 | null` to the platform-summary response shape returned by Sleeper / Yahoo / ESPN adapters. Sleeper exposes this natively in their schedule API (cheap). Yahoo and ESPN need adapter additions — research first (per `anthropic-skills:pre-build-research`), then implement. Backend-only; frontend consumes via Phase 1.5d. Cookie-safety discipline applies (never log ESPN cookies, ever). Handoff via `Blueprints/handoffs/backend-to-frontend.md` once contract is stable. **Blocks Phase 1.5d.** Done docs: feature + security if any new ESPN scope is needed.

### Backend — Phase 3
- [ ] **Phase 3.12 — Tailscale → KVM2 Gemma 4-E4B bridge** for narration. `LLM_BASE_URL` already in env inventory. Done docs: feature + security.
- [ ] **Phase 3.13 — Token-constrained prompts** (≤50 words / 2 sentences) for CPU inference mitigation. Done docs: feature + recommendation.
- [ ] **Phase 3.15 — `AI_PROVIDER=local|cloud` toggle** with hard budget cap. **DO NOT BUILD until the cap is logged in `decision_log.md` with Justin's approved dollar figure.** Done docs: feature + security + release when deployed.

### Backend — Phase 4
- [ ] **Phase 4.16 — Termly base ToS + Privacy Policy** — agent authors AI-drafted custom paragraphs for ESPN cookie handling, Yahoo attribution, Sleeper attribution. Justin reviews. Done docs: security + content-marketing if public pages/posts are produced.

### Backend — Behind launch readiness (post-launch, not deferred to 2027)
- [ ] Tuesday scoring enablement (`OMEN_CRON_SCORING_ENABLED=true`) after approved Supabase dry-run. Done docs: feature + recommendation + security + release.
- [ ] ESPN live draft tracking (Lazy Sync, same pattern as Sleeper). Done docs: feature + recommendation + security.
- [ ] Yahoo live draft tracking (Lazy Sync, same pattern as Sleeper). Done docs: feature + recommendation + security.

### Post-live learning / Justin + Agents (gated)
- [ ] **PL1 — Post-live Omen technology-learning and in-season improvement cycle.** Run only after Release Done, seven stable production days, and a seven-day `slops-product-pulse`. Spec: `Blueprints/playbooks/post-live-technology-learning.md`. Done-when: all six learning sessions have demonstration evidence, `slops-learning-loop` has a prior-use note, and approved improvements that can land before season end are ordered in this sprint. **Blocked by public Omen baseline + seven stable days.**

### Frontend — Phase 1
- [ ] **Phase 1.5d — Post-win pulse animation.** When the user's team won most recently: brightness +6% on team accent, "you" row bg alpha 14% → 22%, small `<i class="ti ti-trophy"></i> "<Team> W — bright today"` chip on Football dashboard, one-time 800ms team-accent wash across the header rule on first app-open after the W. Respects `prefers-reduced-motion`. Auto-clears next game day; last-seen `gameId` stored in localStorage. **Blocked by Phase 1.5 PR1 [x] + Backend Phase 2.17 [ ].** Guardrails: `ui-ux-pro-max` motion review; verdict: `slops-ui-ux-audit`. Done docs: feature + page + design.
- [ ] **Phase 1.7 — Platform brand color emphasis + button-style consistency.** Sleeper blue / Yahoo purple / ESPN red — verify exact hexes via `ui-ux-pro-max` platform-brand cross-check. Apply prominently on `/account/connect` tiles, `/account` connect-row buttons (Connect Sleeper / Yahoo / ESPN must share one button shape + size), `/standings` platform badge, league switcher. Both modes. **Blocked by Phase 1.3 [x] + Phase 1.4 [x].** Guardrail: `ui-ux-pro-max`; verdict: `slops-ui-ux-audit`. Done docs: page + design.
- [ ] **Phase 1.8 — Confidence gradient endpoints.** Rich dark crimson at 0% → rich dark green at 100%, HSL interpolation, amber midpoint. Apply to Omen confidence bar + Draft Assistant card confidence bar (current bars all gold — replace). Both modes — light-mode endpoints are darker variants, not lighter washes. **Blocked by Phase 1.3 [x] + Phase 1.4 [x].** Guardrail: `ui-ux-pro-max` gradient interpolation; verdict: `slops-ui-ux-audit`. Done docs: design + recommendation.
- [ ] **Phase 1.9 — Metallic tier treatment.** Draft Assistant top-3 ordinal pills: 1=antique gold (distinct from `--color-accent`), 2=brushed silver, 3=antique bronze. Subtle gradient + bevel, not flat fills. Optional add-on: metallic on selected Appearance tile glyph per Justin QA "3D effect on selections". **Blocked by Phase 1.3 [x] + Phase 1.4 [x].** Guardrail: `ui-ux-pro-max` metallic contrast; verdict: `slops-ui-ux-audit`. Done docs: design + recommendation if Draft Assistant cards change.
- [ ] **Phase 1.12 — Gray contrast pass + Standings refinements.** Pass: every gray body string vs its background must clear WCAG AA in both modes. Specific sites: `/account/appearance` paragraph, `/standings` W-L / PF / PA columns, `/hall-of-records` username column, `/onboarding` success paragraph. Standings "DarthSlops · you" row gets distinct row background + team-accent left edge (replaces too-subtle cyan underline). **Blocked by Phase 1.3 [x] + Phase 1.6 [x]** (palette reuse for gray scale). Guardrail: `ui-ux-pro-max`; verdict: `slops-ui-ux-audit`. Done docs: page + design.
- [ ] **Phase 1.13 — iOS Safari mobile QA sweep.** Open every routed page on iOS Safari (real device or production at https://slopssaloon.com). Fix viewport overflows, flex overflows, touch targets <44px, focus rings, safe-area-inset issues. Plus: convert mutually-exclusive button-toggle groups to `role="radiogroup"` + `role="radio"` + `aria-checked` semantics (currently use `aria-pressed`). Known site: `DraftAssistant.jsx` Scoring Format chips (PPR / Half PPR / Standard) — flagged in Phase 1.6 `slops-code-review` as P2-1. Multi-select chips (Position Needs) keep `aria-pressed`. Single PR. **Soft-blocked by Phase 1.4 [x] + Phase 1.5 [x]** (don't sweep what's about to be repainted). Skill: `mobile-first-qa-playbook` (use this — purpose-built for the sweep). Done docs: page + design.

### Frontend — Phase 2
- [ ] **Phase 2.9 — Account delete UI.** Expose backend route at `src/routes/userPrivacy.js:136` in `Account.jsx`. Confirmation phrase: `"DELETE MY OMEN DATA"`. Place under a "Privacy" subsection. Done docs: feature + page + design + security.
- [ ] **Phase 2.10 — Trade share card.** Share button on Trade Analyzer result. OG image rendered server-side. Card copy: brand voice, recommendation-first, no emoji-soup. **Blocked by Backend Phase 2.10 hash routes [x].** Done docs: feature + page + design + recommendation.
- [ ] **Phase 2.11 — FP1 signal-honesty labels.** Surface each Omen input's `live` / `stub` / `unavailable` status. Backend vocabulary already exists at `src/services/omen.js:356`. Done docs: feature + page + design + recommendation.
- [ ] **Phase 2.12 — Trade Analyzer form redesign.** Replace position dropdowns with position-as-buttons surface (Justin QA Part 2 — X over current Send/Receive form). Multi-team trade support. Symmetry / industry-trick visual balance. Done docs: page + design + recommendation.
- [ ] **Phase 2.13 — Trade Analyzer Strategy + Mock Buy Low content rewrite.** "Buy after one bad week" / "Sell into the schedule" / "Depth wins championships" / "TE1 is a multiplier" + Mock Buy Low target list — Justin marked "SO SO". Rewrite via `slops-ux-copy`; specifically remove "Build roster depth now" tail from Depth bullet. Done docs: page + design + recommendation.
- [ ] **Phase 2.14 — Standings team-switching UX.** Easier inter-platform team switching per Justin QA. Pairs with Phase 1.7 platform color emphasis. Done docs: feature + page + design.
- [ ] **Phase 2.15 — Account subscription card removal (pre-launch hygiene).** Hide the Omen Pro "All features included" card on `/account` while Omen is free this season. Re-show when billing kill-switch flips. Done docs: page + design.
- [ ] **Phase 2.16 — IDP / defensive-player drafting prep.** Position chip palette (Phase 1.6) must already include DEF; this item carries the data + draft flow updates for leagues that draft defensive players. Done docs: feature + page + design + recommendation.
- [ ] **Phase 2.18 — Waiver Wire route activation.** Omen is free indefinitely (facts-of-record 2026-06-15) so the existing `frontend/src/pages/WaiverWire.jsx` Pro gate is doctrine debt. (a) Add `<Route path="/waiver" element={<ProtectedRoute><AppLayout><WaiverWire/></AppLayout></ProtectedRoute>}>` to `routes/index.jsx`. (b) Add a Tools-section entry in `NavDrawer`. (c) Remove the `<ProGate/>` branch from `WaiverWire.jsx` — the underlying `/api/optimizer/waiver` 402 path is unreachable while `OMEN_BILLING_ENABLED=false`; keep the `TokenExpiredState` Yahoo-reconnect flow and the `AuthGate`. (d) Migrate the page's local `PositionBadge` (lines 11-27) to the shared `positionChipStyle()` from `frontend/src/lib/positionChip.js` (Phase 1.6 deliverable). (e) Sweep the page's `slate-*` Tailwind classes onto design-system tokens — the page predates the token migration. (f) Add a `page-system.md` row for `/waiver` (typography, accent role, copy anchor, light/dark parity). **Blocked by Phase 1.6 [x]** (chip helper). Surfaced by Phase 1.6 `slops-code-review` P2-2. Guardrails: `ui-ux-pro-max` + `slops-ui-ux-audit`. Done docs: feature + page + design + recommendation.

### Frontend — Phase 3
- [ ] **Phase 3.14 — Skeleton states for narration zones.** Math + numbers render instantly on KVM1; narration block shows skeleton until KVM2 returns. Done docs: page + design.

### Frontend — Phase 4
- [ ] **Phase 4.18 — Umami snippet** added to `frontend/index.html` once the container is live on KVM1. Done docs: feature + security + release when deployed.
- [ ] **Phase 4.19 — FP2 Sleeper/ESPN Omen render polish.** Ensure live envelopes render correctly across all three providers. Done docs: feature + page + design + recommendation.
- [ ] When the logo SVG is ready: replace the `[C]` placeholder in `Header.jsx` and `NavDrawer` with an inline SVG component. Done docs: page + design.

### Verify (confirm done vs open — restate findings, do not assume)
- [ ] **V1 — First company-baseline skill-receipt pilot.** Apply the baseline without changing the selected item's product scope. Spec: `Blueprints/playbooks/omen-company-baseline.md` + `Blueprints/playbooks/skill-activation-runbook.md`. Done-when: the task plan names selected skills and N/A reasons, applicable Done gates pass, and `Blueprints/playbooks/skill-usage-ledger.md` links the evidence.
- [ ] Resolve the doc conflict: does Sleeper/ESPN live Omen return `ready` or `pending_live_engine` for paid connected users? Settle to one truth and update docs. Done docs: n/a — verification/doc-conflict item; evidence is updated contract path.

### Decisions (Justin / Agents — not builds)
- [ ] `POST /api/optimizer/mvp-move` (`src/routes/optimizer.js`): merge into Omen as a Pro enrichment layer, or keep separate.
- [ ] Retire `getOmenOfTheWeekMock()` after Omen migration, or keep as a labeled fallback.
- [ ] Recovery analytics: ship before or after the first paid launch.

### Tech debt (later, low priority)
- [ ] 5 code TODOs: Yahoo per-player projected stats (`adapters/yahoo.js`); `rest_days` / `back_to_back` (`services/agents.js`); weather game-time interval (`services/weatherService.js`). Done docs: feature + recommendation where recommendation behavior changes.
- [ ] Omen latency optimization: `POST /api/omen/mvp-move` p95 ~5s under repeated local load. Investigate LLM call caching, response streaming, or request coalescing. Not a launch blocker — route is functional. Done docs: feature + recommendation.

## Guardrails

- Do not recreate `Omen/`.
- Do not touch `.env`, secrets, DNS, SSL, Nginx, Supabase migrations, Stripe production behavior, or package files without explicit approval.
- Do not deploy unless Justin explicitly approves the deploy action.
- Docs/doctrine/CI-config-only commits must not be treated as app deploys; production deploys stay on `.github/workflows/deploy.yml`, filtered pushes must not restart KVM1, and `workflow_dispatch` remains the manual replay path.
- ESPN must never log or display cookie values.
- Mock data must be clearly labeled and never presented as live fantasy advice.
- Account deletion stays hidden until UX copy + Justin approval are explicit.
