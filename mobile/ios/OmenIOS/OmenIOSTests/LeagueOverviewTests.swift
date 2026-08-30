import XCTest
@testable import Omen

/// `league-overview.v1` decoding and the Command Center mappings it feeds.
///
/// The Matchup Hero's `.beforeGames` / `.live` / `.final` cases existed for months with no
/// real-data path — the only production path returned `.noMatchup` unconditionally. These
/// tests cover the path that finally reaches them.
final class LeagueOverviewTests: XCTestCase {

    private func decode(
        matchup: String,
        standings: String = #"{"status":"available","playoff_picture":{"rank":3,"team_count":12,"line":"3rd of 12","cut_line_note":null,"settings_known":false},"teams":[{"team_name":"Team Slops","is_current_user":true,"rank":3,"wins":6,"losses":2}]}"#,
        activity: String = #"{"status":"empty","unavailable_families":["transactions"],"items":[]}"#
    ) throws -> LeagueOverview {
        try JSONDecoder().decode(LeagueOverview.self, from: Data("""
        {
          "contract_version": "league-overview.v1",
          "platform": "sleeper",
          "league_id": "1",
          "league_name": "Slops Dynasty",
          "season": 2026, "week": 8,
          "matchup": \(matchup),
          "standings": \(standings),
          "activity": \(activity)
        }
        """.utf8))
    }

    private func sides(status: String, youPoints: String = "88.4", themPoints: String = "91.1") -> String {
        """
        {"status":"\(status)",
         "you":{"team_id":"7","team_name":"Team Slops","record":"6-2","points":\(youPoints),"projected":null},
         "opponent":{"team_id":"3","team_name":"Top Dogs","record":"7-1","points":\(themPoints),"projected":null},
         "unavailable_reason":null}
        """
    }

    func testLiveMatchupReachesTheHeroWithBothSides() throws {
        let overview = try decode(matchup: sides(status: "live"))

        guard case let .live(mine, theirs, projectedFinish, whatToWatch) = overview.matchupHero else {
            return XCTFail("a live matchup must reach the live hero state.")
        }
        XCTAssertEqual(mine.name, "Team Slops")
        XCTAssertEqual(mine.record, "6-2")
        XCTAssertEqual(mine.scoreText, "88.4")
        XCTAssertEqual(theirs.name, "Top Dogs")
        XCTAssertEqual(theirs.scoreText, "91.1")
        // This contract carries no projection, so the field stays empty rather than guessing.
        XCTAssertNil(projectedFinish)
        XCTAssertEqual(whatToWatch, "Projected within 2.7 points.")
    }

    func testFinalMatchupStatesTheResultFromPointsRatherThanInferringAWinner() throws {
        let overview = try decode(matchup: sides(status: "final", youPoints: "120.0", themPoints: "99.5"))

        guard case let .final(_, _, resultSummary, _) = overview.matchupHero else {
            return XCTFail("a final matchup must reach the final hero state.")
        }
        XCTAssertEqual(resultSummary, "Won 120.0–99.5")
    }

    func testPregameCarriesNoInventedKickoffTime() throws {
        let overview = try decode(matchup: sides(status: "pregame", youPoints: "0", themPoints: "0"))

        guard case let .beforeGames(_, _, startTime, whatToWatch) = overview.matchupHero else {
            return XCTFail("a pregame matchup must reach the pregame hero state.")
        }
        // `league-overview.v1` carries no kickoff time. Say what is true, invent nothing.
        XCTAssertEqual(startTime, "Not started")
        XCTAssertNil(whatToWatch, "a margin line is meaningless before anyone has scored.")
    }

