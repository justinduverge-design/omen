# Handoff — 2026-08-21 — O8: wire GlitchTip into Omen's actual error paths

**Status: `O8` is `VERIFIED`.** All three `Done when:` clauses are met, including live delivery into GlitchTip — a real provoked ESPN failure is sitting in the `omen-backend` project as issue 2 with a full stack trace and zero credential leaks.

**But production is still not sending, for a reason nobody suspected.** The pass found that KVM1's `SENTRY_DSN` is the literal placeholder `paste_the_value_here` with a real DSN glued onto the end, in both containers — so `@sentry/node` built no transport and **dropped every event in silence** while reporting itself enabled. Omen has been reporting errors nowhere at all. Tracked as [#354](https://github.com/justinduverge-design/omen/issues/354), P0, founder-gated. Read "The DSN question, answered" below.

## The premise the task was written on was false

`O8`'s Scope said *"nothing in `src/` sends anything to GlitchTip yet"*, and instructed: prefer a hand-rolled HTTP integration over `@sentry/node`, because `package.json` is on the standing do-not-touch list.

**`@sentry/node` was already a dependency and already wired**, since Phase 1.2 (`cc14e79`):

| Already present | Where |
|---|---|
| `initSentry()` before every other import | `src/server.js:24` |
| Express error handler | `src/server.js:346` |
| Process-level handlers (cron only) | `src/omen_tuesday_cron.js:389` |
| A real `beforeSend` scrubber | `src/middleware/sentry.js` |

So the dependency gate the Scope was routing around **did not apply**, and following the instruction literally would have added a second, weaker reporting path beside a working one.

The accurate statement of the gap is narrower and more useful: **the SDK was wired to the framework, but not to the failure paths that matter.** No provider adapter reported anything, and the API process — the one serving every user — had no `uncaughtException`/`unhandledRejection` handlers even though the cron had had them for months.

**Generalisable:** the Scope line was written from the `O1b` handoff's own "What is NOT proven" section, without grepping `src/`. This file's own standing rule is *"`main` is the proof"* — that applies to **absence** claims too, not only presence claims. An absence claim is the easier one to get wrong, because nothing contradicts it until someone looks.

## What was built

**`src/middleware/providerErrors.js`** — `captureProviderError()`, wired at each provider's single lowest-level HTTP chokepoint:

| Provider | Chokepoint | Reported |
|---|---|---|
| Yahoo | `YahooClient.get()` — `src/services/yahoo.js` | every non-OK **except** `401 yahoo_token_expired` |
| Sleeper | `getJson()` — `src/adapters/sleeper.js` | all failures, before the 429→503 reshape so the tag carries the real upstream status |
| ESPN | `doEspnRequest()` — `src/adapters/espn.js` | all five failure branches |

Yahoo's 401 is deliberately excluded: it is the ordinary refresh path and the single highest-volume Yahoo error there is. Reporting it would bury the 403 under noise.

**Context is an allowlist, not a denylist.** A denylist over provider context is how a token reaches an error report the first time somebody adds a field. There is a test that passes credentials the caller should never pass, and asserts the allowlist — not caller discipline — is what keeps them out.

**Grouping by `provider + operation + status`, not by stack.** Every provider failure now shares one throw site, so the default stack fingerprint would collapse a 403 entitlement refusal and a 500 outage into one issue. That is precisely the conflation that let the Yahoo 403 run undiagnosed on a bare status code for eight days.

