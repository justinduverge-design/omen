# Corvus Workflow + Specs Pack

Drop these files into the root of the active Corvus / Slops Saloon repo.

Likely location:

```text
C:\Users\JDuve\OneDrive\Desktop\SLOPS\ssffmvp\
```

or:

```text
C:\Users\JDuve\OneDrive\Desktop\SLOPS\Projects\Slops_Saloon\
```

## What this pack contains

- Updated project context files
- Current sprint and roadmap files
- Claude/Codex agent rules
- Prompt templates
- Specs for Corvus product direction
- ESPN recovery playbook draft
- Infrastructure boundaries so Codex does not try to move the app to Hostinger

## Recommended install

1. Extract the zip.
2. Copy the contents into the repo root.
3. If files already exist, compare before overwriting.
4. Keep `handoffs/agent_handoff.md` as the active baton between Claude and Codex.

## Current major decisions

- Trade Analyzer is the front door.
- Draft Assistant is the preparation feature.
- Omen of the Week is the main event.
- Start/Sit and Waiver Wire should be encapsulated by Omen.
- ESPN, Yahoo, and Sleeper all matter.
- ESPN is essential, but requires a recovery playbook.
- Oracle remains the app host for now.
- Hostinger KVM 2 remains the Ollama/Gemma AI box for now.
- Hostinger app deployment is parked until explicitly approved.
