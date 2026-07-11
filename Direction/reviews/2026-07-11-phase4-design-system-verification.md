# Phase 4 Design-System Verification

**Date:** 2026-07-11  
**Scope:** Post-Phase-3 Chrome/Chromium walkthrough of the design-system sweep.  
**Target:** Local Vite app on QA port `5174`, started with fake Supabase auth env for protected-route verification.  
**Baseline compared against:** `Blueprints/audits/2026-07-10-app-wide-ux-audit.md` drift catalog + `Blueprints/audits/2026-07-10-team-theme-contract-verification.md`.  
**Evidence artifacts:** `output/phase4-design-verification-core/phase4-core-results.json` and screenshots in `output/phase4-design-verification-core/`.

## Routes And Skins Checked

Routes:

- `/`
- `/about`
- `/trade`
- `/football`
- `/account/appearance`
- `/omen`
- `/waiver`

Skins:

- Baseline Omen
- Washington Commanders
- Miami Dolphins
- Green Bay Packers
- Kansas City Chiefs
- Pittsburgh Steelers

Notes:

- Protected routes used fake local Supabase session storage plus mocked API responses. No real user account, cookies, provider data, or production backend was touched.
- A first wide 13-route matrix also produced partial screenshots under `output/phase4-design-verification-auth/`, but the focused matrix above is the authoritative pass because it completed cleanly.

## Verdict

**Phase 3 component sweep: mostly verified.** The app now has the locked primitives visible across core product routes: Button, Card, PageHero, SegmentedControl, TabNav, Alert, Chip, and Input patterns are materially more consistent than the Phase 1 audit baseline.

**Team-theme problem: improved but not fully solved.** The old Commanders failure is less broken because cards, inputs, and borders are distinguishable, but the app still becomes a deeply saturated team shell in Team mode. If Justin's desired direction is "professional Omen shell with team presence," this still feels too color-drenched on Commanders and Packers. If the chosen doctrine is "phone wears the uniform," the current result is closer, but it needs page-family depth controls before it feels refined.

## What Improved From The Drift Catalog

| Phase 1 drift item | Phase 4 result |
|---|---|
| Button treatments split across many styles | Mostly resolved on checked routes. Primary, secondary, link-style, and small action buttons now use canonical Button styling. |
| Inputs inconsistent across `/trade`, `/draft`, `/waiver` | Improved. Checked product inputs now share the canonical input/button scale and token language. |
| Filled-pill segmented controls differed by page | Improved. `/trade` and `/football` product controls now read as one family; `/football` view nav remains a proper TabNav, not a form segmented control. |
| `/waiver` had no PageHero | Fixed. `/waiver` now renders `WAIVER / Waiver Wire / VORP-ranked pickups for your roster.` |
| Recovery/error affordances split by route | Partially improved. Canonical error card and retry button are present on `/omen`; other checked empty/error surfaces no longer showed raw unstyled failure states. |
| Landing hero local glyph glitch | Not reproduced in the focused pass. `/` rendered `See the result before it happens.` cleanly. |
| Header treatments split across product pages | Improved in AppLayout routes via shared header lockup. Public marketing routes still keep bespoke marketing layout by design. |

## Findings

### P1 — Team shells still feel over-saturated on dark primary teams

Evidence:

- `output/phase4-design-verification-core/was-commanders__trade.png`
- `output/phase4-design-verification-core/was-commanders__appearance.png`
- `output/phase4-design-verification-core/gb-packers__football.png`

The Commanders screen no longer loses all card boundaries, but the overall view is still almost entirely burgundy. Packers is readable, but the whole product becomes a dark green room with yellow accent. That may satisfy the later "team color goes deep" doctrine, but it does not satisfy Justin's original concern that the app should feel professional and not become a one-color wash.

Recommendation:

