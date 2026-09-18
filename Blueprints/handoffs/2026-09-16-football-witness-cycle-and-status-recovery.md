# 2026-09-16 — Football witness cycle correction and status recovery

## Outcome

The September 15 Tuesday KVM1/Command Center witness comparison was a real exact match for all
three admitted datasets. A later daily KVM1 capture picked up a legitimately revised schedule
file, and Command Center's five-minute monitor compared that Wednesday file against the immutable
Tuesday witness copy. The old code therefore emitted a false critical `witness_mismatch` until the
following Tuesday.

The monitor now distinguishes this honest, not-yet-comparable state from a same-cycle integrity
failure. It records `awaiting_next_witness` with `comparison: different_capture_day` and leaves
alert conditions empty. A same-day hash difference remains `witness_mismatch:critical`.

The operator-facing `omen-football-run status` command also now reads KVM1's existing
payload-free status export directly. It had unnecessarily required a locally cached container image
and failed after Docker pruned that image, despite the image guard being able to rebuild it before
the scheduled capture path.

## Changed and deployed

- `ops/football-data/kvm1/omen-football-run`
  - Handles `status` before resolving the Docker image and streams
    `/var/lib/omen-football-data/exports/status.json`.
  - All image-requiring commands retain the previous SHA-pinned runner and hardened Docker flags.
- `ops/football-data/command-center/omen_football_witness.py`
  - Compares hash equality only where KVM1 and witness `generated_at_utc` values share a UTC
    calendar date.
  - Emits the explicit `comparison` field and the honest deferred status for different-day files.
- `test/footballDataProductionOps.test.js`
  - Adds regression coverage for the direct status export and different-day hash deferral.

Tailscale deployment installed only the two executable artifacts:

- KVM1: `/usr/local/sbin/omen-football-run`
- Command Center: `/usr/local/libexec/omen-football-witness`

Each old executable is retained on its host as a timestamped
`.bak-20260916-witness-cycle-fix` backup. The transferred SHA-256 values matched their local source
before installation. No systemd unit was changed or reloaded, and no service/container restart was
needed.

## Verification

| Check | Result |
|---|---|
| Shell syntax — runner and image guard | PASS |
| Python compilation — witness | PASS |
| Focused production-ops tests | PASS — 13/13 |
| Tailscale host reachability | PASS — KVM1 and Command Center online |
| KVM1 direct status after deployment | PASS — `state=pass`, zero alerts, publication and scoring authorization both `false` |
| Command Center live monitor after deployment | PASS — `status=awaiting_next_witness`, `comparison=different_capture_day`, empty conditions |
| Normal dispatcher after the cleared monitor state | PASS — successful timer run and logically empty football signature |
| Same-day mismatch regression | PASS — still emits critical `witness_mismatch` in the focused test |

## Deliberate boundaries

- No raw football rows, provider credentials, environment values, secrets, or account data were
  inspected or emitted.
- No publication or production-scoring control changed; both remained false in the live status.
- No database, deploy of the Omen application, DNS, firewall, service restart, or container change
  occurred.
- The normal dispatcher was not manually triggered. Its regular timer processed the cleared football
  signature successfully; Discord delivery itself was not separately inspected in this correction.

## Remaining follow-up

The next Tuesday witness capture is the continuing independent exact-match proof under the new
logic. The unresolved historical Pi reboot still cannot be explained because Command Center retains
only the current boot in journald and does not have the `last` utility installed; that investigation
is unrelated to this correction.
