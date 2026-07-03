# Omen UX/UI Design System

**Date:** 2026-05-24 (v1) · 2026-07-03 (v2 reconciliation, in place — filename preserved for reference compatibility)
**Status:** **v2 — reconciled 2026-07-03.** Palette, typography, and design-token layer now reflect actual production code (`frontend/src/index.css` as of 2026-07-03). Component + voice guidance largely unchanged from v1. Phase 1.x additions indexed in §"Phase 1.x Additions" below.
**Extends:** `slops-saloon/Blueprints/specs/slops-os-app-template-spec.md`

## Inherits from (doctrine)

This spec is an **implementation reference**. Doctrine that governs it lives upstream:

1. `slops-saloon/Direction/decisions/slops-saloon-fan-experience-doctrine-v1.md` — Look Good — Play Good, two-sided presence (War Room / Color Rush), three-room mapping (Owner Suite = Omen / GM Suite = Trade Analyzer / Locker Room = everything else), chant medium follows skin, data-legibility invariant.
2. `slops-saloon/omen/Brand/brand-system.md` — canonical Omen brand (palette, typography, voice, product pillars, logo usage §12, marketing pillars provisional §10a).
3. `slops-saloon/Direction/decisions/corvus-ux-ui-direction-v1.md` — Omen UX/UI direction v1 (Trade-Analyzer-free posture, sign-in gating, screen priority).

When any of the above conflicts with this document, **the upstream doctrine wins.** File issues rather than diverging silently.

## Downstream specs (spawned or planned)

- `page-system.md` — page-by-page rendering rules (already exists, alive and updated per phase).
- Team colorway system spec — 32 teams × {War Room, Color Rush}, per fan-experience doctrine (not yet authored).
- Chant + fan-copy UX spec — placement, medium-follows-skin, per-team copy check (not yet authored).
- Room-mode implementation spec — how Owner / GM / Locker rooms encode as tokens/textures over this system (not yet authored).

---

## Purpose

This is the Omen-specific design system. It applies the Slops OS template with Omen brand tokens, components, voice, and patterns.

When building any Omen screen, this document, the Slops OS template, and `brand-system.md` are the three required references. This document *implements*; `brand-system.md` and the fan-experience doctrine *decide*.

---

## Brand Character in UI Terms

Omen is a sharp, observant fantasy football analyst. Not a chatbot. Not a dashboard.
It knows the answer before you ask. It explains the move. It tells you the risk. It stops.

**In UI terms:**
- Copy is short and direct
- Recommendations come first, evidence second
- Confidence and risk are always visible when a recommendation exists
- Empty states acknowledge the situation; they do not apologize
- Errors are honest and tell the user what to do next
- Loading states are contextual ("Analyzing your matchup…") not generic ("Loading…")

---

## Color System

### Design Intent

| Color | Hex | Feel | Use |
|-------|-----|------|-----|
| Raven Black | `#0A0A0B` | Authority, depth | Primary dark background |
| Charcoal | `#1C1C1E` | Structure | Card and panel surfaces |
| Bone White | `#F5F0E8` | Warmth, clarity | Text, light surface |
| Aged Brass | `#A67C2E` | Premium, CTA | Accent, upgrade prompts, confidence — **replaces v1 Antique Gold `#B8952A`** per `brand-system.md` §8 (2026-06-22 rebrand) |
| Deep Crimson | `#7E1717` | Alert, risk | Risk indicators, warnings — **replaces v1 `#8B1A1A`** |
| Verdigris Green | `#2F7D5B` | Intelligence | Omen glow, active signal, AI accent moments — **replaces v1 Electric Violet `#5B2D8E`** (retired with rebrand) |
| Weathered Umber | `#5A3A25` | Shadow, brown-metal depth | Deep card edges, brown-metal accents — **new since v1** |

### Dark Mode Tokens (primary Omen experience)

Production location: `frontend/src/index.css` `:root { ... }` block (SSR / pre-JS dark fallback; JS resolves `data-theme` at runtime).

