# O4 — load rehearsal for the three hot routes

**Date:** 2026-08-22
**Item:** `O4` — Load test the three hot routes
**Routes:** `POST /api/omen/mvp-move`, `POST /api/trade/compare`, `GET /api/dashboard/summary`
**Target:** local only. Loopback `127.0.0.1`. No production, no staging, no provider traffic.
**Code under test:** `0f546e8` (S3 rate limits + S4 credential containment both in place)
**Host:** macOS 26.5.1, Node v24.19.0
**Tooling:** `scripts/load-omen-routes.js` (extended for this run), driven by `scripts/local-load-stack.js`

`scripts/load-omen-routes.js` existed and had never been run. It was extended rather
than replaced, per `scripts/README.md`.

---

## The concurrency decision, and why it is not a round number

S3 landed rate limits on all three of these routes the day before this run. That changes
what a load test even means, and getting it wrong in either direction produces a number
that looks like evidence and is not:

- **Load-test first, limits later** and you have measured a system that no longer exists.
- **Load-test after, without accounting for the limits,** and past ~20 requests/minute you
  are measuring `express-rate-limit`. The p95 you report is the p95 of a 429.

So two parameters had to be chosen deliberately.

### Requests per client: 8

Bounded by the tightest per-credential budget. Per 60-second window, S3 allows 10
`mvp-move`, 20 `trade/compare`, 30 `dashboard/summary` per credential. **8 sits under all
three with headroom**, so a run at this size measures Omen rather than the limiter. It is
also a plausible session: open the app, look at the Omen, refresh a few times.

### Concurrency: 20 at beta, 200 at 10×

Both numbers come off the repo rather than out of the air:

- **20 = the top of the K2 beta cohort.** `Direction/current_sprint.md` → K2: "recruit
  10–20 beta testers from existing leagues." 20 concurrent clients models *the entire
  cohort opening the app in the same instant* — the Sunday-morning worst case for the
  population that will actually exist, not an average.
- **200 = the program's hard ceiling, and it lands exactly on 10×.**
  `Direction/omen-1.0-plan.md` → R6: TestFlight internal ≤100 testers and Play internal
  ≤100 testers, no review on either. 100 + 100 = 200 is the largest beta Omen can have
  without Beta App Review, so the 10× multiplier the item asks for coincides with a real
  boundary rather than an arbitrary scaling.

### Client identity: distinct per client, deliberately

A generator on one machine with one token is **one IP and one credential**, which is not
what production load looks like — N users arrive from N networks and each spends their own
budget. Collapsing the run into a single bucket would have measured the limiter and called
it latency.

Every simulated client therefore gets its own `X-Forwarded-For` (from `203.0.113.0/24`,
RFC 5737 documentation space, so these can never collide with a real address in a log) and
its own bearer token. The server honours both because it runs with `trust proxy` set. This
reproduces production's bucket distribution.

Then, separately, the opposite run — see Saturation below — collapses everything onto one
identity on purpose, so the limiter is proven to bind under real traffic rather than only
in unit tests.

---

## What the local stack is

`scripts/local-load-stack.js` boots the **real** `src/server.js` (`NODE_ENV=production`)
against a loopback Supabase stub, waits for `/api/health`, runs the load, and tears
everything down.

The stub answers exactly three paths — `/auth/v1/user`, `/rest/v1/platform_connections`,
`/rest/v1/profiles` — and returns **404 loudly** on anything else, so a future route change
surfaces as a failure rather than as a suspiciously fast measurement. Every run below
reports `unstubbed_paths: []`, and the stub-call counts match the request counts exactly,
which is how we know the auth and database round-trips really happened.

Without the stub, `GET /api/dashboard/summary` returns 401 before doing any work — and
worse, `requireAuth` would reach for the configured Supabase host on every request, so the
numbers would be DNS and TLS timings against a third party.

