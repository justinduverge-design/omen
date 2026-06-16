# Corvus Page System

**Status:** v1 — landed 2026-06-15 (Phase 1.3)
**Layer:** 2 (Corvus)
**Author:** Claude
**Source evidence:** `Brand/brand-system.md`, `Blueprints/specs/corvus-ux-ui-design-system-v1.md`, Justin's QA Part 2 markdown (2026-06), 17 annotated screenshots (2026-06-14 mobile Safari, light + dark).
**Verified against:** `SKILL_ROUTING.md@2026-06-15`, `current_sprint.md@2026-06-15`.
**Authoring guardrails used:** `design:design-system`, `ui-ux-pro-max` (design-intelligence library).
**Subsequent audit guardrail:** `slops-ui-ux-audit` (verdict on each Phase 1.4–1.12 PR).

---

## Purpose

This file is the **contract** every visual change in Phase 1.4 through Phase 1.12 must satisfy. The brand system says *what Corvus feels like in the abstract*; the design system v1 says *what tokens and components exist*; this page system says *how each individual page must use them*, per surface, per mode.

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

### Typography (canonical reference: `corvus-ux-ui-design-system-v1.md` §Typography)

Headlines and brand display: **Alegreya Sans**. Body text and longer reading copy: **Alegreya**. UI labels, buttons, inputs, nav, meta, table cells, and chip text use **Alegreya Sans**. No other typefaces. **Do not use Cormorant Garamond**; it is rejected for Corvus. Both approved Alegreya faces are loaded in `frontend/src/index.css`; verify the font imports resolve before declaring a page font-fixed.

A page header in `<h1>` is always Alegreya Sans 600 at 30–36px. A card headline (`<h2>` / `<h3>` inside a content card) is Alegreya Sans 600 at 20–24px. The Omen recommendation title is Alegreya Sans 600 at 24px. The TE1 chip "1" character must be at the same size as the position glyph (Justin QA: "should the '1' be at least the same size as 'TE'?" — yes).

