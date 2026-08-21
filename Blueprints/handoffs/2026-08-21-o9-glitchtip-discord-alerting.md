# Handoff — 2026-08-21 — O9: GlitchTip issues reach Discord

**Status: `O9` is `CLOSED`.** All three `Done when:` clauses proven live with the founder confirming each Discord message — not in dry-run.

Immediately follows `O8` (`Blueprints/handoffs/2026-08-21-o8-glitchtip-error-paths.md`), which made real application errors exist in GlitchTip in the first place. Until O8 there was nothing to route.

## The choice O9 asked for

O9's Scope required evaluating two options against Layer 5's existing noise-control rules before picking one.

**Chose (a): extend the Command Center dispatcher.**

**Rejected (b): GlitchTip's native webhook pointed at the same Discord URL.** It would have put a second alert path into one channel with different semantics — no shared signature, no shared dedup, its own recovery behavior or none. O9's `Done when:` requires *"the same dedup/recovery behavior already proven for Layer 5's other signals"*, and (b) could only reach that by reimplementing the noise control that already existed thirty lines away.

**Reading GlitchTip's Postgres directly mirrors how the dispatcher already reads Kuma's SQLite** (`sqlite3 -readonly`). That precedent decided the mechanism: no API token to provision, no new secret, no new auth surface. The read runs under a forced read-only transaction, verified by confirming an `UPDATE` is refused rather than by assuming `PGOPTIONS` took effect.

## Design decisions worth keeping

**The signature carries issue identity, never the event count.** Counting would re-alert on every new event, so a flapping ESPN error would spam the channel indefinitely. As built: a new issue alerts once, an issue accumulating events stays quiet, resolving everything sends one recovery.

**Issue titles are sanitized before they can reach the payload.** Titles are error text — vendor- and input-influenced, unlike the fixed Kuma monitor names the script was written for. Quotes, backslashes and control characters are stripped, and titles are truncated at 90 characters.

**GlitchTip being down yields an empty result, not a false all-clear.** That gap is covered by Kuma's own `GlitchTip` monitor, which already feeds the same signature through the Kuma signal.

## Two latent defects found, both pre-dating GlitchTip

Adding a fourth signal source produced the dispatcher's first genuinely multi-line signature. It failed.

### 1. A multi-signal alert could never have been delivered

The payload was built by interpolating the signature into JSON. A multi-line signature embeds **raw newlines inside a JSON string**, which is invalid; Discord answered `400`.

**Every alert this system had ever proven carried exactly one failing signal.** The original simulated-failure test, and every real alert since, happened to be single-line. So a simultaneous two-signal failure — two Pis unhealthy, or a host down *and* an endpoint down — would have produced **no notification at all.** The alerting layer failing precisely in the situation it exists for.

Now built with a real JSON encoder, which also removes the need to trust the title sanitizer as the only defense.

### 2. State was persisted before delivery was confirmed

The new signature was written to disk *before* `send`, so a failed send was never retried — the state file claimed "already reported" for an alert that never left the machine.

**This is why defect 1 was silent rather than loud:** the first failed send still recorded its signature, so the next run saw no change and stayed quiet. Two independent bugs, each of which hid the other.

Delivery now precedes persistence; under `set -e` a failed send leaves the state untouched and the next run retries.

## Also corrected in-pass

The install briefly set mode `0755` on a script that was `0700`. The script reads the Discord webhook secret path, so root-only execution is deliberate. Restored to `0700`, both modes confirmed matching, and recorded in `ops/command-center/README.md` as a post-deploy check.

## Evidence

Live, in sequence, each Discord message quoted back by the founder:

| Step | Expected | Result |
|---|---|---|
| Install, fire | one CRITICAL listing 3 unresolved issues | delivered, correctly multi-line |
| Fire again, unchanged | silence | silent |
| Founder resolves all 3 in the GlitchTip UI | — | statuses `1,1,1` confirmed in Postgres |
| Fire | exactly one `SLOPS RECOVERY` | delivered |
| Fire again | silence | silent |

Other signals confirmed unaffected by running each collector directly rather than inferring from a quiet channel: **6** `result=` lines from Steward/Sentinel, all **4** Kuma monitors `status=1`, Pi-hole probe clean.

Deployed artifact vendored at `ops/command-center/slops-alert-dispatcher` and verified byte-identical to `/usr/local/sbin/slops-alert-dispatcher`. Pre-change backup on the Pi at `/usr/local/sbin/slops-alert-dispatcher.bak-20260821-o9-before-glitchtip`.

## The lesson, which is O8's lesson one layer up

**Monitoring and alerting fail in the shape of good news.**

`O8` found production reporting errors nowhere while reporting itself `enabled: true`. `O9` found the alerting path unable to deliver the multi-signal alert it exists for. Neither was visible to any "is it configured?" check. Both were found only by exercising the real path with real content.

Layer 5's noise-control semantics were genuinely proven when it was built — but every proof used a **single** simulated failure, so the delivery mechanism was only ever tested on its easiest possible input. **A test that exercises one item does not test a list.**

## Skills

- **Invoked:** core implementation; `security-privacy-evidence` (read-only transaction enforcement verified rather than assumed, `0700` restoration, title sanitization, webhook secret never read or echoed).
- **Considered, not applicable:** `slops-ship` / `slops-canary` — L0 skills, unavailable in a standalone Omen checkout, recorded UNAVAILABLE rather than skipped-by-choice; `operations:runbook` — the artifact is a 27-line script vendored with its own README, not a procedure needing a runbook.
- **Procedure gap:** Layer 5's acceptance evidence should require a **multi-signal** simulated failure, not a single one. Recorded in the fleet spec.
