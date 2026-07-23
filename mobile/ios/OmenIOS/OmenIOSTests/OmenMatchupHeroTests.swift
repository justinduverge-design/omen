import XCTest
import SwiftUI
@testable import Omen

/// Mirrors Android `OmenMatchupHeroTest.kt`. Contract-style assertions on the temporal
/// state → visible-label mapping.
final class OmenMatchupHeroTests: XCTestCase {

    private let myTeam = OmenMatchupTeam(name: "Justin Titans", record: "6–1", scoreText: "64.8")
    private let theirTeam = OmenMatchupTeam(name: "Marcus Team", record: "5–2", scoreText: "58.1")

    func testLiveLabelIncludesBothScoresAndProjectedFinish() {
        let state = OmenMatchupHeroState.live(
            selectedTeam: myTeam,
            opponent: theirTeam,
            projectedFinish: "119.6–114.2",
            whatToWatch: nil
        )
        let label = omenMatchupHeroAccessibilityLabel(state)
        XCTAssertTrue(label.hasPrefix("Live:"))
        XCTAssertTrue(label.contains("64.8"))
        XCTAssertTrue(label.contains("58.1"))
        XCTAssertTrue(label.contains("Projected finish: 119.6–114.2"))
    }

    func testBeforeGamesLabelIncludesStartTimeAndProjections() {
        let state = OmenMatchupHeroState.beforeGames(
            selectedTeam: OmenMatchupTeam(name: "Justin Titans", record: "6–1", scoreText: "119.6"),
            opponent: OmenMatchupTeam(name: "Marcus Team", record: "5–2", scoreText: "114.2"),
            startTime: "Sun 1:00p ET",
            whatToWatch: nil
        )
        let label = omenMatchupHeroAccessibilityLabel(state)
        XCTAssertTrue(label.contains("Sun 1:00p ET"))
        XCTAssertTrue(label.contains("projected 119.6"))
        XCTAssertTrue(label.contains("projected 114.2"))
    }

    func testFinalLabelIncludesPlainResultSummary() {
        let state = OmenMatchupHeroState.final(
            selectedTeam: myTeam,
            opponent: theirTeam,
            resultSummary: "You won 128.4 to 121.7.",
            whatToWatch: nil
        )
        let label = omenMatchupHeroAccessibilityLabel(state)
        XCTAssertTrue(label.hasPrefix("Final:"))
        XCTAssertTrue(label.contains("You won 128.4 to 121.7."))
    }

    func testNoMatchupLabelDoesNotFabricateScores() {
        let state = OmenMatchupHeroState.noMatchup(reason: "No matchup this week — bye.")
        let label = omenMatchupHeroAccessibilityLabel(state)
        XCTAssertEqual(label, "No matchup this week. No matchup this week — bye.")
        // NoMatchup state must not carry team data — accessing selected/opponent should
        // yield empty strings so no fabricated score can appear.
    }

    func testShellConstructsForEveryStateWithAndWithoutOnOpen() {
        let states: [OmenMatchupHeroState] = [
            .live(selectedTeam: myTeam, opponent: theirTeam, projectedFinish: nil, whatToWatch: nil),
            .beforeGames(selectedTeam: myTeam, opponent: theirTeam, startTime: "Sun 1:00p ET", whatToWatch: nil),
            .final(selectedTeam: myTeam, opponent: theirTeam, resultSummary: "You won.", whatToWatch: nil),
            .noMatchup(reason: "Bye"),
        ]
        for state in states {
            _ = OmenMatchupHero(state: state)
            _ = OmenMatchupHero(state: state, onOpen: {})
        }
    }
}
