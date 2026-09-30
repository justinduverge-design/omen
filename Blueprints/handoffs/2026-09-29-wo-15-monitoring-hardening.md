# WO-15 follow-on — monitoring hardening (2026-09-29 → 2026-09-30)

**Status:** applied live and verified across all five hosts. Restart policy enabled everywhere; every check designed in the
fleet spec is now built. **Remaining: Pi kernel/firmware updates (needs a person present), and the merge of this PR.**
**Context:** `2026-09-29-wo-15-backup-repair.md` covers the backup incident this grew out of.

## Done and verified
- **Identity by machine-id, not hostname** everywhere a monitor or backup guards on the host. The first *scheduled*
  Supabase backup after the change (2026-09-30T00:19:40Z) succeeded.
- **Alerts say what and why:** dispatcher labels Steward and Sentinel records. It now sees **13 checks, all HEALTHY**:
  omen-ready, tls-expiry, supabase/football backup freshness, restic-integrity, network-health, auth-security,
  listener-drift, omen-host-patch (kvm1, kvm2), omen-host-posture (kvm1, kvm2), public-exposure.
- **New checks:** patch state, host posture (drift + login events), external exposure, football-backup freshness, weekly Restic
  integrity (`restic check`, 5% data subset; first run 157 snapshots, no errors). Each was proven with real runs and simulated
  WARNING/CRITICAL/DOWN/crash cases.
- **Supervised reboots, all five hosts:** KVM2 ~35s, KVM1 ~60s (public `/api/ready` 200 in ~70s), Sentinel ~91s, Steward ~101s,
  Command Center ~40s (7 containers). `Automatic-Reboot` enabled: KVM1 08:00 UTC, KVM2 08:30 UTC; Pis 03:00/03:20/03:40 local ET.
- **Fixed along the way:** Sentinel's listener-drift false-alarmed on `systemd-timesyncd`'s ephemeral NTP socket after every
  boot (narrow exclusion added, real drift still detected); Steward's freshness checks recorded a false DOWN at boot (now retry
  4x over ~80s); Debian Pis had no reboot-required signal (hook added); Pi journals were volatile (now persistent).

## Operating notes
- **Deliberate change → refresh the baseline:** `sudo sentinel-omen-posture-baseline-refresh kvm1|kvm2` on Sentinel. Adding a timer,
  container or key WILL raise a drift warning until you do; that is the design. Do not refresh to silence an alert you have not
  understood.
- **Expected SSH users** per VPS live in `/etc/omen-host-posture/expected-ssh-users`; add a user there when you add a login.
- The home network answers TCP 53 for every address; the exposure scan ignores ports its canary also reaches.

## Not done
- **Pi kernel 6.18.50 and `raspi-firmware` are pending on all three Pis** and are not auto-installed (Raspberry Pi archive is not an
  allowed origin). A Pi boots one `kernel8.img`; a bad kernel needs keyboard + SD card. Update Sentinel first, with someone there.
- `omen-football-restore` has the corrected guard but has not been run.
- Nothing yet alerts if a Pi itself becomes unreachable *and* the dispatcher stays quiet (it reads Steward/Sentinel over SSH and
  treats failure as no data); Kuma covers what it covers.

## Findings worth knowing
- Unattended-upgrades was working all along; the gap was restarts. The 6 pending "security updates" on KVM1 were freshly published.
- KVM1's runner is a bare process restarted by `@reboot` cron, not a systemd unit — it survives reboots but is fragile.
- GlitchTip has three standing issues, one being `moves lookup failed: column moves.result does not exist` (the others are ESPN
  cookie/API 400s). Application-side; untouched.
- KVM2 has `PasswordAuthentication yes` in `50-cloud-init.conf`, overridden today; the posture check hashes the effective `sshd -T`.

## Rollback
Every changed file has a copy under `/var/backups/*-script-history/` on its host (dispatcher/labeler: `/var/backups/slops-alerting-history/`
on Command Center). Remove `/etc/apt/apt.conf.d/52omen-reboot-policy` to stop automatic restarts. Disable the `sentinel-omen-*` timers
and delete the `sentinel-status` users to remove Sentinel's VPS access; remove `omen-host-posture-collect.timer` on the VPSes.
