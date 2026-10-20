# Parity harness: Rust vs the bash checks

Runs the real bash checks (`ops/pi-fleet/steward-checks/`, reference copies from Steward `/opt/steward/checks/`) and
`steward-freshness --shadow` through the same fake forced-command `ssh`, then compares stdout, the exit code, and the
state file (minus `checked_at`). The scenarios cover:
- every age band boundary;
- every validation failure;
- a future timestamp, a bad clock and an empty threshold;
- a CRLF payload;
- a dead channel.

```bash
cargo zigbuild --release --target aarch64-unknown-linux-musl -p steward-freshness
P=$(mktemp -d); mkdir -p $P/bin $P/checks $P/fixtures
cp target/aarch64-unknown-linux-musl/release/steward-freshness $P/bin/
cp crates/steward-freshness/parity/fake-ssh $P/bin/ssh
cp ops/pi-fleet/steward-checks/*.sh $P/checks/
cp crates/steward-freshness/tests/fixtures/*.txt $P/fixtures/
cp crates/steward-freshness/parity/run.sh $P/
docker run --rm --platform linux/arm64 -v $P:/p debian:13-slim bash /p/run.sh
```

Result 2026-10-18: **47 passed, 0 failed.** Fixtures are the real KVM1 payloads with the snapshot ids replaced.
