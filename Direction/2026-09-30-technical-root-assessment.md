# Technical root assessment — 2026-09-30

**Author:** Claude Code, at the founder's request ("look at the technical root of Omen and see what really needs to be fixed").
**Status:** Findings with evidence. Nothing here is a plan of record until the founder ratifies it.
**How to read it:** every finding says how it was checked. `Verified` means read in code, run, or seen on the founder's phone today. `Inferred` means reasoned from the record and not confirmed.

## The short version

Omen has a thin core surrounded by very thick scaffolding, and the two were never connected end to end in a way a user can see. The scaffolding (contracts, gates, registries, agents, evidence rules) grew faster than the product loop it was meant to protect, and the checks it produced measured the scaffolding, not the product.

## What the product actually does today

1. **The recommendation is a lineup optimizer over the provider's own projections.** `src/services/optimizer.js` (275 lines) compares projected points, applies injury haircuts, and returns a swap. `src/services/omen.js` (2,062 lines) wraps that in an envelope of signals, states and contracts. *Verified* by reading both.
2. **nflverse feeds one input**: matchup defense-versus-position, fetched live from a GitHub CSV in the request path (`matchupService.js`). It broke and was repaired on 2026-08-15 and 2026-08-18. *Verified.*
3. **The football-data and football-intelligence modules are not connected to serving decisions.** Their own README says they are "deliberately independent" of the scoring pipeline and "must not own production activation". The Pi pipeline is a witness that compares file hashes and feeds nothing into the app (Muse's 2026-09-29 verification). *Verified from the README; the Pi finding is Muse's and unread by me.*
4. **Tuesday scoring has been off since 2026-08-26** (`OMEN_CRON_SCORING_ENABLED=false`). Nothing resolves a Ledger row, so every row reads "Pending". Seen on the founder's phone today. *Verified for the display; the flag's current production value is the last recorded state, not re-read.*

**Consequence:** the loop that is the product — real league, a recommendation, Tuesday scoring, a Ledger outcome — has never closed in production. Almost every large investment since August sits beside that loop, not in it.

## Why the backend "got bad"

- **Production schema was never under migration control** until WO-02 (2026-09-29). Production `moves` lacks `result`, `scored_at`, `platform`, `league_id`; code and tests assumed the bootstrap schema. 150 Ledger errors from 2026-09-16 to 2026-09-28. Same class as the 2026-08-26 `scoring` column. *Verified* (handoff, decision log).
- **Tests ran against stubs of the assumed schema**, so they passed while production was different. `test/movesProductionSchema.test.js` only went red-then-green after the outage, because it was written from the outage.
- **Identity was split** (app-minted user id vs auth id). WO-06 addresses it; its migration deletes unmatched users and drops columns, and it merged with checks pending. It has not been applied to production. *Verified from the migration and tracker.*

## Why "verified" did not mean "works" (the process root)

Every gate checked a proxy for the product:

| Claimed | Actually checked | Reality |
|---|---|---|
| Lock screens VERIFIED (U1/U3/U4, 2026-09-19/20) | Simulator frames from a scenario harness with fixtures, forced dark | Production Command tab still mounted the pre-lock screen, in light mode |
| "0 unreachable screens" | Reference count that includes screenshot code | The check's own footer says it cannot tell |
| Multi-league connect | Nothing | Removed 2026-09-16 by two "restore known-good" commits; no test existed, so nothing went red |
| main is healthy | Backend `npm test` and CI | main's iOS unit suite had a red test (`DraftClaimAbsenceTests`) since per-PR iOS CI was retired on 2026-08-11 |
| Contract v2 has the founder's amendments | A merged log of 108 automated "Accept" entries | None of the founder's device notes were in it (Muse is re-doing this) |

Plus a structural cause: **the agent that does the work also decides it is done**, and the owner of "does the founder see a correct result on the phone" was nobody.

## What was fixed today (PR #494)

Dark-only; the lock's Command Center mounted on real data and installed on the founder's iPhone; fabricated "Confident / Low risk" removed from waiver claims; league multiselect restored with the missing regression test; the red `main` iOS test fixed; the native device gate added to the definition of done.

## What still needs fixing, in order

1. **Close the loop once.** One real league, one real week: real projections → recommendation → Tuesday scoring → a Ledger row that resolves to Worked / Did not work, on the phone. Until this exists, nothing else is proven. *Blocked on:* the A6/A4 scoring holds and the Sleeper-rights question (founder decisions), and a look at production's live flags.
2. **Make the failing check the rule, not the markdown.** Replace the reachability check with one that fails when a screen is referenced only from screenshot or test code. Add a per-PR iOS unit-test job (retired on 2026-08-11; the cost was a red main nobody saw). Add a minimal on-device regression checklist run at each weekly beta.
3. **Finish the remaining native screens against artboards on the phone**, then fix the founder's device notes in order. Only the Command tab has been seen on the device so far.
4. **Backend rebuild, gated to the loop.** Keep Muse's Gate 1 blueprint, but do not apply WO-06's migration to production until it is rewritten to keep a reversible copy of what it deletes, and reconcile the confidence bands (`NO_CALL` in the blueprint vs `coin_flip` in the lock).
5. **Kill pass.** Retire duplicate CI jobs, duplicate skills and superseded docs that still read as authority. List first, delete after founder approval.

## Not verified

The ESPN sign-in and multi-league connect on the device (needs the founder's login); the Android build with the dark-only change; production's current scoring flags and database state (no shell access to the host from this machine); anything inside Muse's workspace.
