# Omen-per-league coverage — research and guideline for a dedicated session

**Do not implement from this document.** This is research and a starting frame for a future
session to build its own plan from — per the founder's explicit instruction, this session did
the investigation only. Read this, then re-verify anything load-bearing against current `main`
before planning, since time will have passed.

**Source of the ask:** the founder tested the beta build on his own phone and found "Omen of
the Week is unable to build for every league I have connected," and wants: (1) every connected
league to always produce an Omen verdict, and (2) when a team is already well-optimized with no
real move to make, an honest positive state ("your team's great, nothing to do here") instead of
going silent. The Trade builder rework (browse-your-own-roster, position filters, a clearer
"add team" control) was raised in the same conversation and is explicitly **out of scope for
this document** — it's a separate, unrelated piece of work the founder also wants a dedicated
session for, but it doesn't share a root cause with this one and shouldn't be bundled with it.

## What's actually true today, verified against code, not assumption

**Omen is architecturally single-connection per request, not single-league by accident.**
`buildLiveOmenMvpMoveForUser(userId, { contextId })` in `src/services/omen.js:1573` is the real
entry point behind `POST /api/omen/mvp-move`. Read it end to end before planning anything here.

- It already supports scoping to one specific connection via `contextId` (`src/services/omen.js:1579-1584`)
  — pass a `platform_connections.id` and it returns `contextUnavailableMvpResponse()` if that
  exact connection isn't usable, or builds the move for it specifically.
- When `contextId` is omitted, it does **not** aggregate — it loops over every "live" connection
  in whatever order `getActivePlatformConnections` returns them, tries each one, and returns the
  **first one that succeeds** (`src/services/omen.js:1600-1621`, explicit `break` on success).
  The comment there — *"Try every usable connection before giving up. A provider that is down...
  must never take down a user whose other league still works"* — describes exactly what it does:
  robust fallback to *a* working league, not coverage of *every* league. This is good, working
  code; it was just never asked to do the thing the founder now wants.
- **The native clients never pass `context_id` at all.** Checked directly: no reference to
  `context_id`/`contextId` anywhere in `mobile/ios/OmenIOS/OmenIOS/App/Api/OmenDecision.swift` or
  its view model. (Android wasn't checked with the same depth — verify before assuming parity.)
  So today, switching which league is active in the carousel does not change which league's Omen
  you're looking at at all — the server's connection-iteration order decides it, silently, every
  time.

**Net effect:** the founder's five-connection state (Sleeper connected, others not, in his test)
happened to produce one Omen because there was only one live connection to try. With multiple
real leagues connected, the same code returns exactly one of them — whichever comes first in
connection order — and every other league's Omen tab shows nothing, because nothing ever asked
for it by `context_id`.

## "Every league gets a verdict, including a positive one" doesn't exist yet either

Searched `src/services/omen.js` and `src/services/omenSelector.js` for any existing "no move
needed" / "already optimal" state: **none found.** Every path either returns a recommended move
or an error/unavailable state. Whatever currently happens when the optimizer genuinely finds
nothing worth changing needs to be traced (start at `src/services/optimizer.js` and wherever
`omenSelector.js` decides there's no candidate) — my guess, unverified, is it either falls through
to a generic "no recommendation" response the client renders as empty, or never actually gets
exercised because the fallback-move logic (`buildMathFallbackMove`-style patterns elsewhere in
this codebase) always manufactures *something*. **Confirm which of these it actually is before
scoping a fix** — "add a positive state" is a different task from "stop manufacturing a weak
fallback move when there's nothing good to suggest."

## This is the same architectural gap as today's database audit's `leagues` entity finding

Separately, this session's broader database audit found `platform_connections` and 7
`league_office_*` tables all reference a bare `league_id text` with no first-class `leagues`
entity behind it — see `Direction/reviews/2026-09-27-database-and-backend-architecture-audit.md`,
decision D1. That finding and this one share a root cause: **the whole app models "the user's
leagues" as a flat list of provider connections to pick one from, not as a set of leagues each
independently deserving of the app's attention.** `activeSelection.js`'s `is_selected` column
(*"the single connection the user chose... never more than one true row per user"*) is the same
pattern at the schema level that `contextId`-or-first-success is at the request level. A session
scoping "every league gets an Omen" should read that D1 finding — it may or may not want to
solve both at once, but it should make that call deliberately, not discover the overlap midway
through.

## Open questions a plan needs to answer — founder or product calls, not mine to guess

1. **Compute model:** does every connected league need its own Omen computed synchronously when
   the user views it (N sequential/parallel calls to the existing per-`context_id` endpoint from
   the client), or does the founder want them precomputed/cached server-side (e.g. as part of the
   carousel's own data load, or a new batch endpoint)? This has real latency-budget implications —
   `src/routes/omen.js` already tracks per-stage latency budgets (`MVP_LATENCY_BUDGET_MS`) for a
   *single* Omen build; N of them either in parallel or serial changes that math.
2. **Where does the founder want to see "every league has an Omen"?** A single Omen tab that
   reflects whichever league is active in the carousel (the client just needs to start passing
   `context_id` correctly — the smallest possible version of this fix), versus a summary/list
   surface showing every league's verdict at once (new UI, new endpoint shape). These are very
   different sizes of work and the founder's own phrasing ("every team, every league has an
   Omen") reads more like the second, but that should be confirmed, not assumed.
3. **The "great team, ready to battle" copy** needs an actual product-copy pass (tone, what
   triggers it, whether it's a distinct visual state or just fills the existing recommendation
   slot with different content) — this is a `slops-ux-copy` job once the underlying "no move
   found is a real, honest state" logic exists.
4. **Does this apply to every provider equally?** `buildLiveOmenMvpMoveForUser`'s per-connection
   try loop already has provider-specific recovery paths for ESPN and Sleeper failures
   (`src/services/omen.js:1623-1638`) — a per-league fan-out needs to decide what a partial
   failure looks like (2 of 3 leagues get an Omen, one shows a named recovery reason) rather than
   the current all-or-nothing single result.

## Suggested shape for the next session, not a plan

Given the architecture is already `context_id`-capable server-side, the cheapest correct next
step is probably: (a) confirm answer to open question 2 first, since it decides everything else;
(b) if it's "reflect the active carousel league," wire `context_id` through the native clients —
small, contained, no new backend work; (c) if it's "show every league at once," that's real new
work — likely a new endpoint that fans out to the existing per-connection logic rather than
duplicating it, plus the client UI to show a list/summary. Either way, (d) the "no move needed"
honest state is a prerequisite for "every league" to mean anything — without it, a well-optimized
team's league would still render as broken/empty, just for a different reason. Sequence that
before the fan-out, not after.

## What this document does not cover

- The Trade builder rework (own-roster browsing, position filters, "add team" clarity) — separate
  ask, separate session, no shared root cause with this one.
- The report-pill/League-Pulse overlap bug, the border-thickness consistency pass, the Dynamic
  Type font issue, the standings display, and the team-switch lag — all raised in the same
  conversation, all either already fixed or explicitly deferred elsewhere; not this document's
  concern.