```css
:root {
  --color-bg:              #0A0A0B;  /* raven black */
  --color-surface-1:       #1C1C1E;  /* charcoal */
  --color-surface-2:       #2C2C2E;  /* elevated charcoal */
  --color-surface-3:       #3A3A3C;  /* inset or hover */
  --color-border:          #3A3A3C;
  --color-border-subtle:   #2C2C2E;
  --color-text-primary:    #F5F0E8;  /* bone white */
  --color-text-secondary:  #AEAEB2;
  --color-text-tertiary:   #6D6D72;
  --color-accent:          #A67C2E;  /* aged brass — replaces v1 #B8952A */
  --color-accent-hover:    #C49035;  /* replaces v1 #D4AC30 */
  --color-accent-muted:    #3A2A0A;  /* replaces v1 #3D2F0D */
  --color-text-on-accent:  #0A0A0B;  /* NEW since v1 — foreground on gold surfaces */
  --color-risk-low:        #34C759;
  --color-risk-medium:     #FF9F0A;
  --color-risk-high:       #7E1717;  /* deep crimson — replaces v1 #8B1A1A */
  --color-omen:            #2F7D5B;  /* verdigris green — replaces v1 #5B2D8E electric violet */
  --color-umber:           #5A3A25;  /* NEW since v1 — weathered umber */
  --color-data-live:       #34C759;
  --color-data-stub:       #FF9F0A;
  --color-data-mock:       #636366;
  --color-data-unavailable:#3A3A3C;
}
```

Phase 1.x additions (team-theme, motifs, cultural-moment overlay, position chips, platform brand colors, confidence gradient endpoints, metallic tier palette, demo accent) — see §"Phase 1.x Additions" below for the full token map. The block above is the *core Omen palette*; the Phase 1.x tokens sit alongside it in the same `:root` block.

### Light Mode Tokens

