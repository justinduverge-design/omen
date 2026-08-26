# Handoff — A7B Phase 4 production-readiness preparation

**Date:** 2026-08-26  
**Base:** `origin/main` `2cd999961008dcc9c1c7a3f3133c5421be665d8d`  
**Branch:** `codex/a7b-phase4-production-readiness`  
**State:** local preparation complete; approved first remote mutation completed
on Command Center and blocked before mutation on KVM1 by interactive sudo

## Delivered locally

- Added a fail-closed Phase 4 readiness contract and evaluator bound to Phase
  3 artifact SHA-256
  `5c4cbc0568ce85a94512b7722144a7cddcb83fe74bd088f04d90f7a628a00bea`.
- Added a read-only CLI that accepts one sanitized evidence JSON file.
- Added focused coverage for host outage, disk, alert coverage, exact-manifest
  drift, required failure scenarios, infrastructure proofs, and A4 no-write.
- Added the eight-part evidence-backed implementation plan and durable
  production-readiness specification.
- Captured sanitized read-only evidence from the actual KVM1 and Command Center
  hosts. No secret, environment value, provider payload, or private data was
  inspected.

## Actual host state observed

KVM1 `srv1737978` is reachable and healthy enough to proceed: Ubuntu 24.04,
about 35 GiB free, Docker 29.6.2, Nginx active, `omen_api` healthy, `omen_cron`
running, and the existing encrypted backup timer active. The football-data root
does not exist. Host Node is absent. The existing cron container has no
configured user and runs root processes; this must not be inherited by the new
runner.

Command Center `command-center` is reachable: Debian 13/aarch64, about 105 GiB
free, Python 3.13.5, curl and SHA-256 available, alert dispatcher timer active,
and Tailscale reachability to KVM1 proven. On 2026-08-26, after explicit
approval, the `omen-football` system group/user and empty
`/var/lib/omen-football-witness` root were created. The root is owned by
`omen-football:omen-football` with mode `0750`; the account uses
`/usr/sbin/nologin`. Node is absent, so the proposed witness uses Python's
standard library only.

The matching approved KVM1 batch initially stopped before mutation because
`sudo` required an interactive password. The founder installed and validated a
root-owned `0440` sudoers drop-in for the existing `justin` administrator. An
independent read-only check proved the file parses and `sudo -n` succeeds. The
approved batch then created the `omen-football` non-login system identity and
empty `/var/lib/omen-football-data`, owned by that identity with mode `0750`.
No password was requested, read, stored, or transmitted by the agent.

## Fail-closed assessment

The current sanitized evidence correctly returns `blocked` with nine blockers:
KVM1 provisioning, witness provisioning, live alerts, schedules, supervision,
backup rehearsal, correction rehearsal, recovery rehearsal, and missing A4
no-write evidence. Remote mutation, collection activation, publication, and
production scoring authorization all remain false.

## Verification and limitation

- New entry-point syntax checks passed.
- Phase 4 focused tests: 7/7.
- Relevant Phase 1–4 football-data tests: 37/37 in the focused run.
- Production dependency audit: 0 vulnerabilities.
- Evaluation metadata validation: 3 prompts / 2 cases.
- Diff whitespace check passed.
- No full-suite pass is claimed: this isolated worktree has no installed
  dependency tree, and the attempted full suite stopped on unrelated missing
  packages. No package install or dependency change was made.

## Next gated step

The first remote change was explicitly approved and is complete on both hosts.
It installed no code or dependency, started no service, enabled no timer,
performed no collection, and made no database, publication, or scoring change.

After that batch, continue locally with reviewed digest-pinned runner and
standard-library witness artifacts before presenting a separate installation
and disabled-unit approval request.

## Nonclaims

Only the approved system identities and empty roots were created on KVM1 and
Command Center. The founder separately installed the validated KVM1 sudoers
drop-in. No service or timer was installed, enabled, or started. No backup,
correction, recovery, or A4 production read occurred. No deployment, merge,
publication, scoring run, provider change, database write, SQL write, agent-side
credential handling, ADP functionality, paid source, or rights-unclear source
occurred.
