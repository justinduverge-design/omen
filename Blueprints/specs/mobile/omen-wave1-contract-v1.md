# Omen Wave 1 Contract v1 — ESPN in-app connect · in-app report · Founder Digest

**Status:** Active implementation contract
**Date:** 2026-08-31
**Owner:** W1-A native (Claude) · W1-B native + backend (split) · W1-C backend (Codex)
**Source of decisions:** `omen-app-pages-workshop-v1.md` Parts 2, 4, 5. This contract implements
those decisions; it does not reopen them.
**Scope:** Wave 1 only. Waves 2–5 get their own contracts.

## Purpose

Repair the only confirmed beta failure (ESPN on iPhone had no phone path), and build the instrument
that makes the next beta round informative. Nothing here changes Omen's recommendation behavior.

## Shared rules

- **Nothing in this wave may transmit, log, screenshot, or store:** OAuth tokens, provider cookies,
  Vault secret identifiers, raw provider error text, league names, roster contents, or the user's
  email in any payload where an opaque user id would do.
- **`main` is the proof.** A handoff describing this work is a pointer, never evidence.
- Every new outbound path is **fail-closed**: if a dependency is unconfigured, the feature is
  absent, never degraded into a silent partial.
- Reference pulls (`omen-app-pages-workshop-v1.md` Part 4) inform each section. Where a reference
  conflicts with `component-lock-v1`, the native design house, or an honest-state rule, the
  reference loses and the deviation is recorded in the PR.

---

## W1-A — ESPN in-app connect sheet

**Reference row:** 1 (Plaid Link; Copilot Money bank connect).

### Blocking gate — no code before this clears

Implementation may not begin until both are answered in writing and recorded in
`Direction/decision_log.md`:

1. **ESPN terms review** — whether authenticating a user to ESPN inside our own web sheet and
   reading the resulting session is permitted.
2. **App Review answer prepared** — what we say when Apple asks why the app opens a third-party
   login. Comparable financial apps clear this routinely; that is a reason to expect a path, not a
   reason to skip preparing one.

If either answer is no, the fallback is the workshop's third option — mark ESPN plainly as
desktop-only **at the provider-choice step, before the user invests any effort** — and the rest of
this section is not built.

### What already exists (verified, do not rebuild)

`POST /api/platforms/espn/connect` accepts `{ leagueId, espn_s2, swid, espnTeamId }`, validates via
`validateEspnConnection()` → `espnAdapter.verifyLeagueAccess()`, and stores credentials as Vault
secret references (`espn_secret_id`, `swid_secret_id`). **W1-A requires no new backend endpoint.**
This is a client-only build against a route already in production.

### Native flow

1. **Consent screen before the sheet opens.** Plain language: what Omen is about to open, that the
   user signs in to ESPN directly, that Omen reads only the session needed to see their league, and
   that Omen never sees or stores their ESPN password. A user who declines returns to provider
   choice with no state written.
2. **Sheet** — native web authentication session against ESPN's own sign-in. Omen renders no
   credential fields of its own at any point.
3. **Session capture** — on successful sign-in, read `espn_s2` and `SWID` from the sheet's cookie
   store. Values are held in memory only, passed once to the existing connect route, and never
   written to disk, logs, analytics, crash reports, or the report payload in W1-B.
4. **League selection** — reuse the existing `.chooseLeague` step in `ConnectFlow`. No new pattern.
5. **Success** → the post-connect tour (Wave 3), then Command Center.

### Failure states — all named, none generic

| Condition | Behavior |
|---|---|
| User cancels the sheet | Return to provider choice. No error. No state written. |
| Sign-in succeeds, session not readable | "Omen couldn't read your ESPN session." Offer retry once, then the desktop path. Never blame the user. |
| Session read, `verifyLeagueAccess` fails | "Omen signed in but couldn't reach that league." Offer league re-selection. |
| No leagues found on the account | Honest empty state. Not an error. |
| Gate answered "no" | Section not built; provider-choice marks ESPN desktop-only. |

### Acceptance

- A founder-run device test connects a real ESPN league end-to-end on an iPhone with **no computer
  involved**. This is the whole point of the wave; a simulator pass does not satisfy it.
- `espn_s2` and `SWID` appear in **zero** emitted bytes outside the single connect request. Proved
  the way the scrubber failures were proved — by provoking a real failure and searching the emitted
  bytes, not by review.
- Android reaches parity in the same wave (workshop Part 3: platforms move together).

---

## W1-B — In-app report

**Reference row:** 7 (floating pill placement).

### Entry point

- A **small floating pill, beta builds only.** Compiled out of App Store builds — a build flag, not
  a runtime toggle, so the control cannot appear in production by configuration accident.
