# Handoff — 2026-08-17 — O1b: GlitchTip (Sentry-class) error tracking

**Deployed to Command Center** (`/opt/command-center/glitchtip/compose.yml`, Tailscale-only at `100.98.81.0:8000`). **Not a repo change** — nothing in `src/`, `frontend/`, or `mobile/` was touched; the artifact lives entirely on the Pi's own filesystem, outside this git tree. `Direction/current_sprint.md`, `Direction/sprints_completed.md`, and `Direction/decision_log.md` carry the closure record.

## What O1b needed

Per the sprint item: Uptime Kuma (O1) answers "is the endpoint up?" and Beszel answers "is the host healthy?" — neither can answer "a user just got a 500 on `POST /api/omen/mvp-move` because ESPN returned malformed JSON, here is the stack trace." That's the gap this closes.

## Hosting decision: Command Center, not KVM2 or self-hosted Sentry

O1b's own text estimated GlitchTip at "roughly 1–2 GB" and named KVM2 as the fallback if Command Center couldn't take it. Checked the primary source (`glitchtip.com/documentation/install`) before committing, per the item's own instruction to "verify arm64 image availability and current resource profile before committing":

- arm64 officially supported
- 256–512 MB RAM is the stated comfortable baseline (not 1–2 GB)
- Postgres 14+ required, Valkey/Redis optional

That's well inside Command Center's measured 3.2 GB available — no need to reach for KVM2's larger headroom. Self-hosted Sentry was not re-evaluated; its ~16 GB footprint was already disqualifying in the sprint doc.

**Stack:** `postgres:18` + `valkey/valkey:9` + `glitchtip/glitchtip:6` (`SERVER_ROLE: all_in_one`, combining web+worker). Bound to `100.98.81.0:8000` only, matching the existing Kuma/Beszel convention on that host — never `0.0.0.0`. Real Postgres password (not the upstream sample's `trust` auth). `ALLOWED_HOSTS` pinned to the Tailscale IP rather than left on Django's wildcard default. `mem_limit` caps: web 768m, postgres 768m, valkey 256m.

**Email:** Resend SMTP, the same provider Supabase auth already uses for `slopssaloon.com` — reused the verified sending domain, but generated a **separate, scoped API key** for GlitchTip rather than reusing Supabase's, so the two systems stay isolated.

## Two real defects found during deploy, not assumed away

### 1. `smtp://…:465` doesn't imply implicit TLS

Registration hung indefinitely ("taking absolutely forever"). Root cause: GlitchTip's `EMAIL_URL` scheme parsing does not infer implicit SSL from port 465 — it opened a plaintext SMTP connection into a port that expects TLS from the first byte, and hung until socket timeout. The account itself was actually created successfully before the email step hung (confirmed via `manage.py shell` — `justin.duverge@yahoo.com`, `is_active: True`), so no data was lost, just a stuck request.

Confirmed root cause with a direct `smtplib` reproduction inside the container:

| Mode | Result |
|---|---|
| Plaintext SMTP on 465 (what a naive `smtp://` parser does) | `SMTPServerDisconnected: Connection unexpectedly closed: timed out` — reproduces the hang exactly |
| Implicit SSL (`SMTP_SSL`) on 465 | Works |
| Plain SMTP + `STARTTLS` on 587 | Works, including a full `login()` with the real API key |

Fixed by moving `EMAIL_URL` to port 587. **General lesson: a bare `smtp://host:port` pairing is not self-describing about TLS mode — verify the actual protocol handshake, not just TCP reachability, before calling an email integration done.**

### 2. `mem_limit` was silently discarded, and a reboot alone didn't fix it

Command Center's stock Raspberry Pi OS kernel had no cgroup memory accounting enabled, so Docker dropped the configured 768m/256m/768m caps without failing the deploy — only a warning at explicit `docker compose up` time (`Your kernel does not support memory limit capabilities`), easy to miss since the daemon's own restart-on-boot path doesn't reprint it.

**`docker stats`' `MEM USAGE / LIMIT` column is not reliable evidence here** — with no real limit set, it falls back to displaying total host memory as the ceiling (looked like "3.707GiB limit," which is just the host's RAM, not a real per-container cap). The authoritative check is `docker inspect --format '{{.HostConfig.Memory}}'` (0 = no limit) cross-checked against the live cgroup file (`/sys/fs/cgroup/.../memory.max`, literally `max` when unset).

