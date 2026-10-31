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
Until then the job validates and says "not signed" in its summary, and every verify refuses.
