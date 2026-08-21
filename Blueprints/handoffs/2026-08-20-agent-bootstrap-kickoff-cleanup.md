# Agent Bootstrap and Kickoff Cleanup

## Objective

Remove duplicated runtime wrappers and retire the `kickoff-l2.md` filename without breaking standalone Omen clones.

## Changes

- `AGENTS.md` is now Omen's shared canonical repository bootstrap.
- `CLAUDE.md` is a thin Claude Code adapter that imports `AGENTS.md`.
- The redundant singular `AGENT.md` was removed after its useful safety boundaries and close-out report requirements were absorbed into `AGENTS.md`.
- The old `kickoff-l2.md` entry was renamed to the local `Blueprints/prompts/kickoff.md`.
- Live Omen references were updated to the canonical wrapper and kickoff paths.

## Intentionally preserved

- Historical handoffs, decision-log entries, and skill-ledger rows still name the files that existed when those records were written.
- Omen keeps a local kickoff so standalone clones and CI do not depend on the parent SLOPS checkout.

## Verification

- `git diff --check`
- Live-reference search for `kickoff-l2.md` and singular `AGENT.md`
- Path-existence check for current wrapper and kickoff references

## Status

Documentation cleanup only. No application code, production configuration, dependency, database, deployment, or provider behavior changed.
