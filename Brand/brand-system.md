# Omen Brand System

**Status:** Canonical | Last updated: 2026-08-02
**Renamed:** Corvus → Omen (2026-06-22). The feature formerly called "Omen" is now the app name. The `corvus/` repo directory remains only as a legacy Git/deploy boundary until the external cutover.
**Source files:** `brand.md`, `positioning.md`, `BRAND_STRATEGY.md`, `omen-ux-ui-design-system-v1.md`
**Logos:** canonical asset set at `logos/` — **vector masters in `logos/svg/` (12 + 5 icon layers), rasters rendered from them (16 files)**. Primary emblem (Omen B2: aged-brass **O**, football negative space), standalone wordmark, horizontal lockup, app icon (rounded-square badge), favicon set (16/32/48/64/180/256/512), and the 1024 store/native master `omen-app-icon-1024.png`. The retired shield brand board and preview sheet are archived at `Brand/archive/superseded-shield-2026-07-25/` and are not part of the canonical set. All PNGs on solid black backgrounds. Build-served copies must exist at `frontend/public/`; per-slot wire-up rules and current gap live in §12 Logo Usage.
**Scope:** Brand decisions only. Roadmap, sitemap, pricing, architecture, and operating rules live elsewhere.

---

## 1. Identity

Omen is a fantasy football decision tool from Slops Saloon. It helps managers see the result before it happens — not by validating gut feelings, but by testing them against real data.

Valor Ventures Limited Liability Company is the legal owner and operator. Slops Saloon is its product studio, and Omen is the studio's first product. Future products live alongside Omen under Slops Saloon, not inside it.

---

## 2. Copy Anchors

These are not standalone taglines. They are placed lines — each has a specific job in context.

**Primary marketing line:** `See the result before it happens.`
Homepage hero, ads, short public-facing copy. Core brand promise.

**Secondary line:** `The edge is in what you almost missed.`
Subheads, feature sections, product explainers, and moments where Omen is positioned as catching hidden risk or overlooked opportunity.

**Approved alternate:** `See the move before the league does.`
Use when copy needs a stronger competitive fantasy-football feel.

**Do not use:**
- `Know your move before you make it.` — implies the user already has the right answer; Omen tests the instinct, it does not flatter it
- `See the winning move.` — too vague, too generic
- `Less guessing. Better moves.` — retired with Omen name
- `Where the math meets the legend.` — retired

---

## 3. What Omen Is / Is Not

**Is:**
- A decision layer for weekly fantasy football
- A tool that reads your actual roster, matchup, and league
- An explainer — recommendation first, evidence second
- A check on instinct, not a replacement for it

**Is not:**
- A general chatbot
- A stats dashboard
- A fantasy news aggregator
- A league management platform

The user leaves with a decision, not a spreadsheet assignment.

**Note on the name:** "Omen" was formerly the name of the core paid recommendation feature inside Corvus. The app is now called Omen. The weekly recommendation feature retains the display name "Omen of the Week" — unchanged.

---

## 4. Audience

Fantasy football managers who want confident weekly decisions without needing to become data scientists.

They believe they already know the right move. Omen tests that belief, surfaces the risk they almost missed, and either confirms the call or changes it.

---

## 5. Positioning

**One-line:** Omen helps fantasy football players see their best move with clear, platform-aware reasoning.

**Product ladder:**
1. Trade Analyzer — builds trust as the free front door
2. Draft Assistant — helps users prepare for the season
3. Omen of the Week — the core weekly decision moment (paid)

**Differentiation:** Platform context combined with plain-English explanation. Not just data — a recommendation with a reason. No spreadsheet homework required.

**Platform reality:** Yahoo, Sleeper, and ESPN all matter. ESPN carries higher reliability and recovery risk than the others.

---

## 6. Brand Personality

- Sharp and observant
- Institutional but approachable
- Confident without being arrogant
- Warm — the platform exists to bring people together through sports
- Mythological undertones: oracle, prophecy, omen, high vantage, judgment
- Data-serious, not spreadsheet-cold

Omen knows the answer before you ask. It explains the move. It tells you the risk. Then it stops.

---

## 7. Voice and Writing Rules

Plain English. No jargon without explanation. Be precise — vague language erodes trust. Avoid hype, hedging, corporate filler, and condescension.

