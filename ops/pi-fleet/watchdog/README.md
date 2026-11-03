# Hardware watchdog and under-voltage watch (`B13-HEAL-WATCHDOG`)

These are reference copies. Editing them here changes no Pi. Deploying them is the founder's step on each Pi.

| File | Deployed path | Pis |
|---|---|---|
| `50-slops-watchdog.conf` | `/etc/systemd/system.conf.d/50-slops-watchdog.conf` (`0644`) | all three |
| `slops-power-check` | `/usr/local/sbin/slops-power-check` (`root:root` `0755`) | all three |
| `slops-power-check.service`, `.timer` | `/etc/systemd/system/` | all three |
| `read-power-state` | `/usr/local/lib/slops-alerting/read-power-state` (`root:root` `0755`) | Steward, Sentinel |
| `../../command-center/slops-alert-dispatcher` | `/usr/local/sbin/slops-alert-dispatcher` (`0700`) | Command Center |

- **Watchdog:** systemd pets the Pi's hardware watchdog. A kernel or PID 1 hang of 15 s resets the board, and a
  reboot that hangs for 2 min is forced through. This covers the "OS hang" row in
  `Direction/reviews/2026-10-29-self-healing-design.md`. It does not cover a Pi that is up but off the network.
  The link watchdogs cover that. Before this card every Pi already ran the Debian default of 1 min.
- **Power and heat:** `slops-power-check` reads `vcgencmd get_throttled` and `vcgencmd measure_temp` and prints two lines.
  - `check=<host>-under-voltage`: CRITICAL for under-voltage now; WARNING for under-voltage since boot or throttling now;
    DOWN when the chip cannot be read.
  - `check=<host>-thermal`: CRITICAL at 80 °C; WARNING at 70 °C, or when the clock was capped, throttled or held at
    the soft temperature limit, now or since boot. The reason lists every cause (`throttled_since_boot,…`). The line
    carries a 10-degree band (`temp_band=40-49C`), not the reading: a non-healthy line is part of the dispatcher's
    signature, and an exact reading would re-send the alert every 5 minutes.
  - The timer also appends the exact reading to `/var/lib/slops-power/history` (`<UTC> temp=45.1 throttled=0x0`),
    keeping 7 days. That file is the temperature and throttling history.
- **Reaching the dispatcher:** Command Center's dispatcher runs the check itself. Steward and Sentinel are read over
  SSH through the forced command `/usr/local/lib/slops-alerting/read-state` (not in this repo; it differs per Pi).
  Its last line calls `read-power-state "$(hostname)"`, which prints `reason=status_missing` or `status_stale`
  (older than 15 min) as DOWN, so a timer that never ran or died is never silent.
- Both names add the parts-list link (`ops/pi-fleet/PARTS.md`). "Since boot" holds until the next reboot.

## Deploy

Run from the Mac in the omen repo; every step backs up what it replaces first (`*.bak-<date>`).

On **each** Pi:

```bash
sudo install -d -m 0755 /etc/systemd/system.conf.d
sudo install -m 0644 50-slops-watchdog.conf /etc/systemd/system.conf.d/
sudo install -m 0755 slops-power-check /usr/local/sbin/
sudo install -m 0644 slops-power-check.service slops-power-check.timer /etc/systemd/system/
sudo systemctl daemon-reexec && sudo systemctl enable --now slops-power-check.timer
systemctl show -p RuntimeWatchdogUSec -p RebootWatchdogUSec   # expect 15s and 2min
```

On **Steward and Sentinel** as well: install `read-power-state`, then add its call as the last line of `read-state`.
`read-state` runs `exec sudo -n /bin/cat …` under `set -eu`: the `exec` would never return, and `-e` would stop at
a missing state file before the power lines print. Both go:

```bash
sudo install -m 0755 read-power-state /usr/local/lib/slops-alerting/
sudo sed -i -e 's|^set -eu$|set -u|' -e 's|^exec sudo -n /bin/cat|sudo -n /bin/cat|' /usr/local/lib/slops-alerting/read-state
echo '/usr/local/lib/slops-alerting/read-power-state "$(hostname)"' | sudo tee -a /usr/local/lib/slops-alerting/read-state
```

On **Command Center**, deploy the updated `slops-alert-dispatcher` (keep it `root:root` `0700`; see
`ops/command-center/README.md`).

## Proof for the card

1. `systemctl show -p RuntimeWatchdogUSec` reads `15s` on all three Pis.
2. `slops-power-check <host>` returns two lines on each Pi, and `/var/lib/slops-power/history` grows every 5 min. A
   Steward or Sentinel line reaches the dispatcher (`ssh` reader output). The logic is covered by
   `test/piWatchdog.test.js` with faked `vcgencmd` values.
3. Make it fail once, safely: `VCGENCMD=<fake> slops-power-check <host>` with a fake that answers `throttled=0x50005`
   and `temp=82.0'C` reads CRITICAL on both lines; `read-power-state <host> /nonexistent` reads `status_missing`.
4. Optional, and only when you are home: test the watchdog with a supervised hang:
   `sudo sh -c 'echo 1 > /proc/sys/kernel/sysrq; echo c > /proc/sysrq-trigger'`. The Pi should come back by itself
   within about a minute.