Fixed with the standard Raspberry Pi fix: `cgroup_enable=memory cgroup_memory=1` appended to the single line in `/boot/firmware/cmdline.txt` (backup taken first — `cmdline.txt.bak-20260817` — this file must stay exactly one line), then a reboot.

**The reboot alone was not sufficient.** Docker's daemon restarts existing containers using their already-baked `HostConfig`, fixed at whatever time they were last *created* — before the kernel fix existed. A plain restart does not re-resolve the compose file's resource constraints against a newly-available kernel capability. `docker compose up -d --force-recreate` was required. Re-verified afterward: `HostConfig.Memory` reads exactly `805306368` / `268435456` bytes (768m / 256m), and the live cgroup file matches.

All seven containers on the host — Pi-hole, Beszel, Beszel-agent, Uptime Kuma, and GlitchTip's three — came back cleanly on their own via `restart: unless-stopped`, reachable again within ~20 seconds of the reboot.

## Done-when evidence

O1b: *"a deliberate backend error appears in the chosen tool within 60 seconds, with a usable stack trace; host and resource cost are recorded; no PII, provider credential, or ESPN cookie appears in any captured payload."*

- **Deliberate error, <60s, usable stack trace:** a synthetic `ESPNMalformedResponseError` deliberately mirroring O1b's own canonical example was POSTed to `/api/1/store/` from an external host (this Mac, not the Pi itself, to prove the real network path — not localhost). The ingest endpoint's `200` only proves acceptance, not processing, so verification queried `issue_events_issueevent` in Postgres directly: stored, grouped into an issue, full two-frame stack trace intact (`src/adapters/espn.js:142`, `src/routes/omen.js:61`), **in under 1 second**.
- **Host and resource cost:** ~300 MB RAM (519Mi → 812Mi host `used`, measured before/after the full stack came up), ~2.9 GB disk (2.88 GB images + 87 MB volumes). Both comfortably inside headroom.
- **No PII/credential/cookie:** the verification event was 100% synthetic, explicitly labeled as a test in its own `extra` field. No real user, provider token, or ESPN cookie was ever sent.

## Downstream: O6 is now half-unblocked

`O6` (native crash reporting) listed `TASK-O1b` as a blocker for both platforms — resolved now that a working error-tracking backend exists. Its `Status` stays `BLOCKED` overall because `Done when:` requires both iOS and Android, and iOS symbolication still needs `TASK-R3-BUILD-iOS` to reach a signed build. **Android crash-reporting integration is now agent-buildable on its own.**

## What is NOT proven

- **No native SDK integration.** GlitchTip is live and proven to accept/process events, but nothing in `src/` (backend), `mobile/ios/`, or `mobile/android/` has been wired to actually send to it yet. The backend Node/Express SDK wiring (so real production errors — like the ESPN-malformed-JSON case this test mirrored — actually reach GlitchTip) is separate, unstarted work.
- **Alert routing untested.** `snape@slopssaloon.com` is configured as `DEFAULT_FROM_EMAIL` and SMTP auth was proven to work in isolation, but no actual GlitchTip alert (e.g. "new issue" notification) has been triggered and confirmed delivered end-to-end.
- **Single account only.** One user exists (`justin.duverge@yahoo.com`). No team/org structure beyond the one project (`omen-backend`) has been exercised.
- **`ENABLE_ADMIN` and Django admin panel** are on but unused/unverified this session.
- **No backup/restore path** for the `pg-data` volume has been established or tested — an SD card failure on Command Center would lose all GlitchTip history with no separate copy.
