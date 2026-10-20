import XCTest
@testable import Omen

/// M5-Native-API-Client slice B — `dashboard-summary.v1` decoding and honest-state mapping.
final class DashboardSummaryTests: XCTestCase {
    /// Shaped from the live response builder in `src/routes/dashboard.js`, including the
    /// additive `lastResult` fields the contract grew after the native shell was designed.
    private func json(omen: String, waiver: String, sleeperConnected: Bool = false, yahooStatus: String? = nil) -> Data {
        let yahooStatusField = yahooStatus.map { #""status":"\#($0)","# } ?? ""
        return Data("""
        {
          "contract_version": "dashboard-summary.v1",
          "generated_at": "2026-08-15T12:00:00.000Z",
          "is_mock": false,
          "user": { "favorite_team": "PHI" },
          "platforms": {
            "yahoo": { "connected": false, \(yahooStatusField)"league_id": null, "lastResult": null, "lastGameId": null, "lastGameKickoff": null },
            "sleeper": { "connected": \(sleeperConnected), "username": "slops", "lastResult": null, "lastGameId": null, "lastGameKickoff": null },
            "espn": { "connected": false, "lastResult": null, "lastGameId": null, "lastGameKickoff": null }
          },
          "tools": {
            "draft_assistant": { "available": true, "mode": "free", "status": "ready" },
            "omen_of_the_week": { "available": true, "mode": "free", "status": "\(omen)" },
            "start_sit": { "available": true, "mode": "free", "status": "ready" },
            "trade_analyzer": { "available": true, "mode": "free", "status": "ready" },
            "waiver_wire": { "available": true, "mode": "free", "status": "\(waiver)" }
          }
        }
        """.utf8)
    }

    private func decode(omen: String, waiver: String, sleeperConnected: Bool = false) throws -> DashboardSummary {
        try JSONDecoder().decode(
            DashboardSummary.self,
            from: json(omen: omen, waiver: waiver, sleeperConnected: sleeperConnected)
        )
    }

    func testDecodesLiveContractShape() throws {
        let summary = try decode(omen: "ready", waiver: "ready", sleeperConnected: true)

        XCTAssertEqual(summary.contractVersion, "dashboard-summary.v1")
        XCTAssertFalse(summary.isMock)
        XCTAssertEqual(summary.user.favoriteTeam, "PHI")
        XCTAssertTrue(summary.platforms.sleeper.connected)
        XCTAssertTrue(summary.platforms.anyConnected)
        XCTAssertEqual(summary.tools.omenOfTheWeek.status, .ready)
    }

    /// Additive growth is routine on this contract. An unrecognized status must degrade to
    /// `.unknown`, not fail the decode and black out the Command Center.
    func testUnknownToolStatusDegradesRatherThanFailingTheResponse() throws {
        let summary = try decode(omen: "some_future_status", waiver: "ready")

        XCTAssertEqual(summary.tools.omenOfTheWeek.status, .unknown)
    }

    func testEachF2StatusDecodesToItsOwnCase() throws {
        XCTAssertEqual(try decode(omen: "ready", waiver: "ready").tools.omenOfTheWeek.status, .ready)
        XCTAssertEqual(try decode(omen: "pending_live_engine", waiver: "ready").tools.omenOfTheWeek.status, .pendingLiveEngine)
        XCTAssertEqual(try decode(omen: "needs_platform", waiver: "needs_platform").tools.omenOfTheWeek.status, .needsPlatform)
        XCTAssertEqual(try decode(omen: "off_season", waiver: "ready").tools.omenOfTheWeek.status, .offSeason)
    }

}
