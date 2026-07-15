# UI Component System Backlog — Omen

**Date:** 2026-07-15  
**Status:** Active backlog for the UX/UI overhaul  
**Authority:** `Blueprints/specs/design/omen-ui-north-star-v1.md`

---

## Purpose

Break the Omen UX/UI overhaul into small, reviewable PRs.

Do not run a giant visual redesign PR. The sequence is:

1. lock current authority,
2. build primitives,
3. migrate pages,
4. elevate visual language,
5. add theme/colorway packs,
6. revisit future team skins.

---

## Build rules

Every component PR must answer:

- Which user job does this support: Decide, Compare, Monitor, Manage, Review, or Learn?
- Which existing page-local patterns does it replace?
- Which variants are allowed?
- Which variants are forbidden?
- Which tokens does it consume?
- What are the accessibility requirements?
- Which routes should migrate first?

No component may introduce a second hidden design system.

---

## P0 — primitive completion

### P0.1 — `Button`

**Why:** Buttons currently exist as page-local implementations in Landing, ConnectLeague, TradeAnalyzer, DraftAssistant, and other pages.

**Build:**

- `variant="primary|secondary|tertiary|danger|link"`
- `size="sm|md|lg"`
- `tone="accent|omen|risk|neutral"`
- `loading`, `disabled`, `leadingIcon`, `trailingIcon`
- `asChild` or equivalent link-safe behavior

**Migrate first:**

1. `frontend/src/pages/ConnectLeague.jsx`
2. `frontend/src/pages/TradeAnalyzer.jsx`
3. `frontend/src/pages/DraftAssistant.jsx`
4. `frontend/src/pages/Landing.jsx`

---

### P0.2 — `Input` / `Textarea`

**Why:** Inputs are currently manually styled across trade, draft, connect, share, and ESPN flows.

**Build:**

- `label`, `hint`, `errorMessage`
- `state="default|error|success"`
- `size="sm|md|lg"`
- optional leading/trailing affordances

**Migrate first:**

1. `ConnectLeague.jsx` Sleeper and ESPN fields
2. `DraftAssistant.jsx` number fields
3. `TradeAnalyzer.jsx` player-name fields
4. `TradeAnalyzer.jsx` share URL field

---

### P0.3 — `SegmentedControl`, `TabNav`, `RadioCardGroup`

**Why:** Selection patterns drift across scoring format, deal shape, football tabs, appearance mode, and ESPN browser guide.

**Build:**

- `SegmentedControl` for compact form choices.
- `TabNav` for switching page/tool views.
- `RadioCardGroup` for high-value choices with title + description.

**Migrate first:**

1. `TradeAnalyzer.jsx` scoring/deal-shape controls
2. `DraftAssistant.jsx` scoring format
3. `Football.jsx` tool tabs
4. `ConnectLeague.jsx` ESPN browser guide

---

### P0.4 — `PageHero`

**Why:** Product pages need one clear hierarchy instead of each route defining its own eyebrow/title/subtitle/chip rhythm.

**Build:**

- `eyebrow`
- `title`
- `subtitle`
- `trailing`
- optional `status`
- optional `flourish` slot

**Migrate first:**

1. `Football.jsx`
2. `OmenPage.jsx`
3. `DraftAssistant.jsx`
4. `ConnectLeague.jsx`
5. `WaiverWire.jsx`

---

### P0.5 — `EmptyState`, `ErrorState`, `LoadingState`

**Why:** Empty/error/loading states currently drift between tokenized states and hardcoded red/slate panels.

**Build:**

- built from `Card` / `Alert` as appropriate
- consistent retry action
- explicit state type: empty, disconnected, stale, error, loading
- contextual copy

**Migrate first:**

1. `OmenOfTheWeek.jsx`
2. `TradeAnalyzer.jsx`
3. `DraftAssistant.jsx`
4. `Football.jsx`
5. `Ledger.jsx` / `Standings.jsx`

---

## P1 — Omen compositions

### P1.1 — `DecisionBrief`

**Why:** Omen of the Week needs a premium, reusable decision surface.

**Shape:**

- verdict / move title
- recommendation summary
- confidence
- risk
- expected impact
- reasoning
- input honesty / signal list
- alternatives
- feedback slot

**Migrate first:** `OmenOfTheWeek.jsx`

---

### P1.2 — `PlatformConnectionCard`

**Why:** ConnectLeague has strong behavior but too much local UI.

**Shape:**

- platform badge
- title/description
- status badge
- primary action
- secondary actions
- recovery/error state
- step guide slot

**Migrate first:** `ConnectLeague.jsx`

---

### P1.3 — `PlayerRow` / `PlayerChip`

**Why:** Trade, draft, player comparison, and future roster views need shared player grammar.

**Shape:**

- name
- position chip
- team
- value/metric slot
- selected/recommended state
- unavailable/injury/future metadata slots

**Migrate first:**

1. `TradeAnalyzer.jsx`
2. `DraftAssistant.jsx`
3. `OmenOfTheWeek.jsx`

---

### P1.4 — `MetricStrip`

**Why:** Omen needs standard handling for VORP, confidence, risk, expected value, ADP, and matchup deltas.

**Shape:**

- label
- value
- delta
- tone
- explanation tooltip/help

**Migrate first:**

1. Trade result panel
2. Omen recommendation impact grid
3. Draft recommendation card

---

## P2 — page migration sequence

### P2.1 — public front door

Routes:

- `/`
- `/about`
- public Trade Analyzer demo surfaces

Goal:

- Replace page-local marketing UI with `MarketingHero`, `CTAGroup`, `FeatureCard`, and demo decision surfaces.
- Remove stale copy such as team-theme language when runtime does not support it.

---

### P2.2 — Command Center / Front Office

Route:

- `/football`

Goal:

- Reframe from generic tabs / Hall of Records into the user's fantasy front office.
- Keep PlatformStatusBar, LeagueStandings, post-win pulse, and tools, but organize around user jobs: today, roster, moves, league, record.

---

### P2.3 — premium Omen decision moment

Routes/components:

- `/omen`
- `OmenOfTheWeek.jsx`

Goal:

- Convert hardcoded slate/amber/red panels into `DecisionBrief` and standard states.
- Make the recommendation feel like the owner/GM call.

---

### P2.4 — GM-room Trade Analyzer

Route/component:

- `/trade`
- `TradeAnalyzer.jsx`

Goal:

- Keep current workflow strength.
- Migrate local controls to primitives.
- Elevate result panel and strategy sidebar.

---

### P2.5 — Draft Room

Route/component:

- `/draft`
- `DraftAssistant.jsx`

Goal:

- Keep strongest existing recommendation-card patterns.
- Standardize controls and state handling.
- Make top recommendations feel more premium and decisive.

---

## P3 — visual elevation

After primitives and page migration:

- introduce controlled lighting effects,
- add recommendation reveal motion,
- strengthen surface hierarchy,
- add texture layer rules,
- tune hover/focus polish,
- add reduced-motion equivalents.

Do not start here. This comes after the standard system exists.

---

## P4 — colorway/theme packs

Start with Omen-owned packs before team skins:

1. Core Omen
2. Blackout
3. Whiteout
4. Playoff Gold
5. Rivalry Crimson
6. Winter / Holiday
7. Draft Night

Team skins are future-only until a new approved theme-pack implementation plan exists.
