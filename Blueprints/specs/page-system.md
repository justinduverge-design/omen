# Omen Page System

**Status:** v1 — landed 2026-06-15 (Phase 1.3)
**Layer:** 2 (Omen)
**Author:** Claude
**Source evidence:** `Brand/brand-system.md`, `Blueprints/specs/omen-ux-ui-design-system-v1.md`, Justin's QA Part 2 markdown (2026-06), 17 annotated screenshots (2026-06-14 mobile Safari, light + dark).
**Verified against:** `SKILL_ROUTING.md@2026-06-15`, `current_sprint.md@2026-06-15`.
**Authoring guardrails used:** `design:design-system`, `ui-ux-pro-max` (design-intelligence library).
**Subsequent audit guardrail:** `slops-ui-ux-audit` (verdict on each Phase 1.4–1.12 PR).

---

## Purpose

This file is the **contract** every visual change in Phase 1.4 through Phase 1.12 must satisfy. The brand system says *what Omen feels like in the abstract*; the design system v1 says *what tokens and components exist*; this page system says *how each individual page must use them*, per surface, per mode.

If a decision isn't covered here, **stop and ask Justin** rather than guessing. Spec drift is the load-bearing failure mode this document exists to prevent.

---

## Scope

In scope: per-route typography roles, accent (team-color) consumption rules, palette assignments, gradient endpoints, metallic-tier treatments, platform brand-color emphasis, copy-anchor placement, light/dark parity, approved/disapproved patterns observed in QA Part 2.

Out of scope: feature work (multi-team trades, position-button form redesigns, multi-pick draft flows), backend contracts, A/B tests, animation timing changes beyond what the design system already specifies, new components, new routes.

---

## How to use this spec

1. Pick the page you're touching from the **Page System Table** below.
2. Read its row top to bottom — every column is a hard rule unless flagged `(later)`.
3. Cross-check the **Component Rules** section for any component that appears on the page.
4. Cross-check the **Approved Patterns** and **Disapproved Patterns** sections — the QA evidence already settled some debates.
5. Verify your change in both light and dark mode before committing. **Light/dark parity is non-negotiable.**
6. Reference this file in the PR description with the exact section you applied.

---

## Global Rules

### Typography (canonical reference: `omen-ux-ui-design-system-v1.md` §Typography)

Headlines and brand display: **Alegreya Sans**. Body text and longer reading copy: **Alegreya**. UI labels, buttons, inputs, nav, meta, table cells, and chip text use **Alegreya Sans**. No other typefaces. **Do not use Cormorant Garamond**; it is rejected for Omen. Both approved Alegreya faces are loaded in `frontend/src/index.css`; verify the font imports resolve before declaring a page font-fixed.

A page header in `<h1>` is always Alegreya Sans 600 at 30–36px. A card headline (`<h2>` / `<h3>` inside a content card) is Alegreya Sans 600 at 20–24px. The Omen recommendation title is Alegreya Sans 600 at 24px. The TE1 chip "1" character must be at the same size as the position glyph (Justin QA: "should the '1' be at least the same size as 'TE'?" — yes).

### Color (canonical reference: `omen-ux-ui-design-system-v1.md` §Color System)

Both modes are first-class. Token names are identical across modes; values differ. **Use the token, never the hex.** A hex literal in JSX or CSS is a smell — flag in review.

Mode parity rule: any visual rule in this spec applies to both modes. If a page looks correct in dark mode but wrong in light mode (or vice versa), the page is wrong, not the light mode.

### Motion (canonical reference: brand-system §8)

150ms ease-in-out for state changes. No bouncy / springy / game-like motion. Respect `prefers-reduced-motion`.

### Accessibility

WCAG AA contrast minimum. Touch targets ≥44px on mobile (Phase 1.13 sweeps this). Focus rings: visible, gold accent, consistent across modes. Color is never the only differentiator — confidence and risk carry labels.

### Copy

Lead with the move, evidence second. Confidence and risk both visible whenever a recommendation exists. Mock data labeled. The brand-system §2 "Do not use" list is enforced — surface any production violation as a Phase 1.10 line item.

---

## Page System Table

Each row is the contract for that route. "Typography role" = primary serif treatment. "Accent role" = how the team-color token is consumed on the page. "Copy anchor" = the brand-line / voice anchor that lives on the page. "Status" = is the page currently in line with this spec.

