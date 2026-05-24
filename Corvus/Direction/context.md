# Corvus Context

## Product Layer

Corvus is the Fantasy Football MVP product inside `slops-saloon`.

It is not the SLOPS company layer and not the whole Fantasy Sports MVP Builder department. It is the first product in that department.

## Product Promise

Corvus should help users see the best fantasy football move without forcing them to understand heavy math.

The product should explain:

- what move to make
- why it matters
- what the risk is
- how confident Corvus is

## Tool Hierarchy

- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit lives inside Omen / MVP Move.
- Waiver logic lives inside Omen / MVP Move unless explicitly separated later.

## Platform Context

Yahoo, Sleeper, and ESPN all matter.

ESPN is essential but risky. Treat ESPN as a high-value integration that needs careful recovery flows, user guidance, and clear failure states.

## Voice

Users need plain-English reasoning, not heavy math. Math can support decisions, but the product should communicate like a trusted fantasy football analyst.

