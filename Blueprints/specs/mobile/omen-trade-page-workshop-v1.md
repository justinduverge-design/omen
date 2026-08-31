# Omen Trade page workshop v1

**Date:** 2026-08-31  
**State:** founder workshop in progress; not implementation authority

This is the lean decision record for the page-by-page product loop. It records founder-locked
outcomes without pretending unresolved data or design questions are settled.

## Product job

Trade is both a fast opinion tool and a league-aware deal builder:

1. **Type a trade:** search and commit canonical players quickly during a conversation.
2. **Build a trade:** choose league mates, inspect starters/bench/IR, and select assets from live
   connected rosters.

Both paths create the same trade draft. Changing the active team or league changes Omen's global,
persistent context across every page until the user changes it again.

## Locked decisions

- Beta supports two-team and three-team trades; three is the maximum.
- Recommendations preserve trade shape. A one-for-one alternative stays one-for-one; a
  three-team alternative stays three-team.
- Omen optimizes for an honest, mutually plausible deal—not a calculator "win" for its user.
- Every participant is evaluated separately for fair value, roster fit, and acceptance
  likelihood. Omen may recommend paying a plainly disclosed premium when lineup improvement
  justifies it.
- Private advice is blunt. Share output is neutral and provocative, never the sender's private
  verdict or negotiation strategy.
- Primary sharing targets are Messages, group chats, Discord, and Instagram DMs. The durable
  object is a standalone image plus a public Omen link. QR is optional, not the default.
- A public trade page may collect Accept / Reject / Counter opinions with adjacent copy that the
  action does not affect the real fantasy league. Chat-native polls are parked.
- Beta is **provider handoff only**. Omen builds, analyzes, packages, copies, and shares the exact
  offer, then opens or directs the user to Yahoo, Sleeper, or ESPN to submit it. Omen never says
  an offer was sent without provider confirmation.
- Provider capability is explicit: `submission: supported | handoff_only | unavailable`. Current
  official capability is `handoff_only`: Yahoo's current application access is read-only,
  Sleeper publishes no authenticated trade-write endpoint, and ESPN publishes no developer write
  API. Future official access or partnership can activate `supported` without changing the page's
  core contract.
- English only for beta.
- Roster rows may show provider positional rank only when lawfully available, source-labelled and
  current. Otherwise rank is `null` and the UI shows a dash. Omen never invents or silently
  substitutes a rank.
- Omen-owned season, weekly, and rest-of-season rankings are a future proprietary shared-data
  product for Trade, Waivers, Start/Sit, League, and Command Center—not a Trade-only patch.
- Missing projections may produce a **clearly labelled qualitative opinion**, not a scored
  verdict. It must name the evidence used and the material evidence missing. It may express a
  directional lean from verified roster fit, role, injury, rank, and league facts, but may not
  invent a point delta, value gap, VORP, tier, confidence precision, or numerical advantage.
- `insufficient_data` and qualitative analysis cannot contradict each other. The screenshot state
  "won't force a verdict" paired with "good trade", `+9.72`, and "smart move" is invalid.

## Draft-pick seam — saved, deferred

Draft picks are not in the current beta implementation slice. They are a contractual future
asset tied to Omen's 2027 ADP/ranking pipeline work. The Trade model must therefore avoid a
permanent player-only shape, but no pick value may be invented now.

When activated, a pick asset needs season, round, current owner, original owner when different,
exact slot when known, provider/league provenance, and an explicit valuation state. Pick-aware
fairness, three-team balancing, ADP, and dynasty/keeper behavior must be designed together. A
displayable pick with no defensible value cannot receive a scored verdict.

## Still open

- Exact roster-row information hierarchy beyond source-ranked positional rank.
- Two-/three-team builder interaction and accessibility behavior.
- Provider-by-provider roster, rank, pick, ownership, and submission capability proof.
- Public vote visibility and retention/consent details.
- Exact qualitative-opinion language and action strength when scoring is unavailable.