| Route | File | Typography role | Accent role | Copy anchor | Status |
|---|---|---|---|---|---|
| `/` | `Landing.jsx` | Alegreya Sans hero "See the result before it happens." (primary marketing line) + Alegreya Sans card headlines | Accent inert (no team theme on public landing) | "See the result before it happens." | Phase 1.10B shipped 2026-06-25 — banned line replaced |
| `/about` | `OmenLanding.jsx` | Same as `/` | Accent inert | "See the move before the league does." (approved alternate — fits the competitive Trade Analyzer demo context better than the primary line) | Phase 1.10B shipped 2026-06-25 — banned line replaced |
| `/login` | `Login.jsx` | Alegreya Sans headline "Your best call, every time." (current page line). Body in Alegreya. Transparent Omen horizontal lockup image above "Fantasy Intelligence". | Accent inert | "Your best call, every time." (current - approved) | **Phase 1.4 shipped** (font/color) + **Phase 1.15 shipped locally 2026-07-05** - brand mark uses `/omen-horizontal-lockup-transparent.png`; local light mobile screenshot verifies the logo image renders with no `[C]` placeholder or baked-black rectangle. |
| `/onboarding` | `Onboarding.jsx` | Alegreya Sans success headline. Body in Alegreya. | **Accent active on the new "Pick your look" first step only** (Mode picker + 32-team grid + Continue/Skip CTAs consume `--color-team-accent`, same as `/account/appearance`) — Welcome / Connect / Complete steps remain accent inert pending the Phase 1.5 whole-app sweep | "You're set." / "League connected. Omen reads the matchup the moment your roster locks — your first call lands Tuesday." (Phase 1.10B, shipped 2026-06-25 via `slops-ux-copy`) | **Phase 1.5b shipped (2026-06-17)**; Phase 1.4 (font) shipped 2026-06-16; **Phase 1.10B copy shipped 2026-06-25**; **Phase 1.12 shipped 2026-07-02** — success-step body contrast corrected |
| `/account/connect` | `ConnectLeague.jsx` | Alegreya Sans "Connect Your League" headline. Body in Alegreya. | Accent inert (pre-team) | "Omen needs your league to find your Most Valuable Play." (current — approved) | **Needs Phase 1.4** (font drift) + **Phase 1.7 shipped (2026-06-30)** — platform icons + primary Connect buttons now use sourced Sleeper/Yahoo/ESPN brand tokens |
| `/account` | `Account.jsx` | Alegreya Sans page title "Account". Section headers Alegreya Sans. Body in Alegreya. | **Accent active** — header underline / focus rings reflect team color; destructive privacy actions use the risk token, not team color | Alegreya Sans "Account" + section labels — TE1 sizing rule applies to any pill text. Privacy section copy says "Delete Omen data" and avoids implying provider-side deletion. | **Needs Phase 1.4** (Account + Team Theme in wrong font) + **Phase 1.5** (team accent missing) + **Phase 1.7 shipped (2026-06-30)** — Connect Sleeper/Yahoo/ESPN buttons now share one shape/size with platform-brand fill color + **Phase 2.9 shipped locally 2026-07-04** — Privacy subsection exposes the `/api/user/delete` confirmation flow after Justin approval + Phase 2 backlog (subscription card removal for free era) |
| `/account/appearance` | `Appearance.jsx` | Alegreya Sans "Your look." headline. Tile glyphs in Alegreya Sans at parity sizes. | **Accent active** — selected tile shows outline in team accent, identity copy block (cultureTag pill, cry, wardRoom, lore) and one-line cultural-anchor attribution all in team accent / `--color-text-tertiary`. Mode is per-entity light/dark — surface and `data-theme` flip when a light-axis team (MIA/IND/LAC/DAL/CAR/ARI) is selected. | "Omen borrows your team's colors for accents — recommendations, confidence, the call to act. Nothing more. The reads stay neutral." (current — approved) | **Phase 1.5f shipped (2026-06-21)** — two-axis Team mode, cultural-anchor attribution UI, `--color-text-on-accent` token. Still **needs Phase 1.9** (tile glyph treatment — subtle 3D / metallic per Justin QA) + **Phase 1.12 shipped 2026-07-02** — intro paragraph contrast corrected |
| `/football` | `Football.jsx` | Alegreya Sans page section headers. Body/content blocks in Alegreya. Dashboard summary labels in Alegreya Sans. | **Accent active** — section accents + active tab underline | Alegreya Sans section headers; subhead "Your dashboard. Your call." TBD via `slops-ux-copy` if needed | **Needs Phase 1.4** + **Phase 1.5** + **Phase 1.10** (kill "Preview Mode — example recommendations" yellow banner — see Disapproved Patterns) |
| `/omen` | `OmenPage.jsx` | Alegreya Sans "Omen of the Week" headline. Alegreya Sans recommendation title. Body in Alegreya. | **Accent active** — header rule, CTA, confidence-fill use team accent in confidence range high | **Offseason voice anchor** (Phase 1.10) — current "No move clears the threshold" is too flat; rewrite to "resting / calibrating / meditating for the next Omen." 3 options to Justin via `slops-ux-copy`. | **Needs Phase 1.4** + **Phase 1.5** + **Phase 1.8** (confidence gradient endpoints) + **Phase 1.10** (offseason copy) + **Phase 1.11** (mock-roster fixtures so visuals can be tested) |
| `/ledger` | `Ledger.jsx` | Alegreya Sans "Your Season Record" headline. Empty-state phrase "No moves yet." in Alegreya Sans. Body in Alegreya. | **Accent active** — header rule + "Go to Omen" CTA | "Every move Omen called. Whether you followed it. Whether it worked." (current — approved) | **Needs Phase 1.4** + **Phase 1.5** + **Phase 1.11** (mock previous-results fixtures) |
| `/standings` | `Standings.jsx` | Alegreya Sans "Standings" headline. Table cells in Alegreya Sans. | **Accent active** — header rule, "you" row highlight in team accent | "Where every manager sits after the last whistle." (current — approved) | **Needs Phase 1.4** + **Phase 1.5** + **Phase 1.7 shipped (2026-06-30)** — platform badge now uses sourced Sleeper/Yahoo/ESPN brand tokens (also applied to the embedded `/football` `LeagueStandings.jsx` badge) + **Phase 1.12 shipped 2026-07-02** — W-L / PF / PA legibility corrected and the current-user row now uses a stronger background + team-accent left edge |
| `/trade` | `TradeAnalyzer.jsx` | Alegreya Sans page title + result card title. Body in Alegreya. | **Accent active** — Compare Trade CTA and share-card CTA in team accent; result accept/reject pills in team accent + risk hue | "Depth wins championships" copy revision remains Phase 2.13; share copy says public snapshot only and excludes connected-platform/private-league context | **Phase 2.10 shipped locally 2026-07-04** — result card can create a public share link after a successful comparison. Still needs Phase 2.12 form redesign and Phase 2.13 strategy-copy rewrite. |
| `/trade/share/:hash` | `TradeShare.jsx` | Alegreya Sans recommendation headline; body in Alegreya; metric value in mono | **Accent active** — primary CTA and VORP metric frame use team accent; risk chip uses risk token; position chips use position palette | Recommendation-first public snapshot: "Accept the deal" / "Decline the deal" / "Hold for now"; explicit privacy line says no connected-platform context, ESPN cookies, tokens, or private league data | **Phase 2.10 shipped locally 2026-07-04** — public page renders the share snapshot, loading/error states, light/dark parity, and mobile-safe controls. Server also injects OG/Twitter tags and serves `/api/trade/share/:hash/og.svg`. |
| `/draft` | `DraftAssistant.jsx` | Alegreya Sans page title "Your next pick". Card headlines Alegreya Sans. Body in Alegreya. | **Accent active** — Get Recommendation CTA in team accent | "Tell Omen where you are in your draft. It will surface the best available move for your roster." (current — approved) | **Needs Phase 1.4** + **Phase 1.5** + **Phase 1.6** (position chips — RB green, WR blue confirmed; add QB / TE / DEF / K; selected-state styling) + **Phase 1.9** (top-3 metallic 1=gold, 2=silver, 3=bronze) + **Phase 1.10** (kill Preview Mode banner) + **Phase 1.11** (mock-draft fixtures) |
| `*` | `NotFound.jsx` | Alegreya Sans headline. Body in Alegreya. | Accent inert | "Off the map." (current — verify) | **Needs Phase 1.4** if drift present |

