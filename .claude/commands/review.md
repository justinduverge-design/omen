---
description: Fresh-agent review of the current diff before opening a PR
---
Run `npm run closeout` first and fix anything it blocks on. Then hand the diff to the `reviewer`
subagent (fresh context). Fix every P0/P1 it reports, re-run the affected tests, and repeat the review
once if you changed logic. List what was found and fixed in the PR body.
