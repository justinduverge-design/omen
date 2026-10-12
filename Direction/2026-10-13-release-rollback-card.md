# Tuesday 2026-10-13 release: rollback card (prepared 2026-10-12)

No secrets here. Execution of any step below is the founder's call unless the founder says otherwise. Tool: `ssh omen-kvm1` (user `justin`).

## What is live and what it can be rolled back to

API deploy history on `main` (all CI green, each canary PASS or deploy-time health OK). The current baseline for the release is **`ab18af0`**.

| Commit | What it added | Use as rollback target when |
|---|---|---|
| `ab18af0` (live) | tiered injury and projection freshness (#650) | baseline |
| `114e283` | projections store code, flags OFF (#649) | #650 misbehaves and the kill switch is not enough |
| `45dd3fe` | Yahoo projections (#645) | the stored-read code is suspected |
| `34bb2b2` | ESPN and Yahoo playoff cut line (#648) | Yahoo projections suspected |
| `1c6c6dd` | trade suffix names (#640), before structured trade, Yahoo, store, freshness | broad regression after the structured trade/Yahoo/freshness group |
| `58e5bcd` | Omen trade call in the app contract era (#639) | last resort |

No migration or schema change has been applied this week (warehouse ledger stays at version 2), so any API image can be rolled back without a database step.

## Step 0: switches that need no redeploy (try first, fastest, least risky)

Set in `/opt/omen/deploy/hostinger/.env.production` (file that holds the API env; confirm the key is read from it before relying on it), then `cd /opt/omen/deploy/hostinger && sudo docker compose -f docker-compose.prod.yml --project-name omen up -d --no-build api`:

- `YAHOO_PROJECTIONS_DISABLED=1`: Yahoo calls return to an honest "cannot rank".
- `INJURY_FRESHNESS_TIERS_DISABLED=1`: injury and projection refresh returns to the previous fixed intervals (tiered-written entries older than 1 h are ignored by the legacy read).
- `FOOTBALL_DATA_MODE=shadow` in `/opt/omen/deploy/hostinger/.env` (backup of the pre-warehouse-mode file: `.env.bak-pre-warehouse-mode-20261011T012001Z`): football reads go back to Supabase; same `up -d api`.

Expect a few seconds of 502 while the single API container restarts (one container, no overlap).

## Step 1: roll the API image back to a known commit (fast path, about 2 minutes)

Every deploy pushes an immutable tag `ghcr.io/justinduverge-design/omen:sha-<full commit sha>` (and the cron image `omen-cron:sha-<sha>`); compose runs `:main`. On KVM1:

```sh
cd /opt/omen/deploy/hostinger
SHA=<full sha of the target commit>
sudo docker pull ghcr.io/justinduverge-design/omen:sha-$SHA
sudo docker pull ghcr.io/justinduverge-design/omen-cron:sha-$SHA
sudo docker tag ghcr.io/justinduverge-design/omen:sha-$SHA ghcr.io/justinduverge-design/omen:main
sudo docker tag ghcr.io/justinduverge-design/omen-cron:sha-$SHA ghcr.io/justinduverge-design/omen-cron:main
sudo docker compose -f docker-compose.prod.yml --project-name omen up -d --no-build api cron
curl -s -o /dev/null -w "%{http_code}\n" https://slopssaloon.com/api/ready
```
(If the pull is refused, the GHCR login on KVM1 must be repeated by the founder; never paste a token into chat.)
The local `:main` tag is overwritten by the next deploy, so after a fast-path rollback **also revert the bad commit on `main`** (a revert commit auto-deploys the old behaviour, per the workflow note) before anything else merges.

## Step 2: confirm

`/api/health` and `/api/ready` 200 on root and `www`; one real Omen call on the phone; Kuma monitors #1-#3 Up; no new GlitchTip issue. Run the `slops-canary` check.

## Do not do

- Do not roll the warehouse ingest worker image back below the release that tolerates ledger version 3 once the projections schema is ever applied (not applied this week; see `Blueprints/handoffs/2026-10-11-warehouse-weekly-projections.md`).
- Do not touch the football-data pipeline timers Tuesday 05:15-07:45 ET.
- No deploys (merges that change code) from Monday evening through Tuesday unless it is a rollback or the founder asks.

## Watch list for Tuesday

Kuma: ingest #7 (07:15 ET daily), backup #8, restore proof #9 (weekly Sunday); Discord alerts (the Pi dispatcher now sorts stably and ignores a monitor with no heartbeat); first Yahoo call on a device should show source `sleeper_public_projections_yahoo_scoring...`.
