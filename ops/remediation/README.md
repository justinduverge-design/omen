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