`/dev/omen` is a dev-only harness and is excluded from this spec.

---

## Component Rules

### Post-Win Pulse + Streak Ladder (Phase 1.5d)

Phase 1.5d ships a single-win pulse only. It consumes the existing
`GET /api/dashboard/summary.platforms.{sleeper,yahoo,espn}` fields:
`lastResult`, `lastGameId`, and `lastGameKickoff`.

Current live-safe behavior:

- If any connected platform reports `lastResult === 'W'` with a usable
  `lastGameId`, `/football` may show a compact win chip near the page eyebrow.
- The first app open for a new `lastGameId` may trigger one 800ms header-rule
  accent wash. Store seen ids in `localStorage` so the same win does not replay
  every visit.
- The current-user standings row may lift from a 14% team-accent tint to 22%.
- `prefers-reduced-motion` suppresses the moving wash and preserves the settled
  visual state.
- This is not a recommendation surface and must not imply live advice beyond
  the factual last-result signal.

Future hybrid streak ladder:

| Streak | Label | Icon direction | Reward |
|---|---|---|---|
| 1 | Bright today | sparkle/glint | Single accent wash + brighter current-user row |
| 2 | Heating up | flame | Stronger chip treatment |
| 3 | On a streak | flame | Row glow + persistent momentum chip |
| 4 | The omen favors you | sparkle/glint | Slight animated accent line |
| 5+ | Crowned run | crown | Premium crown chip + strongest tasteful glow |

