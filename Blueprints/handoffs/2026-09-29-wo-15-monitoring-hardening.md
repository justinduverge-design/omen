# WO-15 follow-on — monitoring hardening (2026-09-29 → 2026-09-30)

**Status:** applied live and verified across all five hosts; every planned check is built and the Pis are on the new kernel.
**Context:** `2026-09-29-wo-15-backup-repair.md` covers the backup incident this grew out of.

## Done and verified
- **Identity by machine-id, not hostname** for every monitor/backup guard. The first scheduled Supabase backup after the change succeeded.
- **Alerts say what and why:** the dispatcher labels every record. It sees **14 checks, all HEALTHY** (omen-ready, tls-expiry,
  supabase/football backup freshness, restic-integrity, command-center-alive, network-health, auth-security, listener-drift,
  omen-host-patch ×2, omen-host-posture ×2, public-exposure). Each new check was proven with real runs and simulated WARNING/CRITICAL/DOWN/crash cases.
- **Restart policy on all five hosts** after supervised reboots (KVM2 ~35s, KVM1 ~60s, Sentinel ~91s, Steward ~101s, Command Center ~40s).
- **Pi kernel/firmware 6.18.39 → 6.18.50, by hand:** Sentinel (canary, 10-minute soak: 0 Wi-Fi drops, no throttling), then Steward
  (identical Pi Zero 2 W), then Command Center (Pi 4B). Each had a verified fallback copy of the boot partition first. Boot times 90s / 97s / 39s.
- **Who watches the watchers:** the dispatcher now reports a Pi unreachable for 10+ minutes (it used to read as "no data", which looks
  healthy), and Steward's `command-center-alive` checks the dispatcher host (WARNING once, DOWN on the second consecutive failure).
- **Fixed along the way:** listener-drift false alarm on `systemd-timesyncd` after boot; boot-time false DOWNs in Steward (retries); no
  reboot-required signal on Debian (hook); volatile Pi journals (now persistent); scanner false positives (home network answers TCP 53; canary + fewer workers).

## Operating notes
- **Deliberate change → refresh the drift baseline:** `sudo sentinel-omen-posture-baseline-refresh kvm1|kvm2` on Sentinel. Adding a timer,
  container or key WILL raise a drift warning until you do. Never refresh to silence an alert you have not understood.
- **Expected SSH users** per VPS: `/etc/omen-host-posture/expected-ssh-users`.
- **Pi kernel updates stay manual.** Follow `Blueprints/playbooks/pi-kernel-update-runbook.md`, one Pi at a time, with someone able to reach the device.

## Not done / open
- **Native Moves ledger: code fixed (PR #490, merged), Ledger still unavailable until a migration is applied.** GlitchTip #13 (150 events
  since 2026-09-16) was the route selecting `moves` columns production lacks (`result`, `scored_at`, `platform`, `league_id`). It now
  degrades cleanly and returns 503 `league_scope_unavailable` when it cannot scope by league. **To bring the Ledger back:** approve and
  apply `sql/2026-09-29_moves_league_scope_review.sql` via approval → staging → verification → production. It adds nullable columns with
  no backfill, so pre-migration history stays hidden. Details: `2026-09-29-ledger-production-schema-fix.md`.
- Command Center's bootloader EEPROM has an update available; not applied (separate firmware flash).
- The dispatcher *service* stopping while Command Center stays up is not detected.
- `omen-football-restore` has the corrected guard but has not been run.

## Findings worth knowing
- Uptime Kuma monitors only the public site, API health/ready and GlitchTip. Sentinel and Steward are Pi Zero 2 W boards (no Ethernet).
- Unattended-upgrades worked all along; the gap was restarts. KVM1's runner is a bare process restarted by `@reboot` cron.
- KVM2 has `PasswordAuthentication yes` in `50-cloud-init.conf`, overridden today; the posture check hashes the effective `sshd -T`.

## Rollback
Every changed file has a copy under `/var/backups/*-script-history/` on its host (dispatcher/labeler: `/var/backups/slops-alerting-history/` on
Command Center). Boot-partition fallbacks: `/boot/firmware/fallback-6.18.39+rpt-rpi-v8/` on each Pi. Remove `/etc/apt/apt.conf.d/52omen-reboot-policy` to
stop automatic restarts; disable the `sentinel-omen-*` and `steward-command-center-alive` timers to remove those checks.
