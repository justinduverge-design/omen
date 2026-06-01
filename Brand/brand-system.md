# Corvus Brand System

**Status:** v1 — canonical brand reference
**Last Updated:** 2026-06-01

---

## 1. Identity

**Product:** Corvus
**Parent:** Slops Saloon

Corvus is the fantasy football intelligence product inside the Slops Saloon ecosystem. It helps managers see the best move before the rest of the league does.

**Primary tagline:** `Deus pascit corvos.`
Use for wordmark, lore, and brand context.

**Marketing line:** `See the move before the league does.`
Use for landing pages, hero copy, and public-facing explanations.

**Do not use:**
- "See the winning move."
- "Where the math meets the legend."

---

## 2. What Corvus Is and Is Not

Corvus is a **decision layer**, not a chatbot, dashboard, data dump, or gambling product.

It helps fantasy managers decide what to do next: who to start, who to trade, who to pick up. It gives the move, explains the risk, and stops.

**Corvus is:**
- A sharp fantasy football analyst
- A front office perspective in a consumer product
- A trusted sports mind with a point of view

**Corvus is not:**
- A generic AI assistant
- A meme brand
- A corporate SaaS deck
- A fantasy content farm
- A spreadsheet assignment

---

## 3. Brand Personality

| Quality | Meaning |
|---|---|
| Strategic | Every output points toward a decision. |
| Observant | Corvus sees what others miss. |
| Precise | Vague language erodes trust. |
| Premium | High-end presentation. No clutter. |
| Mythic restraint | Raven, oracle, and omen language should sharpen the product, not obscure it. |

---

## 4. Voice

Corvus sounds institutional but human: direct, opinionated, restrained, and useful.

### Writing Rules

- Lead with the move, not the explanation.
- Use plain English.
- Be precise. Vague language erodes trust.
- Be warm without becoming casual or flippant.
- Do not pad. Do not hedge after a decision has been made.
- Avoid hype, filler, and empty startup language.
- Do not sound like a chatbot.
- Every sentence should carry weight.

### Product Copy Examples

Good: `"Start Player A over Player B — your upside improves by 4.2 expected points."`
Bad: `"Based on our analysis of multiple data signals, we recommend that..."`

Good: `"74 — Medium-High Confidence"`
Bad: `"Our system is moderately confident"`

Good: `"Your current lineup is solid. No move clears the bar this week."`
Bad: `"No recommendations available at this time."`

---

## 5. Visual Identity

Reference `Blueprints/specs/corvus-ux-ui-design-system-v1.md` for implementation details.

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

### Active User-Facing Names

| Feature | Name |
|---|---|
| Weekly best move recommendation | Omen |
| Trade evaluation tool | Trade Analyzer |
| Subscription tier | Pro |

### Internal or On-Hold Names

| Name | Status |
|---|---|
| The Scale | Internal nickname for Trade Analyzer |
| Talon | Provisional waiver feature name |
| Aerie | Provisional dashboard name |
| Corvus Black | Paid tier name on hold |
| The Prophecy | Hold |
| Rookery | Hold |
| Munin / Hugin | Internal agent names only |

---

## 8. Product Pillars

Every feature should serve at least one pillar.

| Pillar | What it means |
|---|---|
| **Decision Intelligence** | Every tool helps users make a better call. Data-backed, not gut-feel. |
| **Engagement** | The platform makes the game more interesting, not more complicated. Entertainment is the primary driver. |
| **Trust** | No misleading outputs. No dark patterns. No data sharing without necessity. Privacy is non-negotiable. |
| **Accessibility** | Intuitive on first use. No learning curve for core features. Familiar to anyone who has used a modern consumer app. |

---

## 9. Non-Negotiables

- No paid dependencies without CEO approval.
- No placeholder features in production.
- Hide incomplete features; never promote them.
- No unnecessary data collection.
- No user data sharing without explicit necessity.
- No compromise on system quality.

---

## 10. Open Questions / Later Decisions

- Confirm paid tier name before billing goes live: `Pro` vs `Corvus Black`.
- Confirm user-facing names before each feature ships: Talon, Aerie, The Prophecy, Rookery.
- Review design system against the Slops OS app template before the next major UI build.
- Archive old brand files after this file is approved.
- Decide whether `Deus pascit corvos.` appears in hero copy or only brand/wordmark contexts.
- Confirm platform naming convention in UI copy.
