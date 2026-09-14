# Omen Native Design-System Registry v1 (M0b)

**Status:** **Approved M0b contract** (Justin, 2026-07-19)
**Date:** 2026-07-19
**Owner:** Native mobile foundation
**Purpose:** The single reviewable registry of tokens, components, accessibility rules, theme packs, and platform-specific implementation rules for the native iPhone (SwiftUI) and Android (Kotlin/Compose) apps.
**Applies to:** SwiftUI iPhone app and Kotlin/Jetpack Compose Android app.
**Companions:** `omen-native-mobile-foundation-v1.md` (v1, 2026-07-19), `omen-native-design-house-v1.md` (v1, 2026-07-19), `omen-mobile-onboarding-connection-contract-v1.md` (**Approved**, 2026-07-19), `omen-native-agent-capabilities-canvas-v1.md` (v1, 2026-07-19).
**Grounded in existing web design authority:** `Blueprints/specs/design/component-lock-v1.md` (locked web component grammar), `Blueprints/specs/omen-ux-ui-design-system-v1.md` (base palette hexes + dark/light token names — the CSS in `frontend/src/index.css` is the source of truth), `Brand/brand-system.md`.

> **Figma reality (reconciled 2026-07-20, updated 2026-07-20 post-M1-P approval):** the official Design House (`mWjrAKPi4JSIP5lAmGAtB3`) contains governed foundation boards: `02 — Tokens & Themes` node `13:2`, `03 — Components` node `14:2`, iOS app-shell contract node `17:12`, and Android app-shell contract node `17:13`. The M1-P Figma screen-contract pass is now built and approved (Justin, 2026-07-20): the `01 — Principles & References` evidence board is node `23:2`; the three approved `03 — Components` proposals are `25:2` (Context Strip), `25:26` (Matchup Spine), and `25:50` (Evidence Disclosure) — see §3.2. Low-fi screen contracts, golden-screen pairs, and QA & evidence entries live on pages `04 — iOS Screens`, `05 — Android Screens`, and `06 — QA & Evidence`; see `Blueprints/handoffs/2026-07-20-m1p-figma-reference-and-proposals.md`. Markdown remains the behavioral/governance source of truth. See `m1-figma-screen-contract-pass-v1.md`.

---

## 0. Altitude — what M0b is and is not

- **M0b (this doc)** establishes the **inventory + token map + platform rules**: which tokens exist, what each component is, its variants/states, which tokens it reads, and how it maps to iOS/Android. It is a contract, not code.
- **M1** writes the per-component **build briefs** (anatomy, exact SwiftUI/Compose APIs, evidence) for the smallest foundation set.
- **M0c** owns the **auth/API/state** contract (deferred from M0a).

No SwiftUI or Compose component is built from this doc directly; M1 briefs are the build inputs.

## 1. Design principle (inherited, non-negotiable)

One Omen identity, two native expressions. Same tokens, hierarchy, state honesty, and accessibility bar; each platform renders with its own native controls (SwiftUI/HIG on iPhone, Compose/Material 3 on Android). Decision first, evidence second, status never hidden, **color is never the only carrier of meaning** (fan-experience data-legibility invariant).

---

## 2. Token registry

Tokens are **semantic names**, never raw colors in a screen. The native token names mirror the existing web `--color-*` contract so web, SwiftUI, and Compose stay one system. Each token must be expressed in three places: this Markdown (source of truth), a SwiftUI token file, and a Kotlin/Compose token file.

### 2.1 Layering model

| Layer | Meaning | May a theme pack change it? |
|---|---|---|
| **Core semantic** | stable role meaning (text, surface, border, focus, success, risk, disabled) | rarely — role meaning stays stable |
| **Brand expression** | Omen atmosphere (accent, glow, hero lighting, metallic highlight) | yes, by approved pack |
| **Component alias** | component role (decision-card surface, primary-button fill, connection panel) | controlled |
| **Provider identity** | ESPN, Sleeper, Yahoo brand marks and chip fills | **never** — D8 |
| **Named exception** | Platinum, on favourite and selection marks only | **never** — see below |
| **Data-semantic** | risk, data-source, confidence, position | **invariant in meaning, not in colour.** The state must always be unambiguous. Its carrier may be form — fill, weight, border, glyph, wording — rather than hue. A pack may not change what a state *means*, may not remove its carrier, and may not make two states indistinguishable. |
| **Theme pack / campaign** | bounded visual mode (Core, Blackout, Whiteout, Playoff Gold) | yes, bounded/temporary |
| **Team identity** | future per-team skin | not in MVP; must never replace risk/status meaning |

> **Amendment 01, 2026-09-13 (D7).** The original row read "never" for the whole data-semantic
> family and is narrowed here. This is not permission to drop the state — §1's rule that *colour is
> never the only carrier of meaning* now runs in the other direction as well: under D7 the
> non-colour carrier is frequently the **only** carrier, which raises rather than lowers the bar on
> it. Every treatment in §2.3 is mandatory, and a state shipped without its carrier is a P0.

> **Platinum is a named exception (founder, 2026-09-13).** `platinum` — `#C7CBD1` dark, `#69707B`
> light — is the one brand-expression colour besides brass permitted in app chrome, and it is
> scoped to **favourite and selection marks only: never text, never borders, never a fill.** It
> exists so a starred team reads as *marked* rather than as a second call-to-action, which brass
> would imply. Its chroma is nearly nil, so it does not compete with brass for attention.
>
> **Both platforms.** It shipped on iOS first and was carried in
> `scripts/check-token-parity.js` `KNOWN_SINGLE_PLATFORM` as a legitimate single-platform absence.
> That entry is removed when the Android value lands; until then the exception is ratified in
> spec and pending in code, which is the opposite of the usual drift and is recorded here so it is
> not mistaken for one.

### 2.2 Core semantic tokens (concrete values from `index.css`)

