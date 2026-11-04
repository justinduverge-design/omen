# Weekly SSD→SD copy and boot alerts (`B13-HEAL-SD-SYNC`)

Reference copies: editing them here changes no Pi. Every step below is a Pi write and needs the founder's
approval for that exact step. Command Center only (hostname `Comand-Center`; check names say `command-center`).

| File | Deployed path |
|---|---|
| `slops-boot-check` | `/usr/local/sbin/slops-boot-check` (`root:root` `0755`) |
| `slops-sd-sync` | `/usr/local/sbin/slops-sd-sync` (`root:root` `0700`) |
| `slops-sd-sync.service`, `.timer` | `/etc/systemd/system/` |
| `../../command-center/slops-alert-dispatcher` | `/usr/local/sbin/slops-alert-dispatcher` (`0700`) |

## What it reports

`slops-boot-check command-center` is read-only and runs inside the dispatcher's power block every tick:

| Check | Result | Reason |
|---|---|---|
| `command-center-booted-from-sd` | CRITICAL | `root_on_sd_card`: root is `/dev/mmcblk0p*`, the SSD did not boot |
| | WARNING / DOWN | `root_not_on_ssd` (root is neither `/dev/sda2` nor the SD) / `root_unreadable` |
| `command-center-ssd-missing` | CRITICAL | `ssd_not_visible` (no `sda`, no `152d:a578`), `enclosure_visible_disk_missing` |
| | WARNING | `ssd_enclosure_not_recognised`: `sda` is there but not behind the Sabrent `152d:a578` bridge |
| `command-center-sd-sync` | the copy's own result | `clone_failed`, `sd_card_missing`, `refused_root_not_ssd`, `ssd_boot_line_missing_cgroup`, `sd_boot_line_missing_cgroup`, `sd_boot_line_wrong_root`, `sd_fstab_wrong_root`, `clone_interrupted` (a copy cut off, after 6 h), `sync_already_running` |
| | WARNING | `sync_never_ran`, `sync_stale` (older than 8 days), `sync_status_unreadable` |

Reasons are fixed words, never paths, times or counts: a non-HEALTHY line is part of the dispatcher's signature.
`booted-from-sd` and `ssd-missing` get the parts link (`ops/pi-fleet/PARTS.md`); `sd-sync` routes to the runbook's
`sd-sync` step.

`slops-sd-sync` (Sunday 04:30, idle I/O priority) refuses to run unless root is `/dev/sda2`, refuses if the SSD's
own boot line lacks `cgroup_enable=memory`, runs `rpi-clone -U mmcblk0`, then mounts the SD boot partition
read-only and checks its `cmdline.txt` has `cgroup_enable=memory` and `root=PARTUUID=` of the SD's own partition 2, and that the SD's
`/etc/fstab` mounts that partition as `/`. A failed copy keeps its CRITICAL reason; only a good copy turns `sync_stale`.
The copy is of a running system: Docker volumes (GlitchTip's Postgres) are crash-consistent, which is enough for a
fallback that buys time to buy an SSD.

## Deploy (founder, on Command Center)

Copy `ops/pi-fleet/sd-sync/` and `ops/command-center/` from `main` to the Pi (e.g. `scp -r` into `~/deploy/ops/`), then run
the steps from `~/deploy/ops/pi-fleet/sd-sync/`.


1. Check rpi-clone handles `/boot/firmware` (Bookworm): `head -40 /usr/local/sbin/rpi-clone | grep -i -e version -e firmware`.
   Older forks only know `/boot`; if so, stop and update rpi-clone first.
2. Back up: `sudo cp /usr/local/sbin/slops-alert-dispatcher /usr/local/sbin/slops-alert-dispatcher.bak-$(date +%Y%m%d)-before-sd-sync`.
3. Install the check **before** the dispatcher (otherwise the next tick alerts `boot_check_not_installed`):
   `sudo install -o root -g root -m 0755 slops-boot-check /usr/local/sbin/` then run
   `sudo /usr/local/sbin/slops-boot-check command-center`. Expect HEALTHY, HEALTHY, `sync_never_ran`.
4. Install the copy and units: `sudo install -o root -g root -m 0700 slops-sd-sync /usr/local/sbin/`,
   `sudo install -m 0644 slops-sd-sync.service slops-sd-sync.timer /etc/systemd/system/`, `sudo systemctl daemon-reload`.
5. First copy, watched (overwrites the stale SD card): `sudo systemctl start slops-sd-sync.service`, then
   `cat /var/lib/slops-sd-sync/status` (expect `reason=none`) and `tail /var/log/slops-sd-sync.log`. About 20–40 min.
6. Install the dispatcher: `sudo install -m 0700 ../../command-center/slops-alert-dispatcher /usr/local/sbin/`, and
   `alert-owners.tsv` / `RUNBOOK.md` to wherever the annotator reads them.
7. `sudo systemctl enable --now slops-sd-sync.timer`; `systemctl list-timers slops-sd-sync.timer` shows next Sunday.

Rollback: `sudo systemctl disable --now slops-sd-sync.timer`, restore the dispatcher backup, remove the two scripts.

## Supervised test boot from the SD card (founder, in the room)

`BOOT_ORDER=0xf14` tries USB first, then SD. To force the SD, the SSD has to be absent:

1. After step 5 above succeeded: `sudo shutdown -h now`; wait for the green LED to stop.
2. Unplug the SSD's USB cable from the Pi (leave the hub powered). Power the Pi on.
3. Within ~10 min Discord should get one alert with `command-center-booted-from-sd reason=root_on_sd_card`,
   `command-center-ssd-missing reason=ssd_not_visible` and the "Parts to buy" link.
4. On the Pi: `findmnt -no SOURCE /` reads `/dev/mmcblk0p2`; `grep -o cgroup_enable=memory /proc/cmdline` prints it;
   GlitchTip, Kuma and Pi-hole containers are up (`docker ps`). This is the card's done-when.
5. `sudo shutdown -h now`, replug the SSD, power on. `findmnt -no SOURCE /` reads `/dev/sda2`, and Discord gets
   the recovery message on the next tick.
6. If step 3 never boots (no network after 5 min): power off, replug the SSD, power on. The SSD system is untouched.

Nothing written while on the SD reaches the SSD; the next Sunday copy overwrites the SD again.