Do not ship the ladder from browser-local inference. A real streak needs a
backend-backed `currentWinStreak` style field on `GET /api/dashboard/summary`
that is computed from provider matchup history. Until that contract exists,
the frontend may demo the ladder in development notes, but production behavior
stays single-win.

### Team palette tokens — Phase 1.5h (supersedes 1.5/1.5f single-accent model)

Justin doctrine 2026-06-21: **every team must surface its full official palette on every themed page; no team page should be in stylistic "dark mode."** The page may *appear* dark because the team's canonical world color is dark (PIT black, BAL purple, ATL Stankonia, LV black), but Omen never imposes dark mode on top of a team's accent — the team's palette IS the surface.

#### Multi-role data model

Each team in `nflTeams.js` carries a `palettes` array with at least one Official entry and, where applicable, a Special cultural variant (Stankonia, Calle Ocho, Paisley Park, Lambeau Tundra, etc.). Each palette has 3-5 named colors with explicit UI roles:

| Role | Used for |
|---|---|
| `primary` | Dominant brand color — CTA fills (when surface ≠ primary), headline accents |
| `secondary` | Second brand color — section headers, focus rings, fall-through CTA when surface == primary |
| `tertiary` | Optional third — chip bg, secondary flourish |
| `neutral` | White/cream/parchment — body text on dark surface, frame on light surface |
| `mute` | Black or near-black — hairlines, depth, text on light surface |
| `accent-pop` | Optional hover/active flourish |

Plus a per-palette `surfaceRole` naming which role IS the page surface. Surface choice drives whether the page reads light or dark — a consequence of the team's canonical world color, not a stylistic toggle.

#### Tokens written to `:root` in Team mode

`themeMode.js applyTeamTokens()` writes the full role map:

- `--color-team-primary` / `--color-team-secondary` / `--color-team-tertiary` / `--color-team-neutral` / `--color-team-mute` / `--color-team-pop`
- `--color-team-text-on-primary` / `--color-team-text-on-secondary` / `--color-team-text-on-tertiary` / `--color-team-text-on-pop` (WCAG-picked foreground for each role used as a fill)
- `--color-team-surface` / `--color-team-surface-card`
- `--color-team-accent` — derived CTA color (primary by default, falls through to secondary when `surfaceRole === 'primary'` so GB green-on-green and PIT black-on-black CTAs remain visible)
- `--color-team-anchor-name` — CSS string of the active palette's cultural-anchor name (used by `Footer` to render the attribution)
- Plus overrides on the core Omen tokens: `--color-bg`, `--color-surface-1/2/3`, `--color-border`, `--color-border-subtle`, `--color-accent`, `--color-accent-hover`, `--color-accent-muted`, `--color-text-on-accent`, `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`. This means pages that consume the standard Omen tokens (most of them) inherit the team look without per-page changes.

#### Variants — Official vs Special

The Mode picker on `/account/appearance` exposes an Official / Special toggle (`VariantPicker`) when the selected team has a special variant. 30 of 32 teams have a Special as of Phase 1.5h ship; CLE and LAR are official-only. Variant persists at `localStorage['omen.theme.variant']` and survives across sessions. Identity copy (cultureTag/cry/wardRoom/lore) stays constant across modes — the fan voice doesn't change with the visual chrome.

#### Cultural anchor extends to all pages (Phase 1.5h)

When the user is in Team mode and the active palette has a `culturalAnchor`, `Footer` renders a quiet italic citation alongside the copyright: *"Painted in the spirit of [anchor name] ([year])."* Does not render in System / Omen mode or when no anchor is defined (most Official palettes are anchor-less; Specials carry the cultural reference). Justin doctrine 2026-06-21: "cultural anchor citation extends to all pages, in the background or part of the text in the pages."

#### Retired Phase 1.5e/f fields

`primary`, `secondary`, `accent`, `scheme`, `template`, `surfaceAxis`, `surfaceFrom`, `accentLifted`, `colorRush`, `note`, `SURFACE_RECIPES`, `textSafe()` — all replaced by the `palettes` array + role tokens. Do not reintroduce.

#### Sweep + audit

Programmatic sweep at `frontend/scripts/contrast-sweep.mjs` runs WCAG against all 62 palettes (32 official + 30 special) × required cells (body/surface + CTA text/accent). Output: `Blueprints/audits/2026-06-21-phase1-5h-multi-color-wcag-sweep.md`. Five known marginals are baked into the script with explicit rationale (KC red CTA, DET Honolulu blue surface ×2, DET Lions blue CTA, BUF Wing Sauce CTA — all pass AA-large 3.0, fall short of AA-normal 4.5 by a small margin where identity preservation wins).

### Position Chip Palette (Phase 1.6)

**Resolved 2026-06-21.** Tokens live in `frontend/src/index.css` and the shared `positionChipStyle()` helper in `frontend/src/lib/positionChip.js` renders the chip pattern (30% border / 10% bg / token text via `color-mix`).

