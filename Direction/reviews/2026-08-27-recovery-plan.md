# Recovery plan — 2026-08-27

## Where we are, in six lines

1. **Production is healthy and deploys work again.** #373 fixed the broken deploy; the last run succeeded and the containers are on new images.
2. **A6 is safely contained in production.** #372 made the server persist every issued recommendation and refuse to issue one it cannot persist. Both scoring flags stay `false`.
3. **The provider-neutral contract and evaluator core is already written.** It is PR #371 — open, green, `814/814`, conflict-free. It is not a thing left to build.
4. **The next action is one merge and one small wiring change**, not a build phase.
5. **Everything after that is either a document or a permission**, and the permissions are not ours to grant.
6. **Tuesday scoring stays off** until full A6 proof plus the `O2` rollback drill.

## The next three moves, in order

| # | Move | Who | Size |
|---|---|---|---|
| 1 | Merge PR #371 | founder | one click |
| 2 | Wire `deriveScoringSnapshot()` into `scoringPersistenceMetadata()` so #372 stops writing `scoring_contract: null` | agent | ~1 call + tests |
| 3 | Capture one real production row and read it back | agent, after 1–2 deploy | small |

Then, in any order and none blocking the others: ratify the restricted-provider acceptance amendment (wording, drafted); write the per-provider coverage matrix; add a multi-week replay matrix; populate `git_sha` in `/api/version`.

**Blocked on other people, not on us:** Sleeper written permission, Yahoo entitlement (still 403), ESPN (stays restricted by design).

---


Written after the founder reported "the app seems broken and things built months
ago weren't built." Both halves of that are worth separating, because one is true
and urgent and the other is not true.

---

## Part 1 — What is actually wrong (one thing, and it is not the app)

**The app is not broken. The deploy pipeline is.**

Production answers every endpoint with 200 and reports `status: "ready"`. What
broke is that `main` stops reaching production. The last two pushes both failed
with the same error:

```
open /opt/omen/deploy/hostinger/.env.production: permission denied
```

Last successful deploy: **2026-08-25 22:23**. Everything merged since then — the
A7B phase-4 records, and PR #372's A6 safety fix — **is on `main` and is not
running.**

This is the worst shape of failure to be in, because nothing looks wrong. The old
container keeps serving happily. Health checks stay green. The only signal is a
red mark on the Actions tab.

**The cause is on the KVM1 host, not in any code.** The `docker compose pull` step
succeeds, so the runner can read the directory and the compose file. Only
`.env.production` is unreadable. That is what a tightened `chmod`/`chown` on that
single file looks like. The break window (2026-08-25 22:23 → 2026-08-26 23:37) is
exactly the A7B Phase 3/4 host-hardening window. **That is a strong lead, not a
proof** — confirming it means reading the file's mode and owner on the host, and
no agent in this session has that access.

---

## Part 2 — "Things built months ago weren't built"

This is the opposite of what happened, and it is worth being precise because the
two cases feel identical and are not.

**Case A — the six "Not Deployed / Not Merged" items. These WERE built and ARE
running.** Every one has been on `main` since 2026-06-03/04, and one of them
(`GET /api/version`) answered live from production during this session. A status
file said they were undeployed. The file was wrong, for about twelve weeks, and
`B-FREEZE` sat blocked on it the whole time. **Nothing was lost. A document
lied.**

**Case B — the four screens. These genuinely were never built, and nobody ever
claimed they were.** The switcher sheet, Waiver Analysis, Start/Sit detail, and
Ledger detail were *approved as designs* on 2026-07-20 and never given a delivery
item. They were not forgotten builds; they were designs that fell out of the
queue. That is why nobody noticed for five weeks: no task existed to go stale.

So: nothing you were told was built has evaporated. One document was stale in the
pessimistic direction, and four approved designs were never queued.

---

## Part 3 — The plan, in order

### Step 1 — Fix the deploy. ✅ DONE 2026-08-27 (PR #373).

Nothing else matters until `main` can reach production again, because until then
every merge is invisible.

**Done.** #373 changed the workflow to read the protected env on recreate rather
than widening the file's permissions — the right shape of fix. Deploy run
`33028395352` succeeded; API and cron are on new images; health, readiness and
public-route canaries pass; both scoring flags remain `false`.

Original diagnosis, kept for the record:

On KVM1:

```bash
ls -l /opt/omen/deploy/hostinger/.env.production
```

Compare its owner and mode against the user the self-hosted runner runs as
(`ps -o user= -C Runner.Listener`, or check the runner service unit). The fix is
to make that file readable by the runner's user — group-read via the runner's
group is preferable to widening it to everyone. **Do not `chmod 644` a file full
of production secrets.**

