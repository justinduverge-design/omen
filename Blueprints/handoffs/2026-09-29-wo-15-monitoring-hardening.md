# WO-15 follow-on — monitoring hardening (2026-09-29 → 2026-09-30)

**Status:** applied live and verified. Restart policy enabled on KVM1/KVM2; Sentinel patch-state check built.
**Context:** `2026-09-29-wo-15-backup-repair.md` covers the backup incident this grew out of.

## Done and verified
- **Identity by machine-id, not hostname** on KVM1 (3 scripts), Steward (backup check), Sentinel (network-health,
  listener-drift). The first *scheduled* Supabase backup after the change (2026-09-30T00:19:40Z) succeeded.
- **Alerts say what and why:** dispatcher labels Steward and Sentinel records
  (`result=DOWN check=supabase-backup-freshness reason=…`). Nine checks are visible to it, all HEALTHY.
- **New checks:** `football-backup-freshness` (Steward) and `omen-host-patch` for `kvm1`/`kvm2` (Sentinel, hourly).
- **Supervised reboots:** KVM2 (5.15.0-186 → 191, back in ~35s, Restic readable from KVM1 afterwards) and KVM1
  (6.8.0-139 → 142, SSH ~60s, public `/api/ready` 200 within ~70s, 4 containers, runner, 14 timers, 0 failed units).
  `Automatic-Reboot` enabled at 08:00 UTC (KVM1) and 08:30 UTC (KVM2).
- **Housekeeping:** old script backups archived, journald retention raised on the Pis.

## Not done
- **Pis not on the restart policy** (Command Center 07:00, Steward 07:20, Sentinel 07:40 in the spec). None has had
  a supervised reboot; Steward is on Wi-Fi. Reboot Sentinel first, then Steward, then Command Center, verifying the
  checks resume each time.
- Sentinel's public-exposure, host-drift and auth-event checks, and a KVM2 / Restic-integrity check, are designed in
  the fleet spec, not built.
- `omen-football-restore` has the corrected guard but has not been run.

## Findings worth knowing
- Unattended-upgrades was working all along; the gap was restarts, not updates.
- KVM1's runner is a bare process restarted by `@reboot` cron (not a systemd unit) — it survives reboots but is fragile.
- GlitchTip has three standing issues, one of them `moves lookup failed: column moves.result does not exist`
  (ESPN cookies / API 400 are the other two). Not touched; application-side.
- My UU dry-run touched KVM1's upgrade stamp, so "last unattended-upgrade" read as fresh on 2026-09-30 until the next real run.

## Rollback
Every changed file has a copy under `/var/backups/*-script-history/` on its host. Dispatcher/labeler rollbacks are in
`/var/backups/slops-alerting-history/` on Command Center. Remove `/etc/apt/apt.conf.d/52omen-reboot-policy` to turn
off automatic restarts; disable `sentinel-omen-host-patch@*.timer` and delete the `sentinel-status` user to remove the
Sentinel channel.
