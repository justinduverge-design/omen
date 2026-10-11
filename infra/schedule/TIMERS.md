# Omen timers: one schedule, one set of rules (inventory 2026-10-11)

Three hosts run scheduled work: **KVM1** `omen-prod` (API, football warehouse, football-data pipeline),
**KVM2** `model-host` (encrypted backup repository, restore proofs) and the **Pi** `cc` (Beszel, Uptime Kuma,
GlitchTip, alerting, independent witnesses). This file is the map. Change a timer, change this file.

## Rules

1. **Chain, don't guess.** If job B needs job A to have finished, B starts from A's success (`OnSuccess=`), not from
   a clock time 77 minutes later. Cross-host dependencies (restore proof after backup) keep a clock slot with a
   margin and are checked by their own heartbeat.
2. **One clock per pipeline.** The football-data pipeline runs on `America/New_York`; the warehouse follows it
   (07:15 ET) so daylight saving never makes them collide. nflverse's own publish is UTC (about 09:05), and 07:15 ET
   is always after it.
3. **Every job reports.** Success or failure reaches a Kuma push monitor (or Beszel for hosts). A job nobody
   watches is not scheduled.
4. **Tuesday morning belongs to the football-data pipeline** (05:15-07:45 ET). Nothing new is added there.
5. **Maintenance: Friday 06:00 UTC (02:00 ET), all year**, staggered KVM1 06:00, KVM2 06:30, Pi 07:00. Friday is the
   quietest day: Thursday night's game is over by about 03:30 UTC, no NFL game starts before Friday afternoon ET (2026:
   only Thanksgiving Friday and Christmas), and Sunday is two days away. The off-season keeps the same regular slot.
   It applies security updates and reboots only if the OS says a reboot is required, waits (up to 30 min) for running
   jobs, and is verified after boot. Never Monday evening through Tuesday.

## The daily warehouse chain (KVM1)

```
07:15 ET  omen-warehouse-ingest      (nflverse -> warehouse; derives opportunity + RAT-QB)
              | OnSuccess
              v
          omen-warehouse-backup      (encrypted dump -> KVM2 Restic; retention 7/4/3)  -> Kuma "warehouse nightly backup"
Sun 10:00 ET (14:00 UTC, KVM2)  omen-warehouse-restore-proof   (isolated restore of the newest snapshot)
```

Backfill (`omen-warehouse-backfill*`, transient units) is manual and never overlaps these.

## Inventory

### KVM1 `omen-prod`

| Timer | When | Purpose | Watched by |
|---|---|---|---|
| `omen-warehouse-ingest` | daily 07:15 ET | warehouse refresh; chains the backup | Kuma "Omen warehouse daily ingest" |
| `omen-warehouse-backup` | chained from ingest (timer disabled) | encrypted warehouse backup to KVM2 | Kuma "Omen warehouse nightly backup" |
| `omen-supabase-backup` | 00, 06, 12, 18 UTC | encrypted Supabase recovery backup | Pi witness / Restic check |
| `omen-restic-check` | Sun 09:30 UTC | Restic repository integrity (5% data subset) | journal |
| `omen-football-daily-capture` | daily 05:15 ET, months 1, 2, 9-12 | football-data immutable capture | Pi witness monitor |
| `omen-football-thursday-correction` / `-decision` | Thu 05:15 / 06:00 ET | corrections capture, publication decision | Pi witness monitor |
| `omen-football-monday-completeness` | Mon 05:30 ET | validate pending capture batches | Pi witness monitor |
| `omen-football-post-mnf-capture` | Tue 05:15 ET | capture after Monday night | Pi witness monitor |
| `omen-football-tuesday-validate` / `-publication-decision` | Tue 05:30 / 06:00 ET | validate, decide publication | Pi witness monitor |
| `omen-football-retry-0615` / `0645` / `0730` | Tue 06:15 / 06:45 / 07:30 ET | retry only after source loss | Pi witness monitor |
| `omen-football-backup` | Tue 07:45 ET | football-data encrypted backup | Pi witness monitor |
| `omen-a4-gates` | daily 09:40 UTC | evaluate Tuesday-scoring enablement gates | Pi `omen-a4-gates-pull` |
| `omen-host-posture-collect` | every 5 min | host posture (hashes and counts only) | Pi |
| `omen-watchdog` | every minute | restarts wedged-but-running containers | journal |
| `omen-maintenance` | Fri 06:00 UTC | weekly updates / reboot-if-required | Beszel + Kuma |
| OS: `apt-daily`, `apt-daily-upgrade`, `unattended-upgrades`, `certbot`, `logrotate`, `fstrim`, `sysstat-*`, `lynis`, `man-db`, `e2scrub_all`, `fwupd-refresh`, `dpkg-db-backup`, `motd/update-notifier` | OS-managed | patching, TLS renewal, housekeeping | n/a |

### KVM2 `model-host`

| Timer | When | Purpose | Watched by |
|---|---|---|---|
| `omen-warehouse-restore-proof` | Sun 14:00 UTC | isolated restore of the newest warehouse snapshot, proof file | journal (heartbeat monitor still to add) |
| `omen-host-posture-collect` | every 5 min | host posture | Pi |
| `omen-maintenance` | Fri 06:30 UTC | weekly updates / reboot-if-required | Beszel |
| OS timers (apt, certbot, logrotate, fstrim, ...) | OS-managed | patching and housekeeping | n/a |

### Pi `cc`

| Timer | When | Purpose |
|---|---|---|
| `slops-alert-dispatcher` | every few minutes | notification-only alert dispatcher |
| `omen-football-witness-monitor` | every few minutes | compare KVM1 football-data status with the independent witness |
| `omen-football-witness` | Tue 05:45 ET | independent football-data capture (witness) |
| `omen-a4-gates-pull` | daily 09:55 UTC | pull scoring-gate state from KVM1 |
| `slops-glitchtip-autoresolve` | daily 22:17 ET | auto-resolve GlitchTip issues that stopped happening |
| `omen-maintenance` | Fri 07:00 UTC | weekly updates / reboot-if-required (last: it hosts the alerting) |
| OS timers | OS-managed | patching and housekeeping |

## Maintenance install (per host, as root)

```sh
install -m 0755 omen-maintenance omen-maintenance-verify /usr/local/sbin/
install -m 0644 omen-maintenance.service omen-maintenance-verify.service /etc/systemd/system/
sed 's/@SLOT@/06:00/' omen-maintenance.timer > /etc/systemd/system/omen-maintenance.timer   # 06:30 KVM2, 07:00 Pi
printf 'BUSY_UNITS="..."\n' > /etc/omen-maintenance.conf       # jobs to wait for; see below
systemctl daemon-reload && systemctl enable --now omen-maintenance.timer omen-maintenance-verify.service
```

`BUSY_UNITS`: KVM1 `omen-warehouse-ingest.service omen-warehouse-backup.service omen-warehouse-backfill.service
omen-supabase-backup.service`; KVM2 `omen-warehouse-restore-proof.service`; Pi empty.

## Open items

- Weekly restore proof has no heartbeat monitor yet.
- `nfl_games.kickoff_at` is empty in the warehouse (the adapter does not fill it from `gameday` + `gametime`, both in
  `source_row`); needed for deadline and week-to-date conversions.
- Retention `7 4 3` is provisional (a full warehouse snapshot grew the KVM2 repository by about 0.9 GB).
