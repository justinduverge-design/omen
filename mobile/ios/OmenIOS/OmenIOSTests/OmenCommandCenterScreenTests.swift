import XCTest
import SwiftUI
@testable import Omen

/// Mirrors Android `OmenCommandCenterScreenTest.kt`. Contract-style assertions on the v1.1
/// hierarchy: demo-connected exposes a labeled mock context, live matchup, Ledger, and League Pulse;
/// real-disconnected exposes honest empty states; no fixture
/// mints a "connected provider" claim for a real user.
final class OmenCommandCenterScreenTests: XCTestCase {

    // MARK: fixture shape

    func testDemoConnectedFixtureIsExplicitlyLabelledAsDemo() {
        let state = OmenCommandCenterFixtures.demoConnected
        XCTAssertTrue(state.greeting.lowercased().contains("demo"))
        // Context strip and matchup are wired to demo data — the *word* "demo" or
        // "mock" appears in the visible fixture strings so a caller cannot silently
        // ship this fixture to a real signed-in user without the label reading as such.
        if case let .selected(_, leagueName, teamName) = state.context {
            // `leagueName` is optional on the state now, but the DEMO fixture must still carry
            // one — a nil here would quietly drop the "demo" label this test exists to enforce.
            guard let leagueName else {
                return XCTFail("the demo fixture must name its league so the label is visible")
            }
            XCTAssertTrue(leagueName.lowercased().contains("demo") || leagueName.lowercased().contains("mock"))
            XCTAssertTrue(teamName.lowercased().contains("demo"))
        } else {
            XCTFail("demoConnected must expose a selected context strip.")
        }
    }

    func testRealDisconnectedFixtureExposesNoFabricatedProviderState() {
        let state = OmenCommandCenterFixtures.realDisconnected
        // Real-user disconnected greeting invites connection instead of claiming a move.
        XCTAssertFalse(state.greeting.lowercased().contains("demo"))
        // Context strip is Empty — no platform badge, no team name, no fake sync line.
        if case .empty = state.context {
            // ok
        } else {
            XCTFail("realDisconnected must expose an Empty context strip so no provider identity is fabricated.")
        }
        // Matchup surface is NoMatchup — nothing fabricates a score.
        if case .noMatchup = state.matchup {
            // ok
        } else {
            XCTFail("realDisconnected must expose a NoMatchup surface.")
        }
    }

    func testRealLoadingFixtureExposesEmptyContextAndLoadingMatchup() {
        let state = OmenCommandCenterFixtures.realLoading
        XCTAssertTrue(state.greeting.lowercased().contains("restoring"))
        if case .empty = state.context {} else { XCTFail("realLoading context should be Empty during restore.") }
        if case .noMatchup = state.matchup {} else { XCTFail("realLoading matchup should be NoMatchup during restore.") }
    }

    // MARK: shell construction

    func testShellConstructsForEveryFixture() {
        _ = OmenCommandCenterScreen(state: OmenCommandCenterFixtures.demoConnected)
        _ = OmenCommandCenterScreen(state: OmenCommandCenterFixtures.realDisconnected)
        _ = OmenCommandCenterScreen(state: OmenCommandCenterFixtures.realLoading)
    }

    func testShellAcceptsAllCallbacks() {
        _ = OmenCommandCenterScreen(
            state: OmenCommandCenterFixtures.demoConnected,
            onSwitchContext: {},
            onOpenMatchup: {},
            onOpenAccount: {},
            onOpenOmen: {},
            onOpenLedger: { _ in },
            onOpenLeague: {}
        )
    }

    func testDemoFixtureProvidesApprovedLedgerAndLeaguePulseCompositions() {
        let state = OmenCommandCenterFixtures.demoConnected
        if case .entries(let entries) = state.ledger {
            XCTAssertEqual(entries.count, 2)
            XCTAssertTrue(entries.allSatisfy { $0.period.lowercased().contains("demo") })
            XCTAssertEqual(entries.first?.callType, "START/SIT")
        } else {
            XCTFail("demo fixture must exercise the approved Ledger preview composition.")
        }

        if case let .available(position, cutLine, activity) = state.leaguePulse {
            XCTAssertTrue(position.lowercased().contains("demo"))
            XCTAssertEqual(cutLine?.lowercased().contains("demo"), true)
            XCTAssertEqual(activity?.lowercased().contains("no demo league activity feed"), true)
        } else {
            XCTFail("demo fixture must exercise the approved League Pulse composition.")
        }
    }

    func testDisconnectedAndLoadingFixturesNeverInventLedgerOrStandingsData() {
        if case .notConnected = OmenCommandCenterFixtures.realDisconnected.ledger {} else {
            XCTFail("realDisconnected Ledger must require a connected league.")
        }
        if case .notConnected = OmenCommandCenterFixtures.realDisconnected.leaguePulse {} else {
            XCTFail("realDisconnected League Pulse must require a connected league.")
        }
        // Corrected 2026-08-29. This test previously asserted `.empty` and `.unavailable` on
        // the LOADING fixture — it encoded the defect it should have caught. A screen whose
        // shell request is still in flight has not yet established that the Ledger is empty or
        // that standings are unavailable; both are positive claims, and neither is earned yet.
        if case .loading = OmenCommandCenterFixtures.realLoading.ledger {} else {
            XCTFail("realLoading Ledger must be pending, not a claim that the user has no history.")
        }
        if case .loading = OmenCommandCenterFixtures.realLoading.leaguePulse {} else {
            XCTFail("realLoading League Pulse must be pending, not a claim that standings failed.")
        }
    }


