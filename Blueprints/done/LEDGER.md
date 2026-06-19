# Done Ledger

**Purpose:** every closure recorded. Review monthly — gates skipped often signal a prompt or skill to revisit.

## How to use

When you close a task, append a row. Format:

```
| Date | Item | Done docs applied | Gates skipped + why | Skill/prompt to revisit |
|---|---|---|---|---|
| 2026-06-15 | Phase 1.3 — page-system spec | feature, design | none | — |
```

If you skip a gate, write why. If the same gate gets skipped 3+ times across different tasks, that's a signal — either the gate is wrong (fix the gate), the agent doesn't know how to satisfy it (fix the prompt or skill), or the work is being mis-scoped (fix the planning).

## Active log

| Date | Item | Done docs applied | Gates skipped + why | Skill/prompt to revisit |
|---|---|---|---|---|
| 2026-06-15 | Phase 1.3 — page-system spec | feature, design | n/a — spec authoring, not feature ship | — |
| 2026-06-15 | RESOURCES_INDEX + facts-of-record at L0/L1/L2 + L1 strategy promotion | feature (doctrine) | content-marketing-done deferred to live posts | — |
| 2026-06-15 | Phase 1.4 — font system propagation fix | page, design | repo-local run-slops driver gate skipped: driver expects stale Trade Analyzer CTA text (`Run Your Trade`); replaced with targeted browser QA for 1.4 scope | run-slops-saloon driver |
| 2026-06-16 | Phase 1.5 PR1 — team-theming system core | page, design | Light/dark screenshots captured 2026-06-18 against production (slopssaloon.com) in System mode. Dark: ss_1136kzazq (Appearance), ss_0749j1qzm (Football), ss_3369f09zy (Omen), ss_35349udgx (Ledger), ss_9073a9wh0 (Standings), ss_5406mmemw (Trade), ss_0514so4h0 (Draft), ss_2780hdtgo (Account). Light: ss_553519qae (Appearance), ss_5798xmros (Football), ss_9525oi13u (Omen), ss_78836a3gv (Ledger), ss_7036jh17j (Standings), ss_52456s6z0 (Trade), ss_4918b8aov (Draft), ss_6975f2eip (Account). `slops-ui-ux-audit` run inline (no P0 remaining after 9e3a58c). | — |
| 2026-06-17 | Official-color-first accent policy — 5 `colorRush` teams (NE, NYJ, CLE, TEN, LAC) flipped to `accent: primary` | design | `slops-ui-ux-audit` skipped (unavailable in sandbox) — substituted with a direct WCAG contrast recompute for all 14 previously-swapped teams (table in audit doc's 2026-06-17 changelog), every one clears AA/AA-large. Light/dark screenshots skipped — data-only token change, no new page surface. 9 `secondary`-scheme teams left unflipped, open decision logged for Justin. Merged via PR #47. | `slops-ui-ux-audit` |
| 2026-06-18 | Phase 1.5b — onboarding PickLookStep (PR #46) | page, design | AppearancePicker component extracted; PickLookStep renders same component as /account/appearance. Light/dark screenshots at /account/appearance serve as visual evidence (see PR1 row). P0 none. P1: Onboarding.jsx CTA buttons use color: '#0A0A0B' — design system gap, no --color-text-on-accent token; flagged for design system v2. Build: node unavailable in agent context (agent tmp-fs full), syntax verified by read + git diff --check. | `slops-ui-ux-audit` (onboarding PickLookStep dark mode — Team mode is always dark; System/Corvus light captured via /account/appearance) |
| 2026-06-18 | Phase 1.5c — voice extension Ledger/Draft/Trade (PR #47) | page, design | EmptyHistory wardRoom line (Ledger empty state) verified in dark mode: renders correctly in Team mode. Light mode: ss_78836a3gv (Ledger light), ss_52456s6z0 (Trade light), ss_4918b8aov (Draft light). P0 resolved: MoveHistory.jsx #4ade80/#f87171 → var(--color-risk-low)/var(--color-risk-high) with color-mix() alpha variants (commit 9e3a58c). `slops-ui-ux-audit` no P0 remaining. | — |
| 2026-06-18 | Phase 2.5 — proprietary ADP weighting service | feature, recommendation | UI/loading/mobile/nav gates N/A: backend scoring primitive and additive ADP response only. Final recommendation confidence/risk/save gates remain owned by the Draft Assistant recommendation route; this change supplies labeled consensus evidence, not a standalone recommendation. Security Done not triggered: no DB query, RLS, service-role, auth, secret, credential, or dependency change. Evidence: implementation `d04c535`; focused tests 10/10; full tests 297/297; review `Blueprints/audits/2026-06-18-phase2-5-adp-weighting-code-review.md`. | — |
| 2026-06-18 | Root dev-tool advisory remediation | security | Auth/data/secret/RLS/Sentry gates N/A: dependency-only change to the `promptfoo` dev tree. No runtime dependency declaration or app behavior changed. Evidence: commit `2acb663`; full + production audits 0; local + fresh-clone tests 297/297; fresh-clone `npm ci` clean; review `Blueprints/audits/2026-06-18-dev-tool-advisory-remediation-code-review.md`. | — |
| 2026-06-19 | Phase 2.6 — math engine parameterized | feature, recommendation, release | UI/loading/mobile/nav/save gates N/A: pure backend scoring primitives only, with no route or response-envelope change. Existing recommendation confidence/risk/evidence contracts remain unchanged; this phase changes math only when an approved consumer supplies config. Production config loader intentionally out of scope because Phase 1.4 schema remains review-only. Release gates 7/8/13 were not independently rerun: the change has no auth/UI/Sentry surface, existing Tier-2 baseline remains 13/13, and this session had no KVM shell or Sentry dashboard access; workflow container/log and public readiness checks passed. Rollback: revert squash merge `93e1a71` through a PR to rebuild/redeploy the prior source. Evidence: implementation `798ad4e`; merge `93e1a71`; deploy run `27834697621`; focused tests 30/30; full tests 307/307; review `Blueprints/audits/2026-06-19-phase2-6-math-engine-code-review.md`; production health/ready/homepage smoke passed. | Release checklist should distinguish code-path smoke from auth/dashboard/infrastructure-owner checks. |
| 2026-06-19 | Phase 2.7 — Demo Mode backend | feature, recommendation | UI/loading/mobile/nav gates deferred to the separately queued frontend `/demo` item. Save-to-Move-History is intentionally disabled for sample recommendations; demo never writes user evidence or mixes with live data. Security Done not triggered: public read-only fixture route accepts no input and touches no auth, user data, database, provider credential, secret, or dependency. Evidence: implementation `e966a0a`; focused tests 5/5; full tests 312/312; audit 0; review `Blueprints/audits/2026-06-19-phase2-7-demo-mode-code-review.md`. | Layer 0 shared `demo-mode` pattern remains a separately gated post-proof harvest. |

## Monthly review

On the first of each month, scan the previous month's rows. Look for:

- Same gate skipped repeatedly → fix gate, prompt, or skill
- Same Done doc applied without others that should have applied → fix the routing rule in `definition-of-done.md`
- New patterns of "why skipped" → consider new done-file or merge existing
