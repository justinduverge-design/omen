import XCTest
import SwiftUI
@testable import Omen

/// Mirrors Android `OmenCommandCenterScreenTest.kt`. Contract-style assertions on the v1.1
/// hierarchy: demo-connected exposes a labeled mock context + live matchup + placeholders;
/// real-disconnected exposes honest empty state + no-matchup + placeholders; no fixture
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
            onOpenAccount: {}
        )
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
