# Phase 4 Follow-Up — Team Theme Depth Fix

**Date:** 2026-07-11  
**For:** Claude Code or Codex in `slops-saloon/omen/`  
**Trigger:** Justin wants the design-system rework to feel professional, not like every team skin floods the app with one dominant color.  
**Do not deploy. Do not push.**

## Read First

1. `AGENTS.md`
2. `Direction/reviews/2026-07-11-phase4-design-system-verification.md`
3. `Blueprints/audits/2026-07-10-app-wide-ux-audit.md`
4. `Blueprints/specs/design/team-theme-contract-v1.md`
5. `Blueprints/audits/2026-07-10-team-theme-contract-verification.md`
6. `frontend/src/lib/themeMode.js`
7. `frontend/src/data/nflTeams.js`
8. `frontend/src/index.css`
9. `frontend/src/components/theme/AppearancePicker.jsx`
10. `frontend/src/pages/Appearance.jsx`

## Goal

Fix the post-Phase-3 team-theme depth issue found in Phase 4 verification:

- Commanders and Packers are more legible than before, but still too color-drenched.
- Team mode should feel like Omen wearing a team uniform, not the whole app dipped in the team's primary color.
- Keep the three-switch model and current component primitives.
- Do not redesign pages.
- Do not touch backend, secrets, deploy config, SQL, Stripe, Supabase migrations, or package files.

## Product Direction

Use this interpretation unless Justin overrides it:

**Omen shell first, team presence second.**

Team color may tint the shell, cards, borders, and active states, but it must not dominate the whole viewport. The app should still feel like Omen across every team.

## Scope

Allowed files:

- `frontend/src/lib/themeMode.js`
- `frontend/src/data/nflTeams.js`
- `frontend/src/index.css`
- `frontend/src/components/theme/AppearancePicker.jsx`
- `frontend/src/pages/Appearance.jsx`
- Small frontend tests or scripts if an existing pattern exists
- A verification note under `Direction/reviews/`

Out of scope:

- `/omen` live/off-season 500 behavior. That is a separate follow-up.
- Marketing page redesign.
- Package installs.
- Deployment/push/PR creation.
- Supabase persistence or migrations.

## Acceptance Criteria

1. **Commanders no longer reads as all-burgundy.**
   - `/trade`, `/football`, `/account/appearance`, and `/omen` must show a clear neutral Omen base with burgundy/gold team presence.
   - Cards must be visibly distinct from shell.
   - Text remains AA-readable.

2. **Packers no longer reads as all-green.**
   - Same route set as above.
   - Green should be present, not all-consuming.

3. **Dolphins remains clean in light mode.**
   - Do not regress the light shell.
   - Aqua accents must remain readable and not collide with Omen signal semantics.

4. **Chiefs and Steelers remain stable.**
   - Chiefs should not turn into a risk/error-looking surface.
   - Steelers should not collapse into base Omen with no team presence.

5. **Baseline Omen mode remains unchanged.**
   - Omen dark mode should still use Raven/Charcoal/Aged Brass.

6. **No horizontal overflow or render crash.**
   - Verify desktop and at least one mobile viewport.

## Implementation Guidance

Start by reducing depth, not by replacing the system.

Recommended approach:

1. Add a room-depth scalar in `themeMode.js`.
   - Owner routes (`/omen`) should be subtle.
   - GM/tool routes (`/trade`, `/about`) should be moderate.
   - Locker/dashboard routes (`/football`, `/draft`, `/waiver`, `/standings`, `/ledger`, `/account/*`) can be deeper, but still restrained.

2. Stop writing full team primary directly into `--color-bg`.
   - Instead mix the team color over the Omen base shell.
   - Dark team shell target should stay visually close to Omen graphite.
   - Light team shell target should stay close to warm cream.

3. Make card surfaces less saturated than the shell.
   - Cards should read as stable surfaces first, team-tinted second.
   - For Commanders and Packers, card-vs-shell distinction matters more than color purity.

4. Preserve semantic colors.
   - Do not override risk, data-source, platform, or position colors.
   - Position chips should continue to look like position chips under every team.

5. Keep accent cascade.
   - If primary fails contrast, use secondary.
   - If secondary collides or fails, use a readable fallback.

6. Do not make this a page-by-page CSS hack.
   - Fix token resolution and page-family depth centrally.

## Suggested Token Targets

These are starting points, not doctrine:

- Owner/Omen: `team alpha <= 5%`
- GM/Trade: `team alpha 8-12%`
- Locker/Dashboard: `team alpha 14-20%`

The previous 25-40% locker target is too strong for Justin's current visual concern.

## Verification Matrix

Run a Chrome/Chromium walkthrough after the change.

Skins:

- Baseline Omen
- Washington Commanders
- Miami Dolphins
- Green Bay Packers
- Kansas City Chiefs
- Pittsburgh Steelers

Routes:

- `/trade`
- `/football`
- `/account/appearance`
- `/omen`
- `/waiver`
- `/`

Capture screenshots under:

```text
output/phase4-team-depth-fix/
```

Write a short review note under:

```text
Direction/reviews/YYYY-MM-DD-phase4-team-depth-fix-verification.md
```

The note must include:

- Before/after summary against `Direction/reviews/2026-07-11-phase4-design-system-verification.md`
- Screenshot artifact paths
- Token summary for the five stress teams
- Any remaining P1/P2 findings

## Required Checks

Run at minimum:

```text
cd frontend && npm run build
npm test
git diff --check
```

If full `npm test` is not practical, explain why and run focused frontend/theme tests plus the browser matrix.

## Completion Report

Return:

- Files changed
- Screenshots captured
- Tests run
- Whether Commanders/Packers now pass the founder visual concern
- Remaining risks
- Confirmation: no deploy, no push
