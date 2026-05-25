# Corvus Context

## Product Layer

Corvus is the Fantasy Football MVP product inside the Slops Saloon division.

Path:

```text
C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus
```

It is not the SLOPS company layer and not the Slops Saloon division layer. It is the first active product under that division.

## Current Route

- Layer 0 - SLOPS OS: `C:\Users\JDuve\OneDrive\Desktop\SLOPS`
- Layer 1 - Slops Saloon division: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon`
- Layer 2 - Corvus product repo: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`

The old nested `Corvus/` subfolder is retired. Product DBS folders now live at this repo root.

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

## Active Handoffs

- Frontend to backend: `Blueprints/handoffs/frontend-to-backend.md`
- Backend to frontend: `Blueprints/handoffs/backend-to-frontend.md`
- Shared engineering decisions: `Blueprints/handoffs/decisions.md`
