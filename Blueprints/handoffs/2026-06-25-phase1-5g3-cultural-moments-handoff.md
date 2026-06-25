# Phase 1.5g.3 — CulturalMoment schema + DET / NO / GB moments — Handoff

**Date:** 2026-06-25
**Branch:** `claude/corvus-kickoff-2gz8am` (draft PR; not merged, not deployed)
**Agent:** Claude (frontend)
**Closes:** the Phase 1.5g motif-grammar arc (motifs 1.5g.1 + typeFlourishes 1.5g.2 + culturalMoments 1.5g.3)
**Spec:** `Blueprints/specs/team-motif-grammar.md` §CulturalMoment + §Sprint split row 1.5g.3

## What shipped

A per-team **cultural-moment** layer: a bounded-calendar eyebrow (+ optional surface tint + footer citation) that paints only on chrome routes, only in mock mode, never on the Omen card or Trade result.

- **DET — Thanksgiving Classic.** `date-list` (2026-11-26, 2027-11-25). Scope app/account/ledger/standings/football. Eyebrow color `neutral` (Game White / Diner Cream — Lions Silver fails contrast on Honolulu Blue). No tint.
- **NO — Mardi Gras week.** `date-range` 02-08 → 02-25. Scope app + account. Eyebrow `secondary` + `tertiary` surface tint @0.12. Eyebrow/tint roles exist on the **Mardi Gras Special** palette, so the moment rides with that variant; on the Official palette the roles are absent and the moment gracefully suppresses.
- **GB — Lambeau, manually painted.** `manual-flag` via `localStorage['omen.theme.moments']['gb-lambeau-tundra']`. Scope app + account + football. No weather claim (honest about manual activation).

## New / changed files

| File | Role |
|---|---|
| `frontend/src/lib/dataMode.js` | **New.** Route-level mock/live indicator (spec prerequisite). `setDataMode`/`getDataMode`/`useDataMode`/`subscribeDataMode`. Canonical global `window.__omenDataMode`; `__corvusDataMode` is a read alias (Justin's call this session). Default `null` → fail closed. |
| `frontend/src/lib/culturalMoments.js` | **New.** `resolveActiveMoments(team, {now,dataMode,route,variant,devOverrideId})` — fail-closed, scope-filtered, activation rules, palette role→hex, tint-route policy. `scopesForRoute`, `routeAllowsTint`, `readMomentOverride`. |
| `frontend/src/data/nflCalendar.js` | **New.** Hand-curated `date-list` ISO strings (`MOMENT_DATES`). Justin-owned; audited pre-season. |
| `frontend/src/lib/useActiveMoment.js` | **New.** Shared hook so MomentChrome + Footer agree. |
| `frontend/src/components/layout/MomentChrome.jsx` | **New.** Sibling of `<main>` in AppLayout. Eyebrow + mandatory mock badge (reuses `MockBanner`); drives the tint via `applyMomentOverlay`. |
| `frontend/src/data/nflTeams.js` | `culturalMoments: []` added to DET / GB / NO; imports `MOMENT_DATES`. |
| `frontend/src/lib/themeMode.js` | `MOMENT_VARS`, `applyMomentOverlay()`, `clearMomentTokens()` (wired into `clearTeamTokens`). |
| `frontend/src/index.css` | Moment var defaults, `[data-moment-active] [data-moment-target='page-surface']` `color-mix` tint, `.moment-eyebrow` utility. |
| `frontend/src/components/layout/AppLayout.jsx` | Renders `<MomentChrome>`; adds `data-moment-target="page-surface"`. |
| `frontend/src/components/layout/Footer.jsx` | Appends moment citation (never replaces the anchor). |
| `frontend/src/components/moves/MoveHistory.jsx` | Optional `onDataState` callback (Ledger passes it; Football's history tab does not). |
| `frontend/src/pages/{Football,Standings,Ledger,Account,Appearance}.jsx` | Declare `setDataMode` from existing connected/empty state. |
| `frontend/scripts/contrast-sweep.mjs` | Eyebrow + post-tint-body cells; `mixHex` helper; moment column. |

## Discipline (how the fail-closed gate works)

- **Live data is never decorated.** `resolveActiveMoments` returns `[]` unless `dataMode === 'mock'`. Pages set `mock` only when showing preview/disconnected/empty/off-season state; connected live data → `live`; everything unset → `null` → suppressed.
- **Recommendation surfaces are off-limits.** `/omen` and `/trade` map to an empty scope set; the schema validator also forbids `omen`/`trade` in any moment `scope`.
- **Tint is route-limited** to `/account`, `/football`, `/ledger` per the page-system Motif/Moment posture; `/account/appearance` and `/standings` are eyebrow-only (preview swatches / W-L columns stay neutral).
- **Eyebrow + badge are atomic** — they render together or not at all.

## Verification

- `node --test test/teamCulturalMoments.test.mjs` → **11/11**.
- `node --test test/teamMotifs.test.mjs test/teamTypeFlourishes.test.mjs` → **7/7** (accent fallthrough re-pinned; 0 regression).
- `node frontend/scripts/contrast-sweep.mjs --out Blueprints/audits/2026-06-25-phase1-5g3-moment-contrast-sweep.md` → 62 palettes / **0 unexpected failures**. GB eyebrow 7.23/8.16 AAA; NO eyebrow 10.34 AAA + post-tint body 15.13 AAA; DET eyebrow 4.34/4.11 AA-large (decorative chrome label, paired with mock badge).
- `node --check` clean on every edited plain-JS file.

## Deferred / owed (disclosed, not silent)

1. **`npm --prefix frontend run build`** could not run — no frontend `node_modules` in this sandbox (same condition as 1.5g.1/1.5g.2). Substituted `node --check`. Run a real bundler build before merge if possible.
2. **Safari 16/17/18 `color-mix` surface-tint smoke** — not run (no browser-against-running-app). Folded into the Phase 1.13 mobile sweep. Fallback if it regresses: pre-resolve the tint to a flat `--color-team-surface-with-moment` hex in `applyMomentOverlay` (spec §index.css).
3. **Authed light/dark moment screenshots** (DET via `?moment=det-thanksgiving-classic`, GB via the manual flag) — not captured; capture once a dev server is available.
4. **Guardrail skills** `slops-code-review` / `slops-ui-ux-audit` / `slops-ux-copy` (GB eyebrow string) / `slops-verify` not run as registered skills (same as 1.5g.1/.2) — substituted with manual diff + brand-voice + WCAG sweep.

## QA recipes (dev)

- DET: `/football?moment=det-thanksgiving-classic` while disconnected (mock) in Team mode = DET.
- GB: Team mode = GB, then `localStorage['omen.theme.moments'] = JSON.stringify({'gb-lambeau-tundra': true})`, visit `/account`.
- NO: Team mode = NO + Mardi Gras Special variant; `/account?moment=no-mardi-gras` (tint on /account, eyebrow-only on /account/appearance).
- Confirm `/omen` and `/trade` render zero moment chrome; confirm a connected (`live`) Football page suppresses the moment.

## Next

Per `Direction/agent_inbox.md`: recommended next pull is **Phase 1.10A — UX copy options packet**. The deferred Safari `color-mix` smoke is owed inside **Phase 1.13**.