### Color (canonical reference: `corvus-ux-ui-design-system-v1.md` §Color System)

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
| `/` | `Landing.jsx` | Alegreya Sans hero "Less guessing. Better moves." (primary marketing line) + Alegreya Sans card headlines | Accent inert (no team theme on public landing) | "Less guessing. Better moves." OR "See the move before the league does." | **Needs Phase 1.4** (font drift) + **Phase 1.10** (Trade Analyzer Example uses banned line "Know the move before you make it." — replace with approved line) |
| `/corvus` | `CorvusLanding.jsx` | Same as `/` | Accent inert | Same | Same |
| `/login` | `Login.jsx` | Alegreya Sans headline "Your best call, every time." (current page line). Body in Alegreya. | Accent inert | "Your best call, every time." (current — approved) | **Needs Phase 1.4** (font drift, gold inconsistency in light mode — see Disapproved Patterns) |
| `/onboarding` | `Onboarding.jsx` | Alegreya Sans success headline. Body in Alegreya. | Accent inert | **Rewrite "You're ready" via `slops-ux-copy`** (Phase 1.10) — current copy is functional but voice-flat and font-misapplied | **Needs Phase 1.4** + **Phase 1.10** |
| `/account/connect` | `ConnectLeague.jsx` | Alegreya Sans "Connect Your League" headline. Body in Alegreya. | Accent inert (pre-team) | "Corvus needs your league to find your Most Valuable Play." (current — approved) | **Needs Phase 1.4** (font drift) + **Phase 1.7** (platform tiles must use Sleeper blue / Yahoo purple / ESPN red prominently — currently tinted, must be louder) |
| `/account` | `Account.jsx` | Alegreya Sans page title "Account". Section headers Alegreya Sans. Body in Alegreya. | **Accent active** — header underline / focus rings should reflect team color | Alegreya Sans "Account" + section labels — TE1 sizing rule applies to any pill text | **Needs Phase 1.4** (Account + Team Theme in wrong font) + **Phase 1.5** (team accent missing) + **Phase 1.7** (Connect Sleeper/Yahoo/ESPN button-style inconsistency) + Phase 2 backlog (subscription card removal for free era) |
| `/account/appearance` | `TeamTheme.jsx` | Alegreya Sans "Your team." headline. Tile glyphs in Alegreya Sans at parity sizes. | **Accent active** — selected tile shows outline in team accent, "Selected: Miami Dolphins" footer in team accent | "Corvus borrows your team's colors for accents — recommendations, confidence, the call to act. Nothing more. The reads stay neutral." (current — approved) | **Needs Phase 1.4** (Your team. + team name in wrong font) + **Phase 1.5** (32-team accent contrast sweep) + **Phase 1.9** (tile glyph treatment — add subtle 3D / metallic per Justin QA) |
| `/football` | `Football.jsx` | Alegreya Sans page section headers. Body/content blocks in Alegreya. Dashboard summary labels in Alegreya Sans. | **Accent active** — section accents + active tab underline | Alegreya Sans section headers; subhead "Your dashboard. Your call." TBD via `slops-ux-copy` if needed | **Needs Phase 1.4** + **Phase 1.5** + **Phase 1.10** (kill "Preview Mode — example recommendations" yellow banner — see Disapproved Patterns) |
| `/omen` | `OmenPage.jsx` | Alegreya Sans "Omen of the Week" headline. Alegreya Sans recommendation title. Body in Alegreya. | **Accent active** — header rule, CTA, confidence-fill use team accent in confidence range high | **Offseason voice anchor** (Phase 1.10) — current "No move clears the threshold" is too flat; rewrite to "resting / calibrating / meditating for the next Omen." 3 options to Justin via `slops-ux-copy`. | **Needs Phase 1.4** + **Phase 1.5** + **Phase 1.8** (confidence gradient endpoints) + **Phase 1.10** (offseason copy) + **Phase 1.11** (mock-roster fixtures so visuals can be tested) |
| `/ledger` | `Ledger.jsx` | Alegreya Sans "Your Season Record" headline. Empty-state phrase "No moves yet." in Alegreya Sans. Body in Alegreya. | **Accent active** — header rule + "Go to Omen" CTA | "Every move Corvus called. Whether you followed it. Whether it worked." (current — approved) | **Needs Phase 1.4** + **Phase 1.5** + **Phase 1.11** (mock previous-results fixtures) |
| `/standings` | `Standings.jsx` | Alegreya Sans "Standings" headline. Table cells in Alegreya Sans. | **Accent active** — header rule, "you" row highlight in team accent | "Where every manager sits after the last whistle." (current — approved) | **Needs Phase 1.4** + **Phase 1.5** + **Phase 1.7** (platform badge — Sleeper blue / Yahoo purple / ESPN red) + **Phase 1.12** (W-L / PF / PA column legibility; "DarthSlops · you" row distinct treatment) |
| `/trade` | `TradeAnalyzer.jsx` | Alegreya Sans page title + result card title. Body in Alegreya. | **Accent active** — Compare Trade CTA in team accent; result accept/reject pills in team accent + risk hue | "Depth wins championships" copy revision (Phase 2 backlog rewrites Strategy section) | **Needs Phase 1.4** + **Phase 1.5** + **Phase 1.6** (position chip palette) + Phase 2 backlog (form redesign — positions as buttons, multi-team support, "Depth wins championships" body rewrite) |
| `/draft` | `DraftAssistant.jsx` | Alegreya Sans page title "Your next pick". Card headlines Alegreya Sans. Body in Alegreya. | **Accent active** — Get Recommendation CTA in team accent | "Tell Corvus where you are in your draft. It will surface the best available move for your roster." (current — approved) | **Needs Phase 1.4** + **Phase 1.5** + **Phase 1.6** (position chips — RB green, WR blue confirmed; add QB / TE / DEF / K; selected-state styling) + **Phase 1.9** (top-3 metallic 1=gold, 2=silver, 3=bronze) + **Phase 1.10** (kill Preview Mode banner) + **Phase 1.11** (mock-draft fixtures) |
| `*` | `NotFound.jsx` | Alegreya Sans headline. Body in Alegreya. | Accent inert | "Off the map." (current — verify) | **Needs Phase 1.4** if drift present |

`/dev/omen` is a dev-only harness and is excluded from this spec.

---

## Component Rules

### Team Accent Token (Phase 1.5)

The user's selected team theme exposes `--color-team-accent` and (where defined) `--color-team-accent-secondary`. Every page in the Page System Table flagged "Accent active" consumes the token. Rules:

