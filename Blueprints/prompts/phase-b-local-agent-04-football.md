# Phase B — local agent — 04 · Football.jsx

Full context, ground rules, and primitive references: `Blueprints/prompts/phase-b-local-agent-README.md` (read it first — this prompt assumes it). Run this only after `phase-b-local-agent-02-tradeanalyzer.md` and `phase-b-local-agent-03-draftassistant.md` are both complete — `Football.jsx` renders both pages as tab content, so verifying this page also serves as an integration check on those two migrations.

## Objective

Migrate `frontend/src/pages/Football.jsx` to use the Phase A primitives listed below. This page has a smaller migration surface than the others — mostly a tab bar and a status pill — but it also has team-theming-adjacent code nearby that must not be touched.

## Primitives in scope for this page

- **`TabNav`** — the hand-built `role="tablist"` tab bar (`TABS` array: Trade Analyzer / Omen of the Week / Draft Assistant / History) currently uses raw `<button>` elements with manual `aria-selected`/`aria-controls` wiring and inline `--color-team-accent`-based active-state styling. Replace with canonical `TabNav`, reading `--color-accent` instead of `--color-team-accent` for the active state.
- **`Badge`** — the connected-platform pill inside `PlatformStatusBar` (currently raw `border-emerald-400/30 bg-emerald-400/10 text-emerald-300` literals) should become `Badge` tone success.
- **`Button`** — the "Reconnect" action inside the token-expired `Alert` block should become `Button variant="link"` (or `"tertiary"`, whichever matches current visual weight — note your choice).

## Do not touch — team-theming adjacency

This file has `useTheme()` (`{ mode, team }`), a `cultureTag` computed from `mode === 'team'`, and a `post-win-chip` span with `aria-label={teamWinLabel(postWinTeam)}`. **These are inert today (team mode is runtime-disabled) but must not be touched, refactored, or have their styling "cleaned up"** as part of this migration — the ground rule against resurrecting team theming applies here specifically. Leave the culture-tag and post-win-chip markup exactly as you find it, even if it looks like it's near code you're migrating (it's in the same hero `<section>` as the tab bar's parent markup, but not the tab bar itself).

Also do not touch:
- `apiFetch('/api/dashboard/summary')`
- `startYahooOAuth()`
- `postWinPulse` helpers (`getPostWinSignal`, `hasSeenPostWinGameId`, `markPostWinGameIdSeen`, `teamWinLabel`)
- `setDataMode(...)` calls and the live/mock data-mode logic
- Existing `Alert`, `DisconnectedState`, `EmptyState` usage — already correctly using pre-existing primitives

## Verification

Per the README's standard verification section, plus specifically for this page:
- All four tabs (Trade Analyzer, Omen of the Week, Draft Assistant, History) switch correctly and render their respective content — this is your integration check on the TradeAnalyzer and DraftAssistant migrations from the previous two prompts.
- Platform connection status bar still shows correct connected/expired states.
- "Reconnect" still triggers Yahoo OAuth correctly for expired sessions.
- Culture tag and post-win chip (if you can trigger post-win state) render unchanged — confirm via diff that you didn't touch that code, not just visually.
- Light and dark mode both checked.

## Done criteria

1. Tab bar fully replaced by `TabNav`, no local `role="tablist"` hand-built markup remains.
2. Connected-platform pill uses `Badge`, not raw Tailwind color literals.
3. Reconnect action uses `Button`.
4. Culture-tag/post-win-chip code confirmed untouched (diff shows no changes to those lines).
5. Zero raw hex/raw Tailwind color literals introduced in the migrated sections.
6. Zero new dependencies, zero lockfile changes.
7. One commit (or a few small logical commits) for this page, left local unless told to push.

## Explicit non-goals

- No changes to `TradeAnalyzer.jsx`, `DraftAssistant.jsx`, `OmenOfTheWeek.jsx`, `MoveHistory.jsx`, `ConnectLeague.jsx`, or `Landing.jsx` — this prompt touches `Football.jsx` only, even though it renders several of those as children.
- No team-theming logic changes of any kind.
- No `index.css` or `tailwind.config.js` changes.
- No deploy beyond local dev-server verification.
