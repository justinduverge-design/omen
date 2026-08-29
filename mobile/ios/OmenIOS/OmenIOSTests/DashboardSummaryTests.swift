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

    // MARK: - Mapping

    /// The contract carries no league or team name. Naming one would be invention, so the
    /// context strip stays empty until slice C supplies real provider detail.
    func testMappingNeverInventsALeagueOrTeamName() throws {
        let state = OmenCommandCenterState.from(summary: try decode(omen: "ready", waiver: "ready", sleeperConnected: true))

        guard case .empty = state.context else {
            return XCTFail("context must stay empty while the contract carries no league name")
        }
    }

    /// `dashboard-summary.v1` carries no waiver opportunities. `.calm([])` would read as
    /// "Omen looked and found nothing"; `.availabilityUnknown` is what is actually true.
    func testReadyWaiverToolDoesNotClaimAnEmptyOpportunityList() throws {
        let state = OmenCommandCenterState.from(summary: try decode(omen: "ready", waiver: "ready", sleeperConnected: true))

        guard case .availabilityUnknown = state.waiverWatch else {
            return XCTFail("expected availabilityUnknown, not a fabricated empty result")
        }
    }

    func testNeedsPlatformRendersDisconnectedRatherThanEmpty() throws {
        let state = OmenCommandCenterState.from(summary: try decode(omen: "needs_platform", waiver: "needs_platform"))

        guard case .notConnected = state.waiverWatch else { return XCTFail("expected notConnected waiver") }
        guard case .notConnected = state.ledger else { return XCTFail("expected notConnected ledger") }
        guard case .notConnected = state.leaguePulse else { return XCTFail("expected notConnected pulse") }
        XCTAssertEqual(state.greeting, "Connect a league to see your matchup.")
    }

    func testOffSeasonMapsToOffSeasonSectionsNotDisconnected() throws {
        let state = OmenCommandCenterState.from(summary: try decode(omen: "off_season", waiver: "ready", sleeperConnected: true))

        guard case .offSeason = state.waiverWatch else { return XCTFail("expected offSeason waiver") }
        guard case .offSeason = state.leaguePulse else { return XCTFail("expected offSeason pulse") }
        XCTAssertEqual(state.greeting, "The season hasn't started yet.")
    }

    /// F2: `pending_live_engine` means the connection lacks provider-specific context, NOT
    /// that the engine is unbuilt. The user-facing reason must not say the latter.
    func testPendingLiveEngineCopyDescribesMissingLeagueDetailNotAMissingEngine() throws {
        let state = OmenCommandCenterState.from(summary: try decode(omen: "pending_live_engine", waiver: "ready", sleeperConnected: true))

        guard case .noMatchup(let reason) = state.matchup else { return XCTFail("expected noMatchup") }
        XCTAssertTrue(reason.contains("league details"))
        XCTAssertFalse(reason.lowercased().contains("coming soon"))
        XCTAssertFalse(reason.lowercased().contains("not built"))
    }

    /// A connected-but-unusable provider must not be described as "no leagues connected" —
    /// facts-of-record #12: `connected` is not `usable`, and the copy has to reflect that.
    func testConnectedButUnusableIsNotDescribedAsNoLeagues() throws {
        let state = OmenCommandCenterState.from(summary: try decode(omen: "needs_platform", waiver: "needs_platform", sleeperConnected: true))

        guard case .noMatchup(let reason) = state.matchup else { return XCTFail("expected noMatchup") }
        XCTAssertTrue(reason.contains("isn't usable yet"))
    }

    /// Regression: `.unavailable` was rendered through `OmenStateSurface(kind: .loading, …)`,
    /// which draws a `ProgressView`. Every healthy league hit it, so the section spun forever
    /// and read as "standings takes forever to load" when nothing was in flight at all.
    ///
    /// These assert the two states stay distinct. `.loading` is the only one that may spin.
    func testLeaguePulseLoadingAndUnavailableAreDistinctStates() throws {
        let ready = OmenCommandCenterState.from(summary: try decode(omen: "ready", waiver: "ready", sleeperConnected: true))
        if case .loading = ready.leaguePulse {} else {
            XCTFail("a ready league expects a standings answer — that is pending, not unavailable.")
        }

        let noPlatform = OmenCommandCenterState.from(summary: try decode(omen: "needs_platform", waiver: "needs_platform"))
        if case .notConnected = noPlatform.leaguePulse {} else {
            XCTFail("no platform must stay notConnected, not pending on a request never made.")
        }
    }

    /// A supplied pulse always wins over the shell-derived default, so a resolved standings
    /// read can never be overwritten by "still loading".
    func testSuppliedLeaguePulseOverridesShellDefault() throws {
        let resolved = OmenCommandCenterState.from(
            summary: try decode(omen: "ready", waiver: "ready", sleeperConnected: true),
            leaguePulse: .available(position: "3rd of 12 · 6-1", cutLine: nil, activity: nil)
        )
        guard case let .available(position, cutLine, activity) = resolved.leaguePulse else {
            return XCTFail("a resolved standings answer must survive the shell default.")
        }
        XCTAssertEqual(position, "3rd of 12 · 6-1")
        // Neither is derivable from `league-standings.v1`; both must stay absent rather than
        // being filled with a plausible-sounding sentence.
        XCTAssertNil(cutLine)
        XCTAssertNil(activity)
    }
}