| Position | Token | Dark hex | Light hex | Rationale |
|---|---|---|---|---|
| RB | `--color-pos-rb` | `#34D399` | `#047857` | Carry-forward of the approved Draft / Trade Analyzer screenshot direction (emerald). Light variant deeper for AA. |
| WR | `--color-pos-wr` | `#60A5FA` | `#1D4ED8` | Truer blue than the previous `sky-400`; clearer separation from cyan / teal. |
| QB | `--color-pos-qb` | `#FB923C` | `#9A3412` | Rust/orange — amber was rejected (collides with `--color-accent` gold). |
| TE | `--color-pos-te` | `#C084FC` | `#7E22CE` | Brighter purple than `--color-omen` (which is deeper, more saturated blue-violet). Continuity with previous `purple-400`. |
| DEF / DST | `--color-pos-def` | `#F472B6` | `#9D174D` | Magenta/pink — separates from QB orange and RB green under deuteranopia + protanopia. |
| K | `--color-pos-k` | `#A3A3A3` | `#525252` | Desaturated, low visual weight per spec. Distinct from FLEX. |
| FLEX | `--color-border` + `--color-surface-1` + `--color-text-primary` | n/a | n/a | Not a position; renders neutral via the fallback branch of `positionChipStyle()`. |

**Selected-state contract (resolved).** On `/draft` the Scoring Format chips (PPR / Half PPR / Standard) and the Position Needs chips (QB / RB / WR / TE / FLEX / K / DEF) now render a **filled** selected state using `--color-team-accent` background + `--color-text-on-accent` foreground (replaces the previous muted-tinted-outline that QA called "broken yellow-with-X"). Both buttons also expose `aria-pressed`. Selected state inherits the team accent, not the position color — that's intentional so the per-position hue stays a *category* cue and accent stays the *selection* cue.

**Color-blind survival** (deuteranopia + protanopia matrix sim):
- Deuteranopia: RB → olive-yellow, QB → ochre, WR stays blue, TE → blue-violet, DEF → pale-rose, K gray. All distinct by hue + luminance.
- Protanopia: TE ↔ WR are the closest pair (purple shifts toward blue). **Mitigation:** the chip's letter content (the position abbreviation) is the primary cue per page-system §Accessibility ("color is never the only differentiator") — color is supplementary.

### Platform Brand Color Emphasis (Phase 1.7) — Resolved 2026-06-30

CSS tokens live in `frontend/src/index.css` (`:root`, `[data-theme="dark"]`, `[data-theme="light"]`); JS helper is `frontend/src/lib/platformChip.js`.

| Platform | Dark token | Light token | Source / confidence |
|---|---|---|---|
| Sleeper | `--color-platform-sleeper` `#1FA3E8` | `#0E6FB3` (deepened for AA on light surfaces) | No confirmed official hex found via public brand-color references. Kept the pre-existing approximation. **Revisit if Justin has Sleeper's actual brand kit.** |
| Yahoo | `--color-platform-yahoo` `#410093` | `#410093` (same — already AA-safe both ways) | Sourced from multiple independent public brand-color databases. High confidence. |
| ESPN | `--color-platform-espn` `#C81E2C` | `#C81E2C` (same) | Public references cite `#E52534` (Pantone Red 032C) as ESPN's brand red; deepened to `#C81E2C` because the lighter value only clears white-text AA contrast by ~0.02 (4.52:1 vs the 4.5:1 floor) once paired with this app's actual off-white text token — too thin a margin to ship. `#C81E2C` gives a ~5:1+ margin in both themes. |

Dark-mode-only `-chip` overrides (`--color-platform-yahoo-chip` `#A080C9`, `--color-platform-espn-chip` `#F2929A`) exist because Yahoo's and ESPN's brand hues are too low-luminance to read as small badge/icon text directly on the near-black dark surface — verified via hand contrast math, not just brand-hex copy-paste. Sleeper's blue is bright enough to use directly in both contexts.

Applied via `platformChipStyle(platform)` (tinted badge/icon: border + 14% tint background + colored text, used in `ConnectLeague.jsx` `PlatformIcon`, `Standings.jsx` and `LeagueStandings.jsx` `PlatformBadge`) and `platformButtonStyle(platform)` (solid fill + per-theme on-color, used on the primary "Connect Sleeper/Yahoo/ESPN" buttons in `ConnectLeague.jsx` and `PlatformConnections.jsx`). Secondary actions (Disconnect/Reconnect/Cancel) intentionally stay neutral ghost-style — only the primary connect action carries platform color, matching how "success" badges intentionally stay universal green rather than platform-colored (color is never the only differentiator; the platform name text is always present alongside the color).

Button shape/size were already unified pre-Phase-1.7 via shared `CTAButton`/`AccentButton` components — this phase changed color only, not shape.