**Lead with the move, not the reasoning.**
- Good: `"Start Player A over Player B — your upside improves by 4.2 expected points."`
- Bad: `"Based on our analysis of multiple data signals, we recommend that..."`

**Confidence framing:**
- Good: `"74 — Medium-High Confidence"`
- Bad: `"Our system is moderately confident"`

**Risk framing:**
- Good: `"Medium risk. Player A has a strong role but a less stable matchup signal."`
- Bad: `"Risk level is medium due to factors related to matchup uncertainty."`

**Empty states:** Acknowledge the situation. Do not apologize.
- Good: `"Your current lineup is solid. No move clears the bar this week."`
- Bad: `"No recommendations available at this time."`

**Errors:** Honest and actionable. Tell the user what to do next.

**Loading states:** Contextual, not generic.
- Good: `"Analyzing your matchup…"`
- Bad: `"Loading…"`

**Platform disconnected:**
- Good: `"Connect your Sleeper league and Omen will find your Most Valuable Play."`
- Bad: `"Platform not connected. Please authenticate to continue."`

---

## 8. Visual Direction

**Palette:**

| Color | Name | Hex | Role |
|-------|------|-----|------|
| ██ | Raven Black | `#0A0A0B` | Primary background |
| ██ | Charcoal | `#1C1C1E` | Card and panel surfaces |
| ██ | Bone White | `#F5F0E8` | Primary text, light surfaces |
| ██ | Aged Brass | `#A67C2E` | CTA, premium edges, logo metal |
| ██ | Verdigris Green | `#2F7D5B` | Omen glow, intelligence, active signal |
| ██ | Deep Crimson | `#7E1717` | Risk indicators, warnings, danger |
| ██ | Weathered Umber | `#5A3A25` | Shadow accent, brown-metal depth |

**Removed:** Electric Violet `#5B2D8E` — retired with rebrand. Verdigris Green replaces it as the intelligence/signal color.
**Updated:** Aged Brass `#A67C2E` replaces Antique Gold `#B8952A` for a more weathered, premium feel.

**Typography:**
- Headings, display, Omen card titles, labels, buttons, and controls: Alegreya Sans
- Body text and long-form reading copy: Alegreya
- Scores, structured numeric values, and code-adjacent data: DM Mono

Do not use Cormorant Garamond, Cinzel, or Inter as Omen product typography. The locked system is Alegreya Sans for headings/UI, Alegreya for reading copy, and DM Mono for numeric/code-adjacent data. The Alegreya pair shares letter proportions and curves, so the interface feels harmonious instead of split between unrelated display and reading fonts.

**Feel:** Dark, strategic, observant, premium. No clutter. No neon sports bar energy. Presentation-worthy at full scale.

**Native platform expression:** Omen is one design house, expressed through the phone’s own language. iPhone uses SwiftUI and Apple-native behavior; Android uses Kotlin/Jetpack Compose and Material 3. The shared brand owns hierarchy, copy, semantic color roles, and component intent—not identical pixels.

**iPhone Liquid Glass:** Treat Apple’s Liquid Glass as a native material for navigation, tab bars, toolbars, compact action controls, search, and transient sheets. It is not an all-purpose Omen card style. Decision briefs, provider data, errors, recovery instructions, and long reading copy stay on calm, high-legibility Omen surfaces. Respect Reduce Transparency and use the platform fallback rather than hand-built fake blur.

**Android material:** Use Material 3’s adaptive layout and feedback behavior. Do not port iPhone glass to Android or let dynamic color override Omen’s semantic status colors.

**Animation:** Subtle and functional. 150–250ms feedback/progress as appropriate to the platform. Motion reveals state change; it never delays a task, becomes game-like spectacle, or hides loading.

**Accessibility:** Color is never the only differentiator — confidence and risk always carry labels. WCAG AA minimum contrast. All interactive elements keyboard-navigable. Focus treatment: a semantic `focus-ring` token with a visible outline plus appropriate focus/selection behavior. Brass may be part of the expression, but color alone is never the sole indicator.

---

## 9. Feature Naming

