# Phase B — local agent — 05 · Landing.jsx

Full context, ground rules, and primitive references: `Blueprints/prompts/phase-b-local-agent-README.md` (read it first — this prompt assumes it). Run this only after the other four prompts are complete — this page has the most local one-off UI and the most naming collisions of the five.

## Objective

Migrate `frontend/src/pages/Landing.jsx` to use the Phase A primitives listed below. This is the public marketing page — no auth, no real user data, mostly static/demo content plus two waitlist forms with a real API call.

## Naming collisions — resolve these first, before importing anything

- `Landing.jsx` defines its **own local `Button` function** (lines ~6–14, a plain styled `<a>`/`<button>` wrapper). This collides with the canonical import. Replace it directly — every call site should switch to the canonical `Button`; delete the local definition once nothing references it.
- `Landing.jsx` defines its **own local `PlayerChip` function** (used only inside `TradeAnalyzerHeroCard`'s example/demo player list — purely decorative static data, not live data). This collides with the canonical import. Replace it directly with the canonical `PlayerChip`; delete the local definition.

## Primitives in scope for this page

- **`Button`** (post-rename, see above) — used across the hero CTA inside `TradeAnalyzerHeroCard`, the "Join Waitlist" / "Sign in →" header links, both waitlist form submit buttons, `SignInForm`'s sign-in link, and the "Try the live tool" CTAs. For `SignInForm`'s "Sign in →" link specifically, use `Button`'s `asChild` prop to render a real `<a>` with button chrome, rather than a styled anchor — this is the exact `asChild` use case documented in `jules-01-button.md`.
- **`PlayerChip`** (post-rename, see above) — used in `TradeAnalyzerHeroCard`'s example player list (Breece Hall, Chris Olave, Deebo Samuel, James Conner).
- **`Input`** — the email address fields in both `HeroWaitlist` and `WaitlistSection`.
- **`RadioCardGroup`** — the platform pill selectors (ESPN / Yahoo / Sleeper / Not sure yet) in both `HeroWaitlist` and `WaitlistSection` are currently hand-built radio-as-pill patterns (`sr-only` radio input + styled `<label>`) — this is `RadioCardGroup`'s exact target shape. Migrate both instances.

## Out of scope — do not attempt

`MarketingHero` (the hero section itself, lines ~559–599) is **not** part of this prompt. Per `Blueprints/handoffs/jules/13-marketing-hero-brief.md`, that primitive's Phase B is explicitly optional/deferred and should sequence after this page's `Button` migration lands (which this prompt does) — but building/using `MarketingHero` itself is a separate, later piece of work. Leave the hero section's outer structure (`<h1>`, subheadline, `StoryArc`) as-is; only migrate the `Button`/`Input`/`RadioCardGroup`/`PlayerChip` pieces inside and around it as listed above.

Also do not attempt to fix the known Landing hero glitch bug (tracked separately) — leave its behavior exactly as found.

## Do not touch

- `apiFetch('/api/waitlist', ...)` calls in both `HeroWaitlist` and `WaitlistSection` — same endpoint, called from two places; don't consolidate the two forms into one component as part of this migration even though they're near-duplicates — that's a nice-to-have, not this prompt's job. If you want to flag it as a future cleanup opportunity, do so in your summary, don't do it now.
- Email/platform form state logic (`useState`, `handleSubmit`, status transitions idle/submitting/success/error)
- Header nav links (`Join Waitlist`, `Sign In →` in the sticky header) — low-value primitive targets, raw anchors are fine here, leave them
- The atmospheric background gradient `<div>` in `main` — decorative, not a primitive target

## Verification

Per the README's standard verification section, plus specifically for this page:
- Both waitlist forms (hero inline version and the full `WaitlistSection`) still submit correctly, including the platform-pill selection via `RadioCardGroup`, and both still show success/error states correctly.
- `SignInForm`'s `asChild` link renders a real functioning `<a href="/login">`, not a button wrapping a link or a dead click target.
- `TradeAnalyzerHeroCard`'s example player list renders correctly via canonical `PlayerChip`.
- Confirm exactly one `<h1>` still exists on the page (unchanged from before this migration — this prompt doesn't touch the `<h1>` itself, just confirming you didn't accidentally introduce a second one via a primitive).
- Light and dark mode both checked.

## Done criteria

1. No local `Button` or `PlayerChip` function remains under those names — both fully replaced by canonical imports.
2. `SignInForm` uses `Button asChild` rendering a real `<a>`.
3. Both waitlist forms' platform pickers use `RadioCardGroup`.
4. Both waitlist forms' email fields use `Input`.
5. `MarketingHero` and the hero glitch bug both confirmed untouched.
6. Zero raw hex/raw Tailwind color literals introduced in the migrated sections.
7. Zero new dependencies, zero lockfile changes.
8. One commit (or a few small logical commits) for this page, left local unless told to push.

## Explicit non-goals

- No `MarketingHero` build-out or adoption.
- No fix to the Landing hero glitch bug.
- No consolidating the two waitlist forms into one shared component.
- No changes to `ConnectLeague.jsx`, `TradeAnalyzer.jsx`, `DraftAssistant.jsx`, or `Football.jsx`.
- No `index.css` or `tailwind.config.js` changes.
- No deploy beyond local dev-server verification.
