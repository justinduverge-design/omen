# KVM1 status shells for Steward and Sentinel

omen-prod (KVM1) runs Tailscale SSH, which never reads `authorized_keys`. Who may log in as a status user is the
tailnet SSH policy, and what that user can do is its **login shell**. Tailscale SSH runs it as
`<shell> -c "<command>"` and sets no `SSH_ORIGINAL_COMMAND`. These two scripts replace the old forced commands at the
same paths. Each one takes the command from `-c`, runs one fixed export with no arguments, and exits 64 for anything
else. When run directly with no arguments it reads `SSH_ORIGINAL_COMMAND` instead. That path does not keep the old
`authorized_keys` forced commands working once the dispatcher is also the login shell: sshd would pass the forced
command's path through `-c`, and that is refused. Tailscale SSH ignores those lines anyway.

Neither shell stops TCP forwarding for a user the SSH rule admits. Only the tailnet policy can close that; the
football status shell has the same gap.

| User | Shell (installed path) | Commands the watcher sends | Export run |
| --- | --- | --- | --- |
| `steward-status` | `/usr/local/sbin/omen-status-dispatch` | `status`, `football-status`, `restic-status` | `omen-backup-status-export`, `omen-football-backup-status-export`, `omen-restic-check-status-export` |
| `sentinel-status` | `/usr/local/sbin/omen-sentinel-status-dispatch` | `posture`, `status` | `omen-host-posture-status-export`, `omen-host-patch-status-export` |

Steward's commands come from `ops/pi-fleet/steward-checks/*.sh`. Sentinel's come from
`ops/pi-fleet/sentinel-checks/omen-host-posture.sh` (`posture`) and from Sentinel's patch check, which is not in this
repo: `/opt/sentinel/checks/omen-host-patch.sh` line 44 on Sentinel sends `status` (read on the host 2026-11-13). One change:
the old dispatchers sent any unknown command to the default export, and these exit 64. No watcher sends another name.

Why: since Tailscale SSH took over on 2026-11-10 (about 19:15 EST), neither user has been admitted, so Sentinel's
KVM1 posture and patch checks and Steward's KVM1 freshness checks report `status_channel_unavailable`.

Tests: `node --test test/kvm1StatusShells.test.js`.

## Host steps (founder-only, after this merges)

1. From the Mac, at the merged commit:

   ```bash
   cd ~/Documents/GitHub/Valor-Core/Slops-OS/slops-saloon/omen
   ssh justin@omen-prod 'mkdir -m 700 -p ~/kvm1-status-stage'
   scp ops/kvm1-status/omen-status-dispatch ops/kvm1-status/omen-sentinel-status-dispatch justin@omen-prod:kvm1-status-stage/
   ```

   The files are staged in a private folder, not world-writable `/tmp`, because they become login shells.

2. On omen-prod, back up and replace each dispatcher in place, keeping owner and mode, then lock each user's login
   shell to it:

   ```bash
   ssh justin@omen-prod 'set -e
   for pair in steward-status:omen-status-dispatch sentinel-status:omen-sentinel-status-dispatch; do
     u=${pair%%:*}; f=/usr/local/sbin/${pair#*:}
     [ -e "/var/backups/${pair#*:}.bak" ] || sudo cp -p "$f" "/var/backups/${pair#*:}.bak"   # keep the original on a rerun
     sudo install -o "$(stat -c %U "$f")" -g "$(stat -c %G "$f")" -m "$(stat -c %a "$f")" "$HOME/kvm1-status-stage/${pair#*:}" "$f.new"
     sudo mv "$f.new" "$f" && rm "$HOME/kvm1-status-stage/${pair#*:}"
     grep -qx "$f" /etc/shells || echo "$f" | sudo tee -a /etc/shells >/dev/null
     sudo usermod -s "$f" "$u"
     echo "$u $(getent passwd "$u" | cut -d: -f7)"
     rc=0; sudo -u "$u" "$f" -c "status; id" >/dev/null 2>&1 || rc=$?; echo "$u injection exit $rc"
   done
   sudo -u steward-status /usr/local/sbin/omen-status-dispatch -c restic-status | head -c 60; echo
   sudo -u sentinel-status /usr/local/sbin/omen-sentinel-status-dispatch -c posture | head -c 60; echo'
   ```

   Expect each user's shell to be its dispatcher, `injection exit 64` twice, and the start of two status reports.

3. Only after step 2: add `steward-status` and `sentinel-status` to the `users` of the tailnet SSH `accept` rule
   (`autogroup:member` to `autogroup:self`), keeping every existing user.

4. Prove it from each watcher: Sentinel's KVM1 posture and patch checks and Steward's three KVM1 freshness checks
   stop reporting `status_channel_unavailable` within one timer period. On Sentinel, a posture run may then hold
   `drift_enabled_units` (new units such as `omen-sight-status.timer` since the last baseline). Refresh that key in
   `/etc/sentinel/omen-host-posture-baseline-kvm1.env` after checking the change was deliberate.

Rollback: remove the user from the SSH rule, set its shell back with `sudo usermod -s /bin/bash <user>`, and copy
`/var/backups/<dispatcher>.bak` back over the installed file.
