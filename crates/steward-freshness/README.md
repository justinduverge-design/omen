# steward-freshness

Steward's three backup freshness checks (Supabase backup, football backup, Restic integrity) as one dependency-free,
static Rust binary: about 377 KB for `aarch64-unknown-linux-musl`. It replaces
`/opt/steward/checks/{backup,football-backup,restic-check}-freshness.sh` after a shadow week. Plan Phase 4:
`Blueprints/specs/infrastructure/omen-rust-infrastructure-plan-v1.md`.

- **Same contract as the bash checks:** the same forced-command ssh channel (`steward-status@KVM1`, same key, options
  and 4×15 s retries), the same validation and reasons, the same stdout lines, the same state-file fields and the
  same exit codes. The parity harness in `parity/` shows 47/47 scenarios identical.
- **Known deliberate differences:**
  - Over retries, bash appends every attempt's output and reads the first match; Rust uses only the successful attempt.
  - A bad `NOW_EPOCH` or threshold override is `invalid_local_clock` / `invalid_threshold` for all three checks.
    Bash validates them only in the Supabase script; the other two crash.
  - A failed state write exits 1 with no stdout, as bash does under `set -e`.
- **Shadow:** `--shadow` writes `<stem>.rust.status`. The alert dispatcher reads an explicit list of the bash state
  files, so shadow output can never alert. Units and the compare script are in `ops/pi-fleet/steward-freshness/`.

```bash
cargo test -p steward-freshness
cargo zigbuild --release --target aarch64-unknown-linux-musl -p steward-freshness
```

## Shadow on Steward (installed 2026-10-18, founder-approved)

`/usr/local/bin/steward-freshness` (sha256 `2c732837…`, built from main at merge of #744) and
`steward-freshness-shadow@{supabase-backup,football-backup,restic-check}.timer` run hourly at :10, with
`steward-freshness-compare` after each run. The first runs were `MATCH` for all three (HEALTHY/none). The state files
differ only by timing: the bash check had run before the newest backup. Watch with
`journalctl -t steward-freshness-compare`. A week of MATCH lines is the proof to swap the bash timers for the binary
(plan Phase 4).