Reference values (verify against `frontend/src/index.css`'s `[data-theme="light"]` block, which is the source of truth):

```css
:root[data-theme="light"] {
  --color-bg:              #FAFAF9;
  --color-surface-1:       #FFFFFF;
  --color-surface-2:       #F5F5F4;
  --color-surface-3:       #EBEBEA;
  --color-border:          #E5E5E3;
  --color-border-subtle:   #F0F0EE;
  --color-text-primary:    #1C1C1E;
  --color-text-secondary:  #6B7280;
  --color-text-tertiary:   #9CA3AF;
  --color-accent:          #92740F;  /* aged brass, darkened for light-bg contrast */
  --color-accent-hover:    #A67C2E;  /* was #B8952A in v1 */
  --color-accent-muted:    #FEF3C7;
  --color-risk-low:        #16A34A;
  --color-risk-medium:     #D97706;
  --color-risk-high:       #991B1B;
  --color-omen:            #206F3A;  /* verdigris green, darkened for light-bg — replaces v1 #6D28D9 electric violet */
  --color-data-live:       #16A34A;
  --color-data-stub:       #D97706;
  --color-data-mock:       #9CA3AF;
  --color-data-unavailable:#E5E5E3;
}
```

**Note:** the light-theme block in `frontend/src/index.css` is the source of truth. If the values above diverge, the CSS wins — file an update to this spec.

### Tailwind Config Extensions (omen-specific)

```js
// tailwind.config.js additions
colors: {
  raven: '#0A0A0B',
  charcoal: '#1C1C1E',
  bone: '#F5F0E8',
  gold: {                      // alias name preserved for back-compat with existing class references
    DEFAULT: '#A67C2E',        // aged brass (was #B8952A antique gold in v1)
    light:   '#C49035',
    muted:   '#3A2A0A',
  },
  crimson: '#7E1717',          // was #8B1A1A in v1
  omen:    '#2F7D5B',          // verdigris green (was #5B2D8E electric violet in v1)
  umber:   '#5A3A25',          // NEW since v1 — weathered umber
}
```

**Back-compat rule:** the `gold` alias name is retained even though the underlying color is now Aged Brass, not Antique Gold. Any codebase reference to `text-gold`, `bg-gold-light`, `border-gold`, etc. continues to work and now resolves to the new brass values. Do not rename the alias.

---

## Phase 1.x Additions

Between the v1 draft (2026-05-24) and v2 reconciliation (2026-07-03), Phase 1.1 → 1.13 landed real production subsystems on top of the core palette above. Each is fully documented in its own phase handoff — this section indexes what exists.

### Team-theming tokens (Phase 1.5, merged PR #41 2026-06-17)

```css
--color-team-primary:      #A67C2E;
--color-team-secondary:    #C49035;
--color-team-accent:       #A67C2E;
--color-team-surface:      #0A0A0B;
--color-team-surface-card: #1C1C1E;
```

Default values match Aged Brass so Omen chrome renders unchanged when no team is selected. Per-team overrides live in the appearance-picker system. **Governed by the fan-experience doctrine v1 two-sided-presence rule** — see doctrine §"The two-sided presence doctrine" and downstream team-colorway spec (not yet authored).

### Motif overlay system (Phase 1.5g, per-team decoration layer)

```css
--motif-shape:            solid;
--motif-color:            transparent;
--motif-thickness:        0px;
--motif-opacity:          0;
--motif-svg-url:          none;
--type-flourish-family:   inherit;
--type-flourish-weight:   inherit;
--type-flourish-style:    normal;
--type-flourish-caps:     normal;
--type-flourish-tracking: normal;
--type-flourish-features: normal;
```

Defaults are inert; non-motif pages render byte-identically. `<MomentChrome>` sets these at runtime for cultural-moment overlays and per-team decorations. Data-attribute API: `data-motif-target="page-edge|section-divider|card|eyebrow"` on the receiving element; `:root[data-motif-page-edge='true']` etc. gates rendering.

### Cultural-moment overlay (Phase 1.5g.3)

```css
--moment-eyebrow:            "";
--moment-eyebrow-color:      var(--color-text-secondary);
--moment-surface-tint:       transparent;
--moment-surface-tint-alpha: 0;
--moment-citation:           "";
```

Inert defaults for non-moment pages. Per-team moment definitions live in the appearance system.

### Position chip palette (Phase 1.6, colorblind-validated)

```css
--color-pos-rb:  #34D399;  /* teal */
--color-pos-wr:  #60A5FA;  /* blue */
--color-pos-qb:  #FB923C;  /* orange */
--color-pos-te:  #C084FC;  /* violet */
--color-pos-def: #F472B6;  /* pink */
--color-pos-k:   #A3A3A3;  /* gray */
```

Consumed via `frontend/src/lib/positionChip.js` `positionChipStyle(position)`. Colorblind-validated (deuteranopia + protanopia sim).

### Platform brand palette (Phase 1.7, handoff 2026-06-30)

```css
--color-platform-sleeper:    #1FA3E8;
--color-platform-yahoo:      #410093;
--color-platform-espn:       #C81E2C;
--color-platform-yahoo-chip: #A080C9;   /* dark-surface legibility override */
--color-platform-espn-chip:  #F2929A;   /* dark-surface legibility override */
--color-on-platform-sleeper: #0A0A0B;
--color-on-platform-yahoo:   #F5F0E8;
--color-on-platform-espn:    #F5F0E8;
```

Consumed via `frontend/src/lib/platformChip.js` `platformChipStyle` / `platformButtonStyle`. Yahoo `#410093` and ESPN-derived `#C81E2C` sourced from public brand-color references with hand-verified WCAG contrast math; Sleeper `#1FA3E8` is provisional (no confirmed official hex). Full sourcing rationale: `Blueprints/handoffs/2026-06-30-phase1-7-platform-brand-colors-handoff.md`.

### Confidence gradient endpoints (Phase 1.8)

```css
--color-confidence-floor:   #701020;   /* deep red */
--color-confidence-ceiling: #206F3A;   /* deep green */
```

Consumed via `frontend/src/lib/confidenceGradient.js` `confidenceBarStyle(score)`, which computes the fill via `color-mix(in hsl, ceiling <score>%, floor)`. HSL shorter-arc interpolation places the 50% point on amber — no separate midpoint token needed. Floor `#701020` reads 1.45:1 against the dark track — below WCAG 1.4.11's 3:1 non-text guideline, accepted because the consuming bars always print the score as redundant text. **This is the "Look Good — Play Good" data-legibility invariant in action** — the score is always readable via label; color is expressive, never load-bearing.

### Metallic tier palette (Phase 1.9)

```css
--color-tier-gold:      #D4AF37;   /* deliberately brighter/more saturated than --color-accent */
--color-tier-silver:    #C0C0C0;
--color-tier-bronze:    #8C5A2B;
--color-on-tier-gold:   #0A0A0B;
--color-on-tier-silver: #0A0A0B;
--color-on-tier-bronze: #F5F0E8;
```

Identical across themes (decorative/branded, not a surface token). Consumed via `frontend/src/lib/metallicTier.js` `metallicTierStyle(rank)` — returns a linear-gradient sheen plus inset bevel. Applied to Draft Assistant `RecommendationCard` ordinal pill for rank 1–3; rank 4+ falls back to plain bordered circle.

### Demo accent (Phase 2.7)

```css
--color-demo-text:           #7DD3FC;                       /* sky-300, AAA on dark bg */
--color-demo-text-secondary: rgba(186, 230, 253, 0.8);      /* sky-200/80 */
```

Sky family, contrast-tuned per theme. Used exclusively in demo-mode fixtures. **Governed by `demo-mode-pre-empty-state` skill** — mock/live badge required, never silently mix.

### Data-legibility invariant reminder

Per the fan-experience doctrine v1, the following token families own their own colors and are **never** overridden by team color, moment overlay, or any theming layer:

- Risk (low / medium / high)
- Confidence gradient
- Data-source (live / stub / mock / unavailable)
- Position chips
- Platform brand colors
- Demo accent

Team theming runs in surfaces, accents, chip fills, and chant frames — never in the data-semantic layer.

---

## Typography

### Font Pairing

- **Alegreya Sans** — Headings, display moments, product identity, Omen card titles, UI labels, buttons, inputs, and navigation.
- **Alegreya** — Body text and longer reading copy.
- **DM Mono** — Numeric / code-adjacent contexts (score readouts, cell values, monospace-aligned tables). Loaded alongside the Alegreya pair in `frontend/src/index.css` line 2. **New since v1 — not yet cross-referenced in `Brand/brand-system.md` §8; flag for that spec's next reconciliation.**

Do not use Cormorant Garamond (retired with the 2026-06-22 rebrand). All three current faces are loaded in `frontend/src/index.css`.

### Usage Rules

| Context | Font | Weight | Size |
|---------|------|--------|------|
| Product hero / landing headline | Alegreya Sans | 700 | 48px+ |
| Page title | Alegreya Sans | 600 | 30–36px |
| Card headline | Alegreya Sans | 600 | 20–24px |
| Omen recommendation title | Alegreya Sans | 600 | 24px |
| Body copy | Alegreya | 400 | 16px |
| UI labels | Alegreya Sans | 500 | 14px |
| Button text | Alegreya Sans | 600 | 14–16px |
| Confidence / risk label | Alegreya Sans | 600 | 12–14px |
| Nav items | Alegreya Sans | 500 | 14px |
| Meta / caption | Alegreya Sans | 400 | 12px |

---

## Tailwind Font Classes

```js
fontFamily: {
  serif: ['Alegreya', 'Georgia', 'serif'],
  sans:  ['Alegreya Sans', 'system-ui', 'sans-serif'],
  display: ['Alegreya Sans', 'system-ui', 'sans-serif'],
}
```

---

## Component Specifications

### RecommendationCard

The core output component. Used for Omen, Start/Sit, Trade Analyzer result.

Structure:
```
┌──────────────────────────────────────────────────┐
│ [Move Type Badge]     [Confidence: 74 — Med-High]│
│                                                  │
│ [Recommendation Title — Alegreya Sans 600]       │
│ Start Player A over Player B                     │
│                                                  │
│ [Move copy — Alegreya 16]                        │
│ "Move Player A into your WR2 slot and bench..."  │
│                                                  │
│ Why it matters:                                  │
│ [Plain-English explanation]                      │
│                                                  │
│ Risk: [Medium]  [risk reason 1] [risk reason 2]  │
│                                                  │
│ Data used: [live] roster  [stub] projections     │
│            [live] weather [live] home/away       │
└──────────────────────────────────────────────────┘
```

States: success, empty, loading, error, disconnected, mock-labeled

### ConfidenceMeter

- Numeric score 0–100 displayed as text + visual bar
- Color: low (crimson) → medium (orange) → high (gold/green)
- Always paired with a label: Low / Medium / Medium-High / High
- Rationale shown as hover tooltip or expandable section

```
Confidence  ████████░░  74 — Medium-High
```

### RiskBadge

Small badge: Low / Medium / High
Colors: `--color-risk-low` / `--color-risk-medium` / `--color-risk-high`
Always followed by at least one short reason string.

### StatusBadge

Shows platform connection status.

| State | Display |
|-------|---------|
| connected | Green dot + "Connected" |
| disconnected | Gray dot + "Not connected" |
| reauth_required | Red dot + "Reconnect required" |
| espn_recovery | Yellow dot + "ESPN needs attention" |

### DataSourceLabel

Inline label for individual signals.

| Value | Label | Color |
|-------|-------|-------|
| `live` | Live | `--color-data-live` |
| `stub` | Stub | `--color-data-stub` |
| `mock` | Mock | `--color-data-mock` |
| `unavailable` | Unavailable | `--color-data-unavailable` |

### MockBanner

Appears at the top of any view where `mode === 'mock'` or any signal is `status: 'mock'`.

Copy: `"This is mock data for development. Not real fantasy advice."`
Style: amber/orange toned, subtle, dismissible per session.

### LoadingState

- Spinner centered in the content area
- Context message below: "Analyzing your matchup…" / "Loading your roster…" / "Fetching your league…"
- Never just "Loading…"

### ErrorState

- Honest headline: "Couldn't load your recommendation"
- Short reason if available
- Retry button when `retryable: true`
- Secondary link to check platform connection

### EmptyState

- Honest headline: "No move stands out this week"
- Explanation paragraph (from backend `explanation.summary`)
- Next-action CTA: "Check back after Thursday night kickoff" or "Review your matchup"

### DisconnectedState

- Headline: "Connect [Platform] to unlock this"
- Short explanation of what it unlocks
- Primary CTA: "Connect [Platform]" → routes to account/connect flow
- Secondary: "Learn how" link (future doc)

---

## Voice and Copy Guidelines

### Recommendation copy

Lead with the move, not the explanation.

Good: `"Start Player A over Player B — your upside improves by 4.2 expected points."`
Bad: `"Based on our analysis of multiple data signals, we recommend that..."`

### Confidence framing

Good: `"74 — Medium-High Confidence"`
Bad: `"Our system is moderately confident"` or `"confidence: 0.74"`

### Risk framing

Good: `"Medium risk. Player A has a strong role but a less stable matchup signal."`
Bad: `"Risk level is medium due to factors related to matchup uncertainty."`

### Empty state copy

Good: `"Your current lineup is solid. No move clears the bar this week."`
Bad: `"No recommendations available at this time."`

### Platform disconnected copy

Good: `"Connect your Sleeper league and Omen will find your Most Valuable Play."`
Bad: `"Platform not connected. Please authenticate to continue."`

### ESPN reconnect copy

Good: `"ESPN needs fresh cookies before Omen can read this league. Takes about 2 minutes."`
Bad: `"ESPN authentication required. Please provide ESPN_S2 and SWID credentials."`

---

## Navigation

### Sidebar (desktop)

```
[Omen logo + wordmark]

Dashboard
Trade Analyzer        ← free, no badge
Draft Assistant       ← free this season (seasonal badge)
─────────────────
Omen of the Week      ← [Pro] badge for non-subscribers
─────────────────
Platform Status
Account
```

### Bottom Nav (mobile)

5 items max. Order: Dashboard | Trade | Draft | Omen | Account

Active state: gold accent underline or filled icon.

---

## Page-Level Padding

- Mobile: `px-4 py-6`
- Tablet: `px-6 py-8`
- Desktop: `px-8 py-10` inside the content area (sidebar handles its own padding)

Max content width: `max-w-3xl` for single-column tools, `max-w-5xl` for dashboard.

---

## Iconography

Use a consistent icon library (Heroicons or Lucide — to be confirmed before build).
Icons should be outline style in most contexts, filled only for active/selected states.
Raven/omen icon is a brand asset, not a generic icon — handle separately.

---

## Animation

- Keep it subtle. This is a decision tool, not an entertainment app.
- Transitions: 150ms ease-in-out for state changes
- Card hover: very subtle lift (translateY -1px, shadow increase)
- Loading: spinner at 1.5s rotation
- No bouncy, springy, or game-like animations

---

## Accessibility

- All interactive elements must be keyboard-navigable
- Color is never the only differentiator (confidence/risk must also use labels)
- Minimum text contrast: WCAG AA (4.5:1 for body, 3:1 for large text)
- Focus rings: visible, gold accent, consistent across theme modes
- Screen reader: all data labels and state messages must have `aria-label` or be in readable text (no icon-only status)
