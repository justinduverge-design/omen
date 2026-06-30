# Phase 1.7 Platform Brand Color Emphasis Handoff

Date: 2026-06-30
Owner: Claude, frontend-lean implementation under lane-agnostic Omen loop
Status: Complete locally. Not pushed, merged, or deployed.

## Summary

Replaced the ad-hoc, inconsistent platform-color treatment (literal gold buttons everywhere, inaccurate inline icon colors) with a sourced, contrast-verified Sleeper/Yahoo/ESPN brand-color system applied consistently across every site the spec named: `/account/connect` platform icons + primary Connect buttons, `/account` connect-row Connect buttons, and the `/standings` + embedded `/football` platform badges. Button shape/size were already unified before this phase via shared `CTAButton`/`AccentButton` components — this phase changed color only.

## Files Changed

- `frontend/src/index.css` (new `--color-platform-*` tokens, `:root` + both theme blocks)
- `frontend/src/lib/platformChip.js` (new shared helper)
- `frontend/src/pages/ConnectLeague.jsx`
- `frontend/src/components/platforms/PlatformConnections.jsx`
- `frontend/src/pages/Standings.jsx`
- `frontend/src/components/league/LeagueStandings.jsx`
- `Blueprints/specs/page-system.md`
- `Direction/agent_inbox.md`
- `Direction/current_sprint.md`
- `Direction/sprints_completed.md`
- `Direction/decision_log.md`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/done/LEDGER.md`
- `Blueprints/handoffs/2026-06-30-phase1-7-platform-brand-colors-handoff.md` (this file)

## Behavior

- `platformChipStyle(platform)` returns a tinted-badge style (border + 14% tint background + colored text) — used for the small platform icon on `/account/connect` and the platform badge on `/standings` + the embedded `/football` standings widget.
- `platformButtonStyle(platform)` returns a solid-fill style (brand background + per-theme on-color) — used only on the primary "Connect Sleeper/Yahoo/ESPN" action buttons. Secondary actions (Disconnect, Reconnect, Cancel, Switch league's "Cancel" state) intentionally stay neutral ghost-style.
- The green "Connected" success badge intentionally stays universal green (not platform-colored), matching the existing data-live/success convention elsewhere in the app.
- Unknown/non-platform inputs (e.g. ConnectLeague's "Manual Entry" card) fall back to neutral gray styling rather than crashing.

## Color Sourcing and Confidence

- **Yahoo `#410093`** — sourced from multiple independent public brand-color references. High confidence.
- **ESPN** — public references cite `#E52534` (Pantone Red 032C) as the brand red. Deepened to `#C81E2C` for both themes: the lighter value only cleared 4.5:1 white-text AA contrast by ~0.02 once paired with this app's actual off-white text token (`#F5F0E8`), too thin a margin to ship.
- **Sleeper** — no confirmed official hex found anywhere via public brand-color databases (checked color-hex.com, brandcolorcode.com, schemecolor.com, brandfetch.com, and direct site fetch attempts). Kept the pre-existing approximate blue (`#1FA3E8` dark / `#0E6FB3` light deepened for AA). **Flagging for Justin — correct this if he has Sleeper's actual brand kit.**
- Dark-theme-only `-chip` overrides (`#A080C9` for Yahoo, `#F2929A` for ESPN) exist because both brand hues are too low-luminance to read as small text directly on the near-black dark surface — verified by hand-computing WCAG relative luminance/contrast for every button-fill+on-color and badge-text+surface pairing in both themes, not just copying brand hex into the UI. Full numbers are in `Direction/decision_log.md` (2026-06-30 entries) and `Blueprints/specs/page-system.md`.

## Contract Changes

None. Pure CSS/JSX styling change — no endpoint, request, response, env, SQL, package, auth, provider, or deploy behavior changed.

## Verification

- `npm --prefix frontend run build` → clean.
- `npm test` (root) → 398/399. The 1 failure (`test/deployHardening.test.js`) is a pre-existing CRLF line-ending mismatch against `.github/workflows/deploy.yml`, already documented as pre-existing in the 2026-06-29 Phase 2.17-follow-up decision-log entry; reproduced again here in isolation against a file this diff never touches. Spun off as its own background-task suggestion rather than fixed under this phase.
- `npm audit --audit-level=moderate` → 0 vulnerabilities.
- `git diff --check` → clean.
- Browser computed-style check (`getComputedStyle` against `:root[data-theme]` via `preview_eval`) confirmed all 8 new CSS custom properties resolve to the intended hex in both themes.
- Self-administered `slops-code-review`: verdict merge, no P0/P1. P2s: the pre-existing 36px `AccentButton` touch target (out of scope — shape unchanged this phase) and two coexisting hover mechanisms now in `PlatformConnections.jsx` (legacy JS handlers for the default gold path, a new `hover:brightness-110` Tailwind class for the platform-colored path) — functionally fine, flagged for a future unification pass.
- Self-administered `slops-ui-ux-audit`: ready to ship pending the Sleeper-hex confidence gap above.
- `ui-ux-pro-max` was named as the spec's guardrail skill but has no actual real-world brand-color database in its domain searches — substituted `WebSearch`/`WebFetch` against public brand-color references. Flagged as a routing gap (see skill-usage-ledger).
- `slops-mobile-smoke` is proposal-only (v0.1.0, "driver not yet implemented" per its own SKILL.md) — substituted a manual `/login` mobile-viewport (375×812) overflow + console-error check (clean) since all four touched routes are auth-gated.

## Visual QA Limitation

Could not get a live authenticated screenshot of `/account/connect`, `/account`, or `/standings` in this sandbox: `frontend/src/lib/supabase.js`'s `getSession()` hangs with no reachable Supabase backend (same root cause documented in the Phase 1.5d handoff). Did not spoof credentials. Mitigated via the browser computed-style check above, which confirms the underlying CSS token layer is correct even though the rendered component screenshots are unavailable. This is now a recurring gap across at least five phases (1.5d, 1.10B, 2.7, 2.10, 1.7) — flagged as its own background-task suggestion for a sanctioned dev-only test-session fixture.

## Skill Receipt

Task: Phase 1.7 Platform brand color emphasis + button-style consistency.

Change type: Frontend user-visible behavior (color/token only) + sprint/spec documentation.

Skills invoked: `ui-ux-pro-max` (no usable result — see gap above), `WebSearch`/`WebFetch` (brand-color sourcing), `slops-ui-ux-audit`, `slops-mobile-smoke` (proposal-only, no driver), `slops-code-review`, `slops-quality-baseline`.

Conditional skills considered but not applicable: `slops-ux-copy` (no copy/words changed), `slops-tdd` (pure visual/token change, no testable behavior contract — consistent with the untested `lib/positionChip.js` precedent this phase mirrors), `security-privacy-evidence` (no trust-boundary/auth/credential change), `slops-ship`/`slops-canary` (no merge/deploy this session), `demo-mode-pre-empty-state` (no demo/mock fixture behavior changed).

Evidence: build/test/audit/diff-check results above, computed-style verification, `page-system.md` color table, `decision_log.md` contrast-math rationale.

Procedure gap found: (1) `ui-ux-pro-max` has no real brand-color lookup despite being named as this phase's guardrail — routing gap for `slops-skill-author`/`skill-activation-runbook.md` to address. (2) The authenticated-screenshot gap above is now recurring across five phases — worth a dedicated fix rather than re-documenting each time.