### Confidence Gradient (Phase 1.8) — Resolved 2026-06-30

Rich dark red at 0% → rich dark green at 100%. CSS tokens live in `frontend/src/index.css` (`:root`, `[data-theme="dark"]`, `[data-theme="light"]` — all three share identical values, same pattern as the Phase 1.7 Yahoo/ESPN tokens); JS helper is `frontend/src/lib/confidenceGradient.js`.

| Stop | Token / value | Source |
|---|---|---|
| 0% | `--color-confidence-floor` `#701020` | Deep crimson, deliberately brightened from an initial `#5B1010` draft — the first pick measured 1.24:1 luminance contrast against the dark `--color-surface-1` track (`#1C1C1E`), effectively invisible at low scores. `#701020` improves that to 1.45:1. |
| 50% | (no fixed token) | Not a separate stop — emerges automatically from HSL interpolation between the floor and ceiling. |
| 100% | `--color-confidence-ceiling` `#206F3A` | Deep green, deeper than `--color-risk-low` in both themes. 2.75:1 against the dark track. |

**Implementation:** `color-mix(in hsl, var(--color-confidence-ceiling) <score>%, var(--color-confidence-floor))`, wrapped in `confidenceBarStyle(score)`. CSS `color-mix()`'s default hue interpolation takes the shorter arc — crimson (~350°) to green (~140°) passes through ~65° (amber/gold), so the 50% midpoint reliably renders amber (`#697018`-ish, verified via browser `color-mix` evaluation) without a manually-tuned token, satisfying the "amber midpoint via gradient interpolation" requirement.

**Known contrast tradeoff:** the floor color's 1.45:1 ratio against the darkest track (`--color-surface-1` in dark mode) is below the WCAG 1.4.11 non-text 3:1 guideline — pushing it brighter to clear 3:1 would require abandoning "deeper than risk-high," which the spec states explicitly. Mitigated by brand-system's "color is never the only differentiator" principle: both confidence bars always print the numeric score and label as text alongside the bar, so the bar itself is a supplementary, not sole, signal. The 50% amber midpoint and 100% green ceiling both clear or approach 3:1 (3.19:1 and 2.75:1 respectively); only the low-score crimson end is below threshold, and a low score is inherently a thin/near-empty bar regardless of color. Both modes use identical token values — already dark/saturated enough that light-mode contrast against white tracks is comfortably AA+ (5.3–11.8:1 measured).

Applied to the live Omen confidence bar (`OmenOfTheWeek.jsx` `ConfidenceBar`, replacing a 3-step `bg-amber-400`/`/60`/`bg-slate-600` hardcoded fill) and the Draft Assistant card confidence bar (`DraftAssistant.jsx` `ConfidenceBar`, replacing a 3-step `--color-team-accent` fill). `Omen.jsx`'s `ConfidenceMeter`/`bg-amber-400` bar was left untouched — confirmed dead code, not imported by any route.

### Metallic Tier (Phase 1.9)

Draft Assistant top-3 ordinal pills:

- #1: Antique gold (`--color-tier-gold` — distinct from `--color-accent`)
- #2: Brushed silver (`--color-tier-silver`)
- #3: Antique bronze (`--color-tier-bronze`)

These are surface treatments with subtle gradient + bevel, not flat fills. The Appearance page tile glyphs may also adopt a metallic treatment for the selected team's tile (Phase 1.9 add-on — Justin QA: "add some 3D effect or another visual treatment to those selections").

Resolved 2026-07-01 for Draft Assistant only: the card-header ordinal pill (the `rec.rank` circle in `RecommendationCard`) now uses `frontend/src/lib/metallicTier.js` with dedicated tier tokens in `frontend/src/index.css`. The `Omen #N` ADP-footer pill is unchanged — it's part of the locked "ADP / Omen #N footer" structure (see Approved Patterns #1), not the ordinal pill this phase targets. The optional Appearance-page selected-tile metallic add-on stays out of scope for this pass.

### Theme parity check (every page)

Before any Phase 1.4–1.12 PR lands, verify the page in both modes. Specific known drift sites from QA Part 2:

- Light-mode "Continue with Email" button renders olive/military gold — must use light-mode `--color-accent` (`#92740F`), not a faded variant.
- Light-mode CTAs (Go to Omen, Get Recommendation, Compare Trade) currently render teal/cyan — must use the appropriate token (team accent if accent-active page, light-mode `--color-accent` otherwise). Teal/cyan is not in the system.
- Dark-mode gold and light-mode gold are different tokens (`#B8952A` vs `#92740F`) for a reason — do not unify.

---

## Approved Patterns (carry forward, do not "improve")

Justin's green marks identified patterns that work:

