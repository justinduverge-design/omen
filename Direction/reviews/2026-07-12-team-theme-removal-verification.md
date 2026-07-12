# Team Theme Removal — Verification

**Date:** 2026-07-12
**Branch:** `claude/team-theme-removal` (fresh off `origin/main` @ `8edec5e`)
**Scope:** Full removal of team-based repainting, cultural-moment chrome, motifs, and type flourishes. Not deployed, not pushed, not merged.

## Context

`origin/main` and local `main` had diverged (7 local-only commits vs. 17 origin-only, including PR #113 merged same-day 2026-07-12 with founder-attributed card-fill contrast work). Per instruction, branched fresh off `origin/main`, not local `main`. Justin confirmed twice, after being shown that PR #113 landed today, that full removal (not the depth-fix prompt) was intended.

## What was removed

- `frontend/src/lib/teamTemplate.js`, `culturalMoments.js`, `motifs.js`, `typeFlourishes.js`, `useActiveMoment.js`
- `frontend/src/components/layout/MomentChrome.jsx`
- `frontend/src/components/theme/AppearancePicker.jsx` (+ the now-empty `components/theme/` dir)
- `frontend/src/pages/Appearance.jsx` and the `/account/appearance` route
- Team mode ('team'), team/variant persistence, and all team-token CSS writing in `frontend/src/lib/themeMode.js` — reduced to a `system | omen` light/dark store only
- "Appearance" nav entries in `Header.jsx` and `Account.jsx`; the Onboarding "Pick your look" team-selection step (Onboarding is now Welcome → Connect → Complete)
- Cultural-anchor / moment citation lines in `Footer.jsx`
- `test/teamCulturalMoments.test.mjs`, `test/teamMotifs.test.mjs`, `test/teamTypeFlourishes.test.mjs` (tested the deleted feature directly)

## What was intentionally kept

- `frontend/src/data/nflTeams.js` — team identity data (name/abbr/division/cry/wardRoom/palettes) is untouched. Several pages (Standings, Football, DraftAssistant, OmenPage, TradeAnalyzer, MoveHistory) still call `useTheme()` and gate a "team voice" string on `mode === 'team'`; since that mode no longer exists, these branches now permanently resolve to `null`/inert. Functionally correct (no team voice ever renders) but not line-deleted — flagged as follow-up cleanup, not done in this pass.
- The `--color-team-*` CSS custom properties in `index.css` remain defined as **static** Omen-brass values (unchanged by team selection now). ~15 pages reference `var(--color-team-accent)` etc. as a general accent/focus-ring color; renaming every one of those references to `--color-accent` was out of scope for this pass. They resolve correctly today, just under a name that still says "team."
- `profiles.favorite_team` backend column / `PATCH /api/account/preferences` — untouched (backend, out of scope); frontend no longer writes to it from anywhere.

## Checks run

- `cd frontend && npm run build` — succeeds. One pre-existing (not introduced by this change) duplicate-`className` esbuild warning in `Header.jsx` lines 296-297, confirmed via `git diff origin/main` to predate this branch.
- `npm test` (backend/Node suite — frontend has no test script) — 415/415 passing after removing the three team-theme-only test files.
- `git diff --check` — clean.
- Browser pass (Vite dev server, no backend running): `/`, `/trade`, `/draft`, `/about` render with no console errors; `/account/appearance` falls through cleanly to `NotFound` (no crash); Draft Assistant preview mode renders (network errors seen are the backend not being up in this sandbox, unrelated).

## Remaining risk / follow-up

- Dead-but-inert `mode === 'team'` branches across ~8 pages (see above) — safe, but real cleanup would delete the inert code, not just leave it unreachable.
- `--color-team-*` token names still say "team" despite being static Omen values now — a full rename sweep across ~15 files was out of scope for this pass.
- Not verified against a running backend/auth session (no Supabase credentials in this sandbox) — protected routes (`/football`, `/account`, `/omen`) were not visually walked authenticated.
