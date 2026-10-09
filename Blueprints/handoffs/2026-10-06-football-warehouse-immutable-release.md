# Football warehouse immutable release artifact — 2026-10-06

## Outcome

Completed the immutable artifact and verification trust boundary without touching `omen-prod`. The builder exports only an allowlisted set of warehouse files from an exact Git commit object; dirty or untracked working-tree bytes cannot enter the release. A read-only verifier requires a separately approved SHA-256 for the complete artifact manifest.

## Contract

- Release source is `git archive <40-hex commit>`, never a working-tree copy.
- The builder must byte-match the requested commit; its allowlist contains only the builder, verifier, Compose, bootstrap credential provisioning, and migrations `0001`/`0002`.
- `RELEASE-CONTRACT` binds contract version, commit, `linux/amd64`, the fixed install root, and the exact PostgreSQL 17.11 image digest.
- `SHA256SUMS` binds every released file; its own SHA-256 is the externally reviewed verification argument.
- The verifier rejects checksum drift, unexpected paths, links, unsafe modes, and a noncanonical release contract.
- The artifact boundary does not invoke Docker, Compose, systemd, PostgreSQL, a network call, secret provisioning, privileged installation, or an active-release switch.

## Verification

- Reproducibility test built the same commit twice and compared every path, mode, and byte.
- A dirty tracked working-tree shadow was excluded from the artifact.
- Existing destination and invalid commit tests failed closed.
- The real verifier passed approved bytes and rejected post-approval tampering without requiring root or publishing a release.
- Focused artifact/infrastructure tests passed 11/11; the full repository suite passed 2,029/2,029.
- Two independent final no-edit reviews reported no P0 or P1 findings in the narrowed builder/verifier scope.
- Shell syntax and `git diff --check` passed.

## Deliberately deferred

Privileged root publication, least-privilege LOGIN roles, and the commission verifier are not included in this checkpoint. The root installer draft was removed because an artifact-contained script cannot authenticate itself before it begins executing under `sudo`. Role and commission drafts were removed after design review identified the need for disposable-PostgreSQL privilege probes, partial-state reconciliation, URL-safe credential handling, and external exposure evidence. No partially trusted privileged, provisioning, or commission-verifier script is being shipped.

The next checkpoint establishes the independently trusted root-publication boundary, then builds role provisioning and commission verification with real login-permission and rollback probes before any live container creation.
