# 2026-07-03 - Phase 1.13 discrete fixes handoff

## Summary

Completed the Phase 1.13 discrete-fixes batch: Eagles `cultureTag` typo, appearance-picker alphabetization, font audit/P1 numeric-font fixes, duplicate-second-skin repair, and the `official`/`special` to War Room/Color Rush vocabulary bridge.

Branch note: this work was performed on the existing `frontend/phase1-13-mobile-qa-sweep` worktree because the tree was already dirty with Phase 1.13 remediation and design/brand docs. I did not switch branches or stash/revert user work. The prompt's target branch remains `frontend/phase1-13-discrete-fixes` for Justin to split if desired.

## Files changed by this task

- `frontend/src/data/nflTeams.js`
- `frontend/src/pages/Appearance.jsx`
- `frontend/src/pages/DraftAssistant.jsx`
- `frontend/src/pages/OmenOfTheWeek.jsx`
- `Blueprints/handoffs/2026-07-03-phase1-13-discrete-fixes-handoff.md`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/done/LEDGER.md`
- `Direction/decision_log.md`

Pre-existing dirty files before this task included `Blueprints/specs/omen-ux-ui-design-system-v1.md`, `Brand/brand-system.md`, `Direction/decision_log.md`, `Blueprints/prompts/codex-logo-suite-swap.md`, `Blueprints/prompts/codex-phase1-13-discrete-fixes.md`, and `logos/`. During closeout, `Blueprints/prompts/codex-transparent-lockup-composite.md` also appeared as unrelated untracked work. I did not edit the prompt/logo files.

## Fixes landed

- `Birds Gang` is now `Bird Gang` in the Eagles team entry. `rg -n "Birds Gang" frontend/src` returns zero matches.
- Appearance picker now uses a single `sortedTeams` list sorted by team `name`. Collapsed mode shows the existing marquee subset alphabetized; expanded mode shows all 32 teams alphabetized as one flat grid.
- Tailwind already had the required font aliases, including `mono: ['DM Mono', 'ui-monospace', 'monospace']`; no config change was needed.
- Confidence score numerals in `OmenOfTheWeek.jsx` and `DraftAssistant.jsx` now use `font-mono tabular-nums`; the Omen confidence label remains `font-sans`.
- `nflTeams.js` header now maps code vocabulary to doctrine vocabulary:
  - `mode: 'official'` = War Room primary skin
  - `mode: 'special'` = Color Rush alt skin
- Official-only teams are now marked with `TODO(colorway-spec-v1)` comments: Browns and Rams.

## Font audit

Hardcoded font-family audit:

- Command: `rg -n "font-family:" frontend/src --glob "*.jsx" --glob "*.css" --glob "!index.css"`
- Result: zero hits.

Tailwind font aliases:

- `sans` = Alegreya Sans
- `serif` = Alegreya
- `display` = Alegreya Sans
- `mono` = DM Mono

Spot checks:

- `OmenOfTheWeek.jsx`: P1 fixed. Main confidence percentage uses `font-mono tabular-nums`; confidence label remains sans.
- `DraftAssistant.jsx`: P1 fixed. Confidence percentage uses `font-mono tabular-nums`.
- `Standings.jsx`: already uses `font-mono tabular-nums` for rank, W-L, PF, PA.
- `LeagueStandings.jsx`: already uses `font-mono tabular-nums` for rank, W-L, PF.
- `MoveHistory.jsx`: already uses `font-mono tabular-nums` for season/week counts, record, effectiveness, and timestamps.
- `Appearance.jsx` swatches: already use `font-mono tabular-nums` for hex values.
- Landing/About/Onboarding body-copy check: Onboarding and Appearance long-form copy use `font-serif`; Landing and `/about` (`OmenLanding.jsx`) still have several marketing/body paragraphs without `font-serif`. I left those as P2 follow-up because they are broader landing-page typography polish, not the load-bearing score/data surfaces requested here.

UI audit note: the `/demo` screenshot still shows pre-existing low-contrast light-theme text in `OmenRecommendationView` outside the numeric-font change. I did not broaden this PR into a contrast/token sweep; flag as P1 follow-up if Justin wants `/demo` light-mode readability addressed now.

## Colorway audit

Method: inline CIE76 Delta E script comparing `official.colors[0].hex` to `special.colors[0].hex`, plus WCAG contrast against `#F5F0E8` for every nudged special primary.

Initial audit:

- 32 teams reviewed.
- 30 teams had a `mode: 'special'` palette.
- 2 teams were official-only: CLE, LAR.
- 23 special-primary pairs were below Delta E 15.

Nudged special primaries after repair:

