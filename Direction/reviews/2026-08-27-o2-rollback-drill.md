# O2 — rollback drill, executed 2026-08-27

**Executed by:** Claude, on KVM1 as `justin`, under explicit founder authorization given
2026-08-27 ("I approve you to do one through five").
**Result:** the documented rollback path works. **Recovery time 3 seconds, both directions.**
**Production was restored and verified before this file was written.**

---

## What was exercised

The real path, against the real production deployment — not a rehearsal against a copy.

| Step | Time (UTC) | Result |
|---|---|---|
| Baseline | 22:06:11 | live `5006307b9ad7`, healthy |
| Roll back to previous build `e83ce8f536b2` | 22:06:20 | **healthy after 3s** |
| Verified production serving the older commit | — | `/api/version` reported `e83ce8f536b2` |
| Restore to `5006307b9ad7` | — | **healthy after 3s** |
| Final verification | — | `/api/version` `5006307b9ad7`, `/api/ready` `ready` |

Method: retag `ghcr.io/justinduverge-design/omen:main` to the target image id, then
`sudo docker compose -f docker-compose.prod.yml --project-name omen up -d --no-build api`.
The `sudo` is required because `.env.production` is root-owned — the same mechanism PR #373
put into `deploy.yml`.

**Blast radius at time of drill:** pre-beta. TestFlight only, no public user cohort. This is
the cheapest window this drill will ever have.

---

## The finding: the fallback existed but was unusable until yesterday

`deploy.yml` carries this comment, added under O2:

> "Time-scoped on purpose (O2). A bare `docker image prune -f` removed the image this deploy
> had just replaced… **168h keeps a week of previous builds on disk as a fallback** while
> still bounding growth."

That is true and it was **not sufficient**. The previous builds are kept as **dangling,
untagged** images. Before PR #375 they carried no commit metadata at all, so what was
actually on disk was four anonymous 416 MB blobs with timestamps. You could roll back to
*something*; you could not know *what*.

PR #375 baked `GITHUB_SHA` / `BUILD_ID` / `IMAGE_TAG` into both images. Every candidate now
self-identifies:

```
0c628b636fb3  sha=5006307b9ad7…   <- running
d4226d9cf9cd  sha=e83ce8f536b2…   <- rollback target used
57fdad962197  sha=233a939898 2a…
2722ac1d9d78  sha=7d822c1a62a2…
```

**#375 was written to fix a diagnosis problem and it turned out to be the thing that makes
rollback identifiable.** Without it this drill would have been a coin flip.

### Residual gap, named rather than fixed

Only `:main` is ever pulled to the host — the compose file references that tag alone, so the
`:sha-<commit>` tags pushed by the build never land on KVM1. Rollback therefore depends on
whichever dangling images the 168h prune has not yet collected. **After a quiet week there
may be nothing to roll back to.** Options, none taken here because none was authorized:

1. Pull and retain the `:sha-<commit>` tag alongside `:main` on each deploy.
2. Keep the last N images explicitly tagged rather than relying on prune timing.

Recommend (1). It is one line in the deploy step and makes the rollback target a name rather
than an archaeological find.

---

## What this does NOT close

O2 has two halves and only one is discharged.

- ✅ **Tested rollback path** — exercised, timed, restored, recorded above.
- ⛔ **Named rollback owner** — **still open, and cannot be closed by an agent.** O2's own
  record says "'named owner' means a person", and facts-of-record #14 says authorization is
  not evidence. A rollback owner is who is accountable at 3am. That is Justin, and it needs
  him to say so on the record.

`A4`'s sixth evidence gate reads "completed O2 rollback exercise **with Justin as owner**".
The exercise is now complete; the owner clause is not.
