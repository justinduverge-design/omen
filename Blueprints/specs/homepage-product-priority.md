# Spec: Homepage Product Priority

## Status

Active product direction

## Decision

The Trade Analyzer is the front door of Omen and should be the primary homepage feature.

The Draft Assistant is the seasonal preparation feature.

Omen of the Week is the main event / premium intelligence layer.

Start/Sit and Waiver Wire should be treated as logic paths inside Omen, not as primary homepage features.

## Product Metaphor

- Trade Analyzer = front door
- Draft Assistant = couch, food, and entertainment
- Omen of the Week = main event
- Start/Sit + Waiver Wire = encapsulated by Omen

## Homepage Layout

### Primary Section

Trade Analyzer hero.

Should include:
- Large headline
- Simple value proposition
- Example trade card/result
- Clear CTA

Example copy:

> Find out if the trade actually helps you win.

Example trade:

```text
You receive:
Breece Hall + Chris Olave

You give:
Deebo Samuel + James Conner

Omen says:
Accept — your weekly upside improves, and you gain a stronger long-term starter.
```

### Secondary Section

Two smaller side cards:

- Omen of the Week preview
- Draft Assistant preview

Omen preview should be smaller than Trade Analyzer.

Draft Assistant should sit beside Omen.

## Explanation Strategy

Do not expose heavy math by default.

Use plain English:

- improves your starting lineup
- adds weekly upside
- lowers risk
- fills your weakest position
- creates a weekly edge

Potential UI terms:

- Omen Edge: Strong
- Risk: Medium
- Why it matters
- Best move
- Safer play
- Higher upside

## Platform Strategy

ESPN, Yahoo, and Sleeper all matter.

ESPN is essential despite cookie/auth risk.

The product should support all three in the promise, even if engineering stabilization happens unevenly.

## Acceptance Criteria

- Trade Analyzer is visually dominant on homepage.
- Trade Analyzer includes an example result.
- Omen is present but smaller.
- Draft Assistant is present but secondary.
- Start/Sit and Waiver Wire do not compete as homepage headline features.
- Copy is simple and non-technical.
- Page remains mobile-friendly.
