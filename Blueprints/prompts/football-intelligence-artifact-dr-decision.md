# Football-intelligence immutable artifacts and disaster recovery — decision prompt

Use this after the founder has selected or purchased reliable storage. This is an
architecture/operations decision pass before production activation, not authorization to
provision a host, apply SQL, move backups, or handle credentials.

## Start here

Read:

1. `AGENTS.md` and the kickoff order in `CLAUDE.md`;
2. `Blueprints/specs/football-data/omen-football-intelligence-architecture-v1.md`;
3. `Direction/reviews/2026-09-26-participation-source-admission.md`;
4. `Direction/known_issues.md` — the open off-host backup finding;
5. `Blueprints/playbooks/football-data-staging-shadow-runbook.md`;
6. `ops/football-data/kvm1/omen-football-backup` and `omen-football-restore`;
7. the current infrastructure capability map and active trust assignment.

## Mission

Choose and document a vendor-neutral immutable-artifact and disaster-recovery policy for
football intelligence. Compare the actually available storage targets; do not assume KVM2
will be renewed or retired. Keep domain code storage-neutral.

Decide:

- primary artifact root and capacity headroom;
- independent encrypted off-host backup destination;
- content-addressing and overwrite-conflict behavior;
- retention for raw, canonical, derived, quarantined, and published evidence;
- encryption and least-privilege access;
- backup frequency and maximum acceptable data loss;
- restore target, integrity verification, and restore cadence;
- serving-projection rebuild procedure;
- KVM2 migration/renewal boundary;
- monitoring, alerting, and owner;
- estimated monthly cost and exit procedure.

## Required proof before production activation

- one exact artifact captured and hash-verified at the primary root;
- encrypted backup present at an independent target;
- restore into a fresh isolated root;
- restored bytes match the source hash;
- compact serving projection rebuilt from restored evidence;
- no automatic customer republish during restore;
- documented RPO, RTO, capacity, retention, access, and rollback;
- founder approval for any production, credential, host, storage purchase, or migration action.

## Stop conditions

Stop if the chosen target, price, credentials, retention, restore evidence, or production
authority is unresolved. Do not call an untested backup recoverable. Do not provision,
purchase, deploy, or mutate a remote host from this prompt without the separate exact
action approval.
