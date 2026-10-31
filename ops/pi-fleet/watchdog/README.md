# Hardware watchdog and under-voltage watch (`B13-HEAL-WATCHDOG`)

These are reference copies. Editing them here changes no Pi. Deploying them is the founder's step on each Pi.

| File | Deployed path | Pis |
|---|---|---|
| `10-slops-watchdog.conf` | `/etc/systemd/system.conf.d/10-slops-watchdog.conf` (`0644`) | all three |
| `slops-power-check` | `/usr/local/sbin/slops-power-check` (`root:root` `0755`) | all three |
| `slops-power-check.service`, `.timer` | `/etc/systemd/system/` | Steward, Sentinel |
| `../../command-center/slops-alert-dispatcher` | `/usr/local/sbin/slops-alert-dispatcher` (`0700`) | Command Center |

- **Watchdog:** systemd pets the Pi's hardware watchdog. A kernel or PID 1 hang of 15 s resets the board, and a
  reboot that hangs for 2 min is forced through. This covers the "OS hang" row in
  `Direction/reviews/2026-10-29-self-healing-design.md`. It does not cover a Pi that is up but off the network.
  The link watchdogs cover that.
- **Under-voltage:** `slops-power-check` reads `vcgencmd get_throttled` and reports one line,
  `check=<host>-under-voltage`. The result is CRITICAL for under-voltage now, WARNING for under-voltage since boot or
  throttling now, and DOWN when the chip cannot be read. Command Center's dispatcher runs it locally. Steward and Sentinel
  write `/var/lib/slops-power/under-voltage.status` every 5 minutes for the status reader. The `under-voltage` name adds
  the parts-list link (`ops/pi-fleet/PARTS.md`) once `B13-HEAL-PARTS-LIST` is deployed.
- "Since boot" holds until the next reboot. After a power supply swap, reboot to clear it (`PARTS.md` → After the part
  arrives).

## Founder deploy (copy the folder to each Pi first, e.g. `scp -r ops/pi-fleet/watchdog <pi>:`)

On **each** Pi:

```bash
cd ~/watchdog
sudo install -d -m 0755 /etc/systemd/system.conf.d
sudo install -m 0644 10-slops-watchdog.conf /etc/systemd/system.conf.d/
sudo install -m 0755 slops-power-check /usr/local/sbin/
sudo systemctl daemon-reexec
systemctl show -p RuntimeWatchdogUSec -p RebootWatchdogUSec   # expect 15s and 2min
slops-power-check "$(hostname)"                               # expect result=HEALTHY ... throttled=0x0
```

On **Steward and Sentinel** as well:

```bash
sudo install -m 0644 slops-power-check.service slops-power-check.timer /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now slops-power-check.timer
cat /var/lib/slops-power/under-voltage.status
```

Then add `/var/lib/slops-power/under-voltage.status` to the list of state files that the status reader (the forced
command the dispatcher's SSH key runs) prints. That reader is not in this repo. Its output line already has the
`result=` shape that the dispatcher reads. **The reader must also print
`result=DOWN check=<host>-under-voltage reason=status_missing` when the file is absent, and `reason=status_stale` when
it is more than 15 minutes old.** Without that, a timer that never ran or died leaves Steward and Sentinel silent.
The check names come from `%H`, so the hostnames must stay `steward` and `sentinel` (normalized per the fleet spec).
Only under-voltage and throttled-now are reported. Frequency capping, the soft temperature limit and throttled-since-boot
(0x2, 0x8, 0x40000) are left out on purpose.

On **Command Center**, deploy the updated `slops-alert-dispatcher` (keep it `root:root` `0700`; see
`ops/command-center/README.md`). Until `slops-power-check` is installed there, the dispatcher reports
`reason=power_check_not_installed` instead of staying quiet.

## Proof for the card

1. `systemctl show -p RuntimeWatchdogUSec` reads `15s` on all three Pis.
2. `slops-power-check <host>` returns a line on each Pi. A Steward or Sentinel line reaches the dispatcher (`ssh` reader
   output). The dispatcher logic is covered by `test/piWatchdog.test.js` with faked `get_throttled` values.
3. Optional, and only when you are home: test the watchdog with a supervised hang:
   `sudo sh -c 'echo 1 > /proc/sys/kernel/sysrq; echo c > /proc/sysrq-trigger'`. The Pi should come back by itself
   within about a minute.