1. **Draft Assistant result card structure** — Roster Fit pill + Risk pill (Low / Medium / Medium-High / High) + serif card title + Confidence label & bar + numbered rationale block + ADP / Omen #N footer. **Lock this layout.** Phase 1.6 only changes the chip color palette; Phase 1.8 only changes the confidence bar gradient; Phase 1.9 only adds metallic to the ordinal pill. Structure stays.
2. **Omen result title pattern** — "Strike the waiver wire" approved. Pattern: `<verb>` `<the target>`. Apply to all Omen states except offseason (Phase 1.10 rewrites offseason).
3. **Trade Analyzer Example "Accept" rationale block** — green checkmark + short upside sentence. Approved layout. Phase 1.4 fixed the font drift; Phase 1.10B (2026-06-25) replaced the banned headline copy. The block itself stays.
4. **Hall of Records connected badge + "Manage" link** — "Sleeper · darthslops" + Manage. Pattern approved. **Phase 1.7 (2026-06-30): N/A** — "Hall of Records" was retired and renamed to The Ledger (`Ledger.jsx`); that page carries no platform badge today, so there is nothing to recolor here.
5. **Nav drawer order and grouping** — Dashboard (Football) / Omen of the Week / The Ledger / Tools (Trade / Draft) / League (Standings / Connect) / Account / Sign out. Locked.
6. **"Continue with Google" / "Continue with Discord" outline button style** on Login — approved. The "Continue with Email" gold-filled button must reach parity with these (not the other way around — the OAuth buttons stay outlined).
7. **Position chip color direction RB=green, WR=blue** — confirmed approved in Trade Analyzer and Draft Assistant example screenshots.
8. **Step counter "STEP 2 OF 2" small-caps cyan above headline** on ConnectLeague — approved structural pattern; stays cyan. **Phase 1.7 (2026-06-30): N/A** — this single step covers all three platforms at once, not one platform at a time, so there's no single-platform context to shift the cyan to.

---

## Disapproved Patterns (do not repeat, fix where they appear)

Justin's red marks / X-outs identified patterns that fail. Track which Phase item resolves each.

1. ~~**Landing page Trade Analyzer Example headline "Know the move before you make it."**~~ — **Fixed Phase 1.10B (2026-06-25).** `Landing.jsx` now uses the primary marketing line; `OmenLanding.jsx` uses the approved alternate. Same banned line was also live on `/about`, not just `/` — both fixed together.
2. **`/omen` empty-state "No move clears the threshold"** — voice-flat for an offseason context. Copy drafted (`Blueprints/handoffs/2026-06-25-phase1-10a-ux-copy-options.md`, option A1: "Omen is resting.") but **not yet wired** — no backend status distinguishes "offseason" from the existing states today. See `Blueprints/handoffs/frontend-to-backend.md` request 2026-06-25. → **Phase 1.10B, blocked on a backend status addition.**
3. **`/draft` "Preview Mode — example recommendations" yellow banner** — **Decision 2026-06-25: keep.** Checked whether `/draft` is actually live before deciding: `DraftAssistant.jsx`'s submit handler never sends `adp_players` to `POST /api/draft-assistant/recommendations`, so the backend always falls through to `buildMockRecommendations()` — every response today returns fictional player names ("Sample RB1", "Mock WR Starter", etc.) regardless of platform connection or season. The banner is accurate; removing it would present fabricated names as live advice. Revisit once the `adp_players` wiring gap is fixed (flagged as a separate backlog item, not part of Phase 1.10).
4. **`/account` subscription card (Omen Pro / All features included)** — Omen is free this season; the card is dead UI. Hide entirely. → **Phase 2 backlog (pre-launch hygiene)**.
4a. ~~**`/account` destructive deletion not exposed**~~ — **Fixed Phase 2.9 (2026-07-04, local).** Account now has a Privacy subsection with an accessible confirmation dialog. The user must type `DELETE MY OMEN DATA` exactly; copy states the route removes Omen-stored data and does not change fantasy-platform or sign-in-provider data.
5. ~~**`/onboarding` success page "You're ready" treatment**~~ — **Fixed across Phases 1.4 / 1.10B / 1.12.** Font correction shipped 2026-06-16, approved success copy shipped 2026-06-25 ("You're set." / reads the matchup the moment your roster locks), and the remaining gray-paragraph contrast issue was corrected on 2026-07-02.
6. **Trade Analyzer Strategy section bullets ("Buy after one bad week", "Sell into the schedule", "Depth wins championships", "TE1 is a multiplier") + Mock Buy Low target list** — Justin's "SO SO" blue scribble = content does not earn its space. → **Phase 2 backlog** (Strategy + Buy Low rewrite via `slops-ux-copy`).
7. **Trade Analyzer entry form (Send / Pos dropdown / Name / Receive)** — Justin X'd the whole form. Wants positions-as-buttons, not dropdowns; redesign. → **Phase 2 backlog**.
8. **Selected-chip styling on `/draft` (PPR scoring + RB/WR position needs)** — the yellow box with red-X feel reads as broken. Selected state needs the team accent + filled treatment. → **Phase 1.6**.
9. **`/account` Connect Sleeper button** — different style from Connect Yahoo / Connect ESPN. → **Phase 1.7**.
10. **Light-mode olive-gold "Continue with Email" button** — wrong gold token. → **Phase 1.4** scope (color token misuse counts as propagation) or **Phase 1.7** if treated as platform-button consistency. Tag as Phase 1.4 unless palette work pulls it.
11. **Light-mode teal/cyan CTAs** (Go to Omen, Get Recommendation, Compare Trade) — token misuse. → **Phase 1.5** (accent sweep in both modes) and/or **Phase 1.7**.
12. ~~**Gray body text legibility**~~ — **Fixed Phase 1.12 (2026-07-02) for the live surfaces this note still maps to.** `/account/appearance` intro paragraph, `/standings` W-L/PF/PA columns, and `/onboarding` success copy now use AA-safe contrast in both modes. The older `/hall-of-records` username callout was documentation debt by closeout time: Hall of Records had already been retired to `/ledger`, and no live username column remained to fix.
13. ~~**`/standings` "DarthSlops · you" row**~~ — **Fixed Phase 1.12 (2026-07-02).** The current-user row now uses a stronger team-accent surface tint plus a left-edge accent treatment instead of the prior too-subtle emphasis.
14. **TE1 chip — "1" smaller than "TE"** — typography sizing rule violated. → **Phase 1.4**.

