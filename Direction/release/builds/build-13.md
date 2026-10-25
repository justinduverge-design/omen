# Build 13 — liability and idea inventory

## Status

**Planning inventory only.** This file prevents known work from leaking backward into Build 12. It is not a
scope commitment or a reason to hold a Build 12 candidate that passes its final iPhone walk and TestFlight
gate.

## Forecast liability (founder, 2026-10-25)

**Sight forecasts points only.** Today Sight predicts one number per player, next week's PPR points, plus a
0-100 grade. Omen's whole point is to forecast fantasy football, so Build 13 makes Sight forecast the stat
line, for each of the coming weeks:

- targets, catches and receiving yards; carries and rushing yards; passing yards; TDs of each kind (QB, RB,
  WR, TE first; K and DEF after);
- scored with each league's own rules, which also replaces Yahoo's approximate scoring and covers custom ESPN
  scoring;
- built alongside the current Sight and switched over once (`SIGHT_VERSION`), and allowed to lead only where its
  measured error beats the provider's (the forecast-authority block already carries the scorecard);
- shown on the decision screens as a small table: season so far, Omen expects, and the league's own projection,
  for the two players in each move (trade: get/send; start/sit; waivers: add/drop).
- **win probability on the Desk cards**, from Omen's own stat-line forecast rather than the provider's points
  (founder, 2026-10-25). Build 12's bar shows the share of projected points, labelled as such.



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

## Device-walk product follow-ups from Build 12

- Re-audit every primary destination by information type, not by shared container count. Keep semantic
  continuity, but choose cards, tables, dividers, pills, lists and plain sections according to the content.
- Build Trade needs a server contract for the user's own roster and an explicit side selector; the current
  roster response names opponents only, so the client cannot honestly offer the user's team yet.
- Improve Find a Trade realism and acceptance likelihood. Review position/value asymmetry such as a kicker
  for a quarterback, and define the product policy for useful candidates when no mutually beneficial swap
  clears the current fairness guard. Do not quietly weaken fairness to manufacture a result.
- Explain football terms such as EPA in plain language or behind contextual help.
- Evaluate user-controlled team/account marks as a later identity feature; do not turn provider or status
  colors into decorative team theming.
