import XCTest
@testable import Omen

/// M5-Native-API-Client slice B — view-model state machine.
@MainActor
final class CommandCenterViewModelTests: XCTestCase {
    private func makeSessionManager(withToken token: String?) -> SessionManager {
        let session = token.map {
            Session(userID: "user-1", accessToken: $0, refreshToken: "refresh", expiresAtEpochSeconds: 2_000)
        }
        return SessionManager(
            store: InMemorySecureSessionStore(initial: session),
            nowEpochSeconds: { 1_000 }
        )
    }

    private func summary(omen: String) throws -> DashboardSummary {
        try JSONDecoder().decode(DashboardSummary.self, from: Data("""
        {
          "contract_version": "dashboard-summary.v1",
          "is_mock": false,
          "user": { "favorite_team": null },
          "platforms": {
            "yahoo": { "connected": false },
            "sleeper": { "connected": true, "username": "slops" },
            "espn": { "connected": false }
          },
          "tools": {
            "omen_of_the_week": { "available": true, "status": "\(omen)" },
            "waiver_wire": { "available": true, "status": "ready" }
          }
        }
        """.utf8))
    }

    /// Demo must never touch the network, and must always render the labeled demo fixture.
    func testDemoUserRendersDemoFixtureWithoutCallingTheApi() async throws {
        final class FailingRepository: DashboardRepository {
            var called = false
            func fetchSummary(accessToken: String) async -> Result<DashboardSummary, OmenApiError> {
                called = true
                return .failure(.network)
            }
        }
        let repository = FailingRepository()
        let viewModel = CommandCenterViewModel(
            repository: repository,
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            movesRepository: StubMovesRepository(result: .failure(.network)),
            sessionManager: makeSessionManager(withToken: "t")
        )

        await viewModel.load(userID: SessionManager.demoUserID)

        XCTAssertFalse(repository.called, "demo must not issue a network request")
        XCTAssertEqual(viewModel.viewState, .demo)
        XCTAssertNil(viewModel.failure)
    }

    func testSuccessfulLoadMapsSummaryIntoCommandCenterState() async throws {
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .success(try summary(omen: "ready"))),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            movesRepository: StubMovesRepository(result: .failure(.network)),
            sessionManager: makeSessionManager(withToken: "t")
        )

        await viewModel.load(userID: "user-1")

        XCTAssertNil(viewModel.failure)
        XCTAssertEqual(viewModel.commandCenterState.greeting, "This week's move is ready.")
    }

    /// The critical honesty guarantee: a failed read must surface as a failure, never as a
    /// confident "you have no leagues connected" rendered from the disconnected fixture.
    func testFailedLoadSurfacesFailureRatherThanClaimingNoLeagues() async {
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .failure(.network)),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            movesRepository: StubMovesRepository(result: .failure(.network)),
            sessionManager: makeSessionManager(withToken: "t")
        )

        await viewModel.load(userID: "user-1")

        XCTAssertEqual(viewModel.failure, .network)
    }

    func testMissingAccessTokenIsUnauthorizedRatherThanACrash() async {
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .failure(.network)),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            movesRepository: StubMovesRepository(result: .failure(.network)),
            sessionManager: makeSessionManager(withToken: nil)
        )

        await viewModel.load(userID: "user-1")

        XCTAssertEqual(viewModel.failure, .unauthorized)
    }

    /// A 401 from the product API means the session is no longer good; the shell must be
    /// told so it can route to re-auth rather than leaving a dead tab on screen.
    func testUnauthorizedResponseNotifiesTheSessionManager() async {
        let sessionManager = makeSessionManager(withToken: "t")
        sessionManager.restore()
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .failure(.unauthorized)),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            movesRepository: StubMovesRepository(result: .failure(.network)),
            sessionManager: sessionManager
        )

        await viewModel.load(userID: "user-1")

        XCTAssertEqual(sessionManager.state, .needsReauth)
    }
}

// MARK: - Slice C — progressive context fill

extension CommandCenterViewModelTests {
    private func standings(currentUser: Bool = true) throws -> LeagueStandings {
        try JSONDecoder().decode(LeagueStandings.self, from: Data("""
        {
          "contract_version": "league-standings.v1",
          "platform": "sleeper",
          "league_id": "1",
          "league_name": "Slops Dynasty",
          "standings": [{"team_name":"Team Slops","is_current_user":\(currentUser),"rank":3}]
        }
        """.utf8))
    }

