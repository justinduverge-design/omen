import XCTest
@testable import Omen

/// M5-Native-API-Client slice C — `league-standings.v1` decoding and context-strip derivation.
final class LeagueStandingsTests: XCTestCase {
    private func json(
        platform: String = "sleeper",
        leagueName: String? = "Slops Dynasty",
        teams: String = #"{"team_name":"Team Slops","is_current_user":true,"rank":3,"wins":5,"losses":2}"#
    ) -> Data {
        let name = leagueName.map { "\"\($0)\"" } ?? "null"
        return Data("""
        {
          "contract_version": "league-standings.v1",
          "generated_at": "2026-08-15T12:00:00.000Z",
          "platform": "\(platform)",
          "league_id": "123456",
          "league_name": \(name),
          "season": 2026,
          "week": 1,
          "standings": [\(teams)]
        }
        """.utf8)
    }

    private func decode(_ data: Data) throws -> LeagueStandings {
        try JSONDecoder().decode(LeagueStandings.self, from: data)
    }

    func testDecodesLiveContractShape() throws {
        let standings = try decode(json())

        XCTAssertEqual(standings.contractVersion, "league-standings.v1")
        XCTAssertEqual(standings.leagueName, "Slops Dynasty")
        XCTAssertEqual(standings.currentUserTeam?.teamName, "Team Slops")
        XCTAssertEqual(standings.currentUserTeam?.rank, 3)
    }

    func testMapsEachSupportedProviderToItsPlatformMark() throws {
        XCTAssertEqual(try decode(json(platform: "sleeper")).omenPlatform, .sleeper)
        XCTAssertEqual(try decode(json(platform: "espn")).omenPlatform, .espn)
        XCTAssertEqual(try decode(json(platform: "yahoo")).omenPlatform, .yahoo)
    }

    /// Badging a league with a guessed platform mark would be a visible lie about which
    /// provider the data came from.
    func testUnknownProviderYieldsNoPlatformAndNoContext() throws {
        let standings = try decode(json(platform: "some_new_provider"))

        XCTAssertNil(standings.omenPlatform)
        XCTAssertNil(standings.contextStrip)
    }

    func testBuildsContextStripFromVerifiedIdentity() throws {
        guard case .selected(let platform, let leagueName, let teamName)? = try decode(json()).contextStrip else {
            return XCTFail("expected a selected context strip")
        }

        XCTAssertEqual(platform, .sleeper)
        XCTAssertEqual(leagueName, "Slops Dynasty")
        XCTAssertEqual(teamName, "Team Slops")
    }

    /// A partial answer would mean printing a placeholder beside a real value. Better to
    /// leave the strip unfilled than to half-name a league.
    func testMissingLeagueNameProducesNoContextRatherThanAPlaceholder() throws {
        XCTAssertNil(try decode(json(leagueName: nil)).contextStrip)
    }

    func testEmptyLeagueNameIsTreatedAsMissing() throws {
        XCTAssertNil(try decode(json(leagueName: "")).contextStrip)
    }

    /// The off-season returns `200` with an empty standings array. That is a valid response,
    /// not an error — and it must not produce a context strip.
    func testOffSeasonEmptyStandingsProducesNoContext() throws {
        let standings = try decode(json(teams: ""))

        XCTAssertTrue(standings.standings.isEmpty)
        XCTAssertNil(standings.currentUserTeam)
        XCTAssertNil(standings.contextStrip)
    }

    /// If the provider named no team as this user's, we cannot say which team is theirs.
    func testStandingsWithNoCurrentUserTeamProducesNoContext() throws {
        let others = #"{"team_name":"Someone Else","is_current_user":false,"rank":1}"#

        XCTAssertNil(try decode(json(teams: others)).contextStrip)
    }

    /// A missing flag means "not known to be mine", never "mine" — otherwise the first row
    /// in the league would be silently claimed as the user's team.
    func testAbsentIsCurrentUserFlagDefaultsToNotMine() throws {
        let noFlag = #"{"team_name":"Ambiguous Team","rank":1}"#
        let standings = try decode(json(teams: noFlag))

        XCTAssertEqual(standings.standings.first?.isCurrentUser, false)
        XCTAssertNil(standings.contextStrip)
    }

    /// The whole point of the League Pulse repair: this payload was already being fetched for
    /// the context strip, and the rank it carries was discarded while the section reported
    /// "Standings temporarily unavailable" to every healthy league.
    func testLeaguePulseIsDerivedFromStandingsAlreadyFetched() throws {
        let json = Data("""
        {
          "contract_version": "league-standings.v1",
          "platform": "sleeper",
          "league_name": "Dynasty Dogs",
          "standings": [
            { "team_name": "A", "is_current_user": false, "rank": 1, "wins": 7, "losses": 0 },
            { "team_name": "B", "is_current_user": false, "rank": 2, "wins": 6, "losses": 1 },
            { "team_name": "Mine", "is_current_user": true, "rank": 3, "wins": 6, "losses": 1 }
          ]
        }
        """.utf8)
        let standings = try JSONDecoder().decode(LeagueStandings.self, from: json)

        guard case let .available(position, cutLine, activity) = standings.leaguePulse else {
            return XCTFail("a payload naming the caller's rank must produce a pulse.")
        }
        XCTAssertEqual(position, "3rd of 3 · 6-1")
        // `league-standings.v1` carries no playoff settings and no transaction feed.
        XCTAssertNil(cutLine)
        XCTAssertNil(activity)
    }

    /// Absence must stay absence. Each of these is a real shape this route returns.
    func testLeaguePulseRefusesToInventARank() throws {
        let cases: [(String, String)] = [
            ("[]", "off-season returns an empty array — facts-of-record #10"),
            (#"[{"team_name":"A","is_current_user":false,"rank":1}]"#, "no row is the caller's"),
            (#"[{"team_name":"Mine","is_current_user":true}]"#, "the caller's row carries no rank")
        ]
        for (rows, why) in cases {
            let json = Data("""
            {"contract_version":"league-standings.v1","platform":"sleeper","league_name":"L","standings":\(rows)}
            """.utf8)
            let standings = try JSONDecoder().decode(LeagueStandings.self, from: json)
            XCTAssertNil(standings.leaguePulse, "must not invent a pulse when \(why).")
        }
    }

    /// A 12-team league is exactly where the naive last-digit ordinal rule breaks.
    func testOrdinalHandlesTheTeenException() {
        XCTAssertEqual(LeagueStandings.ordinal(1), "1st")
        XCTAssertEqual(LeagueStandings.ordinal(2), "2nd")
        XCTAssertEqual(LeagueStandings.ordinal(3), "3rd")
        XCTAssertEqual(LeagueStandings.ordinal(4), "4th")
        XCTAssertEqual(LeagueStandings.ordinal(11), "11th")
        XCTAssertEqual(LeagueStandings.ordinal(12), "12th")
        XCTAssertEqual(LeagueStandings.ordinal(13), "13th")
        XCTAssertEqual(LeagueStandings.ordinal(21), "21st")
    }
}
