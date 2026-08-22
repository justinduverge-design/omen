# Handoff — S3 + S4 + O4: hot-route rate limits, credential containment, load rehearsal

**Date:** 2026-08-22
**Agent:** Claude
**Branch:** `feat/s3-s4-o4-hot-route-hardening`
**PR:** [#355](https://github.com/justinduverge-design/omen/pull/355) — **open, unmerged, deliberately left that way for founder review**
**Commits:** `0c1f85e` (S3), `0f546e8` (S4), `1d3f97d` (O4)
**Deployed:** no. Nothing is on `main`. No migration, no secret, no production config, no rollback.

---

## Skill receipt

```text
Task:            S3 (rate limits) → S4 (credential containment) → O4 (load rehearsal), pre-approved package
Change type:     backend security + ops verification
Skills invoked:  security-privacy-evidence (S3 + S4 — produced both real findings)
                 slops-tdd (in substance: three mutation checks run and restored, see below)
                 engineering:code-review (full diff)
Considered, N/A: rbac-risk-review — no authority boundary changed; a rate limiter is a
                 throughput control and a scrubber is an emission control
                 native mobile read gate — backend only, no native file touched
                 release-done — nothing deployed, PR left open
                 slops-ui-ux-audit — no UI surface changed
Unavailable:     slops-ship, slops-canary, slops-quality-baseline — L0/SLOPS-layer skills,
                 absent in a standalone Omen checkout. Recorded as unavailable rather than
                 skipped-by-choice; local substitutes run instead.
Evidence:        Direction/reviews/2026-08-22-o4-hot-route-load-rehearsal.md
                 test/hotRouteRateLimits.test.js, test/providerCredentialContainment.test.js
                 npm test 618/618 local and in CI; all three PR checks green
Procedure gap:   skill-activation-runbook.md still has no routing entry for an
                 evidence-only / record-integrity pass. Third recording (2026-08-19,
                 2026-08-21, today).
```

## Verification

| Gate | Result |
|---|---|
| `npm test` | **618/618** local, **618/618** in CI (job `96977274636`) |
| Baseline | 593/593 at `f4a6ae1` — see the correction below |
| `npm audit --audit-level=moderate` | 0 vulnerabilities |
| `git diff --check` | clean |
| `npm run evals:validate` | passed — 3 prompts, 2 cases |
| `node scripts/check-sprint-staleness.js` | no findings in the checks that ran |
| PR checks | Backend tests and audit ✅ · Frontend and client builds ✅ · Server boots with SPA present ✅ |
| `package.json` / `package-lock.json` | **byte-identical to `main`** — no dependency added |

**Baseline correction.** The package brief cited 591/591. `main` at `f4a6ae1` actually runs **593/593** — higher, not lower, so nothing had regressed. Recorded as the actual rather than silently mapped onto the expected number.

**Coverage block from the staleness checker, read rather than skimmed.** Three things it explicitly did *not* check: prose-vs-prose contradictions between two files citing no issue number; whether a `Done when:` clause was genuinely met (always a human call); and anything outside `Direction/` and `Blueprints/handoffs/` — which means **none of the `src/` or `scripts/` changes in this package were in its scope.** A clean result here is a statement about the direction files, not about the code.

---

## What shipped

### S3 — per-IP and per-credential limits on the three hot routes

`src/middleware/hotRouteLimits.js`, mounted by `applyHotRouteRateLimits(app)` in `src/server.js` ahead of the routers.

| Route | per IP / 60s | per credential / 60s |
|---|---|---|
| `POST /api/omen/mvp-move` | 20 | 10 |
| `POST /api/trade/compare` | 20 | 20 |
| `GET /api/dashboard/summary` | 60 | 30 |

Documented with per-number reasoning in `Blueprints/api-routes.md` § Rate Limits.

**The design decision that most deserves review.** These limiters run *before* authentication — they are mounted ahead of the routers, and `POST /api/omen/mvp-move` authenticates inside its own handler — so there is no verified user id when the decision is made. Keying on the JWT's unverified `sub` is the obvious shortcut and is an availability hole: anyone can mint a token carrying a victim's `sub`, spend the victim's budget, and lock them out. The user bucket is keyed on a SHA-256 digest of the presented token instead.

**The cost is in the contract, not buried.** This is *per-credential*, not *per-account*: two devices get two buckets, and a Supabase token refresh (~hourly) mints a fresh one, so an authenticated client can reset their own budget by refreshing. The per-IP limit bounds that, which is why both are enforced. If the founder wants true per-account limiting, it needs the limiter moved behind authentication on every one of the three routes — including restructuring `mvp-move`'s in-handler auth — and that is a bigger change than S3 asked for.

Storage is per-process `MemoryStore`. Omen runs one `omen_api` container, so that is the whole picture today; **if the API is ever replicated, the effective limit multiplies by the replica count** and these need a shared store. Written into the module header and the route reference.

### S4 — no provider credential reachable in logs or error envelopes

O8 (#353) proved this for GlitchTip payloads yesterday. This extends the bar to stdout and the HTTP error envelope, and **the extension found two live defects.**

1. **`authorization` was missing from the shared scrubber's sensitive-key pattern.** An axios failure carries `error.config.headers`, which is where an `Authorization` header sits. Anything logging or reporting that object whole published the header verbatim. Every other key on it was covered.
2. **Once added, `authorization: Bearer ya29.x` still leaked.** The key/value rule stops a value at the first space, so it redacted the word "Bearer" and published the token behind it. **The rule matched and reported success on the exact string it was failing to protect.** `Bearer`/`Basic` now have their own rule, applied first — deliberately not `OAuth`, whose challenge is scheme plus `key=value` params already covered, and blanket-redacting it would destroy the `oauth_problem` diagnostic that made the Yahoo 403 tractable.

Containment is now structural: `scrubLogFormat` in `src/middleware/logging.js` puts every winston line through the scrubber, and the terminal error handler moved to `src/middleware/errorEnvelope.js` so the message it echoes back is scrubbed and the shipped envelope is the one under test. Call sites still pass only what they need — this is the backstop for when one of them stops.

**Recorded boundary:** a credential logged as a *bare value with no key beside it* is invisible to the text scrubber. No code path does that, and facts-of-record #6 keeps ESPN cookie values out of every emission site by construction (`reportEspnFailure` takes hostname and path only, never headers, cookie jar, or body). Written into the test so the next reader knows what the backstop covers, rather than inheriting an assumption that it covers everything.

### O4 — the load rehearsal, local only

`scripts/load-omen-routes.js` existed and had never been run. Extended, not replaced, per `scripts/README.md`. New: `scripts/local-load-stack.js`.

| Run | p95 trade | p95 mvp-move | p95 dashboard | error rate | 429s |
|---|---|---|---|---|---|
| Beta — 20 concurrent × 8 (160/route) | 20 ms | 5 ms | 23 ms | 0 % | 0 |
| 10× — 200 concurrent × 8 (1600/route) | 107 ms | 20 ms | 101 ms | 0 % | 0 |

**The 0 rate-limited count is what makes the latency numbers mean anything** — it confirms no request in either run was answered by the limiter instead of by the route.

Full record, including how every parameter was chosen and the complete list of what a local run does *not* prove: `Direction/reviews/2026-08-22-o4-hot-route-load-rehearsal.md`.

---

## Method notes worth carrying forward

**Every claim here was made by driving the system, not by reading it.** Three mutation checks were run and restored to prove the tests actually catch their targets:

- Remove `applyHotRouteRateLimits` from `server.js` and stub the mounting function → **8 of 14 S3 tests red**. The 6 that stayed green are the ones testing the factory, key derivation, and config directly — correct, and worth knowing.
- Remove `scrubLogFormat` from both winston formats and drop `scrubText` from the client-facing message → **both S4 backstop tests red**.
- Revert the `authorization` key fix and the `Bearer` rule → **the whole-object log test red**.

**The adapter-level S4 tests stay green with or without the backstop, and that is stated rather than glossed.** The adapters genuinely do not log credentials today; the backstop tests are what prove the boundary. Conflating the two would have let a future regression pass.

**My own test produced a finding about itself, which is the failure worth remembering.** The first Yahoo `fetch` stub intercepted *every* call, so the suite's own loopback request to read its error envelope came back as the fake Yahoo body — and the test reported a credential leak in an envelope it had never actually reached. A stub broad enough to answer the wrong caller manufactures findings. It is scoped to the Yahoo host now, with the reason in a comment.

**On the package's ordering.** S3 → O4 was not arbitrary sequencing. "Load-test the hot routes" was an underspecified task until the limits existed: before them you characterise a system that no longer exists, and after them without accounting for them you time `express-rate-limit` and report the p95 of a 429. **A performance number is only meaningful against a stated admission-control policy**, and the concurrency has to be derived from that policy — 8 requests per client because `mvp-move` allows 10/min/credential, not because 8 is a round number.

**One finding fell out of building the run that measures the limiter rather than the route:** for a client using the whole app, the app-wide 100/min/IP limiter binds before `GET /api/dashboard/summary`'s own 60/min budget. Nobody would have gone looking for that. It is now in `Blueprints/api-routes.md` — the limiters stack, and a route's documented budget is a ceiling, not a promise of that much throughput.

---

## For the founder

**PR [#355](https://github.com/justinduverge-design/omen/pull/355) is open and all three checks are green. It has not been merged, per instruction.**

Two things to look at before merging, both design choices rather than defects:

1. **Per-credential vs per-account rate limiting** (S3, above). The safer choice was taken and its cost documented. If per-account is wanted, say so — it is a larger change.
2. **The rate-limit numbers themselves.** 20/10, 20/20, 60/30 are reasoned from what the product does, not measured against real user behaviour, because there is no real user behaviour yet. They are easy to raise; the reasoning for each is in `Blueprints/api-routes.md` so a change can be argued rather than guessed.

**Nothing here is deployed, and O4 never touched production.** Every load run was loopback against a locally-spawned server, and the load script now refuses a non-loopback target unless `OMEN_LOAD_ALLOW_REMOTE=1` is set deliberately.