| Team | New special primary | Delta E | Contrast vs `#F5F0E8` |
|---|---:|---:|---:|
| NE | `#274075` | 17.94 | 8.91 |
| NYJ | `#062017` | 26.98 | 15.09 |
| BAL | `#592899` | 16.79 | 8.46 |
| PIT | `#38404D` | 19.18 | 9.22 |
| HOU | `#0A1740` | 21.95 | 15.31 |
| IND | `#00145F` | 22.34 | 14.63 |
| JAX | `#006E63` | 18.70 | 5.43 |
| TEN | `#143A6B` | 16.01 | 10.02 |
| DEN | `#BF3303` | 20.02 | 5.02 |
| LV | `#2E2E33` | 16.63 | 11.91 |
| LAC | `#005F93` | 15.96 | 6.05 |
| NYG | `#103193` | 19.36 | 9.83 |
| PHI | `#003754` | 18.89 | 11.06 |
| WAS | `#841D1D` | 17.31 | 8.51 |
| CHI | `#162B52` | 15.90 | 12.33 |
| DET | `#005583` | 16.26 | 7.05 |
| GB | `#080D0B` | 19.95 | 17.26 |
| MIN | `#6731AB` | 16.83 | 7.11 |
| ATL | `#A72619` | 15.20 | 6.31 |
| CAR | `#006397` | 15.88 | 5.73 |
| ARI | `#972423` | 17.39 | 7.14 |
| SF | `#770000` | 22.78 | 10.37 |
| SEA | `#002F3F` | 16.25 | 12.52 |

All nudged palettes now clear Delta E 15 and 4.5:1 against bone text. A few near-black or bright-orange cases needed a stronger lightness nudge than the prompt's nominal 10-point example to clear both gates while staying in the same color family; no regional color or new palette identity was invented.

Still needing a real colorway spec author pass:

- Cleveland Browns
- Los Angeles Rams

## Visual evidence

Screenshots written locally:

- `.Codex/skills/run-slops-saloon/screenshots/phase1-13-discrete-fixes/demo-mobile.png`
- `.Codex/skills/run-slops-saloon/screenshots/phase1-13-discrete-fixes/draft-mobile.png`
- `.Codex/skills/run-slops-saloon/screenshots/phase1-13-discrete-fixes/appearance-attempt-mobile.png`

Notes:

- `/demo` was rendered with a local intercepted demo API payload because backend/Supabase state is not required for the font check.
- `/draft` rendered the public input state; no recommendation was generated in the local browser attempt.
- `/account/appearance` redirected to `/login`, as expected for a protected route without a Supabase session. Justin should verify the alphabetical picker and Eagles `Bird Gang` tile on an authenticated device/browser.

## Verification

- `npm --prefix frontend run build` - PASS. Existing Vite chunk-size warning and `.env NODE_ENV` warning remain.
- `npm test` - PASS, 401/401.
- `npm audit --audit-level=moderate` - PASS, 0 vulnerabilities.
- `git diff --check` - PASS.
- `rg -n "Birds Gang" frontend/src` - PASS, zero matches.
- Font-family bypass grep - PASS, zero hits outside `index.css`.
- Nudged colorway audit - PASS, 23/23 nudged special primaries now clear Delta E and contrast gates.
- Appearance alphabetical order script - PASS: expanded list count 32; first eight by team name are `49ers, Bears, Bengals, Bills, Broncos, Browns, Buccaneers, Cardinals`.

## Self-review verdicts

`slops-code-review`: mergeable, no P0/P1 in this diff. Scope stayed inside the named frontend/data files plus closeout docs; no package, env, SQL, auth, provider, or deploy surface changed.

`slops-ui-ux-audit`: no P0 from the requested changes. P1/P2 follow-ups are documented above: authenticated Appearance visual check still needed, `/demo` light-theme readability deserves a separate contrast pass, and landing/about long-copy typography can be handled in a broader typography polish task.

`slops-mobile-smoke`: proposal-only in this repo; no implemented driver to run. Substituted source verification plus local mobile screenshots for public routes.

## Skill receipt

- **Task:** Phase 1.13 discrete fixes - Bird Gang typo, alphabetize picker, font audit, duplicate-skin repair, naming-vocabulary docs.
- **Change type:** frontend user-visible behavior + data + docs.
- **Skills invoked:** `slops-repo-inspector`, `slops-git-flow`, `slops-quality-baseline`, `slops-code-review`, `slops-ui-ux-audit`, `slops-mobile-smoke` (proposal-only / substituted), `run-slops-saloon` (partial screenshot attempt).
- **Conditional skills considered but not applicable:** `slops-tdd` (no durable frontend test harness for this data/render-order slice; covered by source/script verification + build), `security-privacy-evidence` (no trust boundary or credential change), `demo-mode-pre-empty-state` (no fixture or mock/live behavior change), `slops-ship` (explicitly out of scope; deploy is Justin's gate).
- **Evidence:** this handoff, Delta E table above, font audit above, screenshots above, build/test/audit/diff-check results above.
- **Procedure gap found:** branch was already dirty on `frontend/phase1-13-mobile-qa-sweep`, so this was not cleanly isolated onto `frontend/phase1-13-discrete-fixes`; authenticated-route screenshots still need a sanctioned local session or Justin's logged-in browser/device.
