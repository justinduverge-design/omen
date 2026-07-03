# Omen UX/UI Design System

**Date:** 2026-05-24 (v1) · 2026-07-03 (v2 reconciliation, in place — filename preserved for reference compatibility)
**Status:** **v2 — reconciled 2026-07-03 against production code.** `frontend/src/index.css` had drifted ahead of this v1 spec after the 2026-06-22 palette rebrand. This spec now reflects reality: Aged Brass `#A67C2E` (was Antique Gold `#B8952A`), Verdigris Green `#2F7D5B` (was Electric Violet `#5B2D8E`), Deep Crimson `#7E1717` (was `#8B1A1A`), plus Weathered Umber `#5A3A25` and DM Mono font (new since v1). Phase 1.x subsystems (team-theming, motif overlay, cultural-moment overlay, position chips, platform brand colors, confidence gradient endpoints, metallic tiers, demo accent) are indexed inline as they land in `frontend/src/index.css`. Component + voice guidance unchanged from v1. **Follow-up rewrite pass pending** to expand the v2 palette + Phase 1.x sections in-line (a fuller v2 revision was authored in the 2026-07-03 doctrine session but was not persisted through the merge; see the L1 fan-experience doctrine handoff for tracking).
**Extends:** `slops-saloon/Blueprints/specs/slops-os-app-template-spec.md`

## Inherits from (doctrine)

This spec is an **implementation reference**. Doctrine that governs it lives upstream:

1. `slops-saloon/Direction/decisions/slops-saloon-fan-experience-doctrine-v1.md` — Look Good — Play Good, two-sided presence, three-room mapping, chant medium follows skin, data-legibility invariant.
2. `slops-saloon/omen/Brand/brand-system.md` — canonical Omen brand (palette, typography, voice, product pillars, logo usage §12, marketing pillars provisional §10a).
3. `slops-saloon/Direction/decisions/corvus-ux-ui-direction-v1.md` — Omen UX/UI direction v1 (auth posture, screen priority).

When any conflicts with this document, **the upstream doctrine wins.** File issues rather than diverging silently.

---

## Purpose

This is the Omen-specific design system. It applies the Slops OS template with Omen brand tokens, components, voice, and patterns.

When building any Omen screen, this document and the Slops OS template are the two required references.

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

| Color | Feel | Use |
|-------|------|-----|
| Raven black | Authority, depth | Primary dark background |
| Charcoal | Structure | Card and panel surfaces |
| Bone white | Warmth, clarity | Text, light surface |
| Antique gold | Premium, CTA | Accent, upgrade prompts, confidence |
| Deep crimson | Alert, risk | Risk indicators, warnings |
| Electric violet | Intelligence | AI signal, Omen accent moments |

### Dark Mode Tokens (primary Omen experience)

```css
:root[data-theme="dark"] {
  --color-bg:              #0A0A0B;  /* raven black */
  --color-surface-1:       #1C1C1E;  /* charcoal */
  --color-surface-2:       #2C2C2E;  /* elevated charcoal */
  --color-surface-3:       #3A3A3C;  /* inset or hover */
  --color-border:          #3A3A3C;
  --color-border-subtle:   #2C2C2E;
  --color-text-primary:    #F5F0E8;  /* bone white */
  --color-text-secondary:  #AEAEB2;
  --color-text-tertiary:   #6D6D72;
  --color-accent:          #B8952A;  /* antique gold */
  --color-accent-hover:    #D4AC30;
  --color-accent-muted:    #3D2F0D;
  --color-risk-low:        #34C759;
  --color-risk-medium:     #FF9F0A;
  --color-risk-high:       #8B1A1A;  /* deep crimson */
  --color-omen:            #5B2D8E;  /* electric violet */
  --color-data-live:       #34C759;
  --color-data-stub:       #FF9F0A;
  --color-data-mock:       #636366;
  --color-data-unavailable:#3A3A3C;
}
```

### Light Mode Tokens

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
  --color-accent:          #92740F;  /* gold, darker for light bg contrast */
  --color-accent-hover:    #B8952A;
  --color-accent-muted:    #FEF3C7;
  --color-risk-low:        #16A34A;
  --color-risk-medium:     #D97706;
  --color-risk-high:       #991B1B;
  --color-omen:            #6D28D9;
  --color-data-live:       #16A34A;
  --color-data-stub:       #D97706;
  --color-data-mock:       #9CA3AF;
  --color-data-unavailable:#E5E5E3;
}
```

### Tailwind Config Extensions (omen-specific)

```js
// tailwind.config.js additions
colors: {
  raven: '#0A0A0B',
  charcoal: '#1C1C1E',
  bone: '#F5F0E8',
  gold: {
    DEFAULT: '#B8952A',
    light: '#D4AC30',
    muted: '#3D2F0D',
  },
  crimson: '#8B1A1A',
  omen: '#5B2D8E',
}
```

---

## Typography

### Font Pairing

- **Alegreya Sans** — Headings, display moments, product identity, Omen card titles, UI labels, buttons, inputs, and navigation.
- **Alegreya** — Body text and longer reading copy.

Do not use Cormorant Garamond. Both Alegreya faces are loaded in `frontend/src/index.css`.

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
