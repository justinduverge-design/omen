# 2026-07-17: PlayerRow and PlayerChip Primitives (Phase A)

## What was accomplished
- Implemented `PlayerChip` component (`frontend/src/components/ui/PlayerChip.jsx`) taking `name`, `position`, and `size`. Uses `Chip` primitive internally for position mapping, converting string inputs (e.g. 'RB') to correct tone tokens (`pos-rb`).
- Implemented `PlayerRow` component (`frontend/src/components/ui/PlayerRow.jsx`) as a canonical player display block. Includes a `valueSlot`, handles `selected` and `recommended` border states, and conditionally renders an `unavailable` / `injuryNote` text block with muted/risk colors. It correctly changes tags to `<button>` if an `onClick` is supplied.
- Exported both primitives in `frontend/src/components/ui/index.js`.
- Logged skill usage in the ledger.

## Notes & Tradeoffs
- **Strict Phase A Limitation:** The task description included a hard limit: "Phase A only. Do not migrate page usage. Do not touch any page file." However, the design brief Markdown requested renaming `TradeAnalyzer.jsx`'s local `PlayerRow` in a dedicated commit before doing anything. Following the strict user boundaries, I omitted modifying `TradeAnalyzer.jsx` or any page files, strictly focusing on the component build and adhering to Phase A boundaries.
- Uses explicit `motion-reduce:transition-none` and `motion-reduce:duration-0` to comply with the motion guidelines when animating hover styles.