- The accent appears on: primary CTAs, focus rings, active tab underline, "you" row highlight in standings, selected-tile outline in `/account/appearance`, header rule on page titles, and the Omen recommendation accept-button background.
- The accent never appears on: body text, risk red, confidence red endpoint, mock data labels, error states, or platform brand badges (those carry their platform colors, not the user's team accent).
- **Reads stay neutral** (per Justin's approved Appearance page copy). When in doubt, the reads (data / numbers / recommendation explanation) stay in `--color-text-primary`, not the accent.
- The sweep is whole-app (Phase 1.5 scope is the *entire app*, not just QA-flagged surfaces — locked in prior planning chat).
- 32-team contrast sweep: each team's accent vs `--color-bg` (dark) and `--color-bg` (light) must clear WCAG AA. The team-themes table will mark any team with <AA contrast and require a secondary accent for that team. Guardrail: `ui-ux-pro-max` accent-contrast pattern library.

### Position Chip Palette (Phase 1.6)

Confirmed direction (from approved Draft Assistant + Trade Analyzer Example screenshots):

| Position | Chip color | Notes |
|---|---|---|
| RB | Green (`--color-pos-rb`) | Confirmed in approved screenshots |
| WR | Blue (`--color-pos-wr`) | Confirmed in approved screenshots |
| QB | TBD via `ui-ux-pro-max` palette library | Must distinguish from team accents; suggest amber or rust |
| TE | TBD via `ui-ux-pro-max` palette library | Suggest violet (echoes Omen) or teal |
| DEF / DST | TBD | Distinct hue — needed for leagues that draft defensive players |
| K | TBD | Distinct hue — desaturate to keep visual weight low |
| FLEX | Neutral — `--color-text-secondary` | Not a position; do not assign a hue |

Selected-state styling (currently broken — QA red-X on selected PPR + selected position-needs) must be a clear filled state distinct from unselected outline; the selected state inherits the team accent, not the position color.

Color-blind distinguishability is a hard requirement — RB green / WR blue must remain distinguishable under deuteranopia and protanopia. Guardrail: `ui-ux-pro-max` color-blind validation patterns.

### Platform Brand Color Emphasis (Phase 1.7)

| Platform | Hex (verify with `ui-ux-pro-max` cross-check) | Use sites |
|---|---|---|
| Sleeper | Sleeper blue (`#1FA3E8` approx — verify) | Connect tile, Standings platform badge, league switcher chip, success badge |
| Yahoo | Yahoo purple (`#6E2E89` approx — verify) | Same set of sites |
| ESPN | ESPN red (`#D00` approx — verify) | Same set of sites |

The colors are present on the Connect tiles today but not loud enough (QA: the colors must be "prominent," not subtle). Button-style consistency across the three rows on `/account` is required — currently Sleeper / Yahoo / ESPN connect buttons render differently. Pick one button shape + size and apply uniformly. Guardrail: `ui-ux-pro-max` platform-brand-hex cross-check before committing exact values.

### Confidence Gradient (Phase 1.8)

Rich dark red at 0% → rich dark green at 100%. Linear interpolation in HSL, not RGB. Endpoints:

- 0%: `--color-confidence-floor` — rich dark crimson (deeper than `--color-risk-high`)
- 50%: amber midpoint via `ui-ux-pro-max` gradient interpolation
- 100%: rich dark green (deeper than `--color-risk-low`)

The bar must read at all three example confidence levels seen in approved Draft Assistant screenshots (84%, 77%, 66% — all currently gold; fix to gradient). Both modes — light mode endpoints are darker variants of the same hues, not lighter washes.

### Metallic Tier (Phase 1.9)

Draft Assistant top-3 ordinal pills:

- #1: Antique gold (`--color-tier-gold` — distinct from `--color-accent`)
- #2: Brushed silver (`--color-tier-silver`)
- #3: Antique bronze (`--color-tier-bronze`)

These are surface treatments with subtle gradient + bevel, not flat fills. The Appearance page tile glyphs may also adopt a metallic treatment for the selected team's tile (Phase 1.9 add-on — Justin QA: "add some 3D effect or another visual treatment to those selections").

### Theme parity check (every page)

Before any Phase 1.4–1.12 PR lands, verify the page in both modes. Specific known drift sites from QA Part 2:

- Light-mode "Continue with Email" button renders olive/military gold — must use light-mode `--color-accent` (`#92740F`), not a faded variant.
- Light-mode CTAs (Go to Corvus, Get Recommendation, Compare Trade) currently render teal/cyan — must use the appropriate token (team accent if accent-active page, light-mode `--color-accent` otherwise). Teal/cyan is not in the system.
- Dark-mode gold and light-mode gold are different tokens (`#B8952A` vs `#92740F`) for a reason — do not unify.

---

## Approved Patterns (carry forward, do not "improve")

Justin's green marks identified patterns that work:

1. **Draft Assistant result card structure** — Roster Fit pill + Risk pill (Low / Medium / Medium-High / High) + serif card title + Confidence label & bar + numbered rationale block + ADP / Corvus #N footer. **Lock this layout.** Phase 1.6 only changes the chip color palette; Phase 1.8 only changes the confidence bar gradient; Phase 1.9 only adds metallic to the ordinal pill. Structure stays.
2. **Omen result title pattern** — "Strike the waiver wire" approved. Pattern: `<verb>` `<the target>`. Apply to all Omen states except offseason (Phase 1.10 rewrites offseason).
3. **Trade Analyzer Example "Accept" rationale block** — green checkmark + short upside sentence. Approved layout. Phase 1.4 fixes the font drift; Phase 1.10 may rewrite the banned headline copy. The block itself stays.
4. **Hall of Records connected badge + "Manage" link** — "Sleeper · darthslops" + Manage. Pattern approved. Phase 1.7 makes the Sleeper text Sleeper-blue; nothing else changes.
5. **Nav drawer order and grouping** — Dashboard (Football) / Omen of the Week / The Ledger / Tools (Trade / Draft) / League (Standings / Connect) / Account / Sign out. Locked.
6. **"Continue with Google" / "Continue with Discord" outline button style** on Login — approved. The "Continue with Email" gold-filled button must reach parity with these (not the other way around — the OAuth buttons stay outlined).
7. **Position chip color direction RB=green, WR=blue** — confirmed approved in Trade Analyzer and Draft Assistant example screenshots.
8. **Step counter "STEP 2 OF 2" small-caps cyan above headline** on ConnectLeague — approved structural pattern; Phase 1.7 may shift the cyan to platform color when the step is about a specific platform.

---

## Disapproved Patterns (do not repeat, fix where they appear)

Justin's red marks / X-outs identified patterns that fail. Track which Phase item resolves each.

1. **Landing page Trade Analyzer Example headline "Know the move before you make it."** — brand-system §2 explicitly forbids this line. Replace with primary marketing line "Less guessing. Better moves." or approved alternate "See the move before the league does." → **Phase 1.10**.
2. **`/omen` empty-state "No move clears the threshold"** — voice-flat for an offseason context. Rewrite to resting/calibrating/meditating idiom. → **Phase 1.10** (3 options via `slops-ux-copy`).
3. **`/draft` "Preview Mode — example recommendations" yellow banner** — hides Justin's signal that he doesn't want a "preview" label here; the demo experience belongs to Phase 1.11 / Phase 2.7 (Demo Mode UI), not a banner on the live page. Remove. → **Phase 1.10**.
4. **`/account` subscription card (Corvus Pro / All features included)** — Corvus is free this season; the card is dead UI. Hide entirely. → **Phase 2 backlog (pre-launch hygiene)**.
5. **`/onboarding` success page "You're ready" treatment** — copy + serif applied wrong, gray paragraph illegible. → **Phase 1.4** (font) + **Phase 1.10** (copy) + **Phase 1.12** (gray contrast).
6. **Trade Analyzer Strategy section bullets ("Buy after one bad week", "Sell into the schedule", "Depth wins championships", "TE1 is a multiplier") + Mock Buy Low target list** — Justin's "SO SO" blue scribble = content does not earn its space. → **Phase 2 backlog** (Strategy + Buy Low rewrite via `slops-ux-copy`).
7. **Trade Analyzer entry form (Send / Pos dropdown / Name / Receive)** — Justin X'd the whole form. Wants positions-as-buttons, not dropdowns; redesign. → **Phase 2 backlog**.
8. **Selected-chip styling on `/draft` (PPR scoring + RB/WR position needs)** — the yellow box with red-X feel reads as broken. Selected state needs the team accent + filled treatment. → **Phase 1.6**.
9. **`/account` Connect Sleeper button** — different style from Connect Yahoo / Connect ESPN. → **Phase 1.7**.
10. **Light-mode olive-gold "Continue with Email" button** — wrong gold token. → **Phase 1.4** scope (color token misuse counts as propagation) or **Phase 1.7** if treated as platform-button consistency. Tag as Phase 1.4 unless palette work pulls it.
11. **Light-mode teal/cyan CTAs** (Go to Corvus, Get Recommendation, Compare Trade) — token misuse. → **Phase 1.5** (accent sweep in both modes) and/or **Phase 1.7**.
12. **Gray body text legibility** — `/account/appearance` paragraph, `/standings` W-L/PF/PA columns, `/hall-of-records` username — too low contrast. → **Phase 1.12**.
13. **`/standings` "DarthSlops · you" row** — current cyan underline too subtle. Highlight in team accent, distinct row background. → **Phase 1.12**.
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
- A token choice not in `corvus-ux-ui-design-system-v1.md`.
- A new typeface request.
- A request to override the brand-system §2 "Do not use" list.
- A position color not in the Phase 1.6 chip palette table.
- A platform color not in the Phase 1.7 platform-brand-hex table.
- A request to put the team accent on body text, mock-data labels, or error states.
- Any change that would mix demo and real data without clear labeling.

---

## Changelog

- **2026-06-15** — v1 landed (Phase 1.3). Derived from QA Part 2 markdown + 17 screenshots (light + dark mobile Safari). Stamped against `SKILL_ROUTING.md@2026-06-15` and `current_sprint.md@2026-06-15`.
