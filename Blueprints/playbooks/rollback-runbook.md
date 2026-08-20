# Rollback runbook

**valid-as-of:** 2026-08-19 · **Task:** `O2` · **Status:** documentation half complete; the live exercise and the named owner are founder actions still outstanding.

What to do when a deploy makes production worse. Written before it is needed, which is the only time it can be written calmly.

## Owner

| Role | Who | Notes |
| :--- | :--- | :--- |
| Rollback owner | **UNASSIGNED — founder to name** | `A4`'s `Done when:` already requires this. It must be a person, not a team or a role: at 2am the question is "who do I call", and "ops" is not an answer. |
| Who may execute | Founder only | Rolling back production is an action-level approval per the kickoff safety gates. General task approval never covers it. |

**This runbook is not usable until the owner line is filled in.** Everything below is mechanically correct and still fails if nobody knows they are on the hook.

---

## Read this before you need it: the rollback lever is weaker than it looks

The deploy pipeline publishes **one tag per image** and then deletes the local copy of what it replaced.

`.github/workflows/deploy.yml` pushes:

```
ghcr.io/justinduverge-design/omen:main
ghcr.io/justinduverge-design/omen-cron:main
```

…and the KVM1 step runs, in this order:

```bash
docker compose -f docker-compose.prod.yml --project-name omen pull api cron
docker compose -f docker-compose.prod.yml --project-name omen up -d --no-build api cron
docker image prune -f          # <— removes the image you just replaced
```

Two consequences, and they compound:

1. **There is no previous tag to roll back to.** `:main` is overwritten on every deploy, so "redeploy the last good tag" has no last good tag to name.
2. **The local fallback is actively destroyed.** Once the new `:main` is pulled, the previous image becomes untagged, and `docker image prune -f` removes it moments later. You cannot retag a cached copy, because there is no cached copy.

What survives is the **digest** in GHCR — untagged manifests are retained — so rollback by digest works. But nothing in the pipeline records digests, and reading them needs a token with `read:packages` (a plain `gh` token returns `403`, confirmed 2026-08-19). So the fastest path in an incident depends on a value nobody wrote down.

