import XCTest
import SwiftUI
@testable import Omen

/// Mirrors Android `OmenContextStripTest.kt`. Contract-style: proves state → label mapping
/// and shell-construction without a snapshot library.
final class OmenContextStripTests: XCTestCase {

    func testSelectedStateAccessibilityLabelReadsTeamLeagueAndPlatform() {
        let state = OmenContextStripState.selected(platform: .sleeper, leagueName: "Sunday Slate", teamName: "Justin Titans")
        XCTAssertEqual(
            omenContextStripAccessibilityLabel(state),
            "Selected: Justin Titans in Sunday Slate on Sleeper. Tap to switch."
        )
    }

    func testNeedsRecoveryLabelSurfacesReasonExplicitly() {
        let state = OmenContextStripState.needsRecovery(
            platform: .yahoo, leagueName: "Sunday Slate", teamName: "Justin Titans", reason: "Session expired"
        )
        XCTAssertTrue(omenContextStripAccessibilityLabel(state).contains("Session expired"))
        XCTAssertTrue(omenContextStripAccessibilityLabel(state).contains("Yahoo"))
    }

    func testMultiTeamHintCallsOutOtherCount() {
        let state = OmenContextStripState.multiTeamHint(
            platform: .sleeper, leagueName: "Sunday Slate", teamName: "Justin Titans", otherTeamCount: 2
        )
        XCTAssertTrue(omenContextStripAccessibilityLabel(state).contains("+2 other teams"))
    }

    func testEmptyStateInvitesSelection() {
        XCTAssertEqual(omenContextStripAccessibilityLabel(.empty), "No team selected. Tap to choose.")
    }

    func testShellConstructsForEveryStateWithAndWithoutSwitcher() {
        let states: [OmenContextStripState] = [
            .selected(platform: .sleeper, leagueName: "Sunday Slate", teamName: "Justin Titans"),
            .needsRecovery(platform: .yahoo, leagueName: "Sunday Slate", teamName: "Justin Titans", reason: "Session expired"),
            .multiTeamHint(platform: .sleeper, leagueName: "Sunday Slate", teamName: "Justin Titans", otherTeamCount: 2),
            .empty,
        ]
        for state in states {
            _ = OmenContextStrip(state: state)
            _ = OmenContextStrip(state: state, onSwitch: {})
        }
    }
}
