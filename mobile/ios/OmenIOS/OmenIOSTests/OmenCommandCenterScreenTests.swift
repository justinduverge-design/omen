import XCTest
import SwiftUI
@testable import Omen

/// Mirrors Android `OmenCommandCenterScreenTest.kt`. Contract-style assertions on the
/// fixture states — proves the state pipeline (fixture → payload → shell) is intact
/// without a SwiftUI snapshot library.
final class OmenCommandCenterScreenTests: XCTestCase {

    func testConnectedFixtureCarriesLeagueScopeAndMockDecision() {
        let state = OmenCommandCenterFixtures.demoConnected
        XCTAssertEqual(state.greeting, "This week's move is ready.")
        XCTAssertEqual(state.leagueScope, "Sunday Slate · Sleeper · 12 teams")
        XCTAssertEqual(state.platforms.count, 2)
        XCTAssertEqual(state.platforms.first?.platform, .sleeper)
        XCTAssertEqual(state.platforms.first?.status, .connected)
        XCTAssertEqual(shellBranch(state.decision), "mock")
    }

    func testDisconnectedFixtureShowsAllProviderCtasAndDisconnectedDecision() {
        let state = OmenCommandCenterFixtures.demoDisconnected
        XCTAssertNil(state.leagueScope)
        XCTAssertEqual(state.platforms.count, 2)
        for platform in state.platforms {
            XCTAssertEqual(platform.status, .disconnected)
            XCTAssertNotNil(platform.actionLabel)
        }
        XCTAssertEqual(shellBranch(state.decision), "disconnected")
    }

    func testReauthFixtureFlagsProviderReauthAndDecisionError() {
        let state = OmenCommandCenterFixtures.demoReauth
        XCTAssertEqual(state.platforms.count, 1)
        XCTAssertEqual(state.platforms.first?.status, .needsReauth)
        XCTAssertEqual(shellBranch(state.decision), "error")
    }

    func testLoadingFixtureRoutesDecisionToLoadingBranch() {
        XCTAssertEqual(shellBranch(OmenCommandCenterFixtures.demoLoading.decision), "loading")
    }

    func testOffSeasonFixtureRoutesDecisionToOffSeasonBranch() {
        XCTAssertEqual(shellBranch(OmenCommandCenterFixtures.demoOffSeason.decision), "offSeason")
    }

    func testShellConstructsFromEveryFixtureWithoutCrashing() {
        _ = OmenCommandCenterScreen(state: OmenCommandCenterFixtures.demoConnected)
        _ = OmenCommandCenterScreen(state: OmenCommandCenterFixtures.demoDisconnected)
        _ = OmenCommandCenterScreen(state: OmenCommandCenterFixtures.demoReauth)
        _ = OmenCommandCenterScreen(state: OmenCommandCenterFixtures.demoLoading)
        _ = OmenCommandCenterScreen(state: OmenCommandCenterFixtures.demoOffSeason)
    }

    private func shellBranch(_ state: OmenDecisionBriefState) -> String {
        switch state {
        case .success: return "success"
        case .empty: return "empty"
        case .loading: return "loading"
        case .error: return "error"
        case .disconnected: return "disconnected"
        case .stale: return "stale"
        case .mock: return "mock"
        case .offSeason: return "offSeason"
        }
    }
}
