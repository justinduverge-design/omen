# Rollback runbook

**valid-as-of:** 2026-08-20 · **Task:** `O2` · **Status:** documentation and immutable-tag fix applied; the founder-only live exercise remains outstanding.

What to do when a deploy makes production worse. Written before it is needed, which is the only time it can be written calmly.

## Owner

| Role | Who | Notes |
| :--- | :--- | :--- |
| Rollback owner | **Justin Duverge** (named 2026-08-19) | `A4`'s `Done when:` required this. It is a person, not a role: at 2am the question is "who do I call", and "ops" is not an answer. |
| Who may execute | Founder only | Rolling back production is an action-level approval per the kickoff safety gates. General task approval never covers it. |

**Single point of failure, stated plainly:** the owner and the only person who may execute are the same person. There is no second pair of hands. That is a real constraint on a solo product, not a defect to fix on paper — but it means the runbook has to stay readable by someone who did not write it, in case that day comes.

---

## The rollback lever — read this before you need it

> **Live path:** the two-tag scheme below landed in PR [#347](https://github.com/justinduverge-design/omen/pull/347) / `5cf3597` on 2026-08-20. Use the immutable SHA tag for current builds. Use the digest fallback in step 3 only for builds published before immutable tags existed.

Every deploy now publishes **two** tags per image:

```
ghcr.io/justinduverge-design/omen:main
ghcr.io/justinduverge-design/omen:sha-<full-commit-sha>
```

The `sha-` tag is immutable and readable straight off the commit history, so **rolling back becomes a tag change, not a digest hunt.** The prune step is time-scoped (`--filter "until=168h"`), so the previous week of images also survives on KVM1 as a local fallback.

### What it looked like before, and why that still matters

Before PR #347, the pipeline published only `:main`, overwritten on every deploy — so "redeploy the previous tag" named nothing. Worse, the deploy step ran a bare `docker image prune -f` immediately after `pull` + `up -d`, deleting the image it had just replaced. **The pipeline destroyed the only local artifact a rollback could have used, moments after creating the need for one.**

Rollback by GHCR digest still worked, but nothing recorded digests and reading them needs a `read:packages` token — a plain `gh` token returns 403. The recovery path depended on a value nobody had written down, found mid-outage through a UI.

**Kept here permanently, even after the fix lands.** If someone later trims the tag list back to one entry "for cleanliness", this is the paragraph explaining what that costs.

---

## Backend rollback — the procedure

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

### 2. Find the last known-good commit

```bash
curl -fsS https://slopssaloon.com/api/version     # git_sha of what is live NOW
git log --oneline -10 main                        # pick the commit before the bad one
```

The tag you want is `sha-<full-commit-sha>` — the **full** 40-character SHA, not the short form `git log` prints by default. Get it with `git rev-parse <short-sha>`.

### 3. Pin and restart

```bash
cd /opt/omen/deploy/hostinger
GOOD=<full-40-char-sha>
docker pull ghcr.io/justinduverge-design/omen:sha-$GOOD
```

Point the compose service at that tag and bring it up:

```bash
# edit docker-compose.prod.yml:
#   image: ghcr.io/justinduverge-design/omen:sha-<GOOD>
docker compose -f docker-compose.prod.yml --project-name omen up -d --no-build api
```

**Do not run `docker image prune` during an incident.** It belongs to the deploy path's disk hygiene and has no place in a recovery.

If the cron worker is implicated, repeat for `omen-cron`. Cron is a scheduled worker with no HTTP surface — **stopping it outright is a valid holding action** and safer than a half-understood rollback:

```bash
docker compose -f docker-compose.prod.yml --project-name omen stop cron
```

<details open>
<summary><strong>Rollback by digest</strong> — the permanent fallback for builds published before immutable SHA tags existed</summary>

Needs a token with `read:packages`. A plain `gh` token returns `403` — confirmed 2026-08-19.

```bash
gh api "/user/packages/container/omen/versions?per_page=10" \
  --jq '.[] | {created: .created_at, digest: .name, tags: .metadata.container.tags}'

docker pull ghcr.io/justinduverge-design/omen@sha256:<DIGEST>
docker tag ghcr.io/justinduverge-design/omen@sha256:<DIGEST> \
           ghcr.io/justinduverge-design/omen:rollback
```

Then point compose at `:rollback`. Match the version by `created_at` against the deploy run that broke things, and **write the digest into the incident notes** — you will need it again for the roll-forward.

</details>

### 4. Verify the rollback actually took

```bash
docker inspect --format='{{.Image}}' omen_api      # confirm the digest changed
curl -fsS https://slopssaloon.com/api/health
curl -fsS https://slopssaloon.com/api/ready
curl -fsS https://slopssaloon.com/api/version      # git_sha / image_tag of what is now live
```

`/api/version` is the honest check: it reports the running build, not what you believe you deployed.

### 5. Roll forward, do not leave it pinned

A `sha-…` or `:rollback` tag pinned in compose means **the next deploy silently does nothing** — the workflow pulls `:main`, and the service is not pointing at `:main`. That is a worse failure than the original, because everything reports success.

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

## The exercise this runbook still owes

`O2`'s `Done when:` requires the backend rollback path to be **executed once against a non-critical deploy**, not merely written. Until that happens, everything above is a plausible procedure, not a tested one — and the failure modes that matter are exactly the ones a dry read does not surface.

Suggested shape when the founder runs it:

1. Note the live `git_sha` from `https://slopssaloon.com/api/version`. That is your known-good.
2. Deploy a trivial, reversible change — a comment-only commit to `main`. Let the workflow finish.
3. Roll back to the noted commit's `sha-` tag using the steps above.
4. Confirm via `/api/version` that the **previous** build is live — not what you believe you deployed.
5. Roll forward, restore `image: …omen:main` in `docker-compose.prod.yml`, and record both in `Direction/decision_log.md`.
6. Time each step.

**Step 5 is the one people skip, and it is the one that bites.** A pinned tag left in compose means the next deploy pulls `:main`, restarts a service that is not pointing at `:main`, and reports success — a silent no-op that looks exactly like a healthy deploy. Verify with `/api/version` after rolling forward, not just after rolling back.
