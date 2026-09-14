# Screen contracts - native visual lock 2026-09-13

Generated on 2026-09-14 from `design/native-visual-lock-2026-09-13`. Shared CSS hash: `5f66e0a5c23a`.

These are build contracts, not native screen code. They bind every artboard to the verified API contract, registry tokens, type ramp, spacing scale, resolved component roles, literal strings, control actions, and named symbols.

## Global source rules

- Start from `design/native-visual-lock-2026-09-13/CONTRACTS.md`, then this directory.
- Device floor is 390 x 844. SE 375 x 667 may scroll; iPad is deferred.
- Do not edit artboard CSS. `_shared.css` is the source and parity must pass.
- Feature screens must use registry token names, type roles, and spacing constants. Do not use raw hex or ad-hoc spacing.
- `data-stub` and `data-mock` remain in both native token files until C3 lands the hatch/dashed carriers.

## Ordered contracts

| Order | Contract | API contract | Scroll | Elements | Strings | Controls | Symbols |
|---:|---|---|---|---:|---:|---:|---:|
| 1 | [OmenCall](./OmenCall-v1.md) | omen-decision-brief.v2 | fits | 73 | 35 | 11 | 19 |
| 2 | [OmenEvidence](./OmenEvidence-v1.md) | omen-decision-brief.v2 | scrolls | 69 | 33 | 8 | 10 |
| 3 | [CommandCenter](./CommandCenter-v1.md) | dashboard-summary.v1 + league-overview.v1 + waiver-analysis.v1 + moves-history.v2 | fits | 88 | 40 | 9 | 15 |
| 4 | [CommandQuiet](./CommandQuiet-v1.md) | quiet-week.v1 | fits | 47 | 19 | 8 | 16 |
| 5 | [CommandQuietStraight](./CommandQuietStraight-v1.md) | quiet-week.v1 | fits | 47 | 19 | 8 | 16 |
| 6 | [CommandNoLeague](./CommandNoLeague-v1.md) | dashboard-summary.v1 | fits | 43 | 17 | 9 | 15 |
| 7 | [ReportPill](./ReportPill-v1.md) | beta-report.v1 | fits | 61 | 28 | 8 | 11 |
| 8 | [LeagueTable](./LeagueTable-v1.md) | league-overview.v1 | scrolls | 141 | 61 | 9 | 10 |
| 9 | [LeagueWaiver](./LeagueWaiver-v1.md) | waiver-analysis.v1 state=confirmed_opportunity | scrolls | 85 | 45 | 7 | 10 |
| 10 | [WaiverNoMove](./WaiverNoMove-v1.md) | waiver-analysis.v1 state=no_credible_move or no_low_cost_drop | fits | 64 | 30 | 8 | 10 |
| 11 | [WaiverNotDetermined](./WaiverNotDetermined-v1.md) | waiver-analysis.v1 waiver_system.system=not_determined | scrolls | 65 | 30 | 8 | 10 |
| 12 | [LeagueDegraded](./LeagueDegraded-v1.md) | league-overview.v1 per-section status=unavailable | scrolls | 85 | 35 | 10 | 10 |
| 13 | [LeagueNoRosters](./LeagueNoRosters-v1.md) | league-overview.v1 no rosters | scrolls | 81 | 32 | 8 | 10 |
| 14 | [TradeBuild](./TradeBuild-v1.md) | trade-capabilities.v1 + trade-compare.v2 | scrolls | 93 | 56 | 21 | 10 |
| 15 | [TradeRoster](./TradeRoster-v1.md) | trade-capabilities.v1 + trade-compare.v2 | scrolls | 81 | 45 | 20 | 10 |
| 16 | [TradeVerdict](./TradeVerdict-v1.md) | trade-compare.v2 | scrolls | 74 | 43 | 10 | 10 |
| 17 | [TradeNeedsContext](./TradeNeedsContext-v1.md) | trade-compare.v2 close_needs_context / insufficient_data | scrolls | 68 | 35 | 10 | 10 |
| 18 | [TradeShare](./TradeShare-v1.md) | trade-share.v1 | scrolls | 67 | 34 | 10 | 10 |
| 19 | [Ledger](./Ledger-v1.md) | moves-history.v2 | scrolls | 74 | 35 | 8 | 10 |
| 20 | [LedgerDetail](./LedgerDetail-v1.md) | move-detail.v1 | scrolls | 65 | 34 | 8 | 10 |
| 21 | [SignIn](./SignIn-v1.md) | session.v1 | fits | 35 | 11 | 6 | 11 |
| 22 | [EmailCode](./EmailCode-v1.md) | not an Omen route | fits | 25 | 11 | 2 | 0 |
| 23 | [ConnectLeague](./ConnectLeague-v1.md) | platform-provider-state.v1 | fits | 35 | 16 | 4 | 3 |
| 24 | [EspnConnect](./EspnConnect-v1.md) | espn-connect.v1 | scrolls | 29 | 16 | 3 | 0 |
| 25 | [ConnectFailed](./ConnectFailed-v1.md) | platform-provider-state.v1 | scrolls | 30 | 15 | 3 | 0 |
| 26 | [SwitchSheet](./SwitchSheet-v1.md) | league-directory.v1 + active-league.v1 | fits | 89 | 37 | 20 | 19 |
| 27 | [SwitchLoading](./SwitchLoading-v1.md) | active-league.v1 refresh list | fits | 68 | 17 | 8 | 10 |
| 28 | [Account](./Account-v1.md) | dashboard-summary.v1 + user-export.v1 + user-delete.v1 | scrolls | 72 | 33 | 7 | 12 |
| 29 | [StartSitClear](./StartSitClear-v1.md) | start-sit-detail.v1 state=clear_decision | fits | 77 | 39 | 8 | 10 |
| 30 | [StartSitIncomplete](./StartSitIncomplete-v1.md) | start-sit-detail.v1 state=incomplete_data | scrolls | 75 | 36 | 9 | 10 |