**Fix this before you need it — see [Make rollback cheap](#make-rollback-cheap) at the bottom.** It is one line per image.

---

## Backend rollback — the procedure that works today

Run everything on KVM1 from `/opt/omen/deploy/hostinger`.

### 1. Confirm it is actually the deploy

Before rolling anything back, rule out the cheaper explanations — a rollback that fixes nothing costs you the outage *and* the time.

```bash
curl -fsS https://slopssaloon.com/api/health
curl -fsS https://slopssaloon.com/api/ready
docker ps --format "table {{.Names}}\t{{.Status}}"
docker logs omen_api 2>&1 | tail -50
```

`/api/ready` separates dependency failure from app failure. **If `ready` reports Supabase unreachable, a rollback will not help** — the previous image talks to the same Supabase.

### 2. Find the digest of the last known-good image

Needs `read:packages`. In the GitHub UI: **Packages → omen → the version published before the bad deploy → copy its `sha256:` digest.** Or:

```bash
gh api "/user/packages/container/omen/versions?per_page=10" \
  --jq '.[] | {created: .created_at, digest: .name, tags: .metadata.container.tags}'
```

Match by `created_at` against the deploy run that broke things. **Write the digest into the incident notes as you go** — you will need it again for the roll-forward.

### 3. Pin and restart

```bash
cd /opt/omen/deploy/hostinger
docker pull ghcr.io/justinduverge-design/omen@sha256:<DIGEST>
docker tag ghcr.io/justinduverge-design/omen@sha256:<DIGEST> \
           ghcr.io/justinduverge-design/omen:rollback
```

Then point the compose service at `:rollback` and bring it up:

```bash
# edit docker-compose.prod.yml: image: ghcr.io/justinduverge-design/omen:rollback
docker compose -f docker-compose.prod.yml --project-name omen up -d --no-build api
```

**Do not run `docker image prune` during an incident.** It is in the deploy path for disk hygiene and has no place in a recovery.

If the cron worker is implicated, repeat for `omen-cron`. Cron is a scheduled worker with no HTTP surface — **stopping it outright is a valid holding action** and safer than a half-understood rollback:

```bash
docker compose -f docker-compose.prod.yml --project-name omen stop cron
```

### 4. Verify the rollback actually took

```bash
docker inspect --format='{{.Image}}' omen_api      # confirm the digest changed
curl -fsS https://slopssaloon.com/api/health
curl -fsS https://slopssaloon.com/api/ready
curl -fsS https://slopssaloon.com/api/version      # git_sha / image_tag of what is now live
```

`/api/version` is the honest check: it reports the running build, not what you believe you deployed.

### 5. Roll forward, do not leave it pinned

A `:rollback` tag pinned in compose means **the next deploy silently does nothing** — the workflow pulls `:main`, and the service is not pointing at `:main`. That is a worse failure than the original, because everything reports success.

Restore `image: ghcr.io/justinduverge-design/omen:main` in `docker-compose.prod.yml` as part of closing the incident, and record the pin *and* the unpin in `Direction/decision_log.md`.

### Alternative: revert the commit

If the bad change is obvious and the build is healthy, reverting on `main` and letting the deploy workflow rebuild is simpler and leaves no pinned tag behind. It is **slower** — a full build and push — so prefer it for a bad-but-not-bleeding deploy, and prefer the digest pin when the site is down.

---

## Mobile rollback — there is none

**Recorded explicitly, because "we'll roll back" is a comforting thing to assume about a mobile app and it is false.**

Once a build is on a phone it stays there until the user updates. Apple and Google both let you halt *distribution* of a build, which stops new installs — it does **not** remove or downgrade the app for anyone who already has it.

**The mitigation is `O7`, the forced-update / minimum-version gate**, closed 2026-08-19:

- `GET /api/system/min-version` reports a server-driven minimum per platform.
- A build below it is blocked with an honest prompt.
- Raising `MIN_APP_VERSION_IOS` / `MIN_APP_VERSION_ANDROID` on KVM1 is the mobile equivalent of a rollback: it stops a bad build being *used*, though it cannot replace it.

**The ordering constraint is not optional.** Fill the store URLs first (`OMEN_IOS_APP_STORE_URL`; Android derives its Play URL from the package name), confirm they resolve, **then** raise the minimum. Reversed, every blocked user gets a correct prompt attached to a dead end, with no route through the app — you will have converted a bad build into a total lockout.

Both minimums currently sit at `0.1.0`, equal to the shipped version, so the gate blocks nobody. That is deliberate: the lever has to already be in users' builds before it can ever help.

---

## Make rollback cheap

**One line per image**, in `.github/workflows/deploy.yml`:

```yaml
tags: |
  ghcr.io/justinduverge-design/omen:main
  ghcr.io/justinduverge-design/omen:sha-${{ github.sha }}     # <— add this
```

With an immutable per-build tag, steps 2 and 3 above collapse into one command against a name you can read off the commit history, instead of a digest hunt against a package registry during an outage.

**Not done here on purpose.** Deployment workflow changes are founder-gated (`Direction/known_issues.md` § Do Not Touch). This is a recommendation with the exact diff attached, not a pending change.

Worth pairing with it: drop `docker image prune -f` from the deploy step, or scope it to `--filter "until=168h"`, so the previous image survives long enough to be a local fallback.

---

## The exercise this runbook still owes

`O2`'s `Done when:` requires the backend rollback path to be **executed once against a non-critical deploy**, not merely written. Until that happens, everything above is a plausible procedure, not a tested one — and the failure modes that matter are exactly the ones a dry read does not surface.

Suggested shape when the founder runs it:

1. Note the current digest from `/api/version` and GHCR.
2. Deploy a trivial, reversible change (a comment-only commit).
3. Roll back to the noted digest using the steps above.
4. Confirm via `/api/version` that the *previous* build is live.
5. Roll forward, restore `:main` in compose, and record both in `Direction/decision_log.md`.
6. Time each step. **The number that matters is how long step 2 takes when you do not already know the digest.**
