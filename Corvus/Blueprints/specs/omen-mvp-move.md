# Omen of the Week / MVP Move Spec

## Purpose

Omen of the Week / MVP Move is the main Corvus event.

It should identify the highest-value fantasy football action for the user right now and explain it clearly.

## Included Decision Types

- Start/Sit recommendation
- Waiver pickup recommendation
- Trade suggestion
- Matchup-based player recommendation
- Risk/reward explanation
- Confidence score

## Current Product Rule

Start/Sit lives inside Omen / MVP Move.

Waiver logic lives inside Omen / MVP Move unless Justin explicitly separates it later.

## Required Platforms

Yahoo, Sleeper, and ESPN all matter.

ESPN is essential but risky. Omen / MVP Move needs recovery playbooks for ESPN connection failure, expired cookies, missing league context, and unclear user state.

## Output Standard

Users need plain-English reasoning, not heavy math.

A good recommendation should say:

1. The move
2. Why it matters
3. The risk
4. The confidence level
5. What data was used

## Launch Boundary

Mock data is acceptable for frontend integration only when clearly labeled.

Do not present mock or incomplete data as live fantasy advice.

