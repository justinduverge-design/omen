# Omen Trade rework v1 — three-team, find-a-trade, swipe review, saved queue

**Date:** 2026-09-27
**State:** founder-directed planning pass. This document defines scope and contracts; it does not
authorize implementation. Each item below carries its own sprint entry in `Direction/current_sprint.md`
(lane T) with the actual `Blocked by:` gate.
**Extends:** `Blueprints/specs/mobile/omen-trade-page-workshop-v1.md` — read that first. This document
does not restate its locked decisions (two/three-team max, honest handoff-only submission, private vs.
public exposure of a team's weakness, no invented pick values, English-only beta). It only specifies
the four pieces of net-new work below.

**Already built — do not re-plan.** `U3-CommandLeagueTrade` (VERIFIED 2026-09-20, both platforms)
shipped the roster-browse "Build a trade" path, `NEEDS <POS>` / `NO HOLE` partner-chip weakness tags,
the "Fills my `<POS>` hole" smart filter, greyed-out low-likelihood roster rows, the counter mechanism,
and provider handoff. See `Blueprints/specs/design/screen-contracts/TradeBuild-v1.md`,
`TradeRoster-v1.md`, `TradeNeedsContext-v1.md`, `TradeVerdict-v1.md`.

## Standing tension this document does not resolve

`Direction/current_sprint.md` lane B carries `B-FREEZE` — a founder-authored plan to declare feature
freeze once `B2-D3-S2` and `M3A-QA` close, after which "agents are instructed to reject new feature
scope" until beta feedback justifies it. Everything in this document is new feature scope minted the
same week that freeze plan is close to firing. The founder scoped this work explicitly in the
2026-09-27 session that produced this document, but did not address freeze sequencing — each sprint
item below carries an explicit `FOUNDER_APPROVAL` blocker for that reason rather than silently jumping
the queue or silently being buried in the unselectable backlog.

## T1 — Three-team trade capability, end to end

**Problem:** `GET /api/trade/capabilities` hard-codes `max_teams: 2` and
`three_team: { supported: false, reason: "multi_team_comparison_not_implemented" }`
(`src/routes/trade.js:404-407`). `POST /api/trade/compare` rejects anything larger with
`multi_team_trade_unsupported` (`src/routes/trade.js:650`). The native artboard already draws the
3-team UI in a disabled state (`TradeBuild.dc.html` / `TradeBuild-v1.md`: `THREE TEAMS`, `Add team`,
a fully worked 3-leg example, and the split-handoff copy — *"ESPN can't build a three-team trade. Send
it as two linked two-team trades, in this order."*). The workshop's `Still open` section names this
exact gap: *"Two-/three-team builder interaction and accessibility behavior."*

**Contract:**
- `trade-capabilities.v1` gains `max_teams: 3` and `three_team: { supported: true }` once the compute
  side is real — never flip the flag ahead of the engine.
- `trade-compare.v2` accepts a 3-participant payload and evaluates **every participant separately**
  for fair value, roster fit, and acceptance likelihood — the workshop's locked rule, not a pairwise
  approximation.
- Shape preservation: a 3-team request must not silently collapse to a 2-team recommendation, and
  vice versa (workshop: *"a three-team alternative stays three-team"*).
- Handoff copy for a 3-team deal always names the split-submission order, since no connected provider
  publishes a 3-team write path.

**Scope:** `src/routes/trade.js` (capabilities + compare), the fairness/valuation seam in
`src/services/tradeValue.js`, and the native unlock — the SwiftUI/Compose side already renders the
3-team UI behind the capability flag, so this is enabling the existing disabled control paths in
`TradeRosterFlowView.swift` / the Android trade feature, not new screens.

**Explicitly not this item's job:** drawing new UI. If unlocking the existing 3-team controls surfaces
a layout gap the artboard didn't anticipate (e.g. a 4th team), that is a new design-contract question,
not a T1 defect.

## T2 — Find-a-trade: league-wide candidate generator

**Problem:** Omen only scores a trade the user assembles. There is no path that takes "this team is
thin at RB" and returns candidate packages. The founder confirmed the **whole-league** scope: scan
every connected team's roster/needs against the user's roster, not just one team picked first.

**Non-negotiable constraint.** `Direction/current_sprint.md` lane B's "Shipped 2026-09-03 → 2026-09-07"
note records that **an unbounded trade search already took production down for a day**
(issue #404, performance rewrite in #405). A whole-league scan is the same failure shape at larger
scale. This item is not done if it ships a synchronous full-league fan-out per request. It must
specify, before code:
- a bounding strategy (cached per-team need profiles refreshed on a schedule or on roster-change
  webhook/poll, not recomputed live on every call);
- a hard cap on candidates generated and rosters read per invocation;
- whether generation runs synchronously in the request or is queued and polled;
- what happens under partial provider failure (one team's roster unreadable mid-scan) — degrade to
  fewer candidates with a named reason, never fail the whole batch silently.

**Contract:**
- Reuses `src/services/tradeValue.js` and `src/services/tradeLineup.js` for valuation/lineup-fit and
  `src/services/tradeLeagueContext.js` for roster/need context — this is candidate assembly on top of
  existing math, not a new scoring model.
- Never proposes a candidate touching a team whose roster the provider won't disclose — the workshop's
  existing rule (*"Omen issues no trade call at all where a provider will not give it the other teams'
  rosters"*, fact-of-record #16) applies to generated candidates exactly as it does to a verdict.
- Never invents a player value or rank where the provider doesn't supply one — same qualitative-vs-
  scored distinction the workshop already locked for a user-built trade.
- Each candidate carries the reasoning that produced it (which need it fills, for which side, off what
  evidence) — this is required input for T4, not optional telemetry.

**Scope:** a new read endpoint (exact route TBD at build time, e.g. `GET /api/trade/find`), a
candidate-assembly service, and the bounding/caching layer named above.

## T3 — Swipeable candidate-review screen (native)

**Problem:** browsing T2's candidate batch needs a new interaction pattern. Checked
`design/native-visual-lock-2026-09-13/` and every file in `Blueprints/specs/design/screen-contracts/`
— nothing matches a swipe-through-a-stack pattern. Per
`Blueprints/specs/mobile/omen-native-delivery-governance-v1.md` §5 and facts-of-record #20, native
feature code cannot start without an approved screen contract (an approved Figma node or an approved
Claude Design canvas artboard). **This item's first deliverable is that contract, not code.**

**Sequence, strictly in this order:**
1. `slops-native-screen-design` to decide what the screen is (layout, states, copy anchors) from T2's
   payload shape.
2. A canvas artboard (`.dc.html`) drawn and approved, or an approved Figma node — either is a valid
   artifact of record per the 2026-08-31 amendment.
3. `slops-canvas-to-code` to compile the contract and acceptance checklist.
4. SwiftUI + Compose implementation, in parity, per the existing native delivery sequence.
5. `slops-native-ui-audit` for the verdict.

**Required states:** loading a batch, a single candidate card (with the reasoning from T2 visible, not
buried), swipe-dismiss, swipe-save (hands off to T4), batch-exhausted, zero-candidates (name why —
no gaps found is a real, honest positive state, distinct from a provider read failure), and
provider-read-degraded (fewer candidates than requested, name which team's read failed).

**Do not touch:** do not invent a save/persist mechanism inside this screen — T4 owns storage and
status tracking. This screen calls T4's save action and shows local optimistic state only.

## T4 — Saved trade queue with tracked outcomes

**Problem:** surfaced during the founder's 2026-09-27 direction session, not part of the original
three-item ask. The founder wants: (1) a place to save a candidate trade to act on later rather than
immediately, (2) the reasoning Omen used to recommend it retained alongside it, and (3) tracking of
whether a saved candidate was actually acted on.

**This is the Ledger's honesty pattern applied to Trade, not a new model.** `U4-LedgerScreen` (VERIFIED
2026-09-20) already solved self-reported-vs-verified provenance for Omen calls: *"self-reported rows
render with the dotted carrier... and are never blended with verified ones; losses are present;
`followed: null` renders honestly rather than as 'no'."* A saved trade candidate is the same shape of
claim — Omen cannot see whether a provider-handoff trade was actually accepted by the other manager,
so the honest state is `outcome: null` until the user self-reports, never an inferred yes/no.

**Contract:**
- States per saved candidate: `saved` → `sent` (user confirmed they did the provider handoff) →
  self-reported `outcome: accepted | rejected | countered | null` (never inferred).
- Staleness handling: a saved candidate references live players on a live roster. If either roster
  changes materially before the user acts (a player traded/dropped/injured since save), the queue must
  say so rather than silently re-presenting stale reasoning as current.
- Reasoning retained verbatim from T2's candidate payload, not regenerated at read time — the user is
  reviewing the reasoning that made them save it, not a refreshed opinion that may have changed.
- Public share/poll rules from the workshop still apply: a saved candidate's private reasoning
  (e.g. naming another team's weakness) never appears in anything shareable without the same handling
  the existing Trade share flow already applies.

**Scope:** new persistence (table/schema TBD at build time — this is a Supabase schema question and
stays founder-gated per facts-of-record #8 the moment it's a real migration, not just a spec), a save
endpoint called from T3, a list/queue read endpoint, and a self-report endpoint for outcome.

## Order and dependency

```
T1 (independent)
T2 (independent, shares tradeValue.js/tradeLineup.js with T1 — coordinate, don't duplicate)
T3 ── blocked by T2 (needs candidate payload shape) AND its own design-contract gate (step 1 above)
T4 ── blocked by T2 (needs reasoning payload) AND T3 (needs the save-action interaction to hook into)
```

## Open questions for build time, not for this planning pass

- Exact 3-team fairness algorithm (T1) — pairwise-decomposed vs. joint optimization.
- Cache TTL and refresh trigger for per-team need profiles (T2).
- Exact route names and Supabase schema for the saved-trade queue (T4) — schema application is
  founder-gated regardless of when it's designed.
- Whether T2's candidate cap and T3's batch size should be tuned together as one number or two.