**`POST /api/omen/mvp-move` runs in explicit mock mode** (`use_mock_data: true`), labelled
as such in every report (facts-of-record #7). Without a real bearer token the live path
returns 401 immediately, which measures the auth guard rather than the route.

---

## Results

Every figure below is milliseconds of client-observed latency. `err%` counts transport
failures and 5xx only; a 429 is the limiter working and is counted separately.

### Run 1 — beta: 20 concurrent, 8 requests each (160 per route)

| Route | Mode | p50 | p95 | p99 | max | err % | 429 | statuses |
|---|---|---|---|---|---|---|---|---|
| `POST /api/trade/compare` | live-public | 3 | **20** | 21 | 21 | 0 | 0 | 160 × 200 |
| `POST /api/omen/mvp-move` | mock | 2 | **5** | 5 | 5 | 0 | 0 | 160 × 200 |
| `GET /api/dashboard/summary` | stub-auth | 8 | **23** | 24 | 24 | 0 | 0 | 160 × 200 |

### Run 2 — 10×: 200 concurrent, 8 requests each (1600 per route)

| Route | Mode | p50 | p95 | p99 | max | err % | 429 | statuses |
|---|---|---|---|---|---|---|---|---|
| `POST /api/trade/compare` | live-public | 8 | **107** | 126 | 133 | 0 | 0 | 1600 × 200 |
| `POST /api/omen/mvp-move` | mock | 13 | **20** | 22 | 23 | 0 | 0 | 1600 × 200 |
| `GET /api/dashboard/summary` | stub-auth | 43 | **101** | 113 | 114 | 0 | 0 | 1600 × 200 |

Both runs are **0 % error rate and 0 rate-limited** — the second number is the one that
says the measurement is valid, because it confirms no request in either run was answered by
the limiter instead of by the route.

Against `threshold_notes` in the script: local smoke p95 ≤ 1000 ms and investor-demo p95
≤ 750 ms. The worst p95 across both runs is **107 ms**, roughly 7× inside the tighter bar.

Latency scales sub-linearly with a 10× concurrency increase (dashboard p95 23 → 101 ms for
10× the clients), which is the expected shape for a single Node process saturating on
event-loop turns rather than on anything pathological.

### Runs 3 and 4 — saturation: does the limiter actually bind?

One IP, one credential, on purpose.

| Run | Route | 200s | 429s | Which limiter |
|---|---|---|---|---|
| 3 | `POST /api/trade/compare` | 20 | 10 | per-IP (20/min) |
| 3 | `POST /api/omen/mvp-move` | 10 | 20 | per-credential (10/min) first, then per-IP |
| 3 | `GET /api/dashboard/summary` | 30 | 0 | **neither — see below** |
| 4 | `GET /api/dashboard/summary` alone, 65 requests | 30 | 35 | per-credential (30/min), then per-IP (60/min) |

Each 429 carried the documented envelope, with `scope` correctly naming which limit was
hit — `"scope":"ip"` for trade, `"scope":"user"` for mvp-move and dashboard. Error rate
stayed 0 % throughout: nothing 5xx'd under refusal.

**The finding in run 3.** Driving all three routes from one identity does not reach
`dashboard/summary`'s own budget, because the app-wide 100/min/IP limiter in
`src/middleware/security.js` is shared across every `/api/*` call and binds first. Run 3
was deliberately sized to 90 total requests to stay under that cap; run 4 then drove
dashboard alone to 65 requests, where its own hot-route limits are the only thing in range,
and both fired exactly as documented.

That is worth stating plainly rather than filing as trivia: **for a client that is using
the whole app rather than hammering one endpoint, the general limiter is the binding
constraint on `dashboard/summary`, not S3's.** S3's dashboard budget is a per-endpoint
backstop, and the numbers in `Blueprints/api-routes.md` should be read as stacking.

---

## What this does and does not prove

**Proven:** Omen's own request path holds up well past any beta-scale load it can receive —
routing, middleware, both rate limiters, validation, response assembly, Supabase auth
verification, and two database round-trips, at 0 % error rate and p95 ≤ 107 ms at the
program's hard ceiling of concurrent users. The S3 limiters bind at exactly their
documented numbers under real concurrent traffic, refuse with the documented envelope, and
never 5xx.

**Not proven, and not claimable from this run:**

- **No provider fan-out.** No Yahoo, Sleeper, or ESPN request was generated — a load test
  must not manufacture traffic against a third party. For a *connected* user, provider
  latency will dominate everything measured here.
- **No real LLM call.** `LLM_BASE_URL` was empty and `llm_reasoning` was off.
- **`mvp-move` ran in mock mode**, so the live engine's cost is unmeasured.
- **The stub user has no platform connections**, which keeps `buildPlatformSummaryForUser`
  on its cheapest path.
- **Loopback, one host, one process.** No network, no TLS, no Nginx hop, no container
  limits, no cold start.

`O4`'s own Scope says it: **Week 1 Sunday morning is the real load test — this is the
rehearsal, not the proof.** The right reading of these numbers is that nothing in Omen's
own code is a bottleneck at beta scale, so if Sunday morning goes badly, the cause is
upstream of this measurement.

## Reproducing

```bash
OMEN_LOAD_CONCURRENCY=20 OMEN_LOAD_ITERATIONS=8 node scripts/local-load-stack.js
```

```bash
OMEN_LOAD_CONCURRENCY=200 OMEN_LOAD_ITERATIONS=8 node scripts/local-load-stack.js
```

```bash
OMEN_LOAD_SATURATE=1 OMEN_LOAD_ROUTES=dashboard_summary OMEN_LOAD_CONCURRENCY=5 OMEN_LOAD_ITERATIONS=13 node scripts/local-load-stack.js
```

The load script refuses any non-loopback target unless `OMEN_LOAD_ALLOW_REMOTE=1` is set
deliberately.
