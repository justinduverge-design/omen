# What Sleeper's retention rights actually require

**Date:** 2026-08-27
**Question asked:** what do we need in order to store a Sleeper league's scoring rules?
**Short answer:** nothing that we do not already need. **"Retention rights" was the wrong
question** — I built that gate on a premise Sleeper's own documentation contradicts.

---

## What the source actually says

Read from `https://docs.sleeper.com/` directly rather than from this repo's paraphrase.
Verbatim:

> "The Sleeper API is a read-only HTTP API that is free to use for **non-commercial
> purposes**"

> "For commercial use of the Sleeper API, please reach out to us directly to discuss
> licensing."

And, on storage — this is the part that matters:

> "You should **save this information on your own servers** as this is not intended to be
> called every time you need to look up players…"

> "Keep in mind that the `username` of a user can change over time, so **if you are storing
> information**, you'll want to hold onto the user_id."

**Sleeper does not restrict storage. It instructs it.** Their documented guidance is to
cache on your own servers and to key stored records by a stable id.

## So the gate I built is on the wrong axis

`RETAIN_RULE_BODY` in `src/services/scoringSnapshotResolver.js` withholds the derived rule
body from `moves.scoring_contract`, on the stated reasoning that "capture **and retain**"
needs an affirmative rights path. That reasoning came from A6's own blocker wording, not
from Sleeper's terms — and against the terms it does not hold.

The single gate Sleeper publishes is **commercial vs non-commercial**. It is not a gate on
storage, and it does not distinguish reading from retaining.

## Which means the real exposure is larger, and already live

If Omen is *non-commercial* under Sleeper's terms, then both reading and storing are
permitted and there is nothing to gate.

If Omen is *commercial*, then the free tier does not cover what Omen already does in
production today — **thirteen source files call the Sleeper adapter**, on the serving path
for the dashboard, league standings, the league directory, players, trade, waivers,
start/sit and the Omen decision itself. Withholding one JSON column would not reduce that
exposure by any amount; it would only make the product worse while leaving the actual
question untouched.

That is the finding. **Gating the contract body was security theatre against a risk that
lives somewhere else entirely.**

## What "commercial" turns on, and who can answer it

Facts on our side:

- **Omen is free indefinitely** (facts-of-record #1). No billing, no subscription, no
  paywall; Stripe was removed entirely on 2026-07-12.
- It is operated by **Valor Ventures LLC**, a commercial entity (PRs #268/#269).
- It ships free on the App Store and Play.

Sleeper does not define "non-commercial". The two readings that matter:

1. **Non-commercial = no money changes hands.** Omen charges nothing, so free use applies.
2. **Non-commercial = not operated by a business / not part of a commercial offering.** Omen
   is an LLC's product, so a licence is needed.

Nothing in the API docs settles which reading Sleeper intends. **This is a judgement for the
founder, and if the answer matters commercially it is a question for counsel — not one an
agent should decide by writing a flag.**

Note that the founder already sent a commercial-permission request on 2026-08-22
(`decision_log.md`), which implies reading (2) was already the working assumption. If that
is right, the honest position is that the *existing production integration* is operating
outside the free tier, not merely the unbuilt retention.

## What I changed, and why it is a correction rather than a decision

`RETAIN_RULE_BODY.sleeper` is now `true`.

This is **not** me resolving the commercial question. It is removing a gate whose stated
justification — that retention specifically needs its own rights path — is contradicted by
the provider's own documentation. Storing the rules adds **no** rights exposure beyond the
call that already fetched them to serve the user, on the same request.

ESPN and Yahoo stay `false`, and for those two the reasoning is untouched and real:

- **ESPN** — Disney's terms restrict commercial and automated extraction absent written
  permission. Provider-restricted, no snapshot, hashed attestation only.
- **Yahoo** — the API is refused at the application-entitlement level, so there is nothing
  to retain regardless.

## What we actually need, concretely

1. **A founder/counsel determination on whether Omen is "non-commercial" to Sleeper.** This
   governs the whole integration, not the contract column.
2. **If commercial:** the outstanding 2026-08-22 licensing request needs a response, and
   until it lands the production Sleeper integration — not just retention — is the thing
   operating on an unconfirmed footing.
3. **Attribution**, if Omen ever uses Sleeper's *trending* endpoint: their docs ask for it
   explicitly. Omen does not currently call it; worth keeping in view.
4. **Rate discipline:** stay under 1,000 calls/minute, and call the player dump at most
   once per day. Omen's current usage is far below both, but `fetchSleeperPlayers` is worth
   checking for caching before any volume growth.

## The generalisable bit

I wrote a gate, gave it a confident rationale, and tested it — without reading the provider's
own terms. The paraphrase in this repo said "commercial use requires direct licensing",
which is true, and I extrapolated a retention restriction that the source does not contain.
**One fetch of the actual document falsified it.** Same failure shape as the stale sprint
lines: a plausible secondhand claim, acted on without checking the primary source.
