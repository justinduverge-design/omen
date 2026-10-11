# Claude (MacBook, Tailscale): take over the football warehouse (state 2026-10-10)

You are taking over the football warehouse from Codex, which stopped after Batch A. You run on the
founder's MacBook with Tailscale, so you can reach the servers. **Every production command still goes to
Justin first as an exact command list, and waits for his yes** (`Direction/map.md` rules 4, 5, 10, 11).

## Start

1. `cd` into the omen repo, then `git fetch origin && git checkout main && git pull`.
2. Read `CLAUDE.md`, `Direction/map.md` and `Direction/agent_inbox.md` (the normal cold start).
3. Read, in order:
   - `Blueprints/prompts/2026-10-09-codex-warehouse-finish.md`: Codex's batch plan A–F. **It is your plan
     now**; Codex stopped after A.
   - `Blueprints/handoffs/2026-10-09-football-warehouse-merged-next-steps.md`
   - `Blueprints/handoffs/2026-10-09-football-warehouse-shadow-and-backup.md`
   - `Blueprints/specs/football-data/omen-stat-registry-v1.md` §3, for Batch C's metric definition
   - `Blueprints/specs/football-data/omen-fantasy-metrics-v1.md` §4, the opportunity rules
4. Check PR #592's state; see "Stats PR" below.

## Stats PR (#592), separate from the warehouse

- **Branch:** `claude/nfl-stats-legal-restrictions-936ujn`. CI green at `4d79a06b`.
- **Contents:** the specs (stat registry, fantasy metrics, trend evidence, trade value v3 "Crown Odds") and
  the beta slice of Omen's own stats in start/sit:
  - Fated Points, Fate Gap, TD Fate Gap, red-zone work, Pecking Order, Next Man Up, Projected Team Score;
  - code in `src/services/fantasyMetrics/`.
- **Unverified league scoring** (ESPN and Yahoo today) shows **no points at all**. The founder rejected a
  labelled PPR default (A6 rule).
- **Merge and deploy are the founder's call.** It must be deployed by **Monday 2026-10-13 afternoon** to be
  live for the Tuesday beta. Don't add warehouse work to this PR.

## Production freeze

**No production changes from Monday 2026-10-13 evening through the end of Tuesday** unless Justin asks.
The beta update ships Tuesday.

## Hosts (Tailscale)

| Host | Role |
|---|---|
| **KVM1** `omen-prod` (`srv1737978`) | API (`FOOTBALL_DATA_MODE=shadow` in `/opt/omen/deploy/hostinger/.env`), warehouse PostgreSQL 17 container (no host port), daily ingest timer `omen-warehouse-ingest.timer` 11:15 UTC |
| **KVM2** `model-host` | encrypted Restic backup repository; isolated restore proofs |
| **Pi** `cc` (100.98.81.0) | Beszel and Uptime Kuma; the Discord webhook lives **only** here |

- The Kuma push URL on KVM1 is `/etc/omen-warehouse/kuma-push-url` (root, 0600).
- **Never print it, or any secret.** Justin pastes every webhook, token and password himself.

## Work, in order

Finish each batch completely: branch from `main`, commit, push, draft PR, green CI, merge (with Justin's
yes), and only then the next batch.

**A. Verify Batch A actually runs (read-only first).**
- Codex merged PRs #587–#591 (scheduled backup and restore proof, SSH identity fix, private Kuma URL,
  repository locator, newest-snapshot selection). Nobody has confirmed the timers are installed and have run.
- Review the merged code in `infra/warehouse/backup/` (the `omen-warehouse-backup` and
  `omen-warehouse-restore-proof` service and timer units, `run-nightly-backup.sh`,
  `run-weekly-restore-proof.sh`, `apply-retention.sh`, `export-restore-file.sh`,
  `receive-restore-source.sh`).
- Then give Justin a read-only check:
  - `systemctl list-timers` and `systemctl status` for both units on the right hosts;
  - the last journal entries;
  - the newest Restic snapshot on KVM2;
  - the Kuma backup monitor state.
