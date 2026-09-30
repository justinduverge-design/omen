# Runbook — updating kernel and firmware on the Pis

**Why this is manual:** the kernel and `raspi-firmware` come from the Raspberry Pi archive, which unattended-upgrades does not
allow. A Pi boots a single `kernel8.img`, so a bad update means keyboard-and-SD-card recovery. See the fleet spec for the
decision. **Do this with someone able to reach the device**, one Pi at a time, identical hardware first.

| Host | Board | Notes |
|---|---|---|
| Sentinel | Pi Zero 2 W, Wi-Fi only | canary; update first |
| Steward | Pi Zero 2 W, Wi-Fi only | identical twin of Sentinel |
| Command Center | Pi 4B | alert dispatcher + GlitchTip + Kuma + Pi-hole; last. Has an Ethernet port (plug in for recovery). |

## Procedure (per host)
1. **Preflight:** `apt-get -s install --only-upgrade linux-image-rpi-v8 linux-image-rpi-2712 raspi-firmware` — read what it will install;
   check `/boot/firmware` free space (need ~60 MB) and that the host is currently healthy.
2. **Fallback copy (mandatory, verified):** copy `kernel8.img kernel_2712.img initramfs8 initramfs_2712 config.txt cmdline.txt
   start4*.elf bootcode.bin` from `/boot/firmware` into `/boot/firmware/fallback-<running kernel>/` with
   `cp --no-preserve=all` (the partition is FAT; `cp -p` fails), `cmp` each against the live file, and take a tarball in `/var/backups`.
   Abort if anything differs.
3. **Install:** `DEBIAN_FRONTEND=noninteractive apt-get install -y --only-upgrade -o Dpkg::Options::=--force-confold
   linux-image-rpi-v8 linux-image-rpi-2712 raspi-firmware`. Confirm `kernel8.img` changed and `config.txt`/`cmdline.txt` did not.
   `/var/run/reboot-required` should appear (the `omen-reboot-required-signal` hook).
4. **Reboot and wait.** Expect SSH back in ~40–100 s. **If it is not back in 5 minutes, go to Recovery.**
5. **Verify:** `uname -r` is the new kernel; `wlan0` has its address; Tailscale is up; `systemctl --failed` is empty; `dmesg --level=err,crit`
   is empty; `vcgencmd get_throttled` is `0x0`; the host's checks report HEALTHY through the dispatcher.
6. **Soak the canary ~10 minutes** (Wi-Fi disconnect events, throttling, temperature) before touching the next host.

## Recovery (host does not boot or does not rejoin the network)
- **Pi 4B:** plug in Ethernet (`netplan-eth0` autoconnects) and SSH in to investigate.
- **Any Pi:** power off, put the SD card in any computer, open the boot partition, and copy the files inside
  `fallback-<known-good kernel>/` back over the ones one level up (`RECOVERY.txt` in that folder repeats this). Boot it.
- The dispatcher will report `check=<host>-unreachable` after 10 minutes, and Steward reports `command-center-alive` if Command Center is the one down.

## Not covered here
The Pi 4B bootloader EEPROM (`sudo rpi-eeprom-update`) is a separate firmware flash and has its own risk; do it deliberately, not as part of this.