---

## Light / Dark Parity Checklist (every PR)

Before merging any Phase 1.4–1.12 PR:

1. Open the changed page in light mode. Screenshot. No teal CTAs. No olive-gold. No serif drift. Body grays clear WCAG AA against `--color-bg` light.
2. Open the same page in dark mode. Screenshot. Accent gold is `#B8952A`. Body bone-white `#F5F0E8`. No washed-out grays.
3. Both screenshots in the PR. The audit step (`slops-ui-ux-audit`) checks parity as a verdict gate.

---

## What this spec does NOT define (escalation triggers)

Stop and ask Justin if you encounter:

- A page or component not in the Page System Table.
- A token choice not in `omen-ux-ui-design-system-v1.md`.
- A new typeface request.
- A request to override the brand-system §2 "Do not use" list.
- A position color not in the Phase 1.6 chip palette table.
- A platform color not in the Phase 1.7 platform-brand-hex table.
- A request to put the team accent on body text, mock-data labels, or error states.
- Any change that would mix demo and real data without clear labeling.

---

## Phase 1.5g addendum — Motif / Moment posture (2026-06-22)

Add a sixth column to the Page System Table: **Motif / Moment posture**. Canonical grammar at `Blueprints/specs/team-motif-grammar.md`. Posture per route:

| Route | Motif / Moment posture |
|---|---|
| `/` | inert (no team context) |
| `/about` | inert |
| `/login` | inert |
| `/account/connect` | inert |
| `/onboarding` (Pick your look) | inert — motifs preview after team commit on `/account/appearance` (motif preview would render 32 motifs simultaneously, breaking the per-team identity-budget rule) |
| `/onboarding` (Welcome / Connect / Complete) | inert pending Phase 1.5 whole-app sweep |
| `/account` | motif: `page-edge` + `section-divider`; moment: eyebrow + tint |
| `/account/appearance` | motif: `page-edge` + `card`; moment: eyebrow only (preview surfaces stay neutral) |
| `/football` | motif: `section-divider`; moment: eyebrow + tint |
| `/omen` | motif: `page-edge` only (Omen card excluded by schema `excludesOmenCard: true`); moment: **never** |
| `/ledger` | motif: `section-divider`; moment: eyebrow + tint |
| `/standings` | motif: `section-divider`; moment: eyebrow only |
| `/trade` | motif: none; moment: **never** (trade result is a recommendation surface) |
| `/draft` | motif: `card`; moment: eyebrow only |
| `*` | inert |

Hard rules carried into Page System:
- The Omen card never carries a motif (Trust pillar — recommendation reads identically across teams).
- `/trade` and `/omen` never carry a culturalMoment overlay.
- Footer cultural-anchor citation is preserved; moment citation is **appended**, never substituted.
- Mock/live: a culturalMoment with `mockBadge.required: true` never renders against live data; the moment is suppressed entirely, the badge is not shown alone.

---

## Changelog

- **2026-06-22** — Phase 1.5g.0 addendum landed (Motif / Moment posture column). Canonical grammar at `Blueprints/specs/team-motif-grammar.md`.
- **2026-06-15** — v1 landed (Phase 1.3). Derived from QA Part 2 markdown + 17 screenshots (light + dark mobile Safari). Stamped against `SKILL_ROUTING.md@2026-06-15` and `current_sprint.md@2026-06-15`.
