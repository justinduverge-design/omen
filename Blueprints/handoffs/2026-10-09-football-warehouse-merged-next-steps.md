# Football warehouse: merged, and what is left — 2026-10-09

**Read this first if you are picking up the warehouse.** It is the single list of what remains. The
plan of record is still the one the founder approved on 2026-10-04: user data stays on Supabase (free
plan), football data lives in a self-hosted PostgreSQL 17 "football warehouse" on KVM1, backed up to
KVM2 (Tailscale name `model-host`), watched from the Pi command center.

## Where things stand (verified live, read-only, 2026-10-09)

- **PR #577 merged** (merge commit `e5f11632`) after a fresh-agent review. Its one P1 (the read pool
  had no `error` listener, so a warehouse restart could exit the API) was fixed first (`744288f8`).
  Production API and cron now run main again; before the merge they ran the unmerged branch.
- **Mode:** `FOOTBALL_DATA_MODE=shadow`, pinned in `/opt/omen/deploy/hostinger/.env` on KVM1 (Compose
  interpolation file, not secrets). Every deploy keeps it. **Rollback:** set it to `supabase`, redeploy.
  Supabase still answers every request; the warehouse is only read alongside.
- **Warehouse** `omen_football_warehouse` (postgres 17.11) on KVM1: healthy, private network only, no
  host port. Database `omen_football`, 134 MB. 2026 loaded once on 2026-10-08 through week 4: 32 teams,
  272 games (with lines and weather), 24,844 players, 4,445 player-weeks, 128 team-weeks, 12,809 roster
  rows, 11,155 plays. Plays keep the full 372-column nflverse row (`source_row`); player-weeks keep the
  150-column row. Nothing needs re-downloading to compute more.
- **Backup:** one encrypted Restic snapshot on KVM2 and one isolated restore, verified
  (`/var/lib/omen/warehouse-restore-proofs/`). KVM2 left clean.
- **Codex's unfinished work:** the Codex worktree `~/.codex/worktrees/omen-warehouse/omen` has
  uncommitted changes (scheduled restore dispatcher: `infra/warehouse/backup/export-restore-file.sh`,
  `receive-restore-source.sh`, and edits to `build-release.sh`, `publish_release_root.py`,
  `verify-release.sh`, two tests). It was not merged. Finish or discard it deliberately; do not lose it.

## What is left, in order

1. ~~**Daily warehouse ingest.**~~ **Done 2026-10-09** (#582, #584): `omen-warehouse-ingest.timer` on
   KVM1, 11:15 UTC daily, runs the selected release's pinned worker (`infra/warehouse/schedule/`).
   Proven through systemd; 2026 is current through week 5 Thursday.
2. **Scheduled backup and restore check.** Nightly backup to KVM2, weekly isolated restore (Codex's
   uncommitted dispatcher is the start of this). Then set retention from measured KVM2 growth.
3. ~~**Alerting.**~~ **Done 2026-10-09:** Beszel (on the Pi) alerts all five hosts to Discord: down 10 min,
   memory >90% 10 min, disk >80% 10 min. Uptime Kuma (on the Pi) has a Discord notification on all its
   monitors (it had none before), and push monitor #7 "Omen warehouse daily ingest" gets `up` after each
   good run and `down` on failure, alerting after 26 h of silence; proven with a real heartbeat. KVM1
   has no Discord webhook (it lives only on the Pi); the push URL is root-only at
   `/etc/omen-warehouse/kuma-push-url`. Still open: the `pi-watchdog` scripts are not installed, and the
   `down` path has not been fired on purpose.
4. **Shadow parity on a real request.** No signed-in Start/Sit request has produced a comparison yet
   (no app traffic since the switch). Needs the founder to use the app, then read the
   "Football warehouse usage shadow" log lines.
5. **Backfill 1999-2025**, one season per run, oldest first. Estimated ~11 GB (plays ~7.5 GB, rosters
   ~2 GB, player-weeks ~1.4 GB); KVM1 has ~81 GB free. Re-measure KVM2 backup growth after.
6. **Compute what is stored but empty:** `nfl_player_weekly_opportunity` (red zone, inside 10/5, end
   zone, deep; rules in `src/services/nflverseFacts.js` `buildOpportunity`) and `football_metric_*`
   (Omen's own metrics: a QBR-style EPA/CPOE quarterback value first, then usage and efficiency inputs
   for VORP).
7. **Promote to `warehouse` mode** once 1-4 pass; Supabase stays as rollback.
8. **Retire the duplicates**, each separately approved: Supabase step 14 table and its daily job
   (`src/omen_nflverse_weekly_stats_cron.js`), and the older `omen-football-*` capture/validate timers
   on KVM1 if the warehouse replaces them. Step 15 is retired for Supabase (never applied there).

## Open founder decisions

- Admit the NFL injury report (practice status, game designation)? Biggest single start/sit gain.
- Next Gen Stats, PFR advanced stats, ESPN QBR and depth charts, contracts stay out (rights decision
  2026-08-24); Omen builds its own versions from play-by-play instead.

## Known follow-up

- `omen_api` logs `MaxListenersExceededWarning` (11 `finish` listeners on one response) since the
  merge deploy. Not a crash; source not yet found. Spawned as its own task.
