# Trade Analyzer Rework — Handoff

Date: 2026-06-03
Owner: Claude/frontend
Status: Sprint item partially complete. This doc clarifies what's done vs. what tomorrow's session should actually build.

---

## Current State (already shipped)

The sprint note says: "position-first, autocomplete via `nflPlayers.js`, Trade Room column."

All three are already live in `frontend/src/pages/TradeAnalyzer.jsx`:

| Sprint Item | Status | Notes |
|---|---|---|
| Position-first layout | ✅ Done | `PlayerRow` renders position select before name input via `md:grid-cols-[72px_1fr_44px]` |
| Autocomplete via `nflPlayers.js` | ✅ Done | `searchPlayers(position, query)` with keyboard nav (↑↓ Enter Esc), ARIA combobox, `MAX_SUGGESTIONS=8` |
| Trade Room column | ✅ Done | `TradeTipsCard` + `BuyLowCard` in sticky `xl:grid-cols-[1fr_256px]` sidebar |

The sprint doc is stale on this item. The form rework that was planned has already been executed.

---

## What's Genuinely Missing (tomorrow's actual work)

### 1. Scoring format selector — HIGH priority
The backend accepts `scoring_format: "ppr" | "half_ppr" | "standard"` but the frontend never sends it — the payload omits it and the backend uses its default. Users can't tell the analyzer what format their league uses.

**Fix:** Add a `scoringFormat` state (default `'ppr'`), a 3-option toggle (PPR / Half / Standard) above the Send/Receive columns, and include it in the `POST /api/trade/compare` body.

Layout: small pill toggle, not a full dropdown. ~1 line of state, ~10 lines of UI.

### 2. Trade direction visual — MEDIUM priority
Currently "Send" and "Receive" are just header text in two side-by-side panels. There's no visual cue connecting them as a trade.

**Fix:** Add a centered `⇄` glyph between the two panels (desktop only, `hidden xl:flex`). Uses `aria-hidden="true"`. Makes the trade direction immediately obvious on first look.

### 3. VORP explanation in result panel — MEDIUM priority
The result shows a number labeled "VORP value" with no explanation. New users won't know what VORP is.

**Fix:** Add a tooltip or a one-line explainer beneath the VORP stat: `"Value Over Replacement Player — how much better this side is than a replacement-level option."` Could be a `<abbr title="...">VORP</abbr>` or a small `(?)` info icon.

### 4. BuyLowCard mock label — LOW priority
`BuyLowCard` shows `"Mock data · updated each preseason"` as plain small text. It should use the shared `MockBanner` component (or at minimum match the visual style) so mock data is clearly flagged consistently across the app.

**Fix:** Replace the footer text with `<MockBanner message="Mock buy-low targets — updated each preseason." />` wrapped in a `mt-3` container.

### 5. Mobile layout review — LOW priority
`PlayerRow` stacks correctly on mobile (`grid` → single column). But the two-column Send/Receive sections (`xl:grid-cols-2`) sit single-column on mobile, which is fine. The `CompareTradeButton` area and the sidebar are both mobile-clean. No structural fix needed — just verify visually when you have a device handy.

---

## Files to Touch Tomorrow

```
frontend/src/pages/TradeAnalyzer.jsx   — scoring format state + toggle UI + ⇄ + VORP abbr
frontend/src/data/tradePulse.js        — (read only) verify buy-low targets are current
```

No backend work. No new components needed. All changes are contained in `TradeAnalyzer.jsx`.

---

## Recommended Prompt for Tomorrow

```
Open frontend/src/pages/TradeAnalyzer.jsx.

Add these three improvements:
1. Scoring format toggle (PPR / Half PPR / Standard) as pill buttons above the Send/Receive columns. Default PPR. Include the value in the POST /api/trade/compare body as scoring_format.
2. A centered ⇄ trade direction glyph between Send and Receive panels on xl screens (aria-hidden, hidden on mobile).
3. Wrap the VORP label in <abbr title="Value Over Replacement Player — how much better this side is than a replacement-level option.">VORP</abbr> in the ResultPanel.

Also replace the plain-text mock label in BuyLowCard with the shared MockBanner component.

No other changes. No backend. No new files.
```

---

## Safest Next Step

Run the current app against the scoring format fix first — it's the only change with a backend contract dependency (adding a field to the POST body). The visual changes (⇄, VORP abbr, MockBanner) are purely cosmetic and can be applied independently.
