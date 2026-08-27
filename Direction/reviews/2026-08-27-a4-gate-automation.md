# A4 scoring-gate automation — installed 2026-08-27

**Asked for:** "wire up the Discord alert, and have my Raspberry Pis just do this."
**Built:** KVM1 evaluates the gates daily and publishes state; Command Center pulls it over
the existing read-only channel and alerts Discord. Auto-enable is available and **gated by
an explicit control file that is not yet set.**

---

## Shape, and why it matches what was already here

This mirrors the football-data witness pattern exactly, because that pattern already
exists, already works, and already has an alert path:

| Where | What | Unit |
|---|---|---|
| KVM1 | evaluates gates, writes `/var/lib/omen-a4-gates/state.json` | `omen-a4-gates.timer` → `.service` → `/usr/local/libexec/omen-a4-gates-run` |
| KVM1 | serves that state read-only over the **existing** forced-command SSH channel | `omen-football-status-export`, extended with an `a4-gates` subcommand |
| Command Center | pulls it with the **existing** key | `omen-a4-gates-pull.timer` |
| Command Center | alerts Discord on state change | `slops-alert-dispatcher`, new `a4` signal block |

**No new SSH identity, no new key, no new webhook.** The exporter gained one `case` arm; the
dispatcher gained one signal block shaped like the football one.

## Green is the newsworthy state

Every other signal in that dispatcher alerts on **failure**. This one alerts on **success** —
"the gates are green, scoring can be enabled" — plus the fault cases. Not-ready is silent,
because a daily "still not ready" for a month is how people learn to ignore an alert channel.

Messages it can send:

- `ALL GATES PASS - scoring is ready to enable (auto-enable control file not set)`
- `TUESDAY SCORING ENABLED automatically - all gates passed`
- `checker_unavailable` / `state_unreadable` / `state_stale` — the fault cases

## Auto-enable: ARMED 2026-08-27, and reversible

`/etc/omen-a4/auto-enable` contains `enabled`. **It is set** — founder-directed 2026-08-27.

**To disarm at any time, on KVM1:**

```sh
sudo rm /etc/omen-a4/auto-enable        # back to report-only, takes effect on the next run
```

**If it enables and you want it off again:**

```sh
sudo sed -i 's/^OMEN_CRON_SCORING_ENABLED=true/OMEN_CRON_SCORING_ENABLED=false/' \
  /opt/omen/deploy/hostinger/.env.production
cd /opt/omen/deploy/hostinger && sudo docker compose \
  -f docker-compose.prod.yml --project-name omen up -d --no-build cron
```

Every auto-enable writes a timestamped `.env.production.bak-a4-autoenable-*` beside the
original first, so the prior state is always recoverable byte-for-byte.

With it set, on the first day every gate passes, KVM1 backs up `.env.production`, flips
`OMEN_CRON_SCORING_ENABLED` to `true`, recreates **only** the cron service, and Discord says
so. The API is never interrupted.

**Why this is now defensible, having argued against it earlier the same day.** Three things
changed, and they are the whole argument:

1. The **rollback path is proven** — exercised against real production on 2026-08-27, 3s
   recovery in both directions. An auto-enable that goes wrong is a three-second problem.
2. **Alerting exists and is proven** — the Discord path was tested end to end today.
3. The **checker is strict and fails closed** — a gate it cannot observe is `UNKNOWN`, never
   a pass; an unparseable result is `checker_unavailable`, never "ready".

What has **not** changed is the thing that made me cautious: a date trigger would enable
scoring whether or not the evidence existed. This does not do that. It enables only when the
evidence is observed, and the observation is the automated part.

## Verified, not assumed

- KVM1 service ran and produced real state: `ready:false`, failing `season_started`,
  `production_row`, `row_metadata_usable`. **The flag was not touched.**
- The first install produced `checker_unavailable` — the checker was copied to `/tmp` inside
  the container, where Node cannot resolve `/app/node_modules`. Fixed to `/app`, re-run,
  genuinely evaluating. **It failed closed rather than passing, which is the correct failure.**
- Both export subcommands verified as the restricted user.
- Command Center pulled the state over the existing channel.
- Discord `--test` delivered; a full dispatcher run with real signals did not regress.
- A simulated all-green state **fired the Discord alert**, then real state was restored and
  the signature returned to empty.
- **Arming verified:** with the control file set and gates still red, the runner ran and
  changed nothing — flag stayed `false`, cron container untouched. The safe path is the one
  actually exercised, not the assumed one.
- **Enable path proven in a sandbox** before arming: flag flips `false`→`true`, unrelated
  env lines survive, the operation is idempotent, and the timestamped backup is written.
  (The first check reported "backup exists: 0" — a test artifact, `ls` without `-a` on a
  dotfile. Re-checked with `ls -a`: the backup is real and its contents correct. Worth
  recording because "the backup didn't happen" would have been the wrong conclusion from a
  correct-looking command.)
- Dispatcher state machine exercised for all seven cases including garbage, wrong schema,
  and a 3-day-stale file. Every fault case fails closed to a visible alert.

## What it still cannot do

The gates cannot go green before **2026-09-05** — there is no season — and cannot go green
until a real recommendation has been generated after that. Both are correct.
