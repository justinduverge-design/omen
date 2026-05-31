# Corvus Brand System

**Status:** v1 — canonical brand reference
**Last Updated:** 2026-05-31

---

## 1. Identity

**Product name:** Corvus

Corvus is the fantasy football intelligence product inside the Slops Saloon ecosystem. It is the first product. Future Slops Saloon products will live alongside it.

**Parent company:** Slops Saloon. Not a former name — the umbrella.

**Primary tagline:** `Deus pascit corvos.`
Latin: "God feeds the ravens." Mythological resonance. Use in wordmark and brand contexts.

**Marketing line:** `See the move before the league does.`
Plain English. Use in landing page hero copy and marketing contexts.

**Retired taglines — do not use:**
- ~~"See the winning move."~~
- ~~"Where the math meets the legend."~~

---

## 2. What Corvus Is and Is Not

Corvus is a **decision layer**, not a chatbot, dashboard, or data dump.

It helps users decide what to do next: who to start, who to trade, who to pick up.

It knows the answer before you ask. It explains the move. It tells you the risk. It stops.

**Corvus is:**
- A sharp, observant fantasy football analyst
- A front office perspective in a consumer product
- A trusted sports mind that delivers a decision
- A product with a point of view

**Corvus is not:**
- A generic AI assistant
- A gambling product
- A meme brand
- A chatbot
- A corporate SaaS deck
- A fantasy content farm
- A spreadsheet

---

## 3. Brand Personality

| Quality | What it means |
|---|---|
| Dark | The aesthetic and tone are serious and intentional, not bright and cheerful |
| Strategic | Every output is aimed at a decision, not information |
| Observant | Corvus watches the league. It sees what others miss |
| Precise | Vague language erodes trust. Be exact |
| Premium | High-end presentation. No clutter, no shortcuts |
| Ancient in restraint | Raven/oracle/omen language sharpens the product. It does not make the interface harder to understand |

---

## 4. Voice

### Standard

Corvus should sound like a disciplined organization, not a corporation pretending to have personality.

Institutional but human. Direct. Opinionated. Never padded.

### Writing Rules

- Use plain English.
- Lead with the move, not the explanation.
- Be precise. Vague language erodes trust.
- Be warm. The platform exists to bring people together through sports.
- Do not pad.
- Do not hedge when a decision has been made.
- Do not use filler.
- Do not sound casual to the point of being flippant.
- Do not sound like a chatbot.
- Do not use empty startup language.
- Do not over-explain obvious points.
- Every sentence should carry weight.
- Avoid hype. The product earns attention through quality, not marketing noise.

### Product Copy Examples

Lead with the move, not the explanation.

Good: `"Start Player A over Player B — your upside improves by 4.2 expected points."`
Bad: `"Based on our analysis of multiple data signals, we recommend that..."`

Good: `"74 — Medium-High Confidence"`
Bad: `"Our system is moderately confident"`

Good: `"Your current lineup is solid. No move clears the bar this week."`
Bad: `"No recommendations available at this time."`

Use raven/oracle/omen language sparingly. It should sharpen the product, not make the interface harder to understand.

---

## 5. Visual Identity

Reference [`Blueprints/specs/corvus-ux-ui-design-system-v1.md`](../Blueprints/specs/corvus-ux-ui-design-system-v1.md) for all implementation details: CSS tokens, Tailwind config, typography usage rules, component specs, copy guidelines, accessibility requirements.

### Color Palette

| Color | Role | Feel |
|---|---|---|
| Raven black | Primary background | Authority, depth |
| Charcoal | Card and panel surfaces | Structure |
| Bone white | Text, light surface | Warmth, clarity |
| Antique gold | Accent, CTA, confidence | Premium |
| Deep crimson | Risk indicators, warnings | Alert, danger |
| Electric violet | AI signal, Omen accent | Intelligence |

Canonical hex values are defined in `corvus-ux-ui-design-system-v1.md`. Do not source values from archived docs.

### Typography

- **Cormorant Garamond** — Serif. Brand headlines, display moments, Omen card titles, product identity.
- **Alegreya Sans** — Sans-serif. All UI: nav, labels, body copy, buttons, inputs.

### Motif

Raven, oracle, omen, constellation intelligence, war-room judgment. Dark, strategic, presentation-worthy. No clutter.

---

## 6. Positioning

### One-Line Position

Corvus helps fantasy football players see their best move with clear, platform-aware reasoning.

### Audience

Fantasy football users who want confident weekly decisions without needing to become data scientists.

### Differentiation

Corvus combines fantasy football context, platform data, and plain-English explanation. The user leaves with a decision, not a spreadsheet assignment.

### Product Ladder

1. **Trade Analyzer** — free front door, no auth required, builds trust
2. **Draft Assistant** — helps users prepare for the season
3. **Omen** — the main weekly decision moment; paid core feature

---

## 7. Feature Naming

| Feature | User-Facing Name | Status |
|---|---|---|
| Weekly best move recommendation | Omen | Confirmed — paid core feature |
| Trade evaluation tool | Trade Analyzer | Confirmed — free tool |
| Subscription tier | Pro | Confirmed |
| Internal/brand nickname for trade tool | The Scale | Internal only, not user-facing yet |
| Waiver wire tool | Talon | Hold / provisional |
| Dashboard | Aerie | Hold / provisional |
| Paid tier brand name | Corvus Black | Hold / not confirmed |
| Weekly forecast | The Prophecy | Hold |
| League hub | Rookery | Hold |

Munin and Hugin are internal agent names only. Do not use in user-facing copy without separate approval.

---

## 8. Product Pillars

Every feature decision is governed by these four pillars. If a feature does not serve at least one, it does not belong.

| Pillar | What it means |
|---|---|
| **Decision Intelligence** | Every tool helps users make a better call. Data-backed, not gut-feel. |
| **Engagement** | The platform makes the game more interesting, not more complicated. Entertainment is the primary driver. |
| **Trust** | No misleading outputs. No dark patterns. No data sharing without necessity. Privacy is non-negotiable. |
| **Accessibility** | Intuitive on first use. No learning curve for core features. Familiar to anyone who has used a modern consumer app. |

---

## 9. Non-Negotiables

- No paid dependencies without CEO approval
- No placeholder features in production — hide incomplete features, never display them
- No unnecessary data collection
- No sharing user data without explicit necessity
- No compromise on system quality
- Choose the harder right over the easier wrong
- Avoid hype. The product earns attention through quality, not marketing noise

---

## 10. Open Questions / Later Decisions

1. **Paid tier naming** — `Corvus Black` is on hold. Decide before billing goes live. `Pro` is the confirmed subscription name for now.

2. **Feature rollout naming** — Talon, Aerie, The Prophecy, and Rookery are provisional. Confirm user-facing names before each feature ships, not before.

3. **Design system review** — `corvus-ux-ui-design-system-v1.md` should be reviewed against the Slops OS app template spec (`slops-saloon/Blueprints/specs/slops-os-app-template-spec.md`) before the next major UI build phase. Not urgent now.

4. **Archive the old Brand files** — Once this file is validated, `brand.md`, `BRAND_STRATEGY.md`, and `positioning.md` should be moved to `Archive/`. Do not do this until Justin confirms `brand-system.md` is ready.

5. **Tagline placement on the landing page** — `Deus pascit corvos.` works in wordmark and brand contexts. Confirm whether it appears in hero copy or only in the wordmark/about context.

6. **Platform naming convention in copy** — Confirm the standard for naming platforms in user-facing UI (e.g., "Connect Yahoo" vs "Connect your Yahoo league").
