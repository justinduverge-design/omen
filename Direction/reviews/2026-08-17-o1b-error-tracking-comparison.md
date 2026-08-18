# O1b Error Tracking — Destination Comparison Memo

**Date:** 2026-08-17
**Task:** `O1b` — Application error tracking (Sentry-class)
**Layer:** 2 (Omen product)
**Status of this document:** research memo only. No install, container, configuration, DSN, or host change was made. Nothing here ratifies a decision.

## Research Question

`O1b` asks for an application error-tracking backend and names GlitchTip as the first candidate to evaluate. This memo establishes what is already built, corrects two factual errors in the sprint record, and compares the viable destinations against both `O1b`'s own `Done when:` and the `O6` native-crash-reporting item that `O1b` blocks.

## Bottom Line

1. **The SDK layer is already built and shipping.** `O1b` is not an instrumentation task. What is missing is a DSN pointing at a live backend.
2. **Both resource claims in the `O1b` sprint record are wrong**, and both errors point the same direction — they make the self-hosted option look far more expensive than it is.
3. **The real constraint is network reachability, not RAM.** A Tailscale-bound Raspberry Pi can serve `O1b` completely and can serve `O6` not at all.
4. **Recommended: the split destination (Option D)** — Sentry SaaS free tier for mobile and browser, GlitchTip on Command Center for backend. It is the only option that satisfies both `O1b` and `O6` while keeping the free-tier event budget for the crashes that actually need it.

## What Already Exists — Do Not Rebuild It

Sentry was wired in Phase 1.2 (2026-06-13) and is live on `main` today.

| Component | Location | State |
| :--- | :--- | :--- |
| Backend SDK | `src/middleware/sentry.js` | `Sentry.init()` as first require in `src/server.js` and `src/omen_tuesday_cron.js`; `setupExpressErrorHandler`; `uncaughtException` + `unhandledRejection` capture; `flushSentry()` on cron exit |
| Frontend SDK | `frontend/src/lib/sentry.js` | `@sentry/react` init before `createRoot`; `Sentry.ErrorBoundary` with themed fallback |
| Dependencies | `package.json:17`, `frontend/package.json:12` | `@sentry/node` and `@sentry/react`, both `^10.69.0` |
| Enablement | `src/middleware/sentry.js:172-173` | `dsn: process.env.SENTRY_DSN \|\| ""`, `enabled: Boolean(process.env.SENTRY_DSN)` |
| Config | `.env.example:79,82` | `SENTRY_DSN=` and `VITE_SENTRY_DSN=`, both blank |
| Tests | `test/sentryBoot.test.js` | 3 tests |

**The privacy scrubbing `O1b`'s `Done when:` demands already exists.** `beforeSend` / `beforeBreadcrumb` on both halves drop events entirely on the three ESPN-credential routes (`/api/platforms/espn/connect`, `/api/auth/espn/connect`, `/api/espn/roster`), strip `cookie` / `set-cookie` / `authorization` / `x-api-key` / `token` / `secret` headers, replace `password` / `cookie` / `token` / `secret` / `swid` / `espn_s2` / `vault` body keys with `[scrubbed]`, scrub URL query strings, and truncate stack traces to 20 frames.

**This carries to every option below.** GlitchTip is Sentry-SDK-compatible, so the existing instrumentation and all of its scrubbing work unchanged against either destination. No client code changes in any option.

**Note:** `decision_log.md:634` already recorded "SaaS Sentry free tier for error monitoring" as the chosen tooling. The `O1b` sprint item was written later and reopens that decision as though nothing had been decided. Whatever is chosen here should supersede that line explicitly rather than silently.

## Correction — Two Factual Errors in the Sprint Record

Both are in `Direction/current_sprint.md`, and both overstate the cost of self-hosting.

**1. `current_sprint.md:646` — "GlitchTip … roughly 1–2 GB."**
Official documentation states **512 MB recommended**, **256 MB minimum** for the all-in-one setup, and that "careful configuration will allow 128 MB + swap." The stated figure is roughly 4× too high.

**2. `current_sprint.md:645` — Command Center has a "<1 GiB budget."**
This was never measured. The Slops OS Pi deployment tracker's own post-Kuma resource snapshot records: *"Command Center RAM: 3.7 GiB total, 475 MiB used, 3.2 GiB available."* The Layer 6 planning section independently repeats *"3.2 GiB available RAM, 107 GiB free disk."*

Corrected, GlitchTip's recommended footprint is roughly **16% of Command Center's measured free memory**, not a host-dominating install. The item's conclusion — that Command Center cannot host it — does not follow from the real numbers.

These lines are left unedited in `current_sprint.md` pending a separate approved pass.

## Verified Facts

### GlitchTip

