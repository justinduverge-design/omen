# A4 — Tuesday Scoring No-Write Dry-Run Prep

**Date:** 2026-07-31
**Authority:** ATA-20260731-02 — no-write Supabase dry-run against real nflverse data only; production flag flip explicitly excluded.
**Status:** BLOCKED — cannot execute the dry-run as scoped without a founder decision. Documenting the gap rather than faking it.

## What the done-when asks for

`Direction/current_sprint.md` A4: "dry-run validates real rows without writes **against real nflverse data**."

## What the code actually does

`src/omen_tuesday_cron.js` (the only Tuesday-scoring worker in the repo) is hard-wired to **Sportradar**, not nflverse:

- `REQUIRED_SCORING_ENV` (line 19-23) lists `SPORTRADAR_API_KEY` as a hard requirement — `runScoring()` throws immediately if it's missing (line 268-271). There is no fallback path.
- `fetchNFLScores()` (line 190-208) calls `https://api.sportradar.com/nfl/official/trial/v7/en/...` directly with `env.SPORTRADAR_API_KEY` in the URL.
- There is **no dry-run mode implemented anywhere in `src/`.** I grepped for `OMEN_CRON_DRY_RUN`, `dryRun`, `dry_run` across all of `src/` — zero matches, despite `deploy/hostinger/ENV-INVENTORY.md`:35 documenting `OMEN_CRON_DRY_RUN` as a supported flag ("Runs Tuesday scoring without writes when set to `true`"). The inventory describes a capability that was never built.

Meanwhile, `deploy/hostinger/ENV-INVENTORY.md`:36 itself already flags the contradiction: `SPORTRADAR_API_KEY` is "Legacy/deferred scoring provider key; **not required by current nflverse scoring path**" — but no such nflverse scoring path exists in the cron worker. The only real nflverse integration in the repo is `src/services/matchupService.js`, which pulls `player_stats_<season>.csv` from the public `nflverse/nflverse-data` GitHub releases (MIT-licensed, **no API key, no cost**) for defense-vs-position context — not for scoring moves. I confirmed that CSV already carries `season`, `week`, `position`, `opponent_team`, and `fantasy_points`/`fantasy_points_ppr` columns, which is exactly what weekly move-scoring needs — so wiring Tuesday scoring to nflverse instead of Sportradar looks feasible, but it does not exist today.

## Why I stopped instead of proceeding

Two ways I could have "completed" this that I rejected:

1. **Run it against Sportradar and call it done.** This would misrepresent the evidence (the done-when explicitly says nflverse data) and would mean silently spending against a paid API without approval — the sprint guardrails prohibit "no paid dependency, cloud model spend, or external service commitment without explicit approval," and I don't have a Sportradar key in scope anyway.
2. **Quietly rewrite the cron worker to source from nflverse instead.** That's real behavior-changing backend code (new data-shape mapping, name-matching against nflverse rows instead of Sportradar's, tests, TDD red/green, code review) — a genuine implementation task, not a "dry-run prep" pass, and bigger than the audit-prep-style assignment I was actually granted for A4.

## Recommendation

Treat "replace Sportradar with the free nflverse weekly stats feed in `omen_tuesday_cron.js`" as its own scoped implementation task before A4's dry-run can honestly be run. It would also drop the last paid-API dependency in the scoring path, consistent with "Omen is free indefinitely." I did not start that work — it needs its own plan-approval pass (files touched, test plan, cost) rather than folding into this prep pass.

## What did NOT happen

No Supabase write. No Sportradar call. No env value read or displayed. No code changed.
