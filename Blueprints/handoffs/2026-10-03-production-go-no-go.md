# Go / no-go — database redo, production day

Read this on the morning of production day. **Every box must be ticked to go.** One unticked box means
no-go for the steps it guards. The step-by-step procedure is
`Blueprints/handoffs/2026-10-03-production-runbook.md`.

## Code and review

- ☐ A2 #523, A3 #524, A0 #525 and A1 #526 are merged **and deployed**, and the deploy workflow is green.
- ☐ The cron log shows the daily purge's two "skipped" lines (A3 ran).
- ☐ #527 (step 06), #528 (step 11), #529 (step 12) and the runbook PR are merged.
- ☐ No open Codex P1 on any redo file or on those PRs, read on each PR's **latest head**.
- ☐ CI is green on `main` at the commit being used. SHA: `________`

## Production as it is

- ☐ The newest production migration is still `20261002231212 drop_league_office`.
- ☐ The live catalog equals `production-catalog-2026-10-01.json` (`catalog.js diff`: identical).
- ☐ `runbook/snapshot.sql` matches the runbook's expected values, or each difference is written down
  and explained.

## Backup and rehearsal

- ☐ The newest nightly backup exists and its checksums pass.
- ☐ The dry run on a restored copy passed all twelve steps **in production order**, today or yesterday,
  and the copy was deleted.
- ☐ A fresh snapshot was taken right before the first step. Id: `________`

## People

- ☐ The founder is available for the hour after each step.
- ☐ The founder's iPhone has a test account ready for the deletion check (steps 05 and 10).

## Go

- ☐ **Go** — founder, date/time: ________

Each step still needs its own approval line in the runbook. "Go" here only means the day can start.