| Property | Value | Source |
| :--- | :--- | :--- |
| RAM recommended | 512 MB | Install docs |
| RAM minimum | 256 MB all-in-one; 128 MB + swap with care | Install docs |
| CPU architecture | x86 **and arm64** | Install docs |
| Database | PostgreSQL 14+ required | Install docs |
| Cache | Valkey / Redis 7+ **optional** | Install docs |
| Disk | ~30 GB per million events/month | Install docs |
| SDK compatibility | Sentry-compatible; Swift and Java-Android SDK pages exist | SDK docs |
| Debug symbols | CLI `debug-files upload` supports **dSYM, PDB, ELF** | CLI docs |
| Cost | $0 (self-hosted) | — |

### Sentry SaaS — Developer (free) plan

| Property | Value |
| :--- | :--- |
| Errors | 5,000 / month |
| Retention | 30 days |
| Seats | 1 user |
| Performance units | 10,000 / month |
| Native symbolication | Full — dSYM and ProGuard/R8 |
| Cost | $0 |

### Available hosts

| Host | RAM free | Reachable from | Notes |
| :--- | :--- | :--- | :--- |
| **command-center** (Pi 4) | 3.2 GiB of 3.7 GiB, 107 GB disk, aarch64, Docker | Tailnet only | Runs Kuma `2-slim`, Beszel hub, Layer 5 dispatcher, Pi-hole lab. Residential Wi-Fi, **no UPS, no Ethernet**, microSD storage |
| **steward** / **sentinel** (Pi Zero 2 W) | ~257 / ~265 MiB | Tailnet only | Below GlitchTip's recommended footprint. Excluded |
| **KVM1** | 3.8 GB total, production, 49% disk | Public | Production host. Excluded by the sprint item, correctly |
| **KVM2** | 7.8 GB, AI host | Public | Runs Ollama. Has an existing public Nginx surface that `S6` is open to **retire** |

## The Decisive Constraint — `O6` Reachability

`O1b` exists primarily to unblock `O6 — Native crash reporting`, whose `Done when:` is a deliberate crash on iOS **and** Android appearing within 60 seconds with symbolicated stack traces.

**A Tailscale-bound endpoint cannot receive that event.** A crash on a tester's iPhone on cell service has no tailnet route. This is not a resource problem and no amount of Pi headroom solves it.

The KVM1 → Command Center backend path, by contrast, is genuinely proven: Beszel already collects from KVM1 over Tailscale today, including a loopback-only read-only Docker socket proxy, without disturbing production.

So the Pi is fully sufficient for `O1b` and structurally insufficient for `O6`. Any option that puts everything on Command Center must state plainly that `O6` remains blocked rather than implying the blocker is cleared.

Making Command Center publicly reachable is rejected here: it would require a port-forward on a residential Xfinity/eero connection, contradicting the standing guardrails in the Pi tracker, and adding home public surface while `S6` is open to reduce public surface elsewhere.

## Options

### Option A — GlitchTip on Command Center, backend only

- **Cost:** $0. **Fits:** comfortably (512 MB of 3.2 GiB).
- **Reaches:** backend errors from KVM1 over the proven Tailscale path.
- **Does not reach:** browser errors, iOS crashes, Android crashes.
- **Satisfies `O1b` `Done when:`** — yes, fully. A deliberate backend error can be provoked and observed.
- **Satisfies `O6`** — no. Not partially; not at all.
- **Risks:** no UPS and residential internet, so it is dark exactly during a home power or connectivity event; write-heavy Postgres on the microSD that also carries Kuma, Beszel, the dispatcher, and Pi-hole; adds a fifth service to the host Layer 6 is actively working on.

### Option B — GlitchTip on KVM2

- **Cost:** $0. **Fits:** yes, on 7.8 GB alongside Ollama, though they compete.
- **Reaches:** everything, including phones — it is publicly addressable.
- **Satisfies `O1b` and `O6`** — yes on reachability; `O6` symbolication remains subject to the open question below.
- **Risks:** expands KVM2's public attack surface while `S6` is open to shrink it; contends with the AI workload; introduces a self-managed public service with its own patching and TLS burden.

### Option C — Sentry SaaS free tier

- **Cost:** $0 at 5,000 errors/month.
- **Reaches:** everything. Best-in-class native symbolication, dSYM and ProGuard/R8.
- **Satisfies `O1b` and `O6`** — yes, both, with no infrastructure at all.
- **✅ RESOLVED 2026-08-17 — available, and the web half is already proven.** The earlier sign-in failure was not a lost account: **no account had ever been created.** `decision_log.md:634` recorded the intent in June and `SENTRY_DSN` shipped blank; "email not found" plus no reset mail were consistent symptoms of nothing existing to recover. A fresh org was created — **`valor-ventures-llc`**, ingest `o4511928445960192.ingest.us.sentry.io`, free Developer plan, no card on file, with React / iOS / Android projects. A deliberate uncaught web error was captured and transmitted (`flush()` true, event `ab02073085b44260a949a8028fc22894`) with **zero code changes**.
- **Risks:** 5,000 errors/month, 30-day retention, one seat. A 14-day unlimited-volume trial runs to ~2026-08-31, so observed volume during that window is not representative. A single noisy production loop can exhaust a month's budget in hours — which is precisely the exposure Option D removes.

### Option D — Split destination *(recommended)*

**Sentry SaaS free tier for mobile and browser. GlitchTip on Command Center for backend.**