| Token | Role | Dark (default) | Light / system — WITHDRAWN 2026-09-13 (D1) |
|---|---|---|---|
| `bg` | app background (smoky grey / warm parchment) | `#1F1F1D` | `#F1EDE4` |
| `surface-1` | card/panel (smoke / warm white) | `#2A2A27` | `#FFFDF9` |
| `surface-2` | elevated surface | `#343431` | `#F6F1E7` |
| `surface-3` | inset / hover | `#3F3F3B` | `#E9E1D2` |
| `border` | standard border — **control boundary, 3:1 floor** | `#8A8272` | `#8F7B5F` |
| `border-subtle` | decorative hairline (never a control's only edge) | `#3A3A36` | `#DCD1BA` |
| `text-primary` | primary text (Bone White) | `#F5F0E8` | `#1C1917` |
| `text-secondary` | secondary text | `#BDB5A9` | `#5C5248` |
| `text-tertiary` | muted / placeholder | `#A79E90` | `#6B6052` |
| `accent` | brand CTA (Aged Brass, lifted for the smoky ground) | `#C4933B` | `#7A5C1E` |
| `accent-hover` | accent pressed/hover | `#D8A648` | `#A67C2E` |
| `accent-muted` | low-emphasis accent fill | `#3A2A0A` | `#F6E7BE` |
| `text-on-accent` | foreground on accent surfaces | `#14140F` | `#FFFDF9` |
| `omen` | AI-signal accent (Verdigris) — **WITHDRAWN 2026-09-13 (D7)**, marketing only | `#2F7D5B` | `#1A5C3E` |
| `umber` | brown-metal depth | `#5A3A25` | `#5A3A25` |
| `focus-ring` | focus indicator (accent @ 40%) | derived from `accent` | derived from `accent` |
| `platinum` | favourite / selection mark **only** (§2.1 named exception) | `#C7CBD1` | `#69707B` |
| `fill-ring` | hairline that gives any sub-3:1 fill its silhouette | `rgba(245,240,232,.38)` | — |

> **Dark-only, 2026-09-13 (D1).** Omen native ships one scheme until team schemes or seasonal packs
> exist. `OmenLightColors` and `lightDataSemantics` are removed from `OmenColor.kt`; the scheme
> selector returns `OmenDarkColors` unconditionally; `android:theme` and `UIUserInterfaceStyle` are
> set to dark so system chrome matches. **`OmenColorScheme` stays a data class** — collapsing it to
> constants would make the packs in §2.1 expensive to reintroduce, which is the whole reason the
> indirection exists. The Light column above is **withdrawn, not deleted**: its values are the
> starting point when Whiteout or a seasonal pack returns.

> **The fill-ring rule, 2026-09-13.** Provider colour and risk colour are the only hues left in the
> app, and several of their fills are darker than the surface behind them. Yahoo `#410093` measures
> **1.29:1** against `bg #1F1F1D` — the fill is the same value as the ground, so only the white
> lettering renders and the chip loses its silhouette. ESPN is 2.40:1, Sleeper 3.12:1, and
> `risk-high #7E1717` is 1.59:1. Lifting any of them abandons the sourced brand hex or the brand
> crimson, which defeats the point of keeping them.
>
> **So the rule is uniform and has no exceptions: any fill measuring under 3:1 against its ground
> carries `fill-ring`.** At `.38` the ring composites to `#777570` over `surface-1` (**3.13:1**) and
> to `#AB6966` over `risk-high` (**3.89:1** against `bg`), clearing WCAG 1.4.11's non-text floor in
> both cases. `OmenColorContrastTest` asserts **the ring, not the fill**, is what separates the
> object from its ground — and asserts the ratio, not the alpha, so the value can be tuned without
> weakening the guarantee.
>
> **Corrected 2026-09-13 by the accessibility pass.** The first draft specified `.22`, which
> composites to `#575651` over `surface-1` and measures **1.96:1** — too faint to restore the
> silhouette it was written to restore.

**Smoky grey dark mode, 2026-09-11 (founder call, same day).** Justin, on seeing the warm
light ramp: "what if instead of, like, full dark mode, like, black, what if we go, like,
almost gray, like a smoky gray? I know that's changing stuff that's, like, fundamental."
This is a **brand identity move and it is the founder's to make** — the standing design grant
explicitly reserves it. Recorded here because it supersedes the "Raven Black `#0A0A0B` =
`bg`" reading of Brand/brand-system.md for the native apps; the brand doc's palette row is
unchanged and Raven Black remains the logo/marketing ground.

`bg` moves `#0A0A0B` → `#1F1F1D`, surfaces stepping `#2A2A27 / #343431 / #3F3F3B`. This is
the **shallow** end of smoke, deliberately. Depth was chosen against the brand colours rather
than by eye: Omen's two signature colours are dark and saturated, so a lighter ground
*converges* with them. Measured against candidate depths —

| on ground | `#0A0A0B` (was) | `#1F1F1D` (shipped) | `#2A2A27` | `#33332F` |
|---|---|---|---|---|
| Yahoo `#410093` | 1.55 | 1.29 | 1.13 | 1.01 |
| Crimson `#7E1717` | 1.91 | 1.59 | 1.39 | 1.22 |
| `accent` (pre-lift) | 5.22 | 4.35 | 3.80 | 3.35 |

At the deep end crimson and Yahoo are *the same colour as the background*. So brass lifted to
`#C4933B` and verdigris to `#4FAE81` to hold AA on the lighter ground — same hues carried up,
not new colours — and anything darker than shallow smoke is off the table without also
abandoning the brand hexes.

**The standing rule that falls out of this:** crimson and verdigris are **fills, not ink.**
As text they converge with any ground Omen would plausibly use. Reversed out — Bone White on
crimson is 9.15:1 — they are among the strongest elements available. Founder wants more of
both on screen; the way to get it is crimson and verdigris *blocks and surfaces*, never
crimson and verdigris lettering. Not yet done: that is a composition change across screens,
tracked separately.

**Platform chips changed treatment, not colour (§2.3 intact).** The filter chips drew the raw
brand hex as a label over a 15% wash of itself, which put Yahoo `#410093` at **1.33:1** on
`surface1` and ESPN at 3.47:1 — an invisible filter control that shipped. A sourced brand hex
is the one value that must not be tuned for legibility, so the treatment changed instead:
platform tones now fill with the brand and reverse the label to white. Yahoo is 12.76:1, ESPN
6.88:1, Sleeper 5.30:1, and every brand hex is exactly as sourced in
`Blueprints/handoffs/2026-06-30-phase1-7-platform-brand-colors-handoff.md`. Selection keeps a
non-colour carrier (✓ glyph plus a brass ring the unselected state does not draw).

**Correction on the record:** the Yahoo constraint was described in-session as a Yahoo *API
contract*. It is not — it is a brand-accuracy sourcing decision from the 2026-06-30 handoff.
Self-imposed, not externally binding. The practical answer is the same, but a future session
should not treat it as a legal obligation.

Dark ratios after the move, against `bg / surface-1 / surface-2`: `text-primary` 14.55 /
12.69 / 11.01 · `text-secondary` 8.13 / 7.09 / 6.15 · `text-tertiary` 6.24 / 5.44 / 4.72 ·
`accent` 5.96 / 5.20 / 4.51 · `omen-chip` 6.06 / 5.28 / 4.58 · `border` 4.34 / 3.78 / 3.28.

**Warm neutral ramp, 2026-09-11 (Claude, standing design grant).** Founder, 2026-09-10:
"it's lacking colour in light mode, maybe we use more of the approved colours." The light ramp
was Tailwind's cold grey — `#FAFAF9 / #FFFFFF / #F5F5F4` separated by `#E5E5E3`, with
blue-grey `#6B7280` / `#9CA3AF` text fighting a brass-and-umber brand on every screen. The
neutrals are now derived from the approved core (Bone White `#F5F0E8`, Weathered Umber
`#5A3A25`) rather than from a generic grey scale: a parchment ground, a warm-white card that
actually lifts off it, and umber-tinted borders and muted text. No brand hex was replaced —
`accent`, `omen`, `umber` and the data-semantic layer are untouched.

Dark got the same treatment where it was safe to: `bg` and `surface-1` keep their brand-named
Raven Black and Charcoal hexes, while the *derived* neutrals (`surface-2`, `surface-3`,
`border`, `border-subtle`, `text-secondary`, `text-tertiary`) warm to match. One identity, two
themes, same job.

`border` changed role as well as value. It is the entire visible boundary of `OmenTextField`,
`OmenPicker`, `OmenOtpCodeField`, the secondary/destructive `OmenButton` outlines and
Material's `outline` via the bridge — and it shipped at **1.08:1** on `bg` in light and
2.25:1 in dark, failing WCAG 1.4.11's 3:1 for non-text UI. It now clears 3:1 against `bg`,
`surface-1` and `surface-2` in both themes. `border-subtle` keeps the old decorative job and
is explicitly *not* held to that floor. **Known residual:** `border` is 2.90:1 on dark
`surface-3` and 3.13:1 on light `surface-3`; no control is drawn on `surface-3` today (it is a
progress/confidence track, a disabled container, and the neutral badge fill), so this is
recorded rather than fixed.

Light `risk-low` and `risk-medium` moved too, under the light-override this table's §2.3 row
already permits: `#16A34A` and `#D97706` were 3.24:1 and 3.14:1 on the old white `surface-1`
and are read as chip text. They are now `#13702F` (6.10:1) and `#8F4A09` (6.56:1). The tier
*meanings* are unchanged and every tier still carries its text label, so §2.3's invariant
holds.

Ratios, light, against `bg / surface-1 / surface-2 / surface-3`:
`text-primary` 14.97 / 17.21 / 15.54 / 13.46 · `text-secondary` 6.52 / 7.50 / 6.77 / 5.87 ·
`text-tertiary` 5.26 / 6.04 / 5.45 / — · `accent` 5.32 / 6.12 / 5.52 / 4.79 ·
`omen` 6.80 / 7.82 / 7.05 / 6.11 · `border` 3.48 / 4.00 / 3.61 / 3.13.
Dark: `text-primary` 17.44 / 15.00 / 12.94 / 10.72 · `text-secondary` 8.92 / 7.67 / 6.62 /
5.48 · `text-tertiary` 6.37 / 5.47 / 4.72 / — · `border` 4.71 / 4.05 / 3.50 / 2.90.
`text-on-accent` on `accent` is 6.12 light, 5.22 dark; `text-primary` on `accent-muted` is
14.23 light, 12.22 dark.

These are enforced, not asserted in prose: `OmenColorContrastTest` computes them from the
token values, and was proven to go red against the shipped hexes before being trusted.

*(`--color-focus-ring` is referenced by the web component lock but absent from `index.css` tokens (Jules Button note). The registry names it as a **semantic** token — `focus-ring`, not "gold outline" — so each platform expresses focus appropriately. M1 must add it with an AA-visible value in both themes. **Non-color requirement (Justin, 2026-07-19):** focus/selection must be conveyed by a **visible outline plus platform-native focus/selection behavior**, never by the brass color alone — so it works for low-vision users. See §4.)*

**Semantic color meaning — amended 2026-09-13 (D2, D7).** Under brass-led, the app carries
**two** brand hues, not three:

- **brass (`accent`) = attention, action and outcome.** A CTA, a claim, a net gain. **Never danger** —
  that separation is the only thing that keeps a single accent legible.
- **crimson (`risk-high` / `risk-medium`) = risk.** A fill, never ink. Never chrome.

**verdigris (`omen`) is withdrawn from the app** and keeps its meaning only in
`Brand/brand-system.md` for marketing. The original of this paragraph read *"verdigris (`omen`) =
ready / healthy / active signal"* and assigned it a live role; D7 removed it. Ready / healthy /
active is now carried by the `Live` mark in §2.3 — an `accent` dot in a halo beside a
`text-primary` label.

These meanings stay fixed; team skins are a **future customization layer, not a foundation**, and
may never repurpose them.

### 2.3 Data-semantic tokens — provider identity by colour, risk by block, all else by form

**Amended 2026-09-13 (D7, as revised by the founder the same day).** The families below used to be
six rows of hues. D7 removed them from the app in favour of form. The founder then restored risk
colour specifically — *"I want the risk colours but they gotta be tasteful"* — so risk is the one
family that keeps a hue, under the constraints below.

**Retained by colour.**

| Family | Tokens | Note |
|---|---|---|
| Platform brand | `platform-sleeper #1FA3E8`, `platform-yahoo #410093`, `platform-espn #C81E2C`; chip legibility overrides `platform-sleeper-chip #0F70B0`, `platform-yahoo-chip #410093`, `platform-espn-chip #B21826`; `on-platform-sleeper/yahoo/espn #FFFFFF` | never on button chrome; lives on PlatformBadge; chip fills tuned for WCAG AA (>=4.5:1) against white. **Every chip carries `fill-ring`** — see §2.2. |
| Risk | `risk-high #7E1717`, `risk-medium #4A1818` | **fills, never ink.** See the risk table below. `risk-low` has no token: absence is the state. |

**Leaving the app token set** — `omen`, `omen-chip`, `data-live/stub/mock/unavailable`,
`confidence-floor/ceiling`, `pos-*`, `demo-text`, `demo-text-secondary`. They remain in
`Brand/brand-system.md` for marketing.

**"Leaving", not "removed" — the distinction is load-bearing.** This table states the target
state of the token set. It is **not** authority to delete these values from `OmenColor.kt` or
`OmenColor.swift` today. `data-stub` and `data-mock` are held by the ship-order gate at the foot of
this section and come out only in a commit that also lands their replacement carriers. The rest
come out under `U2`. A spec row is not a delete order.

**Risk — one hue, two weights, plus absence.**

| Tier | Carrier | Treatment | Measured |
|---|---|---|---|
| **low** | type | `text-tertiary`, uppercase label, no container, no colour | — |
| **medium** | muted fill | `risk-medium #4A1818` fill, `text-primary` ink, `fill-ring`, no glyph | ink **12.90:1** |
| **high** | fill + glyph + wording | `risk-high #7E1717` fill, `text-primary` ink, `fill-ring`, leading `▲`, and the label **names the risk** ("Hamstring — game-time call"), never the word "high" alone | ink **9.15:1**, ring **3.89:1** vs `bg` |

> **Why the block is the colour.** Crimson cannot carry a marker drawn *on* a surface. `#7E1717`
> measures **1.02:1** against `surface-3` — literally the same value — and every lightness that
> clears the 3:1 non-text floor there has stopped being crimson (`#DA6250` reaches only 2.94:1 and
> is already coral). This is the registry's own standing rule from §2.2: **crimson and verdigris are
> fills, not ink.** Reversed out, crimson is among the strongest elements available.
>
> **Why there is no amber.** A muted amber for the medium tier measures 4.92:1 on `surface-1`
> against brass's 5.20:1 — near-identical. §4.1 of the visual lock fixes brass as *action and
> outcome, never danger*, and that separation is the only thing making a single accent legible. An
> amber danger chip beside a brass CTA dissolves it. The medium tier takes the quieter crimson
> instead, and the step from muted block to solid block reads as severity more clearly than three
> tints would.
>
> **Tasteful is a frequency claim as much as a chroma one.** One hue, two weights, appearing only
> where a glance must land. Three tiers of tint is the pastel set the accessibility audit already
> flagged as appearing in no design document.

**All other states carry form, not hue.**

| State | Carrier | Treatment |
|---|---|---|
| Live | mark | `accent` dot in a `rgba(196,147,59,.2)` halo, beside a `text-primary` label |
| Position | type | uppercase `text-tertiary` label beside the player name |
| Confidence | band | `Confident / Leaning / Coin flip`, a 14×2px `accent` rule preceding the word. **No numeral, no bar, no gradient** |
| Data source · live | fill | solid `surface-3`, `text-primary` |
| Data source · stub / mock / sample | outline + hatch | dashed `border` plus a 45° `rgba(245,240,232,.06)` hatch |
| Data source · unavailable | strike | `text-tertiary`, struck through, hairline outline |
| Evidence · not read | dashed underline | `text-tertiary`, dashed underline, 3px offset — *no source exists* |
| Provenance · self-reported | dotted underline | `text-secondary`, **dotted** underline, 3px offset — *a source exists and it is the user* |

> **Not-read and self-reported must not share a carrier.** The first says Omen has no data; the
> second says Omen has data it cannot verify. Those are opposite claims, and the published canvas
> draws both as a dashed underline. Dashed stays with the data-source family (provisional data);
> self-reported provenance moves to **dotted**. The Ledger rule that self-reported rows are never
> blended with verified ones cannot hold if the two look the same.

> **Ship order is not optional.** The data-source treatments are safety-bearing: `AGENT.md` requires
> mock data to be clearly labelled and never presented as live advice, and colour was doing that
> job. **`data-stub` and `data-mock` may not be deleted from `OmenColor.kt` or `OmenColor.swift` in
> any commit that does not also land the hatch and dashed treatments as locked components.** A
> commit that removes the colour first leaves mock data visually identical to live data — a P0, not
> a cosmetic regression.

**Rule:** team theming, moment overlays and theme packs run in surfaces, accents, chip fills and
chant frames. They may not touch provider identity or risk at all, and may not weaken any carrier in
the tables above.

### 2.4 Typography tokens

> **Wix Madefor, founder decision 2026-09-12 (D3), reaffirmed 2026-09-13.** One superfamily, two
> optical cuts: **Wix Madefor Display** (400/500/600/700/800) for headings, scores and tab labels;
> **Wix Madefor Text** (400/500/600/700) for body, reasoning, labels and metadata. SIL Open Font
> License 1.1, committed with `OFL.txt` intact under `core/designsystem/src/main/res/font/` and
> `mobile/ios/OmenIOS/OmenIOS/Fonts`.
>
> This supersedes the Alegreya Sans / Alegreya / DM Mono split of 2026-07-19 **and** the
> single-family Alegreya Sans decision of 2026-09-07. Two cuts of one superfamily under one licence
> is not a return to the three-family split, and must not be read as permission to reintroduce one.
>
> **Alegreya Sans is out.** Three weights currently ship as real `.ttf` on both platforms
> (`mobile/ios/OmenIOS/OmenIOS/Fonts/`, `mobile/android/core/designsystem/src/main/res/font/`).
> They are replaced, not kept as a fallback — a fallback family is a third family by another name.

**The ramp — resolved 2026-09-13 (C7, founder: the canvas wins).**

```
10 · 11 · 12 · 13 · 14 · 15 · 16 · 18 · 20 · 22 · 24 · 27 · 32 · 48
```

Fourteen steps. 1px at the small end, where legibility differences are fine-grained, widening as
size grows. **The floor is 10.** Nothing below it ships, at any weight, in any case.

| Role | Font | Size / Line | Weight | Use |
|---|---|---|---|---|
| `display` | Display | 48/56 | 800 | Marketing hero only, one per screen |
| `h1` | Display | 32/40 | 800 | Product screen hero title |
| `score-lead` | Display | 27/28 | 800, `tnum` | Scoreboard — leading score |
| `call` | Display | 24/26 | 800 | The Omen call. The only thing at this size in the app |
| `score-trail` | Display | 22/24 | 800, `tnum` | Scoreboard — trailing score |
| `screen-title` | Display | 22/26 | 800 | Screen title in the header |
| `h2` | Display | 20/26 | 700 | Card titles, quiet-state headline |
| `h3` | Display | 18/24 | 700 | Sub-section headers, verdict headline |
| `body` | Text | 15/22 | 400 | Body copy |
| `card-lead` | Display | 14/18 | 700 | Card lead line |
| `name` | Text | 13/16 | 700 | Player and team names, switcher |
| `body-sm` | Text | 12/17 | 400 | Reasoning copy, meta, secondary |
| `label` | Text | 11/14 | 700 (+0.12em, upper) | Labels, chips, badges |
| `micro` | Text | 10/13 | 800 (+0.16em, upper) | Eyebrows, dividers, section rules |
| `numeric` | Display | contextual | 800, `tnum` | Any columnar value |

**Role split (Amendment 01):** Display = headings, scores, tab labels, the Omen call. Text = body,
reasoning, labels, metadata. Preserve the hierarchy through platform font-fallback; all roles scale
with Dynamic Type and Android font scale.

> **How C7 was resolved, 2026-09-13.** Amendment 01 named ten roles with `chip` 11/14 at the floor.
> The approved canvas needed four roles that table did not have — scoreboard leading and trailing,
> the Omen call, the screen title — and ran below its floor. **The founder's call: the canvas wins,
> and the registry grows to fit it.**
>
> **What the audit of the canvas actually found is why this needed a scale and not four new rows.**
> `design/native-visual-lock-2026-09-13/README.md` fixes nine sizes and instructs readers to treat
> anything off that list as a defect. The CSS in those same files runs **twenty-two** distinct sizes
> — 27, 24, 22, 21, 19, 18, 17, 15, 14, 13.5, 13, 12.8, 12.5, 12.3, 12.2, 12, 11.5, 11, 10.5, 10,
> 9.5, 9. The canvas was already violating its own rule thirteen times over, and a scale that a
> document breaks while asserting it is not a scale.
>
> The ramp above consolidates all twenty-two into fourteen named roles. **Every canvas value moves by
> at most 1px**, and only two move at all in a way anyone could see: `21 → 22` on the screen title
> and `9 → 10` on the smallest labels. The second of those is the accessibility floor, not a
> rounding.
>
> **Why 10 and not 11.** Amendment 01 put the floor at `chip` 11. Holding it would have moved five
> distinct sizes and cost vertical room on three screens that D11 requires not to scroll. 10 is
> defensible as a floor for uppercase tracked labels with a 13px line box; 8 and 8.5, which the
> canvas shipped, are not defensible at any weight.

**Wix Madefor has a real 600.** The SemiBold-declared-against-Bold workaround in
`OmenTypography.kt` and `OmenTypography.swift`, written because Alegreya Sans ships no 600, is
**deleted rather than ported**. Verify against a rendered screen that 600 resolves as 600 before
assuming parity with the approved artboards.

**iOS: PostScript names differ from file names.** Verify with a build, not by inspection. This is
the failure that went unnoticed for the whole life of the three-family seam.

`numeric` keeps tabular alignment via `tnum` / `.monospacedDigit()`, which works on any font — **do
not reintroduce a mono family to fix column alignment.** Cormorant Garamond, Cinzel, Inter and
DM Mono remain retired.

### 2.5 Spacing scale

**Replaced 2026-09-13 (founder).** The previous scale was `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`
with "no ad-hoc values."

**New scale — base-2 modular:**

```
2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 96
```

Every value is `2 × n`. It doubles cleanly along `2 → 4 → 8 → 16 → 32 → 64`, and every value at or
above 16 stays on the old 4/8 grid, so nothing already built to the previous scale moves.

**Why it changed.** The old scale's steps below 16 were 4, 8, 12 — too coarse for a 390pt phone on
which two screens must render with nothing below the fold. The density that buys the D11 no-scroll
constraint lives in the 6–14 range, and a scale that skips 6, 10 and 14 forces every card to round
up and costs the fold. The approved canvas runs on 7, 9, 10, 11, 13 and 14; under the old scale
**every screen built from it was a spec violation by default**, which is a sign the scale was wrong,
not that the screens were.

Snapping the canvas to this scale moves 7→8, 9→10, 11→12 and 13→14 — one pixel each, imperceptible,
and it makes every value checkable.

Rhythm (unchanged in intent, re-expressed on the new steps): card interior 24; header→body 16;
body→footer 24; section stack 48; hero→first section 32; field→field 16; label→input 8; input→hint
4; chip interior 6/10; inline gap 10.

iOS expresses these as spacing constants; Android as `dp` spacing tokens. **No ad-hoc values** — the
rule survives the rescale; only the vocabulary widened.

### 2.6 Cross-platform token expression rule

Every token above exists as: (a) this Markdown row, (b) a SwiftUI definition (e.g. `OmenColor.surface1`), (c) a Compose definition (e.g. `OmenTheme.color.surface1`). Feature modules read tokens only — no raw hex, no shadow tokens, no local primitive copies (foundation §9).

---

## 3. Component registry

Two levels: **Foundation** (generic primitives) and **Omen composition** (product components). Each row names variants, required states, key token aliases, and the native control each platform maps to. Per-component anatomy/APIs are M1 build briefs.

> **⚠️ Token columns below predate Amendment 01 and are not yet reconciled, 2026-09-13.** Several
> rows name tokens §2.3 withdrew: the `omen` tone on **Button**, **Card / Surface** and **Chip**;
> `data-*` and `pos-*` on **Badge** and **Chip**; and the confidence "value tokens" on **Meter**,
> which §2.3 replaces with a band and no gradient.
>
> **These rows are deliberately not edited here.** Component APIs are owned by
> `Blueprints/specs/design/component-lock-v1.md`, and Amendment 01 lists that file as carrying its
> own obligation; rewriting the columns in this registry first would put two half-reconciled
> component contracts in the repo at once. Sequenced as **C2 → U2** in
> `omen-native-contract-work-v1.md`.
>
> `risk-high` and `risk-medium` references stay valid — risk kept its hue (§2.3). `data-stub` and
> `data-mock` references also stay valid **and stay in the code**, because the §2.3 ship-order gate
> forbids deleting them before the hatch and dashed treatments land as locked components.

### 3.1 Foundation components

| Component | Variants | Required states | Key tokens | iOS (SwiftUI) | Android (Compose) |
|---|---|---|---|---|---|
| **Button** | primary, secondary, tertiary, danger, link; sizes sm/md/lg; tones accent/omen | default, hover/press, focus, disabled, loading | `accent`, `accent-hover`, `text-on-accent`, `omen`, `risk-high`, `border`, `focus-ring` | `Button` + role styling; `.borderedProminent`/`.bordered`/`.plain` | `Button`/`FilledTonalButton`/`OutlinedButton`/`TextButton` |
| **IconButton** | accent, neutral, danger; sm/md/lg | default, press, focus, disabled | `accent`, `text-primary`, `focus-ring` | `Button` w/ `Label` icon-only + a11y label | `IconButton` + `contentDescription` |
| **TextField** | text/email/number/password; sizes sm/md/lg; state default/error/success | default, focus, error, success, disabled | `surface-1`, `border`, `border-hover`, `text-primary`, `text-tertiary`, `risk-high`, `focus-ring` | `TextField`/`SecureField` | `OutlinedTextField` |
| **Textarea** | sizes | same as TextField | same as TextField | `TextField(axis:.vertical)` | multi-line `OutlinedTextField` |
| **Picker/Select** | inline, menu | default, disabled, error | `surface-1`, `border`, `text-primary` | `Picker`/`Menu` | `ExposedDropdownMenuBox` |
| **FormField** | label+hint+error wrapper | default, error, success | `text-secondary`, `risk-high` | composed | composed |
| **Card / Surface** | solid, outlined, empty, error, preview; tones neutral/omen/risk | n/a (container) | `surface-1`, `border`, `border-subtle`, `risk-high` | container view + material | `Card`/`Surface`/`OutlinedCard` |
| **Alert** | info, success, warning, error | n/a | tone tokens | inline banner view | Material banner/`Card` |
| **Badge** | success, neutral, risk, data-* tones | n/a | `data-*`, `risk-*` (15% opacity fills for AA) | `Text` capsule | `Badge`/`AssistChip` (display) |
| **Chip** | position, platform, mode, **omen**; interactive/display | default, selected, disabled | `chip` type, position/platform tokens, `accent` (omen) | capsule `Label` | `FilterChip`/`AssistChip` |
| **SegmentedControl** | sizes sm/md/lg | default, selected, disabled | `accent`, `text-on-accent`, `surface-1`, `border` | `Picker(.segmented)` | `SegmentedButton` (M3) |
| **TabNav** | underline | default, active | `accent`, `text-primary` | `TabView`/custom underline | `TabRow` |
| **RadioCardGroup** | title+description cards | default, selected, disabled | `surface-1`, `accent`, `border` | selectable cards | `Card` + `selectable` |
| **Modal / Sheet** | sheet, full-screen, drawer | present, dismiss | `surface-1`, `bg` | `.sheet`/`.fullScreenCover` | `ModalBottomSheet`/dialog |
| **ConfirmationDialog** | default, destructive | present, dismiss | `risk-high` for destructive | `.confirmationDialog` | `AlertDialog` |
| **Tooltip / Help** | hover/press, keyboard | show/hide | `surface-2`, `text-primary` | `.popover`/help affordance | `PlainTooltip`/`RichTooltip` |
| **ListRow** | default, interactive, leading/trailing | default, press, disabled | `surface-1`, `border-subtle`, `text-primary` | `List` row | `ListItem` |
| **Meter** | linear | value, empty | value tokens | `Gauge`/`ProgressView` | `LinearProgressIndicator`/custom |
| **Stepper** | numeric | value, min, max, disabled | `surface-1`, `accent` | `Stepper` | custom stepper |
| **State surfaces** | Empty, Loading, Error, Disconnected, Stale, Mock | the state itself | `border` (dashed empty), `risk-high` (error), `data-mock`/`data-stub` (mock/stale) | composed views + `ProgressView` | composed + `CircularProgressIndicator` |

**Chip tones, and why `omen` exists (added 2026-09-04) — SUPERSEDED 2026-09-13 (D7).**

> The `omen` chip tone drew on verdigris, which D7 withdrew from the app. The **problem** this note
> describes is still real and still unsolved: Omen's own controls — **All**, **+ Add League**, the
> **Waiver / Ledger / Pulse** tabs — are neither a position nor a provider, and borrowing a platform
> tone for them reads as a fourth provider. Under brass-led the answer is **brass**, which is what
> the switcher contract's Verdigris `Add league` control also becomes (see the contract audit).
> Read the reasoning below; do not read the token.

The tone set was position
(`rb`/`wr`/`qb`/`te`/`def`/`k`), platform (`sleeper`/`yahoo`/`espn`) and `demo` — every one of
them *means* something about the thing it labels. Omen's own controls had no tone: **All**,
**+ Add League**, and the **Waiver / Ledger / Pulse** tabs are not a position and not a
provider. Borrowing a platform tone for those reads as a fourth provider, so they needed one of
their own.

It shipped for one build as `neutral`, drawn from `text-secondary`, and that was **wrong on a
device**: five grey chips beside a red ESPN and a blue Sleeper made Omen's own controls look
like the disabled ones. Grey is not a neutral choice on this screen, it is an absent one. The
tone now draws from `accent`, putting Omen's brass on Omen's controls, and provider chips keep
their platform colours — that is how a user finds their ESPN team in a row of six.

**Chips are filters OR actions, never both in one row.** `+ Add League` shipped for one build
as a trailing chip inside the provider filter row and was pulled back out: the provider chips
change *what you are looking at*, and Add League changes *what you have*. In one row the latter
reads as a fourth filter. Actions get their own row above the filters.

**State surface rule:** Empty ≠ Error ≠ Loading ≠ Disconnected ≠ Stale ≠ Mock — six distinct treatments, each with honest copy (never "Loading…", never a dead dashboard). Loading uses contextual copy ("Analyzing your matchup…"). Reduced-motion swaps spinners for a static state.

### 3.2 Omen compositions (product components)

| Composition | Purpose | Key data fields | Required states | Built from |
|---|---|---|---|---|
| **DecisionBrief** | the core recommendation surface: verdict, recommendation, confidence, risk, impact, reasoning, input honesty, alternatives, feedback slot | verdict, move, impact, confidence, risk, explanation, signals, alternatives | success, empty, loading, error, disconnected, stale, mock, off-season | Card, MetricStrip, ConfidenceBar, RiskPanel, SignalList, Button |
| **OmenRecommendationCard** | single-move card inside DecisionBrief / lists | title, move, confidence, risk | success, mock | Card, Badge, ConfidenceBar |
| **TradeResultCard** | trade verdict output | sides, verdict, delta, confidence | success, empty, error, mock | Card, MetricStrip, PlayerRow |
| **ShareResultPanel** | shareable trade/verdict summary | safe summary only | default | Card (no cookie/PII in payload) |
| **LeagueCarousel** | Command Center's league pager — provider filter chips over one swipeable matchup card per followed league; the rested-on page becomes the active league | followed leagues, per-league matchup, active league | loading, loaded, empty, error, demo; per-page loading/loaded/unavailable | Chip (platform + neutral), MatchupHero, PlatformBadge, StateSurface |
| **WidgetPager** | Waiver / Ledger / Pulse as one paged widget behind a labelled tab row | the three section states | whatever each section carries | Chip (neutral) tabs + the three existing sections |
| **TeamPicker** | one horizontal row of the user's teams on Omen / Trade / League; tap makes one active | followed leagues, active league | hidden below two leagues; committing | Chip (platform tones) |
| **PlayerRow / PlayerChip** | player identity in rows/inline | name, team, position, meta | default, selected, disabled | ListRow/Chip, position tokens |
| **PlayerCompareCard** | side-by-side player compare | two players, metrics | default, empty | Card, MetricStrip |
| **MetricStrip** | labeled metric row w/ deltas | metrics, delta, confidence | default, empty | Text, ConfidenceBar, Tooltip |
| **ConfidenceBar** | 0–100 score as bar + text | score, label | default | Meter + confidence gradient + label |
| **RiskPanel** | risk level + reasons | level, reasons[] | default | Badge (risk) + reason text |
| **SignalList** | data-source honesty list | signals[] w/ live/stub/mock | default, mock | Badge (data-*) rows |
| **PlatformBadge** | provider identity | platform | default | Badge + platform tokens |
| **ConnectionStatusBadge** | connection state | connected/disconnected/reauth/recovery | all connection states | Badge + status tokens |
| **PlatformConnectionCard** | provider connect/recover card | platform, status, action | connected, disconnected, error, pending, recovery | Card, PlatformBadge, ConnectionStatusBadge, Button |
| **StepGuide** | guided connection steps | steps[] | default, active-step | ListRow, Badge |
| **MarketingHero** | public/onboarding hero | promise, CTAs | default | display type, CTAGroup |
| **CTAGroup** | grouped calls to action | actions[] | default | Button set |
| **Context Strip** | persistent selected team/league/platform strip + switcher entry point | team, league, platform, switch control | connected, recovery/reconnect-required, empty, multi-team-in-league | ListRow-style container + `.sheet` (iOS) / `ModalBottomSheet` (Android) |
| **Matchup Spine** | Omen-owned vertical head-to-head layout for the Matchup Hero | selected team, opponent, scores/records, one What to Watch signal | before games, live, final, no matchup/off-season (+ narrow-width rail collapse) | Card + numeric (DM Mono) type role |
| **Evidence Disclosure** | collapsed answer-first recommendation that expands to categorized evidence on demand | verdict/move, compact comparison rows, categorized evidence (league fact, player/game fact, current status, Omen inference, limitation) | clear decision, close decision, player unavailable, incomplete data, games started, off-season | Card + inline/`.sheet` (iOS) or inline/`ModalBottomSheet` (Android) expansion |

**Context Strip, Matchup Spine, and Evidence Disclosure approved 2026-07-20 (Justin)** via the M1-P Figma screen-contract pass proposals (Figma `03 — Components`, nodes `25:2`/`25:26`/`25:50` in `mWjrAKPi4JSIP5lAmGAtB3`). Full anatomy, variants/states, tokens, accessibility, and iOS/Android expression are documented on those Figma boards and in `Blueprints/handoffs/2026-07-20-m1p-figma-reference-and-proposals.md`; this table row is the registry pointer, not a restatement.

**Canonical product promise wired into MarketingHero / Welcome:** "See the move before the league does." (Justin, 2026-07-19.)

New composition patterns must be proposed on Figma `03 — Components` before appearing in an iOS/Android screen (capability canvas §6).

**M4 screen assemblies (2026-07-22).** Feature screens that combine approved primitives + P3 compositions live at the app/feature layer, not in `:core:designsystem` — the DS module stays product-agnostic. The first such assembly is:

- **OmenCommandCenterScreen** — signed-in landing surface. Android: `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/feature/commandcenter/OmenCommandCenterScreen.kt`. iOS: `mobile/ios/OmenIOS/OmenIOS/App/CommandCenter/OmenCommandCenterScreen.swift`. Approved screen assembly, not a design-system component; not added to §3.1 or §3.2.

**v1.1 corrective (2026-07-23) — hierarchy per mobile-visual-briefs §1.1**: OmenCommandCenterScreen orients and prioritizes the selected roster's week; it does NOT duplicate Omen's full decision workspace. The full DecisionBrief lives on the Omen destination, not Command Center. v1.1 hierarchy: header (title + profile control) → OmenContextStrip → OmenMatchupHero → Waiver Watch placeholder → Ledger preview placeholder → League Pulse placeholder. Waiver Watch / Ledger preview / League Pulse remain Figma-first follow-ups (sprint items M4-CC-WaiverWatch, M4-CC-LedgerPreview, M4-CC-LeaguePulse) because no approved §3.2 Figma proposal exists yet.

**§3.2 compositions implemented in the v1.1 corrective pass:**

- **Context Strip** (Figma node `25:2`, approved 2026-07-20) — `OmenContextStrip` at `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenContextStrip.kt` and `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenContextStrip.swift`. Four states: selected, needs-recovery, empty, multi-team-hint. Reusable across future screens that need the persistent selection strip.
- **Matchup Spine** (Figma node `25:26`, approved 2026-07-20) — `OmenMatchupHero` at the matching DS paths. Four temporal states: before-games, live, final, no-matchup. Narrow-width rail collapse via `BoxWithConstraints`/`GeometryReader`. Reusable.

**P4 enforcement (2026-07-21).** Feature and app-shell code must compose the approved `Omen*` primitives above and MUST NOT clone raw platform primitives. The rule is enforced by two source-scanning tests that run in the standard test task:

- Android — `mobile/android/core/designsystem/src/test/kotlin/com/slopssaloon/omen/core/designsystem/enforcement/PrimitiveEnforcementTest.kt` scans `mobile/android/app/src/main/kotlin/**` (and any future `mobile/android/feature/**`) and fails on raw `androidx.compose.material3.Button`/`Card`/`TextField`/`AlertDialog`/`Chip` imports or raw `Color(0xNNNNNNNN)` literals.
- iOS — `mobile/ios/OmenIOS/OmenIOSTests/PrimitiveEnforcementTests.swift` scans `mobile/ios/OmenIOS/OmenIOS/App/**` and fails on raw SwiftUI `Button(`/`TextField(`/`SecureField(`/`Alert(`/`TextEditor(` call sites or raw `Color(red:|hue:|hex:|0x|"asset")` literals.

Both tests keep an explicit `ALLOWLISTED_FILES` / `allowlistedRelativePaths` list; each entry must document why and when it retires. Adding a file is a design-steward decision, not a build fix. Gallery evidence lives at `mobile/android/core/designsystem/src/debug/kotlin/.../gallery/DesignSystemGalleryActivity.kt` and `mobile/ios/OmenIOS/OmenIOS/DesignSystem/DesignSystemGalleryView.swift` (both debug-only).

---

## 4. Accessibility rules (apply to every component)

- **Contrast:** text and essential UI meet WCAG **AA**. Color is expressive, never the sole carrier — risk/status/data always carry a text label or icon too.
- **Touch targets:** minimum **44pt** (iOS) / **48dp** (Android). Button `lg` = 44px is the hero/primary size on mobile.
- **Focus & selection (non-color):** every focusable/selectable element shows a **visible outline plus native focus/selection behavior** (iOS focus engine / accessibility focus, Android focus + state layers). Focus must never be signaled by the brass `focus-ring` color alone — it must remain perceivable for low-vision and high-contrast users. Selected state carries a shape/weight/checkmark change in addition to color.
- **Dynamic Type / font scale:** all type roles scale; layouts reflow, no clipped text.
- **VoiceOver / TalkBack:** every interactive element has a label and correct role; logical focus order; state (selected/disabled/loading) is announced.
- **Reduce motion:** honor Reduce Motion / animator-duration-scale; spinners and transitions have static equivalents.
- **Reduce transparency (iOS):** Liquid Glass surfaces fall back to opaque system material.
- **Errors:** honest, actionable, and programmatically associated with their field.

---

## 5. Theme packs

- **Shipped in MVP:** Core Omen **dark** (default) and Core Omen **light/system**. Both must pass AA and cross-platform parity before anything else.
- **Architected, not yet built:** Blackout, Whiteout, Playoff Gold, Rivalry Crimson, Draft Night — bounded, temporary, may alter only brand-expression + controlled component-alias tokens.
- **Team skins:** out of MVP; a separate future decision. A theme pack may never override the data-semantic invariant layer (§2.3).
- Do not build any pack beyond the two core modes until core screens pass accessibility and parity (foundation §4, design-house §5).

---

## 6. Platform-specific implementation rules

### 6.1 iPhone — Apple-native
- SwiftUI navigation stacks, sheets, confirmation dialogs, pickers, lists; prefer system components over hand-built clones.
- **Sign in with Apple** first; required whenever a third-party login is also offered (App Store 4.8) — per approved M0a.
- **Liquid Glass** only at system-chrome/control boundaries (tab bars, navigation/toolbars, compact action groups, search, transient sheets). Never under dense DecisionBrief content, provider data, errors, or recovery. Honor Reduce Transparency with an opaque fallback.
- Respect safe areas, Dynamic Type, VoiceOver, reduce motion, and iOS back/swipe.

### 6.2 Android — Google-native
- Jetpack Compose + Material 3 as the behavioral baseline; Android back behavior, adaptive navigation, system bars, TalkBack.
- **Credential Manager (Sign in with Google)**; legacy Google Sign-In SDK banned — per approved M0a.
- **Dynamic color is not auto-adopted** where it would weaken Omen brand/status meaning; Omen tokens and hierarchy win.
- Bottom navigation for stable top-level destinations; rail/large-screen adaptation when justified.

### 6.3 Navigation (shared map, native expression)
Top-level: **Command Center, Omen, Trade, League**. Draft is a strong **seasonal** destination reached through League and promoted from Command Center when relevant; it is not a permanent tab. Account is reached through a contextual profile/avatar control, not top-level navigation. Provider connection, player detail, confirmation, filtering, and recovery are nested flows or sheets. iOS = tab bar + stacks + sheets; Android = bottom navigation + Compose navigation + platform back. M0c and `omen-mobile-visual-briefs-v1.md` are authoritative for this map.

---

## 7. Reconciliations — RESOLVED (Justin, 2026-07-19)

1. **`focus-ring` token:** ✅ approved. Add as a **semantic** token in M1 with a **non-color requirement** — visible outline + native focus/selection behavior, never brass-alone (see §2.2 note, §4 Focus & selection).
2. **Font stack:** ✅ locked to **Alegreya Sans (UI/headings/controls) / Alegreya (reading) / DM Mono (numeric)**; hierarchy preserved through accessibility fallback; Cinzel/Inter must not be revived (§2.4).
3. **Team tokens:** ✅ **omitted** from the phone MVP. Semantic colors stay stable — brass = attention, verdigris = ready/healthy, crimson = risk/recovery. Team skins are a future customization layer (§2.2 semantic-meaning note, §5).
4. **Registry scope:** ✅ M0b answers *what components exist, what states they have, and how iOS/Android differ*; M1 creates the small SwiftUI/Compose build briefs.

## 8. What M0b does NOT cover

- Per-component anatomy, exact SwiftUI/Compose APIs, and evidence → **M1**.
- Auth/session/provider-state API and deep links → **M0c**.
- Motion/animation spec beyond reduce-motion rule → later.
- Additional Figma reference annotations, component proposals, and screen contracts → `m1-figma-screen-contract-pass-v1.md`; no unapproved component pattern may bypass that pass.

## 9. Evidence

- Grounded in: `component-lock-v1.md`, `omen-ux-ui-design-system-v1.md` (palette/type/tokens), `Brand/brand-system.md`, foundation §4–5, design-house §5/§8, and the approved M0a contract.
- Token values transcribed from the `index.css` dark/light blocks documented in `omen-ux-ui-design-system-v1.md` (CSS is source of truth; M1 verifies against live CSS).
- Figma access confirmed (`whoami`); Design House currently a stub (`00 — Start Here`).
- No app code, deploy, secret, schema, Figma permission, or provider behavior touched.


---

## Amendment — 2026-08-31: DM Mono is retired, app-wide — **SUPERSEDED 2026-09-13**

> **⚠️ SUPERSEDED by Registry Amendment 01 (D3, Wix Madefor).** This block is retained as
> provenance, not as instruction. It names **Alegreya Sans + Alegreya** as the locked families;
> both are retired. The live type decision is §2.4 above — **Wix Madefor Display + Text**. Read this
> block only for the reasoning on why tracking and case, not a third typeface, separate the
> `eyebrow` / `chip` / `numeric` roles — that reasoning still holds and carries forward.
>
> Between 2026-08-31 and 2026-09-13 this file carried **three** live type decisions at once: the
> §2.4 three-family table, this two-family amendment, and the one-family decision of 2026-09-07 that
> reached the code but never reached this document. A reader who stopped at the first table got the
> wrong answer for six weeks.

**Founder decision (2026-08-31, superseded).** The locked family list is now **Alegreya Sans** (UI, headings, controls,
labels, chips, eyebrows, numerics) and **Alegreya** (longer reading copy). **DM Mono is removed from
the app entirely** — every page, every section, every surface, both platforms and web. This
supersedes the 2026-07-19 three-family role split in §2.4, the `eyebrow` / `chip` / `numeric` rows,
the Matchup Spine's type note, and the §2.4 lock item.

**Roles keep their identity without the third family.** `eyebrow` stays uppercase with its +0.12em
tracking, `chip` stays uppercase at +0.10em, `numeric` stays medium-weight — all in Alegreya Sans.
The tracking and case, not the typeface, are what separated them.

**Tabular digits survive.** `numeric` carries `tabularNumbers: true` and renders through
`.monospacedDigit()`, which works on **any** font. Standings columns, scores, and metric values stay
aligned in Alegreya Sans. Dropping the mono face costs the mono *look*, not the alignment — do not
reintroduce a mono family to "fix" column alignment.

**This aligns native to web, it does not diverge from it.** `frontend/src/index.css` contains no
mono face; `page-system.md` already states Alegreya Sans and Alegreya with "No other typefaces."
Native was the surface carrying the third family.

**Implementation:** `OmenFontDesign.dmMono` and its three role references in
`mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenTypography.swift`, plus the Android equivalent. Queued
as `W2-Typography` in Wave 2 (the design-system and accessibility wave), not applied ad hoc.

**Still locked:** Cormorant Garamond, Cinzel, and Inter must not be revived.


---

## Amendment 01 — 2026-09-13: dark-only, brass-led, Wix Madefor, risk restored

**Applied from** `Blueprints/specs/mobile/omen-registry-amendment-01.md`, which carries the full
drafting rationale. **Authority:** founder decisions D1–D8 of 2026-09-12
(`omen-native-visual-lock-v1.md`), plus four founder calls of 2026-09-13 recorded below.

**Sections changed:** §2.1, §2.2, §2.3, §2.4, §2.5.

### What the amendment specified, applied as written

| # | Change | Section |
|---|---|---|
| D1 | Dark-only. Light column withdrawn, values retained for future packs. | §2.2 |
| D3 | Wix Madefor Display + Text replaces Alegreya Sans. | §2.4 |
| D6 | Smoky grey `#1F1F1D` confirmed — no change, already shipped. | §2.2 |
| D7 | Data-semantic row split; carrier may be form rather than hue. | §2.1, §2.3 |
| D8 | Provider colours are the sole colour exception. | §2.1, §2.3 |
| — | Provider chip ring at `.38`, asserted by ratio not alpha. | §2.2 |

### Four founder calls of 2026-09-13 that changed the amendment

1. **Risk colour is restored** — *"I want the risk colours but they gotta be tasteful."* Amendment 01
   as drafted deleted `risk-low/medium/high` outright. Risk is now the one data-semantic family that
   keeps a hue: **one hue, two weights, plus absence.** Crimson is a fill and never ink, because
   `#7E1717` measures 1.02:1 on `surface-3` and every lightness that clears 3:1 there has stopped
   being crimson. **No amber**, because muted amber lands within 0.3 of brass and brass means action,
   never danger. See §2.3.
2. **Platinum is ratified** as a named exception beside provider identity, **both platforms**, scoped
   to favourite and selection marks. Amendment 01 left this open. See §2.1.
3. **Wix Madefor is confirmed** as an amendment to the one-family decision of 2026-09-07. Alegreya
   Sans is replaced, not kept as a fallback.
4. **The spacing scale is replaced** with a base-2 modular scale. Not in Amendment 01's scope; added
   because applying the amendment to the approved canvas made every screen a §2.5 violation. See §2.5.

### Flagged rather than improvised

- **`C7-TypeScaleReconciliation`** — the approved canvas runs four roles §2.4 does not name and two
  sizes below its smallest role. Amendment 01's role table is applied as written; the conflict is
  recorded in §2.4 and must be decided before U2 or U3.
- **Not-read vs self-reported** shared a dashed underline in the published canvas. Split in §2.3:
  dashed stays with provisional data, self-reported provenance moves to dotted. Two opposite claims
  cannot share a carrier.

### Obligations this amendment creates in code — none applied here

This is a spec change. `OmenColor.kt`, `OmenColor.swift`, `OmenTypography.*`, `OmenColorTest`,
`OmenColorContrastTest` and `component-lock-v1.md` all carry obligations from it and are sequenced as
`C2 → U2` in `omen-native-contract-work-v1.md`. **The §2.3 ship-order gate governs all of them.**
