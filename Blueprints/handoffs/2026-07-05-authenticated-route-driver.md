# Generalized Authenticated-Route QA Driver Handoff

Date: 2026-07-05
Branch: `tooling/authenticated-route-driver`
Status: Complete locally; not pushed, merged, or deployed in this session

## What Changed

Closes a recurring gap: five prior phases (1.5d, 1.7, 1.8, 1.12, 2.18) each independently documented "no authenticated screenshot — Supabase sandbox limitation" as an unfixable known gap. It wasn't unfixable — the technique already existed in `.agents/skills/run-slops-saloon/driver_espn_recovery.cjs`, hardcoded to one page and undocumented outside that file.

- Added `.agents/skills/run-slops-saloon/lib/authBypass.cjs` — generalized auth-bypass primitives (fake Supabase session + `omen.onboarding.done` localStorage seed + `/api/*` mock registration), extracted from `driver_espn_recovery.cjs` with the onboarding-gate fix it was missing.
- Added `.agents/skills/run-slops-saloon/lib/driverKit.cjs` — shared CLI/bootstrap/assertion/summary scaffolding promoted out of the near-identical boilerplate across the 3 existing drivers.
- Added `.agents/skills/run-slops-saloon/driver_protected_route.cjs` — generic driver: any `ProtectedRoute`-gated route, any number of named states, each screenshotted in both light and dark mode via `page.emulateMedia()`.
- Added `.agents/skills/run-slops-saloon/routes/waiver.cjs` (fully built, 2 states: picks loaded, Yahoo-token-expired) and stub configs for `football.cjs`, `omen.cjs`, `standings.cjs`, `ledger.cjs` (1 minimal state each — proves the route renders past the auth/onboarding gate; full state coverage is future work).
- Rewrote `.agents/skills/run-slops-saloon/SKILL.md` to document all 4 drivers (previously only `driver.cjs` was documented), the auth-bypass technique, dark/light mode toggling, and fixed a stale pre-DBS path reference.
- Cross-referenced the fix in `Direction/known_issues.md` (new "Resolved Gaps" section) and `Blueprints/playbooks/omen-company-baseline.md` (Frontend change-type bundle) so future phases find this instead of re-documenting the gap.

No product code, dependency, `.env`/secrets, deploy, or SQL change. Playwright is already vendored (`playwright-core`, no new install).

## Discovered, Not Fixed (documented instead)

- `driver.cjs`'s H1 assertion (`Know the move`) is stale against `Landing.jsx`'s actual Phase 1.10B copy (`See the result before it happens.`, shipped 2026-06-25).
- `driver_espn_recovery.cjs` currently times out — it never seeds `omen.onboarding.done`, so `ProtectedRoute.jsx`'s onboarding gate (added after this driver was written) redirects it to `/onboarding` instead of `/account`. Confirmed by a direct debug run landing on the "Pick your look" onboarding step.

Both are pre-existing repo drift unrelated to this change (neither file was touched). Left as-is per this task's scope; the new generalized module fixes the root cause for any future route. Both documented in `known_issues.md` and `SKILL.md`.

## Verification

- Full `/waiver` smoke test against the real merged Phase 2.18 route (PR #81, `6cd554b`/`1818626`): `node .agents/skills/run-slops-saloon/driver_protected_route.cjs --route waiver` → 4/4 states pass (`picks_loaded-light/dark`, `token_expired-light/dark`), exit code 0.
- Visual spot-check: read `picks_loaded-light.png` and `picks_loaded-dark.png` directly — both render correctly, correct token-based light/dark theming, not blank.
- Regression check: `driver.cjs` and `driver_espn_recovery.cjs` run unchanged — both fail, but for pre-existing reasons unrelated to this branch (see above), confirmed via direct code inspection and a debug run, not guessed.
- Ran from a fresh `git worktree` (`.claude-worktrees/omen-tooling-authenticated-route-driver`) with `npm ci` at root and in `frontend/`, proving the driver works from a clean checkout, not just a pre-warmed shared directory.

## Known Gaps

- `routes/{football,omen,standings,ledger}.cjs` are minimal 1-state stubs, not full state coverage. Future phases touching those pages should add more states as needed.
- No `npm test` change (nothing under `test/` was touched — this is QA tooling, not application behavior).

## Next Step

None blocking. Any future frontend phase needing authenticated screenshot evidence should use `driver_protected_route.cjs` per the new `SKILL.md` section rather than documenting a known gap.
