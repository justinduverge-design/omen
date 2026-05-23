# ssffmvp Decision Log

## Active Decisions

- `ssffmvp` is the Fantasy Sports MVP Builder department and active app repo.
- Corvus is the Fantasy Football MVP product inside `ssffmvp`.
- App development happens inside `ssffmvp`.
- Corvus product, brand, and spec context lives inside `ssffmvp\Corvus`.
- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit lives inside Omen / MVP Move.
- Waiver logic lives inside Omen / MVP Move unless explicitly separated later.
- ESPN, Yahoo, and Sleeper all matter.
- ESPN is essential but risky and needs recovery playbooks.
- Users need plain-English reasoning, not heavy math.

## Open Decisions

- Whether old root-level planning files should remain as redirects or be archived later.
- Whether any tooling needs compatibility shims after active handoffs moved to `Blueprints\handoffs\`.
- Whether root `current_sprint.md` should remain retired in favor of `Direction\current_sprint.md`.