- Keep team shell depth, but reduce it by route family. Owner/Omen pages should be much closer to Omen neutral; Trade/GM pages moderate; dashboard/locker pages deepest.
- Add an automated or scriptable visual/token check for `--color-bg`, `--color-surface-1`, `--color-border`, and `--color-accent` per stress team.

### P1 — `/omen` still fetches live Omen and shows `Request failed: 500` in this QA path

Evidence:

- `output/phase4-design-verification-core/baseline-omen__omen.png`
- `output/phase4-design-verification-core/phase4-core-results.json`

In the mocked off-season summary path, `/omen` still calls `POST /api/omen/mvp-move` twice and renders `Failed to load Omen of the Week / Request failed: 500`. This is not raw backend JSON, and the error card is styled, but it is still the old duplicate-local-500 pattern from the Phase 1 audit.

Recommendation:

- Confirm whether `/omen` should short-circuit on dashboard `off_season` before calling the live route.
- If it should call anyway, mock/test the expected off-season response shape and ensure the visible copy says off-season rather than failed request.

### P2 — `/trade` still has no route-level PageHero

Evidence:

- `output/phase4-design-verification-core/baseline-omen__trade.png`
- `output/phase4-design-verification-core/was-commanders__trade.png`

This was explicitly left as a tool-shaped layout choice during Phase 3. The result is usable, but compared with `/football`, `/waiver`, and `/account/appearance`, `/trade` still starts abruptly with the scoring/deal-shape controls.

Recommendation:

- Decide whether `/trade` is exempt from PageHero because it is the primary workbench, or add a compact GM Suite hero.

### P2 — Chiefs `/about` capture was inconclusive due local browser resource exhaustion

Evidence:

- `output/phase4-design-verification-core/kc-chiefs__about.png`
- Browser error: `net::ERR_NO_BUFFER_SPACE`

The route rendered correctly for every other checked skin and the error was a local Chromium resource error during the matrix run, not a React exception. Treat as inconclusive, not a product failure.

Recommendation:

- Re-run just `/about` under Chiefs in the next browser pass if this report is used as a merge gate.

## Stress-Team Token Summary

Observed computed tokens in the focused pass:

| Skin | Theme | `--color-bg` | `--color-surface-1` | `--color-accent` | Visual read |
|---|---|---|---|---|---|
| Omen | dark | `#0A0A0B` | `#1C1C1E` | `#A67C2E` | Clean baseline. |
| Commanders | dark | `#5A1414` | `color-mix(... #5A1414 92%, white)` | `#FFB612` | Readable, but very burgundy. |
| Dolphins | light | `#FDF8F2` | `color-mix(... #FDF8F2 96%, white)` | `#008E97` | Clean light shell; least concerning. |
| Packers | dark | `#203731` | `color-mix(... #203731 92%, white)` | `#FFB612` | Readable, but still heavy green wash. |
| Chiefs | light | `#FFFFFF` | `color-mix(... #FFFFFF 96%, white)` | `#E31837` | Clean on checked routes; `/about` capture inconclusive. |
| Steelers | dark | `#101820` | `color-mix(... #101820 92%, white)` | `#FFB612` | Closest to Omen neutral; reads professional. |

## Optional Doc-Hygiene Follow-Ups

Not touched in this verification pass:

- Sweep `page-system.md` to reference `component-lock-v1.md` for component vocab.
- Fix `Blueprints/design.md` self-referential redirect.
- Replace line-number citations in `team-motif-grammar.md` with section-name citations.
- Delete or author `Blueprints/specs/brand-identity-digital-marketing.spec.md` if it is still an empty L0 file.

Recommended routing:

- Treat these as small doc-only PRs after the visual verification decision is made.

## Closeout

Phase 4 should not be called a clean pass yet. It is a useful verification pass with a clear result:

- Component consistency: **pass with small follow-ups**.
- Team-theme quality: **hold for product/design decision**.
- `/omen` off-season/local failure behavior: **needs follow-up**.
- No deploy performed.
