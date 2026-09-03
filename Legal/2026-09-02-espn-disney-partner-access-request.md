# ESPN / Disney fantasy data access request — draft for submission

**Status:** Draft. **Not ready to submit** — the submission channel is unresolved (see below) and
three bracketed fields need founder input.
**Why we are asking:** Omen reads a user's own ESPN Fantasy league on that user's behalf. Today the
only mechanism ESPN leaves available is the user's own authenticated browser session, which is why
our ESPN path requires a desktop browser helper and cannot work on a phone. We would rather hold a
sanctioned, revocable, auditable grant than depend on a mechanism ESPN never designed for this.
**What a yes changes:** a real authorization contract lets ESPN connect natively on iPhone and
Android like Yahoo already does, and lets us delete the browser-helper path entirely.

## Submission channel — unresolved, confirm before sending

ESPN publishes no self-serve fantasy API partner program, and there is no public application form
comparable to Yahoo's. Do not invent one. The candidate routes, in order of preference:

1. **Disney / ESPN business development or content-licensing contact** — the correct owner of a
   data-access grant. Needs a named contact.
2. **ESPN Developer Center / API partnerships**, if it still accepts inbound requests.
3. **Disney legal**, as the fallback that at least routes correctly internally.

Confirm which of these is live before sending. A request submitted to the wrong inbox reads as
unserious, and this is a first impression we get once.

**Before sending, fill the bracketed fields.** Do not guess them.

---

## PASTE BLOCK

```text
Subject: Request for sanctioned fantasy data access — Omen (read-only, user-authorized)

Requesting party
Valor Ventures LLC
Product: Omen — a fantasy football decision assistant
Bundle / application id: com.slopssaloon.omen
Website: https://slopssaloon.com
Contact: [YOUR NAME], [YOUR TITLE] — [YOUR EMAIL], [YOUR PHONE]

What Omen is
Omen is a free mobile application (iOS and Android, with a companion web app) that
helps a fantasy football manager make one decision at a time: who to start, who to
add, whether a trade is worth taking. It reads the league the user already plays in
and explains a recommendation in terms of that league's actual roster, scoring rules,
and current matchup. It is not a fantasy platform, does not host leagues, does not
take wagers, and does not compete with ESPN Fantasy. Its value depends entirely on
being connected to the league the user already has.

Omen is free to users. There are no purchases, subscriptions, paywalls, or ads.

Why users authorize league access
A recommendation that does not know the user's roster, their league's scoring
settings, and who they play this week is worthless. Generic advice is already free
everywhere. The entire product is the difference between "this player is good" and
"in your league, with your roster, this is the move." Users connect a league because
that connection is the product, and they can disconnect it at any time from within
the app.

What we are requesting
A sanctioned, revocable, read-only mechanism for a user to authorize Omen to read
their own ESPN Fantasy league — ideally OAuth or an equivalent per-user grant that
the user can review and revoke. We are not asking for bulk data, for a feed, or for
access to anything a user has not personally authorized.

What data we need
Scoped to leagues the authorizing user is a member of, and no others:
  - League settings: scoring rules, roster slots, league size, current week.
  - The user's own roster and lineup.
  - Team and matchup data for that league, including opponent rosters, which are
    already visible to every member of that league.
  - Player availability within that league (free agents and waiver status).
  - Player projection and status fields already returned alongside the above.

Every request we make is a read. We issue GET requests only. Omen has never had, and
will not add, a code path that writes to a fantasy platform: no lineup changes, no
waiver claims, no trades, no messages, no transactions of any kind. A user's ESPN
account cannot be altered through Omen.

What we do not do
  - We do not ask a user for their ESPN password. We never have. Omen accounts are
    separate, and there is no field anywhere in our product that accepts an ESPN
    credential of any kind.
  - We do not embed or proxy an ESPN or MyDisney sign-in. No in-app web view of an
    ESPN login screen, no intermediary login page.
  - We do not resell, redistribute, syndicate, or publish ESPN data. Data reaches
    only the user it belongs to.
  - We do not train models on, or aggregate for sale, data obtained through a user's
    league connection.
  - We do not use ESPN marks, logos, or trade dress. Our product carries a standing
    disclaimer that Omen is not affiliated with, endorsed by, or sponsored by any
    fantasy platform provider, and our ESPN connection screens state it explicitly.
  - We do not write to, or attempt to modify, any ESPN account or league.

Security posture
  - Session material is encrypted at rest in a managed secrets vault. Our own
    application database stores only opaque secret identifiers, never the secret.
  - Session values are never logged, printed, echoed in an API response, placed in a
    URL or query string, included in an error message, or attached to analytics or
    support payloads. This is enforced by automated tests in our build, not only by
    policy — a change that would introduce such a leak fails CI.
  - Values are decrypted in memory for the duration of a single upstream read and are
    not persisted in decrypted form.
  - Our current desktop browser helper is scoped to espn.com alone, stages nothing to
    persistent storage, clears its in-memory handoff immediately after a single use,
    and never submits a form on the user's behalf — the user reviews the form and
    presses Connect themselves. Its permissions and storage behavior are likewise
    covered by automated tests.
  - A user can disconnect a platform at any time, and can delete their Omen account
    and all associated data from within the app.
  - Access is per-user and revocable. If ESPN revokes a grant, the connection stops
    working immediately; we hold nothing that would let us continue reading.

What we would change if granted access
We would move ESPN onto the sanctioned mechanism and retire the browser-helper path
entirely, including removing its published browser extension listings. That path
exists only because no sanctioned alternative is offered. We would prefer not to
maintain it.

Scale and current status
Omen is pre-release, currently in [BETA STATUS — e.g. "closed beta with N testers"].
Projected usage at launch is [PROJECTED CONNECTED LEAGUES]. We are raising this now,
before public launch, rather than after — we would rather build against the terms you
want than ask forgiveness later.

We are glad to provide a technical walkthrough, a security review, screenshots of every
screen where a connection is established, our privacy policy and terms, or any
compliance documentation you require. If a formal agreement is the right instrument, we
will sign one, and we will accept whatever attribution, rate, scope, and audit
conditions you set.

If the answer is that no such access is available, we would appreciate knowing that
plainly, so we can tell our users honestly what ESPN does and does not permit.

Thank you for your consideration.

[YOUR NAME]
Valor Ventures LLC
```

---

## Notes for the founder, not for the recipient

- **The strongest paragraph is "What we would change if granted access."** It says we will delete
  the mechanism they would otherwise object to. Do not cut it to save length.
- **Do not soften the desktop-helper paragraph or omit it.** They can find the two published
  extension listings in about a minute. Disclosing it first, with its constraints stated, is the
  difference between a candid applicant and one who got caught.
- **Every security claim in the paste block is currently true and test-enforced.** If any of it
  stops being true, this draft has to change before it is sent.
- Fill `[BETA STATUS]` and `[PROJECTED CONNECTED LEAGUES]` with real numbers. A range is fine; an
  invented number is not.
- Expect no reply. Yahoo's process at least commits to a review window; ESPN has published no
  equivalent. Treat silence as the base case and keep the desktop path shipping meanwhile.