    /// Slice C upgrades the strip in place after the shell is already renderable.
    func testStandingsUpgradesTheContextStripAfterTheShellLoads() async throws {
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .success(try connectedSummary())),
            leagueRepository: StubLeagueRepository(result: .success(try standings())),
            movesRepository: StubMovesRepository(result: .failure(.network)),
            sessionManager: makeSessionManager(withToken: "t")
        )

        await viewModel.load(userID: "user-1")

        guard case .selected(_, let leagueName, let teamName)? = viewModel.context else {
            return XCTFail("expected the context strip to be filled from standings")
        }
        XCTAssertEqual(leagueName, "Slops Dynasty")
        XCTAssertEqual(teamName, "Team Slops")
    }

    /// The whole point of progressive fill: a provider hiccup must not turn a working
    /// Command Center into an error screen. The shell stays loaded and simply stays unfilled.
    func testStandingsFailureLeavesTheShellLoadedAndTheStripEmpty() async throws {
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .success(try connectedSummary())),
            leagueRepository: StubLeagueRepository(result: .failure(.server(status: 502))),
            movesRepository: StubMovesRepository(result: .failure(.network)),
            sessionManager: makeSessionManager(withToken: "t")
        )

        await viewModel.load(userID: "user-1")

        XCTAssertNil(viewModel.failure, "a standings failure must not fail the whole screen")
        XCTAssertNil(viewModel.context)
        guard case .empty = viewModel.commandCenterState.context else {
            return XCTFail("expected the strip to stay empty rather than regress or invent")
        }
    }

    /// Asking a disconnected user's provider for standings is a guaranteed round-trip to an
    /// error, so the shell gates it.
    func testDisconnectedUserNeverIssuesTheStandingsCall() async throws {
        final class CountingLeagueRepository: LeagueRepository {
            var calls = 0
            func fetchStandings(accessToken: String) async -> Result<LeagueStandings, OmenApiError> {
                calls += 1
                return .failure(.network)
            }
        }
        let league = CountingLeagueRepository()
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .success(try disconnectedSummary())),
            leagueRepository: league,
            movesRepository: StubMovesRepository(result: .failure(.network)),
            sessionManager: makeSessionManager(withToken: "t")
        )

        await viewModel.load(userID: "user-1")

        XCTAssertEqual(league.calls, 0)
    }

    func testStandingsWithoutTheUsersTeamLeavesTheStripEmpty() async throws {
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .success(try connectedSummary())),
            leagueRepository: StubLeagueRepository(result: .success(try standings(currentUser: false))),
            movesRepository: StubMovesRepository(result: .failure(.network)),
            sessionManager: makeSessionManager(withToken: "t")
        )

        await viewModel.load(userID: "user-1")

        XCTAssertNil(viewModel.context)
    }

    private func connectedSummary() throws -> DashboardSummary {
        try summaryJSON(sleeperConnected: true)
    }

    private func disconnectedSummary() throws -> DashboardSummary {
        try summaryJSON(sleeperConnected: false)
    }

    private func summaryJSON(sleeperConnected: Bool) throws -> DashboardSummary {
        try JSONDecoder().decode(DashboardSummary.self, from: Data("""
        {
          "contract_version": "dashboard-summary.v1",
          "is_mock": false,
          "user": { "favorite_team": null },
          "platforms": {
            "yahoo": { "connected": false },
            "sleeper": { "connected": \(sleeperConnected), "username": "slops" },
            "espn": { "connected": false }
          },
          "tools": {
            "omen_of_the_week": { "available": true, "status": "ready" },
            "waiver_wire": { "available": true, "status": "ready" }
          }
        }
        """.utf8))
    }
}

// MARK: - Slice E — Ledger

extension CommandCenterViewModelTests {
    private func history(_ json: String) throws -> MovesHistory {
        try JSONDecoder().decode(MovesHistory.self, from: Data(json.utf8))
    }

    private func summary(omenStatus: String) throws -> DashboardSummary {
        try JSONDecoder().decode(DashboardSummary.self, from: Data("""
        {
          "contract_version": "dashboard-summary.v1",
          "is_mock": false,
          "user": { "favorite_team": null },
          "platforms": {
            "yahoo": { "connected": false },
            "sleeper": { "connected": true, "username": "slops" },
            "espn": { "connected": false }
          },
          "tools": {
            "omen_of_the_week": { "available": true, "status": "\(omenStatus)" },
            "waiver_wire": { "available": true, "status": "ready" }
          }
        }
        """.utf8))
    }