    /// A bye and a failed read are different facts and must not collapse into one state.
    func testByeAndUnavailableBothLeaveTheShellReasonIntact() throws {
        let bye = try decode(matchup: #"{"status":"no_matchup","you":null,"opponent":null,"unavailable_reason":null}"#)
        XCTAssertNil(bye.matchupHero, "a bye must leave the shell's honest reason in place.")

        let dead = try decode(matchup: #"{"status":"unavailable","you":null,"opponent":null,"unavailable_reason":"provider_failed"}"#)
        XCTAssertNil(dead.matchupHero)
        XCTAssertEqual(dead.matchup.unavailableReason, "provider_failed")
    }

    /// A side with no team name cannot be drawn without inventing one.
    func testAMatchupMissingATeamNameDoesNotReachTheHero() throws {
        let overview = try decode(matchup: """
        {"status":"live",
         "you":{"team_id":"7","team_name":null,"record":"6-2","points":88.4,"projected":null},
         "opponent":{"team_id":"3","team_name":"Top Dogs","record":"7-1","points":91.1,"projected":null},
         "unavailable_reason":null}
        """)

        XCTAssertNil(overview.matchupHero)
    }

    /// The contract is expected to grow. One unrecognized status must not blank a screen whose
    /// other sections decoded fine.
    func testAnUnknownStatusDegradesRatherThanFailingTheDecode() throws {
        let overview = try decode(matchup: sides(status: "overtime_shootout"))

        XCTAssertEqual(overview.matchup.status, .unavailable)
        XCTAssertNil(overview.matchupHero)
        // The rest of the payload still decoded and is still usable.
        XCTAssertEqual(overview.standings.status, .available)
        XCTAssertEqual(overview.standings.teams.count, 1)
    }

    func testLeaguePulseUsesTheServerComputedPositionAndOmitsAnUnknownCutLine() throws {
        let overview = try decode(matchup: sides(status: "live"))

        guard case let .available(position, cutLine, activity) = overview.leaguePulse else {
            return XCTFail("available standings must produce a pulse.")
        }
        XCTAssertEqual(position, "3rd of 12")
        // `settings_known: false` — so the cut line must stay absent even if one were sent.
        XCTAssertNil(cutLine)
        // v1 derives no activity signals.
        XCTAssertNil(activity)
    }

    func testOffSeasonStandingsAreNotReportedAsAFailure() throws {
        let overview = try decode(
            matchup: #"{"status":"no_matchup","you":null,"opponent":null,"unavailable_reason":null}"#,
            standings: #"{"status":"off_season","playoff_picture":null,"teams":[]}"#
        )

        guard case .offSeason = overview.leaguePulse else {
            return XCTFail("off-season is a season fact, not a provider failure.")
        }
    }

    /// The seam the waiver work drops into. If this shape changes, the integration has to
    /// change the contract — which is exactly what building it now prevents.
    func testTheTransactionsSlotIsPresentAndNamed() throws {
        let overview = try decode(matchup: sides(status: "live"))

        XCTAssertEqual(overview.activity.status, .empty)
        XCTAssertEqual(overview.activity.unavailableFamilies, ["transactions"])
        XCTAssertTrue(overview.activity.items.isEmpty)
    }

    func testContextStripRequiresAPlatformALeagueNameAndTheCallersTeam() throws {
        let full = try decode(matchup: sides(status: "live"))
        guard case let .selected(platform, leagueName, teamName) = full.contextStrip else {
            return XCTFail("a complete payload must fill the strip.")
        }
        XCTAssertEqual(platform, .sleeper)
        XCTAssertEqual(leagueName, "Slops Dynasty")
        XCTAssertEqual(teamName, "Team Slops")

        // No row flagged as the caller's — the strip stays empty rather than badging someone
        // else's team as yours.
        let notMine = try decode(
            matchup: sides(status: "live"),
            standings: #"{"status":"available","playoff_picture":null,"teams":[{"team_name":"Someone Else","is_current_user":false,"rank":1}]}"#
        )
        XCTAssertNil(notMine.contextStrip)
    }

    // MARK: - F-HOT-01 — sections must fail independently at the decode boundary

    /// Regression. `matchup`, `standings` and `activity` were non-optional, so an absent section
    /// threw and failed the WHOLE decode — on a contract explicitly designed for sections to
    /// fail independently. Android tolerated a null section and iOS did not, so one payload
    /// produced two different products.
    func testAnAbsentSectionDegradesInsteadOfFailingTheWholePayload() throws {
        let json = Data("""
        {"contract_version":"league-overview.v1","platform":"sleeper","league_id":"1",
         "league_name":"Slops Dynasty","season":2026,"week":8,
         "standings":{"status":"available","playoff_picture":null,
           "teams":[{"team_name":"Team Slops","is_current_user":true,"rank":3}]},
         "activity":{"status":"empty","unavailable_families":["transactions"],"items":[]}}
        """.utf8)

        let overview = try JSONDecoder().decode(LeagueOverview.self, from: json)

        // The missing section degrades...
        XCTAssertEqual(overview.matchup.status, .unavailable)
        XCTAssertEqual(overview.matchup.unavailableReason, "not_read")
        XCTAssertNil(overview.matchupHero)
        // ...and every other section still decodes and renders.
        XCTAssertEqual(overview.standings.status, .available)
        XCTAssertEqual(overview.standings.teams.count, 1)
        XCTAssertEqual(overview.activity.unavailableFamilies, ["transactions"])
    }

    /// A payload with nothing but a contract version must still produce a renderable screen.
    func testAPayloadMissingEverySectionStillDecodes() throws {
        let json = Data(#"{"contract_version":"league-overview.v1","platform":"sleeper"}"#.utf8)

        let overview = try JSONDecoder().decode(LeagueOverview.self, from: json)

        XCTAssertEqual(overview.matchup.status, .unavailable)
        XCTAssertEqual(overview.standings.status, .unavailable)
        XCTAssertEqual(overview.activity.status, .unavailable)
        // The pulse resolves to an explicit resting state rather than staying pending.
        guard case .unavailable = overview.leaguePulse else {
            return XCTFail("unreadable standings must resolve League Pulse, not leave it loading")
        }
    }

    // MARK: - F-SCR-01 — the points the league is actually sorted by

    func testStandingsRowsCarryTheirPointsColumns() throws {
        let json = Data("""
        {"contract_version":"league-overview.v1","platform":"sleeper","league_id":"1",
         "league_name":"L","season":2026,"week":8,
         "matchup":{"status":"no_matchup","you":null,"opponent":null,"unavailable_reason":null},
         "standings":{"status":"available","playoff_picture":null,
           "teams":[{"team_name":"Mine","is_current_user":true,"rank":1,"wins":6,"losses":2,
                     "points_for":1142.4,"points_against":980.6}]},
         "activity":{"status":"empty","unavailable_families":[],"items":[]}}
        """.utf8)

        let team = try XCTUnwrap(
            JSONDecoder().decode(LeagueOverview.self, from: json).standings.teams.first
        )
        XCTAssertEqual(team.pointsFor, 1142.4)
        XCTAssertEqual(team.pointsAgainst, 980.6)
    }

    /// A provider that omits them must render as absent, never as 0.0 — the same rule the
    /// confidence fix established.
    func testAbsentPointsStayAbsentRatherThanBecomingZero() throws {
        let json = Data("""
        {"contract_version":"league-overview.v1","platform":"espn","league_id":"1",
         "league_name":"L","season":2026,"week":8,
         "matchup":{"status":"no_matchup","you":null,"opponent":null,"unavailable_reason":null},
         "standings":{"status":"available","playoff_picture":null,
           "teams":[{"team_name":"Mine","is_current_user":true,"rank":1}]},
         "activity":{"status":"empty","unavailable_families":[],"items":[]}}
        """.utf8)

        let team = try XCTUnwrap(
            JSONDecoder().decode(LeagueOverview.self, from: json).standings.teams.first
        )
        XCTAssertNil(team.pointsFor)
        XCTAssertNil(team.pointsAgainst)
    }
}
