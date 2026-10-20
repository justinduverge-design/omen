# Build 13 — liability and idea inventory

## Status

**Planning inventory only.** This file prevents known work from leaking backward into Build 12. It is not a
scope commitment or a reason to hold a Build 12 candidate that passes its final iPhone walk and TestFlight
gate.

## Provider liabilities

### ESPN first-time path

- Prove the current iPhone connection screen with a genuinely new ESPN account. Confirm the consent copy,
  browser handoff, return path, recovery states and last-resort League ID path are understandable.
- Prove ingestion after that connection: every visible league, the user's team id, memberships, active-league
  selection, roster, matchup, scoring/settings, standings, waiver pool, transactions and recommendation
  inputs. A successful connection is not enough by itself.
- Reconnect, repair or retire the one legacy row with no `espn_team_id`. Do not generalize that old row into a
  fresh-login failure unless the new-account proof reproduces it.
- Keep ESPN's cookie-backed and unofficial-provider risk visible. Never treat “working” as provider approval.

### Provider capability reconciliation

The machine-readable authority is
`Blueprints/specs/football-data/provider-capability-matrix.json`; its generated view is
`provider-capability-matrix.md`. Build 13 starts by updating its evidence dates and production-switch truth,
then classifies every field or endpoint into exactly one list:

1. **Used now:** read by Omen and consumed by a named feature or receipt.
2. **Available but unused:** offered by the provider but not consumed by Omen.
3. **Superseded:** technically available, but intentionally not used because the warehouse or another
   canonical source is more complete, stable or rights-safe.
4. **Unavailable or restricted:** cannot be used honestly; preserve the reason and degraded state.
5. **Unproven:** code or documentation suggests support, but a sanitized real-account read has not proved the
   live shape.

The current matrix already tracks league settings, scoring rules, user and league rosters, roster positions,
matchups, standings, waiver pools and systems, transactions, projections, injuries, draft data, playoff
settings and trade deadlines across Sleeper, ESPN and Yahoo. Build 13 must map each used capability to Desk,
Omen, Start/Sit, Waivers, Trade, League or Ledger rather than merely saying an adapter reads it.

### Known unused or unresolved candidates

Validate this list against current source before implementation:

- ESPN `eligibleSlots`: high-value positional eligibility and the real league slot list.
- ESPN `keeperValue` / `draftAuctionValue`: useful only for keeper or auction leagues.
- ESPN league draft data and trade deadline: currently not read or deliberately omitted.
- Sleeper depth-chart order/position: compare with the warehouse's depth source before choosing an authority.
- Sleeper traded-pick ownership and playoff brackets.
- Yahoo bye weeks: likely superseded by Omen's NFL schedule unless provider-specific differences matter.
- Yahoo recent-player-note flag: news rights and the value of a flag without content remain unresolved.
- Yahoo and ESPN transaction shapes, waiver details and ownership percentages: re-audit because production
  switches and source changed during Build 12; do not preserve stale “off” or “not read” claims.
- Provider-side schedules, byes, depth and injury fields that duplicate warehouse facts: explicitly mark keep,
  fallback, cross-check or retire. Do not silently collect duplicate truth.

## Small-model work

- Keep production on the currently proven model until a separate activation decision.
- Evaluate `qwen3:1.7b`, already proven through Omen's native Ollama chat path with thinking disabled, on
  narration quality, latency, memory and failure behavior using held-out Omen prompts.
- Test small models as background workers rather than customer-facing authorities: data classification,
  anomaly/trend surfacing, provider-shape triage, support-email routing and “this happened before” statistical
  notes. They may surface evidence; they do not select a fantasy move or invent provider truth.
- Define a shadow receipt for every experiment: input class, output, latency, resource use, agreement with the
  deterministic system, failure reason and whether a human acted on it.

## Other carried work

- Make the in-app report/support path deliver a real, privacy-safe support item and prove the owner can receive
  and close it. Build 12 only moved and clarified the control; delivery remains deferred.
- Add the move follow-through write route for “I made the move” / “Not this week”.
- Turn this inventory into a prioritized Build 13 plan only after Build 12 ships and first-user feedback is
  observed. Preserve separate states for idea, source-built, test-passed, deployed and phone-proven.