| Name | Status | Use |
|------|--------|-----|
| `Omen` | Confirmed | **App name.** Public-facing. |
| `Omen of the Week` | Confirmed | Paid core weekly recommendation feature. User-facing. Unchanged. |
| `Trade Analyzer` | Confirmed | Free tool. Plain name. User-facing. |
| `The Scale` | Internal only | Nickname for trade analysis logic. Never shown to users. |
| `Talon` | Hold / provisional | Do not ship or use in copy until confirmed. |
| `Aerie` | Hold / provisional | Do not ship or use in copy until confirmed. |
| `Rookery` | Hold | Do not ship or use in copy until confirmed. |
| `The Prophecy` | Hold | Do not ship or use in copy until confirmed. |
| `Omen Black` | Retired | Do not use — name retired with rebrand. |
| `Munin / Hugin` | Retired | Norse raven references retired with raven theme. |

---

## 10. Product Pillars

Every feature must serve at least one. A feature that serves none does not belong.

| # | Pillar | What It Means |
|---|--------|---------------|
| 1 | Decision Intelligence | Every tool helps the user make a better call. Data-backed, not gut-feel. |
| 2 | Engagement | Makes the game more interesting, not more complicated. Entertainment drives retention. |
| 3 | Trust | No misleading outputs. No dark patterns. No data sharing without necessity. |
| 4 | Accessibility | Intuitive on first use. No learning curve for core features. |

---

## 10a. Marketing Pillars (Provisional)

The retired shield brand board (archived at `Brand/archive/superseded-shield-2026-07-25/omen-full-brand-board.png`) named four pillars for external positioning:

1. **DETECT THE SIGNAL**
2. **ANALYZE THE DATA**
3. **PREDICT THE OUTCOME**
4. **WIN WITH CONFIDENCE**

**Status: provisional.** The concept is right — this is the shape of what Omen does. The specific phrasing was drafted on the brand board and has not been intentionally locked by Justin as our marketing voice. Do not use on marketing pages, ads, or in-app copy until confirmed. Parked as an open decision, same posture as Decision 13 of `slops-saloon/Direction/decisions/corvus-ux-ui-direction-v1.md` (provisional tagline lock).

**Do not confuse with §10 Product Pillars.** §10's Decision Intelligence / Engagement / Trust / Accessibility are *internal engineering principles* — every feature must serve at least one. §10a's Detect / Analyze / Predict / Win are (would be) *external marketing pillars* — how Omen tells its own story publicly. Different jobs, different scopes. Do not mix.

---

## 11. Non-Negotiables

- No paid dependencies without CEO approval
- No placeholder features in production — hide incomplete features, never display them
- No unnecessary data collection
- No sharing user data without explicit necessity
- No compromise on system quality
- Every feature passes the AAA Framework before shipping: Accuracy + Accessibility + Aesthetic Integrity. Two out of three is a fail.

---

## 12. Logo Usage

**Load-bearing rule:** the emblem is the **Omen B2** mark — an aged-brass letter **O** whose inner negative space is a literal American football. The mark's own brass ring is its frame. It never sits inside a circle. It sits inside a rounded-square only when the OS demands one — the favicon / app-icon / launcher container — and nowhere else.

> **Amendment — 2026-07-25 (founder-approved).** This section originally described the emblem as a
> **shield** with a **gold border**. That description is **withdrawn**. The shield was retired on
> 2026-07-25 and replaced by the approved **Omen B2** mark; the production asset swap landed
> 2026-07-26 in PR #199 (`ca96559`), and the retired files are archived at
> `Brand/archive/superseded-shield-2026-07-25/`.
>
> The clause's real intent survives and still holds: **the mark carries its own frame, so product
> surfaces must not add one.** No CSS ring, circular mask, glow, drop shadow, or square container
> around the emblem, wordmark, or lockup. Only the OS-demanded install-icon badge may contain it.
>
> Read with `Blueprints/specs/mobile/omen-mobile-visual-briefs-v1.md` §1.1, which was amended the
> same day to withdraw its blanket ban on "literal footballs" — the football lives in the identity,
> never as ornament inside product UI.

### 12.1 Asset inventory (canonical at `logos/`)

