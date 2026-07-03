# Omen Brand System

**Status:** Canonical | Last updated: 2026-06-22
**Renamed:** Corvus → Omen (2026-06-22). The feature formerly called "Omen" is now the app name. The `corvus/` repo directory remains only as a legacy Git/deploy boundary until the external cutover.
**Source files:** `brand.md`, `positioning.md`, `BRAND_STRATEGY.md`, `omen-ux-ui-design-system-v1.md`
**Logos:** canonical asset set at `logos/` (13 files) — primary emblem (shield), standalone wordmark, horizontal lockup, app icon (rounded-square badge), favicon set (16/32/48/64/180/256/512), full brand board, and PNG preview sheet. All PNGs on solid black backgrounds. Build-served copies must exist at `frontend/public/`; per-slot wire-up rules and current gap live in §12 Logo Usage.
**Scope:** Brand decisions only. Roadmap, sitemap, pricing, architecture, and operating rules live elsewhere.

---

## 1. Identity

Omen is a fantasy football decision tool from Slops Saloon. It helps managers see the result before it happens — not by validating gut feelings, but by testing them against real data.

Slops Saloon is the parent company and product studio. Omen is its first product. Future products live alongside Omen under Slops Saloon, not inside it.

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
- Headings, display, Omen card titles, labels, buttons: Alegreya Sans
- Body text and long-form reading copy: Alegreya

Do not use Cormorant Garamond. It has been replaced by the Alegreya family pair:
Alegreya Sans for headings and UI, Alegreya for body text. The two faces share
letter proportions and curves, so the interface feels harmonious instead of split
between unrelated display and reading fonts.

**Feel:** Dark, strategic, observant, premium. No clutter. No neon sports bar energy. Presentation-worthy at full scale.

**Animation:** Subtle. 150ms ease-in-out for state changes. No bouncy or game-like motion.

**Accessibility:** Color is never the only differentiator — confidence and risk always carry labels. WCAG AA minimum contrast. All interactive elements keyboard-navigable. Focus rings: visible, gold accent, consistent across themes.

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

The brand board (`logos/omen-full-brand-board.png`) names four pillars for external positioning:

1. **DETECT THE SIGNAL**
2. **ANALYZE THE DATA**
3. **PREDICT THE OUTCOME**
4. **WIN WITH CONFIDENCE**

**Status: provisional.** The concept is right — this is the shape of what Omen does. The specific phrasing was drafted on the brand board and has not been intentionally locked by Justin as our marketing voice. Do not put these on marketing pages, ads, or in-app copy until confirmed. Parked as an open decision, same posture as Decision 13 of `slops-saloon/Direction/decisions/corvus-ux-ui-direction-v1.md`.

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

**Load-bearing rule:** the emblem is a shield. The shield is its own frame. It never sits inside a circle. It sits inside a rounded-square only when the OS demands one — that's the favicon / app-icon container from the brand board, and nowhere else.

### 12.1 Asset inventory

| Asset | File | Use it here | Never use it here |
|---|---|---|---|
| Primary emblem | `omen-primary-emblem.png` | Alone: favicon slots, small-badge contexts, share-card corner mark, notification-icon parent. Paired with wordmark: use the horizontal lockup instead. | Alone in any large / hero context — pair with the wordmark or use the lockup. |
| Standalone wordmark | `omen-standalone-wordmark.png` | Typography-lockup moments where the emblem would compete or clutter — footer sign-offs, share-card headings, marketing hero paragraphs. | Anywhere the shield helps identity carry — use the horizontal lockup. |
| Horizontal lockup | `omen-horizontal-lockup.png` | **Default logo for identity slots.** `Header.jsx`, `NavDrawer`, `Landing.jsx` hero, `OmenLanding.jsx`, marketing hero, share-card header, Sign-In screen. | Inside anything smaller than ~32px tall — wordmark becomes illegible; use the emblem alone. |
| Favicon set | `omen-favicon-{16,32,48,64,180,256,512}.png` | Browser tab, PWA manifest, apple-touch-icon, taskbar / home-screen tiles. | Inside the app UI as a logo. |
| App icon | `omen-favicon-app-icon.png` | PWA install / home-screen icon slot where a rounded-square badge is expected. | Inside the app UI. |
| Brand board | `omen-full-brand-board.png` | Doctrine reference only — this document, pitch decks, contractor handoffs. | Never as UI. Never in the app. |
| Preview sheet | `omen-png-preview-sheet.png` | Doctrine reference / QA of the asset set. | Never as UI. |

### 12.2 Framing rule

- **In-app UI:** the emblem, standalone wordmark, and horizontal lockup are presented **raw** — no border, no glow, no drop shadow, no circular mask, no square container. Each asset already carries its own frame (the shield's gold border; the wordmark's built-in negative space). Ambient effects around the mark (a subtle background gradient, a section divider, a hairline rule) are fine. Wrappers that *contain* the mark are not.
- **App-icon slot only exception:** the rounded-square dark badge shown on the brand board is the *only* container the shield ever sits inside. This is because the OS demands a square shape for install icons. Nowhere else.

### 12.3 Wordmark rule — asset, not text

The wordmark **is the designed asset** (`omen-standalone-wordmark.png` or its embedded appearance inside the horizontal lockup). Alegreya-Sans-rendered "Omen" is a *text label* — used in `<title>`, meta tags, ARIA labels, `alt` attributes, and inline body copy where the visual mark cannot render. Where the visual identity is expressed, the asset is used, not the text.

**The current `[C]`-in-circle-plus-text-wordmark treatment in `Header.jsx` and `NavDrawer` is doctrine debt.** It predates the wordmark asset shipping. The fix — swap for the horizontal lockup — is scoped in the Codex prompt at `Blueprints/prompts/codex-logo-suite-swap.md`.

### 12.4 Build-serve requirement

Canonical assets live at `omen/logos/`. Build-served copies must live at `omen/frontend/public/` — Vite serves from `public/`, not from `logos/`. Any asset used in the app must exist in both locations. When the canonical asset is updated, the build-served copy must be re-copied in the same commit.

**Current gap (as of 2026-07-03):** the horizontal lockup, standalone wordmark, app-icon, and the 48 / 64 favicon sizes exist canonically at `logos/` but have not been copied to `frontend/public/`. The Vite build cannot currently serve them. Closing this gap is scoped in the Codex prompt referenced above.

### 12.5 Inheritance from the fan-experience doctrine

Per `slops-saloon/Direction/decisions/slops-saloon-fan-experience-doctrine-v1.md`, the load-bearing principle is *Look Good — Play Good.* The logo-usage rules above serve that principle directly: the shield's own gold border does the framing job better than a redundant CSS ring, and the horizontal lockup expresses more identity per pixel than an emblem-plus-loose-text pattern. Rule of thumb: **presence of identity, not decoration of identity.**

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
