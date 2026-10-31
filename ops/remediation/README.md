# Remediation playbooks (Lane 5)

Design: `Direction/reviews/2026-10-29-self-healing-design.md`. Fleet Constitution item 1 (amended, #814): a separate
remediator may run an action only if a reviewed, signed playbook approved that exact action in advance.

- `playbooks/*.json`: one file per playbook. Each names one alert check from
  `ops/command-center/alert-owners.tsv`, one action from the v1 vocabulary, its caps, its verify check and who it
  escalates to. JSON rather than the design's `.yml`: the Pi's Python has no YAML parser, and the remediator must
  verify and parse the bundle with the standard library only.
- `playbook_schema.py`: the validator, stdlib only, imported by the remediator. Unknown keys are refused anywhere, so
  there is no shell, command or args field. Arguments come from the playbook, never from alert text.

**v1 vocabulary:** `compose_up <project>`, `restart_unit <unit>`, `rerun_unit <unit>`, `docker_prune_images`.
Targets are plain names on a per-action allowlist (`ALLOWED_TARGETS`; widening it is its own PR). Boot, kernel, reboot, firewall, network, DNS/Pi-hole, SSH, secrets, deploys, databases,
package upgrades, docker itself, and the remediator and dispatcher are refused as targets (human-only).
Caps: 1-3 attempts per 24h, cooldown 15-1440 minutes, verify wait 30-900 seconds. One playbook per check.

Adding a playbook is a PR. Merging it is the approval. Test: `node --test test/remediationPlaybooks.test.js`.

## Signing (`B13-HEAL-SIGNING`)

`bundle.py build` validates every playbook and writes one canonical `bundle.json` (sorted, byte-stable).
`.github/workflows/remediation-bundle.yml` runs on each merge to `main` that touches playbooks. It signs the
bundle with `ssh-keygen -Y sign` (namespace `slops-remediation`, identity `slops-remediation-ci`), verifies it
against the committed `allowed_signers`, and uploads `bundle.json` + `bundle.json.sig` as a run artifact.
`bundle.py verify` checks the signature over the exact bytes first and parses nothing until it passes.
Then it runs the schema again, so a bad playbook is refused even when it is signed.

**Setup (founder, once):** commit the public key line to `allowed_signers` *before* adding the secret.
A signature that `allowed_signers` can't verify fails the job on `main`, loudly.
1. `ssh-keygen -t ed25519 -N '' -C slops-remediation-ci -f /tmp/rk` on a trusted machine.
2. Paste `/tmp/rk` into the repo secret `REMEDIATION_SIGNING_KEY`.
3. Commit `slops-remediation-ci namespaces="slops-remediation" <contents of /tmp/rk.pub without the comment>`.
4. Delete `/tmp/rk` and `/tmp/rk.pub`.
Without a key, the job validates and says "not signed" in its summary, and every verify refuses.

**Status (2026-10-30):** done. The public key (`SHA256:EVa+jMj/…`) landed in #824, and the secret `REMEDIATION_SIGNING_KEY`
was added 2026-10-31. The first attempt missed the Actions secrets tab, so the run after #825 said "not signed"; check with `gh secret list`. Each merge to `main` that touches playbooks now uploads `remediation-bundle-<sha>`.
To rotate, replace the key line and the secret together.

## The remediator, shadow mode (`B13-HEAL-REMEDIATOR-SHADOW`)

`slops-remediator` runs every 5 minutes as user `slops-remediator`, with no sudoers entry and no docker group.
It reads the dispatcher's `last-signature`, matches each line to a check through `alert-owners.tsv`, and for
each check with a signed playbook writes "would have run X (n/cap today). Nothing was run." to
`/var/lib/slops-remediator/events`. The dispatcher relays that file to Discord as
`SLOPS REMEDIATOR (shadow, nothing was run)`. **There is no code path that executes an action**; a test fails if
the remediator gains a process, shell or socket API. Checked every run, in order: kill switch, signature and schema,
replay (`seq` lower than the highest seen), cooldown, 24h cap. A hit cap escalates once with the owner and runbook step.

**Deploy (founder, FOUNDER_APPROVAL; nothing here was deployed):**
1. `useradd --system --no-create-home --shell /usr/sbin/nologin slops-remediator`
2. `/usr/local/sbin/slops-remediator` (0755); `bundle.py` and `playbook_schema.py` in `/usr/local/lib/slops-remediator/` (0644).
3. `/etc/slops-remediator/allowed_signers` = the committed public key (root, 0644).
4. `install -d -o slops-remediator -m 0755 /var/lib/slops-remediator` (its state and its reports; the dispatcher, as root, collects them).
5. Copy the latest signed CI artifact (`bundle.json`, `bundle.json.sig`) into `/var/lib/slops-remediator/`.
6. Deploy the updated dispatcher and `alert-owners.tsv`, then `systemctl enable --now slops-remediator.timer`.
7. On the Pi, prove the design's checks: the run reports "would have run" for a stopped test container; a tampered bundle,
   an unknown-action bundle and `touch /etc/slops-remediator/disabled` each stop everything; the cap escalates; the
   ledger survives a reboot. Then run a week of shadow before `B13-HEAL-LIVE`.

Local proof: `node --test test/remediatorShadow.test.js`.