- Sits clear of the tab bar and clear of the context strip (Wave 3). Never overlaps content it
  would obscure.

### Payload

| Field | Content | Bound |
|---|---|---|
| `message` | The user's words | Verbatim. Never paraphrased before storage. |
| `screen` | Destination identifier | Enum, not a free string. |
| `app_version`, `build`, `os_version`, `device_model` | Build and device | — |
| `screenshot` | Current screen | **Shown to the user first.** They may redact regions or drop it. Never sent unseen. |
| `connection_state` | Provider + status only | `"sleeper:connected"`. **Never** league names, team names, rosters, tokens, cookies. |
| `recent_error_codes` | Last few scrubbed codes | Codes only. No messages, no provider text. |
| `user_id` | Opaque id | Not email. |

### Storage

- New Supabase table `beta_reports`, **RLS on from the first migration**, not added after.
- The reporting user may insert and read only their own rows. No client may read another user's
  report. Founder read access is service-role, server-side, for the digest only.
- Retention stated in the migration, not left open-ended.

### Disclosure

The report screen states plainly that reports are **summarized by a model to produce a daily
digest** before the user sends. This is not optional and not buried — it is other people's words
being processed, and they are told.

### Acceptance

- A report with a screenshot round-trips and is readable in the digest.
- Emitted bytes for a report contain no league name, roster entry, token, or cookie. Proved by
  provocation, not review.
- The pill is absent from a release-configuration build. Proved by inspecting the built binary.

---

## W1-C — Founder Digest and alerts

**Owner:** backend (Codex).

### Delivery

- **Resend**, already wired (`config.resend.apiKey`, used by `waitlist.js`). No new mail dependency.
- **Daily. Silent on a day with no reports and no incidents** — a digest that arrives every day
  regardless trains the founder to stop opening it.

### Sections — all four, in this order

1. **What users said** — reports themed by the local model, **with every raw report reproduced
   underneath**. Summarization may never be the only representation of a user's words.
2. **What's broken or shaky** — plain sentences. "Sleeper connections failed 4 times today." "The
   database was slow this morning." "Everything is fine." No stack traces, no jargon, no error
   classes. Written for a non-technical reader by explicit instruction.
3. **What needs money or attention soon** — Supabase tier usage, Redis plan runway, Yahoo token
   expiry, certificate and store-build expiry.
4. **How many people used it** — opened the app, connected a league, got a recommendation, built a
   trade.

### Summarization

- **Local Ollama only**, via the existing `src/services/llm.js`. Rough output is accepted and
  expected.
- `AI_PROVIDER=cloud` stays fail-closed at `cloud_disabled_zero_budget`, and the public-host guard
  stays. **Neither may be relaxed by this work.** Changing either is a budget decision *and* an
  egress decision about other people's words, and belongs to the founder, not to a config change.
- If the local model is unreachable, the digest still sends with **raw reports and numbers, and a
  line saying summarization was unavailable.** It never silently omits a section.

### Analytics

- **In-house.** Events counted into Supabase; the digest reads them. No third-party analytics SDK,
  in this wave or later, without an explicit reversal of the workshop decision — the founder chose
  privacy over a clickable dashboard knowingly.
- Wave 1 event set is deliberately small: app opened, connect started, connect succeeded, connect
  failed (with provider and failure class), recommendation viewed, trade compared, report sent.
- Each event's retention is declared in its migration.

### Alerts — the only two things allowed to interrupt

**1. The app is down.** API unreachable, or the database is.

**2. User data is at risk.** General breach detection is **not achievable and must not be claimed
or built as if it were.** The detectable signals, and the entire list:

- Row-level-security denials spiking
- Failed-authentication floods, or one account reading an anomalous row volume
- Service-role database key used from an unexpected origin
- **Backup failure** — the real, fully detectable "we could lose data" alarm
- Credentials appearing in logs

Everything else waits for the digest.

### Delivery channel gap — open, must be closed before W1-C ships

Email is not a paging mechanism. "The app is down" has to reach the founder when he is not reading
email. The channel is undecided; W1-C is not complete on email alone.

### Acceptance

- A digest generates from seeded reports and incidents and is readable start to finish by a
  non-technical reader with no follow-up questions.
- With the local model stopped, the digest still sends, complete, and says summarization was
  unavailable.
- A forced backup failure raises the alert.
- No alert fires for anything outside the two categories. An alert the founder can ignore is an
  alert the founder will ignore.

---

## Out of scope for Wave 1

Small Council rework, the Ledger screen, the context strip, League and Waiver, the Trade rebuild,
notifications, the post-connect tour, team theming (postponed), accessibility fixes (Wave 2), and
demo-mode deletion (Wave 2). None of these may be pulled forward into a Wave 1 PR.
