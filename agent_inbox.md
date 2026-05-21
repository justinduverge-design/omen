# Agent Inbox

## Active Task

Task ID: CORVUS-020
Owner: Codex first, then Claude
Status: Ready

## Goal

Verify the current Trade Analyzer implementation and prepare the app for a homepage hierarchy where Trade Analyzer is the primary front door.

## Product Direction

Trade Analyzer is the homepage hero.

Omen of the Week and Draft Assistant are secondary cards.

Start/Sit and Waiver Wire should be treated as logic paths inside Omen, not homepage headline features.

## Codex First

Codex should verify:

- Whether Trade Analyzer is built
- Which route/component handles it
- Which backend endpoint powers it
- Whether tests exist
- Whether the feature is mock, live, or partial
- Whether homepage can safely reference it

## Claude Second

Claude should update the homepage only after Codex confirms the current Trade Analyzer state.

Claude should:

- Put Trade Analyzer front and center
- Add an example Trade Analyzer card/result
- Move Omen example smaller to the side
- Move Draft Assistant beside Omen
- Keep the page polished and mobile-friendly

## Forbidden

- Do not deploy
- Do not move app to Hostinger
- Do not touch production secrets
- Do not modify `.env`
- Do not change DNS/SSL/Nginx
- Do not build unrelated features

## Required Output

Update:

- `agent_handoff.md`

Create/update if useful:

- `CURRENT_STATUS.md`
- `KNOWN_ISSUES.md`