Then re-run the failed deploy from the Actions tab rather than pushing an empty
commit, so the fix is proven against the exact run that failed.

**Verify after:** `GET /api/version` should change (it currently reports
`git_sha: null`, which is its own small gap) and `/api/ready` should stay
`ready`.

### Step 2 — Add a check so this cannot go quiet again

The real defect is not the permission. It is that **two failed deploys produced no
signal anyone saw.** A red Actions mark is not a signal when nobody is looking at
the tab.

`O3 — post-deploy canary` is already in the queue for exactly this and has never
been done. The Discord alerting from `O9` already exists and works. Wiring "deploy
failed" into it is small and agent-buildable.

### Step 2.5 — Reconciled A6 sequence (supersedes Step 3 below)

The parallel session proposed: **deploy → containment row → amend language →
implement core → add providers.** That is the right shape and the right first
step. One correction, checked against code rather than against either session's
description:

**"Implement the provider-neutral contract/evaluator core" is not a build step.
It is a merge step.** Three of its six engineering items already exist:

- canonical serialization + hashing — built, PR #371
- reconciliation states, all seven — built, PR #371
- lawful event-fact evaluator — built **2026-08-24** (`bdb8fdc`), before either
  session. It was *orphaned* — no production caller — which is why it reads as
  missing. #371 wires it in.

Genuinely still open: the **written** per-provider coverage matrix, a
**multi-week replay** matrix, and the production new-row proof (deploy-blocked).

So the sequence becomes:

1. **Fix the deploy** (Step 1). Unchanged, still first, still founder-only.
2. **Merge #371.** Moves from step 4 to step 2 — the core is already written and
   green; leaving it open is what makes it look unbuilt.
3. **Wire the two halves.** One call: `deriveScoringSnapshot()` inside
   `scoringPersistenceMetadata()`, so #372's write path stops storing
   `scoring_contract: null` and stores the body #371 derives. Small,
   agent-buildable.
4. **Capture the production containment row.** Needs 1–3 to be live first.
5. **Ratify the restricted-provider acceptance amendment** — drafted in
   `current_sprint.md` under A6, marked as awaiting founder ratification. This is
   a **wording fix, not a build**: the code already emits a hashed restriction
   attestation for ESPN rather than a fabricated snapshot, and reconciliation
   already refuses `exact` for it. It can be ratified in parallel with anything
   above; nothing waits on it.
6. **Write the coverage matrix and the replay matrix.** The two genuine partials.
7. **Add providers as lawful access clears** — Sleeper permission pending, Yahoo
   entitlement still 403, ESPN stays restricted.

**Tuesday scoring re-enablement is unchanged and still gated** on full applicable
A6 proof plus the `O2` rollback drill.

### Step 3 — Finish A6 by joining the two halves

PR #372 (merged) built the **write path**: every issued recommendation is now
persisted, and it refuses to issue one if persistence fails. It writes
`scoring_contract: null`.

PR #371 (open) builds the **derivation** that produces the contract body that
column wants, plus reconciliation.

**Neither is complete alone.** The next concrete step is one wiring change: call
`deriveScoringSnapshot()` inside `scoringPersistenceMetadata()`. Agent-buildable,
small.

Still genuinely blocked after that, and not worth pretending otherwise:

- **ESPN** — no provider-granted right to capture its complete private rules.
- **Yahoo** — API refused at the app-entitlement level.
- **Event facts** — the Tuesday source publishes aggregate points, not the
  per-event facts a contract prices. That is what A7B is for.

### Step 4 — Decide what to do with PR #371

It is rebased onto current `main`, conflict-free, 813/813 green. It adds five
endpoints the four approved screens need, and nothing else depends on it.

It is **additive** — five new paths. The only existing behavior it changes is the
active-league ordering, which is byte-for-byte identical until someone actually
picks a league. Full risk breakdown and post-deploy checks:
`Direction/reviews/2026-08-26-b2d3s2-deploy-note.md`.

**But do not merge it until Step 1 is done.** Merging into a pipeline that cannot
deploy just adds another invisible change to the pile.

### Step 5 — Queue the four screens

`M9-NativeScreenBacklog` is still open and still a planning act. Their backends
now exist (pending #371), so the blocker that would have stalled them is gone.

---

## What I would watch for next

The two stale-record failures in this session pointed in opposite directions: one
said work was missing when it was live, the other said a defect existed when it
was fixed. Both were caught the same way — reading `main` instead of the
description of `main`.

The deploy break is the same disease one layer down: **the record of what is
running and what is actually running drifted apart, and nothing compares them.**
`GET /api/version` returns `git_sha: null`, so there is currently no way to ask
production which commit it is serving. Populating that would make this class of
drift a one-line check instead of an archaeology exercise.
