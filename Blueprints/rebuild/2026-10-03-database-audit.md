# Omen database audit — where we actually are (2026-10-03)

Evidence-based. Every claim below names its source. "Repo" = origin/main as
of 2026-10-03 ~6:45pm ET. The Pi fleet/KVM1 could not be live-probed from
this machine (no tailnet access); fleet state is per the 9/28 cross-check.

## SUPABASE PRODUCTION — the real kitchen

- **Applied:** newest migration is `20261002231212 drop_league_office`
  (source: today's production runbook, `Blueprints/handoffs/2026-10-03-production-runbook.md`).
- **Redo applied: 0 of 13 steps.** The runbook states it plainly: "Nothing in
  this file has been applied to production."
- **Committed but not applied:** the full 13-step redo series
  (`sql/2026-10-01-redo/`, steps 01–13, each with up/down/test SQL, runbook
  verify files, and expected catalog JSONs). Fully rehearsed on scratch and a
  restored clone — rehearsal passes, production untouched.
- Old JS migration framework archived to `Archive/superseded-db-2026-10-01/`.

## CODE — what's wired (repo evidence)

- **Cron container** (`Dockerfile.cron`, origin/main) schedules:
  - Tue 6:00 AM: `omen_tuesday_cron.js` scoring (gated by `OMEN_CRON_SCORING_ENABLED`)
  - Daily 4:15 AM: `omen_daily_purge_cron.js` (skips purges whose function isn't applied yet)
  - Daily 4:45 AM: `omen_player_crosswalk_cron.js` — nflverse `players.csv` + Sleeper dump → crosswalk tables (**identity ingest IS wired**)
  - Daily 6:30 AM: `omen_football_intelligence_cron.js` — nflverse FTN + play-by-play → `football_intelligence_signals` (**team signals ingest IS wired in code; the table is redo step 13, not yet applied**)
- **v3 decision brief** is served (`src/services/decisionBriefV2.js` exposes `decisionBriefV3`).
- **nflverse stats: NOT stored.** `src/services/playerUsage.js` live-fetches per request with a 6h cache. No player-weekly stats table exists in prod or in the redo. (Step 13 is team/coach *signals*, not player stats — raw facts deliberately not stored there.)
- **5 open PRs** (#550, #553, #554, #555, #535). All four Claude branches merge with **zero conflicts** — the failures are broken checks, not conflicts.
- Local commit `ebaf4f56` (19 founder amendments → v2 contracts) was never pushed and exists on no remote branch; remote contracts have since diverged. The old push-it-home plan is stale.

## PI FLEET — current state (9/28 cross-check, not live-verified today)

- **command-center (Pi 4):** Beszel Hub, Uptime Kuma, GlitchTip, Pi-hole, Beszel agent. Monitoring box — runs nothing Omen-backend today.
- **steward (Zero 2W):** Beszel agent only. **sentinel (Zero 2W):** passive network observer.
- **Verdict:** the "Pi as librarian" (weekly nflverse ingest) from the backend map is a *new role*, not current state. Nothing to migrate — it's greenfield.

## GAPS — what's actually missing

1. **0/13 redo steps applied to production.** The single biggest gap. Everything the v2 screens need (ledger tables, saved trades, league memberships, scoring rules, team signals) exists only as rehearsed SQL.
2. **Player-weekly nflverse stats: no table, no ingest.** Live-fetch + cache only. (Sketch: step 14.)
3. **4 open PRs are runbook preconditions** — they must merge and deploy *before* redo step 07. The queue sits in front of the gate.
4. **Daily 6:30 AM intelligence job vs missing table** — the cron container expects `football_intelligence_signals` (step 13); until the redo lands, that job has nowhere to write. Verify it degrades cleanly rather than error-spamming.
5. **ebaf4f56 orphaned** — decide: re-apply the 19 amendments onto current remote contracts, or retire the commit.

## ACTION PLAN — current state → backend map

**Phase 0 — this weekend, no Claude needed (Justin)**
- [ ] Review this audit; approve/adjust the step-14 sketch.
- [ ] Decide ebaf4f56: re-apply amendments or retire.
- [ ] Verify the 6:30 AM intelligence job's behavior while its table is missing.

**Phase 1 — Claude's limit resets (Claude builds, Justin merges)**
- [ ] Fix failing checks on #550, #553, #554, #555 → merge → deploy to KVM1.
- [ ] Runbook precondition met: server changes deployed before any db step.

**Phase 2 — production day (Justin signs each step)**
- [ ] Apply redo steps in runbook order: 07, 01, 02, 03, 04, 06, 11, 12, 05, 10, 08, 09, then 13. Per-step approval + verify + watch, per the runbook.

**Phase 3 — the notebook (Claude builds on scratch, Pi job in parallel)**
- [ ] Build step-14 migration (`14_nflverse_weekly_stats`); rehearse like the others.
- [ ] Build the Pi ingest job on command-center; test against scratch (production writes wait for Phase 2).
- [ ] Migrate readers: `playerUsage.js` and Tuesday cron read tables first, live-fetch as fallback.

**Phase 4 — screens live (Justin)**
- [ ] #553 explainer + evidence cross-check on the v2 screens; v1 "explainer" thesis live.
- [ ] Tuesday grading writes to the Ledger → the forward record v2 will learn from.

**Division of labor (too many chefs, fixed):** Muse = read-only analysis + sketches (zero rate-limit burn). Claude/Codex = builds + check fixes when limits allow. Justin = merges + per-step production sign-off. Nobody else touches the decision engine — that's Justin's.
