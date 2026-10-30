# Why the Command Center Discord alerts repeat (2026-10-29)

Read-only look, approved by the founder: the dispatcher's state files in `/var/lib/slops-alerting/`
(the webhook file under `/etc` was not opened), 7 days of `journalctl -u slops-alert-dispatcher`,
`docker ps -a`, Kuma heartbeats for 48h, one live read of Steward and Sentinel. Nothing on the Pi was changed.

## What is in the alert right now

```
GlitchTip: status=0
result=WARNING check=omen-host-posture-kvm1 reason=drift_enabled_units+drift_containers
result=WARNING check=omen-host-posture-kvm2 reason=drift_enabled_units+drift_containers
```

The football and A4 latches are empty (no active condition).

## The repeating alerts and their causes

| Alert | Real or noise | Why it repeats |
|---|---|---|
| `GlitchTip: status=0` (Kuma) | **Real, unowned.** `glitchtip-web`, `-postgres`, `-valkey`, `omen-otel-collector` and `omen-vector-receiver` all `Exited (127)` 9 days ago. The dispatcher logs `container … is not running` on every run. | Nobody owns the fix, so it rides along in the daily REMINDER and in every CRITICAL fired for something else. With GlitchTip down, the GlitchTip issue signal is blind too. Overlaps `B13-ERROR-TRACKING`. |
| `omen-host-posture-kvm1/kvm2` WARNING | **Real drift, but low severity**, sent as "CRITICAL". | The `reason=` text changes as the drift changes. A minute later the live read showed kvm1 gone and kvm2 at `reason=drift_listeners`. Every change to the reason text is a new signature, so a new "SLOPS ALERT: CRITICAL". `last-signature` was rewritten at 21:44 tonight. Nobody accepts or fixes the drift, so it never settles. |
| `recall: *` monitors (9 of them) | **Noise.** The recall endpoints live on the Mac. About 45 DOWN heartbeats each in 48h, in overnight bands (Mac asleep). | Each sleep flips the Kuma signal: CRITICAL, then RECOVERY on wake, every night. |

Not repeating right now: the Pi-hole probe (silent, rc 0), Steward (all healthy), football, A4, unreachable-host.

## Every way the code can resend (`ops/command-center/slops-alert-dispatcher`)

1. **Daily REMINDER** of whatever is still active (main signature + football). By design. It does not cover A4,
   even though the comment says it does.
2. **Signature churn:** any text change in any line is a new CRITICAL. Live today through the posture `reason=` text.
   Latent through the stale-payload line, which prints `%d hours old` and so would re-alert every hour while stale.
3. **Flap:** a line that leaves and comes back sends a RECOVERY, then a new CRITICAL (the recall monitors, the
   unreachable-host timer that resets on one good SSH, a football file read mid-write that becomes `witness_outage`).
4. **GlitchTip reopen:** the daily auto-resolve clears old issues, and a recurrence brings them back. Blind right now while the stack is down.
5. **Severity:** WARNING lines go out under the same "CRITICAL" header, so nothing tells the founder what can wait.

## Root cause of "nothing gets fixed"

The dispatcher knows *what* is wrong but not *who fixes it*, or *what accepted looks like*. No alert line names
an owner or a runbook step. There is no way to say "known, owned, quiet until X". So the real faults (GlitchTip
down 9 days, posture drift) sit in the reminder forever, and the noise (Mac sleep, reason churn) buries them.
The fix stays notification-only: the dispatcher learns to name a fix and to stay quiet when told to.
It never performs the fix (Constitution item 1).

Proposed items: `Direction/current_sprint.md` → Lane 4.

## Addendum: why GlitchTip is down (found 2026-10-29, same read-only access)

`docker inspect` on each stopped container: `runc create failed … memory.swap.max: no such file or directory`.
The `linux-image-rpi-v8 6.18.50` kernel was installed 2026-09-29 and first booted 2026-10-20. It boots with
`cgroup_disable=memory`, so every container with a `mem_limit` (GlitchTip ×3, OTel, Vector) cannot start.
Pi-hole and Kuma have no limit, which is why they came back. Fix (founder runs it; the edit is to the boot line and needs a reboot):
`cgroup_enable=memory` appended to the single line of `/boot/firmware/cmdline.txt` (back it up first), then reboot,
then `docker ps` should show all five up. Runbook entry for `B13-ALERT-GLITCHTIP-DOWN`; any future kernel update
needs a post-reboot "all containers up" check, which is what a Kuma docker monitor per container would catch.
