# Corvus

Corvus is the Fantasy Football MVP product inside the `ssffmvp` Fantasy Sports MVP Builder department.

Corvus helps fantasy football users make better weekly decisions with clear recommendations, platform-aware context, and plain-English reasoning.

## Product Shape

- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit lives inside Omen / MVP Move.
- Waiver logic lives inside Omen / MVP Move unless explicitly separated later.

## Platform Priority

Yahoo, Sleeper, and ESPN all matter.

ESPN is essential but risky. Corvus needs recovery playbooks for expired cookies, broken imports, missing league context, and user reauthorization.

## DBS Navigation

- `Direction` contains product context, roadmap, sprint notes, and decisions.
- `Brand` contains product identity and positioning.
- `Blueprints` contains specs, workflows, and reusable product instructions.
- `Solutions` contains finished product-layer outputs.
- `References` contains supporting research and notes.
- `Assets` contains product-layer brand and media assets.
- `Archive` preserves superseded material after review.

## Corvus Extensions

`Brand/` is an approved Corvus-specific extension for brand identity, voice, and positioning.

`Assets/` is an approved Corvus-specific extension for logos, images, and screenshots.

`Direction`, `Blueprints`, `Solutions`, `References`, and `Archive` remain the core DBS folders.
