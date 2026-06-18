# 2026-06-18 Phase 1.5 Visual QA Closure Handoff

## Files updated

| File | Change | Commit |
|------|--------|--------|
| `frontend/src/components/moves/MoveHistory.jsx` | `#4ade80`/`#f87171` → `var(--color-risk-low)`/`var(--color-risk-high)`; rgba → `color-mix()` | 9e3a58c |
| `frontend/src/pages/Onboarding.jsx` | `#B66A6A` error text → `var(--color-risk-high)` at line 256 | 9e3a58c |
| `frontend/src/pages/Appearance.jsx` | Removed: T-number template badge, `team.note` dev commentary, "Dot on tile" paragraph; stripped internal labels from Swatch chips; removed unused `TEMPLATE_LABELS` import | 9e3a58c |
| `Blueprints/done/LEDGER.md` | Updated PR1 row with 16 screenshot IDs; added 1.5b and 1.5c rows | 19eec94 |
| `Direction/current_sprint.md` | Updated 1.5b and 1.5c items with gap-closure evidence | 19eec94 |
| `Direction/decision_log.md` | Added 2026-06-18 decisions entry: P0 fixes, screenshot evidence, P1 gaps noted | 19eec94 |
| `Direction/agent_inbox.md` | Active task pin cleared | 19eec94 |

## Files discussed (read, not changed)

- `Brand/brand-system.md` — AAA framework, palette, voice rules
- `Blueprints/specs/page-system.md` — per-route accent contract
- `Blueprints/done/page-done.md` — gate 9 (screenshots), gate 12 (no P0)
- `Blueprints/done/design-done.md` — gate 3 (screenshots), gate 7 (no P0)
- `frontend/src/lib/teamTemplate.js` — confirmed BRED_SURFACE constants are intentional (color math engine, not JSX style props)
- `frontend/src/components/theme/AppearancePicker.jsx` — TeamTile raw hex usage confirmed acceptable (data-driven tile background)
- `frontend/src/index.css` — confirmed `--color-risk-low` and `--color-risk-high` are already defined in dark and light mode

## Decisions made

All logged in `Direction/decision_log.md` under "Decisions Added 2026-06-18". Key points:
- **Appearance.jsx dev data removed:** Template badge, `team.note`, "Dot on tile" — were rendering internal developer information in production
- **Risk tokens exist and are correct:** `--color-risk-low` and `--color-risk-high` are defined in `index.css` (dark: `#34C759`/`#8B1A1A`; light: `#16A34A`/`#991B1B`)
- **P1 gap for next session:** No `--color-text-on-accent` token exists; Onboarding.jsx CTA buttons use `color: '#0A0A0B'` directly at lines 126/171/240/313

## Screenshots captured

Via Claude-in-Chrome MCP against `https://slopssaloon.com` (production), System mode, `data-theme='light'` injected for light mode:

| Page | Dark | Light |
|------|------|-------|
| Appearance (`/account/appearance`) | ss_1136kzazq | ss_553519qae |
| Football (`/football`) | ss_0749j1qzm | ss_5798xmros |
| Omen (`/omen`) | ss_3369f09zy | ss_9525oi13u |
| Ledger (`/ledger`) | ss_35349udgx | ss_78836a3gv |
| Standings (`/standings`) | ss_9073a9wh0 | ss_7036jh17j |
| Trade (`/trade`) | ss_5406mmemw | ss_52456s6z0 |
| Draft (`/draft`) | ss_0514so4h0 | ss_4918b8aov |
| Account (`/account`) | ss_2780hdtgo | ss_6975f2eip |
| Onboarding (`/onboarding`) completion | — | ss_8863zfjkf |

Note: Onboarding PickLookStep (step 0) is not directly reachable for authenticated users — the component redirects to completion step. Visual evidence provided via `/account/appearance` which renders the same `AppearancePicker` component.

## Unresolved questions

- Should the `--color-text-on-accent` token be added to `index.css` for CTA legibility? Onboarding CTAs currently hard-code `#0A0A0B`.
- The secondary-scheme teams (PIT, HOU, LV, NYG, WAS, CHI, GB, LAR, SEA) — Justin's call still open on whether to flip any of them to primary per the "official-color-first" policy from 2026-06-17. Decision table is in `Blueprints/audits/2026-06-16-phase1-5-team-template-assignment.md`.

## Blockers surfaced

- **Build not verified in this session:** `node`/`npm` not found on PATH in the agent context; the agent tmp filesystem (`/private/tmp/claude-501/...`) was full during this session. `git diff --check` passed (0 whitespace errors). Justin should run `npm --prefix frontend run build` locally or confirm via CI before deploying commit 9e3a58c.

## Last verified result

- `git diff --check` → 0 issues
- Two commits on `main`: `9e3a58c` (code fixes), `19eec94` (docs)

## Next recommended pull

`agent_inbox.md` is empty. Next unchecked frontend item is **Phase 1.5d — Post-win pulse animation** (blocked by Backend Phase 2.17 — `lastResult` field from platform adapters). Since 1.5d is blocked, the practical next pull is **Phase 1.6 — Position chip palette + selected-state styling** (unblocked, Lane: Frontend/Claude).
