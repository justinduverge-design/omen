# Codex: finish the football warehouse and hook it up (state 2026-10-09 evening)

**Start:** `git fetch origin && git checkout main && git pull`. Read
`Blueprints/handoffs/2026-10-09-football-warehouse-merged-next-steps.md`.

**Your old plan (Batches 1-8, written when production was at 0%) is out of date.** Where it stands:

| Old batch | Status |
|---|---|
| 1 Commissionable database + Python publisher | Done |
| 2 Pinned worker image + release | Done |
| 3 Application shadow path | Done |
| 4 Live command scope | Done (approved) |
| 5 Commission omen-prod, load 2026 | Done (2026-10-08) |
| 6 Shadow + recovery + monitoring | **Partly done.** Monitoring done by Claude; one manual backup and one manual restore proven. Open: scheduled backup/restore, shadow parity on real requests |
| 7 Promote to `warehouse` | Not started |
| 8 Backfill 1999+, OQBE, Step-14 retirement | Not started |

PR #577 is **merged** (`e5f11632`). Do not reopen or recreate it.

## Your uncommitted work

`~/.codex/worktrees/omen-warehouse/omen` still has the uncommitted restore dispatcher
(`infra/warehouse/backup/export-restore-file.sh`, `receive-restore-source.sh`, and edits to
`build-release.sh`, `publish_release_root.py`, `verify-release.sh` and two tests). Move it onto a new
branch from current `main` and finish it in Batch A.

## Verified live (read-only)

- **Production:** runs main with `FOOTBALL_DATA_MODE=shadow`, pinned in
  `/opt/omen/deploy/hostinger/.env` on KVM1, so every deploy keeps it. Rollback: set `supabase`.
  Supabase answers every request.
- **P1 fixed before the merge:** the read pool has an `error` listener, so a warehouse restart cannot
  exit the API.
- **Daily ingest:** `omen-warehouse-ingest.timer` on KVM1, 11:15 UTC
  (`infra/warehouse/schedule/`). It runs the selected release's pinned worker, `ingest --season YYYY`,
  `--no-deps`. 2026 is current through week 5 Thursday.
- **Alerting:** all of it runs on the Pi (`cc`, 100.98.81.0).
  - Beszel alerts all five hosts to Discord: down, memory over 90%, disk over 80%.
  - Uptime Kuma has a Discord notification on every monitor, plus push monitor **#7** "Omen
    warehouse daily ingest" with a 26 h window. The ingest pushes `up` on success and `down` on
    failure.
  - The Discord webhook exists **only on the Pi**. KVM1 has the Kuma push URL at
    `/etc/omen-warehouse/kuma-push-url` (root, 0600).
- **Backups:** one encrypted backup and one isolated restore proven (10-09). **Nothing is scheduled.**

## Batches, in order

Finish each completely before the next: commit, push, PR, green CI, merge.

**A. Scheduled recovery.**
- Finish the dispatcher.
- Add a nightly KVM1→KVM2 encrypted backup timer and a weekly isolated restore proof on KVM2.
- Set retention from measured KVM2 growth.
- Give the backup its own Kuma push monitor, the same pattern as #7. Justin creates the monitor and
  pastes the push URL himself.
- Done when one scheduled backup and one scheduled restore proof have run from their timers.

**B. Small fixes from the #577 review.**
- Weekly rosters are rewritten every run even when the source is unchanged; skip them like the other
  stages.
- `.github/workflows/warehouse-worker-image.yml` triggers only on the old branch; trigger it on
  `main` for warehouse paths.
- An invalid `FOOTBALL_DATA_MODE` currently makes `/api/start-sit/detail` 404; exit at startup
  instead.
- Credential proofs in `provision-login-roles.sh` and the backup pgpass connect over 127.0.0.1, which
  is trusted; prove the passwords over the network.
- `monitor/status-export` connects as the superuser; use the backup role.
- Document that `docker-compose.prod.yml` requires `omen_warehouse_net` and the reader secret even in
  `supabase` mode.

**C. Opportunity and the first Omen metric.**
- Fill `nfl_player_weekly_opportunity` from plays. `source_row` holds every nflverse column.
- Use the rules in `src/services/nflverseFacts.js` `buildOpportunity`: red zone, inside 10, inside 5,
  end zone and deep targets. Exclude two-point tries and `no_play`.
- Then the first `football_metric_*` run: an EPA + CPOE quarterback value ("Omen QB value v0"),
  documented and tested.
- **Do not wire it into VORP or the decision engine.** `src/services/vorp.js`, `decisionBriefV2.js`,
  `decisionContext.js`, `systemContracts.js` and `llm.js` are protected; the founder and Claude own
  that hookup.

**D. Backfill 1999-2025**, oldest first, one season per run.
- Pause on source drift, unmatched rows over threshold, disk pressure or a failed backup.
- About 11 GB estimated; KVM1 has about 81 GB free.
- Re-measure the KVM2 backup afterwards.

**E. Shadow parity, then promotion.**
- After the founder's phone walkthrough produces real start/sit traffic, read the "Football warehouse
  usage shadow" logs and classify every difference.
- Propose `FOOTBALL_DATA_MODE=warehouse` in the `.env` **with the exact commands, and wait for
  Justin's yes.** Supabase stays as rollback.

**F. Retire duplicates**, each separately approved:
- Supabase step 14 and its daily job (`src/omen_nflverse_weekly_stats_cron.js`);
- the old `omen-football-*` timers on KVM1, if the warehouse replaces them.

## Rules

- Any production change on KVM1, KVM2 or the Pi: send Justin the exact command list first.
- Never `docker compose down -v`. Never delete volumes or credentials. Never touch Supabase data.
- Never print secrets. Justin pastes every webhook, token and password himself.
- **The beta update ships Tuesday 2026-10-13.** No production changes from Monday evening through
  the end of Tuesday unless Justin asks.
- Rate limit: commit and push at the end of every batch; write a checkpoint before you stop.
