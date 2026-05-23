# ssffmvp Agent Handoff

## Current State

This file was recreated during a DBS integrity repair on 2026-05-21.

Use this repo as the active app workspace:

`C:\Users\JDuve\OneDrive\Desktop\SLOPS\ssffmvp`

## Layer Rules

- SLOPS is Justin / Slops OS / company operating system.
- `ssffmvp` is the Fantasy Sports MVP Builder department.
- `ssffmvp\Corvus` is the Fantasy Football MVP product layer.

## Product Rules

- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit lives inside Omen / MVP Move.
- Waiver logic lives inside Omen / MVP Move unless explicitly separated later.
- ESPN, Yahoo, and Sleeper all matter.
- ESPN is essential but risky and needs recovery playbooks.
- Users need plain-English reasoning, not heavy math.

## Safety Rules

Do not deploy, commit, push, delete files, move app folders, touch secrets, or modify production configuration without Justin's explicit approval.

Do not work from `Projects\ssffmvp`.

Do not touch `Archive\quarantine`.

