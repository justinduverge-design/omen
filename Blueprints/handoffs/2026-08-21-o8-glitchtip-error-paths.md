# Handoff — 2026-08-21 — O8: wire GlitchTip into Omen's actual error paths

**Status: `O8` is `IN_PROGRESS`, not closed.** Implementation and tests are complete. Two founder-gated items remain, and one of them is a question that may be more important than the task itself — see "The DSN question" below. Read that section before treating O8 as nearly done.

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

## The DSN question — read this before continuing O8

**The only Sentry DSN on the founder's machine points at sentry.io, not GlitchTip:** `VITE_SENTRY_DSN` → `o4511928445960192.ingest.us.sentry.io`.

`initSentry()` reads `process.env.SENTRY_DSN`. **Nobody has confirmed what the deployed value is.** If production's `SENTRY_DSN` also points at sentry.io, then:

- `O1b`'s GlitchTip instance has been receiving **nothing from Omen** since it was deployed, and
- everything O8 just built reports into the wrong tool.

`O1b`'s done-when was satisfied by POSTing a synthetic event directly to GlitchTip's ingest endpoint from a terminal. **That proves GlitchTip accepts events. It does not prove Omen is configured to send to it** — and no evidence in this repo closes that gap in either direction. This is the same shape of error as O8's own false premise: a capability was proven at one end and assumed across the middle.

**This is worth answering before anything else in the error-tracking lane**, including `O9` (routing GlitchTip issues to Discord), which is built on the same unverified assumption.

## Remaining, both founder-gated

1. **Confirm the deployed `SENTRY_DSN` target** (above). May split off a task of its own.
2. **The live delivery proof** — confirming an event lands *in GlitchTip* needs a GlitchTip DSN, which is a secret and therefore a founder action. GlitchTip itself is reachable: `http://100.98.81.0:8000/` → 200 over Tailscale.

Everything short of delivery is proven: capture fires on real failures, the payload is safe, and the SDK transmits it.

## Skills

- **Invoked:** core implementation; `security-privacy-evidence` (the containment tests, the allowlist design, and the scrubber fix are its output — it is what caught defect 2).
- **Considered, not applicable:** `design-done` / `page-done` (no user-visible UI), `recommendation-done` (no recommendation logic touched), `release-done` (no deploy — production untouched), native mobile read gate (backend only).
- **Procedure gap:** none new. The existing standing rule — *`main` is the proof* — would have prevented O8's false Scope premise had it been applied to an absence claim. Worth stating explicitly in the rule itself; noted in `current_sprint.md`.
