# Build 12 foundation certification — pass 2

**Date:** 2026-10-13  
**Status:** source/contract certification complete for the provider and League/Omen lanes; Trade trace and retained-analysis procedure are companion packets  
**Boundary:** no Rhody/tester inspection, provider-account call, production mutation, deployment, push or merge

## Decision in one page

Omen has enough sound pieces to improve Build 12 without rebuilding the product, but it is not yet
one coherent fantasy-football decision system. Preserve the deterministic feature engines,
provider adapters and `decision-capabilities.v1` receipts. Consolidate the league context, player
identity, scoring snapshot, projection envelope and availability receipt that feed them. Repair
the live League promises that are currently ahead of their data. Do not describe any provider as
feature-complete until the native journey earns device proof.

The strongest Build 12 order is:

1. close the Trade reliability trace and select one terminal Trade outcome;
2. repair League's pregame/empty-state honesty and either wire Trade targets or remove that promise;
3. add only a receipt-backed compact Omen summary;
4. keep the Omen projection model customer-inactive until the retained warehouse run produces
   position-by-scoring-family PASS/HOLD/FAIL decisions.

## Provider capability certification

These grades are source, deterministic-contract and fixture evidence. `SUPPORTED-CONTRACT` is not
physical-device proof. ESPN was inspected as a platform; Rhody's account and next login were not.

| Capability | Sleeper | ESPN | Yahoo | Foundation conclusion |
|---|---|---|---|---|
| Connection lifecycle | SUPPORTED-CONTRACT | SUPPORTED-CONTRACT; fresh-account proof deferred | DEGRADED; enabled can still be unusable | Replace connected/not-connected UI inference with one computed usable state. |
| League/team discovery | SUPPORTED-CONTRACT | DEGRADED; manual fallback remains | SUPPORTED-CONTRACT | Consolidate selected league/team/week resolution. |
| Own and whole-league rosters | SUPPORTED-CONTRACT | SUPPORTED-CONTRACT | SUPPORTED-CONTRACT with partial-read risk | Normalize identity and failed-team state at the adapter boundary. |
| Weekly projections | SUPPORTED-CONTRACT | SUPPORTED-CONTRACT; current-provider proof unproven | DEGRADED; Sleeper-derived, source-labelled challenger | Require one envelope carrying source, scoring basis, coverage, freshness and approximation. |
| League scoring | DEGRADED, 32/37 canonical rules mapped | DEGRADED, 9/37 mapped | DEGRADED, 22/37 mapped | One resolver must produce the same immutable scoring receipt for every feature. |
| Availability / waiver pool | SUPPORTED-CONTRACT | DEGRADED | DEGRADED | Replace feature-specific booleans with a provider-neutral observed/unconfirmed/unavailable primitive. |
| Manual Trade roster/builder | SUPPORTED-CONTRACT | SUPPORTED-CONTRACT | SUPPORTED-CONTRACT, subject to partial-read handling | Structural support is broader than personalization proof. |
| Find a Trade | SUPPORTED-CONTRACT | SUPPORTED-CONTRACT; no current tester proof | DEGRADED | Fixture success does not close the reported native failure. |
| Trade submission | HANDOFF-ONLY | HANDOFF-ONLY | HANDOFF-ONLY | Preserve the boundary; never imply Omen submits a provider transaction. |
| League overview | DEGRADED-BUT-USABLE | DEGRADED-BUT-USABLE | DEGRADED-BUT-USABLE | Sections must advertise only reads actually supplied to the live screen. |
| Weekly Omen | DEGRADED-BUT-REACHABLE | DEGRADED-BUT-REACHABLE | DEGRADED-BUT-REACHABLE | Receipt vocabulary is shared; the underlying inputs are not yet one shared load. |

Focused provider/foundation tests passed **199/199**. This certifies deterministic code paths only.

## Shared-primitives verdict

