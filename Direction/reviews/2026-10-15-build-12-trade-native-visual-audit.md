# Build 12 Trade native visual audit — 2026-10-15

## Scope

Draft PR #670 at `442babe3`, using the iPhone 16 simulator on iOS 26.5. This is
composition evidence only. It is not authenticated provider proof and it is not the
required paired-iPhone walkthrough.

The batch captured both light and dark variants of:

- typed Trade empty, prefilled, and verdict states;
- Find a Trade review and provider-projection-unavailable states;
- the league-aware Build a Deal, opponent roster, and verdict journey.

## Result

The league-aware journey answers the defects reported from the physical-phone walk:

- the user's team is represented by `You send` rather than offered as a trade partner;
- opponent teams are explicit, selectable league teams;
- the selected opponent roster is browsable and explains why a player is or is not a fit;
- Find a Trade presents a named opponent, both sides of the offer, projected lineup
  deltas, roster needs, evidence, and save/pass actions;
- three-team controls stay unavailable while the server capability contract says the
  comparison itself is not implemented.

No layout-blocking defect was found in those deterministic states. Both themes rendered.

## Evidence defect found and repaired

The generic `trade.empty`, `trade.verdict`, and `trade.prefilled` screenshot scenarios
still mounted `OmenTradeScreen` directly. They therefore bypassed the production
Find / Build / Type destination and could keep showing the retired Trade entry even after
the live tab changed.

The production shell and screenshot host now share `OmenTradeModeContainer`. Typed-trade
fixtures open with Type selected and no longer inject Find a Trade inside that mode.
Journey scenarios continue to mount the real Build, roster, Find review, and verdict
screens inside the permanent Trade tab shell.

## Verification

- simulator restart: iPhone 16 / iOS 26.5 booted cleanly;
- focused XCTest: `TradeFindFlowTests`, `OmenTradeCallTests`, and
  `TradeSearchStateTests` pass with parallel testing disabled;
- iOS build after the shared destination extraction: pass;
- native capture batch: 16 of 16 images written before the fixture correction;
- corrected dark typed-entry capture: written and visually inspected.

## Still open before promotion

- navigate the exact branch build on the paired iPhone;
- exercise Build and Find with an authenticated Yahoo or Sleeper league;
- verify real provider team identity, opponent rosters, projection coverage, and partial
  roster-read failures;
- keep the Rhody ESPN first-login reproduction deferred until the founder says a fresh
  install is available;
- independent P0/P1 review and founder release decision.
