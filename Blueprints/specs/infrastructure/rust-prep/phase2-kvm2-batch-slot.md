# Phase 2 prep — KVM2 batch slot for the model jobs

**valid-as-of:** 2026-10-17
**Status:** DRAFT. Not scheduled. Copy the timer row into `infra/schedule/TIMERS.md` only when Phase 2 is built
("change a timer, change this file").

## What else uses KVM2

- `ollama` with `gemma3:4b` (3.3 GB of 7.9 GB RAM, 2 vCPU, no GPU, ~10 tokens/s, 19 s cold load).
- The Restic repository that receives the KVM1 warehouse backup. That backup is chained from the 07:15 ET ingest,
  so KVM2 is busy with disk and network I/O shortly after 07:15 ET.
- `omen-warehouse-restore-proof`, Sun **14:00 UTC**.
- `omen-maintenance`, Fri **06:30 UTC**.

## Proposed slot

| Timer | When | Purpose | Watched by |
|---|---|---|---|
| `omen-model-batch` | daily **08:30 ET** (`America/New_York`) | player notes, then digest, ops summaries, data-quality suggestions | Kuma push "Omen model batch" |

Why 08:30 ET:
- It is after the ingest (07:15 ET) and leaves the chained backup about an hour to finish.
- It is clear of the Tuesday football-data morning (05:15–07:45 ET).
- On Sundays, notes are ready well before the 13:00 ET kickoffs.

## Guards the job must enforce

1. **Today's ingest succeeded.** Read the warehouse ingest receipt. If today's run is missing or failed, exit cleanly
   and report "skipped: no fresh facts". This is the cross-host version of `OnSuccess=`, per TIMERS.md rule 1.
2. **Backup finished.** If the warehouse backup is still writing to KVM2, wait up to 30 minutes, then skip.
3. **Sunday hard stop at 13:45 UTC**, before the restore proof. Use UTC, not ET: the restore proof is 10:00 ET until
   daylight saving ends on 2026-11-01, then **09:00 ET**. A stop written in ET would collide in winter.
4. **Daily hard stop at 12:00 ET**, so the model is free when Sunday games start.
5. **Busy check.** Exit cleanly when another `BUSY_UNITS` job is active. Add `omen-model-batch.service` to KVM2's
   `BUSY_UNITS` so Friday maintenance waits for it.
6. **One model at a time.** The Gemma vs. Ministral comparison runs the models back to back, never loaded together.
7. Use `keep_alive` for the batch and unload when it is done.

## Expected run time

- First full run: about 600 notes at ~3 h on the 4B model. That is longer than the daily window, so run it
  **once, manually, on a weekday night**, outside every slot above.
- Daily runs after that rewrite only the notes whose input-fact hash changed, which should fit well inside the window.
  Measure this during shadow.

## Open

- The name of the ingest receipt the guard reads (Phase 3 may rename it).
- Whether Kuma's monitor should alert on a "skipped" run or only on "failed".
