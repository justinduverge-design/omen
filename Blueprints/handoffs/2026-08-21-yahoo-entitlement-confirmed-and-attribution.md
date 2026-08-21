# 2026-08-21 — Yahoo entitlement confirmed by Yahoo's own words; attribution shipped on web + native

## What this session was

Founder arrived with an executed Yahoo API Access and Use Agreement and a working question:
*two approval letters, and Yahoo still does not work — what is going on?* The answer turned out
to require re-examining the diagnosis rather than repeating it.

## The headline

**The 403 is an application-authorization refusal, and we now have Yahoo saying so** rather than
inferring it from a status code:

```json
{"error": {"yahoo:uri": "/fantasy/v2/game/nfl?format=json",
           "description": "This application is not authorized to perform this action.",
           "detail": ""}}
```

The eight-day-old conclusion in `facts-of-record.md` #11 was **correct**. It had also never been
**verified**, because `src/services/yahoo.js:54` threw `Yahoo API error: ${res.status}` and
discarded the body. Every prior statement of that fact rested on three digits and no reason.

## Agreement of record

Executed. Yahoo countersigned **2026-08-20** (Dipesh Raichura, Sr Dir Product Management);
founder signed 2026-08-05; **effective 2026-08-07**. Docusign envelope
`A1D54813-9307-84ED-83EA-FC24FBE40785`. Valor Ventures LLC. **Read-only.** Territory **US and
Canada**. Developer Application named only as "Omen (https://slopssaloon.com/)".

## What was eliminated, with evidence rather than argument

| Hypothesis | Verdict | Evidence |
|---|---|---|
| Source IP blocked (Hostinger/datacenter range) | **DEAD** | Unauthenticated call from `omen-prod` egress `2.25.182.1` returns **401**, byte-identical to a residential IP |
| Stored token dead / needs reconnect | **DEAD** | Token had expired 2026-08-14; refresh fired automatically mid-call and the **fresh** token was refused too |
| Blank Homepage URL on `ZcZJXm8V` | **DEAD** | Filled in mid-session; identical four 403s before and after |
| Grant attached to the wrong app | **DEAD** | Only `ZcZJXm8V` is offered the Fantasy permission at all |
| Fantasy entitlement not granted | **CONFIRMED** | Yahoo's own body, quoted above |

**Nothing on the Omen side can move this.** Action remains external: wait. If still refused around
**2026-08-28**, escalate citing the envelope ID **and** App ID `ZcZJXm8V` explicitly.

## The five-app discovery

The developer account holds **five** apps named "Omen — The Fantasy Football Library", not two.
Three were unknown to every document in this repo. **Only `ZcZJXm8V` is offered the Fantasy Sports
permission** — on the other four the block is not merely unchecked, it is not rendered. That is
Yahoo's console stating which app it associates with Fantasy, and it is the deployed one.
**Do not delete the unused apps**; deleting one is what destroyed the previous grant.

`3GnEYhVE` is a Public Client carrying **TW Auction Read/Write** — the only write scope anywhere in
Omen's Yahoo footprint, on an app Omen does not use, while Omen's contract is read-only. Not a live
risk (no credentials deployed) and not touchable while an approval is pending on a sibling app.

## Attribution — all three contractual placements now met

- **Web footer** — `Footer.jsx` renders "Fantasy data provided by Yahoo Fantasy." hyperlinked to an
  official Yahoo Fantasy page, gated on `YAHOO_CONNECTIONS_ENABLED`.
- **Native in-app** — added to **Help + Support** on both platforms, the existing "similar
  informational section". No Legal/About screen exists and creating one needs its own screen
  contract and Figma approval; using the existing surface avoided that gate entirely. Gated on
  `ConnectProvider.yahoo.availability`, the native mirror of the web flag.
- **Store listing** — required sentence added, plus a fixed trap: the spec told Apple submitters to
  drop "the trailing attribution line", which meant the *trademark* line but would now read as
  license to drop the Yahoo sentence.

**Why conditional and not hardcoded:** Omen currently displays no Yahoo Fantasy Information, so an
unconditional line would be a false statement on every page — sitting directly beside the
non-affiliation disclaimer, which is the *opposite* clause. Gating on the flags that re-enable Yahoo
means attribution lights up on the same flip, instead of depending on someone remembering it at
launch. Deliberately over-inclusive once live: over-attributing is not a breach, under-attributing is.

## Evidence

- Backend `npm test` **575/575**
- iOS unit **248/248** (both new attribution assertions included); `BUILD SUCCEEDED`
- Android `:app:compileDebugKotlin` + `:app:compileDebugAndroidTestKotlin` clean
- Frontend `npm run build` clean (621.68 kB; chunk warning pre-existing)
- Web attribution verified **rendered** by temporarily flipping the flag, screenshotting, and
  reverting — both states confirmed
- Two iOS UI contrast failures (`ContextualHelpAccessibilityUITests`) **proved pre-existing** by
  stashing the diff and re-running against clean `main`: identical failures

## One retraction, recorded because it was nearly written into the ledger as a bug

The Yahoo `platform_connections` row carries `league_id: "yahoo"`. This was flagged mid-session as a
data bug. **It is not.** `yahooAuth.js:69` writes it deliberately — `league_id` is NOT NULL, so the
platform name is the pre-bind placeholder — and `hasUsableLeagueId()` rejects exactly the shape
`league_id === platform`. Called a bug from its appearance without reading the writer: the same
error as diagnosing a 403 from its status code without reading the body, made twice in one session.

## Still open

- **Yahoo entitlement** — external, [#308](https://github.com/justinduverge-design/omen/issues/308),
  re-check with the probe; escalate ~2026-08-28.
- **The enriched error needs a deploy to pay off in production.** Not deployed here (founder-gated).
- **No rendered evidence of the native attribution.** It is invisible while Yahoo is on hold, so a
  screenshot today proves nothing; it needs a screenshot scenario when the flag flips.