| Asset | File | Use it here | Never use it here |
|---|---|---|---|
| Primary emblem | `omen-primary-emblem.png` | Alone: small-badge contexts, share-card corner mark, notification-icon parent. Paired with the wordmark: use the horizontal lockup instead. | Alone in any large / hero context — pair with the wordmark or use the lockup. |
| Standalone wordmark | `omen-standalone-wordmark.png` | Typography-lockup moments where the emblem would compete or clutter — footer sign-offs, share-card headings, marketing hero paragraphs. | Anywhere the B2 mark helps identity carry — use the horizontal lockup. |
| Horizontal lockup | `omen-horizontal-lockup.png` | **Default logo for identity slots.** `Header.jsx`, Landing hero, `OmenLanding.jsx`, marketing hero, share-card header, Sign-In screen. Ships as `-transparent` (dark surfaces) and `-raven` (light surfaces). | Inside anything smaller than ~32px tall — the wordmark becomes illegible; use the emblem alone. |
| Stacked lockup | `svg/omen-lockup-stacked.svg` | Centred moments — launch screens, posters, social treatments. | Inline in dense UI; it needs vertical room. |
| Favicon set | `omen-favicon-{16,32,48,64,180,256,512}.png` | Browser tab, PWA manifest, apple-touch-icon, taskbar / home-screen tiles. | Inside the app UI as a logo. Never declared `maskable` — the apexes clip. |
| SVG favicon | `omen-favicon.svg` | Browser tab on every SVG-capable browser; declared ahead of the PNGs. | As an in-app logo. |
| App icon | `omen-favicon-app-icon.png` | PWA install / home-screen slot where a rounded-square badge is expected. 1024², corners baked in, alpha outside the badge. | Inside the app UI. Not an App Store submission asset — it has alpha. |
| Store master | `omen-app-icon-1024.png` | App Store Connect submission. 1024², **opaque, square, no alpha, no baked corners**. | Anywhere in-app. The OS applies its own mask. |
| Maskable PWA icon | `omen-maskable-512.png` | The **only** asset that may be declared `"purpose": "maskable"` — mark held to 52% of canvas so it survives an aggressive circular mask. | As a normal favicon; it is deliberately over-padded. |
| Retired shield board + preview sheet | `Brand/archive/superseded-shield-2026-07-25/` | Historical reference only. | Never as UI, never in product, marketing, or store listings. |

### 12.1a Vector masters (canonical at `logos/svg/`)

**SVG is the master format. Every raster in `logos/` is a render of one of these.** Exported from Figma file `Lmj3VyXmE1u2WhGbQOqUIk` ("Omen Favicon Exploration v1"), page `05 — Export Masters`. That file — not the Native Design House file — is the identity source of truth.

| File | What it is |
|---|---|
| `omen-symbol-primary.svg` | The B2 mark, full detail: brass gradient plus the radial sheen. Square, Raven ground. |
| `omen-app-icon-master-1024.svg` | App-icon composition (rounded-rect ground baked in for preview only). |
| `omen-wordmark-{bone,raven}.svg` | Source-faithful vector trace of the OMEN wordmark. |
| `omen-lockup-{horizontal,stacked}.svg` | The two official lockups. |
| `omen-symbol-micro-{16,32}.svg` | Purpose-drawn small cuts — **not** the primary mark scaled down. Use at ≤32px. |
| `omen-symbol-{brass,bone,raven}-on-{raven,bone}.svg` | Flat monochrome variants for constrained or single-colour surfaces. |
| `icon-layers/omen-icon-layer-{1-outer-o,2-football,3-laces}.svg` | Flat, unshaded, unmasked layers authored for Apple Icon Composer. |
| `icon-layers/1024-grid/` | The same layers remapped onto the 1024 icon grid, restructured into the two layers the shipping `.icon` actually uses. |

Rule: **do not scale the primary symbol below 32px** — switch to the micro cut, which is drawn for that size.

### 12.2 Framing rule

- **In-app UI:** emblem, standalone wordmark, and horizontal lockup are presented **raw** — no border, no glow, no drop shadow, no circular mask, no square container. Each asset already carries its own frame (the B2 mark's aged-brass ring; the wordmark's built-in negative space). Ambient effects around the mark (background gradient, hairline rule) are fine. Wrappers that *contain* the mark are not.
- **App-icon slot only exception:** the rounded-square dark badge is the *only* container the B2 mark ever sits inside. OS-demanded shape for install icons (web app-icon, iOS AppIcon, Android launcher). Nowhere else.