    func testWaiverWatchRegistersEveryApprovedState() {
        let opportunity = OmenWaiverOpportunity(
            playerName: "Demo Player", position: "RB", team: "DAL", availability: "Available", reason: "Demo reason."
        )
        let states: [OmenWaiverWatchState] = [
            .urgent(deadlineText: "Demo deadline", bestMove: opportunity),
            .calm(opportunities: [opportunity]),
            .pending, .processed, .availabilityUnknown, .noCredibleMove, .notConnected, .offSeason
        ]
        XCTAssertEqual(states.count, 8)
    }

    func testDemoFixtureProvidesAnUrgentWaiverWatchBriefing() {
        if case let .urgent(deadlineText, bestMove, longHorizonMoves) = OmenCommandCenterFixtures.demoConnected.waiverWatch {
            XCTAssertTrue(deadlineText.lowercased().contains("demo"))
            XCTAssertEqual(bestMove.playerName, "Tyrone Tracy Jr.")
            XCTAssertEqual(longHorizonMoves.count, 2)
        } else {
            XCTFail("demo fixture must exercise the approved urgent Waiver Watch composition.")
        }
    }

    // MARK: screenshot registry

    func testScreenshotScenariosResolveExpectedKeys() {
        XCTAssertTrue(ScreenshotScenarios.isKnown("command-center.demo-connected"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("command-center.disconnected"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("omen.demo"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("omen.disconnected"))
        XCTAssertFalse(ScreenshotScenarios.isKnown("command-center.no-such-fixture"))
        XCTAssertFalse(ScreenshotScenarios.isKnown(nil))
    }

    func testScreenshotScenariosParseEnvironmentAndLaunchArgs() {
        XCTAssertEqual(
            ScreenshotScenarios.active(
                from: [ScreenshotScenarios.launchArgumentKey: "command-center.demo-connected"],
                arguments: []
            ),
            "command-center.demo-connected"
        )
        XCTAssertEqual(
            ScreenshotScenarios.active(
                from: [:],
                arguments: ["-\(ScreenshotScenarios.launchArgumentKey)", "command-center.disconnected"]
            ),
            "command-center.disconnected"
        )
        XCTAssertNil(ScreenshotScenarios.active(from: [:], arguments: []))
    }
}

/// Platforms compact strip — visual brief §1.1 position 3 (amended 2026-08-14), Figma `73:2`,
/// state contract in `omen-native-backend-state-contract-v1.md`.
/// Mirrors Android `OmenPlatformCompactRowTest.kt`.
final class OmenPlatformCompactStripTests: XCTestCase {

    func testLastSyncRendersOnlyWhenConnected() {
        let connected = OmenPlatformRowState(platform: .sleeper, status: .connected, lastSyncText: "4m ago")
        XCTAssertEqual(connected.resolvedLastSyncText, "4m ago")

        // A last-sync time beside a non-connected status reads as "working, recently".
        for status in [OmenConnectionStatus.disconnected, .needsReauth, .error, .pending, .recovering] {
            let row = OmenPlatformRowState(platform: .yahoo, status: status, lastSyncText: "4m ago")
            XCTAssertNil(row.resolvedLastSyncText, "\(status) must suppress last sync")
        }
    }

    func testAccessibilityLabelCombinesPlatformStatusAndSyncIntoOneElement() {
        let row = OmenPlatformRowState(platform: .sleeper, status: .connected, lastSyncText: "4m ago")
        XCTAssertEqual(row.accessibilityLabel, "Sleeper, Connected, last sync 4m ago")

        let reauth = OmenPlatformRowState(platform: .yahoo, status: .needsReauth, lastSyncText: "2h ago")
        XCTAssertEqual(reauth.accessibilityLabel, "Yahoo, Reauth needed")
    }

    func testStatusTextComesFromTheSharedEnumNotASecondVocabulary() {
        // The strip must not invent status words; it reads the shared badge label source.
        XCTAssertEqual(omenConnectionStatusLabel(.needsReauth), "Reauth needed")
        XCTAssertEqual(omenConnectionStatusLabel(.connected), "Connected")
    }

    func testRealDisconnectedFixtureNeverMintsAConnectedRow() {
        let rows = OmenCommandCenterFixtures.realDisconnected.platforms
        XCTAssertEqual(rows.count, 3)
        XCTAssertTrue(rows.allSatisfy { $0.status == .disconnected })
        XCTAssertTrue(rows.allSatisfy { $0.resolvedLastSyncText == nil })
    }

    func testProviderOrderIsFixedAndNotConnectionSorted() {
        // Sleeper is the only connected provider in the demo fixture; it must not float to the top
        // by virtue of being connected — order is Sleeper, Yahoo, ESPN in every state.
        for state in [OmenCommandCenterFixtures.demoConnected, OmenCommandCenterFixtures.realDisconnected] {
            XCTAssertEqual(state.platforms.map(\.platform), [.sleeper, .yahoo, .espn])
        }
    }

    func testStripIsHiddenWhenNoRowsAreSupplied() {
        XCTAssertTrue(OmenCommandCenterFixtures.realLoading.platforms.isEmpty)
    }
}