**Demo isolation, two independent guards** (facts-of-record #7), because either alone has a hole:
- an explicit `omen_mode` tag, which catches demo-derived work running outside a demo request;
- a route-prefix drop in `beforeSend`, which catches anything thrown under `/api/demo` even when nobody remembered to tag it.

Prefix matching respects the path-segment boundary — there is a test proving a future `/api/demographics` is still reportable, because a demo guard that silently swallows a real route is worse than no guard.

**`src/server.js`** — `uncaughtException` (report → drain → exit 1, let the container restart rather than serve from a corrupted heap) and `unhandledRejection` (report, keep serving — Node's default would turn one bad request into an outage).

## Two real defects found on the way, both pre-existing

### 1. `flushSentry()` disables the client permanently

`flushSentry()` is `Sentry.close()`, which flushes **and disables the client**. I reached for it on the survivable `unhandledRejection` path, where it would have ended error reporting for the life of the container after the first rejection — a silent, permanent outage of the exact tool `O1b` was built to provide, visible only as GlitchTip mysteriously going quiet.

Split into `flushSentry()` (terminal) and `drainSentry()` (non-terminal), with the distinction documented at the definition rather than at the call site, so the next caller sees it before choosing.

### 2. The shared scrubber missed the two shapes that matter most here

Found by O8's own containment test, which **failed on first run** against a realistically-shaped Yahoo 403 body. Both gaps were in `SENSITIVE_TEXT_PATTERN`:

- A leading `\b` meant `access_token=…` never matched, because `_token` has no word boundary before `token`. **The literal key names our own code uses — `access_token`, `refresh_token`, `token_secret_id` — were exactly the ones it skipped.**
- `key=value` matched, but `"key": "value"` did not, so a secret inside a JSON body passed straight through. Provider error bodies **are** JSON, and O8 forwards a snippet of them by design, so this is the common case here rather than an edge one.

This gap predates O8 and was live for every event the scrubber has ever processed. Fixed; full suite re-run confirms no over-scrubbing regression.

## Evidence

- **`npm test` — 587/587.** Baseline was 575; +12 in `test/providerErrorCapture.test.js`.
- **`node scripts/verify-provider-error-capture.js` — PASS.** This is the "not a curl-synthetic test" clause. It provokes a **real** ESPN adapter failure (a live GET to `lm-api-reads.fantasy.espn.com` for a nonexistent league, answered HTTP 404, raised inside `doEspnRequest()`) and asserts against **the exact bytes the SDK transmits** rather than against what the code intended to send — which is what makes it a leak test rather than a smoke test:

| Assertion | Result |
|---|---|
| credential/canary leaks on the wire | **0** |
| `provider` tag | `espn` |
| `omen_mode` tag | `live` |
| fingerprint | `["provider","espn","http_error","404"]` |
| stack frames, resolving into `espn.js` | 10 |

- **`node scripts/check-sprint-staleness.js`** — 2 findings, both pre-existing (`F9` and one other), neither related to O8.
- **No dependency added; no production change made.** Both were on this item's `Do not touch` list.

## The DSN question, answered — and the answer was worse than the hypothesis

The first pass left an open question: *does production's `SENTRY_DSN` point at GlitchTip, or at sentry.io?* Read directly from both running containers on KVM1 over Tailscale, the answer is **neither**:

```
paste_the_value_herehttps://<key>@o4511559534641152.ingest.us.sentry.io/4511559540473856
```

115 characters, byte-identical in `omen_api` and `omen_cron`. **The placeholder was never removed.**

`paste_the_value_herehttps:` is not a legal URL scheme — the underscore is illegal — so `new URL()` throws and `@sentry/node` builds **no transport**. The guard was `enabled: Boolean(process.env.SENTRY_DSN)`, and a placeholder-prefixed string is perfectly truthy, so the SDK reported `enabled: true` and dropped everything in silence. Reproduced locally against the exact production string: `enabled: true`, `transport: false`, envelopes received **0**.

**Omen has been reporting errors nowhere.** Not GlitchTip, not sentry.io.

This is the worst failure mode a monitoring tool has, because **a config mistake here is indistinguishable from "no errors are happening."** Every "is the variable set?" health check passes forever. It was invisible precisely because it produced the output everyone wants to see.

Tracked as [#354](https://github.com/justinduverge-design/omen/issues/354). Fixing it is a secrets + production-restart action, so it is founder-gated.

### Three guards shipped so this cannot recur silently

1. **`describeSentryDsn()` validates instead of testing truthiness.** A set-but-invalid DSN now disables the client honestly and logs loudly at boot — loud on purpose, since the entire cost of this bug was that it made no noise.
2. **The validator matches the SDK's own key grammar** (`[A-Za-z0-9_]+`). A validator looser than the thing it validates reintroduces the exact bug in a new place. Found the hard way, and worth the embarrassment: my first live attempt used GlitchTip's dashed-UUID key, my validator passed it as valid, and `@sentry/node` rejected it with `Invalid Sentry Dsn`. `/api/ready` would have reported error tracking healthy while every event dropped.
3. **`GET /api/ready` → `checks.error_tracking`** surfaces `{configured, valid, host, project_id, reason}` — host and project id only, never the key. **Reported, not gating:** readiness is about serving traffic, and refusing to serve because monitoring is misconfigured would turn a reporting outage into a user-facing one.

### GlitchTip keys need their dashes stripped — not written down anywhere until now

GlitchTip mints project keys as dashed UUIDs. `@sentry/node`'s DSN grammar accepts only `[A-Za-z0-9_]` and rejects them outright. **Strip the dashes**; GlitchTip accepts the undashed form. `O1b`'s handoff does not mention this, and it would have cost the next session the same hour it cost this one.

## Live delivery proof — O8's last `Done when:` clause

Run from this machine against the real GlitchTip over Tailscale, using the real `omen-backend` project key:

A **real** provoked ESPN adapter failure — live GET to `lm-api-reads.fantasy.espn.com` for a nonexistent league, answered HTTP 404, raised inside `doEspnRequest()` — arrived in GlitchTip and was verified by querying its Postgres directly, not by trusting the ingest `200`:

| Check | Result |
|---|---|
| Issue | `2` — `Error: ESPN API returned HTTP 404` |
| `first_seen` | `2026-08-21 21:37:47+00` (matches the flush) |
| Stack frames | **10** |
| Tags recorded | `provider`, `omen_mode`, `provider_operation`, `provider_status` |
| `extra` | provider, operation, http_status, path, hostname — all intact |
| espn_s2 canary in stored payload | **absent** |
| SWID canary in stored payload | **absent** |
| any `espn_s2=` assignment | **absent** |

The leak check was run against the **stored** event in GlitchTip's own database, searching for the exact credential values the adapter was handed. That is the difference between "we scrub" and "nothing leaked".

## Remaining — founder-only, and it is [#354](https://github.com/justinduverge-design/omen/issues/354), not O8

Set `SENTRY_DSN` on KVM1 for both `omen_api` and `omen_cron` to the GlitchTip `omen-backend` DSN **with the UUID dashes stripped**:

```
http://<omen-backend-key-without-dashes>@100.98.81.0:8000/1
```

Recreate both containers, then confirm `GET /api/ready` → `checks.error_tracking.valid: true`, `host: 100.98.81.0:8000`. Verify KVM1 can reach GlitchTip over Tailscale from inside the container before relying on it.

## Skills

- **Invoked:** core implementation; `security-privacy-evidence` (the containment tests, the allowlist design, and the scrubber fix are its output — it is what caught defect 2).
- **Considered, not applicable:** `design-done` / `page-done` (no user-visible UI), `recommendation-done` (no recommendation logic touched), `release-done` (no deploy — production untouched), native mobile read gate (backend only).
- **Procedure gap:** none new. The existing standing rule — *`main` is the proof* — would have prevented O8's false Scope premise had it been applied to an absence claim. Worth stating explicitly in the rule itself; noted in `current_sprint.md`.


## Addendum — production DSN corrected 2026-08-21, founder-approved in session

The founder asked for the fix to be applied rather than handed over. Done on KVM1, with the founder's explicit go-ahead for the container restart:

- **Reachability checked first, from inside the container, not from the host** — `http://100.98.81.0:8000/` → 200. Host reachability would not have proven the container could route to the tailnet, and finding that out after the restart would have meant a second restart.
- Backup at `~/env.production.bak-20260821-o8-before-sentry-fix`. **Exactly one line changed**, verified by a key-only diff showing 25 assignments before and after with no key added or removed — the file holds Supabase service keys and Yahoo secrets, so "I only meant to touch one line" is not good enough on its own.
- Both containers recreated; the DSN value never entered a shell process listing on either machine.

**The number that matters:** `client.getTransport()` was **`false`** before and is **`true`** after. `enabled` read `true` in both cases, which is precisely why this went unnoticed for so long — the field everyone would check was never the field that was broken.

An event sent from inside `omen_api` arrived as GlitchTip **issue 3**, tagged `environment: production`. (Deliberate verification event; safe to resolve.)

### What is still not true, stated plainly

**Production runs an image that predates PR #353, so no provider adapter reports anything yet.** This was proven rather than assumed: a real ESPN 404 was provoked inside the production container and **nothing was captured**, because the deployed `espn.js` has no `captureProviderError` call.

**The pipe is open; nothing is feeding it.** "GlitchTip is receiving events from production" and "Omen's error paths are wired in production" are two different claims. Merging #353 and deploying closes the gap; [#354](https://github.com/justinduverge-design/omen/issues/354) stays open until a *real* adapter failure — not a hand-sent verification event — shows up in GlitchTip from production.