### 12.3 Wordmark rule — asset, not text

The wordmark **is the designed asset** (`omen-standalone-wordmark.png` or its embedded appearance inside the horizontal lockup). Alegreya-Sans-rendered "Omen" is a *text label* — `<title>`, meta tags, ARIA labels, `alt` attributes, inline body copy where the visual mark cannot render. Where visual identity is expressed, the asset is used, not the text.

### 12.4 Build-serve requirement

Canonical assets live at `omen/logos/`. Build-served copies must live at `omen/frontend/public/`. Vite serves from `public/`, not `logos/`. Any asset used in the app must exist in both locations. When the canonical asset is updated, the build-served copy must be re-copied in the same commit.

**The rule is "used by the web app", not "every file in `logos/`."** Submission and native-only masters — `omen-app-icon-1024.png` and everything in `logos/svg/icon-layers/` — must **not** be copied to `public/`; the web app never requests them and shipping them only bloats the bundle. As of 2026-08-14 every asset the web app does reference is present and byte-identical in both locations.

### 12.4a Native icon slots

The native apps do not read from `logos/` at build time — each platform needs the mark committed in its own required layout. **Both native slots are vector**, cut from `logos/svg/`; only App Store Connect needs a raster.

| Slot | Location | Contents |
|---|---|---|
| App Store Connect | `logos/omen-app-icon-1024.png` | 1024×1024, opaque, **no alpha channel** — App Store Connect rejects alpha. No pre-baked corners; Apple applies the mask. |
| iOS | `mobile/ios/OmenIOS/OmenIOS/Omen.icon/` | An **Icon Composer document**, not an `.appiconset`. `icon.json` plus two SVG layers — a brass ring and the laces — over a Raven ground. iOS 26 renders it as a layered Liquid Glass icon (the system supplies specular, refraction, and shadow; the artwork must not) and back-deploys a flattened icon to older releases. Registered in `project.pbxproj` as `folder.iconcomposer.icon` and selected by `ASSETCATALOG_COMPILER_APPICON_NAME = Omen`. |
| Android | `mobile/android/app/src/main/res/` | Adaptive icon (`mipmap-anydpi-v26/`): Raven Black `@color/ic_launcher_background` plus **VectorDrawable** foreground and monochrome layers in `drawable/`. No PNG mipmap ladder — `minSdk = 26` guarantees adaptive-icon support, so the rasters were dead weight. Wired via `android:icon` / `android:roundIcon`. |

**Two rules that are easy to get wrong, both learned the hard way here:**

1. **The football must be a cutout, never a dark shape painted on top.** In the layer artwork it is an `evenOdd` subtraction from the brass ring, so the ground shows through. Paint it as a black layer instead and Icon Composer glassifies it — the mark collapses into a featureless brass blob. Same reasoning drives the Android `fillType="evenOdd"`.
2. **The `<monochrome>` drawable must be a flat silhouette**, sharing the foreground's geometry but one colour. Point it at the coloured artwork and themed-icon mode renders a solid block.

The install-icon badge is the framing exception from §12.2 — it is the only container the mark sits inside, and only because the OS demands a square.

### 12.5 Inheritance from the fan-experience doctrine

Per `slops-saloon/Direction/decisions/slops-saloon-fan-experience-doctrine-v1.md`, the load-bearing principle is *Look Good — Play Good.* The logo-usage rules above serve that principle directly: the B2 mark's own aged-brass ring does the framing job better than a redundant CSS ring, and the horizontal lockup expresses more identity per pixel than an emblem-plus-loose-text pattern. Rule of thumb: **presence of identity, not decoration of identity.**

---

## 13. Open Questions / Later Decisions

- Paid tier name (TBD)
- League hosting tier name (TBD)
- Icon library: Heroicons or Lucide — confirm before build
- `Talon`, `Aerie`, `Omen Black`, `Rookery`, `The Prophecy` — confirm or retire each before use
- Logo assets finalized 2026-06-22 in `logos/` — PNG set complete
- `Deus pascit corvos.` — retired with Omen name
- Custom wordmark font — Alegreya Sans Bold used in SVGs; finalize with a type designer if budget allows
- Confirm paid tier name (was going to be "Omen" — now needs a new name since Omen is the app)
