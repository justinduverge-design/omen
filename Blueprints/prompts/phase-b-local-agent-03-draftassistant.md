# Phase B — local agent — 03 · DraftAssistant.jsx

Full context, ground rules, and primitive references: `Blueprints/prompts/phase-b-local-agent-README.md` (read it first — this prompt assumes it). Run this only after `phase-b-local-agent-02-tradeanalyzer.md` is complete.

## Objective

Migrate `frontend/src/pages/DraftAssistant.jsx` to use the Phase A primitives listed below, in one pass. This page also has a real gap (multi-select toggle group) — read that section before starting.

## Primitives in scope for this page

- **`Badge`** — replace `RiskBadge` (currently raw `emerald-400`/`red-400` literals for low/high risk, plus a `--color-team-accent`-based inline style for medium). Map to `Badge` tone success/risk/neutral.
- **`Chip`** — replace `PositionBadge` (uses `positionChipStyle(position)` from `frontend/src/lib/positionChip.js`) with `Chip` using the position tone, same pattern as brief 02's `TradeTipsCard`/`BuyLowCard` usage.
- **`MetricStrip`** — `ConfidenceBar` (custom progress bar driven by `confidenceBarStyle(score)` from `frontend/src/lib/confidenceGradient.js`) is this primitive's target use case per the component-system backlog. Keep consuming `confidenceGradient.js`'s coloring logic; swap the rendering shell for `MetricStrip`. Also consider `AdpRow`'s platform/source badge display as a `MetricStrip` or `Chip` composition — use your judgment on the closest fit, note the choice in your summary.
- **`SegmentedControl`** — the scoring-format selector (`SCORING_FORMATS`) is currently a hand-built radiogroup with a full manual keyboard-nav handler (`handleScoringFormatKeyDown` — arrow keys, Home/End, ref array). Once migrated to canonical `SegmentedControl`, that manual handler becomes redundant — remove it entirely rather than leaving it dead alongside the primitive's own built-in keyboard nav.
- **`Input`** — the two raw number `<input>` fields (Draft Position, Round).
- **`Button`** — the submit button.
- **`LoadingState`** — `LoadingRecommendations`'s skeleton (currently raw `style={{ background: 'var(--color-surface-2)' }}` divs) should use the canonical `LoadingState` primitive instead of hand-rolled skeleton markup, if `LoadingState`'s API supports a skeleton-list shape; if it doesn't fit cleanly, leave the current skeleton in place and note the gap.

## Known gap — do not build a fix, flag it instead

The "Position Needs" toggle group (`POSITION_NEEDS`) allows **multiple simultaneous selections** (backed by a `Set`), unlike `SegmentedControl` or `RadioCardGroup`, which are both single-select. **Leave this as its current local raw-button markup.** Do not force it into a single-select primitive, and do not build a new multi-select primitive ad hoc as part of this page migration — that's real design-system work that needs its own scoping. Note this explicitly in your session summary as a candidate for a future primitive brief (a multi-select `Chip` group, most likely).

## Do not touch

- `apiFetch('/api/draft-assistant/adp?...')`, `apiFetch('/api/draft-assistant/recommendations', ...)`
- Private fixture mode logic (`isPrivateFixtureEnabled`, `PRIVATE_FIXTURE_KEYS.MOCK_DRAFT`, the dynamic import of `privateDemoFixtures.js`)
- `frontend/src/lib/confidenceGradient.js`, `frontend/src/lib/positionChip.js`, `frontend/src/lib/metallicTier.js` — consume them, don't restructure
- `metallicTierStyle()` usage for rank badges — not a primitive-queue component, leave as-is
- Existing `Card`, `MockBanner`, `ErrorState` usage — already correctly using pre-existing primitives

## Verification

Per the README's standard verification section, plus specifically for this page:
- Scoring format selection still works after the `SegmentedControl` swap, and the old manual keyboard handler is confirmed removed (not just unused).
- Position Needs multi-select toggle still allows multiple selections exactly as before (confirming you left it alone).
- Draft Position / Round number inputs still submit correctly.
- Recommendations still load correctly, including the private-fixture mock-draft path if you can trigger it locally.
- Confidence bars, risk badges, and position chips render correctly in both light and dark mode.

## Done criteria

1. `RiskBadge`, `PositionBadge` fully replaced by `Badge`/`Chip`.
2. `handleScoringFormatKeyDown` and its manual radiogroup markup fully removed, not left dead.
3. Position Needs multi-select left untouched, gap documented in summary.
4. `ConfidenceBar` migrated to `MetricStrip` (or gap documented if it doesn't fit).
5. Zero raw hex/raw Tailwind color literals introduced.
6. Zero new dependencies, zero lockfile changes.
7. One commit (or a few small logical commits) for this page, left local unless told to push.

## Explicit non-goals

- No new multi-select primitive — flag the gap, don't build it here.
- No changes to `ConnectLeague.jsx`, `TradeAnalyzer.jsx`, `Football.jsx`, or `Landing.jsx`.
- No `index.css` or `tailwind.config.js` changes.
- No deploy beyond local dev-server verification.
