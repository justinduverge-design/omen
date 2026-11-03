# Monday checklist: Pi fleet, in the room (2026-11-02)

Everything here needs someone at the desk. Everything that could be done remotely was done on 2026-11-02 (Lane 5 in
`Direction/current_sprint.md`). Do it top to bottom in one sitting, about 45 minutes. Each step says what "good" looks
like; stop at the first step that isn't good and work through that step.

Run commands from the Mac, in the omen repo (`cd ~/Documents/GitHub/Valor-Core/Slops-OS/slops-saloon/omen`). Every
`ssh` line runs on the Pi it names. Nothing here asks for a password: `sudo` on the Pis needs none.

## 0. Before you touch anything (2 min)

```bash
for h in command-center steward sentinel; do ssh -o ConnectTimeout=8 $h 'echo "$(hostname) up since $(uptime -s)"'; done
```

Good: three lines. A Pi that doesn't answer is the first thing to look at in step 1.

## 1. Steward, physically (10 min)

**What happened:** Steward was switched off from about 22:20 on 29 Oct until 18:30 on 2 Nov, and it was simply off.
Its journal stops cleanly and restarts with a new boot, `throttled=0x0` and 45 °C on return. The check below is so it
can't happen quietly again.

1. **Lights.** On each Zero (Steward and Sentinel, the two small boards), the green ACT light blinks or glows. On the
   Pi 4 (Command Center, black heatsink case), the red light is solid and the green light flickers.
2. **Where it gets power.** Follow each Pi's cable to the wall. None of them should be on a switched outlet, a power
   strip's switch, or the same strip as something you turn off at night. Label each brick with its Pi's name.
3. **Reseat the power.** Only on Steward, the one that went off: pull its micro-USB from the `PWR IN` port (the one
   nearest the corner), wait 10 seconds, push it back in firmly. Wait 2 minutes.
