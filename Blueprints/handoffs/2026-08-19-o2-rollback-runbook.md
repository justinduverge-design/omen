# O2 — Rollback runbook (documentation half)

**Date:** 2026-08-19
**Agent:** Claude (claude-code)
**Task:** `O2` — named rollback owner and tested rollback path
**Status on close:** `IN_PROGRESS` — documentation half delivered; the named owner and the live exercise are founder-only and outstanding.
**Branch/PR/deploy:** work is local and uncommitted at the time of writing. Nothing is pushed, merged, or deployed.

## What shipped

`Blueprints/playbooks/rollback-runbook.md` — the backend rollback procedure that works **today** (not the one the plan assumed), the mobile answer, verification steps, and the exercise `O2` still owes. Wired into `Blueprints/done/release-done.md` gates 11 and 16.

## The finding — this is the part worth reading

**The deploy pipeline destroys the artifact you would roll back to.**

`.github/workflows/deploy.yml` publishes exactly one tag per image:

```
ghcr.io/justinduverge-design/omen:main
ghcr.io/justinduverge-design/omen-cron:main
```

No immutable per-build tag. `:main` is overwritten on every deploy, so **"redeploy the previous tag" names nothing.** Then the KVM1 step runs, in this order:

```bash
docker compose ... pull api cron
docker compose ... up -d --no-build api cron
docker image prune -f          # removes the image just replaced
```

Once the new `:main` is pulled the previous image is untagged, and `prune` deletes it moments later. **Both obvious rollbacks — redeploy the old tag, retag the cached image — are unavailable, and the second is unavailable because the pipeline deliberately removes it.**

### What still works, and why it is not good enough

GHCR retains untagged manifests, so rollback **by digest** is real and the runbook documents it. But nothing in the pipeline records a digest, and reading them needs a `read:packages` token — a plain `gh` token returns `403`, confirmed live 2026-08-19:

```
gh api /user/packages/container/omen/versions
→ 403 "You need at least read:packages scope"
```

So the recovery path depends on a value nobody wrote down, found during an outage, through a UI. **A rollback whose first step is a scavenger hunt is not a rollback.**

### Recommended fix — not applied, founder-gated

One line per image in `deploy.yml`:

```yaml
tags: |
  ghcr.io/justinduverge-design/omen:main
  ghcr.io/justinduverge-design/omen:sha-${{ github.sha }}     # add
```

Plus dropping `docker image prune -f` from the deploy step, or scoping it to `--filter "until=168h"` so the previous image survives as a local fallback.

**Deployment workflow changes are founder-gated** (`known_issues.md` § Do Not Touch), so this is a recommendation with the exact diff attached, not a pending change. Applying it turns an outage-time digest hunt into a tag change readable off the commit history.

## The mobile answer, recorded as the `Done when:` requires

**There is no mobile rollback.** Halting distribution on App Store Connect or Play Console stops *new installs*; it does not remove or downgrade the app for anyone who already has it.

`O7`'s forced-update gate is the mitigation, and its ordering constraint is part of the record: **fill the store URLs first, raise the minimum version second.** Reversed, every blocked user gets a correct prompt attached to a dead end with no route through the app — a bad build converted into a total lockout. Both minimums currently sit at `0.1.0`, equal to the shipped version, so the gate blocks nobody today. That is deliberate: the lever has to already be in users' builds before it can help.

## A stale gate, found by trying to pass it

`Blueprints/done/release-done.md` still carried a ⛔ **HARD-BLOCKED** banner citing a GitHub Actions billing hold. **That hold was retracted 2026-08-01 — it never existed.** The banner would have blocked a legitimate Release Done closure on a known-false premise, and had done so for 18 days. Corrected, with the provenance kept.

**Why the reconciliation two hours earlier missed it:** that pass compared repo records against *GitHub*. This was a repo record contradicting a *retraction inside the repo*, which no checker covers. **Nobody reads a gate they are not currently trying to pass** — which is the general lesson, and an argument for doing the O2-style "walk the procedure" exercise on other gates too.

## What is left, and why neither half is delegable

| Remaining | Why founder-only |
| :--- | :--- |
| Name the rollback owner | It must be a **person**. At 2am, "ops" is not an answer to "who do I call". |
| Execute the path once against a non-critical deploy | Rolling back production is an **action-level founder approval** per the kickoff safety gates. General task approval never covers it. |

The runbook's final section gives the exact six-step shape. **The number worth timing is step 2** — how long the digest lookup takes when you do not already know the digest. That is the number the recommended fix drives to zero.

**Until the exercise runs, the runbook is a plausible procedure, not a tested one.** The failure modes that matter are precisely the ones a dry read does not surface — which is the whole premise of `O2`.

## Verification

| Gate | Result |
|---|---|
| Backend `npm test` | **570/570**, 0 fail — documentation-only change, run to prove no incidental breakage |
| `check-sprint-staleness.js` | run before commit; see the PR body for the finding list |
| Code touched | **none** — no source, no workflow, no deploy config |

## Next recommended step

Founder: name the owner and run the exercise. Then `O2` closes and the Ops lane has no unclosed P0.

Separately, the `:sha-` tag recommendation is small, self-contained, and materially improves incident recovery. It is worth its own founder-approved change rather than waiting for the next incident to motivate it.