| Primitive | Current truth | Disposition |
|---|---|---|
| Selected context | Multiple feature-specific selectors still exist | CONSOLIDATE into one server-owned league/team/week resolver. |
| Player identity | Crosswalk, provider aliases and Trade resolution meet at different boundaries | CONSOLIDATE at adapter output with explicit unresolved identity. |
| Scoring | Shared resolver exists, but consumers do not prove identical snapshots | REPAIR around one immutable snapshot/hash per league/week. |
| Projections | Several provider and fallback paths disclose source differently | REPLACE selection logic with one projection envelope; preserve provider-leads/Omen-challenges policy. |
| Availability | Several feature-specific normalizations and confirmation flags | CONSOLIDATE into one timestamped capability result. |
| Decision receipts | `decision-capabilities.v1` is already provider-neutral and tested | PRESERVE; bind it to the canonical inputs rather than treating it as the input engine. |

## League completion audit

Focused League backend tests passed **24/24**. The League overview itself is substantial across all
three providers, but three visible promises are not honest enough yet:

1. **P1 — Trade targets are permanently unread in the live composition.**
   `CommandCenterView` constructs `OmenLeagueScreen` without `tradeTargets` or a Trade-builder
   callback. The defaults in `OmenLeagueScreen` therefore guarantee the unread block even though
   screenshot fixtures can show populated targets. Either wire a real whole-league roster read and
   builder route, or exclude the section from Build 12. Do not leave fixture art ahead of production.
2. **P1 — A valid pregame matchup can be labelled unread.**
   `OmenScoutTableState.strip` requires both teams' current points. Pregame payloads can legitimately
   have projections with nil current points. Preserve the matchup strip, label projections as
   projections, and use an em dash only where a value is genuinely absent.
3. **P2 — Empty and unsupported presentation overclaim.**
   The table says `Form · last 5` although the contract supplies no form, and a successfully read
   empty activity list renders as an unexplained blank section. Hide/rename unsupported form and
   render “No major league activity to flag right now.” for a confirmed empty result.

Provider comments that still call playoff settings Sleeper-only should also be corrected: server
support now includes ESPN and Yahoo, although live authenticated proof remains separate.

### League disposition

- **Preserve:** independent section states, provider overview adapters, standings/cut-line,
  waiver sharing, decision evidence and honest hold states.
- **Consolidate:** duplicate League/Omen mappings and stale provider-capability comments.
- **Repair:** pregame strip, confirmed-empty activity, unsupported form label.
- **Replace or exclude:** the dead Trade-target promise until a real source and navigation callback
  are supplied.
- **Exclude for now:** transactions, deadline promises and broad season-stat panels that no current
  contract earns.

## Smallest honest Omen summary

The current payload and native model already support a compact evidence summary, not a broad stats
dashboard. Build it from the same decision receipt:

- expected-value delta, when present;
- primary and comparison projected points, only when the projection envelope supplies them;
- coverage/limitation language when the decision is a hold;
- source, scoring basis and freshness from the canonical projection/scoring receipts.

Do not invent season stats, duplicate provider reads from the client, or expose `payload.metrics`
merely because the field exists. The summary must explain the recommendation that was actually
made.

## Build 12 scope implication

Trade remains the first candidate because a broken terminal journey is a direct tester problem.
League honesty repairs are small, independent candidates that can accompany it only after their
native tests and current canvas behavior agree. The summary is next, but it must wait for the
receipt-backed projection/scoring envelope rather than creating another screen-local data path.

Physical-device and authenticated-provider certification remain required before release. Rhody's
fresh ESPN login stays explicitly deferred until the founder says a new beta is installed and asks
to resume it.

## Evidence and commands

- Provider/foundation deterministic suite: PASS, 199/199.
- League focused backend suite: PASS, 24/24.
- Projection focused suite from the local staging repair: PASS, 34/34.
- Provider calls: none.
- Rhody/tester inspection: none.
- Host mutation, deployment, push and merge: none.
- Companion projection procedure: see the retained-analysis runbook produced from this pass.
- Companion Trade packet: see the Build 12 Trade reliability trace produced from this pass.
