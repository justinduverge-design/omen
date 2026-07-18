# Phase B — local agent — 02 · TradeAnalyzer.jsx

Full context, ground rules, and primitive references: `Blueprints/prompts/phase-b-local-agent-README.md` (read it first — this prompt assumes it). Run this only after `phase-b-local-agent-01-connectleague.md` is complete.

## Objective

Migrate `frontend/src/pages/TradeAnalyzer.jsx` to use the Phase A primitives listed below, in one pass. This is the most collision-prone of the five pages — read the naming-collision section carefully before touching anything.

## Naming collisions — resolve these first, before importing anything

- `TradeAnalyzer.jsx` has a **local `SegmentedControl` function** (used for scoring format / deal-shape selection). It will collide with the canonical import. Rename the local one to something unambiguous (e.g. `TradeAnalyzerLegacySegmentedControl`) if you need to keep it temporarily during the swap, then delete it once the canonical `SegmentedControl` fully replaces its usages. Do not leave both defined.
- `TradeAnalyzer.jsx` has a **local `PlayerRow` function** — a form-input row with a full ARIA combobox pattern (`role="combobox"`, `aria-autocomplete`, `aria-haspopup`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, arrow/enter/escape keyboard nav) for player-name autocomplete. **Rename this to `TradeAnalyzerPlayerRow`** before importing the canonical `PlayerRow` (which is a display component, not a form input, and is not a replacement for this one). Preserve every part of the combobox behavior exactly during the rename — this is a pure rename, not a rewrite.

## Primitives in scope for this page

- **`Button`** — "Compare Trade" submit button, "Share result" button, the "Add" player button in `PlayerRows`.
- **`Input`** — the position/name fields inside `TradeAnalyzerPlayerRow` (post-rename) where they're plain text inputs (not the combobox listbox itself, which stays custom). Also see the share-URL field below.
- **Share-URL readonly/copy field**: no primitive documents this exact pattern. Use `Input` with `readOnly` set and a `trailingIcon` copy-to-clipboard button (check `Input`'s actual prop API in `frontend/src/components/ui/Input.jsx` — it supports a `trailingIcon` slot). This is a specific, deliberate use of an existing slot, not a new primitive — if it doesn't work cleanly, leave the share field as its current raw markup and flag it in your summary rather than forcing a bad fit.
- **`SegmentedControl`** — replaces the renamed local `TradeAnalyzerLegacySegmentedControl` for scoring format / deal-shape selection, once the rename above is done.
- **`PlayerRow` / `PlayerChip`** — use for the *display-only* send/receive player lists in `ResultPanel` (currently plain `<li>` rows with name + value). This is separate from the renamed `TradeAnalyzerPlayerRow` form component — don't conflate the two.
- **`MetricStrip`** — the VORP value display and the trade result's metric grid in `ResultPanel` are this primitive's target use case per the original component-system backlog.
- **`Tooltip`** — the native `<abbr title="Value Over Replacement Player...">` around VORP should become a `Tooltip` wrapping the same explanatory text.
- **`Chip`** — position tags in `TradeTipsCard`/`BuyLowCard` (currently styled via `positionChipStyle()` from `frontend/src/lib/positionChip.js`) — use `Chip` with the appropriate position tone, keep consuming `positionChipStyle()`'s data if that's the cleanest path.

## Also fix while you're in this file

`ResultPanel`'s `verdictStyles` object uses raw `emerald-400`/`red-400` Tailwind literals instead of tokens (e.g. `var(--color-risk-low)` / `var(--color-risk-high)`). Fix these to use tokens.

`--color-team-accent` is used pervasively throughout this file. Per the README's ground rules, migrated primitives should read `--color-accent` directly — this will produce a visually harmless change (team mode is inert, `--color-team-accent` currently resolves to the same value as `--color-accent`) but note it explicitly in your summary since it's a real, if invisible, token-usage change across the page.

## Do not touch

- `apiFetch('/api/trade/compare', ...)`, `apiFetch('/api/trade/share', ...)`
- `buildTradePayload`, `buildTradeShareUrl`
- The combobox keyboard-navigation logic inside the renamed `TradeAnalyzerPlayerRow` — preserve exactly
- `frontend/src/lib/positionChip.js` — consume it, don't restructure it
- Existing `EmptyState`, `ErrorState`, `MockBanner` usage — already correctly using pre-existing primitives, leave as-is

## Verification

Per the README's standard verification section, plus specifically for this page:
- Player-name autocomplete combobox still works exactly as before — typing, arrow-key navigation, Enter to select, Escape to close, ARIA attributes intact.
- Scoring format / deal-shape selection still works after the `SegmentedControl` swap.
- "Compare Trade" still calls the real API and renders a real result.
- "Share result" still generates and copies/displays a working share URL.
- Trade result panel (verdict, VORP, metrics, player lists) renders correctly in both light and dark mode.

## Done criteria

1. No local `SegmentedControl` or `PlayerRow` function remains under those names — both fully renamed/removed, canonical primitives in their place.
2. Combobox ARIA behavior in `TradeAnalyzerPlayerRow` verified unchanged.
3. `verdictStyles` uses tokens, not raw Tailwind color literals.
4. `--color-team-accent` → `--color-accent` swap noted in your summary.
5. Share-URL field either uses `Input` + `trailingIcon` copy button, or is left as-is with the gap flagged — not forced into a bad fit.
6. Zero new dependencies, zero lockfile changes.
7. One commit (or a few small logical commits) for this page, left local unless told to push.

## Explicit non-goals

- No changes to `ConnectLeague.jsx`, `DraftAssistant.jsx`, `Football.jsx`, or `Landing.jsx`.
- No `index.css` or `tailwind.config.js` changes.
- No new primitive components for the share-URL pattern — use the `Input` + `trailingIcon` approach or leave it local.
- No deploy beyond local dev-server verification.