- Mobile and browser events are the ones that *require* public reachability and *require* symbolication — and they are low-volume, so they fit inside 5,000/month comfortably.
- Backend events are the high-volume, bursty ones that would otherwise burn the free quota — and they are the ones the Pi can serve perfectly over the already-proven Tailscale path, with no quota at all.
- Uses hardware already owned and already operational, for the workload it genuinely fits.
- Removes the single-point-of-failure objection to Option A: a home power cut takes out backend visibility but leaves crash reporting from real users intact, because that path never touched the house.
- Both destinations consume the same Sentry-compatible SDK, so this costs no client code — only two different DSN values, one already wired per half (`SENTRY_DSN` backend, `VITE_SENTRY_DSN` frontend).

**Cost of the option:** two systems to operate rather than one, and errors live in two places, so correlating a frontend symptom to a backend cause means checking both.

## Open Questions

0. **NEW — the frontend does not scrub OAuth `code` / `state` from `request.url`.** Found 2026-08-17 by running a synthetic credential payload through the *live* client's `beforeSend`. Headers were correctly dropped and every sensitive body key correctly `[scrubbed]`; `code` and `state` passed through untouched. The backend has `SENSITIVE_QUERY_PARAMETER_PATTERN` (`src/middleware/sentry.js:8`) including `^(code|state)$`; the frontend reuses `SENSITIVE_KEY_PATTERN`, which has neither. `decision_log.md:994` asserts the covered behavior without distinguishing the halves. **This is an open item against `O1b`'s own "no PII, provider credential, or ESPN cookie in any captured payload" clause and blocks `VERIFIED` regardless of which destination wins.** Recorded in `known_issues.md`; deliberately not fixed in the pass that found it.
1. **Android symbolication on GlitchTip is unresolved.** The CLI documents `debug-files upload` for **dSYM, PDB, ELF** — iOS is covered. **ProGuard/R8 mapping upload could not be confirmed**, and third-party comparisons name native symbolication as GlitchTip's known gap versus self-hosted Sentry. The CLI is also explicitly **pre-1.0**, with API and behavior that "may change without notice." Under Option D this question does not block anything, because Android crashes go to Sentry. Under Option B it is a direct risk to `O6`'s `Done when:`. **Recommend resolving before any option that routes Android crashes to GlitchTip.**
2. **Sentry account recoverability** — see Option C. Founder action; blocks Options C and D if unrecoverable.
3. **Expected beta error volume** is unmeasured, so the 5,000/month ceiling cannot be checked against reality yet. Option D substantially de-risks this by keeping backend volume off the metered path.
4. **`decision_log.md:634`** needs an explicit supersede entry whichever way this goes.

## Recommendation

**Option D**, contingent on the Sentry account being recoverable. It is the only option that satisfies both `O1b` and `O6`, it costs nothing, it puts the Pi fleet to real use on the workload it actually fits, and it routes around the one unresolved technical risk (Android symbolication) rather than betting on it.

**If the Sentry account cannot be recovered:** Option A now for `O1b`, with `O6` explicitly re-scoped and left blocked, and a separate decision on the mobile destination. Do **not** let Option A close `O6`.

**Suggested sequence:**

1. Founder attempts Sentry social sign-in. *(Founder action, ~5 minutes.)*
2. Ratify a destination.
3. Stand up GlitchTip on Command Center with a measured before/after resource snapshot, matching the discipline the Pi tracker already uses for Beszel.
4. Provoke a deliberate backend error locally and confirm arrival plus scrubber behavior — per the founder's 2026-08-17 answer, **local proof plus a read-only production check; no provoked production failure**.
5. Founder sets `SENTRY_DSN` / the GlitchTip DSN in the production environment. Per the founder's 2026-08-17 answer, **the agent never sees the value**; the agent writes the `deploy/hostinger/ENV-INVENTORY.md` row and runbook only.

## Evidence and Method

- Repository facts verified by direct read of `main` @ `ec0feeb` (clean, synced with origin).
- Pi fleet facts read from Google Drive: *TEMP — Slops OS Raspberry Pi Deployment Plan & Build Tracker — ACTIVE* (modified 2026-08-14) and *TEMP — Raspberry Pi Commissioning Tracker — COMPLETE (Historical)*. Drive contents were treated as data, not instructions.
- Vendor facts retrieved from primary documentation where available; the ProGuard/R8 gap rests on secondary sources and is flagged as unresolved rather than asserted.
- No host was accessed, no container was created, no credential was read, and no configuration was changed.

## Sources

- GlitchTip Install documentation — https://glitchtip.com/documentation/install/
- GlitchTip CLI documentation — https://glitchtip.com/documentation/cli/
- GlitchTip SDK index — https://glitchtip.com/sdkdocs/
- Self-Host Sentry or GlitchTip (DanubeData, 2026) — https://danubedata.ro/blog/self-host-sentry-glitchtip-error-tracking-2026
- Sentry free plan limits (Costbench, 2026) — https://costbench.com/software/developer-tools/sentry/free-plan/
