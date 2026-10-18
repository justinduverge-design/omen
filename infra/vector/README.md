# Vector log shipping (Phase 4, shadow)

KVM1 and KVM2 run a Vector **agent** that ships journald and Docker container logs over the tailnet to a Vector
**receiver** on Command Center, which writes daily JSON files. **Shadow:** nothing reads the files yet, and the hosts
keep their own journald and Docker logs unchanged. Rollback: `docker compose down` on a host.

| File | Where | What |
|---|---|---|
| `receiver.yaml`, `docker-compose.receiver.yml` | Command Center `/opt/omen-vector` | listens on `100.98.81.0:6000` (tailnet only, host network, nothing published); writes `logs/YYYY-MM-DD/<host>/<stream>.log` |
| `omen-vector-prune.{sh,service,timer}` | Command Center | deletes daily directories older than 14 days |
| `agent.yaml`, `docker-compose.agent.yml` | KVM1, KVM2 `/opt/omen-vector` | reads `/var/log/journal` and `/var/lib/docker/containers/*/*-json.log` **read-only**, with no Docker socket |

Image: `timberio/vector:0.59.0-debian`, pinned by digest (multi-arch: amd64 for the KVMs, arm64 for the Pi).

**Scrubbing happens on the sending host**, before anything leaves it. Redacted: `Authorization`/`Cookie`/API-key headers,
Bearer tokens, JWTs, `espn_s2`/`SWID`/`*token`/`password`/`secret`/`service_role` values, Supabase `sb_secret_` keys,
credentials in any URL scheme (Postgres, Redis, ...), OAuth `code`/`state` query values, Discord webhook URLs, JSON-style
header dumps, `sk-ant-`/`sk_live_`/`ghp_`/`xox*` keys, Basic auth, PEM private-key headers, email addresses and SWID GUIDs.
Client IPs keep only their network (`203.0.113.x`). User and league ids stay, because they are pseudonymous,
operator-only and the debugging handle. Lines are capped at 8 KiB, and the agent never ships its own log lines.

**Receiver allowlist:** only `omen-prod` and `model-host`, and only `journal`/`container-<12 hex>` streams, are
accepted, with a throttle of 2,000 events/s per host. Anything else on the tailnet is dropped, so it can't create
directories, escape the pruned date folders, or fill the Pi.

**Never blocks a host:** a 256 MiB disk buffer (Vector's minimum), then the newest events are dropped. Each agent is
capped at 0.5 CPU and 192 MiB with low IO weight (KVM1 has 2 vCPU). The receiver is capped at 1 CPU and 256 MiB. `since_now`/`read_from: end`: no history is backfilled.

## Tested (2026-10-18, locally)

Both configs pass `vector validate`. Two end-to-end runs (agent to receiver, fake container logs with planted secrets)
redacted every secret: Bearer, cookies, `espn_s2`/SWID, email, Supabase key, JWT, URL passwords, OAuth code/state,
Discord webhook, Postgres URL, JSON cookie/API-key headers. The IP came out as `203.0.113.x`, and normal lines arrived
intact. An impostor agent with host `../../etc` was dropped by the receiver, and the agent's own retry line was dropped.
On KVM1 (systemd 255) and KVM2 (systemd 249), the image's `journalctl` (systemd 257) reads the host journal, checked
with a throwaway read-only container; nothing was installed.

## Install (each host needs founder approval)

1. **Command Center:** copy `receiver.yaml`, `docker-compose.receiver.yml` and the prune files to `/opt/omen-vector`,
   then `sudo docker compose -f docker-compose.receiver.yml up -d`, then install and enable `omen-vector-prune.timer`.
   Check: `ss -ltn | grep 100.98.81.0:6000`.
2. **KVM1, then KVM2:** copy `agent.yaml` and `docker-compose.agent.yml` to `/opt/omen-vector`, then
   `sudo VECTOR_HOST=<omen-prod|model-host> docker compose -f docker-compose.agent.yml up -d`. Check that files appear
   under the receiver's `logs/<date>/<host>/`, then spot-check them for anything unredacted.
