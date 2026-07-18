# Phase B — local agent — 01 · ConnectLeague.jsx

Full context, ground rules, and primitive references: `Blueprints/prompts/phase-b-local-agent-README.md` (read it first — this prompt assumes it).

## Objective

Migrate `frontend/src/pages/ConnectLeague.jsx` to use the Phase A primitives listed below, in one pass. Real business logic (Sleeper/Yahoo/ESPN connect flows, Supabase auth, next-URL navigation) must be behaviorally untouched — you're replacing markup, not rewriting flow.

## Primitives in scope for this page

- **`Button`** — replace local `CTAButton`, `GhostButton`, the footer "Continue"/"Skip" buttons, and any other raw `<button>` elements that are plain action buttons (not the ESPN browser picker — see `SegmentedControl` below).
- **`Input`** — replace local `FieldInput` (Sleeper username field, ESPN cookie fields, any other text inputs).
- **`Badge`** — replace `ConnectedBadge` (currently a raw green pill using `rgba(52,199,89,0.12)` / `var(--color-risk-low)`) with `Badge` tone mapped to success/connected.
- **`PlatformBadge`** — use for per-platform branding/iconography that's currently baked into `CTAButton` via `platformButtonStyle()` from `frontend/src/lib/platformChip.js`. Move brand identity onto `PlatformBadge`, keep `Button` chrome neutral (accent/tertiary), don't try to recreate platform-brand button coloring by hand.
- **`PlatformConnectionCard`** — the local `PlatformCard` component (wraps each platform's connect/disconnect/status UI) is very likely this primitive's exact use case. Check `Blueprints/handoffs/jules/08-platform-connection-card-brief.md` for its API before mapping `PlatformCard`'s props onto it. If `PlatformCard`'s current behavior doesn't cleanly fit `PlatformConnectionCard`'s API, do the closest reasonable mapping and note any gap in your summary rather than forcing it.
- **`SegmentedControl`** — the ESPN cookie-guide browser picker (Chrome/Edge, Firefox, Safari) inside `EspnGuide` is a direct match for this primitive.

## Also fix while you're in this file

`ErrorMsg` currently uses a raw `text-red-400` Tailwind literal instead of `var(--color-risk-high)`. This is unrelated drift but trivial and in the same file — fix it to use the token while you're here.

## Do not touch

- Sleeper resolve/connect/disconnect logic (`apiFetch('/api/platforms/sleeper/...')`)
- Yahoo OAuth (`startYahooOAuth()`)
- ESPN cookie connect/disconnect (`apiFetch('/api/platforms/espn/...')`)
- Supabase auth gating (`supabase.auth.getSession()`)
- `consumeNextUrl`/`storeNextUrl` navigation logic
- `frontend/src/lib/platformChip.js` — consume its exported styles/data, don't restructure the file itself

## Verification

Per the README's standard verification section, plus specifically for this page:
- Sleeper connect and disconnect both still work end-to-end.
- Yahoo OAuth kickoff still redirects correctly.
- ESPN cookie connect and disconnect both still work end-to-end.
- The ESPN browser-picker (now `SegmentedControl`) still lets you pick a browser and shows the right guide content.
- Continue/Skip footer buttons still navigate correctly.
- Light and dark mode both checked.

## Done criteria

1. `CTAButton`, `GhostButton`, and local `FieldInput`/`ConnectedBadge`/browser-picker markup are fully removed — no dead code left behind.
2. `PlatformCard` is either replaced by `PlatformConnectionCard` or, if a real API gap was found, left in place with the gap documented in your summary.
3. `ErrorMsg` uses `var(--color-risk-high)`, not a raw Tailwind color literal.
4. Zero raw hex/raw Tailwind color-scale literals introduced.
5. Zero new dependencies, zero lockfile changes.
6. All connect/disconnect/OAuth flows verified working, light and dark mode both checked.
7. One commit (or a few small logical commits) for this page, left local unless told to push.

## Explicit non-goals

- No changes to `TradeAnalyzer.jsx`, `DraftAssistant.jsx`, `Football.jsx`, or `Landing.jsx`.
- No `index.css` or `tailwind.config.js` changes.
- No new primitive components — if something doesn't fit, leave it local and flag it.
- No deploy beyond local dev-server verification.