- If the timers are not installed, propose the exact install commands and wait.
- Retention is set from measured KVM2 growth, never a guessed count.
- **Done when** one scheduled backup and one scheduled restore proof have run from their timers.

**B. Small fixes from the #577 review** (all code):
- Weekly rosters are rewritten every run even when the source is unchanged. Skip them like the other stages.
- `.github/workflows/warehouse-worker-image.yml` triggers only on the old branch. Trigger it on `main` for
  warehouse paths.
- An invalid `FOOTBALL_DATA_MODE` makes `/api/start-sit/detail` 404. Exit at startup instead.
- The credential proofs in `provision-login-roles.sh` and the backup pgpass connect over 127.0.0.1, which is
  trusted. Prove the passwords over the network.
- `monitor/status-export` connects as the superuser. Use the backup role.
- Document that `docker-compose.prod.yml` needs `omen_warehouse_net` and the reader secret even in
  `supabase` mode.

**C. Opportunity table and the first Omen metric.**
- Fill `football.nfl_player_weekly_opportunity` from `football.nfl_plays.source_row` with exactly the
  `nflverseFacts.buildOpportunity` rules (`src/services/fantasyMetrics/fatedPoints.js` `rollupPlayerWeeks`
  matches them and has a parity test):
  - red zone ≤ 20, inside 10, goal line (carries ≤ 5), end-zone targets (`air_yards ≥ yardline_100`),
    deep (`air_yards ≥ 20`);
  - exclude two-point tries and `no_play`;
  - `snaps`, `snap_share` and `routes` stay null (snap rights review open; routes have no licensed source).
- The first `football_metric_*` run is **`RAT-QB` v0** from the stat registry §3 (EPA per dropback, CPOE,
  sack avoidance, turnover-worthy rate, rushing EPA), named `omen_qb_grade` with `formula_version` `v0`, no
  opponent adjustment and no fitted weights. Document and test it.
- **Do not wire it into VORP or the decision engine.** Protected files: `src/services/vorp.js`,
  `decisionBriefV2.js`, `decisionContext.js`, `systemContracts.js`, `llm.js`.
- Writing to omen-prod is a separate yes, outside the freeze.

**D. Backfill 1999–2025**, oldest first, one season per run.
- Pause on source drift, unmatched rows over threshold, disk pressure, or a failed backup.
- About 11 GB estimated; KVM1 has about 81 GB free.
- Re-measure the KVM2 backup afterwards.
- Every run is a command list Justin approves.

**E. Shadow parity, then promotion.**
- After real start/sit traffic, read the "Football warehouse usage shadow" logs and classify every
  difference.
- Propose `FOOTBALL_DATA_MODE=warehouse` with exact commands and wait. Supabase stays as rollback.

**F. Retire duplicates**, each separately approved: Supabase step 14 and its daily job
(`src/omen_nflverse_weekly_stats_cron.js`), and the old `omen-football-*` timers on KVM1 if the warehouse
replaces them.

## Rules

- **Never `docker compose down -v`.** Never delete volumes or credentials. Never touch Supabase data.
- **The warehouse stays nflverse-only.** `rights_basis = 'nflverse_open_data'`. No new sources: the
  founder decided 2026-10-10 that cap space and contracts stay out. FTN charting is read through the
  football-intelligence path, never loaded into the warehouse.
- **Metric names match `^omen_[a-z0-9_]+$`.** Every stat Omen creates must be in the stat registry; a
  definition change is a new version logged in `Direction/decision_log.md`.
- **Before each PR:** review the diff (`slops-code-review`, or `/code-review`). Ask `@codex review` for
  database, credential or user-data changes.
- **Gates:** run `npm test` and `node scripts/contract-recorded.js check`.
  - In the cloud container, `footballWarehouseReleaseArtifact` (release verifier) and
    `footballWarehouseUsageShadow` (×2) fail on clean `main` but pass in CI. On the MacBook, check whether
    they pass.
- **Close-out per `CLAUDE.md`:** decision log, skill-usage log line, sprint status with `Evidence:`, and a
  dated handoff in `Blueprints/handoffs/` if work continues.
- Commit and push at the end of every batch. Write a checkpoint before you stop.
