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
- three-team controls are capability-gated; the current server contract supports exactly three
  participants and returns ordered linked two-team handoffs because providers do not supply a
  native three-team write API.

No layout-blocking defect was found in those deterministic states. Both themes rendered.

## Evidence defects found and repaired

The generic `trade.empty`, `trade.verdict`, and `trade.prefilled` screenshot scenarios
still mounted `OmenTradeScreen` directly. They therefore bypassed the production
Find / Build / Type destination and could keep showing the retired Trade entry even after
the live tab changed.

The production shell and screenshot host now share `OmenTradeModeContainer`. Typed-trade
fixtures open with Type selected and no longer inject Find a Trade inside that mode.
Journey scenarios continue to mount the real Build, roster, Find review, and verdict
screens inside the permanent Trade tab shell.

A fresh nominal Build capture then found a second contradiction: the capability fixture exposed a
live `Add team` button while the screen still rendered the retired sentence that Omen could only
compare two teams. The screen now renders that limit notice only when the capability read is absent
or explicitly unsupported, the supported fixture carries no retired reason code, and the J4 UI test
requires a tappable third-team control with no two-team-limit copy. The corrected frame was rebuilt,
installed on the simulator, recaptured, and visually inspected.

Founder review found a third evidence gap: that corrected J4 frame still did not show Find a Trade.
The live destination owned an outer `Find / Build / Type` selector, while the J4 scenarios mounted
the inner Build journey directly and kept a retired second `Type a trade / Build a trade` selector.
The Trade destination now names the single production selector explicitly as `Find a trade`,
`Build a trade`, and `Type a trade`; the inner Build screen omits an empty or duplicate selector;
and J4 captures mount through the shared production mode container. The new nominal capture visibly
shows all three actions with Build selected.

## Verification

- simulator restart: iPhone 16 / iOS 26.5 booted cleanly;
- focused XCTest: `TradeFindFlowTests`, `TradeRosterAndShareTests`, `OmenTradeCallTests`, and
  `TradeSearchStateTests` pass, 83/83, with parallel testing disabled;
- iOS build after the shared destination extraction: pass;
- native capture batch: 16 of 16 images written before the fixture correction;
- corrected dark typed-entry capture: written and visually inspected;
- corrected nominal Build capture: live Add-team control and no stale two-team notice, written and
  visually inspected;
- focused J4 interaction UI tests: 2/2 pass, including discovery of all three named Trade modes and
  the live third-team/no-stale-limit assertion;
- Yahoo provider seam: a focused adapter integration test now requires the whole-league roster read
  to pass every team's players through source-labelled projection enrichment before Find scans it;
  provider/adaptor/Find tests pass 45/45.

## Still open before promotion

- navigate the exact branch build on the paired iPhone after the source, simulator and review work
  is otherwise complete; the founder explicitly deferred this while away from home;
- exercise Build and Find with an authenticated Yahoo or Sleeper league;
- verify real provider team identity, opponent rosters, projection coverage, and partial
  roster-read failures;
- keep the Rhody ESPN first-login reproduction deferred until the founder says a fresh
  install is available;
- independent P0/P1 review and founder release decision.
