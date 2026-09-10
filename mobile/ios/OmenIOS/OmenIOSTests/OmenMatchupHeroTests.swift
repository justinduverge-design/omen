import XCTest
import SwiftUI
@testable import Omen

/// Mirrors Android `OmenMatchupHeroTest.kt`. Contract-style assertions on the temporal
/// state → visible-label mapping.
final class OmenMatchupHeroTests: XCTestCase {

    private let myTeam = OmenMatchupTeam(name: "Justin Titans", record: "6–1", scoreText: "64.8")
    private let theirTeam = OmenMatchupTeam(name: "Marcus Team", record: "5–2", scoreText: "58.1")

    func testCompactTeamLabelUsesInitialsForMultiWordNames() {
        XCTAssertEqual(omenCompactTeamLabel("Justin Titans"), "JT")
        XCTAssertEqual(omenCompactTeamLabel("The Sunday Scaries"), "TSS")
    }

    func testCompactTeamLabelUsesFirstThreeCharactersForOneWordNames() {
        XCTAssertEqual(omenCompactTeamLabel("Scaries"), "SCA")
        XCTAssertEqual(omenCompactTeamLabel("X"), "X")
    }

    func testCompactTeamLabelIgnoresPunctuationBetweenWords() {
        XCTAssertEqual(omenCompactTeamLabel("Justin's Titans"), "JT")
        XCTAssertEqual(omenCompactTeamLabel("Scaries!"), "SCA")
    }

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

    /// The PROJ column. `showsColumns` turns on when *either* side carries a projection, and
    /// both rows then share the columned layout — a row with columns above a row without would
    /// put the opponent's score under your projection.
    func testProjectionAppearsInTheLabelForBothSidesWhenEitherSideHasOne() {
        let state = OmenMatchupHeroState.beforeGames(
            selectedTeam: OmenMatchupTeam(name: "Puk Around & Find Out", record: "0-0", scoreText: "—", projectedText: "100.7"),
            opponent: OmenMatchupTeam(name: "Pregame Nick", record: "0-0", scoreText: "—", projectedText: "95.8"),
            startTime: "Not started",
            whatToWatch: nil
        )
        _ = OmenMatchupHero(state: state, onOpen: {})
        let label = omenMatchupHeroAccessibilityLabel(state)
        XCTAssertTrue(label.contains("100.7"))
        XCTAssertTrue(label.contains("95.8"))
    }

    /// A side with no projection renders an em dash in its column rather than a fabricated
    /// zero, and the card still constructs. This is the shape ESPN and Sleeper returned for
    /// every league before the 2026-09-06 adapter fix, and the shape any provider still returns
    /// before its season's projections publish.
    func testOneSidedProjectionStillConstructsAndDoesNotInventTheOtherSide() {
        let state = OmenMatchupHeroState.live(
            selectedTeam: OmenMatchupTeam(name: "Mine", record: "1-0", scoreText: "64.8", projectedText: "119.6"),
            opponent: OmenMatchupTeam(name: "Theirs", record: "0-1", scoreText: "58.1", projectedText: nil),
            projectedFinish: nil,
            whatToWatch: nil
        )
        _ = OmenMatchupHero(state: state, onOpen: {})
        let label = omenMatchupHeroAccessibilityLabel(state)
        XCTAssertTrue(label.contains("64.8"))
        XCTAssertTrue(label.contains("58.1"))
        XCTAssertFalse(label.contains("Projected finish"))
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