    func testMovesFillTheLedgerSectionAfterTheShellLoads() async throws {
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .success(try summary(omenStatus: "ready"))),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            movesRepository: StubMovesRepository(result: .success(try history("""
            {
              "contract_version": "moves-history.v1",
              "season": 2026,
              "summary": {"wins":1,"losses":0,"pending":0,"avg_effectiveness_pct":62,"followed_count":1,"total_count":1},
              "moves": [{
                "id": 41, "season": 2026, "week": 6, "move_type": "start_sit",
                "recommendation": "Start DeVonta Smith over Chris Olave",
                "followed": true, "stars": null, "outcome": "win",
                "effectiveness_pct": 62.4, "created_at": "2026-10-14T12:00:00Z"
              }]
            }
            """))),
            sessionManager: makeSessionManager(withToken: "t")
        )

        await viewModel.load(userID: "user-1")

        guard case .entries(let entries) = viewModel.commandCenterState.ledger else {
            return XCTFail("expected live Ledger entries")
        }
        XCTAssertEqual(entries.count, 1)
        XCTAssertEqual(entries[0].id, "41")
        XCTAssertEqual(entries[0].period, "WEEK 6")
        XCTAssertEqual(entries[0].callType, "START_SIT")
        XCTAssertEqual(entries[0].outcome, "Outcome: win · followed · 62% effective")
    }

    /// The honest-empty case: a real user with a connected league and no recorded moves.
    func testEmptyMoveListRendersTheEmptyLedgerRatherThanAnError() async throws {
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .success(try summary(omenStatus: "ready"))),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            movesRepository: StubMovesRepository(result: .success(try history("""
            {"contract_version":"moves-history.v1","season":2026,"summary":null,"moves":[]}
            """))),
            sessionManager: makeSessionManager(withToken: "t")
        )

        await viewModel.load(userID: "user-1")

        guard case .empty = viewModel.commandCenterState.ledger else {
            return XCTFail("an empty list is a real answer, not a failure")
        }
    }

    /// The claim this test protects: "No Ledger entries yet" is a statement about the user's
    /// history. A failed read must never be allowed to make it.
    func testLedgerFailureRendersAnErrorRatherThanClaimingNoEntries() async throws {
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .success(try summary(omenStatus: "ready"))),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            movesRepository: StubMovesRepository(result: .failure(.server(status: 500))),
            sessionManager: makeSessionManager(withToken: "t")
        )

        await viewModel.load(userID: "user-1")

        XCTAssertNil(viewModel.failure, "a Ledger failure must not fail the whole screen")
        guard case .error(let message) = viewModel.commandCenterState.ledger else {
            return XCTFail("expected an honest Ledger error surface")
        }
        XCTAssertFalse(message.contains("500"), "status codes are for logs, not for users")
    }

    /// A user with no usable platform has a `.notConnected` Ledger by definition. Spending a
    /// round trip to learn "no rows" would also produce a weaker answer.
    func testNeedsPlatformSkipsTheMovesCallEntirely() async throws {
        final class CountingMovesRepository: MovesRepository {
            var calls = 0
            func fetchMoves(accessToken: String) async -> Result<MovesHistory, OmenApiError> {
                calls += 1
                return .failure(.network)
            }
        }
        let moves = CountingMovesRepository()
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .success(try summary(omenStatus: "needs_platform"))),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            movesRepository: moves,
            sessionManager: makeSessionManager(withToken: "t")
        )

        await viewModel.load(userID: "user-1")

        XCTAssertEqual(moves.calls, 0)
        guard case .notConnected = viewModel.commandCenterState.ledger else {
            return XCTFail("expected the disconnected Ledger surface")
        }
    }

    /// facts-of-record #7. Demo renders labeled fixtures and the live Ledger path must be
    /// unreachable from it — no request, and no live rows mixed into the demo surface.
    func testDemoNeverIssuesTheMovesCallAndKeepsLabeledFixtures() async throws {
        final class CountingMovesRepository: MovesRepository {
            var calls = 0
            func fetchMoves(accessToken: String) async -> Result<MovesHistory, OmenApiError> {
                calls += 1
                return .failure(.network)
            }
        }
        let moves = CountingMovesRepository()
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .success(try summary(omenStatus: "ready"))),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            movesRepository: moves,
            sessionManager: makeSessionManager(withToken: "t")
        )

        await viewModel.load(userID: SessionManager.demoUserID)

        XCTAssertEqual(moves.calls, 0, "demo must not issue a network request")
        XCTAssertNil(viewModel.ledger, "demo must not populate live Ledger state")
        guard case .entries(let entries) = viewModel.commandCenterState.ledger else {
            return XCTFail("demo keeps its labeled fixture entries")
        }
        XCTAssertTrue(
            entries.allSatisfy { $0.period.hasPrefix("DEMO") },
            "every demo Ledger row stays labeled as demo"
        )
    }
}