4. **Read it:**

   ```bash
   ssh steward 'vcgencmd get_throttled; vcgencmd measure_temp; journalctl --list-boots --no-pager | tail -3'
   ```

   Good: `throttled=0x0` (any other value: see step 6's parts, the power supply first), a temperature under 70 °C,
   and a **new last line** in the boot list with today's time. That new line proves the system log survives a reboot.
   It's on already (`Storage=persistent` in `/etc/systemd/journald.conf.d/omen-retention.conf`); this is the proof.
   If the last line is still the old boot, run `ssh steward 'sudo mkdir -p /var/log/journal && sudo systemd-tmpfiles --create --prefix /var/log/journal && sudo systemctl restart systemd-journald'`
   and reseat once more.
5. **History (live since 2026-11-02):** `ssh steward 'tail -3 /var/lib/slops-power/history'` shows a reading every 5 minutes.

## 2. BOOT-ORDER: verify, and the supervised reboot (10 min)

**State on 2026-11-02:** already done. `vcgencmd bootloader_config` on Command Center reads `BOOT_ORDER=0xf14` (USB
SSD first, SD card as the fallback), and the journal shows `rpi-eeprom-update` ran on 29 Oct at 22:50. The Pi runs from
`/dev/sda2` (the SSD) with no update pending. The one thing left is to watch a reboot come back on the SSD, which
also proves the remediator's ledger survives a reboot.

1. **Verify (changes nothing):**

   ```bash
   ssh command-center 'sudo vcgencmd bootloader_config | grep BOOT_ORDER; findmnt -no SOURCE /; ls /boot/firmware/pieeprom.upd 2>/dev/null || echo "no pending update"'
   ```

   Good: `BOOT_ORDER=0xf14`, `/dev/sda2`, `no pending update`.
2. **Supervised reboot**, with you watching the Pi:

   ```bash
   ssh command-center 'sudo wc -l /var/lib/slops-remediator/ledger.jsonl 2>/dev/null; sudo systemctl reboot'
   ```

   Wait 3 minutes, then:

   ```bash
   ssh command-center 'findmnt -no SOURCE /; uptime -s; systemctl is-active slops-remediator.timer slops-alert-dispatcher.timer slops-power-check.timer; sudo docker ps --format "{{.Names}}" | grep -c glitchtip; /usr/sbin/iw dev wlan0 get power_save; systemctl show -p RuntimeWatchdogUSec'
   ```

   Good: `/dev/sda2`, today's boot time, all three `active`, the GlitchTip count is at least 5, `Power save: off`
   (on 2026-11-02 it still read `on` because the setting waits for this reboot; that closes part of B13-HEAL-WIFI),
   and `RuntimeWatchdogUSec=15s`.
   **If it booted from the SD card** (`/dev/mmcblk0p2`), the SSD didn't boot. Don't change the EEPROM. Check the SSD
   cable and the powered hub's power light, then reboot again.
3. **Rollback, only if you want SD-first back:**

   ```bash
   ssh command-center 'sudo rpi-eeprom-config > /tmp/boot.conf && sed -i "s/^BOOT_ORDER=.*/BOOT_ORDER=0xf41/" /tmp/boot.conf && sudo rpi-eeprom-config --apply /tmp/boot.conf'
   ```

   It takes effect on the next reboot. **If Command Center won't boot at all after any EEPROM change:** on the Mac,
   open Raspberry Pi Imager → Choose OS → Misc utility images → Bootloader (Pi 4 family) → SD Card Boot, write it to a
   spare SD card, put that card in the Pi, power it on, and wait for the green light to blink steadily (about 10 s).
   Power off, put the normal SD card back, and it boots SD-first again.

## 3. Hardware watchdog hang test (5 min, optional)

The watchdog is set to reset a Pi whose kernel hangs for 15 s. Prove it on one Zero while you can see it. Not on
Command Center:

```bash
ssh sentinel "sudo sh -c 'echo 1 > /proc/sys/kernel/sysrq; echo c > /proc/sysrq-trigger'"
```

The command hangs; close it with `~.` (tilde, then dot). Good: about a minute later
`ssh sentinel 'uptime -s'` shows a new boot time. If it stays dark for 3 minutes, reseat its power. The watchdog
didn't fire, so tell Claude.

## 4. The remediator safety tests (2 min)

One command, nothing installed, nothing changed on the Pi:

```bash
ssh command-center python3 - < ops/remediation/slops-heal-safety-test
```

Good: `all 4 passed`. It tests the deployed remediator against a throwaway copy of the live signed bundle:
the real bundle is accepted, a tampered copy is refused, the kill switch stops everything, and the retry cap
escalates after 2 tries. It already passed once remotely on 2026-11-02; run it again after the reboot in step 2.

## 5. Outside heartbeat: finish setup (10 min)

Skip this if the heartbeat is already green on healthchecks.io.

1. On healthchecks.io, sign up (free), make a check named `command-center`. Set Period to **5 minutes** and Grace to
   **10 minutes**. Under Integrations, add Discord and pick the alerts channel.
2. Copy the check's ping URL. It's a secret: don't paste it into chat, a PR or a file in the repo.
3. Put it on the Pi:

   ```bash
   ssh -t command-center 'read -r -p "Ping URL: " u && printf "%s\n" "$u" | sudo tee /etc/slops-alerting/outside-heartbeat-url >/dev/null && sudo chmod 0600 /etc/slops-alerting/outside-heartbeat-url && sudo systemctl start slops-outside-heartbeat.service && systemctl is-active slops-outside-heartbeat.timer'
   ```

   Good: the check turns green on healthchecks.io within a minute.
4. **Make it fail once:** `ssh command-center 'sudo systemctl stop slops-outside-heartbeat.timer'`. Within 15 minutes,
   healthchecks.io posts "down" to Discord. Then `ssh command-center 'sudo systemctl start slops-outside-heartbeat.timer'`
   and it posts "up".

## 6. Smart plugs to buy (B13-HEAL-POWER-PLUGS)

Three plugs, one per Pi, so each Pi can power-cycle a frozen neighbour. They must work **with no cloud account**:
local HTTP control on the Wi-Fi only.

| Buy | Why | About |
|---|---|---|
| 3 × **Shelly Plug US Gen4** (or Shelly Plus Plug US) | local HTTP API out of the box, no account needed, reports power draw | $20–25 each |
| Fallback: a plug sold **pre-flashed with Tasmota** (e.g. Athom Tasmota US plug) | same local control | $12–18 each |

Avoid Kasa, Wyze, Govee and anything app-only: they need a cloud account, and some block local control.

**Command Center's SSD hub must be on the same plug as Command Center**, through a short power strip if needed.
Otherwise a power cycle restarts the Pi while its SSD stays wedged.

When they arrive: plug each Pi into its own plug, put the plugs on the Wi-Fi, give each a fixed address on the eero, and
tell Claude the three addresses. The signed playbook comes next. No plug is controlled until that playbook is merged.

## 7. Spares to have on hand

From `ops/pi-fleet/PARTS.md` → "What the founder bought": one spare Zero power supply, one spare Pi 4 power supply,
and one pre-flashed 64 GB endurance microSD card.

## When done

Tell Claude what each step showed. The sprint records (`Direction/current_sprint.md`, Lane 5) get the evidence:
BOOT-ORDER, the reboot check for REMEDIATOR-SHADOW, the hang test for WATCHDOG and the heartbeat's fail and recover.
